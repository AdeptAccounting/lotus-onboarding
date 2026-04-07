import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail, paymentLinkReadyEmailHtml } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { client_id } = await req.json();

    if (!client_id) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: client, error } = await supabase
      .from('onboarding_clients')
      .select('id, first_name, last_name, email, access_token')
      .eq('id', client_id)
      .single();

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      `https://${req.headers.get('host')}`;
    const portalUrl = `${baseUrl}/portal/${client.access_token}/payment`;
    const clientName = `${client.first_name} ${client.last_name}`;

    const html = paymentLinkReadyEmailHtml(clientName, portalUrl);

    const sent = await sendEmail({
      to: client.email,
      subject: 'Your payment link is ready — The Lotus Program Experience',
      html,
    });

    if (!sent) {
      return NextResponse.json(
        { error: 'Email could not be sent. Gmail may not be connected.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PaymentLink] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
