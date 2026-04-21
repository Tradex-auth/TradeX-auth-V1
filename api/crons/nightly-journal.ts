import type { VercelRequest, VercelResponse } from '@vercel/node';
import { notifyAllUsers } from '../../lib/email-service';
import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 11:00 PM IST (17:30 UTC) - Journal Reminder
  console.log('Running 11:00 PM IST Email Cron...');
  await notifyAllUsers(
    supabaseAdmin,
    "TradeX: Nightly Checklist",
    "⚠️ You have not filled the Journal entry yet. Please log your performance now to maintain your streak!"
  );
  return res.status(200).send('Cron Job Executed');
}
