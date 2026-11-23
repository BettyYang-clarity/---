import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Loader2, Printer } from 'lucide-react';
import {
  ActiveTab,
  AICrossSystemAnalysis,
  AIStage1Summary,
  BaziChartResult,
  ClientProfile,
  FiveElement,
  HoroscopeScope,
  OperationMode,
  PdfExportConfig,
  TarotChartResult,
  ZiweiChartResult,
} from '../types/holistic';
import { SCOPE_LABELS } from '../engines/holisticPayload';
import { TarotTotemSvg } from './TarotTotemSvg';
import { TenYearFortuneChart } from './TenYearFortuneChart';
import { UpcomingAlertsCard } from './UpcomingAlertsCard';
import { PdfExportModal } from './PdfExportModal';

interface OverviewTabProps {
  client: ClientProfile;
  ziwei: ZiweiChartResult;
  bazi: BaziChartResult;
  tarot: TarotChartResult;
  targetDate: string;
  activeScope: HoroscopeScope;
  operationMode: OperationMode;
  aiSummary: AIStage1Summary | null;
  crossSystemAnalysis: AICrossSystemAnalysis | null;
  onNavigateTab: (tab: ActiveTab) => void;
  onSelectTargetYear: (year: number, scope?: HoroscopeScope) => void;
  onSelectTargetDate: (dateStr: string, scope?: HoroscopeScope) => void;
  onSaveNotes: (notes: string) => void;
  onExportPdf: (config: PdfExportConfig) => Promise<void>;
  isExportingPdf: boolean;
  pdfFeedback: string | null;
}

const ELEMENT_COLORS: Record<FiveElement, string> = {
  木: 'text-[#2B5B4C]',
  火: 'text-[#A63A2B]',
  土: 'text-[#8C6830]',
  金: 'text-[#6B6E75]',
  水: 'text-[#244E70]',
};

