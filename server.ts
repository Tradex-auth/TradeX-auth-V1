import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import cron from 'node-cron';
import { getEnv } from './lib/env-config.js';
import { sendEmailNotification } from './lib/email-service.js';
import { supabase, supabaseAdmin } from './lib/supabase.js';
import { generateLearningReminder } from './lib/ai-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Google OAuth Endpoints
  app.get('/api/auth/google/url', (req, res) => {
    const appUrl = getEnv('APP_URL').replace(/\/$/, '');
    const userId = req.query.uid as string;
    
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      redirect_uri: `${appUrl}/api/auth/google/callback`,
      client_id: getEnv('GOOGLE_CLIENT_ID'),
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      state: userId || '', // Pass UID as state
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
    const appUrl = getEnv('APP_URL').replace(/\/$/, '');
    const code = req.query.code as string;
    const userId = req.query.state as string;

    console.log('OAuth Callback: Received request', { code: code ? 'present' : 'absent', userId });

    try {
      console.log('OAuth Callback: Exchanging code for tokens...');
      const { data } = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: getEnv('GOOGLE_CLIENT_ID'),
        client_secret: getEnv('GOOGLE_CLIENT_SECRET'),
        redirect_uri: `${appUrl}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token, expires_in } = data;
      console.log('OAuth Callback: Tokens received', { 
        hasAccessToken: !!access_token, 
        hasRefreshToken: !!refresh_token, 
        expiresIn: expires_in 
      });

      // Server-side update if userId is present
      if (userId) {
        console.log(`OAuth Callback: Attempting profile update for user ${userId}...`);
        
        // Use supabaseAdmin to bypass RLS and ensures we have the power to update
        const { data: updateResult, error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            google_connected: true,
            google_refresh_token: refresh_token 
          })
          .eq('id', userId)
          .select();
        
        if (profileError) {
          console.error('OAuth Callback: Profile update error:', profileError);
        } else if (updateResult && updateResult.length > 0) {
          console.log(`OAuth Callback: Profile successfully updated for ${userId}`);
        } else {
          console.warn(`OAuth Callback: No profile found for ${userId}, attempting to create it...`);
          // Try to fetch user info to populate the profile if it's missing (rare, but happens if trigger fails)
          try {
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
            if (!userError && userData?.user) {
              const { error: insertError } = await supabaseAdmin
                .from('profiles')
                .insert({
                  id: userId,
                  email: userData.user.email,
                  name: userData.user.user_metadata?.full_name,
                  google_connected: true,
                  google_refresh_token: refresh_token,
                  role: 'user'
                });
              
              if (insertError) {
                console.error('OAuth Callback: Failed to insert missing profile:', insertError);
              } else {
                console.log('OAuth Callback: Successfully created profile during OAuth flow');
              }
            }
          } catch (e) {
            console.error('OAuth Callback: Error while creating missing profile:', e);
          }
        }
      } else {
        console.warn('OAuth Callback: No userId (state) found in callback query');
      }

      // Send success message to parent window and close popup
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
      console.error('Google OAuth Error:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.post('/api/auth/google/refresh', async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).send('Missing refresh token');

    try {
      const { data } = await axios.post('https://oauth2.googleapis.com/token', {
        refresh_token,
        client_id: getEnv('GOOGLE_CLIENT_ID'),
        client_secret: getEnv('GOOGLE_CLIENT_SECRET'),
        grant_type: 'refresh_token',
      });

      res.json({
        ...data,
        updated_at: Date.now()
      });
    } catch (error) {
      console.error('Google Token Refresh Error:', error);
      res.status(500).send('Refresh failed');
    }
  });

  // Email Notifications Cron Jobs (IST to UTC conversion)
  
  async function notifyAllUsers(subject: string, message: string, isAiGenerated = false) {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('email, name');
        
      if (error) throw error;
      if (!profiles || profiles.length === 0) return;

      console.log(`Sending emails to ${profiles.length} users...`);
      for (const p of profiles) {
        if (p.email) {
          const firstName = p.name ? p.name.split(' ')[0] : 'Trader';
          const personalizedMessage = `Hey ${firstName},\n\n${message}`;
          
          const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #333; border-radius: 12px; background-color: #000; color: #fff;">
              <h1 style="color: #3b82f6; font-size: 24px; font-weight: 800; text-transform: uppercase; margin-bottom: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">TradeX Priority</h1>
              <p style="font-size: 18px; font-weight: 600; color: #3b82f6;">Hey ${firstName},</p>
              <div style="font-size: 16px; line-height: 1.6; color: #e5e5e5; margin: 20px 0;">
                ${message.replace(/\n/g, '<br>')}
              </div>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; font-size: 12px; color: #666; font-style: italic; text-align: center;">
                "Discipline is the bridge between goals and accomplishment." <br>
                Target: Nov 8, 2026
              </div>
            </div>
          `;
          
          await sendEmailNotification(p.email, subject, personalizedMessage, html);
        }
      }
    } catch (err) {
      console.error('Failed to notify all users:', err);
    }
  }

  // 11:00 PM IST (17:30 UTC) - Journal Reminder
  cron.schedule('30 17 * * *', () => {
    console.log('Running 11:00 PM IST Email Cron...');
    notifyAllUsers(
      "TradeX: Nightly Checklist",
      "⚠️ You have not filled the Journal entry yet. Please log your performance now to maintain your streak!"
    );
  });

  // 11:30 PM IST (18:00 UTC) - Final Journal Reminder
  cron.schedule('0 18 * * *', () => {
    console.log('Running 11:30 PM IST Email Cron...');
    notifyAllUsers(
      "TradeX: Final Reminder",
      "⏰ Complete your Daily Reflection and set your Plans for Tomorrow before sleeping!"
    );
  });

  // 7:30 PM IST (14:00 UTC) - Learning Reminder
  cron.schedule('0 14 * * *', async () => {
    console.log('Running 7:30 PM IST Learning Email Cron...');
    const aiMessage = await generateLearningReminder();
    notifyAllUsers(
      "TradeX: Time to Master the Charts",
      aiMessage
    );
  });

  // 10:00 AM IST (04:30 UTC) - Morning Plan Reminder
  cron.schedule('30 4 * * *', () => {
    console.log('Running 10:00 AM IST Email Cron...');
    notifyAllUsers(
      "TradeX: Morning Briefing",
      "🚀 Hey upcoming Traders, its time for you to go through your plan and make the most of it!"
    );
  });

  // Test endpoint for Email
  app.get('/api/test-email', async (req, res) => {
    const testEmail = req.query.email as string;
    if (!testEmail) return res.status(400).send('Missing email query param');
    
    await sendEmailNotification(
      testEmail, 
      "TradeX: Test Notification", 
      "🔔 This is a test email from your TradeX trading system!"
    );
    res.json({ message: `Test email sent to ${testEmail}` });
  });

  app.get('/api/test-learning-email', async (req, res) => {
    const testEmail = req.query.email as string;
    if (!testEmail) return res.status(400).send('Missing email query param');
    
    const aiMessage = await generateLearningReminder();
    await sendEmailNotification(
      testEmail, 
      "TradeX: Learning Reminder Test", 
      aiMessage
    );
    res.json({ message: `Learning reminder test email sent to ${testEmail}`, aiMessage });
  });

  app.post('/api/admin/broadcast-learning', async (req, res) => {
    try {
      const aiMessage = await generateLearningReminder();
      await notifyAllUsers(
        "TradeX: Time to Master the Charts",
        aiMessage
      );
      res.json({ success: true, message: 'Broadcast sent to all users' });
    } catch (err) {
      res.status(500).json({ error: 'Broadcast failed' });
    }
  });

  app.get('/api/ai/status', (req, res) => {
    res.json({ 
      gemini_available: !!getEnv('GEMINI_API_KEY'),
      openai_available: !!getEnv('OPENAI_API_KEY'),
      gemini_preview: !!getEnv('GEMINI_API_KEY'),
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
