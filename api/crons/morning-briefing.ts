import type { VercelRequest, VercelResponse } from '@vercel/node';
import { notifyAllUsers } from '../../lib/email-service';
import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 10:00 AM IST (04:30 UTC) - Morning Plan Reminder
  console.log('Running 10:00 AM IST Email Cron...');
  await notifyAllUsers(
    supabaseAdmin,
    "TradeX: Morning Briefing",
    "🚀 Hey upcoming Traders, its time for you to go through your plan and make the most of it!"
  );
  return res.status(200).send('Cron Job Executed');
}