export const OverviewTab: React.FC<OverviewTabProps> = ({
  client,
  ziwei,
  bazi,
  tarot,
  targetDate,
  activeScope,
  operationMode,
  aiSummary,
  crossSystemAnalysis,
  onNavigateTab,
  onSelectTargetYear,
  onSelectTargetDate,
  onSaveNotes,
  onExportPdf,
  isExportingPdf,
  pdfFeedback,
}) => {
  const isClientMode = operationMode === 'client';
  const [draftNotes, setDraftNotes] = useState(client.notes);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  useEffect(() => {
    setDraftNotes(client.notes);
    setSavedIndicator(false);
  }, [client.id, client.notes]);

  const mingPalace = ziwei.palaces[ziwei.mingPalaceIndex];
  const bodyPalace = ziwei.palaces[ziwei.bodyPalaceIndex];
  const decadalPalace = ziwei.palaces[ziwei.activeDecadalInfo.index];
  const yearlyPalace = ziwei.palaces[ziwei.activeYearlyInfo.index];
  const monthlyPalace = ziwei.palaces[ziwei.activeMonthlyInfo.index];
  const dailyPalace = ziwei.palaces[ziwei.activeDailyInfo.index];
  const originMutagens = ziwei.mutagenTable[0];
  const activeMutagenRow =
    ziwei.mutagenTable.find((m) => m.scope === activeScope) ?? originMutagens;

  const activeScopeSummary = (() => {
    switch (activeScope) {
      case 'decadal':
        return {
          title: `大限・大運焦點（${ziwei.activeDecadalInfo.range[0]}–${ziwei.activeDecadalInfo.range[1]}歲）`,
          ziweiText: `大限命宮落本命「${decadalPalace.name}」（${ziwei.activeDecadalInfo.ganZhi}），主星：${decadalPalace.majorStars.map((s) => s.name).join('、') || '空宮借對宮'}`,
          baziText: bazi.targetFlow.decadePillar
            ? `大運「${bazi.targetFlow.decadePillar.ganZhi}」（${bazi.targetFlow.decadePillar.tenStar} · ${bazi.targetFlow.decadePillar.terrain}），神煞：${bazi.targetFlow.decadePillar.shenSha.map((s) => s.name).join('、') || '無'}`
            : '目前處於起運前童限階段',
          tarotText: `核心家族：${tarot.constellation.name}（人格 ${tarot.personalityCard.name} → 靈魂 ${tarot.soulCard.name}）`,
        };
      case 'yearly':
        return {
          title: `流年運勢焦點（${targetDate.slice(0, 4)} 年 · ${ziwei.activeYearlyInfo.ganZhi}）`,
          ziweiText: `流年命宮落本命「${yearlyPalace.name}」（${ziwei.activeYearlyInfo.ganZhi}），主星：${yearlyPalace.majorStars.map((s) => s.name).join('、') || '空宮借對宮'}`,
          baziText: `流年「${bazi.targetFlow.yearPillar.ganZhi}」（${bazi.targetFlow.yearPillar.tenStar} · ${bazi.targetFlow.yearPillar.terrain}），神煞：${bazi.targetFlow.yearPillar.shenSha.map((s) => s.name).join('、') || '無'}`,
          tarotText: `個人流年牌：${tarot.currentYearCard.card.displayNumber} ${tarot.currentYearCard.card.name}${tarot.currentYearCard.rootCard ? `（輔助根數：${tarot.currentYearCard.rootCard.name}）` : ''}`,
        };
      case 'monthly':
        return {
          title: `流月節律焦點（${targetDate.slice(0, 7)} · ${ziwei.activeMonthlyInfo.ganZhi}）`,
          ziweiText: `流月命宮落本命「${monthlyPalace.name}」（${ziwei.activeMonthlyInfo.ganZhi}），主星：${monthlyPalace.majorStars.map((s) => s.name).join('、') || '空宮借對宮'}`,
          baziText: `流月「${bazi.targetFlow.monthPillar.ganZhi}」（${bazi.targetFlow.monthPillar.tenStar} · ${bazi.targetFlow.monthPillar.terrain}），神煞：${bazi.targetFlow.monthPillar.shenSha.map((s) => s.name).join('、') || '無'}`,
          tarotText: `年度主頻：${tarot.currentYearCard.card.name}（下次切換：${tarot.nextSwitchDate}）`,
        };
      case 'daily':
        return {
          title: `流日氣場焦點（${targetDate} · ${ziwei.activeDailyInfo.ganZhi}）`,
          ziweiText: `流日命宮落本命「${dailyPalace.name}」（${ziwei.activeDailyInfo.ganZhi}），主星：${dailyPalace.majorStars.map((s) => s.name).join('、') || '空宮借對宮'}`,
          baziText: `流日「${bazi.targetFlow.dayPillar.ganZhi}」（${bazi.targetFlow.dayPillar.tenStar} · ${bazi.targetFlow.dayPillar.terrain}），神煞：${bazi.targetFlow.dayPillar.shenSha.map((s) => s.name).join('、') || '無'}`,
          tarotText: `當日對應流年週期牌：${tarot.currentYearCard.card.displayNumber} ${tarot.currentYearCard.card.name}`,
        };
      case 'origin':
      default:
        return {
          title: '本命原局焦點（先天命盤架構）',
          ziweiText: `本命命宮（${mingPalace.heavenlyStem}${mingPalace.earthlyBranch}）主星：${mingPalace.majorStars.map((s) => s.name).join('、') || '空宮借對宮'}；身宮落「${bodyPalace.name}」`,
          baziText: `日主「${bazi.dayMaster.stem}」（${bazi.dayMaster.yinYang}${bazi.dayMaster.element}），日柱神煞：${bazi.pillars[1].shenSha.map((s) => s.name).join('、') || '無'}`,
          tarotText: `人格牌「${tarot.personalityCard.name}」・靈魂牌「${tarot.soulCard.name}」・陰影牌：${tarot.shadowCards.map((c) => c.name).join('、') || '無（家族完整）'}`,
        };
    }
  })();

  const handleNotesBlurOrSave = () => {
    if (draftNotes !== client.notes) {
      onSaveNotes(draftNotes);
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 1800);
    }
  };

  return (
    <div className="space-y-6">
      {/* Client Identity Strip */}
      <section className="rounded-lg border border-[#DDD6C7] bg-white p-5">
        <div className="flex flex-col justify-between gap-4 border-b border-[#ECE6DA] pb-4 md:flex-row md:items-end">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-serif text-2xl font-bold text-[#152924]">
                {isClientMode ? `${client.name}・專屬運勢指引` : client.name}
              </h1>
              {!isClientMode && (
                <span className="text-sm text-[#54635E]">
                  {client.gender}命 · {ziwei.zodiac} · {ziwei.fiveElementsClass}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64736D] tabular-nums">
              <span>
                國曆 {client.birthDate} {client.birthTime}
                {!isClientMode ? `（${ziwei.time}）` : ''}
              </span>
              {!isClientMode && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>農曆 {ziwei.lunarDate}</span>
                </>
              )}
              {!isClientMode && client.tags.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#8E6F36]">{client.tags.join(' / ')}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="text-left md:text-right">
              <div className="text-xs text-[#64736D]">
                {isClientMode ? '目前檢視時間' : '當前推演座標'}
              </div>
              <div className="mt-0.5 font-mono text-sm font-medium text-[#152924] tabular-nums">
                {isClientMode
                  ? targetDate
                  : `${targetDate} · ${SCOPE_LABELS[activeScope]}`}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(true)}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#152924] bg-[#152924] px-3 py-1.5 text-xs font-medium text-[#FAF8F3] transition-colors hover:bg-[#23433B] disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {isExportingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Printer className="h-3.5 w-3.5" />
                )}
                {isExportingPdf
                  ? '正在生成 PDF 報告…'
                  : isClientMode
                    ? '下載運勢報告 PDF'
                    : '匯出 PDF 報告'}
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('ai')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#2B5B4C] transition-colors hover:text-[#152924] whitespace-nowrap shrink-0"
              >
                {isClientMode ? '檢視運勢報告與 AI 提問指令' : '檢視全版 AI 深度解盤'}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {pdfFeedback && (
              <div className="text-[11px] text-[#1E6B4B]">{pdfFeedback}</div>
            )}
          </div>
        </div>

        {isClientMode ? (
          /* Client Self-Service Mode: Plain-language Energy & AI Guidance Snapshot (Zero Raw Engine Jargon) */
          <div className="mt-4 space-y-4">
            <div className="rounded-md border border-[#E5DEC9] bg-[#FAF8F3] px-4 py-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-serif text-sm font-semibold text-[#152924]">
                  {aiSummary
                    ? aiSummary.currentFortuneAndPsyche.headline
                    : `${targetDate.slice(0, 4)} 年度能量與人生節律摘要`}
                </span>
                <span className="text-[11px] text-[#8C6830]">
                  年度成長主題：{tarot.currentYearCard.card.name}（
                  {tarot.currentYearCard.card.keywords.slice(0, 3).join('・')}）
                </span>
              </div>
              <p className="mt-2 text-xs leading-[1.8] text-[#354540]">
                {aiSummary
                  ? aiSummary.currentFortuneAndPsyche.summary
                  : tarot.currentYearCard.card.essence}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#EAE3D5] pt-2.5 text-xs">
                <span className="text-[#54635E]">
                  內在天賦特質：{tarot.personalityCard.keywords.join(' · ')}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('ai')}
                  className="inline-flex items-center gap-1 font-medium text-[#2B5B4C] transition-colors hover:text-[#152924]"
                >
                  查看完整運勢報告與專屬 AI 提問指令
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {aiSummary?.currentFortuneAndPsyche.indicators?.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {aiSummary.currentFortuneAndPsyche.indicators.map((ind) => (
                  <div
                    key={ind.domain}
                    className="rounded-md border border-[#ECE6DA] bg-[#FAF8F3]/70 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-serif text-sm font-semibold text-[#152924]">
                        {ind.domain}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          ind.light === 'green'
                            ? 'text-[#1E6B4B]'
                            : ind.light === 'red'
                              ? 'text-[#B91C1C]'
                              : 'text-[#925808]'
                        }`}
                      >
                        {ind.statusLabel}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#45534E]">
                      {ind.summary}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="border-t border-[#EFEAE0] pt-3">
                  <div className="text-[11px] text-[#73807B]">你的天賦優勢</div>
                  <div className="mt-1 font-serif text-sm font-semibold text-[#152924]">
                    {tarot.personalityCard.name}原型
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#4C5A55]">
                    {tarot.personalityCard.lightSide}
                  </p>
                </div>
                <div className="border-t border-[#EFEAE0] pt-3">
                  <div className="text-[11px] text-[#73807B]">今年核心課題</div>
                  <div className="mt-1 font-serif text-sm font-semibold text-[#8C6830]">
                    {tarot.currentYearCard.card.name}週期
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#4C5A55]">
                    {tarot.currentYearCard.card.growthLesson}
                  </p>
                </div>
                <div className="border-t border-[#EFEAE0] pt-3">
                  <div className="text-[11px] text-[#73807B]">關鍵盲點與校準</div>
                  <div className="mt-1 font-serif text-sm font-semibold text-[#2B5B4C]">
                    決策與節奏校準
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#4C5A55]">
                    {tarot.soulCard.growthLesson}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Professional Consultant Mode: Active-Scope Four Mutagens Banner + 4 Technical Anchor Metrics */
          <>
            {/* Live Dynamic Active-Scope Focus Banner */}
            <div className="mt-4 rounded-md border border-[#E5DEC9] bg-[#FAF8F3] px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-serif text-sm font-semibold text-[#152924]">
                  {activeScopeSummary.title}
                </span>
                <span className="text-[11px] text-[#8C6830]">
                  四化飛星：祿 {activeMutagenRow.lu} · 權 {activeMutagenRow.quan} · 科{' '}
                  {activeMutagenRow.ke} · 忌 {activeMutagenRow.ji}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 text-xs leading-relaxed text-[#3F4D48] md:grid-cols-3">
                <div>
                  <span className="font-semibold text-[#152924]">紫微：</span>
                  {activeScopeSummary.ziweiText}
                </div>
                <div>
                  <span className="font-semibold text-[#2B5B4C]">八字：</span>
                  {activeScopeSummary.baziText}
                </div>
                <div>
                  <span className="font-semibold text-[#8C6830]">塔羅：</span>
                  {activeScopeSummary.tarotText}
                </div>
              </div>
            </div>

            {/* 4 Key Anchor Metrics — Clean Hairline Grid */}
            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="border-r border-[#EFEAE0] pr-3 last:border-r-0">
                <div className="text-[11px] text-[#73807B]">紫微命宮主星</div>
                <div className="mt-1 font-serif text-[15px] font-semibold text-[#152924]">
                  {mingPalace.majorStars.length > 0
                    ? mingPalace.majorStars.map((s) => s.name).join('・')
                    : '命無正曜（借對宮）'}
                </div>
                <div className="mt-0.5 text-xs text-[#64736D]">
                  {mingPalace.heavenlyStem}
                  {mingPalace.earthlyBranch}宮 · 身宮落{bodyPalace.name}
                </div>
              </div>

              <div className="border-r border-[#EFEAE0] pr-3 lg:border-r">
                <div className="text-[11px] text-[#73807B]">子平八字日主</div>
                <div className="mt-1 font-serif text-[15px] font-semibold text-[#152924]">
                  <span className={ELEMENT_COLORS[bazi.dayMaster.element]}>
                    {bazi.dayMaster.stem}（{bazi.dayMaster.yinYang}
                    {bazi.dayMaster.element}）
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-[#64736D] tabular-nums">
                  日空亡：{bazi.dayKongWang} ·{' '}
                  {bazi.targetFlow.activeDecade
                    ? `大運 ${bazi.targetFlow.activeDecade.ganZhi}`
                    : '童限期'}
                </div>
              </div>

              <div className="border-r border-[#EFEAE0] pr-3">
                <div className="text-[11px] text-[#73807B]">塔羅所屬家族</div>
                <div className="mt-1 font-serif text-[15px] font-semibold text-[#8C6830]">
                  {tarot.constellation.id} 號{tarot.constellation.name}
                </div>
                <div className="mt-0.5 text-xs text-[#64736D]">
                  人格 {tarot.personalityCard.name} · 靈魂 {tarot.soulCard.name}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-[#73807B]">個人流年塔羅</div>
                <div className="mt-1 font-serif text-[15px] font-semibold text-[#152924]">
                  {tarot.currentYearCard.card.displayNumber}{' '}
                  {tarot.currentYearCard.card.name}
                  {tarot.currentYearCard.rootCard
                    ? ` → ${tarot.currentYearCard.rootCard.name}`
                    : ''}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-[#64736D] tabular-nums">
                  下次切換：{tarot.nextSwitchDate}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* D3.js 10-Year Holistic Fortune Trend & Key Turning Points */}
      <TenYearFortuneChart
        client={client}
        targetDate={targetDate}
        onSelectTargetYear={onSelectTargetYear}
      />

      {/* Upcoming 3-Month Solar Terms & Fortune Volatility Reminder Card */}
      <UpcomingAlertsCard
        client={client}
        targetDate={targetDate}
        onSelectTargetDate={onSelectTargetDate}
      />

      {/* Three-System Raw Data Synthesis & Consultant Notes (Professional Consultant Mode Only) */}
      {!isClientMode && (
        <>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* 1. Tarot Archetype Summary */}
        <section className="rounded-lg border border-[#DDD6C7] bg-white p-5">
          <div className="flex items-center justify-between border-b border-[#ECE6DA] pb-3">
            <div>
              <h2 className="font-serif text-base font-semibold text-[#152924]">
                生日塔羅密碼・西方原型
              </h2>
              <p className="mt-0.5 text-xs text-[#6B7974]">
                {tarot.constellation.id} 號{tarot.constellation.name} —{' '}
                {tarot.constellation.title}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('tarot')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#2B5B4C] transition-colors hover:text-[#152924] whitespace-nowrap shrink-0"
            >
              展開全息牌陣
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: '人格牌', card: tarot.personalityCard },
              {
                label: tarot.isSamePersonalitySoul ? '靈魂牌（同人格）' : '靈魂牌',
                card: tarot.soulCard,
              },
              {
                label: '陰影／導師',
                card: tarot.shadowCards[0] ?? null,
                extraCount:
                  tarot.shadowCards.length > 1
                    ? tarot.shadowCards
                        .slice(1)
                        .map((c) => c.name)
                        .join('、')
                    : undefined,
                emptyText: tarot.isSpecialCase19 ? '19-10-1 三星無陰影' : '家族完整無缺',
              },
              {
                label: `${tarot.currentYearCard.cycleYear} 流年牌`,
                card: tarot.currentYearCard.card,
              },
            ].map((slot, i) => (
              <div
                key={i}
                className="flex flex-col items-center rounded border border-[#EBE5D8] bg-[#FAF8F3] px-2 py-3 text-center"
              >
                <span className="text-[11px] text-[#73807B]">{slot.label}</span>
                {slot.card ? (
                  <>
                    <TarotTotemSvg
                      arcanaNumber={slot.card.number}
                      className="my-1.5 h-12 w-12 text-[#8E6F36]"
                    />
                    <div className="font-serif text-sm font-semibold text-[#152924]">
                      {slot.card.name}
                    </div>
                    <div className="font-mono text-[10.5px] text-[#73807B] tabular-nums">
                      No.{slot.card.displayNumber}
                    </div>
                    {slot.extraCount && (
                      <div className="mt-0.5 text-[10.5px] text-[#A63A2B]">
                        另含：{slot.extraCount}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="my-auto py-4 text-xs text-[#6B7974]">
                    {slot.emptyText}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 2. Bazi Four Pillars & Active Flow Summary */}
        <section className="rounded-lg border border-[#DDD6C7] bg-white p-5">
          <div className="flex items-center justify-between border-b border-[#ECE6DA] pb-3">
            <div>
              <h2 className="font-serif text-base font-semibold text-[#152924]">
                主流子平八字・四柱與運勢
              </h2>
              <p className="mt-0.5 text-xs text-[#6B7974] tabular-nums">
                {bazi.startAgeDescription}（{bazi.isForward ? '順行' : '逆行'}）
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('bazi')}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#2B5B4C] transition-colors hover:text-[#152924] whitespace-nowrap shrink-0"
            >
              檢視大運流年
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-4 divide-x divide-[#ECE6DA] rounded border border-[#EBE5D8] bg-[#FAF8F3] py-3 text-center">
            {bazi.pillars.map((p) => (
              <div key={p.label} className="px-2">
                <div className="text-[11px] text-[#73807B]">{p.label}</div>
                <div
                  className={`mt-0.5 text-[11px] font-medium ${
                    p.isDayMaster ? 'text-[#A63A2B]' : 'text-[#52605B]'
                  }`}
                >
                  {p.tenStar}
                </div>
                <div
                  className={`mt-1 font-serif text-xl font-bold ${ELEMENT_COLORS[p.stemElement]}`}
                >
                  {p.stem}
                </div>
                <div
                  className={`font-serif text-xl font-bold ${ELEMENT_COLORS[p.branchElement]}`}
                >
                  {p.branch}
                </div>
                <div className="mt-1 text-[10.5px] text-[#73807B]">{p.sound}</div>
              </div>
            ))}
          </div>

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#4C5A55]">
            <div className="tabular-nums">
              <span className="text-[#73807B]">當前流運：</span>
              <span className="font-medium text-[#152924]">
                {bazi.targetFlow.activeDecade
                  ? `大運 ${bazi.targetFlow.activeDecade.ganZhi}(${bazi.targetFlow.activeDecade.tenStar})`
                  : '童限'}
              </span>
              <span className="mx-1.5 text-[#C5BDAF]">/</span>
              <span>
                流年 {bazi.targetFlow.yearGanZhi}({bazi.targetFlow.yearTenStar})
              </span>
              <span className="mx-1.5 text-[#C5BDAF]">/</span>
              <span>
                流月 {bazi.targetFlow.monthGanZhi}({bazi.targetFlow.monthTenStar})
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums">
              {(['木', '火', '土', '金', '水'] as FiveElement[]).map((el) => (
                <span key={el} className={ELEMENT_COLORS[el]}>
                  {el}
                  {bazi.elementCounts[el]}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* 3. Ziwei Key Palace & Horoscope Summary */}
      <section className="rounded-lg border border-[#DDD6C7] bg-white p-5">
        <div className="flex items-center justify-between border-b border-[#ECE6DA] pb-3">
          <div>
            <h2 className="font-serif text-base font-semibold text-[#152924]">
              紫微斗數（勸學齋規則）・命身與當前運限
            </h2>
            <p className="mt-0.5 text-xs text-[#6B7974]">
              庚干四化：太陽祿・武曲權・太陰科・天同忌 · 命主 {ziwei.soulLord} · 身主{' '}
              {ziwei.bodyLord}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('ziwei')}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#2B5B4C] transition-colors hover:text-[#152924] whitespace-nowrap shrink-0"
          >
            開啟十二宮命盤
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div>
            <div className="text-xs font-medium text-[#73807B]">
              本命命宮（{mingPalace.heavenlyStem}
              {mingPalace.earthlyBranch}）與身宮
            </div>
            <div className="mt-1.5 space-y-1 text-sm text-[#1A2421]">
              <div>
                <span className="text-xs text-[#73807B]">命宮主星：</span>
                <span className="font-medium">
                  {mingPalace.majorStars.length > 0
                    ? mingPalace.majorStars
                        .map(
                          (s) =>
                            `${s.name}${s.brightness ? `(${s.brightness})` : ''}${
                              s.mutagen ? `[${s.mutagen}]` : ''
                            }`
                        )
                        .join('、')
                    : '空宮（須借對宮遷移）'}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#73807B]">身宮位置：</span>
                <span>
                  {bodyPalace.name}（{bodyPalace.heavenlyStem}
                  {bodyPalace.earthlyBranch}）—{' '}
                  {bodyPalace.majorStars.map((s) => s.name).join('、') || '空宮'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-[#73807B]">
              大限與流年疊宮座標
            </div>
            <div className="mt-1.5 space-y-1 text-sm text-[#1A2421] tabular-nums">
              <div>
                <span className="text-xs text-[#73807B]">大限命宮：</span>
                <span>
                  本命{decadalPalace.name}（{ziwei.activeDecadalInfo.ganZhi}，
                  {ziwei.activeDecadalInfo.range[0]}–
                  {ziwei.activeDecadalInfo.range[1]}歲）
                </span>
              </div>
              <div>
                <span className="text-xs text-[#73807B]">流年命宮：</span>
                <span>
                  本命{yearlyPalace.name}（{ziwei.activeYearlyInfo.ganZhi}）· 流月落
                  {ziwei.palaces[ziwei.activeMonthlyInfo.index].name}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-[#73807B]">
              四化飛星（本命 vs {activeMutagenRow.label}）
            </div>
            <div className="mt-1.5 space-y-1.5 text-xs">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                <span className="font-medium text-[#52605B]">
                  本命({originMutagens.ganZhi})
                </span>
                <span className="text-[#1E6B4B]">祿:{originMutagens.lu}</span>
                <span className="text-[#3B4D8F]">權:{originMutagens.quan}</span>
                <span className="text-[#0F6D7A]">科:{originMutagens.ke}</span>
                <span className="text-[#B91C1C]">忌:{originMutagens.ji}</span>
              </div>
              {activeScope !== 'origin' && (
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                  <span className="font-medium text-[#8C6830]">
                    {activeMutagenRow.label}({activeMutagenRow.ganZhi})
                  </span>
                  <span className="text-[#1E6B4B]">祿:{activeMutagenRow.lu}</span>
                  <span className="text-[#3B4D8F]">權:{activeMutagenRow.quan}</span>
                  <span className="text-[#0F6D7A]">科:{activeMutagenRow.ke}</span>
                  <span className="text-[#B91C1C]">忌:{activeMutagenRow.ji}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Consultant Notes Quick Editor */}
      <section className="rounded-lg border border-[#DDD6C7] bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-sm font-semibold text-[#152924]">
            諮詢師備忘筆記
          </h2>
          <div className="flex items-center gap-2">
            {savedIndicator && (
              <span className="inline-flex items-center gap-1 text-xs text-[#1E6B4B]">
                <Check className="h-3.5 w-3.5" />
                已儲存至命主資料庫
              </span>
            )}
            <button
              type="button"
              onClick={handleNotesBlurOrSave}
              disabled={draftNotes === client.notes}
              className="rounded border border-[#D4CCB9] bg-[#FAF8F3] px-2.5 py-1 text-xs font-medium text-[#152924] transition-colors hover:bg-[#EFEAE0] disabled:opacity-40"
            >
              儲存筆記
            </button>
          </div>
        </div>
        <textarea
          rows={3}
          value={draftNotes}
          onChange={(e) => setDraftNotes(e.target.value)}
          onBlur={handleNotesBlurOrSave}
          placeholder="點擊此處紀錄本次解盤觀察、命主反饋或追蹤事項…"
          className="mt-2.5 w-full rounded-md border border-[#E5DEC9] bg-[#FAF8F3] px-3 py-2 text-sm leading-relaxed text-[#25332E] focus:border-[#2B5B4C] focus:bg-white focus:outline-none"
        />
      </section>
        </>
      )}

      {/* PDF Report Structure Preview & Chapter Customization Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        client={client}
        ziwei={ziwei}
        bazi={bazi}
        tarot={tarot}
        targetDate={targetDate}
        activeScope={activeScope}
        operationMode={operationMode}
        aiSummary={aiSummary}
        crossSystemAnalysis={crossSystemAnalysis}
        isExporting={isExportingPdf}
        onConfirmExport={async (config) => {
          await onExportPdf(config);
          setIsPdfModalOpen(false);
        }}
      />
    </div>
  );
};
