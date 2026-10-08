# AuraLens

**See the character. Become the character.**

AuraLens is a cinematic browser-based computer-vision experience built by **PythosX**.

## What it does

1. Opens with a cinematic intro.
2. Requests webcam access.
3. Detects and stabilizes the user's face.
4. Captures a temporary face reference **in memory only**.
5. Aligns an anime-inspired mask to the face using Face Landmarker landmarks.
6. Guides the user to raise both hands.
7. Tracks both hands with MediaPipe Hand Landmarker.
8. Creates a glowing portal between the hands.
9. Places the selected character visual inside the portal.
10. Lets the user capture the final composition or reset the experience.

The face reference is never uploaded to a backend by this project.

## Run locally

```bash
npm install
npm run dev
```

Open the local HTTPS/localhost URL and allow camera access.

## Build

```bash
npm run build
```

## Deploy to Vercel

### GitHub

```bash
git init
git add .
git commit -m "Initial AuraLens build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/AuraLens.git
git push -u origin main
```

Then import the repository in Vercel.

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- No environment variables are required.

### Important camera note

Production camera access requires a secure origin. Vercel provides HTTPS automatically.

## Character assets

Original anime-inspired SVG assets are included in:

```text
public/characters/
```

Add your own transparent PNG/WebP character art there and register it in:

```text
src/data/characters.js
```

For best face-mask results, use a transparent portrait with the face centered.

## Architecture

```text
src/
  components/
    CameraExperience.jsx
    CharacterSidebar.jsx
    HUD.jsx
    PortalCanvas.jsx
    PythosBrand.jsx
  data/
    characters.js
  vision/
    mediapipe.js
    smoothing.js
  App.jsx
  main.jsx
  styles.css
```

## Browser compatibility

Use a current Chrome, Edge, or Safari browser with webcam support. Performance depends on device GPU/CPU and camera resolution.

## Privacy

The app processes the webcam locally in the browser. The hidden face reference is drawn to an offscreen canvas only for local processing and is not sent to a server.

## Credits

Built by **PythosX**.
