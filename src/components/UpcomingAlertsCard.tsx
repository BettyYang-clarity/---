import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Bell } from 'lucide-react';
import {
  ClientProfile,
  HoroscopeScope,
  UpcomingAlertKind,
} from '../types/holistic';
import { calculateUpcomingAlerts } from '../engines/upcomingAlertsEngine';

interface UpcomingAlertsCardProps {
  client: ClientProfile;
  targetDate: string;
  onSelectTargetDate: (dateStr: string, scope?: HoroscopeScope) => void;
}

type AlertFilter = 'all' | 'caution' | 'opportunity' | 'milestone';

const KIND_STYLES: Record<
  UpcomingAlertKind,
  { textClass: string; badgeClass: string }
> = {
  milestone: {
    textClass: 'text-[#8C6830]',
    badgeClass: 'border-[#8C6830]/30 bg-[#8C6830]/8 text-[#8C6830]',
  },
  opportunity: {
    textClass: 'text-[#1E6B4B]',
    badgeClass: 'border-[#1E6B4B]/30 bg-[#1E6B4B]/8 text-[#1E6B4B]',
  },
  caution: {
    textClass: 'text-[#A63A2B]',
    badgeClass: 'border-[#A63A2B]/30 bg-[#A63A2B]/8 text-[#A63A2B]',
  },
  balance: {
    textClass: 'text-[#244E70]',
    badgeClass: 'border-[#244E70]/25 bg-[#244E70]/6 text-[#244E70]',
  },
};

export const UpcomingAlertsCard: React.FC<UpcomingAlertsCardProps> = ({
  client,
  targetDate,
  onSelectTargetDate,
}) => {
  const [filter, setFilter] = useState<AlertFilter>('all');

  const alerts = useMemo(
    () => calculateUpcomingAlerts(client, targetDate),
    [client, targetDate]
  );

  const visibleItems = useMemo(() => {
    if (filter === 'all') return alerts.items;
    return alerts.items.filter((item) => item.kind === filter);
  }, [alerts.items, filter]);

  return (
    <section
      aria-label="重要節氣與未來三個月運程通知"
      className="rounded-lg border border-[#DDD6C7] bg-white p-5"
    >
      {/* Header Row */}
      <div className="flex flex-col justify-between gap-3 border-b border-[#ECE6DA] pb-3.5 sm:flex-row sm:items-end">
        <div>
          <h2 className="inline-flex items-center gap-2 font-serif text-base font-semibold text-[#152924]">
            <Bell className="h-4 w-4 text-[#8C6830]" />
            重要節氣／運程通知（未來三個月波動期）
          </h2>
          <p className="mt-0.5 text-xs text-[#6B7974] tabular-nums">
            監測區間 {alerts.baseDate} 至 {alerts.endDate} · 依據天文二十四節氣交節、紫微流月四化與八字月令沖合實算
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div
          role="group"
          aria-label="篩選運程通知類型"
          className="flex items-center gap-0.5 self-start rounded-md border border-[#DDD6C7] bg-[#EFEBE2] p-0.5 sm:self-auto"
        >
          {(
            [
              { id: 'all', label: `全部 (${alerts.items.length})` },
              { id: 'caution', label: `波動警示 (${alerts.cautionCount})` },
              { id: 'opportunity', label: `順勢機遇 (${alerts.opportunityCount})` },
              { id: 'milestone', label: `格局換頻 (${alerts.milestoneCount})` },
            ] as Array<{ id: AlertFilter; label: string }>
          ).map((opt) => {
            const active = filter === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                  active
                    ? 'bg-[#152924] text-[#FAF8F3]'
                    : 'text-[#4C5A55] hover:text-[#152924]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Annual Turning-Point Context Strip */}
      <div className="mt-3.5 flex flex-col justify-between gap-1.5 rounded-md border border-[#EBE5D8] bg-[#FAF8F3] px-4 py-2.5 text-xs sm:flex-row sm:items-baseline">
        <span className="font-serif font-semibold text-[#152924] shrink-0">
          流年轉折底盤：{alerts.annualContextTitle}
        </span>
        <span className="leading-relaxed text-[#4C5A55] sm:text-right">
          {alerts.annualContextNote}
        </span>
      </div>

      {/* Chronological 3-Month Timeline List (Hairline Dividers, Zero Nested Cards) */}
      {visibleItems.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#6B7974]">
          未來三個月內目前沒有屬於此篩選類別的波動通知，可切換回「全部」檢視所有節氣節點。
        </div>
      ) : (
        <div className="mt-3 divide-y divide-[#EFEAE0]">
          {visibleItems.map((item) => {
            const st = KIND_STYLES[item.kind];
            return (
              <div
                key={item.id}
                className="flex flex-col justify-between gap-3 py-3.5 md:flex-row md:items-start"
              >
                {/* Left Date & Countdown Column */}
                <div className="flex shrink-0 items-baseline gap-3 md:w-44 md:flex-col md:gap-0.5">
                  <div className="font-mono text-sm font-bold text-[#152924] tabular-nums">
                    {item.date}
                    {item.exactTime && (
                      <span className="ml-1.5 text-[11px] font-normal text-[#73807B]">
                        {item.exactTime}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11.5px] tabular-nums">
                    <span className={`font-semibold ${st.textClass}`}>
                      {item.countdownLabel}
                    </span>
                    <span className="text-[#C5BDAF]" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-[#6B7974]">{item.categoryLabel}</span>
                  </div>
                </div>

                {/* Middle Detail Column */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <h3 className="font-serif text-sm font-semibold text-[#152924]">
                      {item.title}
                    </h3>
                    <span
                      className={`inline-flex rounded border px-1.5 py-0.5 text-[10.5px] font-medium whitespace-nowrap ${st.badgeClass}`}
                    >
                      {item.signalLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] text-[#64736D]">
                    <span className="font-medium text-[#2B5B4C]">
                      {item.ganZhiTag}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.ziweiNote}</span>
                  </div>

                  <p className="text-xs leading-relaxed text-[#354540]">
                    {item.summary}
                  </p>
                  <p className="text-xs leading-relaxed text-[#52605B]">
                    <span className="font-semibold text-[#152924]">
                      應對提示：
                    </span>
                    {item.actionTip}
                  </p>
                </div>

                {/* Right Jump-to-Date Action */}
                <div className="shrink-0 md:pt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      onSelectTargetDate(item.date, item.recommendedScope)
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#2B5B4C] transition-colors hover:text-[#152924] whitespace-nowrap shrink-0"
                  >
                    檢視當日命盤
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
