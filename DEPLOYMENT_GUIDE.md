# Deployment Guide: Vercel & GitHub

This guide explains how to deploy your full-stack AI Trading Journal to Vercel and manage secrets using GitHub/Vercel environments.

## 1. Secrets Management
You should NOT store secrets directly in GitHub repositories. Instead, store them in **Vercel Project Settings**.

### Required Environment Variables
Add these to your **Vercel Project Settings > Environment Variables**:

| Variable | Description | Location |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL | Supabase Dashboard |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anonymous Key | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | **PRIVATE** Service Key | Supabase Dashboard (Keep hidden!) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Google Cloud Console |
| `GEMINI_API_KEY` | Gemini API Key | Google AI Studio |
| `APP_URL` | Your Vercel Deployment URL | Needs to match your production URL |

## 2. GitHub Configuration
1. Push your code to a private GitHub repository.
2. In GitHub, you don't need "Action Secrets" unless you are running custom CI/CD. Vercel will pull the code directly.

## 3. Vercel Deployment Configuration
Since this is a full-stack app with a custom `server.ts`:
1. Vercel treats `api/` directory as serverless functions by default. 
2. However, for a single Express server, you can use a `vercel.json` file to route all requests to your server.

**Note:** In Vercel, serverless environments have a 10s-30s timeout on the Hobby plan. Ensure your authentication/sync logic doesn't exceed this.

## 4. Google OAuth Redirect URIs
In your Google Cloud Console, you MUST update your Authorized Redirect URIs to match your Vercel domain:
- `https://your-app.vercel.app/api/auth/google/callback`

---
*Created on: 2026-04-20*
