import nodemailer from 'nodemailer';

/**
 * Service to send email notifications via Gmail SMTP (Nodemailer)
 * This allows sending from tradex.auth@gmail.com without a custom domain.
 */
export async function sendEmailNotification(to: string, subject: string, text: string, html?: string) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS; // This must be a Google App Password

  if (!user || !pass) {
    console.warn('Email Notification: EMAIL_USER or EMAIL_PASS missing.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
  });

  const mailOptions = {
    from: `"TradeX Admin" <${user}>`,
    to: to,
    subject: subject,
    text: text,
    html: html || `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #3b82f6; text-transform: uppercase;">TradeX</h2>
        <div style="font-size: 16px; line-height: 1.6; color: #333;">
          ${text.replace(/\n/g, '<br>')}
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666; font-style: italic;">
          Stay disciplined. Master the charts. Reach Nov 8, 2026.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email Notification sent successfully:', info.messageId);
  } catch (error) {
    console.error('Nodemailer Service Error:', error);
  }
}

export async function notifyAllUsers(supabase: any, subject: string, message: string) {
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
