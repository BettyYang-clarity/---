import React, { useEffect, useState } from 'react';
import { Calendar, Sparkles } from 'lucide-react';
import {
  ClientProfile,
  HoroscopeScope,
  TarotArcanaInfo,
  TarotChartResult,
} from '../types/holistic';
import { getArcanaByNumber } from '../engines/tarotEngine';
import { TarotTotemSvg } from './TarotTotemSvg';

interface TarotTabProps {
  client: ClientProfile;
  tarot: TarotChartResult;
  activeScope: HoroscopeScope;
  onSelectCycleYear: (year: number) => void;
}

interface SelectedCardDetail {
  roleLabel: string;
  card: TarotArcanaInfo;
}

export const TarotTab: React.FC<TarotTabProps> = ({
  client,
  tarot,
  activeScope,
  onSelectCycleYear,
}) => {
  const [selectedDetail, setSelectedDetail] = useState<SelectedCardDetail>({
    roleLabel: '人格牌（Personality Card）',
    card: tarot.personalityCard,
  });

  useEffect(() => {
    if (
      activeScope === 'yearly' ||
      activeScope === 'monthly' ||
      activeScope === 'daily'
    ) {
      setSelectedDetail({
        roleLabel: `${tarot.currentYearCard.cycleYear} 個人流年牌（Year Card）`,
        card: tarot.currentYearCard.card,
      });
    } else {
      setSelectedDetail({
        roleLabel: '人格牌（Personality Card）',
        card: tarot.personalityCard,
      });
    }
  }, [
    client.id,
    activeScope,
    tarot.personalityCard.number,
    tarot.currentYearCard.cycleYear,
    tarot.currentYearCard.card.number,
  ]);

  // Keep detail synchronized if user switches client and current card no longer matches
  const activeCard = selectedDetail.card;

  const selectCard = (roleLabel: string, card: TarotArcanaInfo) => {
    setSelectedDetail({ roleLabel, card });
  };

  return (
    <div className="space-y-5">
      {/* Constellation Master Header */}
      <section className="rounded-lg border border-[#DDD6C7] bg-[#152924] p-5 text-[#FAF8F3]">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="text-xs font-medium tracking-wider text-[#C9A861]">
              Mary K. Greer 生日塔羅密碼 · 九大家族原型（Constellation）
            </div>
            <h2 className="mt-1 font-serif text-xl font-bold text-[#FAF8F3]">
              第 {tarot.constellation.id} 家族：{tarot.constellation.name} —{' '}
              {tarot.constellation.title}
            </h2>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[#B9C9C3]">
              {tarot.constellation.theme}
            </p>
          </div>

          <div className="shrink-0 rounded border border-white/15 bg-white/5 px-4 py-3 text-left md:text-right">
            <div className="text-[11px] text-[#A8BCB4]">命盤數學公式驗算</div>
            <div className="mt-1 font-mono text-xs text-[#F6F3EC] tabular-nums">
              {client.birthDate} → {tarot.birthSumFormula}
            </div>
            <div className="mt-1 font-mono text-xs text-[#C9A861] tabular-nums">
              縮減主數：{tarot.personalityRawNumber}
              {tarot.isSpecialCase19
                ? '（19-10-1 太陽三星連動特例）'
                : tarot.isSamePersonalitySoul
                ? '（個位數：人格與靈魂同牌）'
                : ` → 根數 ${tarot.soulCard.number}`}
            </div>
          </div>
        </div>

        {/* Constellation Member Lineup */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/12 pt-3 text-xs">
          <span className="text-[#9CB0A8]">家族成員大牌：</span>
          {tarot.constellation.memberNumbers.map((num) => {
            const c = getArcanaByNumber(num);
            const isShadow = tarot.shadowCards.some((s) => s.number === c.number);
            return (
              <button
                key={num}
                type="button"
                onClick={() =>
                  selectCard(
                    isShadow
                      ? '家族成員・陰影／導師牌'
                      : '家族成員・核心大牌',
                    c
                  )
                }
                className="font-serif text-[#EAE4D7] underline-offset-4 transition-colors hover:text-[#C9A861] hover:underline"
              >
                {c.displayNumber} {c.name}
                <span className="ml-1 font-sans text-[10.5px] text-[#9CB0A8]">
                  {isShadow ? '(陰影導師)' : '(顯化主牌)'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Core Tarot Archetype Wall */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1. Personality Card */}
        <button
          type="button"
          onClick={() =>
            selectCard('人格牌（Personality Card）', tarot.personalityCard)
          }
          className={`flex flex-col items-center rounded-lg border bg-white p-4 text-center transition-colors ${
            activeCard.number === tarot.personalityCard.number &&
            selectedDetail.roleLabel.includes('人格牌')
              ? 'border-[#152924] ring-1 ring-[#152924]'
              : 'border-[#DDD6C7] hover:border-[#9A7B3E]'
          }`}
        >
          <div className="text-[11px] font-medium text-[#2B5B4C]">
            人格牌 · 外在展現與人生功課
          </div>
          <TarotTotemSvg
            arcanaNumber={tarot.personalityCard.number}
            className="my-3 h-24 w-24 text-[#152924]"
          />
          <div className="font-mono text-xs text-[#8C6830] tabular-nums">
            {tarot.personalityCard.roman} · No.{tarot.personalityCard.displayNumber}
          </div>
          <div className="mt-0.5 font-serif text-lg font-bold text-[#152924]">
            {tarot.personalityCard.name}
          </div>
          <div className="text-[11px] text-[#73807B]">
            {tarot.personalityCard.englishName}
          </div>
          <div className="mt-2.5 text-[11.5px] text-[#5C6B66]">
            {tarot.personalityCard.keywords.slice(0, 3).join(' · ')}
          </div>
        </button>

        {/* 2. Soul Card (or Special Case 19 Trio) */}
        <button
          type="button"
          onClick={() =>
            selectCard(
              tarot.isSpecialCase19
                ? '靈魂牌（19-10-1 三星核心）'
                : '靈魂牌（Soul Card）',
              tarot.soulCard
            )
          }
          className={`flex flex-col items-center rounded-lg border bg-white p-4 text-center transition-colors ${
            activeCard.number === tarot.soulCard.number &&
            selectedDetail.roleLabel.includes('靈魂牌')
              ? 'border-[#152924] ring-1 ring-[#152924]'
              : 'border-[#DDD6C7] hover:border-[#9A7B3E]'
          }`}
        >
          <div className="text-[11px] font-medium text-[#8C6830]">
            {tarot.isSamePersonalitySoul
              ? '靈魂牌 · 與人格牌同一原型'
              : '靈魂牌 · 內在渴望與生命核心'}
          </div>
          <TarotTotemSvg
            arcanaNumber={tarot.soulCard.number}
            className="my-3 h-24 w-24 text-[#8C6830]"
          />
          <div className="font-mono text-xs text-[#8C6830] tabular-nums">
            {tarot.soulCard.roman} · No.{tarot.soulCard.displayNumber}
          </div>
          <div className="mt-0.5 font-serif text-lg font-bold text-[#152924]">
            {tarot.soulCard.name}
          </div>
          <div className="text-[11px] text-[#73807B]">
            {tarot.soulCard.englishName}
          </div>
          {tarot.isSpecialCase19 ? (
            <div className="mt-2.5 text-[11px] font-medium text-[#A63A2B]">
              連動過渡牌：10 命運之輪
            </div>
          ) : (
            <div className="mt-2.5 text-[11.5px] text-[#5C6B66]">
              {tarot.soulCard.keywords.slice(0, 3).join(' · ')}
            </div>
          )}
        </button>

        {/* 3. Shadow / Hidden Factor Card(s) */}
        <div className="flex flex-col justify-between rounded-lg border border-[#DDD6C7] bg-[#FAF8F3] p-4 text-center">
          <div className="text-[11px] font-medium text-[#A63A2B]">
            陰影／導師牌 · 隱藏盲點與潛能
          </div>

          {tarot.shadowCards.length > 0 ? (
            <div
              className={`my-2 grid gap-2 ${
                tarot.shadowCards.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {tarot.shadowCards.map((sc) => (
                <button
                  key={sc.number}
                  type="button"
                  onClick={() => selectCard('陰影／導師牌（Hidden Factor）', sc)}
                  className={`flex flex-col items-center rounded border p-2.5 transition-colors ${
                    activeCard.number === sc.number &&
                    selectedDetail.roleLabel.includes('陰影')
                      ? 'border-[#A63A2B] bg-white'
                      : 'border-[#E5DEC9] bg-white/75 hover:border-[#A63A2B]/60'
                  }`}
                >
                  <TarotTotemSvg
                    arcanaNumber={sc.number}
                    className={`my-1 text-[#A63A2B] ${
                      tarot.shadowCards.length > 1 ? 'h-16 w-16' : 'h-20 w-20'
                    }`}
                  />
                  <div className="font-mono text-[10.5px] text-[#7A8782] tabular-nums">
                    No.{sc.displayNumber}
                  </div>
                  <div className="font-serif text-sm font-bold text-[#152924]">
                    {sc.name}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="my-auto py-6 text-center">
              <Sparkles className="mx-auto h-6 w-6 text-[#9A7B3E]" />
              <div className="mt-2 font-serif text-sm font-semibold text-[#152924]">
                {tarot.isSpecialCase19 ? '19-10-1 三星齊全' : '家族能量完整無缺'}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#64736D]">
                此組合已涵蓋所屬家族所有大牌，無隱藏陰影牌，重在平衡既有主牌的光暗兩面。
              </p>
            </div>
          )}

          <div className="text-[11px] text-[#6B7974]">
            點擊牌面查看陰影轉化指引
          </div>
        </div>

        {/* 4. Current Personal Year Card */}
        <button
          type="button"
          onClick={() =>
            selectCard(
              `${tarot.currentYearCard.cycleYear} 個人流年牌（Year Card）`,
              tarot.currentYearCard.card
            )
          }
          className={`flex flex-col items-center rounded-lg border bg-white p-4 text-center transition-colors ${
            activeCard.number === tarot.currentYearCard.card.number &&
            selectedDetail.roleLabel.includes('流年牌')
              ? 'border-[#152924] ring-1 ring-[#152924]'
              : 'border-[#DDD6C7] hover:border-[#9A7B3E]'
          }`}
        >
          <div className="text-[11px] font-medium text-[#2B5B4C] tabular-nums">
            個人流年牌 · {tarot.currentYearCard.cycleYear} 年度週期
          </div>
          <TarotTotemSvg
            arcanaNumber={tarot.currentYearCard.card.number}
            className="my-3 h-24 w-24 text-[#2B5B4C]"
          />
          <div className="font-mono text-xs text-[#2B5B4C] tabular-nums">
            {tarot.currentYearCard.card.roman} · No.
            {tarot.currentYearCard.card.displayNumber}
          </div>
          <div className="mt-0.5 font-serif text-lg font-bold text-[#152924]">
            {tarot.currentYearCard.card.name}
          </div>
          {tarot.currentYearCard.rootCard ? (
            <div className="text-[11px] font-medium text-[#8C6830]">
              輔助根數牌：{tarot.currentYearCard.rootCard.displayNumber}{' '}
              {tarot.currentYearCard.rootCard.name}
            </div>
          ) : (
            <div className="text-[11px] text-[#73807B]">
              {tarot.currentYearCard.card.englishName}
            </div>
          )}
          <div className="mt-2 font-mono text-[10.5px] text-[#64736D] tabular-nums">
            下次切換：{tarot.nextSwitchDate}
          </div>
        </button>
      </section>

      {/* Selected Card Deep Archetype Inspector */}
      <section className="rounded-lg border border-[#DDD6C7] bg-white p-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex shrink-0 flex-col items-center rounded border border-[#EAE4D7] bg-[#FAF8F3] p-4 md:w-44">
            <TarotTotemSvg
              arcanaNumber={activeCard.number}
              className="h-24 w-24 text-[#152924]"
            />
            <div className="mt-2 font-mono text-xs text-[#8C6830] tabular-nums">
              {activeCard.roman} · No.{activeCard.displayNumber}
            </div>
            <div className="font-serif text-lg font-bold text-[#152924]">
              {activeCard.name}
            </div>
            <div className="text-xs text-[#6B7974]">{activeCard.englishName}</div>
          </div>

          <div className="flex-1 space-y-3.5">
            <div className="border-b border-[#ECE6DA] pb-2.5">
              <div className="text-xs font-medium text-[#8C6830]">
                {selectedDetail.roleLabel}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[#1A2421]">
                {activeCard.essence}
              </p>
              <div className="mt-2 text-xs text-[#64736D]">
                核心關鍵字：{activeCard.keywords.join(' · ')}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <div className="text-xs font-semibold text-[#1E6B4B]">
                  正向顯化（天賦光面）
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#3F4D48]">
                  {activeCard.lightSide}
                </p>
              </div>
              <div>
                <div className="text-xs font-semibold text-[#A63A2B]">
                  失衡盲點（陰影警示）
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#3F4D48]">
                  {activeCard.shadowSide}
                </p>
              </div>
              <div>
                <div className="text-xs font-semibold text-[#8C6830]">
                  覺察與轉化功課
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#3F4D48]">
                  {activeCard.growthLesson}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Year Personal Year Card Trajectory */}
      <section className="rounded-lg border border-[#DDD6C7] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECE6DA] pb-3">
          <div>
            <h3 className="font-serif text-base font-semibold text-[#152924]">
              個人流年牌五年切換軌跡（以國曆生日為切換點）
            </h3>
            <p className="mt-0.5 text-xs text-[#6B7974] tabular-nums">
              當前週期：{tarot.currentYearCard.periodStart} 至{' '}
              {tarot.currentYearCard.periodEnd} · 下次換牌生日：{tarot.nextSwitchDate}
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-[#596863]">
            <Calendar className="h-3.5 w-3.5 text-[#8C6830]" />
            點擊年度切換流年分析
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
          {tarot.yearTrajectory.map((entry) => (
            <button
              key={entry.cycleYear}
              type="button"
              onClick={() => {
                selectCard(
                  `${entry.cycleYear} 個人流年牌（${entry.periodStart} 起）`,
                  entry.card
                );
                onSelectCycleYear(entry.cycleYear);
              }}
              className={`flex flex-col items-start rounded-md border p-3 text-left transition-colors ${
                entry.isCurrent
                  ? 'border-[#152924] bg-[#152924] text-[#FAF8F3]'
                  : 'border-[#E5DEC9] bg-[#FAF8F3] text-[#1A2421] hover:border-[#2B5B4C]'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={`font-mono text-xs font-semibold tabular-nums ${
                    entry.isCurrent ? 'text-[#C9A861]' : 'text-[#2B5B4C]'
                  }`}
                >
                  {entry.cycleYear} 週期
                </span>
                {entry.isCurrent && (
                  <span className="text-[10px] text-[#EAE4D7]">當前</span>
                )}
              </div>

              <div className="mt-2 font-serif text-base font-bold">
                {entry.card.displayNumber} {entry.card.name}
              </div>

              {entry.rootCard && (
                <div
                  className={`mt-0.5 text-[11px] ${
                    entry.isCurrent ? 'text-[#C9A861]' : 'text-[#8C6830]'
                  }`}
                >
                  輔牌：{entry.rootCard.displayNumber} {entry.rootCard.name}
                </div>
              )}

              <div
                className={`mt-2 font-mono text-[10px] tabular-nums ${
                  entry.isCurrent ? 'text-[#9BB0A8]' : 'text-[#7A8782]'
                }`}
              >
                {entry.periodStart} 起
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
