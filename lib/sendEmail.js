import { Resend } from 'resend';

let resendClient = null;

const getResendClient = () => {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required but was not found.');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
};

export const sendVerificationEmail = async (email, confirmationUrl) => {
  const client = getResendClient();
  const emailHtml = `
    <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #F3F4F6; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <h1 style="color: #0F6E56; font-size: 24px; margin-bottom: 4px; font-weight: 700;">TTU Market</h1>
      <p style="color: #6B7280; font-size: 13px; margin-bottom: 32px;">The Student Economy of TTU</p>
      <h2 style="color: #0D0D0D; font-size: 20px; margin-bottom: 12px; font-weight: 600;">Confirm your account</h2>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">You are one step away from joining the student economy of Takoradi Technical University. Click the button below to verify your email and activate your account.</p>
      <a href="${confirmationUrl}" style="display: inline-block; background: #0F6E56; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; text-align: center;">Confirm My Account</a>
      <p style="color: #9CA3AF; font-size: 13px; margin-top: 32px;">If you did not create a TTU Market account you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
      <p style="color: #9CA3AF; font-size: 12px;">TTU Market — Takoradi Technical University — ttu-market.vercel.app</p>
    </div>
  `;

  try {
    console.log(`[Resend Engine] Attempting to deliver email via custom domain 'TTU Market <noreply@ttumarket.com>' to ${email}...`);
    const { data, error } = await client.emails.send({
      from: 'TTU Market <noreply@ttumarket.com>',
      to: email,
      subject: 'Confirm your TTU Market account',
      html: emailHtml
    });
    
    if (error) {
      throw error;
    }
    console.log('[Resend Engine] Custom domain email completed successfully:', data);
  } catch (primaryError) {
    console.warn('[Resend Engine] Custom domain failed. This is expected if ttumarket.com is not yet verified on your Resend dashboard. Error details:', primaryError);
    console.log(`[Resend Engine] Triggering automatic fallback translation of sender to sandboxed 'onboarding@resend.dev'...`);
    
    const { data, error } = await client.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Confirm your TTU Market account',
      html: emailHtml
    });

    if (error) {
      console.error('[Resend Engine] Error during sandbox fallback delivery:', error);
      throw error;
    }
    console.log('[Resend Engine] Sandbox fallback email completed successfully:', data);
  }
};

export const sendPasswordResetEmail = async (email, recoveryUrl) => {
  const client = getResendClient();
  const emailHtml = `
    <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; border: 1px solid #F3F4F6; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <h1 style="color: #0F6E56; font-size: 24px; margin-bottom: 4px; font-weight: 700;">TTU Market</h1>
      <p style="color: #6B7280; font-size: 13px; margin-bottom: 32px;">The Student Economy of TTU</p>
      <h2 style="color: #0D0D0D; font-size: 20px; margin-bottom: 12px; font-weight: 600;">Reset your password</h2>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 32px;">We're keeping local campus escrow robust. Click the button below to recover and update your password safely on your account.</p>
      <a href="${recoveryUrl}" style="display: inline-block; background: #0F6E56; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; text-align: center;">Reset My Password</a>
      <p style="color: #9CA3AF; font-size: 13px; margin-top: 32px;">If you did not request this password recovery, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
      <p style="color: #9CA3AF; font-size: 12px;">TTU Market — Takoradi Technical University — ttu-market.vercel.app</p>
    </div>
  `;

  try {
    console.log(`[Resend Engine] Attempting to deliver password recovery email to ${email}...`);
    const { data, error } = await client.emails.send({
      from: 'TTU Market <noreply@ttumarket.com>',
      to: email,
      subject: 'Reset your TTU Market account password',
      html: emailHtml
    });
    
    if (error) {
      throw error;
    }
    console.log('[Resend Engine] Recovery email sent successfully:', data);
  } catch (primaryError) {
    console.warn('[Resend Engine] Custom domain recovery failed. Triggering onboarding@resend.dev fallback...', primaryError);
    
    const { data, error } = await client.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Reset your TTU Market account password',
      html: emailHtml
    });

    if (error) {
      console.error('[Resend Engine] Recovery fallback delivery failed:', error);
      throw error;
    }
    console.log('[Resend Engine] Sandbox recovery fallback email completed successfully:', data);
  }
};
