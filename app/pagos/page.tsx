'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Radio,
  ArrowLeft,
  HelpCircle,
  Send,
  Zap,
  UploadCloud,
  ImageIcon,
  X,
  Loader2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/utils/supabase/client';
import BcvRateCard from '@/components/BcvRateCard';

export default function PagosPage() {
  const SHOW_PAYPAL = false; // Oculto temporalmente a petición del usuario
  const [activeTab, setActiveTab] = useState<'banco' | 'paypal'>('banco');
  const selectedPlan = 'mensual';
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form states for reporting payment
  const [senderUser, setSenderUser] = useState('');
  const [isAutoDetectedUser, setIsAutoDetectedUser] = useState(false);
  const [reportRef, setReportRef] = useState('');
  const [transferImage, setTransferImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();

    // 1. Intentar obtener el usuario de inmediato
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setSenderUser(user.email);
        setIsAutoDetectedUser(true);
      }
    });

    // 2. Escuchar cambios de autenticación cuando la sesión termine de cargar
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setSenderUser(session.user.email);
        setIsAutoDetectedUser(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTransferImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const removeImage = () => {
    setTransferImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  // Configurable bank & paypal details
  const BANK_DETAILS = {
    banco: '0102 - Banco de Venezuela',
    telefono: '04162731818',
    cedula: 'V27920342',
    nombre: 'ReadTik Pro Venezuela',
    tasa: 'Tasa Oficial BCV del día',
    whatsapp: '584162731818',
  };

  const PAYPAL_DETAILS = {
    email: 'pagos@readtik.com',
    paypalMeUrl: 'https://paypal.me/tu_usuario', // Reemplazar con el link paypal.me
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!reportRef.trim()) {
      setErrorMessage('Por favor ingresa el número de referencia o ID de transacción.');
      return;
    }

    setIsSubmitting(true);

    try {
      const isConfigured = isSupabaseConfigured();
      let screenshotUrl: string | null = null;

      if (isConfigured) {
        const supabase = createClient();

        // 1. Si el usuario adjuntó una imagen, subirla a Supabase Storage (bucket 'comprobantes')
        if (transferImage) {
          const fileExt = transferImage.name.split('.').pop() || 'png';
          const cleanName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('comprobantes')
            .upload(cleanName, transferImage, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('Error al subir a Supabase Storage:', uploadError);
            if (uploadError.message.includes('Bucket not found')) {
              throw new Error(
                'El bucket "comprobantes" aún no existe en Supabase. Por favor ejecuta el script SQL en Supabase para crearlo.'
              );
            }
            throw new Error(`Error al subir la imagen del comprobante: ${uploadError.message}`);
          }

          // 2. Obtener el enlace público generado por Supabase Storage
          const {
            data: { publicUrl },
          } = supabase.storage.from('comprobantes').getPublicUrl(cleanName);

          screenshotUrl = publicUrl;
        }

        // Consultar la sesión activa de Supabase en tiempo real al momento del envío
        const {
          data: { user: activeAuthUser },
        } = await supabase.auth.getUser();

        const effectiveSender = activeAuthUser?.email || senderUser.trim();

        if (!effectiveSender) {
          setErrorMessage('No se detectó una sesión activa. Por favor inicia sesión con tu cuenta antes de reportar un pago.');
          setIsSubmitting(false);
          return;
        }

        // 3. Preparar los datos del reporte para insertar en 'reportes_pago'
        const insertPayload: Record<string, any> = {
          user_identifier: effectiveSender,
          sender_user: effectiveSender,
          reference_number: reportRef.trim(),
          plan_type: selectedPlan,
          payment_method: activeTab,
          screenshot_url: screenshotUrl,
          status: 'pendiente',
        };

        // Si el usuario tiene sesión en auth.users, asociar también su user_id
        if (activeAuthUser?.id) {
          insertPayload.user_id = activeAuthUser.id;
        }

        // Inserción resiliente: si la tabla en Supabase no tiene alguna columna opcional (ej. tiktok_username, sender_user o user_id),
        // la removemos del payload y reintentamos automáticamente.
        let insertError = null;
        let attempts = 0;
        while (attempts < 4) {
          attempts++;
          const res = await supabase.from('reportes_pago').insert(insertPayload);
          insertError = res.error;

          if (!insertError) break;

          if (insertError.message.includes('in the schema cache')) {
            const match = insertError.message.match(/Could not find the '([^']+)' column/);
            if (match && match[1] && match[1] in insertPayload) {
              console.warn(`Columna '${match[1]}' no presente en reportes_pago. Descartando del envío...`);
              delete insertPayload[match[1]];
              continue;
            }
          }
          break;
        }

        if (insertError) {
          console.error('Error al insertar en reportes_pago:', insertError);
          if (insertError.message.includes('relation "public.reportes_pago" does not exist')) {
            throw new Error(
              'La tabla "reportes_pago" aún no existe en Supabase. Ejecuta el script SQL en tu panel de Supabase.'
            );
          }
          throw new Error(`Error al guardar el reporte: ${insertError.message}`);
        }
      }

      setReportSuccess(true);
      setReportRef('');
      removeImage();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error?.message || 'Ocurrió un error inesperado al procesar el reporte.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#191A23] text-[#F3F3F3] flex flex-col font-sans selection:bg-[#B9FF66] selection:text-[#191A23]">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 bg-[#191A23]/95 backdrop-blur-md border-b border-[#292A36] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4 text-[#B9FF66]" />
            <span>Volver al Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#B9FF66] p-[1.5px]">
              <div className="w-full h-full bg-[#191A23] rounded-[7px] flex items-center justify-center">
                <Radio className="w-4 h-4 text-[#B9FF66]" />
              </div>
            </div>
            <span className="text-sm font-black text-white">
              Read<span className="text-[#B9FF66]">Tik</span> PRO
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Title Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#B9FF66]/10 text-[#B9FF66] border border-[#B9FF66]/25">
            <Sparkles className="w-3.5 h-3.5" />
            Suscripciones y Activación de Cuenta
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Métodos de Pago Disponibles
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Elige tu método de pago para activar tu membresía. Aceptamos transferencias y Pago Móvil / QR bancario en Bolívares (Venezuela a tasa oficial BCV).
          </p>
        </div>

        {/* Featured Plan Card: Plan Mensual PRO */}
        <div className="max-w-md mx-auto">
          <div className="p-6 rounded-3xl border-2 border-[#B9FF66] bg-[#14151D] shadow-2xl shadow-[#B9FF66]/10 relative overflow-hidden">
            <div className="absolute top-3 right-4">
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#B9FF66] text-[#191A23] uppercase tracking-wider shadow">
                Plan PRO
              </span>
            </div>
            
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
              Suscripción Mensual
            </span>

            <div className="flex items-baseline gap-1.5 my-2">
              <span className="text-3xl sm:text-4xl font-black text-white">$3.00</span>
              <span className="text-xs text-slate-400 font-medium">USD / mes (30 días)</span>
            </div>

            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Desbloquea <strong>efectos de voz exclusivos</strong> (Ardilla, Monstruo, Locutor de Carreras, Cámara Lenta), alertas ilimitadas sin cortes, efectos de sonido de regalos y soporte prioritario para tus directos.
            </p>

            <div className="mt-4 pt-3 border-t border-[#292A36] grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#B9FF66] shrink-0" />
                <span>Efectos de Voz PRO</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#B9FF66] shrink-0" />
                <span>Alertas Ilimitadas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#B9FF66] shrink-0" />
                <span>Sonidos de Regalos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#B9FF66] shrink-0" />
                <span>Duración: 30 Días</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Tabs: Banco vs PayPal */}
        <div className="space-y-4 max-w-2xl mx-auto">
          {SHOW_PAYPAL ? (
            <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[#111218] border border-[#292A36]">
              <button
                onClick={() => setActiveTab('banco')}
                className={`py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                  activeTab === 'banco'
                    ? 'bg-[#B9FF66] text-[#191A23] font-black shadow-lg shadow-[#B9FF66]/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QR de Banco / Pago Móvil</span>
              </button>

              <button
                onClick={() => setActiveTab('paypal')}
                className={`py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                  activeTab === 'paypal'
                    ? 'bg-[#B9FF66] text-[#191A23] font-black shadow-lg shadow-[#B9FF66]/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>PayPal / Tarjetas USD</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[#111218] border border-[#292A36]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#B9FF66]/10 text-[#B9FF66]">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    Pago Móvil y QR Bancario (Venezuela)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Aceptamos transferencias y Pago Móvil a tasa oficial BCV
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#B9FF66]/15 text-[#B9FF66] text-[10px] font-black uppercase">
                Activo
              </span>
            </div>
          )}

          {/* TAB 1: PAGO MÓVIL */}
          {activeTab === 'banco' && (
            <div className="bg-[#14151D] border border-[#292A36] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#292A36] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>🇻🇪 Datos de Pago Móvil</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Transfiere en Bolívares a la tasa oficial del Banco Central de Venezuela (BCV).
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-[#B9FF66]/10 border border-[#B9FF66]/20 text-[#B9FF66] text-xs font-bold">
                  Monto: $3 USD a tasa BCV
                </div>
              </div>

              {/* Tasa Oficial BCV y Conversión Automática */}
              <BcvRateCard montoUsd={3} />

              {/* Bank Data Copy Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Banco */}
                <div className="p-3.5 rounded-xl bg-[#111218] border border-[#292A36] flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Banco</div>
                    <div className="text-white font-semibold text-sm mt-0.5">{BANK_DETAILS.banco}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(BANK_DETAILS.banco, 'banco')}
                    className="p-2 rounded-lg bg-[#191A23] hover:bg-[#14151D] border border-[#292A36] text-slate-300 transition"
                    title="Copiar"
                  >
                    {copiedField === 'banco' ? (
                      <Check className="w-4 h-4 text-[#B9FF66]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Teléfono */}
                <div className="p-3.5 rounded-xl bg-[#111218] border border-[#292A36] flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Teléfono</div>
                    <div className="text-white font-mono font-bold text-sm tracking-wider mt-0.5">
                      {BANK_DETAILS.telefono}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(BANK_DETAILS.telefono, 'telefono')}
                    className="p-2 rounded-lg bg-[#191A23] hover:bg-[#14151D] border border-[#292A36] text-slate-300 transition"
                    title="Copiar"
                  >
                    {copiedField === 'telefono' ? (
                      <Check className="w-4 h-4 text-[#B9FF66]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Cédula */}
                <div className="p-3.5 rounded-xl bg-[#111218] border border-[#292A36] flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Cédula / RIF</div>
                    <div className="text-white font-mono font-bold text-sm tracking-wider mt-0.5">
                      {BANK_DETAILS.cedula}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(BANK_DETAILS.cedula, 'cedula')}
                    className="p-2 rounded-lg bg-[#191A23] hover:bg-[#14151D] border border-[#292A36] text-slate-300 transition"
                    title="Copiar"
                  >
                    {copiedField === 'cedula' ? (
                      <Check className="w-4 h-4 text-[#B9FF66]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAYPAL / TARJETAS USD (Oculto temporalmente) */}
          {SHOW_PAYPAL && activeTab === 'paypal' && (
            <div className="bg-[#14151D] border border-[#292A36] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#292A36] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>🌎 PayPal & Tarjetas Internacionales</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Paga con saldo de tu cuenta PayPal o directamente con cualquier tarjeta de crédito o débito.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-[#B9FF66]/15 border border-[#B9FF66]/30 text-[#B9FF66] text-xs font-bold">
                  Monto: $3.00 USD
                </div>
              </div>

              {/* PayPal Direct Button Card */}
              <div className="p-6 rounded-2xl bg-[#111218] border border-[#292A36] space-y-5 text-center">
                <div className="space-y-2">
                  <div className="inline-flex p-3 rounded-2xl bg-[#B9FF66]/15 text-[#B9FF66]">
                    <CreditCard className="w-8 h-8 text-[#B9FF66]" />
                  </div>
                  <h4 className="text-base font-bold text-white">Pago Directo con PayPal</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Haz clic en el botón a continuación para abrir la pasarela de PayPal y realizar el pago seguro de{' '}
                    <strong className="text-white">$3.00 USD</strong>.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={PAYPAL_DETAILS.paypalMeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] font-black text-sm shadow-xl shadow-[#B9FF66]/20 transition active:scale-95"
                  >
                    <span>Ir a Pagar en PayPal</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* Copy PayPal Email fallback */}
                <div className="pt-2 border-t border-[#292A36]/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">¿Prefieres transferir a nuestro correo de PayPal?</span>
                  <button
                    onClick={() => copyToClipboard(PAYPAL_DETAILS.email, 'paypalEmail')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191A23] hover:bg-[#14151D] border border-[#292A36] text-slate-300 font-mono transition"
                  >
                    <span>{PAYPAL_DETAILS.email}</span>
                    {copiedField === 'paypalEmail' ? (
                      <Check className="w-3.5 h-3.5 text-[#B9FF66]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Info Note */}
              <div className="bg-[#111218] p-4 rounded-2xl border border-[#292A36] text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#B9FF66]" />
                  ¿No tienes cuenta de PayPal?
                </div>
                <p>
                  No te preocupes. Al hacer clic en el botón de PayPal, selecciona la opción{' '}
                  <strong className="text-white">&quot;Pagar con tarjeta de débito o crédito&quot;</strong> y podrás pagar como invitado con tu tarjeta Visa o Mastercard.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Report Reference Form */}
        <div className="max-w-2xl mx-auto bg-[#14151D] border border-[#292A36] rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#B9FF66]" />
            <h3 className="text-base font-bold text-white">Reportar Referencia de Pago</h3>
          </div>
          <p className="text-xs text-slate-400">
            Si ya completaste tu pago móvil o transferencia bancaria, deja aquí tus datos para verificar y asociar tu suscripción PRO inmediatamente:
          </p>

          {reportSuccess ? (
            <div className="p-5 rounded-2xl bg-[#B9FF66]/10 border border-[#B9FF66]/30 text-[#B9FF66] text-xs space-y-3">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#B9FF66] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sm font-bold text-[#B9FF66]">
                    ¡Referencia y comprobante recibidos con éxito!
                  </strong>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    Hemos guardado tu reporte y la captura de la transferencia en nuestro sistema. Tu cuenta PRO se activará una vez validado el pago (de 5 a 15 minutos).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportSuccess(false)}
                className="text-xs font-bold text-[#B9FF66] hover:underline flex items-center gap-1"
              >
                ← Enviar otro reporte de pago
              </button>
            </div>
          ) : (
            <form onSubmit={handleReportSubmit} className="space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Correo de la cuenta activa (Bloqueado) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#B9FF66]" />
                      <span>Cuenta / Correo de Activación</span>
                    </label>
                    {isAutoDetectedUser ? (
                      <span className="text-[10px] text-[#B9FF66] font-semibold bg-[#B9FF66]/10 border border-[#B9FF66]/20 px-2 py-0.5 rounded-full">
                        Sesión activa
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-medium">Cargando sesión...</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={senderUser || (isAutoDetectedUser ? '' : 'Detectando usuario...')}
                    readOnly
                    disabled
                    tabIndex={-1}
                    className="w-full bg-[#191A23] border border-[#292A36] rounded-xl px-3 py-2.5 text-slate-300 font-medium cursor-not-allowed select-none opacity-90 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Tu suscripción se vinculará automáticamente a tu cuenta registrada.
                  </p>
                </div>

                {/* Número de Referencia o ID */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nº Referencia o ID de Transacción <span className="text-[#B9FF66]">*</span>
                  </label>
                  <input
                    type="text"
                    value={reportRef}
                    onChange={(e) => setReportRef(e.target.value)}
                    placeholder="Ej. 12345678 (últimos dígitos)"
                    required
                    className="w-full bg-[#111218] border border-[#292A36] rounded-xl px-3 py-2.5 text-[#F3F3F3] outline-none focus:border-[#B9FF66] placeholder:text-slate-600 transition"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Ingresa el número de referencia bancario o captura de comprobante.
                  </p>
                </div>
              </div>

              {/* Image Upload Input for Transfer Receipt */}
              <div className="text-xs space-y-1.5">
                <label className="block text-slate-300 font-semibold">
                  Comprobante o Captura de la Transferencia
                </label>

                {!imagePreview ? (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#292A36] hover:border-[#B9FF66]/50 bg-[#111218] hover:bg-[#191A23] rounded-2xl cursor-pointer transition group">
                    <div className="p-2 rounded-xl bg-[#191A23] text-[#B9FF66] group-hover:scale-110 transition mb-2">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-slate-200">
                      Toca aquí para subir la captura de la transferencia
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      Soporta imágenes JPG, PNG o WEBP
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#111218] border border-[#B9FF66]/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={imagePreview}
                        alt="Comprobante"
                        className="w-12 h-12 object-cover rounded-xl border border-[#B9FF66]/40 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[#B9FF66] font-bold flex items-center gap-1 text-xs">
                          <Check className="w-3.5 h-3.5" />
                          <span>Captura adjuntada con éxito</span>
                        </div>
                        <p className="text-[11px] text-slate-300 truncate max-w-[180px] sm:max-w-xs mt-0.5 font-mono">
                          {transferImage?.name}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {transferImage && (transferImage.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={removeImage}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition text-xs flex items-center gap-1 shrink-0"
                      title="Eliminar imagen"
                    >
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">Quitar</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] font-black text-xs shadow-md shadow-[#B9FF66]/20 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Subiendo comprobante y guardando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Reporte de Pago</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#292A36] py-6 px-4 text-center text-xs text-slate-500">
        <p>© 2026 ReadTik. Pagos procesados de forma segura vía Pago Móvil y QR Bancario.</p>
      </footer>
    </div>
  );
}
