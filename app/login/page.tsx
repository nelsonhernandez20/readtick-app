'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Radio,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Info,
} from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/utils/supabase/client';
function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
    const err = searchParams.get('error');
    if (err === 'admin_only') {
      setErrorMsg('No tienes permiso para acceder al panel de cobros.');
    }
  }, [searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Por favor completa todos los campos.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!isConfigured) {
      setErrorMsg(
        'Supabase aún no está vinculado. Agrega tu NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en el archivo .env.local'
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (isSignUp) {
        // Sign Up with Email and Password
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          setErrorMsg(error.message || 'Error al crear la cuenta.');
          setLoading(false);
          return;
        }

        // If email confirmation is required by Supabase
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setErrorMsg('Este correo electrónico ya está registrado.');
          setLoading(false);
          return;
        }

        if (data.session) {
          // Direct login without email confirmation
          setSuccessMsg('¡Cuenta creada exitosamente! Redirigiendo...');
          setTimeout(() => {
            router.push(nextPath);
            router.refresh();
          }, 1000);
        } else {
          // Email confirmation link sent
          setSuccessMsg(
            '¡Registro completado! Hemos enviado un enlace de confirmación a tu correo electrónico para activar tu cuenta.'
          );
        }
      } else {
        // Sign In with Email and Password
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            setErrorMsg('Correo o contraseña incorrectos. Verifica tus datos.');
          } else if (error.message.includes('Email not confirmed')) {
            setErrorMsg('Debes confirmar tu correo electrónico antes de iniciar sesión.');
          } else {
            setErrorMsg(error.message || 'Error al iniciar sesión.');
          }
          setLoading(false);
          return;
        }

        setSuccessMsg('¡Inicio de sesión exitoso! Entrando...');
        setTimeout(() => {
          router.push(nextPath);
          router.refresh();
        }, 800);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error?.message || 'Ocurrió un error inesperado de conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Demo bypass mode for local testing before user sets their keys
  const handleBypassDemo = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#191A23] text-[#F3F3F3] flex flex-col items-center justify-center p-4 relative selection:bg-[#B9FF66] selection:text-[#191A23]">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-gradient-to-tr from-[#B9FF66]/10 via-[#B9FF66]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#B9FF66] p-[2px] shadow-xl shadow-[#B9FF66]/20 mb-2">
            <div className="w-full h-full bg-[#191A23] rounded-[14px] flex items-center justify-center">
              <Radio className="w-7 h-7 text-[#B9FF66] animate-pulse" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
            Read<span className="text-[#B9FF66]">Tik</span>
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#B9FF66]/10 text-[#B9FF66] border border-[#B9FF66]/25">
              Live
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
            Inicia sesión para gestionar tus Alertas de Sonido y TTS para TikTok Live
          </p>
        </div>

        {/* Supabase Not Configured Notice */}
        {!isConfigured && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-amber-300 space-y-2 backdrop-blur-md">
            <div className="flex items-center gap-2 font-bold text-amber-200">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Conexión con Supabase pendiente</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Para autenticar usuarios reales, ingresa tus credenciales de Supabase en el archivo{' '}
              <code className="text-amber-300 bg-amber-950/40 px-1 py-0.5 rounded">.env.local</code>.
            </p>
            <div className="pt-1 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">¿Quieres probar la interfaz ya?</span>
              <button
                type="button"
                onClick={handleBypassDemo}
                className="text-[11px] font-bold text-[#B9FF66] hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Acceder en modo Demo
              </button>
            </div>
          </div>
        )}

        {/* Auth Card */}
        <div className="bg-[#14151D] border border-[#292A36] rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5">
          {/* Tabs: Iniciar Sesión / Registrarse */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#111218] border border-[#292A36]">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                !isSignUp
                  ? 'bg-[#B9FF66] text-[#191A23] font-black shadow-md shadow-[#B9FF66]/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                isSignUp
                  ? 'bg-[#B9FF66] text-[#191A23] font-black shadow-md shadow-[#B9FF66]/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Crear Cuenta
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                  className="w-full bg-[#111218] border border-[#292A36] focus:border-[#B9FF66] focus:ring-1 focus:ring-[#B9FF66] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#F3F3F3] placeholder-slate-500 outline-none transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  Contraseña
                </label>
                {!isSignUp && (
                  <span className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer">
                    ¿Olvidaste tu contraseña?
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#111218] border border-[#292A36] focus:border-[#B9FF66] focus:ring-1 focus:ring-[#B9FF66] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#F3F3F3] placeholder-slate-500 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (Only for Sign Up) */}
            {isSignUp && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="block text-xs font-semibold text-slate-300">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    required
                    className="w-full bg-[#111218] border border-[#292A36] focus:border-[#B9FF66] focus:ring-1 focus:ring-[#B9FF66] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#F3F3F3] placeholder-slate-500 outline-none transition"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#B9FF66] hover:bg-[#a6f44d] active:scale-[0.98] text-[#191A23] text-sm font-black shadow-lg shadow-[#B9FF66]/20 flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isSignUp ? 'Creando cuenta...' : 'Verificando...'}
                </>
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Crear Cuenta
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Entrar al Panel
                </>
              )}
            </button>
          </form>

          {/* Terms & Privacy note */}
          <p className="text-[11px] text-center text-slate-500">
            Al continuar, aceptas la configuración y políticas de uso de ReadTik.
          </p>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <span>Autenticación segura con Supabase</span>
          <span>•</span>
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#B9FF66] underline transition"
          >
            PostgreSQL & Auth
          </a>
        </div>
      </div>
    </div>
  );
}
