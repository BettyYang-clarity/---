import React, { useMemo } from 'react';
import {
  ArrowRight,
  Compass,
  ShieldAlert,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  BaziChartResult,
  ClientProfile,
  HoroscopeScope,
  TarotChartResult,
  ZiweiChartResult,
} from '../types/holistic';
import {
  calculateLifeGuidance,
  TriggerRole,
} from '../engines/lifeGuidanceEngine';

interface LifeGuidanceMapProps {
  client: ClientProfile;
  ziwei: ZiweiChartResult;
  bazi: BaziChartResult;
  tarot: TarotChartResult;
  targetDate: string;
  onSelectTargetYear: (year: number, scope?: HoroscopeScope) => void;
}

const ROLE_TEXT_COLOR: Record<TriggerRole, string> = {
  tailwind: 'text-[#1E6B4B]',
  buffer: 'text-[#0F6D7A]',
  arena: 'text-[#8C6830]',
  stoploss: 'text-[#A63A2B]',
};

export const LifeGuidanceMap: React.FC<LifeGuidanceMapProps> = ({
  client,
  ziwei,
  bazi,
  tarot,
  targetDate,
  onSelectTargetYear,
}) => {
  const guidance = useMemo(
    () => calculateLifeGuidance(client, ziwei, bazi, tarot, targetDate),
    [client, ziwei, bazi, tarot, targetDate]
  );

  const { stagePosition, tailwinds, arenas, stoplosses, lifeCircles } =
    guidance;

  const progressSegments = Array.from({ length: 10 }, (_, idx) => idx + 1);

  return (
    <section className="rounded-lg border border-[#DDD6C7] bg-white">
      {/* Header */}
      <div className="flex flex-col justify-between gap-2 border-b border-[#ECE6DA] px-6 py-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#8C6830]">
            <Compass className="h-3.5 w-3.5" />
            <span>實證結構地圖・十年階段定位 × 四化落點 × 八字沖合</span>
          </div>
          <h2 className="mt-0.5 font-serif text-lg font-bold text-[#152924]">
            {stagePosition.targetYear} 年人生座標與行動取捨指南
          </h2>
        </div>

        <div className="text-xs text-[#64736D] tabular-nums">
          <span>{stagePosition.actualAge} 歲</span>
          <span className="mx-1.5 text-[#C5BDAF]" aria-hidden="true">
            ·
          </span>
          <span className="font-medium text-[#152924]">
            {stagePosition.phaseLabel}
          </span>
          {stagePosition.nextShiftYear && (
            <>
              <span className="mx-1.5 text-[#C5BDAF]" aria-hidden="true">
                ·
              </span>
              <span>下次十年換軌 {stagePosition.nextShiftYear} 年</span>
            </>
          )}
        </div>
      </div>

      {/* PART 1: Current 10-Year Life Stage Coordinate Axis */}
      <div className="border-b border-[#ECE6DA] px-6 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-[#152924]">
              一、你現在走到哪一段？（當前十年階段定位軸）
            </div>
            <h3 className="mt-1 font-serif text-base font-bold text-[#152924]">
              {stagePosition.stageHeadline}
            </h3>
          </div>
          <div className="font-mono text-[11px] text-[#6B7974] tabular-nums">
            {stagePosition.technicalProof}
          </div>
        </div>

        {/* 3-Chapter Timeline Rail: Prev -> Current (10-year tick bar) -> Next */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
          {/* Previous Decade */}
          <div className="flex flex-col justify-between border-t border-[#ECE6DA] pt-3 lg:col-span-3 lg:border-t-0 lg:border-r lg:pr-4 lg:pt-0">
            <div>
              <div className="text-[11px] text-[#7A8782]">
                {stagePosition.prevStage ? '上一段十年' : '起點'}
              </div>
              {stagePosition.prevStage ? (
                <>
                  <div className="mt-1 font-mono text-xs font-semibold text-[#52605B] tabular-nums">
                    {stagePosition.prevStage.ageRange}（
                    {stagePosition.prevStage.yearRange}）
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#6B7974]">
                    {stagePosition.prevStage.plainTheme}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs leading-relaxed text-[#6B7974]">
                  目前為人生第一段主要十年週期。
                </p>
              )}
            </div>
            {stagePosition.prevStage?.startYear && (
              <button
                type="button"
                onClick={() =>
                  onSelectTargetYear(
                    stagePosition.prevStage!.startYear!,
                    'decadal'
                  )
                }
                className="mt-2 self-start text-[11px] font-medium text-[#5D6B66] underline-offset-4 hover:text-[#152924] hover:underline whitespace-nowrap"
              >
                回看 {stagePosition.prevStage.startYear} 年
              </button>
            )}
          </div>

          {/* Current Decade Active Coordinate Track */}
          <div className="bg-[#FAF8F3] px-4 py-3.5 rounded-md border border-[#E5DEC9] lg:col-span-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="font-mono text-xs font-bold text-[#152924] tabular-nums">
                目前區間：{stagePosition.currentStage.ageRange}（
                {stagePosition.currentStage.yearRange}）
              </div>
              <div className="font-mono text-xs font-semibold text-[#8C6830] tabular-nums">
                {stagePosition.phaseKind === 'childhood'
                  ? `距離起運尚有 ${stagePosition.yearsRemaining} 年`
                  : `第 ${stagePosition.yearInDecade} / 10 年`}
              </div>
            </div>

            {/* 10-Step Deterministic Year Ticks */}
            {stagePosition.phaseKind !== 'childhood' && (
              <div className="mt-3">
                <div
                  className="grid grid-cols-10 gap-1"
                  role="img"
                  aria-label={`目前位於此十年階段的第 ${stagePosition.yearInDecade} 年，共 10 年`}
                >
                  {progressSegments.map((step) => {
                    const isCurrent = step === stagePosition.yearInDecade;
                    const isPast = step < stagePosition.yearInDecade;
                    const stepYear =
                      (stagePosition.currentStage.startYear ??
                        stagePosition.targetYear) +
                      step -
                      1;
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={() => onSelectTargetYear(stepYear, 'yearly')}
                        title={`切換至 ${stepYear} 年（此階段第 ${step} 年）`}
                        className="group flex flex-col items-center gap-1 focus:outline-none"
                      >
                        <span
                          className={`block h-2.5 w-full rounded-[2px] transition-colors ${
                            isCurrent
                              ? 'bg-[#8C6830]'
                              : isPast
                                ? 'bg-[#152924]/75 group-hover:bg-[#152924]'
                                : 'bg-[#E2DBCC] group-hover:bg-[#CBBFA8]'
                          }`}
                        />
                        <span
                          className={`font-mono text-[10px] tabular-nums ${
                            isCurrent
                              ? 'font-bold text-[#8C6830]'
                              : 'text-[#7A8782]'
                          }`}
                        >
                          {String(stepYear).slice(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#6B7974]">
                  <span>開局適應（第 1–2 年）</span>
                  <span>中段深耕</span>
                  <span>換軌交接（第 9–10 年）</span>
                </div>
              </div>
            )}

            <p className="mt-3 text-xs leading-[1.75] text-[#2F3E39]">
              {stagePosition.stageGuidance}
            </p>
          </div>

          {/* Next Decade */}
          <div className="flex flex-col justify-between border-t border-[#ECE6DA] pt-3 lg:col-span-3 lg:border-t-0 lg:border-l lg:pl-4 lg:pt-0">
            <div>
              <div className="text-[11px] text-[#7A8782]">下一段十年預告</div>
              {stagePosition.nextStage ? (
                <>
                  <div className="mt-1 font-mono text-xs font-semibold text-[#152924] tabular-nums">
                    {stagePosition.nextStage.ageRange}（
                    {stagePosition.nextStage.yearRange}）
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#4C5A55]">
                    {stagePosition.nextStage.plainTheme}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs leading-relaxed text-[#6B7974]">
                  已達資料尾端區間。
                </p>
              )}
            </div>
            {stagePosition.nextShiftYear && (
              <button
                type="button"
                onClick={() =>
                  onSelectTargetYear(stagePosition.nextShiftYear!, 'decadal')
                }
                className="mt-2 inline-flex items-center gap-1 self-start text-[11px] font-medium text-[#2B5B4C] underline-offset-4 hover:text-[#152924] hover:underline whitespace-nowrap"
              >
                預覽 {stagePosition.nextShiftYear} 年換軌
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Confusion Reframe — Direct Grounded Reality Check */}
        <div className="mt-4 border-t border-[#F0EBE0] pt-3.5 text-xs leading-[1.8] text-[#2F3E39]">
          <span className="font-semibold text-[#8C6830]">
            若你最近感到迷惘：
          </span>
          {stagePosition.confusionReframe}
        </div>
      </div>

      {/* PART 2: This Year's Energy Allocation (3 Real Action Zones — Zero Fake Scores) */}
      <div className="border-b border-[#ECE6DA] px-6 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-[#152924]">
              二、{stagePosition.targetYear} 年精力配置圖（哪裡有風、哪裡扛責、哪裡先止損）
            </div>
            <p className="mt-0.5 text-xs text-[#64736D]">
              嚴格依據流年四化落宮（祿權科忌＋對宮沖照）與八字流年四柱沖合生成，零虛構權重
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:divide-x lg:divide-[#ECE6DA]">
          {/* Zone 1: 有風的地方 */}
          <div className="space-y-3 lg:pr-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E6B4B]">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>有風的地方・先在這裡拿回饋</span>
            </div>
            {tailwinds.length === 0 ? (
              <p className="text-xs leading-relaxed text-[#6B7974]">
                今年外在順風點相對收斂，以穩紮穩打累積基本功為主。
              </p>
            ) : (
              <ul className="space-y-3 divide-y divide-[#F2EDE3]">
                {tailwinds.map((item) => (
                  <li key={item.id} className="pt-3 first:pt-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-serif text-sm font-semibold text-[#152924]">
                        {item.domainLabel}
                      </span>
                      <span
                        className={`text-[11px] font-medium ${ROLE_TEXT_COLOR[item.role]}`}
                      >
                        {item.role === 'buffer' ? '貴人緩衝' : '順風入口'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-[1.7] text-[#3F4E49]">
                      {item.guidance}
                    </p>
                    <div className="mt-1 font-mono text-[10.5px] text-[#7A8782]">
                      依據：{item.technicalProof}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Zone 2: 該扛的主戰場 */}
          <div className="space-y-3 border-t border-[#ECE6DA] pt-4 lg:border-t-0 lg:px-5 lg:pt-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8C6830]">
              <Target className="h-3.5 w-3.5" />
              <span>該扛的主戰場・別閃躲的重點</span>
            </div>
            {arenas.length === 0 ? (
              <p className="text-xs leading-relaxed text-[#6B7974]">
                今年主戰場分散，適合自己選定一件核心任務集中推進。
              </p>
            ) : (
              <ul className="space-y-3 divide-y divide-[#F2EDE3]">
                {arenas.map((item) => (
                  <li key={item.id} className="pt-3 first:pt-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-serif text-sm font-semibold text-[#152924]">
                        {item.domainLabel}
                      </span>
                      <span className="text-[11px] font-medium text-[#8C6830]">
                        年度主線
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-[1.7] text-[#3F4E49]">
                      {item.guidance}
                    </p>
                    <div className="mt-1 font-mono text-[10.5px] text-[#7A8782]">
                      依據：{item.technicalProof}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Zone 3: 容易白耗的止損區 */}
          <div className="space-y-3 border-t border-[#ECE6DA] pt-4 lg:border-t-0 lg:pl-5 lg:pt-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A63A2B]">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>容易白耗的止損區・先降預期</span>
            </div>
            {stoplosses.length === 0 ? (
              <p className="text-xs leading-relaxed text-[#6B7974]">
                今年無顯著結構性衝突，照既定節奏推進即可。
              </p>
            ) : (
              <ul className="space-y-3 divide-y divide-[#F2EDE3]">
                {stoplosses.map((item) => (
                  <li key={item.id} className="pt-3 first:pt-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-serif text-sm font-semibold text-[#152924]">
                        {item.domainLabel}
                      </span>
                      <span className="text-[11px] font-medium text-[#A63A2B]">
                        控管消耗
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-[1.7] text-[#3F4E49]">
                      {item.guidance}
                    </p>
                    <div className="mt-1 font-mono text-[10.5px] text-[#7A8782]">
                      依據：{item.technicalProof}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* PART 3: Full-Width 4 Life Circles Clash/Harmony Scan */}
      <div className="px-6 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-xs font-semibold text-[#152924]">
            三、{stagePosition.targetYear} 年四大生活圈變動掃描
          </div>
          <div className="text-[11.5px] text-[#6B7974]">
            流年「{bazi.targetFlow.yearPillar.ganZhi}」比對八字四柱之真實沖合
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-[#ECE6DA]">
          {lifeCircles.map((circle, idx) => {
            const statusColor =
              circle.relation === 'harmony'
                ? 'text-[#1E6B4B]'
                : circle.relation === 'clash'
                  ? 'text-[#A63A2B]'
                  : circle.relation === 'repeat'
                    ? 'text-[#8C6830]'
                    : 'text-[#7A8782]';

            return (
              <div
                key={circle.pillarLabel}
                className={`border-t border-[#F0EBE0] pt-3 sm:border-t-0 sm:pt-0 ${
                  idx > 0 ? 'lg:pl-4' : ''
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-serif text-sm font-semibold text-[#152924]">
                    {circle.circlePlain}
                  </span>
                  <span
                    className={`text-[11px] font-semibold whitespace-nowrap ${statusColor}`}
                  >
                    {circle.relationPlain}
                  </span>
                </div>
                <div className="mt-0.5 font-mono text-[10.5px] text-[#7A8782]">
                  {circle.pillarLabel} {circle.ganZhi} · {circle.technicalNote}
                </div>
                <p className="mt-1.5 text-xs leading-[1.7] text-[#4C5A55]">
                  {circle.guidance}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
