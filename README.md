# Signal Dash

Your personal swing trading signal dashboard with Trump tracker.

## Features
- 3-signal watchlist tracker (Congress, Options flow, Technical)
- One-click ticker lookup with auto-populated data
- Trump announcement scanner with market impact analysis
- Persistent watchlist saved to browser storage

## Deploy to Vercel (free)

### 1. Get your free Gemini API key
- Go to [aistudio.google.com](https://aistudio.google.com)
- Sign in with Google
- Click "Get API Key" → "Create API key"
- Copy the key

### 2. Upload this folder to GitHub
- Create a new repo called `signal-dash`
- Upload all files maintaining the folder structure:
  ```
  signal-dash/
  ├── api/
  │   ├── lookup.js
  │   └── trump-scan.js
  ├── public/
  │   └── index.html
  ├── vercel.json
  └── README.md
  ```

### 3. Deploy on Vercel
- Go to [vercel.com](https://vercel.com) and sign in with GitHub
- Click "Add New Project" → select your `signal-dash` repo
- Before deploying, click "Environment Variables" and add:
  - **Name:** `GEMINI_API_KEY`
  - **Value:** your Gemini API key from step 1
- Click Deploy
- Your app will be live at `signal-dash.vercel.app` in ~60 seconds

## Making changes
Come back to Claude, describe what you want changed, get updated files, drag and drop them into your GitHub repo. Vercel auto-redeploys instantly.
