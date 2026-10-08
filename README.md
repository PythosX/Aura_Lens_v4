# AuraLens — Hand Portal Experience

A Vite + React + MediaPipe web experience where the selected character is completely hidden until two hands are detected. The thumb and index fingertips from each hand define a four-corner portal. The character artwork is perspective-mapped and clipped to that quadrilateral, so the image appears only inside the space framed by the user's hands.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL, allow camera access, and use a well-lit room. Keep both hands visible. Move the thumb/index pairs to resize and rotate the portal.

## Deploy to Vercel

1. Push this folder to GitHub.
2. Import the repository in Vercel.
3. Framework: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy.

No environment variables are required. MediaPipe model/wasm assets are loaded from public CDNs at runtime.

## Characters

Character artwork is stored in `public/characters/`. Replace those files with your own images if desired; keep the filenames or update `CHARS` in `src/main.jsx`.

## Gesture logic

- 0–1 hand: artwork is hidden.
- 2 hands but small/unstable frame: artwork remains hidden.
- 2 hands + sufficient thumb/index separation: portal activates.
- The four points are the thumb and index fingertips of each hand.
- Artwork is drawn into the four-point quadrilateral and clipped to it.

All camera frames are processed in the browser; no camera upload API is used.
