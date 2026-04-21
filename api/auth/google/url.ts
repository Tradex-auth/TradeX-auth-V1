import type { VercelRequest, VercelResponse } from '@vercel/node';

// Fallback utility in case environment configs aren't fully populated by other standard means
const getEnvironmentVariable = (key: string) => {
  if (process.env[key]) return process.env[key];
  return '';
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  const appUrl = (process.env.APP_URL || getEnvironmentVariable('APP_URL') || '').replace(/\/$/, '');
  const userId = req.query.uid as string;
  
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: `${appUrl}/api/auth/google/callback`,
    client_id: process.env.GOOGLE_CLIENT_ID || getEnvironmentVariable('GOOGLE_CLIENT_ID') || '',
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
  return res.status(200).json({ url: `${rootUrl}?${qs.toString()}` });
}
