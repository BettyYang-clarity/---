import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import {
  BaziChartResult,
  BaziDecadeFortune,
  BaziFlowPillar,
  BaziShenShaItem,
  ClientProfile,
  FiveElement,
  HoroscopeScope,
} from '../types/holistic';
import { SCOPE_LABELS } from '../engines/holisticPayload';

interface BaziTabProps {
  client: ClientProfile;
  bazi: BaziChartResult;
  targetDate: string;
  activeScope: HoroscopeScope;
  onSelectScope: (scope: HoroscopeScope) => void;
  onSelectTargetYear: (year: number, nextScope?: HoroscopeScope) => void;
}

const ELEMENT_TEXT_COLORS: Record<FiveElement, string> = {
  木: 'text-[#2B5B4C]',
  火: 'text-[#A63A2B]',
  土: 'text-[#8C6830]',
  金: 'text-[#5A6068]',
  水: 'text-[#244E70]',
};

const ELEMENT_BAR_COLORS: Record<FiveElement, string> = {
  木: 'bg-[#2B5B4C]',
  火: 'bg-[#A63A2B]',
  土: 'bg-[#9A7B3E]',
  金: 'bg-[#6F7680]',
  水: 'bg-[#244E70]',
};

const SHENSHA_TEXT_STYLES: Record<BaziShenShaItem['category'], string> = {
  auspicious: 'text-[#1E6B4B] hover:bg-[#1E6B4B]/10',
  neutral: 'text-[#8C6830] hover:bg-[#8C6830]/10',
  caution: 'text-[#A63A2B] hover:bg-[#A63A2B]/10',
};

const SHENSHA_CATEGORY_LABELS: Record<BaziShenShaItem['category'], string> = {
  auspicious: '吉神貴曜',
  neutral: '特質星煞',
  caution: '警示轉化煞',
};

