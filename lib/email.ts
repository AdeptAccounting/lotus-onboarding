import { createAdminClient } from '@/lib/supabase/server';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

async function getValidGmailToken(): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: settings } = await supabase
    .from('onboarding_settings')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .limit(1)
    .single();

  if (!settings?.google_access_token) return null;

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(settings.google_token_expires_at || 0);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (now.getTime() >= expiresAt.getTime() - bufferMs && settings.google_refresh_token) {
    // Refresh the token
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: (process.env.GOOGLE_CLIENT_ID || '').trim(),
        client_secret: (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
        refresh_token: settings.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const data = await resp.json();
    if (data.access_token) {
      const newExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
      await supabase
        .from('onboarding_settings')
        .update({
          google_access_token: data.access_token,
          google_token_expires_at: newExpiresAt,
          ...(data.refresh_token ? { google_refresh_token: data.refresh_token } : {}),
          updated_at: new Date().toISOString(),
        })
        .not('id', 'is', null);

      return data.access_token;
    }
  }

  return settings.google_access_token;
}

export async function sendEmail({ to, subject, html }: EmailParams): Promise<boolean> {
  const accessToken = await getValidGmailToken();

  if (!accessToken) {
    console.error('[Email] Gmail not connected, skipping email');
    return false;
  }

  // Encode subject for UTF-8 (RFC 2047)
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;

  // Build MIME message
  const messageParts = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ];
  const message = messageParts.join('\r\n');

  // Base64url encode
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!resp.ok) {
      const error = await resp.text();
      console.error('[Email] Gmail API error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Email] Failed to send:', err);
    return false;
  }
}

export function welcomeEmailHtml(clientName: string, portalUrl: string): string {
  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FDF8F5; padding: 40px 30px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6B3A5E; font-size: 24px; margin: 0;">The Lotus Program Experience</h1>
        <p style="color: #B5648A; font-size: 14px; margin-top: 4px;">Client Onboarding</p>
      </div>

      <p style="color: #5C4A42; font-size: 16px; line-height: 1.6;">
        Dear ${clientName},
      </p>

      <p style="color: #5C4A42; font-size: 16px; line-height: 1.6;">
        Welcome! We are so honored that you've chosen The Lotus Program Experience for your care journey.
        To get started, we need you to review and sign a few intake documents.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #B5648A, #9B4D73); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 600;">
          Access Your Portal
        </a>
      </div>

      <p style="color: #8B7080; font-size: 14px; line-height: 1.6;">
        Click the button above to access your personal onboarding portal. You'll be able to review
        and sign your intake documents at your own pace.
      </p>

      <hr style="border: none; border-top: 1px solid #E8D8E0; margin: 30px 0;" />

      <p style="color: #8B7080; font-size: 12px; text-align: center;">
        With love and care,<br />
        The Lotus Program Experience
      </p>
      <p style="color: #C0A8B4; font-size: 9px; text-align: center; margin-top: 16px; letter-spacing: 0.5px;">Powered by Adept Data Automation</p>
    </div>
  `;
}

export function contractReadyEmailHtml(clientName: string, portalUrl: string, serviceType: string): string {
  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FDF8F5; padding: 40px 30px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6B3A5E; font-size: 24px; margin: 0;">The Lotus Program Experience</h1>
      </div>

      <p style="color: #5C4A42; font-size: 16px; line-height: 1.6;">
        Dear ${clientName},
      </p>

      <p style="color: #5C4A42; font-size: 16px; line-height: 1.6;">
        Great news! Your intake documents have been reviewed and approved. Your ${serviceType} contract
        is now ready for your signature.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #B5648A, #9B4D73); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 600;">
          Sign Your Contract
        </a>
      </div>

      <p style="color: #8B7080; font-size: 14px; line-height: 1.6;">
        After signing, you'll be able to complete your payment and officially begin your journey with us.
      </p>

      <hr style="border: none; border-top: 1px solid #E8D8E0; margin: 30px 0;" />

      <p style="color: #8B7080; font-size: 12px; text-align: center;">
        With love and care,<br />
        The Lotus Program Experience
      </p>
      <p style="color: #C0A8B4; font-size: 9px; text-align: center; margin-top: 16px; letter-spacing: 0.5px;">Powered by Adept Data Automation</p>
    </div>
  `;
}

