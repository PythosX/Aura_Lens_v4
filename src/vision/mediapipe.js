import {
  FaceLandmarker,
  HandLandmarker,
  FilesetResolver
} from "@mediapipe/tasks-vision";

const WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";

const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export async function createVisionModels() {
  const vision = await FilesetResolver.forVisionTasks(WASM);

  const face = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: FACE_MODEL,
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: true
  });

  const hands = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: HAND_MODEL,
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 2
  });

  return { face, hands };
}

export function detectFace(faceLandmarker, video, timestamp) {
  if (!faceLandmarker) return null;
  const result = faceLandmarker.detectForVideo(video, timestamp);
  return result?.faceLandmarks?.[0] ?? null;
}

export function detectHands(handLandmarker, video, timestamp) {
  if (!handLandmarker) return [];
  const result = handLandmarker.detectForVideo(video, timestamp);
  return result?.landmarks ?? [];
}
