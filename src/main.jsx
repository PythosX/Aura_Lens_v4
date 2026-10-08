import React,{useEffect,useRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {HandLandmarker,FilesetResolver} from '@mediapipe/tasks-vision'
import {Camera,RotateCcw,Maximize2,Minimize2,ChevronDown,ShieldCheck} from 'lucide-react'
import './styles.css'

const CHARS=[
 {id:'naruto',name:'NARUTO',sub:'THE NINJA SPIRIT',src:'/characters/naruto.jpg'},
 {id:'satoru',name:'SATORU',sub:'THE STRONGEST',src:'/characters/satoru.jpg'},
 {id:'shadow',name:'SHADOW',sub:'THE UNKNOWN',src:'/characters/shadow.jpg'}
]
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))
const lerp=(a,b,t)=>a+(b-a)*t
function P({x,y}){return {x,y}}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}

export default function App(){
 const video=useRef(null), canvas=useRef(null), landmarker=useRef(null), raf=useRef(0), stream=useRef(null), prev=useRef(null)
 const [ready,setReady]=useState(false),[camera,setCamera]=useState(false),[hands,setHands]=useState(0),[active,setActive]=useState(false),[char,setChar]=useState(CHARS[0]),[menu,setMenu]=useState(false),[full,setFull]=useState(false),[error,setError]=useState(''),[fps,setFps]=useState(0)
 const lastF=useRef(performance.now()),frames=useRef(0)
 useEffect(()=>{init(); return()=>{cancelAnimationFrame(raf.current); stream.current?.getTracks().forEach(t=>t.stop())}},[])
 async function init(){
  try{
   const vision=await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm')
   landmarker.current=await HandLandmarker.createFromOptions(vision,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.55})
   setReady(true)
  }catch(e){setError('Hand tracking could not initialize. Check your internet connection and reload.');console.error(e)}
 }
 async function start(){
  try{
   setError(''); const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false}); stream.current=s; video.current.srcObject=s; await video.current.play(); setCamera(true); raf.current=requestAnimationFrame(loop)
  }catch(e){setError(e.name==='NotAllowedError'?'Camera permission was blocked. Allow camera access and try again.':'Could not access the camera.')}
 }
 function loop(now){
  if(!video.current||!landmarker.current){raf.current=requestAnimationFrame(loop);return}
  if(video.current.readyState>=2){const r=landmarker.current.detectForVideo(video.current,now);draw(r)}
  frames.current++; if(now-lastF.current>700){setFps(Math.round(frames.current*1000/(now-lastF.current)));frames.current=0;lastF.current=now}
  raf.current=requestAnimationFrame(loop)
 }
 function smooth(points){
  if(!prev.current){prev.current=points;return points}
  const out=points.map((p,i)=>P({x:lerp(prev.current[i].x,p.x,.35),y:lerp(prev.current[i].y,p.y,.35)}));prev.current=out;return out
 }
 function draw(result){
  const v=video.current,c=canvas.current,ctx=c.getContext('2d'); const W=v.videoWidth||1280,H=v.videoHeight||720
  if(c.width!==W)c.width=W;if(c.height!==H)c.height=H
  ctx.clearRect(0,0,W,H)
  const list=result?.landmarks||[]; setHands(list.length)
  if(list.length<2){prev.current=null;setActive(false);return}
  // Mirror the camera and normalize landmarks into mirrored canvas coordinates.
  const hs=list.slice(0,2).map(hand=>hand.map(q=>P({x:(1-q.x)*W,y:q.y*H})))
  // The effect is a four-corner portal: thumb + index fingertips from each hand.
  const a=hs[0],b=hs[1]
  let quad=smooth([a[4],a[8],b[8],b[4]])
  // Re-order so corners follow the perimeter, regardless of which hand is left/right.
  const cx=quad.reduce((s,p)=>s+p.x,0)/4,cy=quad.reduce((s,p)=>s+p.y,0)/4
  quad=quad.slice().sort((p,q)=>Math.atan2(p.y-cy,p.x-cx)-Math.atan2(q.y-cy,q.x-cx))
  const area=Math.abs(polyArea(quad)); const d=dist(quad[0],quad[2])
  const on=area>4500&&d>70
  setActive(on); if(!on)return
  const pulse=.5+.5*Math.sin(performance.now()/180)
  // subtle dark veil behind the portal only
  ctx.save(); drawQuadFill(ctx,quad,'rgba(5,5,9,.10)'); ctx.restore()
  // character clipped exactly to the hand-defined quadrilateral
  const img=getImage(char.src); if(img?.complete) drawImageQuad(ctx,img,quad)
  // energy frame
  ctx.save(); ctx.globalCompositeOperation='screen'; ctx.lineJoin='round'
  for(let i=0;i<3;i++){ctx.strokeStyle=`rgba(245,245,255,${.18-i*.04})`;ctx.lineWidth=10-i*3;drawPoly(ctx,quad);ctx.stroke()}
  ctx.strokeStyle=`rgba(255,255,255,${.8+.15*pulse})`;ctx.lineWidth=2.2;drawPoly(ctx,quad);ctx.stroke()
  // moving light particles along edges
  const per=polyPerimeter(quad); for(let k=0;k<10;k++){const t=(performance.now()/1400+k/10)%1;const p=pointAtPoly(quad,t);ctx.beginPath();ctx.arc(p.x,p.y,2.5+2*pulse,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${.45+.35*pulse})`;ctx.fill()}
  ctx.restore()
 }
 const imgCache=useRef({}); function getImage(src){if(!imgCache.current[src]){const i=new Image();i.src=src;imgCache.current[src]=i}return imgCache.current[src]}
 function polyArea(q){let s=0;for(let i=0;i<q.length;i++){let j=(i+1)%q.length;s+=q[i].x*q[j].y-q[j].x*q[i].y}return s/2}
 function drawPoly(ctx,q){ctx.beginPath();q.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath()}
 function drawQuadFill(ctx,q,fill){drawPoly(ctx,q);ctx.fillStyle=fill;ctx.fill()}
 function drawImageQuad(ctx,img,q){
  const iw=img.naturalWidth,ih=img.naturalHeight;if(!iw||!ih)return
  // Split quad into two affine triangles. This produces a perspective-like portal while staying dependency-light.
  ctx.save();ctx.beginPath();q.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip()
  const src=[{x:0,y:0},{x:iw,y:0},{x:iw,y:ih},{x:0,y:ih}]
  tri(ctx,img,src[0],src[1],src[2],q[0],q[1],q[2]);tri(ctx,img,src[0],src[2],src[3],q[0],q[2],q[3]);ctx.restore()
 }
 function tri(ctx,img,s0,s1,s2,d0,d1,d2){
  const den=s0.x*(s1.y-s2.y)+s1.x*(s2.y-s0.y)+s2.x*(s0.y-s1.y);if(Math.abs(den)<1e-5)return
  const a=(d0.x*(s1.y-s2.y)+d1.x*(s2.y-s0.y)+d2.x*(s0.y-s1.y))/den
  const b=(d0.y*(s1.y-s2.y)+d1.y*(s2.y-s0.y)+d2.y*(s0.y-s1.y))/den
  const c=(d0.x*(s2.x-s1.x)+d1.x*(s0.x-s2.x)+d2.x*(s1.x-s0.x))/den
  const d=(d0.y*(s2.x-s1.x)+d1.y*(s0.x-s2.x)+d2.y*(s1.x-s0.x))/den
  const e=(d0.x*(s1.x*s2.y-s2.x*s1.y)+d1.x*(s2.x*s0.y-s0.x*s2.y)+d2.x*(s0.x*s1.y-s1.x*s0.y))/den
  const f=(d0.y*(s1.x*s2.y-s2.x*s1.y)+d1.y*(s2.x*s0.y-s0.x*s2.y)+d2.y*(s0.x*s1.y-s1.x*s0.y))/den
  ctx.save();ctx.setTransform(a,b,c,d,e,f);ctx.drawImage(img,0,0);ctx.restore()
 }
 function polyPerimeter(q){return q.reduce((s,p,i)=>s+dist(p,q[(i+1)%4]),0)}
 function pointAtPoly(q,t){let target=t*polyPerimeter(q),acc=0;for(let i=0;i<4;i++){let a=q[i],b=q[(i+1)%4],len=dist(a,b);if(acc+len>=target){let u=(target-acc)/len;return P({x:lerp(a.x,b.x,u),y:lerp(a.y,b.y,u)})}acc+=len}return q[0]}
 async function toggleFull(){if(!document.fullscreenElement){await document.documentElement.requestFullscreen();setFull(true)}else{await document.exitFullscreen();setFull(false)}}
 function reset(){setActive(false);prev.current=null}
 return <div className="app">
  <header><div className="brand"><span className="logo">A</span><div><b>AURALENS</b><small>HAND PORTAL EXPERIENCE</small></div></div><div className="status"><i className={camera?'live':''}></i>{camera?'CAMERA LIVE':'SYSTEM STANDBY'}</div></header>
  <main>
   <section className="hero"><div className="eyebrow">REAL-TIME VISION / 02</div><h1>HOLD THE<br/><em>WORLD</em> BETWEEN<br/>YOUR HANDS.</h1><p>Keep the character completely hidden. Raise both hands and create the portal — the artwork appears only inside the exact space framed by your fingers.</p></section>
   <section className="stage" id="stage">
    <video ref={video} playsInline muted className="camera"></video><canvas ref={canvas} className="fx"></canvas>
    {!camera&&<div className="start"><div className="start-ring"><Camera size={28}/></div><h2>ACTIVATE AURALENS</h2><p>Allow camera access to begin hand tracking.</p><button onClick={start} disabled={!ready}>{ready?'START CAMERA':'LOADING TRACKER…'}</button></div>}
    {camera&&hands<2&&<div className="instruction"><span>01</span><b>RAISE BOTH HANDS</b><small>Keep your thumb + index finger visible.</small></div>}
    {camera&&hands>=2&&!active&&<div className="instruction"><span>02</span><b>OPEN THE PORTAL</b><small>Spread your hands until the frame appears.</small></div>}
    {camera&&active&&<div className="instruction active"><span>03</span><b>PORTAL ACTIVE</b><small>Move your hands to move the character window.</small></div>}
    <div className="hud"><span>HANDS {hands}/2</span><span>{fps||0} FPS</span><span>TRACKING {ready?'READY':'LOAD'}</span></div>
   </section>
   <div className="controls">
    <div className="picker"><button className="pickerBtn" onClick={()=>setMenu(!menu)}><img src={char.src}/><span><small>CHARACTER</small><b>{char.name}</b></span><ChevronDown size={16}/></button>{menu&&<div className="menu">{CHARS.map(x=><button key={x.id} onClick={()=>{setChar(x);setMenu(false)}}><img src={x.src}/><span><b>{x.name}</b><small>{x.sub}</small></span></button>)}</div>}</div>
    <div className="actions"><button onClick={reset}><RotateCcw size={17}/>RESET</button><button onClick={toggleFull}>{full?<Minimize2 size={17}/>:<Maximize2 size={17}/>}FULLSCREEN</button></div>
   </div>
   {error&&<div className="error">{error}</div>}
   <section className="how"><div><span>01</span><h3>HANDS DEFINE<br/>THE FRAME</h3></div><div><span>02</span><h3>ARTWORK STAYS<br/>HIDDEN</h3></div><div><span>03</span><h3>IMAGE APPEARS<br/>ONLY INSIDE</h3></div></section>
  </main>
  <footer><span><ShieldCheck size={15}/>PROCESSING HAPPENS LOCALLY IN YOUR BROWSER</span><span>BUILD BY PYTHOSX · AURALENS</span></footer>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>)
