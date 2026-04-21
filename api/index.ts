import express from 'express';
import axios from 'axios';
import { getEnv } from '../lib/env-config';
import { sendEmailNotification } from '../lib/email-service';
import { supabaseAdmin, supabase } from '../lib/supabase';
import { generateLearningReminder } from '../lib/ai-service';

const app = express();
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/auth/google/url', (req, res) => {
  const appUrl = (process.env.APP_URL || getEnv('APP_URL')).replace(/\/$/, '');
  const userId = req.query.uid as string;
  
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: `${appUrl}/api/auth/google/callback`,
    client_id: process.env.GOOGLE_CLIENT_ID || getEnv('GOOGLE_CLIENT_ID'),
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    state: userId || '',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/documents.readonly',
    ].join(' '),
  };

  const qs = new URLSearchParams(options);
  res.json({ url: `${rootUrl}?${qs.toString()}` });
});

app.get('/api/auth/google/callback', async (req, res) => {
  const appUrl = (process.env.APP_URL || getEnv('APP_URL')).replace(/\/$/, '');
  const code = req.query.code as string;
  const userId = req.query.state as string;

  try {
    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || getEnv('GOOGLE_CLIENT_ID'),
      client_secret: process.env.GOOGLE_CLIENT_SECRET || getEnv('GOOGLE_CLIENT_SECRET'),
      redirect_uri: `${appUrl}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_in } = data;

    if (userId) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          google_connected: true,
          google_refresh_token: refresh_token 
        })
        .eq('id', userId);
    }

    res.send(`
      <html>
        <body style="background: #000; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center; padding: 2rem; border: 1px solid #3b82f6; border-radius: 1rem; background: #0f172a;">
            <h1 style="color: #3b82f6; margin-bottom: 0.5rem;">Authentication Successful</h1>
            <p style="color: #94a3b8; font-size: 0.875rem; margin-bottom: 2rem;">Connecting your TradeX account to Google...</p>
            <script>
              function finish() {
                if (window.opener) {
                  window.opener.postMessage({ 
                    type: 'GOOGLE_AUTH_SUCCESS', 
                    tokens: ${JSON.stringify({ access_token, refresh_token, expires_in, updated_at: Date.now() })} 
                  }, '*');
                  setTimeout(() => window.close(), 1000);
                } else {
                  window.location.href = '/repository';
                }
              }
              finish();
            </script>
            <button onclick="finish()" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 2rem; border-radius: 0.5rem; font-weight: bold; cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em;">
              Complete Sync
            </button>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Authentication failed');
  }
});

app.post('/api/auth/google/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).send('Missing refresh token');

  try {
    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID || getEnv('GOOGLE_CLIENT_ID'),
      client_secret: process.env.GOOGLE_CLIENT_SECRET || getEnv('GOOGLE_CLIENT_SECRET'),
      grant_type: 'refresh_token',
    });
    res.json({ ...data, updated_at: Date.now() });
  } catch (error) {
    res.status(500).send('Refresh failed');
  }
});

export default app;
