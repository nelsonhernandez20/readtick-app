'use client';

import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Copy,
  Check,
  Sparkles,
  X,
  Loader2,
  AlertCircle,
  Lock,
  Zap,
  UploadCloud,
  Send,
} from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/utils/supabase/client';
import BcvRateCard from '@/components/BcvRateCard';

interface ProModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

export default function ProModal({ isOpen, onClose, userEmail: propUserEmail }: ProModalProps) {
  const selectedPlan = 'mensual';
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form states for reporting payment
  const [senderUser, setSenderUser] = useState(propUserEmail || '');
  const [isAutoDetectedUser, setIsAutoDetectedUser] = useState(Boolean(propUserEmail));
  const [reportRef, setReportRef] = useState('');
  const [transferImage, setTransferImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (propUserEmail) {
      setSenderUser(propUserEmail);
      setIsAutoDetectedUser(true);
    }
  }, [propUserEmail]);

  useEffect(() => {
    if (!isOpen || !isSupabaseConfigured()) return;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setSenderUser(user.email);
        setIsAutoDetectedUser(true);
      }
    });

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
  }, [isOpen]);

  if (!isOpen) return null;

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

  const BANK_DETAILS = {
    banco: '0102 - Banco de Venezuela',
    telefono: '04162731818',
    cedula: 'V27920342',
    nombre: 'ReadTik Pro Venezuela',
    tasa: 'Tasa Oficial BCV del día',
    whatsapp: '584162731818',
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

        // 1. Subir captura si se adjuntó
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
            console.error('Error al subir comprobante:', uploadError);
            if (uploadError.message.includes('Bucket not found')) {
              throw new Error(
                'El bucket "comprobantes" aún no existe en Supabase. Ejecuta el script SQL en Supabase.'
              );
            }
            throw new Error(`Error al subir la imagen: ${uploadError.message}`);
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from('comprobantes').getPublicUrl(cleanName);

          screenshotUrl = publicUrl;
        }

        const {
          data: { user: activeAuthUser },
        } = await supabase.auth.getUser();

        const effectiveSender = activeAuthUser?.email || senderUser.trim();

        if (!effectiveSender) {
          setErrorMessage('No se detectó una sesión activa. Inicia sesión con tu cuenta antes de reportar un pago.');
          setIsSubmitting(false);
          return;
        }

        const insertPayload: Record<string, any> = {
          user_identifier: effectiveSender,
          sender_user: effectiveSender,
          reference_number: reportRef.trim(),
          plan_type: selectedPlan,
          payment_method: 'banco',
          screenshot_url: screenshotUrl,
          status: 'pendiente',
        };

        if (activeAuthUser?.id) {
          insertPayload.user_id = activeAuthUser.id;
        }

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
              delete insertPayload[match[1]];
              continue;
            }
          }
          break;
        }

        if (insertError) {
          console.error('Error al insertar reporte:', insertError);
          if (insertError.message.includes('relation "public.reportes_pago" does not exist')) {
            throw new Error('La tabla "reportes_pago" aún no existe en Supabase.');
          }
          throw new Error(`Error al guardar reporte: ${insertError.message}`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#191A23] border border-[#292A36] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header del Modal */}
        <div className="p-4 border-b border-[#292A36] flex items-center justify-between bg-[#14151D] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#B9FF66] p-[1.5px] shrink-0">
              <div className="w-full h-full bg-[#191A23] rounded-[9px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#B9FF66]" />
              </div>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white leading-tight flex items-center gap-2">
                <span>Activar ReadTik PRO</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#B9FF66]/15 text-[#B9FF66] border border-[#B9FF66]/30">
                  $3.00 USD
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Paga vía Pago Móvil y activa tu cuenta de inmediato
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#252631] transition shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          {/* Tarjeta de Plan */}
          <div className="p-5 rounded-2xl border border-[#B9FF66]/40 bg-[#14151D] shadow-xl relative overflow-hidden">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Membresía Mensual
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">$3.00</span>
                  <span className="text-xs text-slate-400 font-medium">USD / mes (30 días)</span>
                </div>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-[#B9FF66] text-[#191A23] uppercase tracking-wider">
                PRO
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
              Desbloquea <strong>efectos de voz exclusivos</strong> (Ardilla, Monstruo, Locutor de Carreras, Cámara Lenta), personalización de canciones para cada regalo, filtro de palabras prohibidas y soporte prioritario.
            </p>

            <div className="mt-3.5 pt-3 border-t border-[#292A36] grid grid-cols-2 gap-2 text-[11px] text-slate-300">
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
                <span>Canciones por Regalo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[#B9FF66] shrink-0" />
                <span>Duración: 30 Días</span>
              </div>
            </div>
          </div>

          {/* Bloque de Pago Móvil */}
          <div className="bg-[#14151D] border border-[#292A36] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#292A36] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#B9FF66]/10 text-[#B9FF66]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    Datos de Pago Móvil (Venezuela)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Transfiere en Bolívares a la tasa oficial del Banco Central (BCV)
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#B9FF66]/15 border border-[#B9FF66]/30 text-[#B9FF66] text-xs font-bold shrink-0">
                $3 USD a tasa BCV
              </span>
            </div>

            {/* Conversión y Tasa Oficial BCV */}
            <BcvRateCard montoUsd={3} />

            {/* Campos para copiar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Banco */}
              <div className="p-3 rounded-xl bg-[#111218] border border-[#292A36] flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Banco</div>
                  <div className="text-white font-semibold text-xs mt-0.5">{BANK_DETAILS.banco}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(BANK_DETAILS.banco, 'banco')}
                  className="p-1.5 rounded-lg bg-[#191A23] hover:bg-[#14151D] border border-[#292A36] text-slate-300 transition"
                  title="Copiar banco"
                >
                  {copiedField === 'banco' ? (
                    <Check className="w-3.5 h-3.5 text-[#B9FF66]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Teléfono */}
              <div className="p-3 rounded-xl bg-[#111218] border border-[#292A36] flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Teléfono</div>
                  <div className="text-white font-mono font-bold text-xs tracking-wider mt-0.5">
                    {BANK_DETAILS.telefono}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(BANK_DETAILS.telefono, 'telefono')}
                  className="p-1.5 rounded-lg bg-[#191A23] hover:bg-[#14151D] border border-[#292A36] text-slate-300 transition"
                  title="Copiar teléfono"
                >
                  {copiedField === 'telefono' ? (
                    <Check className="w-3.5 h-3.5 text-[#B9FF66]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Cédula */}
              <div className="p-3 rounded-xl bg-[#111218] border border-[#292A36] flex items-center justify-between">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Cédula / RIF</div>
                  <div className="text-white font-mono font-bold text-xs tracking-wider mt-0.5">
                    {BANK_DETAILS.cedula}
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(BANK_DETAILS.cedula, 'cedula')}
                  className="p-1.5 rounded-lg bg-[#191A23] hover:bg-[#14151D] border border-[#292A36] text-slate-300 transition"
                  title="Copiar cédula"
                >
                  {copiedField === 'cedula' ? (
                    <Check className="w-3.5 h-3.5 text-[#B9FF66]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Formulario de Reporte de Pago */}
          <div className="bg-[#14151D] border border-[#292A36] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#B9FF66]" />
              <h3 className="text-sm font-bold text-white">Reportar Referencia de Pago</h3>
            </div>
            <p className="text-xs text-slate-400">
              Si ya realizaste tu pago móvil o transferencia, deja tus datos para validar y activar tu cuenta PRO de inmediato:
            </p>

            {reportSuccess ? (
              <div className="p-4 rounded-xl bg-[#B9FF66]/10 border border-[#B9FF66]/30 text-[#B9FF66] text-xs space-y-2">
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#B9FF66] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs font-bold text-[#B9FF66]">
                      ¡Referencia y comprobante recibidos con éxito!
                    </strong>
                    <p className="text-slate-300 mt-1 leading-relaxed">
                      Tu reporte ha quedado guardado. Tu cuenta PRO se activará una vez validado el pago en nuestro sistema (de 5 a 15 minutos).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReportSuccess(false)}
                  className="text-xs font-bold text-[#B9FF66] hover:underline"
                >
                  ← Enviar otro reporte
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3.5">
                {errorMessage && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Correo */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-[#B9FF66]" />
                        <span>Cuenta de Activación</span>
                      </label>
                      {isAutoDetectedUser ? (
                        <span className="text-[9px] text-[#B9FF66] font-semibold bg-[#B9FF66]/10 border border-[#B9FF66]/20 px-1.5 py-0.2 rounded-full">
                          Activa
                        </span>
                      ) : (
                        <span className="text-[9px] text-amber-400 font-medium">Detectando...</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={senderUser || (isAutoDetectedUser ? '' : 'Detectando usuario...')}
                      readOnly
                      disabled
                      className="w-full bg-[#191A23] border border-[#292A36] rounded-xl px-3 py-2 text-slate-300 font-medium cursor-not-allowed select-none opacity-90 outline-none text-xs"
                    />
                  </div>

                  {/* Referencia */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Nº Referencia <span className="text-[#B9FF66]">*</span>
                    </label>
                    <input
                      type="text"
                      value={reportRef}
                      onChange={(e) => setReportRef(e.target.value)}
                      placeholder="Ej. 12345678 (últimos dígitos)"
                      required
                      className="w-full bg-[#111218] border border-[#292A36] rounded-xl px-3 py-2 text-[#F3F3F3] outline-none focus:border-[#B9FF66] placeholder:text-slate-600 transition text-xs"
                    />
                  </div>
                </div>

                {/* Comprobante */}
                <div className="text-xs space-y-1">
                  <label className="block text-slate-300 font-semibold">
                    Comprobante o Captura (Opcional)
                  </label>

                  {!imagePreview ? (
                    <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-[#292A36] hover:border-[#B9FF66]/50 bg-[#111218] hover:bg-[#191A23] rounded-xl cursor-pointer transition group">
                      <div className="p-1.5 rounded-lg bg-[#191A23] text-[#B9FF66] mb-1 group-hover:scale-105 transition">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-200">
                        Toca aquí para subir la captura
                      </span>
                      <span className="text-[10px] text-slate-500">
                        JPG, PNG o WEBP
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#111218] border border-[#B9FF66]/30">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={imagePreview}
                          alt="Comprobante"
                          className="w-10 h-10 object-cover rounded-lg border border-[#B9FF66]/40 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-[#B9FF66] font-bold flex items-center gap-1 text-[11px]">
                            <Check className="w-3 h-3" />
                            <span>Captura lista</span>
                          </div>
                          <p className="text-[10px] text-slate-300 truncate max-w-[150px] font-mono">
                            {transferImage?.name}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={removeImage}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition text-xs shrink-0"
                        title="Eliminar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] font-black text-xs shadow-md shadow-[#B9FF66]/20 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enviando comprobante...</span>
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
        </div>
      </div>
    </div>
  );
}
