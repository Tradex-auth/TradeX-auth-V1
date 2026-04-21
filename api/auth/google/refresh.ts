import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const getEnvironmentVariable = (key: string) => {
  if (process.env[key]) return process.env[key];
  return '';
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).send('Missing refresh token');

  try {
    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID || getEnvironmentVariable('GOOGLE_CLIENT_ID') || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || getEnvironmentVariable('GOOGLE_CLIENT_SECRET') || '',
      grant_type: 'refresh_token',
    });
    return res.status(200).json({ ...data, updated_at: Date.now() });
  } catch (error) {
    return res.status(500).send('Refresh failed');
  }
}
