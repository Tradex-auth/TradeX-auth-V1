import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const getEnvironmentVariable = (key: string) => {
  if (process.env[key]) return process.env[key];
  return '';
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || getEnvironmentVariable('VITE_SUPABASE_URL') || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY') || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appUrl = (process.env.APP_URL || getEnvironmentVariable('APP_URL') || '').replace(/\/$/, '');
  const code = req.query.code as string;
  const userId = req.query.state as string;

  try {
    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || getEnvironmentVariable('GOOGLE_CLIENT_ID') || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || getEnvironmentVariable('GOOGLE_CLIENT_SECRET') || '',
      redirect_uri: `${appUrl}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_in } = data;

    if (userId) {
      await supabaseAdmin
        .from('profiles')
        .update({ 
          google_connected: true,
          google_refresh_token: refresh_token 
        })
        .eq('id', userId);
    }

    return res.status(200).send(`
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
    return res.status(500).send('Authentication failed');
  }
}
