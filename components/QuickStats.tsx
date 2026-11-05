'use client';

import React from 'react';
import { Users, Heart, Gift, Gem } from 'lucide-react';

interface QuickStatsProps {
  viewers: number;
  likes: number;
  giftsCount: number;
  diamonds: number;
}

export default function QuickStats({
  viewers,
  likes,
  giftsCount,
  diamonds,
}: QuickStatsProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Viewers */}
      <div className="bg-[#191A23] border border-[#292A36] rounded-xl p-3.5 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-[#B9FF66]/10 text-[#B9FF66]">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Espectadores
          </div>
          <div className="text-lg font-bold text-[#F3F3F3] tracking-tight">
            {formatNumber(viewers)}
          </div>
        </div>
      </div>

      {/* Likes */}
      <div className="bg-[#191A23] border border-[#292A36] rounded-xl p-3.5 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-[#B9FF66]/10 text-[#B9FF66]">
          <Heart className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Me Gusta
          </div>
          <div className="text-lg font-bold text-[#F3F3F3] tracking-tight">
            {formatNumber(likes)}
          </div>
        </div>
      </div>

      {/* Gifts */}
      <div className="bg-[#191A23] border border-[#292A36] rounded-xl p-3.5 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-[#B9FF66]/10 text-[#B9FF66]">
          <Gift className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Regalos
          </div>
          <div className="text-lg font-bold text-[#F3F3F3] tracking-tight">
            {formatNumber(giftsCount)}
          </div>
        </div>
      </div>

      {/* Diamonds */}
      <div className="bg-[#191A23] border border-[#292A36] rounded-xl p-3.5 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-[#B9FF66]/10 text-[#B9FF66]">
          <Gem className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Diamantes
          </div>
          <div className="text-lg font-bold text-[#F3F3F3] tracking-tight">
            {formatNumber(diamonds)}
          </div>
        </div>
      </div>
    </div>
  );
}
