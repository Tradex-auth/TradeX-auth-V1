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
