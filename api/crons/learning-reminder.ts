import type { VercelRequest, VercelResponse } from '@vercel/node';
import { notifyAllUsers } from '../../lib/email-service';
import { supabaseAdmin } from '../../lib/supabase';
import { generateLearningReminder } from '../../lib/ai-service';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 7:30 PM IST (14:00 UTC) - Learning Reminder
  console.log('Running 7:30 PM IST Learning Email Cron...');
  const aiMessage = await generateLearningReminder();
  await notifyAllUsers(
    supabaseAdmin,
    "TradeX: Time to Master the Charts",
    aiMessage
  );
  return res.status(200).send('Cron Job Executed');
}
