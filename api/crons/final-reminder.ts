import type { VercelRequest, VercelResponse } from '@vercel/node';
import { notifyAllUsers } from '../../lib/email-service';
import { supabaseAdmin } from '../../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 11:30 PM IST (18:00 UTC) - Final Journal Reminder
  console.log('Running 11:30 PM IST Final Email Cron...');
  await notifyAllUsers(
    supabaseAdmin,
    "TradeX: Final Reminder",
    "⏰ Complete your Daily Reflection and set your Plans for Tomorrow before sleeping!"
  );
  return res.status(200).send('Cron Job Executed');
}
