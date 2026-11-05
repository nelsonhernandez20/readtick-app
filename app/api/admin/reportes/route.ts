import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-session';
import { createServiceRoleClient } from '@/utils/supabase/service';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

async function getDbClient() {
  const service = createServiceRoleClient();
  if (service) return service;
  return createClient();
}

export async function GET() {
  const session = await requireAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  const db = await getDbClient();
  const { data, error } = await db
    .from('reportes_pago')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reports: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.message }, { status: session.status });
  }

  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
  }

  const id = body.id?.trim();
  const newStatus = body.status?.trim();

  if (!id || !newStatus) {
    return NextResponse.json({ error: 'id y status son obligatorios' }, { status: 400 });
  }

  const allowed = ['confirmado', 'pendiente', 'rechazado', 'aprobado'];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json({ error: 'Estado no permitido' }, { status: 400 });
  }

  const db = await getDbClient();

  let { data, error: updateError } = await db
    .from('reportes_pago')
    .update({ status: newStatus })
    .eq('id', id)
    .select();

  if (
    updateError &&
    newStatus === 'confirmado' &&
    updateError.message.includes('violates check constraint')
  ) {
    const retry = await db.from('reportes_pago').update({ status: 'aprobado' }).eq('id', id).select();
    updateError = retry.error;
    data = retry.data;
  }

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      {
        error:
          'No se actualizó ningún registro. Revisa RLS en Supabase o configura SUPABASE_SERVICE_ROLE_KEY en el servidor.',
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ report: data[0] });
}
