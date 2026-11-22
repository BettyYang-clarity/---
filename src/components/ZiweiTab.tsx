import React, { useEffect, useMemo, useState } from 'react';
import {
  ClientProfile,
  HoroscopeScope,
  ZiweiChartResult,
  ZiweiPalaceData,
} from '../types/holistic';
import { getSanFangSiZhengIndices } from '../engines/ziweiEngine';
import { SCOPE_LABELS } from '../engines/holisticPayload';

interface ZiweiTabProps {
  client: ClientProfile;
  ziwei: ZiweiChartResult;
  activeScope: HoroscopeScope;
  onJumpToDecadalAge?: (startAge: number) => void;
}

// Traditional 4x4 grid mapping:
// Row 1: 巳(3), 午(4), 未(5), 申(6)
// Row 2: 辰(2), [CENTER], [CENTER], 酉(7)
// Row 3: 卯(1), [CENTER], [CENTER], 戌(8)
// Row 4: 寅(0), 丑(11), 子(10), 亥(9)
const GRID_POSITIONS: Array<{
  palaceIndex: number;
  row: number;
  col: number;
}> = [
  { palaceIndex: 3, row: 1, col: 1 }, // 巳
  { palaceIndex: 4, row: 1, col: 2 }, // 午
  { palaceIndex: 5, row: 1, col: 3 }, // 未
  { palaceIndex: 6, row: 1, col: 4 }, // 申
  { palaceIndex: 2, row: 2, col: 1 }, // 辰
  { palaceIndex: 7, row: 2, col: 4 }, // 酉
  { palaceIndex: 1, row: 3, col: 1 }, // 卯
  { palaceIndex: 8, row: 3, col: 4 }, // 戌
  { palaceIndex: 0, row: 4, col: 1 }, // 寅
  { palaceIndex: 11, row: 4, col: 2 }, // 丑
  { palaceIndex: 10, row: 4, col: 3 }, // 子
  { palaceIndex: 9, row: 4, col: 4 }, // 亥
];

const MUTAGEN_COLORS: Record<string, string> = {
  祿: 'bg-[#1E6B4B] text-white',
  權: 'bg-[#3B4D8F] text-white',
  科: 'bg-[#0F6D7A] text-white',
  忌: 'bg-[#B91C1C] text-white',
};

const SCOPE_MUTAGEN_OUTLINE: Record<string, string> = {
  祿: 'border-[#1E6B4B] text-[#1E6B4B] bg-[#1E6B4B]/12',
  權: 'border-[#3B4D8F] text-[#3B4D8F] bg-[#3B4D8F]/12',
  科: 'border-[#0F6D7A] text-[#0F6D7A] bg-[#0F6D7A]/12',
  忌: 'border-[#B91C1C] text-[#B91C1C] bg-[#B91C1C]/12',
};

const SCOPE_SHORT_PREFIX: Record<HoroscopeScope, string> = {
  origin: '本',
  decadal: '限',
  yearly: '年',
  monthly: '月',
  daily: '日',
};

