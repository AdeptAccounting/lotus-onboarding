import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail, welcomeEmailHtml } from '@/lib/email';

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
    const portalUrl = `${baseUrl}/portal/${client.access_token}`;

    const sent = await sendEmail({
      to: client.email,
      subject: 'Welcome to The Lotus Program Experience - Your Onboarding Portal',
      html: welcomeEmailHtml(`${client.first_name}`, portalUrl),
    });

    return NextResponse.json({ success: sent });
  } catch (err) {
    console.error('[Welcome Email]', err);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
