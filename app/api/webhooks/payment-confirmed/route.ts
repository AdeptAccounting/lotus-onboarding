import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (n8n sends this in the header)
    const authHeader = request.headers.get('x-webhook-secret');
    if (WEBHOOK_SECRET && authHeader !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { client_email, client_name, amount_cents, square_payment_id, source } = body;

    if (!client_email && !client_name) {
      return NextResponse.json({ error: 'client_email or client_name required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find the client by email first, then fall back to name match
    let clientQuery = supabase
      .from('onboarding_clients')
      .select('*')
      .in('status', ['contract_signed', 'payment_pending']);

    if (client_email) {
      clientQuery = clientQuery.ilike('email', client_email);
    }

    const { data: clients } = await clientQuery;

    if (!clients || clients.length === 0) {
      // Try matching by name if email didn't work
      if (client_name && !client_email) {
        const nameParts = client_name.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        const { data: nameMatches } = await supabase
          .from('onboarding_clients')
          .select('*')
          .in('status', ['contract_signed', 'payment_pending'])
          .ilike('first_name', firstName)
          .ilike('last_name', lastName || '%');

        if (!nameMatches || nameMatches.length === 0) {
          return NextResponse.json({ error: 'No matching client found', client_email, client_name }, { status: 404 });
        }

        // Use name match
        const client = nameMatches[0];
        return await confirmPayment(supabase, client, { amount_cents, square_payment_id, source });
      }

      return NextResponse.json({ error: 'No matching client found', client_email }, { status: 404 });
    }

    // If multiple clients matched, prefer the one whose payment amount matches
    let client = clients[0];
    if (clients.length > 1 && amount_cents) {
      const amountMatch = clients.find(c => c.payment_amount_cents === amount_cents);
      if (amountMatch) client = amountMatch;
    }

    return await confirmPayment(supabase, client, { amount_cents, square_payment_id, source });
  } catch (err) {
    console.error('[Payment Webhook] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function confirmPayment(
  supabase: ReturnType<typeof createAdminClient>,
  client: { id: string; payment_amount_cents: number | null; access_token: string },
  meta: { amount_cents?: number; square_payment_id?: string; source?: string }
) {
  // Update client status to active
  await supabase
    .from('onboarding_clients')
    .update({
      status: 'active',
      payment_completed_at: new Date().toISOString(),
      square_payment_id: meta.square_payment_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', client.id);

  // Record the payment
  await supabase.from('onboarding_payments').insert({
    client_id: client.id,
    amount_cents: meta.amount_cents || client.payment_amount_cents || 0,
    status: 'completed',
    square_payment_id: meta.square_payment_id || null,
  });

  // Log the activity
  await supabase.from('onboarding_activity_log').insert({
    client_id: client.id,
    action: 'payment_completed',
    details: {
      amount_cents: meta.amount_cents || client.payment_amount_cents,
      square_payment_id: meta.square_payment_id || null,
      source: meta.source || 'webhook',
    },
    actor: 'admin',
  });

  return NextResponse.json({
    success: true,
    client_id: client.id,
    message: 'Payment confirmed, client moved to active',
  });
}