export const ZiweiTab: React.FC<ZiweiTabProps> = ({
  client,
  ziwei,
  activeScope,
  onJumpToDecadalAge,
}) => {
  // Determine the Ming Palace index of the currently active scope
  const activeScopeMingIndex = useMemo(() => {
    switch (activeScope) {
      case 'decadal':
        return ziwei.activeDecadalInfo.index;
      case 'yearly':
        return ziwei.activeYearlyInfo.index;
      case 'monthly':
        return ziwei.activeMonthlyInfo.index;
      case 'daily':
        return ziwei.activeDailyInfo.index;
      case 'origin':
      default:
        return ziwei.mingPalaceIndex;
    }
  }, [activeScope, ziwei]);

  const [selectedIndex, setSelectedIndex] = useState<number>(
    activeScopeMingIndex
  );

  // Immediately shift focus & 三方四正 highlight when switching client OR switching [本命/大限/流年/流月/流日]
  useEffect(() => {
    setSelectedIndex(activeScopeMingIndex);
  }, [client.id, activeScopeMingIndex]);

  const effectiveIndex =
    selectedIndex >= 0 && selectedIndex < 12
      ? selectedIndex
      : activeScopeMingIndex;

  const sanFang = useMemo(
    () => getSanFangSiZhengIndices(effectiveIndex),
    [effectiveIndex]
  );

  // Sorted list of 12 decadal ranges for quick one-click 大限 jumping
  const sortedDecadals = useMemo(() => {
    return [...ziwei.palaces]
      .sort((a, b) => a.decadalRange[0] - b.decadalRange[0])
      .slice(0, 9);
  }, [ziwei.palaces]);

  // Build map from star name -> active scope mutagen (e.g., 限祿 / 年祿)
  const activeScopeMutagens = useMemo(() => {
    const map = new Map<
      string,
      { label: string; type: '祿' | '權' | '科' | '忌' }
    >();
    if (activeScope === 'origin') return map;
    const row = ziwei.mutagenTable.find((m) => m.scope === activeScope);
    if (!row) return map;
    const prefix = SCOPE_SHORT_PREFIX[activeScope];
    if (row.lu) map.set(row.lu, { label: `${prefix}祿`, type: '祿' });
    if (row.quan) map.set(row.quan, { label: `${prefix}權`, type: '權' });
    if (row.ke) map.set(row.ke, { label: `${prefix}科`, type: '科' });
    if (row.ji) map.set(row.ji, { label: `${prefix}忌`, type: '忌' });
    return map;
  }, [ziwei.mutagenTable, activeScope]);

  const getRelationRole = (
    idx: number
  ): 'self' | 'opposite' | 'triad' | null => {
    if (idx === sanFang.self) return 'self';
    if (idx === sanFang.opposite) return 'opposite';
    if (idx === sanFang.triadA || idx === sanFang.triadB) return 'triad';
    return null;
  };

  const activeScopeMutagenRow =
    ziwei.mutagenTable.find((m) => m.scope === activeScope) ??
    ziwei.mutagenTable[0];
  const activeScopeMingPalace = ziwei.palaces[activeScopeMingIndex];

  const renderPalaceCell = (palace: ZiweiPalaceData) => {
    const role = getRelationRole(palace.index);
    const isScopeMing =
      activeScope !== 'origin' && palace.index === activeScopeMingIndex;

    const roleBorderClass =
      role === 'self'
        ? 'bg-[#FFFDF7] ring-2 ring-inset ring-[#152924]'
        : role === 'opposite'
        ? 'bg-[#FBF6EB] ring-1 ring-inset ring-[#A63A2B]/80'
        : role === 'triad'
        ? 'bg-[#F3F8F5] ring-1 ring-inset ring-[#2B5B4C]/70'
        : 'bg-white hover:bg-[#FAF8F3]';

    const overlaidScopeLabels: Array<{
      text: string;
      color: string;
      isHighlight: boolean;
    }> = [];
    if (
      activeScope === 'decadal' ||
      activeScope === 'yearly' ||
      activeScope === 'monthly' ||
      activeScope === 'daily'
    ) {
      overlaidScopeLabels.push({
        text: `限・${palace.decadalPalaceName}`,
        color:
          activeScope === 'decadal' && palace.decadalPalaceName === '命宮'
            ? 'bg-[#8C6830] text-white px-1 rounded-[2px]'
            : 'text-[#8C6830]',
        isHighlight: activeScope === 'decadal',
      });
    }
    if (
      activeScope === 'yearly' ||
      activeScope === 'monthly' ||
      activeScope === 'daily'
    ) {
      overlaidScopeLabels.push({
        text: `年・${palace.yearlyPalaceName}`,
        color:
          activeScope === 'yearly' && palace.yearlyPalaceName === '命宮'
            ? 'bg-[#2B5B4C] text-white px-1 rounded-[2px]'
            : 'text-[#2B5B4C]',
        isHighlight: activeScope === 'yearly',
      });
    }
    if (activeScope === 'monthly' || activeScope === 'daily') {
      overlaidScopeLabels.push({
        text: `月・${palace.monthlyPalaceName}`,
        color:
          activeScope === 'monthly' && palace.monthlyPalaceName === '命宮'
            ? 'bg-[#3B4D8F] text-white px-1 rounded-[2px]'
            : 'text-[#3B4D8F]',
        isHighlight: activeScope === 'monthly',
      });
    }
    if (activeScope === 'daily') {
      overlaidScopeLabels.push({
        text: `日・${palace.dailyPalaceName}`,
        color:
          palace.dailyPalaceName === '命宮'
            ? 'bg-[#A63A2B] text-white px-1 rounded-[2px]'
            : 'text-[#A63A2B]',
        isHighlight: true,
      });
    }

    const activeHoroscopeStars =
      activeScope === 'decadal'
        ? palace.decadalStars
        : activeScope === 'yearly'
        ? palace.yearlyStars
        : activeScope === 'monthly'
        ? palace.monthlyStars
        : activeScope === 'daily'
        ? palace.dailyStars
        : [];

    return (
      <div
        key={palace.index}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedIndex(palace.index)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedIndex(palace.index);
          }
        }}
        className={`relative flex min-h-[158px] cursor-pointer flex-col justify-between border border-[#DDD6C7] p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#152924] ${roleBorderClass}`}
      >
        {/* Top Area: Major + Minor + Adjective Stars */}
        <div className="space-y-1.5">
          {/* Major Stars */}
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            {palace.majorStars.length > 0 ? (
              palace.majorStars.map((star) => {
                const scopeMut = activeScopeMutagens.get(star.name);
                return (
                  <span
                    key={star.name}
                    className="inline-flex items-center gap-0.5 leading-tight"
                  >
                    <span className="font-serif text-[13.5px] font-bold text-[#9C2F22]">
                      {star.name}
                    </span>
                    {star.brightness && (
                      <span className="text-[10px] text-[#7D6E5D]">
                        {star.brightness}
                      </span>
                    )}
                    {star.mutagen && (
                      <span
                        className={`rounded-[2px] px-1 py-[0.5px] text-[9.5px] font-semibold leading-none ${
                          MUTAGEN_COLORS[star.mutagen] ??
                          'bg-neutral-600 text-white'
                        }`}
                      >
                        {star.mutagen}
                      </span>
                    )}
                    {scopeMut && (
                      <span
                        className={`rounded-[2px] border px-0.5 py-[0.5px] text-[9px] font-semibold leading-none ${
                          SCOPE_MUTAGEN_OUTLINE[scopeMut.type]
                        }`}
                      >
                        {scopeMut.label}
                      </span>
                    )}
                  </span>
                );
              })
            ) : (
              <span className="text-[11px] italic text-[#9EA8A4]">空宮</span>
            )}
          </div>

          {/* Minor Stars */}
          {palace.minorStars.length > 0 && (
            <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] text-[#284D6B]">
              {palace.minorStars.map((star) => {
                const scopeMut = activeScopeMutagens.get(star.name);
                return (
                  <span
                    key={star.name}
                    className="inline-flex items-center gap-0.5"
                  >
                    <span>{star.name}</span>
                    {star.mutagen && (
                      <span
                        className={`rounded-[2px] px-0.5 text-[9px] font-semibold leading-none ${
                          MUTAGEN_COLORS[star.mutagen] ?? ''
                        }`}
                      >
                        {star.mutagen}
                      </span>
                    )}
                    {scopeMut && (
                      <span
                        className={`rounded-[2px] border px-0.5 text-[8.5px] font-semibold leading-none ${
                          SCOPE_MUTAGEN_OUTLINE[scopeMut.type]
                        }`}
                      >
                        {scopeMut.label}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {/* Adjective + Active Horoscope Flowing Stars */}
          {(palace.adjectiveStars.length > 0 ||
            activeHoroscopeStars.length > 0) && (
            <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-[10px] leading-snug text-[#76827D]">
              {palace.adjectiveStars.slice(0, 5).map((s) => (
                <span key={s.name}>{s.name}</span>
              ))}
              {activeHoroscopeStars.map((sName) => (
                <span key={sName} className="font-semibold text-[#8C6830]">
                  {sName}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Area: Horoscope Overlays + Palace Name + Decadal Ages + GanZhi */}
        <div className="mt-2 border-t border-[#EFEAE0] pt-1.5">
          {overlaidScopeLabels.length > 0 && (
            <div className="mb-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium">
              {overlaidScopeLabels.map((item) => (
                <span key={item.text} className={item.color}>
                  {item.text}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-end justify-between gap-1">
            <div className="flex flex-col">
              {onJumpToDecadalAge ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onJumpToDecadalAge(palace.decadalRange[0]);
                  }}
                  title={`點擊切換至 ${palace.decadalRange[0]}–${palace.decadalRange[1]} 歲大限`}
                  className={`w-fit font-mono text-[10px] tabular-nums underline-offset-2 transition-colors hover:text-[#152924] hover:underline ${
                    palace.index === ziwei.activeDecadalInfo.index &&
                    activeScope !== 'origin'
                      ? 'font-semibold text-[#8C6830]'
                      : 'text-[#7D8A85]'
                  }`}
                >
                  {palace.decadalRange[0]}–{palace.decadalRange[1]}歲
                </button>
              ) : (
                <span className="font-mono text-[10px] text-[#7D8A85] tabular-nums">
                  {palace.decadalRange[0]}–{palace.decadalRange[1]}歲
                </span>
              )}
              <div className="flex items-center gap-1">
                <span className="font-serif text-[13px] font-semibold text-[#152924]">
                  {palace.name}
                </span>
                {palace.isBodyPalace && (
                  <span className="text-[10px] font-semibold text-[#A63A2B]">
                    [身]
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              {isScopeMing ? (
                <div className="text-[9.5px] font-semibold text-[#A63A2B]">
                  {SCOPE_SHORT_PREFIX[activeScope]}命
                </div>
              ) : role ? (
                <div className="text-[9.5px] font-medium text-[#2B5B4C]">
                  {role === 'self'
                    ? '焦點'
                    : role === 'opposite'
                    ? '對宮'
                    : '三合'}
                </div>
              ) : null}
              <div className="font-serif text-xs font-semibold text-[#4B5853]">
                {palace.heavenlyStem}
                {palace.earthlyBranch}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const selectedPalace = ziwei.palaces[effectiveIndex];
  const oppositePalace = ziwei.palaces[sanFang.opposite];
  const triadAPalace = ziwei.palaces[sanFang.triadA];
  const triadBPalace = ziwei.palaces[sanFang.triadB];

  return (
    <div className="space-y-4">
      {/* Active Scope Status & Quick Decadal Selector Bar */}
      <section className="rounded-lg border border-[#DDD6C7] bg-white px-4 py-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-serif text-sm font-semibold text-[#152924]">
              當前層級：{SCOPE_LABELS[activeScope]}
            </span>
            <span className="text-[#C5BDAF]">|</span>
            <span className="text-[#2B5B4C] font-medium">
              {activeScope === 'origin'
                ? `本命命宮（${activeScopeMingPalace.heavenlyStem}${activeScopeMingPalace.earthlyBranch}）`
                : `${activeScopeMutagenRow.label}命宮落本命「${activeScopeMingPalace.name}」（${activeScopeMutagenRow.ganZhi}）`}
            </span>
            <span className="text-[#C5BDAF]">|</span>
            <span className="text-[#596863]">
              四化：
              <span className="text-[#1E6B4B]">祿 {activeScopeMutagenRow.lu}</span>
              {' · '}
              <span className="text-[#3B4D8F]">權 {activeScopeMutagenRow.quan}</span>
              {' · '}
              <span className="text-[#0F6D7A]">科 {activeScopeMutagenRow.ke}</span>
              {' · '}
              <span className="text-[#B91C1C]">忌 {activeScopeMutagenRow.ji}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#596863]">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#1E6B4B]" />
              祿
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#3B4D8F]" />
              權
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#0F6D7A]" />
              科
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#B91C1C]" />
              忌
            </span>
          </div>
        </div>

        {/* Interactive Decadal Age Quick-Jump Strip */}
        {onJumpToDecadalAge && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-[#F0EBE0] pt-2.5">
            <span className="mr-1 text-[11px] font-medium text-[#6B7974] whitespace-nowrap">
              快速切換大限：
            </span>
            {sortedDecadals.map((p) => {
              const isCurrentDecadal =
                p.index === ziwei.activeDecadalInfo.index;
              return (
                <button
                  key={p.index}
                  type="button"
                  onClick={() => onJumpToDecadalAge(p.decadalRange[0])}
                  className={`rounded border px-2 py-1 font-mono text-[11px] transition-colors tabular-nums whitespace-nowrap ${
                    isCurrentDecadal && activeScope !== 'origin'
                      ? 'border-[#152924] bg-[#152924] text-[#FAF8F3]'
                      : isCurrentDecadal
                      ? 'border-[#9A7B3E] bg-[#FAF4E8] text-[#152924]'
                      : 'border-[#E5DEC9] bg-[#FAF8F3] text-[#4C5A55] hover:border-[#2B5B4C] hover:text-[#152924]'
                  }`}
                >
                  {p.decadalRange[0]}–{p.decadalRange[1]}歲
                  <span className="ml-1 font-serif">
                    {p.heavenlyStem}
                    {p.earthlyBranch}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Traditional 4x4 Square Astrolabe */}
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[660px] grid-cols-4 grid-rows-4 border border-[#CEC5B4] bg-[#DDD6C7]">
          {GRID_POSITIONS.map(({ palaceIndex, row, col }) => (
            <div
              key={palaceIndex}
              style={{ gridRow: row, gridColumn: col }}
              className="flex flex-col"
            >
              {renderPalaceCell(ziwei.palaces[palaceIndex])}
            </div>
          ))}

          {/* Center 2x2 Master Chart Info & Four Transformations */}
          <div
            style={{ gridRow: '2 / span 2', gridColumn: '2 / span 2' }}
            className="flex flex-col justify-between border border-[#DDD6C7] bg-[#FAF8F3] p-4"
          >
            <div>
              <div className="flex items-baseline justify-between gap-2 border-b border-[#E5DEC9] pb-2.5">
                <div>
                  <span className="font-serif text-lg font-bold text-[#152924]">
                    {client.name}
                  </span>
                  <span className="ml-2 text-xs text-[#596863]">
                    {client.gender} · {ziwei.fiveElementsClass}
                  </span>
                </div>
                <span className="text-xs font-medium text-[#8C6830]">
                  命主 {ziwei.soulLord} / 身主 {ziwei.bodyLord}
                </span>
              </div>

              <div className="mt-2.5 space-y-1 text-xs text-[#4C5A55] tabular-nums">
                <div>
                  <span className="text-[#7B8883]">國曆：</span>
                  {client.birthDate} {client.birthTime}（{ziwei.time}{' '}
                  {ziwei.timeRange}）
                </div>
                <div>
                  <span className="text-[#7B8883]">農曆：</span>
                  {ziwei.lunarDate}（{ziwei.zodiac}）
                </div>
                <div>
                  <span className="text-[#7B8883]">干支：</span>
                  <span className="font-serif text-[#152924]">
                    {ziwei.chineseDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Four Transformations Summary Table */}
            <div className="mt-3 border-t border-[#E5DEC9] pt-2.5">
              <div className="mb-1.5 text-[11px] font-semibold text-[#152924]">
                四化飛星對照表（勸學齋庚干：陽武陰同 · 目標農曆：{ziwei.targetLunarDate}）
              </div>
              <div className="overflow-hidden rounded border border-[#E5DEC9] bg-white">
                <table className="w-full text-left text-[11px] tabular-nums">
                  <thead className="border-b border-[#ECE6DA] bg-[#F5F1E7] text-[#5C6B66]">
                    <tr>
                      <th className="px-2 py-1 font-medium">層級</th>
                      <th className="px-1.5 py-1 font-medium text-[#1E6B4B]">祿</th>
                      <th className="px-1.5 py-1 font-medium text-[#3B4D8F]">權</th>
                      <th className="px-1.5 py-1 font-medium text-[#0F6D7A]">科</th>
                      <th className="px-1.5 py-1 font-medium text-[#B91C1C]">忌</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EBE0]">
                    {ziwei.mutagenTable.map((row) => {
                      const isActive = row.scope === activeScope;
                      return (
                        <tr
                          key={row.scope}
                          className={
                            isActive
                              ? 'bg-[#152924]/10 font-semibold text-[#152924]'
                              : 'text-[#4C5A55]'
                          }
                        >
                          <td className="px-2 py-1 whitespace-nowrap">
                            {row.label}
                            <span className="ml-1 text-[10px] text-[#7D8A85]">
                              {row.ganZhi}
                            </span>
                          </td>
                          <td className="px-1.5 py-1">{row.lu}</td>
                          <td className="px-1.5 py-1">{row.quan}</td>
                          <td className="px-1.5 py-1">{row.ke}</td>
                          <td className="px-1.5 py-1">{row.ji}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Palace 三方四正 Inspector Strip */}
      <section className="rounded-lg border border-[#DDD6C7] bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#ECE6DA] pb-2.5">
          <h3 className="font-serif text-sm font-semibold text-[#152924]">
            三方四正解析焦點：本命{selectedPalace.name}（{selectedPalace.heavenlyStem}
            {selectedPalace.earthlyBranch}）
            {activeScope !== 'origin' && (
              <span className="ml-2 font-sans text-xs font-medium text-[#8C6830]">
                {activeScope === 'decadal'
                  ? `大限${selectedPalace.decadalPalaceName}`
                  : activeScope === 'yearly'
                  ? `流年${selectedPalace.yearlyPalaceName}`
                  : activeScope === 'monthly'
                  ? `流月${selectedPalace.monthlyPalaceName}`
                  : `流日${selectedPalace.dailyPalaceName}`}
              </span>
            )}
          </h3>
          <span className="text-xs text-[#6B7974] tabular-nums">
            長生十二神：{selectedPalace.changsheng12} · 博士十二神：
            {selectedPalace.boshi12} · 大限 {selectedPalace.decadalRange[0]}–
            {selectedPalace.decadalRange[1]} 歲
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { tag: '本宮', palace: selectedPalace, accent: 'text-[#152924]' },
            {
              tag: '對宮（遷移照會）',
              palace: oppositePalace,
              accent: 'text-[#A63A2B]',
            },
            {
              tag: '三合宮（左會）',
              palace: triadAPalace,
              accent: 'text-[#2B5B4C]',
            },
            {
              tag: '三合宮（右會）',
              palace: triadBPalace,
              accent: 'text-[#2B5B4C]',
            },
          ].map(({ tag, palace, accent }) => (
            <div
              key={tag}
              className="rounded border border-[#ECE6DA] bg-[#FAF8F3] px-3 py-2.5"
            >
              <div className={`text-[11px] font-medium ${accent}`}>
                {tag} · {palace.name}（{palace.heavenlyStem}
                {palace.earthlyBranch}）
              </div>
              <div className="mt-1 font-serif text-xs font-semibold text-[#1A2421]">
                {palace.majorStars.length > 0
                  ? palace.majorStars
                      .map(
                        (s) =>
                          `${s.name}${s.brightness ? `(${s.brightness})` : ''}${
                            s.mutagen ? `[${s.mutagen}]` : ''
                          }`
                      )
                      .join('、')
                  : '空宮'}
              </div>
              {palace.minorStars.length > 0 && (
                <div className="mt-1 text-[11px] text-[#5C6B66]">
                  輔星：{palace.minorStars.map((s) => s.name).join('、')}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