export function reminderEmailHtml(
  clientName: string,
  portalUrl: string,
  stage: string,
  message: string
): string {
  const firstName = clientName.split(' ')[0];
  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FDF8F5; padding: 40px 30px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6B3A5E; font-size: 24px; margin: 0;">The Lotus Program Experience</h1>
        <p style="color: #B5648A; font-size: 14px; margin-top: 4px;">Client Onboarding Portal</p>
      </div>

      <p style="color: #5C4A42; font-size: 16px; line-height: 1.6;">
        Hi ${firstName},
      </p>

      <p style="color: #5C4A42; font-size: 16px; line-height: 1.6;">
        This is a friendly reminder that ${message}. When you're ready, you can access your portal below to continue.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #B5648A, #9B4D73); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 600;">
          Access Your Portal
        </a>
      </div>

      <p style="color: #8B7080; font-size: 14px; line-height: 1.6;">
        If you have any questions or need assistance, please don't hesitate to reach out. We're here to support you every step of the way.
      </p>

      <hr style="border: none; border-top: 1px solid #E8D8E0; margin: 30px 0;" />

      <p style="color: #8B7080; font-size: 12px; text-align: center;">
        With love and care,<br />
        The Lotus Program Experience
      </p>
      <p style="color: #C0A8B4; font-size: 9px; text-align: center; margin-top: 16px; letter-spacing: 0.5px;">Powered by Adept Data Automation</p>
    </div>
  `;
}

export function paymentLinkReadyEmailHtml(clientName: string, portalUrl: string): string {
  const firstName = clientName.split(' ')[0];
  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FDF8F5; padding: 40px 30px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6B3A5E; font-size: 24px; margin: 0;">The Lotus Program Experience</h1>
      </div>

      <p style="color: #5C4A42; font-size: 16px; line-height: 1.6;">
        Hi ${firstName},
      </p>

      <p style="color: #5C4A42; font-size: 16px; line-height: 1.6;">
        Your payment link is ready! You can now complete your payment through your client portal.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #B5648A, #9B4D73); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 600;">
          Complete Payment
        </a>
      </div>

      <p style="color: #8B7080; font-size: 14px; line-height: 1.6;">
        Click the button above to access your portal and complete your payment securely via Square.
      </p>

      <hr style="border: none; border-top: 1px solid #E8D8E0; margin: 30px 0;" />

      <p style="color: #8B7080; font-size: 12px; text-align: center;">
        With love and care,<br />
        The Lotus Program Experience
      </p>
      <p style="color: #C0A8B4; font-size: 9px; text-align: center; margin-top: 16px; letter-spacing: 0.5px;">Powered by Adept Data Automation</p>
    </div>
  `;
}

export function portalUpdateEmailHtml(
  clientName: string,
  portalUrl: string,
  updateType: 'message' | 'document' | 'payment_link',
  preview?: string
): string {
  const firstName = clientName.split(' ')[0];
  const typeLabels = {
    message: 'a new message',
    document: 'a new document',
    payment_link: 'a payment update',
  };

  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FDF8F5; padding: 40px 30px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6B3A5E; font-size: 24px; margin: 0;">The Lotus Program Experience</h1>
      </div>

      <p style="color: #5C4A42; font-size: 16px; line-height: 1.6;">
        Hi ${firstName},
      </p>

      <p style="color: #5C4A42; font-size: 16px; line-height: 1.6;">
        Femeika has ${typeLabels[updateType]} for you in your client portal.
      </p>

      ${preview ? `
      <div style="background: white; border-left: 3px solid #B5648A; padding: 12px 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <p style="color: #5C4A42; font-size: 14px; line-height: 1.5; margin: 0;">${preview}</p>
      </div>
      ` : ''}

      <div style="text-align: center; margin: 30px 0;">
        <a href="${portalUrl}" style="display: inline-block; background: linear-gradient(135deg, #B5648A, #9B4D73); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 600;">
          View in Portal
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #E8D8E0; margin: 30px 0;" />

      <p style="color: #8B7080; font-size: 12px; text-align: center;">
        With love and care,<br />
        The Lotus Program Experience
      </p>
      <p style="color: #C0A8B4; font-size: 9px; text-align: center; margin-top: 16px; letter-spacing: 0.5px;">Powered by Adept Data Automation</p>
    </div>
  `;
}

export function packetCompleteNotificationHtml(clientName: string, adminUrl: string): string {
  return `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FDF8F5; padding: 40px 30px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #6B3A5E; font-size: 24px; margin: 0;">New Submission!</h1>
      </div>

      <p style="color: #5C4A42; font-size: 16px; line-height: 1.6;">
        <strong>${clientName}</strong> has completed and submitted all of their intake documents (Packet 1).
        Please review and approve to proceed with their onboarding.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${adminUrl}" style="display: inline-block; background: linear-gradient(135deg, #B5648A, #9B4D73); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 600;">
          Review Documents
        </a>
      </div>
      <p style="color: #C0A8B4; font-size: 9px; text-align: center; margin-top: 16px; letter-spacing: 0.5px;">Powered by Adept Data Automation</p>
    </div>
  `;
}
