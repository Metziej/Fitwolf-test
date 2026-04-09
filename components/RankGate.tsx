
import React from 'react';
import { getRankInfo, RANKS } from '../App.tsx';

interface RankGateProps {
  requiredRank: 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  currentXp: number;
  children: React.ReactNode;
  featureName?: string;
}

const RANK_ORDER: Record<string, number> = { E: 0, D: 1, C: 2, B: 3, A: 4, S: 5 };

export default function RankGate({ requiredRank, currentXp, children, featureName }: RankGateProps) {
  const currentRankInfo = getRankInfo(currentXp);
  const hasAccess = RANK_ORDER[currentRankInfo.rank] >= RANK_ORDER[requiredRank];

  if (hasAccess) {
    return <>{children}</>;
  }

  // Vereist rank info
  const reqRankInfo = RANKS.find(r => r.rank === requiredRank);
  const xpNeeded = reqRankInfo ? reqRankInfo.xpRequired - currentXp : 0;

  return (
    <div className="relative border border-[#333] bg-[#080808] p-4 overflow-hidden">
      {/* Geblurred preview van de content */}
      <div className="filter blur-sm pointer-events-none select-none opacity-40" aria-hidden="true">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-[1px]">
        <div
          className="text-3xl mb-2"
          style={{ filter: `drop-shadow(0 0 8px ${reqRankInfo?.color || '#FFB800'})` }}
        >
          🔒
        </div>
        <p
          className="text-xs font-black uppercase tracking-widest mb-1"
          style={{ color: reqRankInfo?.color || '#FFB800' }}
        >
          {requiredRank}-Rank Vereist
        </p>
        {featureName && (
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-2 text-center px-4">
            {featureName}
          </p>
        )}
        <p className="text-[9px] text-gray-600 font-bold">
          Nog {xpNeeded > 0 ? `${xpNeeded} XP` : 'bijna'} te gaan
        </p>
      </div>
    </div>
  );
}
