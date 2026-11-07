import { Download, Shield, Bell, Battery } from 'lucide-react';
import AndroidDownloadCard from '@/components/AndroidDownloadCard';
import { ANDROID_APK } from '@/lib/androidApp';

export const metadata = {
  title: 'Descargar ReadTik para Android',
  description: 'Instala la app Android de ReadTik para leer comentarios de TikTok LIVE en segundo plano.',
};

export default function DescargarPage() {
  return (
    <div className="min-h-screen bg-[#191A23] text-[#F3F3F3] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-black tracking-tight">
            Read<span className="text-[#B9FF66]">Tik</span> Android
          </h1>
          <p className="text-sm text-slate-400">
            Misma cuenta y mismas alertas que la web. En el teléfono, la voz no se corta al abrir TikTok.
          </p>
        </div>

        <AndroidDownloadCard />

        <ol className="bg-[#14151D] border border-[#292A36] rounded-2xl p-4 space-y-3 text-xs text-slate-300">
          <li className="flex gap-3">
            <Download className="w-4 h-4 text-[#B9FF66] shrink-0 mt-0.5" />
            <span>Toca Descargar APK e instala el archivo {ANDROID_APK.filename}.</span>
          </li>
          <li className="flex gap-3">
            <Shield className="w-4 h-4 text-[#B9FF66] shrink-0 mt-0.5" />
            <span>
              Si Android bloquea la instalación: Ajustes → Apps → app que usaste para descargar (Chrome o Archivos) →
              permitir instalar apps desconocidas.
            </span>
          </li>
          <li className="flex gap-3">
            <Bell className="w-4 h-4 text-[#B9FF66] shrink-0 mt-0.5" />
            <span>Al conectar el live, deja activa la notificación “ReadTik escuchando el live”.</span>
          </li>
          <li className="flex gap-3">
            <Battery className="w-4 h-4 text-[#B9FF66] shrink-0 mt-0.5" />
            <span>En Xiaomi, Samsung u Honor: Ajustes → Apps → ReadTik → Batería → Sin restricciones.</span>
          </li>
        </ol>

        <p className="text-center text-[11px] text-slate-500">
          <a href="/login" className="text-[#B9FF66] hover:underline">
            Volver al inicio de sesión
          </a>
        </p>
      </div>
    </div>
  );
}
