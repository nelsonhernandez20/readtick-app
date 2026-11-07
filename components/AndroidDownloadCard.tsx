import { Download, Smartphone } from 'lucide-react';
import { ANDROID_APK } from '@/lib/androidApp';

interface AndroidDownloadCardProps {
  compact?: boolean;
}

export default function AndroidDownloadCard({ compact = false }: AndroidDownloadCardProps) {
  return (
    <div
      className={`bg-[#14151D] border border-[#B9FF66]/35 rounded-2xl shadow-lg shadow-[#B9FF66]/5 ${
        compact ? 'p-3.5' : 'p-4 sm:p-5'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#B9FF66] flex items-center justify-center text-[#191A23] shrink-0 shadow-md shadow-[#B9FF66]/20">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#F3F3F3]">App Android</div>
            <p className={`text-[11px] text-slate-400 ${compact ? 'line-clamp-2' : ''}`}>
              La voz sigue leyendo con TikTok abierto. {ANDROID_APK.minAndroid} · v{ANDROID_APK.version} · {ANDROID_APK.sizeLabel}
            </p>
          </div>
        </div>
        <a
          href={ANDROID_APK.href}
          download={ANDROID_APK.filename}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#B9FF66] hover:bg-[#a6f44d] text-[#191A23] font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 shrink-0 whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          Descargar APK
        </a>
      </div>
    </div>
  );
}
