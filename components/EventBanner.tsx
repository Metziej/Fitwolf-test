
import React, { useState } from 'react';
import { SeasonalEvent } from '../types';

interface EventBannerProps {
  events: SeasonalEvent[];
  communityXpTotal?: number;
}

function isEventActive(event: SeasonalEvent): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return event.startDate <= today && today <= event.endDate;
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

export default function EventBanner({ events, communityXpTotal = 0 }: EventBannerProps) {
  const [collapsed, setCollapsed] = useState(false);

  const activeEvents = events.filter(isEventActive);
  if (activeEvents.length === 0) return null;

  // Take the first (or highest priority) active event
  const event = activeEvents[0];
  const daysLeft = getDaysRemaining(event.endDate);
  const milestoneProgress =
    event.milestoneGoal && event.milestoneGoal > 0
      ? Math.min(100, Math.round((communityXpTotal / event.milestoneGoal) * 100))
      : null;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-full flex items-center justify-between px-4 py-2 mb-4 border"
        style={{ borderColor: event.color + '60', background: event.color + '10' }}
      >
        <div className="flex items-center gap-2">
          <span>{event.icon}</span>
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: event.color }}>
            {event.title}
          </span>
          <span className="text-[8px] text-gray-500 uppercase">{event.xpMultiplier}× XP</span>
        </div>
        <span className="text-[8px] text-gray-600 uppercase tracking-widest">▼ Toon</span>
      </button>
    );
  }

  return (
    <div
      className="mb-4 border p-4"
      style={{ borderColor: event.color + '70', background: event.color + '0C' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{event.icon}</span>
          <div>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest">Seizoensevent Actief</p>
            <h3 className="text-base font-black uppercase italic tracking-tight" style={{ color: event.color }}>
              {event.title}
            </h3>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="text-[8px] text-gray-600 hover:text-gray-400 uppercase tracking-widest"
        >
          ▲ Inklappen
        </button>
      </div>

      {/* Description */}
      <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">{event.description}</p>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-3">
        {/* XP Multiplier */}
        <div
          className="flex items-center gap-1.5 border px-3 py-1.5"
          style={{ borderColor: event.color + '60', background: event.color + '15' }}
        >
          <span className="text-[9px] text-gray-400 uppercase">XP Bonus</span>
          <span className="text-sm font-black" style={{ color: event.color }}>
            {event.xpMultiplier}×
          </span>
        </div>

        {/* Days remaining */}
        <div className="flex items-center gap-1.5 border border-[#333] px-3 py-1.5">
          <span className="text-[9px] text-gray-400 uppercase">Nog</span>
          <span className="text-sm font-black text-white">{daysLeft}</span>
          <span className="text-[9px] text-gray-400 uppercase">dagen</span>
        </div>
      </div>

      {/* Community Milestone */}
      {milestoneProgress !== null && (
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-[9px] text-gray-500 uppercase tracking-widest">Community Milestone</p>
            <p className="text-[9px] font-black" style={{ color: event.color }}>
              {milestoneProgress}%
              {event.milestoneReached && ' ✓ BEREIKT'}
            </p>
          </div>
          <div className="h-1.5 bg-[#111] border border-[#222] overflow-hidden">
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${milestoneProgress}%`,
                background: event.color,
                boxShadow: `0 0 8px ${event.color}80`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <p className="text-[8px] text-gray-600">
              {communityXpTotal.toLocaleString()} XP verdiend
            </p>
            <p className="text-[8px] text-gray-600">
              Doel: {event.milestoneGoal?.toLocaleString()} XP
            </p>
          </div>
          {event.milestoneReached && (
            <div className="mt-2 border border-[#00FF88] bg-[#00FF88]/5 px-3 py-2">
              <p className="text-[9px] font-black text-[#00FF88] uppercase">
                🏆 Community milestone bereikt! Iedereen ontvangt de beloning.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
