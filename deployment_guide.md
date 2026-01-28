# Deployment Guide (Railway)

This guide walks you through deploying **Planout** to [Railway](https://railway.app/).

## Prerequisites
- A GitHub account with the `planout` repository.
- A [Railway](https://railway.app/) account.

## Step 1: Deploy Backend

1.  **New Project**: Go to Railway Dashboard -> "New Project" -> "Deploy from GitHub repo".
2.  **Select Repo**: Choose your `planout` repository.
3.  **Variable Setup**:
    - Railway will scan for variables. Add `GEMINI_API_KEY` if you want a server-default key (optional now due to BYOK feature).
4.  **Configure Root Directory**:
    - Click on the new service block.
    - Go to **Settings** -> **Root Directory** -> Set to `/backend`.
5.  **Environment Variables**:
    - Railway injects `PORT` naturally (which our new Dockerfile handles).
6.  **Persistence (Optional but Recommended)**:
    - Go to **Volumes**.
    - Click "Add Volume".
    - Mount it to path `/app/app` (since the DB file sits in `app/`).
    - *Note*: If you don't do this, your data is lost on every restart.
7.  **Generate Public Domain**:
    - Go to **Settings** -> **Networking**.
    - Click "Generate Domain" (or add custom).
    - Copy this URL (e.g., `https://backend-production.up.railway.app`).

## Step 2: Deploy Frontend

1.  **Add Service**: In the same Railway project, click "+ New" -> "GitHub Repo" -> Select `planout` again.
2.  **Configure Root Directory**:
    - Go to **Settings** (for the *new* service) -> **Root Directory** -> Set to `/frontend`.
3.  **Environment Variables**:
    - Go to **Variables**.
    - Add `NEXT_PUBLIC_API_URL`.
    - Value: The **Backend URL** from Step 1 (e.g., `https://backend-production.up.railway.app`).
4.  **Build Command**:
    - Railway usually auto-detects `npm run build`. Verify in Settings.
5.  **Generate Public Domain**:
    - Go to **Settings** -> **Networking**.
    - Click "Generate Domain".
    - This is your App URL!

## Step 3: Verify

1.  Open your **Frontend URL**.
2.  Go to **Settings** (Gear icon).
3.  Enter your **Google Gemini API Key** (or use the server default if you set one).
4.  Create a plan and try the "Ask AI" feature.

## "Bring Your Own Key" (BYOK)
We updated the app so users can enter their own API key.
- Keys are stored in the user's browser (`localStorage`).
- Keys are sent only during AI requests via the `x-gemini-api-key` header.
- This allows public demos without leaking your personal quota.
