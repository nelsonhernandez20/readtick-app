'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
  CreditCard,
  QrCode,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  Calendar,
  Mail,
  FileText,
  X,
  Sparkles,
  Filter,
  DollarSign,
  CheckCheck,
  HelpCircle,
  Lock,
  Delete,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export interface ReportePago {
  id: string;
  created_at: string;
  user_identifier: string;
  sender_user?: string | null;
  reference_number: string;
  plan_type: string;
  payment_method: string;
  screenshot_url?: string | null;
  status: 'pendiente' | 'confirmado' | 'aprobado' | 'rechazado' | string;
  notes?: string | null;
}

export default function CobrosPage() {
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  const [reports, setReports] = useState<ReportePago[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendiente' | 'confirmado' | 'rechazado'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewImageReport, setPreviewImageReport] = useState<ReportePago | null>(null);
  const [showSqlHelp, setShowSqlHelp] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAdminEmail(user?.email ?? null);
    });
    fetchReports().finally(() => setIsCheckingAuth(false));
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login?next=/cobros';
  };

  const fetchReports = async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/reportes', { cache: 'no-store' });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(payload.error || 'No tienes permiso para ver este panel.');
        }
        if (res.status === 401) {
          throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
        }
        throw new Error(payload.error || 'Error al cargar reportes de pago.');
      }

      setReports(payload.reports || []);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Error al conectar con la base de datos de reportes.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Actualizar el estado de un reporte (Confirmar / Pendiente / Rechazar)
  const handleUpdateStatus = async (
    id: string,
    newStatus: 'confirmado' | 'pendiente' | 'rechazado'
  ) => {
    setActionLoadingId(id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/admin/reportes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403) {
          setShowSqlHelp(true);
        }
        throw new Error(payload.error || 'No se pudo actualizar el reporte.');
      }

      const finalStatus = payload.report?.status || newStatus;

      // Actualizar estado local inmediatamente con la respuesta real de la base de datos
      setReports((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: finalStatus } : item
        )
      );

      // Si el modal de vista previa está abierto con este reporte, actualizarlo también
      if (previewImageReport?.id === id) {
        setPreviewImageReport((prev) => (prev ? { ...prev, status: finalStatus } : null));
      }

      setSuccessMessage(
        finalStatus === 'confirmado' || finalStatus === 'aprobado'
          ? '¡Pago confirmado con éxito! El estado se ha actualizado en la base de datos.'
          : `El pago ha sido marcado como "${finalStatus}".`
      );
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtrado y búsqueda
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      // Normalizar status para agrupar 'aprobado' como 'confirmado'
      const normalizedStatus =
        item.status === 'aprobado' ? 'confirmado' : item.status || 'pendiente';

      if (statusFilter !== 'todos' && normalizedStatus !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const user = (item.sender_user || item.user_identifier || '').toLowerCase();
        const ref = (item.reference_number || '').toLowerCase();
        const method = (item.payment_method || '').toLowerCase();
        const plan = (item.plan_type || '').toLowerCase();

        return (
          user.includes(query) ||
          ref.includes(query) ||
          method.includes(query) ||
          plan.includes(query)
        );
      }

      return true;
    });
  }, [reports, statusFilter, searchQuery]);

  // Contadores para métricas
  const stats = useMemo(() => {
    let pendientes = 0;
    let confirmados = 0;
    let rechazados = 0;

    reports.forEach((item) => {
      const s = item.status === 'aprobado' ? 'confirmado' : item.status;
      if (s === 'confirmado') confirmados++;
      else if (s === 'rechazado') rechazados++;
      else pendientes++;
    });

    return {
      total: reports.length,
      pendientes,
      confirmados,
      rechazados,
    };
  }, [reports]);

  // Formato de fecha amigable
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch {
      return dateString;
    }
  };

  // Pantalla de carga mientras se verifica la sesión
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#191A23] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#B9FF66]" />
          <span className="text-xs font-semibold">Verificando acceso administrativo...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#191A23] text-[#F3F3F3] flex flex-col font-sans selection:bg-[#B9FF66] selection:text-[#191A23] pb-16">
      {/* Top Navbar Administrativo Oculto */}
      <nav className="sticky top-0 z-40 bg-[#191A23]/95 backdrop-blur-md border-b border-[#292A36] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg bg-[#111218] border border-[#292A36] text-slate-400 hover:text-white hover:border-[#B9FF66]/40 transition"
              title="Volver al Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-[#B9FF66]" />
            </Link>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#B9FF66] p-[1.5px]">
                <div className="w-full h-full bg-[#191A23] rounded-[10px] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#B9FF66]" />
                </div>
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black text-white leading-tight flex items-center gap-2">
                  <span>Gestión de Cobros</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#B9FF66]/10 text-[#B9FF66] border border-[#B9FF66]/30">
                    Panel Admin
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  {adminEmail ? `Admin: ${adminEmail}` : 'Validación y confirmación de comprobantes de pago'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSqlHelp(!showSqlHelp)}
              className="px-2.5 py-1.5 rounded-xl bg-[#111218] border border-[#292A36] text-slate-300 hover:text-white hover:border-[#B9FF66]/50 transition text-xs flex items-center gap-1.5"
              title="Ayuda SQL y permisos de Supabase"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#B9FF66]" />
              <span className="hidden sm:inline">Permisos SQL</span>
            </button>

            <button
              onClick={() => fetchReports(true)}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] font-black text-xs shadow-md shadow-[#B9FF66]/20 transition disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Recargando...' : 'Actualizar'}</span>
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#111218] border border-[#292A36] hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition text-xs font-semibold"
              title="Cerrar sesión"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Banner Informativo si se despliega la Ayuda SQL */}
        {showSqlHelp && (
          <div className="p-5 rounded-2xl bg-[#14151D] border border-[#B9FF66]/40 text-xs space-y-3 animate-fadeIn shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#B9FF66] font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Script SQL seguro para Supabase (RLS + admins)</span>
              </div>
              <button
                onClick={() => setShowSqlHelp(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#191A23]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Sin columna &quot;rol&quot; en usuarios: define admins en la tabla <code>app_admins</code> y
              en <code>ADMIN_EMAILS</code> del servidor (mismo correo). Opcional: usa{' '}
              <code>SUPABASE_SERVICE_ROLE_KEY</code> solo en Next.js para que el panel no dependa de RLS
              permisiva. Ejecuta en el <strong>SQL Editor</strong> de Supabase:
            </p>
            <div className="relative">
              <pre className="p-3 rounded-xl bg-[#111218] border border-[#292A36] text-[#B9FF66] font-mono text-[11px] overflow-x-auto leading-relaxed select-all">
{`-- Lista de admins (inserta tu email; repite para más admins)
create table if not exists public.app_admins (
  email text primary key
);
alter table public.app_admins enable row level security;

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_admins a
    where lower(a.email) = lower(coalesce(auth.jwt()->>'email', ''))
  );
$$;

alter table public.reportes_pago drop constraint if exists reportes_pago_status_check;
alter table public.reportes_pago add constraint reportes_pago_status_check
  check (status in ('pendiente', 'confirmado', 'aprobado', 'rechazado'));

drop policy if exists "Permitir actualizar reportes" on public.reportes_pago;
drop policy if exists "Permitir consultar reportes a todos" on public.reportes_pago;
drop policy if exists "Admin lee reportes" on public.reportes_pago;
drop policy if exists "Admin actualiza reportes" on public.reportes_pago;
drop policy if exists "Usuario lee sus reportes" on public.reportes_pago;
drop policy if exists "Usuario inserta su reporte" on public.reportes_pago;

create policy "Usuario inserta su reporte" on public.reportes_pago
  for insert to authenticated
  with check (
    lower(coalesce(sender_user, user_identifier, '')) = lower(coalesce(auth.jwt()->>'email', ''))
  );

create policy "Usuario lee sus reportes" on public.reportes_pago
  for select to authenticated
  using (
    lower(coalesce(sender_user, user_identifier, '')) = lower(coalesce(auth.jwt()->>'email', ''))
  );

create policy "Admin lee reportes" on public.reportes_pago
  for select to authenticated using (public.is_app_admin());

create policy "Admin actualiza reportes" on public.reportes_pago
  for update to authenticated
  using (public.is_app_admin()) with check (public.is_app_admin());

-- insert into public.app_admins (email) values ('tu-email@ejemplo.com');

notify pgrst, 'reload schema';`}
              </pre>
            </div>
          </div>
        )}

        {/* Notificaciones globales */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <strong>Error: </strong>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-rose-400 hover:text-rose-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tarjetas de Estadísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#14151D] border border-[#292A36] rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Reportes</span>
              <FileText className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-white">{stats.total}</div>
          </div>

          <div className="bg-[#14151D] border border-amber-500/30 rounded-2xl p-4 space-y-1 bg-gradient-to-b from-amber-500/5 to-transparent">
            <div className="flex items-center justify-between text-amber-300 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Pendientes
              </span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">{stats.pendientes}</div>
          </div>

          <div className="bg-[#14151D] border border-[#B9FF66]/30 rounded-2xl p-4 space-y-1 bg-gradient-to-b from-[#B9FF66]/5 to-transparent">
            <div className="flex items-center justify-between text-[#B9FF66] text-xs font-semibold">
              <span>Confirmados</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#B9FF66]" />
            </div>
            <div className="text-2xl font-black text-[#B9FF66]">{stats.confirmados}</div>
          </div>

          <div className="bg-[#14151D] border border-rose-500/30 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Rechazados</span>
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400">{stats.rechazados}</div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#14151D] border border-[#292A36] rounded-2xl p-3">
          {/* Pills de Estado */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                statusFilter === 'todos'
                  ? 'bg-[#B9FF66] text-[#191A23] shadow-md shadow-[#B9FF66]/20 font-black'
                  : 'bg-[#111218] text-slate-400 hover:text-white border border-[#292A36]'
              }`}
            >
              <span>Todos</span>
              <span className="px-1.5 py-0.2 rounded-md bg-[#191A23]/30 text-[10px]">
                {stats.total}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('pendiente')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                statusFilter === 'pendiente'
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20'
                  : 'bg-[#111218] text-amber-400/90 hover:text-amber-300 border border-amber-500/30'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Pendientes</span>
              <span className="px-1.5 py-0.2 rounded-md bg-amber-950/20 text-[10px]">
                {stats.pendientes}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('confirmado')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                statusFilter === 'confirmado'
                  ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/20'
                  : 'bg-[#111218] text-emerald-400/90 hover:text-emerald-300 border border-emerald-500/30'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Confirmados</span>
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-950/20 text-[10px]">
                {stats.confirmados}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('rechazado')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                statusFilter === 'rechazado'
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-[#111218] text-rose-400 hover:text-rose-300 border border-rose-500/30'
              }`}
            >
              <XCircle className="w-3 h-3" />
              <span>Rechazados</span>
            </button>
          </div>

          {/* Campo de Búsqueda */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar correo o referencia..."
              className="w-full bg-[#111218] border border-[#292A36] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#F3F3F3] placeholder:text-slate-500 outline-none focus:border-[#B9FF66] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Reportes */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#B9FF66]" />
            <p className="text-xs font-medium">Cargando comprobantes y reportes de pago...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-16 text-center rounded-3xl border border-dashed border-[#292A36] bg-[#14151D]/40 space-y-3 p-6">
            <div className="w-12 h-12 rounded-2xl bg-[#111218] border border-[#292A36] flex items-center justify-center mx-auto text-slate-500">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No se encontraron reportes</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'todos'
                ? 'No hay registros que coincidan con los filtros o la búsqueda actual.'
                : 'Aún no se han enviado reportes de pago a través de la página de pagos.'}
            </p>
            {(searchQuery || statusFilter !== 'todos') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('todos');
                }}
                className="text-xs font-bold text-[#B9FF66] hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReports.map((report) => {
              const isConfirmed =
                report.status === 'confirmado' || report.status === 'aprobado';
              const isRejected = report.status === 'rechazado';
              const isPending = !isConfirmed && !isRejected;
              const isActionLoading = actionLoadingId === report.id;
              const userEmail = report.sender_user || report.user_identifier || 'Usuario no especificado';

              return (
                <div
                  key={report.id}
                  className={`bg-[#14151D] border rounded-2xl p-4 sm:p-5 transition hover:border-slate-500 shadow-xl space-y-4 ${
                    isPending
                      ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/[0.02] to-transparent'
                      : isConfirmed
                      ? 'border-[#B9FF66]/25 bg-gradient-to-r from-[#B9FF66]/[0.02] to-transparent'
                      : 'border-rose-500/25'
                  }`}
                >
                  {/* Header de la tarjeta */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[#292A36]">
                    <div className="flex items-center gap-2.5">
                      {/* Badge de Método de Pago */}
                      {report.payment_method === 'banco' ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold">
                          <QrCode className="w-3.5 h-3.5 text-purple-400" />
                          <span>Banco / Pago Móvil QR</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#B9FF66]/15 border border-[#B9FF66]/30 text-[#B9FF66] text-xs font-bold">
                          <CreditCard className="w-3.5 h-3.5 text-[#B9FF66]" />
                          <span>PayPal USD</span>
                        </div>
                      )}

                      {/* Badge de Plan */}
                      <span className="text-[11px] font-semibold text-slate-300 px-2 py-0.5 rounded-lg bg-[#111218] border border-[#292A36]">
                        Plan Mensual PRO ($3 USD)
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{formatDate(report.created_at)}</span>
                      </div>

                      {/* Estado actual */}
                      {isConfirmed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          Confirmado
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[11px]">
                          <Clock className="w-3 h-3" />
                          Pendiente
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-[11px]">
                          <XCircle className="w-3 h-3" />
                          Rechazado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cuerpo principal: Información + Miniatura */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {/* Información del usuario y referencia */}
                    <div className="md:col-span-2 space-y-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                          Correo / Cuenta del Usuario
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Mail className="w-4 h-4 text-[#B9FF66]" />
                          <span className="text-sm sm:text-base font-bold text-white font-mono break-all">
                            {userEmail}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                          Nº Referencia o ID de Transacción
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs sm:text-sm font-black text-[#B9FF66] font-mono bg-[#111218] border border-[#292A36] px-2.5 py-1 rounded-lg">
                            {report.reference_number}
                          </span>
                          <button
                            onClick={() => copyToClipboard(report.reference_number, report.id)}
                            className="p-1 rounded-md bg-[#111218] hover:bg-[#191A23] border border-[#292A36] text-slate-400 hover:text-white transition"
                            title="Copiar referencia"
                          >
                            {copiedId === report.id ? (
                              <Check className="w-3.5 h-3.5 text-[#B9FF66]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Columna de Captura / Comprobante */}
                    <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-2 pt-2 md:pt-0">
                      {report.screenshot_url ? (
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => setPreviewImageReport(report)}
                            className="relative group w-24 h-20 sm:w-28 sm:h-20 rounded-xl overflow-hidden border border-[#292A36] bg-[#111218] cursor-pointer hover:border-[#B9FF66] transition"
                            title="Haz clic para ver comprobante ampliado"
                          >
                            <img
                              src={report.screenshot_url}
                              alt="Comprobante de pago"
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <button
                              onClick={() => setPreviewImageReport(report)}
                              className="text-xs font-bold text-[#B9FF66] hover:underline flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver captura</span>
                            </button>
                            <a
                              href={report.screenshot_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Abrir original</span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic bg-[#111218] border border-[#292A36] px-3 py-2 rounded-xl">
                          Sin comprobante adjunto
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Barra de Acciones */}
                  <div className="pt-3 border-t border-[#292A36] flex flex-wrap items-center justify-between gap-2.5">
                    <span className="text-[11px] text-slate-400">
                      ID reporte: <code className="text-slate-500 font-mono text-[10px]">{report.id.substring(0, 8)}...</code>
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Botón Confirmar Pago */}
                      {!isConfirmed ? (
                        <button
                          onClick={() => handleUpdateStatus(report.id, 'confirmado')}
                          disabled={isActionLoading}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] font-black text-xs shadow-lg shadow-[#B9FF66]/20 transition active:scale-95 disabled:opacity-50"
                        >
                          {isActionLoading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Confirmando...</span>
                            </>
                          ) : (
                            <>
                              <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                              <span>Confirmar Pago</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(report.id, 'pendiente')}
                          disabled={isActionLoading}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#111218] hover:bg-[#191A23] text-slate-300 hover:text-amber-400 border border-[#292A36] text-xs font-semibold transition"
                          title="Volver a estado pendiente"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Revertir a Pendiente</span>
                        </button>
                      )}

                      {/* Botón Rechazar (si está pendiente) */}
                      {isPending && (
                        <button
                          onClick={() => handleUpdateStatus(report.id, 'rechazado')}
                          disabled={isActionLoading}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 text-xs font-semibold transition"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Rechazar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal / Lightbox para ver la imagen del comprobante en tamaño completo */}
      {previewImageReport && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewImageReport(null)}
        >
          <div
            className="bg-[#14151D] border border-[#292A36] rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-[#292A36] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Comprobante de Pago</span>
                  <span className="text-[10px] text-[#B9FF66] font-mono bg-[#111218] px-2 py-0.5 rounded border border-[#292A36]">
                    Ref: {previewImageReport.reference_number}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Usuario: {previewImageReport.sender_user || previewImageReport.user_identifier}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {previewImageReport.screenshot_url && (
                  <a
                    href={previewImageReport.screenshot_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-[#111218] border border-[#292A36] text-slate-300 hover:text-white transition"
                    title="Abrir en pestaña nueva"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => setPreviewImageReport(null)}
                  className="p-2 rounded-xl bg-[#111218] border border-[#292A36] hover:bg-[#191A23] text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Imagen */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#111218] min-h-[300px]">
              {previewImageReport.screenshot_url ? (
                <img
                  src={previewImageReport.screenshot_url}
                  alt="Comprobante de pago"
                  className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg border border-[#292A36]"
                />
              ) : (
                <p className="text-slate-500 text-xs">No hay imagen disponible</p>
              )}
            </div>

            {/* Modal Footer con botón de acción directo */}
            <div className="p-4 border-t border-[#292A36] flex items-center justify-between bg-[#14151D]">
              <div className="text-xs text-slate-400">
                Plan: <strong className="text-white">{previewImageReport.plan_type}</strong> | Método:{' '}
                <strong className="text-white uppercase">{previewImageReport.payment_method}</strong>
              </div>

              <div className="flex items-center gap-2">
                {previewImageReport.status !== 'confirmado' &&
                previewImageReport.status !== 'aprobado' ? (
                  <button
                    onClick={() => {
                      handleUpdateStatus(previewImageReport.id, 'confirmado');
                    }}
                    disabled={actionLoadingId === previewImageReport.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] font-black text-xs shadow-md shadow-[#B9FF66]/20 transition"
                  >
                    {actionLoadingId === previewImageReport.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCheck className="w-4 h-4" />
                    )}
                    <span>Confirmar Pago Ahora</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold text-[#B9FF66] px-3 py-1 rounded-xl bg-[#B9FF66]/10 border border-[#B9FF66]/30">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#B9FF66]" />
                    Pago Confirmado
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
