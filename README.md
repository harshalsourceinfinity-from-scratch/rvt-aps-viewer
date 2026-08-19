# RVT APS Viewer

A browser-based Revit (`.rvt`) viewer built with Autodesk Platform Services (APS). The application uploads a model once, asks APS to translate it to SVF2, and then loads that saved derivative in the Autodesk Viewer on every later visit.

## Live demo

[Open the RVT viewer](https://rvt-aps-viewer.onrender.com/)

## What a visitor needs

Visitors only need a modern web browser and the public site URL. They do **not** need Revit, Node.js, an APS account, or the original `.rvt` file.

The server keeps the APS client secret private and gives the browser a short-lived, read-only Viewer token. APS recommends separating the server's internal token from the viewer token in exactly this way. [APS authentication guide](https://get-started.aps.autodesk.com/tutorials/simple-viewer/auth/)

## Run locally

Prerequisites: Node.js 20+ and an APS application with the Data Management and Model Derivative APIs enabled.

1. Clone the repository and enter it.
2. Copy `.env.example` to `.env`.
3. Set `APS_CLIENT_ID` and `APS_CLIENT_SECRET` in `.env`.
4. Run `npm ci` followed by `npm start`.
5. Open `http://localhost:8080`.

For a new model, temporarily set `APS_ENABLE_UPLOADS=true` in your local `.env`, restart the server, and use **Upload**. When translation finishes, copy the browser URL fragment (the part after `#`) into `APS_DEFAULT_MODEL_URN`. Set `APS_ENABLE_UPLOADS=false` before deploying.

## Public demo deployment (Render Free)

This project includes `render.yaml`, so it can be deployed as a Node web service from GitHub.

1. Push this project to GitHub. Do not commit `.env` or any APS secret.
2. In Render, select **New > Blueprint** and choose the GitHub repository.
3. Enter these service environment variables in Render:
   - `APS_CLIENT_ID`
   - `APS_CLIENT_SECRET`
   - `APS_BUCKET` (optional if you use the default derived bucket)
   - `APS_DEFAULT_MODEL_URN`
4. Keep `APS_ENABLE_UPLOADS=false` and `APS_ENABLE_MODEL_SELECTION=false`.
5. Deploy, then share the generated `https://...onrender.com` URL.

Render supports Node/Express web services and runs `npm ci` / `npm start` for this configuration. Its free web services spin down after 15 minutes of inactivity, so the first visit after idle may take about a minute; APS storage and the translated derivative persist independently of the app server. [Render Node deployment](https://render.com/docs/deploy-node-express-app), [Render Free limits](https://render.com/docs/free), [Render environment variables](https://render.com/docs/configure-environment-variables)

## About the RVT file and GitHub

The live web app does not require the original RVT after APS has translated it. If you choose to store the 139 MB RVT in GitHub for your project record, track `*.rvt` with Git LFS before committing; ordinary GitHub repositories reject large files. GitHub Free supports LFS files up to 2 GB per file, subject to LFS storage and bandwidth allowances. [GitHub LFS documentation](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage)

## Security

- Never commit `.env`, `APS_CLIENT_SECRET`, or live access tokens.
- Keep uploads disabled on the public site. A public upload endpoint would let strangers consume your APS storage and translation quota.
- Rotate a secret immediately if it is ever pasted into chat, committed to Git, or otherwise exposed.
