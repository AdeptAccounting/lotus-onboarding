import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail, reminderEmailHtml } from '@/lib/email';

const STAGE_MESSAGES: Record<string, string> = {
  packet1_sent: 'You have intake documents waiting for your review',
  contract_sent: 'Your contract is ready to sign',
  contract_signed: 'Your payment is pending',
  payment_pending: 'Your payment is pending',
};

export async function POST(req: NextRequest) {
  try {
    const { client_id } = await req.json();

    if (!client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: client, error } = await supabase
      .from('onboarding_clients')
      .select('id, first_name, last_name, email, status, access_token')
      .eq('id', client_id)
      .single();

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const message = STAGE_MESSAGES[client.status] ?? 'Please check your portal for next steps';

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      `https://${req.headers.get('host')}`;
    const portalUrl = `${baseUrl}/portal/${client.access_token}`;
    const clientName = `${client.first_name} ${client.last_name}`;

    const html = reminderEmailHtml(clientName, portalUrl, client.status, message);

    const sent = await sendEmail({
      to: client.email,
      subject: `A friendly reminder from The Lotus Program Experience`,
      html,
    });

    // Log the reminder regardless of email send success (it was attempted)
    await supabase.from('onboarding_activity_log').insert({
      client_id: client.id,
      action: 'reminder_sent',
      details: {
        stage: client.status,
        message,
        email_sent: sent,
      },
      actor: 'admin',
    });

    if (!sent) {
      return NextResponse.json(
        { error: 'Email could not be sent. Gmail may not be connected.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Reminder] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
