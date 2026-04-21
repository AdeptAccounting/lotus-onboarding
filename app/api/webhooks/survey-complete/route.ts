import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const WEBHOOK_SECRET = process.env.SURVEY_WEBHOOK_SECRET || '';

interface SurveyCompletePayload {
  email?: string;
  response_id?: string;
  submitted_at?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('x-webhook-secret');
    if (!WEBHOOK_SECRET || authHeader !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as SurveyCompletePayload;
    const email = body.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'email required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const submittedAt = body.submitted_at || new Date().toISOString();

    const { data: client } = await supabase
      .from('onboarding_clients')
      .select('id, survey_completed_at')
      .ilike('email', email)
      .single();

    if (!client) {
      console.warn('[Survey Webhook] No matching client for email:', email);
      return NextResponse.json({ error: 'No matching client', email }, { status: 404 });
    }

    if (client.survey_completed_at) {
      return NextResponse.json({
        ok: true,
        message: 'Already recorded',
        client_id: client.id,
        survey_completed_at: client.survey_completed_at,
      });
    }

    await supabase
      .from('onboarding_clients')
      .update({
        survey_completed_at: submittedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', client.id);

    await supabase.from('onboarding_activity_log').insert({
      client_id: client.id,
      action: 'survey_completed',
      details: {
        response_id: body.response_id || null,
        submitted_at: submittedAt,
      },
      actor: 'client',
    });

    return NextResponse.json({
      ok: true,
      client_id: client.id,
      survey_completed_at: submittedAt,
    });
  } catch (err) {
    console.error('[Survey Webhook] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
