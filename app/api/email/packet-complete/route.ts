import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail, packetCompleteNotificationHtml } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { client_id } = await request.json();
    const supabase = createAdminClient();

    const { data: client } = await supabase
      .from('onboarding_clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get admin notification email
    const { data: settings } = await supabase
      .from('onboarding_settings')
      .select('notification_email')
      .limit(1)
      .single();

    if (!settings?.notification_email) {
      return NextResponse.json({ success: false, reason: 'no_notification_email' });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const adminUrl = `${baseUrl}/clients/${client.id}`;

    const sent = await sendEmail({
      to: settings.notification_email,
      subject: `${client.first_name} ${client.last_name} completed their intake documents`,
      html: packetCompleteNotificationHtml(`${client.first_name} ${client.last_name}`, adminUrl),
    });

    return NextResponse.json({ success: sent });
  } catch (err) {
    console.error('[Packet Complete Email]', err);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
