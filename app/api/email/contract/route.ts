import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail, contractReadyEmailHtml } from '@/lib/email';
import { SERVICE_TYPE_LABELS } from '@/types';

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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const portalUrl = `${baseUrl}/portal/${client.access_token}/contract`;
    const serviceLabel = client.service_type ? SERVICE_TYPE_LABELS[client.service_type as keyof typeof SERVICE_TYPE_LABELS] : 'Doula';

    const sent = await sendEmail({
      to: client.email,
      subject: `Your ${serviceLabel} Contract is Ready - The Lotus Program Experience`,
      html: contractReadyEmailHtml(client.first_name, portalUrl, serviceLabel),
    });

    return NextResponse.json({ success: sent });
  } catch (err) {
    console.error('[Contract Email]', err);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