export const BaziTab: React.FC<BaziTabProps> = ({
  client,
  bazi,
  targetDate,
  activeScope,
  onSelectScope,
  onSelectTargetYear,
}) => {
  const targetYear = Number(targetDate.split('-')[0]);
  const [expandedDecadeIndex, setExpandedDecadeIndex] = useState<number>(
    bazi.targetFlow.activeDecade?.index ?? 0
  );
  const [selectedShenSha, setSelectedShenSha] = useState<{
    pillarLabel: string;
    item: BaziShenShaItem;
  } | null>(null);

  useEffect(() => {
    if (bazi.targetFlow.activeDecade) {
      setExpandedDecadeIndex(bazi.targetFlow.activeDecade.index);
    } else {
      setExpandedDecadeIndex(0);
    }
  }, [client.id, bazi.targetFlow.activeDecade?.index]);

  useEffect(() => {
    setSelectedShenSha(null);
  }, [client.id]);

  // Determine which flowing pillars to display alongside the 4 Natal Pillars based on activeScope
  const visibleFlowPillars: BaziFlowPillar[] = useMemo(() => {
    const list: BaziFlowPillar[] = [];
    if (activeScope === 'origin') return list;

    if (bazi.targetFlow.decadePillar) {
      list.push(bazi.targetFlow.decadePillar);
    }
    if (
      activeScope === 'yearly' ||
      activeScope === 'monthly' ||
      activeScope === 'daily'
    ) {
      list.push(bazi.targetFlow.yearPillar);
    }
    if (activeScope === 'monthly' || activeScope === 'daily') {
      list.push(bazi.targetFlow.monthPillar);
    }
    if (activeScope === 'daily') {
      list.push(bazi.targetFlow.dayPillar);
    }
    return list;
  }, [activeScope, bazi.targetFlow]);

  const activeDecadeObj =
    bazi.decadeFortunes.find((d) => d.index === expandedDecadeIndex) ??
    bazi.decadeFortunes[0];

  const handleDecadeClick = (decade: BaziDecadeFortune) => {
    setExpandedDecadeIndex(decade.index);
    const inRange =
      targetYear >= decade.startYear && targetYear <= decade.endYear;
    if (!inRange) {
      onSelectTargetYear(decade.startYear, 'decadal');
    } else {
      onSelectScope('decadal');
    }
  };

  const totalElements = 8;

  // Unified columns: Flowing Pillars (left) + 4 Natal Pillars (right, 時/日/月/年)
  // Traditional Chinese Bazi tables place flowing pillars on the left of 時柱 so they interact clearly!
  const allColumns = [
    ...visibleFlowPillars.map((fp) => ({
      key: `flow-${fp.label}`,
      label: fp.label,
      subLabel: fp.subLabel,
      tenStar: fp.tenStar,
      stem: fp.stem,
      branch: fp.branch,
      stemElement: fp.stemElement,
      branchElement: fp.branchElement,
      stemYinYang: fp.stemYinYang,
      hiddenStems: fp.hiddenStems,
      terrain: fp.terrain,
      sound: fp.sound,
      kongWang: fp.kongWang,
      shenSha: fp.shenSha,
      isDayMaster: false,
      isFlow: true,
    })),
    ...bazi.pillars.map((p) => ({
      key: `natal-${p.label}`,
      label: p.label,
      subLabel: p.isDayMaster ? '日主' : '',
      tenStar: p.tenStar,
      stem: p.stem,
      branch: p.branch,
      stemElement: p.stemElement,
      branchElement: p.branchElement,
      stemYinYang: p.stemYinYang,
      hiddenStems: p.hiddenStems,
      terrain: p.terrain,
      sound: p.sound,
      kongWang: p.kongWang,
      shenSha: p.shenSha,
      isDayMaster: Boolean(p.isDayMaster),
      isFlow: false,
    })),
  ];

  return (
    <div className="space-y-5">
      {/* Four Pillars + Active Flow Pillars Master Table */}
      <section className="rounded-lg border border-[#DDD6C7] bg-white">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#ECE6DA] px-5 py-3.5">
          <div>
            <h2 className="font-serif text-base font-semibold text-[#152924]">
              主流子平八字命盤（{SCOPE_LABELS[activeScope]}模式）
            </h2>
            <p className="mt-0.5 text-xs text-[#6B7974] tabular-nums">
              {client.name}（{client.gender}命） · 日主{' '}
              <span
                className={`font-semibold ${ELEMENT_TEXT_COLORS[bazi.dayMaster.element]}`}
              >
                {bazi.dayMaster.stem}（{bazi.dayMaster.yinYang}
                {bazi.dayMaster.element}）
              </span>{' '}
              · 日空亡 {bazi.dayKongWang}
              {visibleFlowPillars.length > 0 && (
                <span>
                  {' '}
                  · 已疊加 {visibleFlowPillars.map((f) => f.label).join('／')}柱
                </span>
              )}
            </p>
          </div>
          <div className="text-xs text-[#5B6964] tabular-nums">
            {bazi.startAgeDescription}（
            {bazi.isForward ? '陽男陰女順行' : '陰男陽女逆行'}）
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-center">
            <thead>
              <tr className="border-b border-[#ECE6DA] bg-[#FAF8F3] text-xs text-[#64736D]">
                <th className="w-24 border-r border-[#ECE6DA] px-3 py-2.5 text-left font-medium">
                  命盤項目
                </th>
                {allColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`border-r border-[#ECE6DA] px-3 py-2.5 font-serif text-sm font-semibold last:border-r-0 ${
                      col.isFlow
                        ? 'bg-[#FAF4E8] text-[#8C6830]'
                        : col.isDayMaster
                        ? 'bg-[#152924]/5 text-[#152924]'
                        : 'text-[#394843]'
                    }`}
                  >
                    <div>{col.label}</div>
                    {col.subLabel && (
                      <div
                        className={`mt-0.5 font-sans text-[10.5px] font-medium tabular-nums ${
                          col.isFlow ? 'text-[#8C6830]/80' : 'text-[#A63A2B]'
                        }`}
                      >
                        {col.subLabel}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFEAE0] text-sm">
              {/* 十神 */}
              <tr>
                <td className="border-r border-[#ECE6DA] bg-[#FAF8F3] px-3 py-2 text-left text-xs font-medium text-[#64736D]">
                  主星十神
                </td>
                {allColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`border-r border-[#ECE6DA] px-3 py-2 text-xs font-medium last:border-r-0 ${
                      col.isFlow
                        ? 'bg-[#FAF4E8]/50 text-[#2B5B4C]'
                        : col.isDayMaster
                        ? 'bg-[#152924]/[0.025] text-[#A63A2B]'
                        : 'text-[#394843]'
                    }`}
                  >
                    {col.tenStar}
                  </td>
                ))}
              </tr>

              {/* 天干 */}
              <tr>
                <td className="border-r border-[#ECE6DA] bg-[#FAF8F3] px-3 py-3 text-left text-xs font-medium text-[#64736D]">
                  天干
                </td>
                {allColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`border-r border-[#ECE6DA] px-3 py-3 last:border-r-0 ${
                      col.isFlow
                        ? 'bg-[#FAF4E8]/40'
                        : col.isDayMaster
                        ? 'bg-[#152924]/[0.025]'
                        : ''
                    }`}
                  >
                    <div
                      className={`font-serif text-3xl font-bold leading-none ${ELEMENT_TEXT_COLORS[col.stemElement]}`}
                    >
                      {col.stem}
                    </div>
                    <div className="mt-1 text-[11px] text-[#7A8782]">
                      {col.stemYinYang}
                      {col.stemElement}
                    </div>
                  </td>
                ))}
              </tr>

              {/* 地支 */}
              <tr>
                <td className="border-r border-[#ECE6DA] bg-[#FAF8F3] px-3 py-3 text-left text-xs font-medium text-[#64736D]">
                  地支
                </td>
                {allColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`border-r border-[#ECE6DA] px-3 py-3 last:border-r-0 ${
                      col.isFlow
                        ? 'bg-[#FAF4E8]/40'
                        : col.isDayMaster
                        ? 'bg-[#152924]/[0.025]'
                        : ''
                    }`}
                  >
                    <div
                      className={`font-serif text-3xl font-bold leading-none ${ELEMENT_TEXT_COLORS[col.branchElement]}`}
                    >
                      {col.branch}
                    </div>
                    <div className="mt-1 text-[11px] text-[#7A8782]">
                      {col.branchElement}
                    </div>
                  </td>
                ))}
              </tr>

              {/* 地支藏干 */}
              <tr>
                <td className="border-r border-[#ECE6DA] bg-[#FAF8F3] px-3 py-2.5 text-left text-xs font-medium text-[#64736D]">
                  地支藏干
                </td>
                {allColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`border-r border-[#ECE6DA] px-2.5 py-2.5 align-top last:border-r-0 ${
                      col.isFlow
                        ? 'bg-[#FAF4E8]/30'
                        : col.isDayMaster
                        ? 'bg-[#152924]/[0.025]'
                        : ''
                    }`}
                  >
                    <div className="space-y-1">
                      {col.hiddenStems.map((h) => (
                        <div
                          key={`${col.key}-${h.stem}-${h.typeLabel}`}
                          className="flex items-center justify-center gap-1 text-xs whitespace-nowrap"
                        >
                          <span
                            className={`font-serif font-semibold ${ELEMENT_TEXT_COLORS[h.element]}`}
                          >
                            {h.stem}
                          </span>
                          <span className="text-[#4B5853]">{h.tenStar}</span>
                          <span className="text-[10px] text-[#8E9994]">
                            {h.typeLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>

              {/* 星運（十二長生） */}
              <tr>
                <td className="border-r border-[#ECE6DA] bg-[#FAF8F3] px-3 py-2 text-left text-xs font-medium text-[#64736D]">
                  星運長生
                </td>
                {allColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`border-r border-[#ECE6DA] px-3 py-2 text-xs font-medium text-[#2B5B4C] last:border-r-0 ${
                      col.isFlow ? 'bg-[#FAF4E8]/30' : ''
                    }`}
                  >
                    {col.terrain}
                  </td>
                ))}
              </tr>

              {/* 納音 */}
              <tr>
                <td className="border-r border-[#ECE6DA] bg-[#FAF8F3] px-3 py-2 text-left text-xs font-medium text-[#64736D]">
                  納音五行
                </td>
                {allColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`border-r border-[#ECE6DA] px-3 py-2 text-xs text-[#4C5A55] last:border-r-0 ${
                      col.isFlow ? 'bg-[#FAF4E8]/30' : ''
                    }`}
                  >
                    {col.sound}
                  </td>
                ))}
              </tr>

              {/* 旬空 */}
              <tr>
                <td className="border-r border-[#ECE6DA] bg-[#FAF8F3] px-3 py-2 text-left text-xs font-medium text-[#64736D]">
                  旬空（空亡）
                </td>
                {allColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`border-r border-[#ECE6DA] px-3 py-2 font-serif text-xs text-[#5C6B66] last:border-r-0 ${
                      col.isFlow ? 'bg-[#FAF4E8]/30' : ''
                    }`}
                  >
                    {col.kongWang}
                  </td>
                ))}
              </tr>

              {/* 神煞 */}
              <tr>
                <td className="border-r border-[#ECE6DA] bg-[#FAF8F3] px-3 py-3 text-left align-top text-xs font-medium text-[#64736D]">
                  <div>神煞</div>
                  <div className="mt-0.5 text-[10px] font-normal text-[#8E9994]">
                    點選查釋義
                  </div>
                </td>
                {allColumns.map((col) => (
                  <td
                    key={col.key}
                    className={`border-r border-[#ECE6DA] px-2 py-2.5 align-top last:border-r-0 ${
                      col.isFlow
                        ? 'bg-[#FAF4E8]/30'
                        : col.isDayMaster
                        ? 'bg-[#152924]/[0.025]'
                        : ''
                    }`}
                  >
                    {col.shenSha.length > 0 ? (
                      <div className="flex flex-col items-center gap-0.5">
                        {col.shenSha.map((item) => {
                          const isSelected =
                            selectedShenSha?.pillarLabel === col.label &&
                            selectedShenSha?.item.name === item.name;
                          return (
                            <button
                              key={`${col.key}-${item.name}`}
                              type="button"
                              onClick={() =>
                                setSelectedShenSha(
                                  isSelected
                                    ? null
                                    : { pillarLabel: col.label, item }
                                )
                              }
                              className={`rounded px-1.5 py-0.5 text-[11.5px] font-medium transition-colors whitespace-nowrap ${
                                isSelected
                                  ? 'bg-[#152924] text-[#FAF8F3]'
                                  : SHENSHA_TEXT_STYLES[item.category]
                              }`}
                            >
                              {item.name}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#A2ACA8]">—</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Selected Shen Sha Detail Callout */}
        <div className="border-t border-[#ECE6DA] bg-[#FAF8F3] px-5 py-3 text-xs">
          {selectedShenSha ? (
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="leading-relaxed text-[#25332E]">
                <span className="font-serif text-sm font-semibold text-[#152924]">
                  {selectedShenSha.pillarLabel}・{selectedShenSha.item.name}
                </span>
                <span className="mx-2 text-[#8C9893]">·</span>
                <span className="text-[#8C6830]">
                  {SHENSHA_CATEGORY_LABELS[selectedShenSha.item.category]}
                </span>
                <span className="mx-2 text-[#8C9893]">—</span>
                <span>{selectedShenSha.item.description}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShenSha(null)}
                className="text-[11px] text-[#6B7974] hover:text-[#152924]"
              >
                收合
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[#6B7974]">
              <span className="inline-flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-[#8C6830]" />
                點擊任一「神煞」名稱可檢視該星煞的命理意涵與轉化提醒。
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[#1E6B4B]">■ 吉神貴曜</span>
                <span className="text-[#8C6830]">■ 特質星煞</span>
                <span className="text-[#A63A2B]">■ 警示轉化煞</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Five Elements Distribution & Interactive Target Flow Switcher */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-[#DDD6C7] bg-white p-4">
          <h3 className="font-serif text-sm font-semibold text-[#152924]">
            原局干支五行分佈（共八字）
          </h3>
          <div className="mt-3 space-y-2">
            {(['木', '火', '土', '金', '水'] as FiveElement[]).map((el) => {
              const count = bazi.elementCounts[el];
              const pct = Math.round((count / totalElements) * 100);
              return (
                <div key={el} className="flex items-center gap-3 text-xs">
                  <span
                    className={`w-6 font-serif font-semibold ${ELEMENT_TEXT_COLORS[el]}`}
                  >
                    {el}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EFEAE0]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${ELEMENT_BAR_COLORS[el]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right font-mono text-[11px] text-[#5C6B66] tabular-nums">
                    {count}（{pct}%）
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-[#DDD6C7] bg-white p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-serif text-sm font-semibold text-[#152924]">
              目標查詢時刻流運座標（{targetDate}）
            </h3>
            <span className="text-[11px] text-[#7A8782]">點選切換疊盤層級</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {(
              [
                {
                  scope: 'decadal' as HoroscopeScope,
                  label: '當前大運',
                  gz: bazi.targetFlow.activeDecade?.ganZhi ?? '童限',
                  ts: bazi.targetFlow.activeDecade?.tenStar ?? '未起運',
                  sub: bazi.targetFlow.activeDecade
                    ? `${bazi.targetFlow.activeDecade.startAge}–${bazi.targetFlow.activeDecade.endAge}歲`
                    : '',
                },
                {
                  scope: 'yearly' as HoroscopeScope,
                  label: '流年',
                  gz: bazi.targetFlow.yearGanZhi,
                  ts: bazi.targetFlow.yearTenStar,
                  sub: `${targetYear}年`,
                },
                {
                  scope: 'monthly' as HoroscopeScope,
                  label: '流月',
                  gz: bazi.targetFlow.monthGanZhi,
                  ts: bazi.targetFlow.monthTenStar,
                  sub: '節氣月令',
                },
                {
                  scope: 'daily' as HoroscopeScope,
                  label: '流日',
                  gz: bazi.targetFlow.dayGanZhi,
                  ts: bazi.targetFlow.dayTenStar,
                  sub: '日辰干支',
                },
              ]
            ).map((item) => {
              const isSelected = activeScope === item.scope;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onSelectScope(item.scope)}
                  className={`rounded border px-2.5 py-2.5 text-center transition-colors ${
                    isSelected
                      ? 'border-[#152924] bg-[#152924] text-[#FAF8F3]'
                      : 'border-[#ECE6DA] bg-[#FAF8F3] text-[#152924] hover:border-[#2B5B4C]'
                  }`}
                >
                  <div
                    className={`text-[11px] ${
                      isSelected ? 'text-[#C9A861]' : 'text-[#73807B]'
                    }`}
                  >
                    {item.label}
                  </div>
                  <div className="mt-1 font-serif text-lg font-bold">
                    {item.gz}
                  </div>
                  <div
                    className={`text-[11px] font-medium ${
                      isSelected ? 'text-[#DCE5E1]' : 'text-[#2B5B4C]'
                    }`}
                  >
                    {item.ts}
                  </div>
                  {item.sub && (
                    <div
                      className={`mt-0.5 font-mono text-[10px] tabular-nums ${
                        isSelected ? 'text-[#9BB0A8]' : 'text-[#7D8A85]'
                      }`}
                    >
                      {item.sub}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Interactive Decade Fortunes -> 10 Yearly Fortunes */}
      <section className="rounded-lg border border-[#DDD6C7] bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#ECE6DA] pb-3">
          <div>
            <h3 className="font-serif text-base font-semibold text-[#152924]">
              大運與十年流年互動軸
            </h3>
            <p className="mt-0.5 text-xs text-[#6B7974]">
              點擊任一步「大運」立即切換至該大運並疊入上方八字盤與紫微大限；點擊任一「流年」即時同步更新目標年份與全系統排盤。
            </p>
          </div>
        </div>

        {/* Decade Strip */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {bazi.decadeFortunes.map((decade) => {
            const isExpanded = decade.index === expandedDecadeIndex;
            const isCurrentTarget =
              targetYear >= decade.startYear && targetYear <= decade.endYear;

            return (
              <button
                key={decade.index}
                type="button"
                onClick={() => handleDecadeClick(decade)}
                className={`flex flex-col items-center rounded-md border px-2 py-2.5 text-center transition-colors ${
                  isCurrentTarget
                    ? 'border-[#152924] bg-[#152924] text-[#FAF8F3]'
                    : isExpanded
                    ? 'border-[#9A7B3E] bg-[#FAF4E8] text-[#152924]'
                    : 'border-[#E5DEC9] bg-[#FAF8F3] text-[#283631] hover:border-[#2B5B4C]/60'
                }`}
              >
                <span
                  className={`font-mono text-[10.5px] tabular-nums ${
                    isCurrentTarget ? 'text-[#C9A861]' : 'text-[#7A8782]'
                  }`}
                >
                  {decade.startAge}歲 · {decade.startYear}
                </span>
                <span className="mt-1 font-serif text-base font-bold">
                  {decade.ganZhi}
                </span>
                <span
                  className={`mt-0.5 text-[11px] ${
                    isCurrentTarget ? 'text-[#DCE5E1]' : 'text-[#2B5B4C]'
                  }`}
                >
                  {decade.tenStar}
                </span>
                <span className="mt-1">
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 opacity-80" />
                  ) : (
                    <ChevronRight className="h-3 w-3 opacity-45" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Expanded 10 Yearly Fortunes */}
        {activeDecadeObj && (
          <div className="mt-4 border-t border-[#ECE6DA] pt-4">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-[#152924] tabular-nums">
                {activeDecadeObj.ganZhi}大運（{activeDecadeObj.startAge}–
                {activeDecadeObj.endAge}歲，{activeDecadeObj.startYear}–
                {activeDecadeObj.endYear}年 · {activeDecadeObj.sound}）對應流年：
              </span>
              <span className="text-[#73807B]">點擊流年切換查詢年份</span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-10">
              {activeDecadeObj.yearlyFortunes.map((yf) => {
                const isSelectedYear = yf.year === targetYear;
                return (
                  <button
                    key={yf.year}
                    type="button"
                    onClick={() => onSelectTargetYear(yf.year, 'yearly')}
                    className={`flex flex-col items-center rounded border px-2 py-2 text-center transition-colors ${
                      isSelectedYear
                        ? 'border-[#A63A2B] bg-[#A63A2B] text-white'
                        : 'border-[#E5DEC9] bg-white text-[#1A2421] hover:border-[#2B5B4C] hover:bg-[#F3F8F5]'
                    }`}
                  >
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        isSelectedYear ? 'text-[#FCE7E4]' : 'text-[#6B7974]'
                      }`}
                    >
                      {yf.year}
                    </span>
                    <span className="mt-0.5 font-serif text-sm font-bold">
                      {yf.ganZhi}
                    </span>
                    <span
                      className={`text-[10.5px] ${
                        isSelectedYear ? 'text-white/90' : 'text-[#2B5B4C]'
                      }`}
                    >
                      {yf.tenStar}
                    </span>
                    <span
                      className={`font-mono text-[10px] tabular-nums ${
                        isSelectedYear ? 'text-white/75' : 'text-[#8C9893]'
                      }`}
                    >
                      {yf.age}歲
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
