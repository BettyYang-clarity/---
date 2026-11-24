import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  AISynastryAnalysis,
  ClientProfile,
  FiveElement,
  SynastryRelationType,
  SynastryTone,
} from '../types/holistic';
import { calculateZiweiChart } from '../engines/ziweiEngine';
import { calculateBaziChart } from '../engines/baziEngine';
import { calculateTarotChart } from '../engines/tarotEngine';
import {
  calculateSynastry,
  SYNASTRY_RELATION_LABELS,
} from '../engines/synastryEngine';
import { TarotTotemSvg } from './TarotTotemSvg';

interface SynastryTabProps {
  clients: ClientProfile[];
  defaultClientAId: string | null;
  targetDate: string;
  onAddClient: () => void;
}

const RELATION_OPTIONS: Array<{
  id: SynastryRelationType;
  label: string;
  hint: string;
}> = [
  { id: 'romantic', label: '感情伴侶', hint: '情感默契、夫妻宮與相處張力' },
  { id: 'business', label: '事業合夥', hint: '權責分工、財官資源與五行互補' },
  { id: 'family', label: '親子家人', hint: '家庭凝聚、照顧角色與溝通界線' },
  { id: 'friendship', label: '摯友知己', hint: '精神共鳴、互助能量與相伴節奏' },
];

const ELEMENT_COLORS: Record<FiveElement, string> = {
  木: 'text-[#2B5B4C]',
  火: 'text-[#A63A2B]',
  土: 'text-[#8C6830]',
  金: 'text-[#5A5E66]',
  水: 'text-[#244E70]',
};

const ELEMENT_BAR_BG: Record<FiveElement, string> = {
  木: 'bg-[#2B5B4C]',
  火: 'bg-[#A63A2B]',
  土: 'bg-[#9A7B3E]',
  金: 'bg-[#6B6E75]',
  水: 'bg-[#244E70]',
};

const TONE_TEXT_CLASS: Record<SynastryTone, string> = {
  harmony: 'text-[#1E6B4B]',
  complement: 'text-[#2B5B4C]',
  dynamic: 'text-[#8C6830]',
  caution: 'text-[#A63A2B]',
};

const MUTAGEN_COLOR: Record<'祿' | '權' | '科' | '忌', string> = {
  祿: 'text-[#1E6B4B]',
  權: 'text-[#3B4D8F]',
  科: 'text-[#0F6D7A]',
  忌: 'text-[#B91C1C]',
};

export const SynastryTab: React.FC<SynastryTabProps> = ({
  clients,
  defaultClientAId,
  targetDate,
  onAddClient,
}) => {
  const [clientAId, setClientAId] = useState<string>('');
  const [clientBId, setClientBId] = useState<string>('');
  const [relationType, setRelationType] =
    useState<SynastryRelationType>('romantic');

  const [aiAnalysis, setAiAnalysis] = useState<AISynastryAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // When user clicks a different client in the left sidebar, sync Client A cleanly
  useEffect(() => {
    if (!defaultClientAId) return;
    if (!clients.some((c) => c.id === defaultClientAId)) return;
    setClientAId((prevA) => {
      if (prevA === defaultClientAId) return prevA;
      setClientBId((prevB) =>
        prevB === defaultClientAId ? prevA : prevB
      );
      return defaultClientAId;
    });
  }, [defaultClientAId, clients]);

  // Ensure valid pair selections when client list changes (e.g. after delete or initial load)
  useEffect(() => {
    if (clients.length === 0) {
      setClientAId('');
      setClientBId('');
      return;
    }

    const validA =
      clients.find((c) => c.id === clientAId)?.id ??
      clients.find((c) => c.id === defaultClientAId)?.id ??
      clients[0].id;

    let validB = clients.find((c) => c.id === clientBId && c.id !== validA)?.id;
    if (!validB) {
      validB = clients.find((c) => c.id !== validA)?.id ?? '';
    }

    if (validA !== clientAId) setClientAId(validA);
    if (validB !== clientBId) setClientBId(validB);
  }, [clients, defaultClientAId, clientAId, clientBId]);

  const clientA = useMemo(
    () => clients.find((c) => c.id === clientAId) ?? null,
    [clients, clientAId]
  );
  const clientB = useMemo(
    () => clients.find((c) => c.id === clientBId) ?? null,
    [clients, clientBId]
  );

  // Clear stale AI reading when pair, relation type, or target year changes
  const pairCacheKey = `${clientA?.id ?? ''}|${clientB?.id ?? ''}|${relationType}|${targetDate.slice(0, 4)}`;
  useEffect(() => {
    setAiAnalysis(null);
    setAiError(null);
  }, [pairCacheKey]);

  const synastry = useMemo(() => {
    if (!clientA || !clientB || clientA.id === clientB.id) return null;
    try {
      const ziweiA = calculateZiweiChart(
        clientA.birthDate,
        clientA.birthTime,
        clientA.gender,
        targetDate
      );
      const baziA = calculateBaziChart(
        clientA.birthDate,
        clientA.birthTime,
        clientA.gender,
        targetDate
      );
      const tarotA = calculateTarotChart(clientA.birthDate, targetDate);

      const ziweiB = calculateZiweiChart(
        clientB.birthDate,
        clientB.birthTime,
        clientB.gender,
        targetDate
      );
      const baziB = calculateBaziChart(
        clientB.birthDate,
        clientB.birthTime,
        clientB.gender,
        targetDate
      );
      const tarotB = calculateTarotChart(clientB.birthDate, targetDate);

      return calculateSynastry({
        clientA,
        ziweiA,
        baziA,
        tarotA,
        clientB,
        ziweiB,
        baziB,
        tarotB,
        relationType,
        targetDate,
      });
    } catch (err) {
      console.error('Synastry calculation error:', err);
      return null;
    }
  }, [clientA, clientB, relationType, targetDate]);

  const handleSwapPair = () => {
    if (!clientAId || !clientBId) return;
    setClientAId(clientBId);
    setClientBId(clientAId);
  };

  const handleSelectA = (nextId: string) => {
    if (nextId === clientBId) {
      setClientBId(clientAId);
    }
    setClientAId(nextId);
  };

  const handleSelectB = (nextId: string) => {
    if (nextId === clientAId) {
      setClientAId(clientBId);
    }
    setClientBId(nextId);
  };

  const handleRequestAiReading = async () => {
    if (!synastry || aiLoading) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const synastryPayload = {
        relationType: synastry.relationType,
        relationLabel: SYNASTRY_RELATION_LABELS[synastry.relationType],
        targetDate: synastry.targetDate,
        clientA: {
          name: synastry.clientA.name,
          gender: synastry.clientA.gender,
          birthDate: synastry.clientA.birthDate,
          birthTime: synastry.clientA.birthTime,
        },
        clientB: {
          name: synastry.clientB.name,
          gender: synastry.clientB.gender,
          birthDate: synastry.clientB.birthDate,
          birthTime: synastry.clientB.birthTime,
        },
        bazi: synastry.bazi,
        ziwei: synastry.ziwei,
        tarot: {
          compositeCard: `${synastry.tarot.compositeCard.displayNumber} ${synastry.tarot.compositeCard.name}`,
          compositeEssence: synastry.tarot.compositeCard.essence,
          compositeRootCard: synastry.tarot.compositeRootCard
            ? `${synastry.tarot.compositeRootCard.displayNumber} ${synastry.tarot.compositeRootCard.name}`
            : null,
          sameConstellation: synastry.tarot.sameConstellation,
          constellationSummary: synastry.tarot.constellationSummary,
          mirrorHits: synastry.tarot.mirrorHits,
          yearCycleSync: synastry.tarot.yearCycleSync,
        },
      };

      const res = await fetch('/api/reading/synastry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ synastryPayload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.analysis) {
        setAiError(
          data.error || 'AI 合盤深度解讀暫時無法連線，請稍後再試。'
        );
        return;
      }
      setAiAnalysis(data.analysis as AISynastryAnalysis);
    } catch {
      setAiError('無法連線至 AI 合盤解讀服務，請檢查網路後再試。');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyPlainSummary = async () => {
    if (!synastry) return;
    const lines = [
      `【雙人全息合盤摘要｜${SYNASTRY_RELATION_LABELS[synastry.relationType]}】`,
      `對象：${synastry.clientA.name}（${synastry.clientA.gender}，${synastry.clientA.birthDate}） × ${synastry.clientB.name}（${synastry.clientB.gender}，${synastry.clientB.birthDate}）`,
      `查詢基準日：${synastry.targetDate}`,
      '',
      `一、子平八字合盤`,
      `・日主關係：${synastry.bazi.dayMasterRelation.relationLabel}`,
      `・日支夫妻宮：${synastry.bazi.dayBranchRelation.relationLabel}`,
      synastry.bazi.bSupplementsA.length > 0
        ? `・${synastry.clientB.name} 補足 ${synastry.clientA.name} 五行：${synastry.bazi.bSupplementsA.join('、')}`
        : '',
      synastry.bazi.aSupplementsB.length > 0
        ? `・${synastry.clientA.name} 補足 ${synastry.clientB.name} 五行：${synastry.bazi.aSupplementsB.join('、')}`
        : '',
      '',
      `二、紫微斗數合盤（勸學齋規則）`,
      `・${synastry.clientA.name}命宮落入 ${synastry.clientB.name}之「${synastry.ziwei.aInB.landsInTargetPalace}」`,
      `・${synastry.clientB.name}命宮落入 ${synastry.clientA.name}之「${synastry.ziwei.bInA.landsInTargetPalace}」`,
      `・${synastry.clientA.name}命干(${synastry.ziwei.aMingStem})飛化入${synastry.clientB.name}盤：${synastry.ziwei.aFliesToB.map((h) => `${h.mutagen}入${h.targetPalaceName}(${h.starName})`).join('、')}`,
      `・${synastry.clientB.name}命干(${synastry.ziwei.bMingStem})飛化入${synastry.clientA.name}盤：${synastry.ziwei.bFliesToA.map((h) => `${h.mutagen}入${h.targetPalaceName}(${h.starName})`).join('、')}`,
      '',
      `三、生日塔羅關係合盤`,
      `・合盤關係原型牌：${synastry.tarot.compositeCard.displayNumber} ${synastry.tarot.compositeCard.name}${synastry.tarot.compositeRootCard ? `（輔助根數：${synastry.tarot.compositeRootCard.name}）` : ''}`,
      synastry.tarot.mirrorHits.length > 0
        ? `・靈魂鏡像：${synastry.tarot.mirrorHits.map((m) => `${m.direction}（${m.cardName}）`).join('；')}`
        : '',
    ];

    if (aiAnalysis) {
      lines.push(
        '',
        `四、AI 深度合盤總評：${aiAnalysis.relationshipPortrait.headline}`,
        aiAnalysis.relationshipPortrait.summary,
        '',
        `【實務相處守則】`,
        ...aiAnalysis.practicalAdvice.map(
          (a, idx) => `${idx + 1}. ${a.focus}：${a.action}`
        )
      );
    }

    try {
      await navigator.clipboard.writeText(lines.filter((l) => l !== '').join('\n'));
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 2400);
    } catch {
      // Clipboard unavailable in restricted context
    }
  };

  // Empty state when fewer than 2 clients exist in DB
  if (clients.length < 2) {
    return (
      <div className="mx-auto mt-12 max-w-lg rounded-lg border border-[#DDD6C7] bg-white p-8 text-center">
        <Users className="mx-auto h-7 w-7 text-[#8C6830]" />
        <h2 className="mt-3 font-serif text-lg font-semibold text-[#152924]">
          需要至少 2 位命主才能進行雙人合盤
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[#5C6B66]">
          雙人合盤會直接從您的命主資料庫中挑選兩位對象，同步比對子平八字五行沖合、紫微勸學齋飛星四化落宮，以及 Mary K. Greer 生日塔羅關係原型。
        </p>
        <button
          type="button"
          onClick={onAddClient}
          className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#152924] px-4 py-2 text-xs font-medium text-[#FAF8F3] transition-colors hover:bg-[#23433B]"
        >
          <Plus className="h-3.5 w-3.5" />
          新增合盤對象
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Header: Select Pair from Client DB + Relationship Context */}
      <section className="rounded-lg border border-[#DDD6C7] bg-white p-5">
        <div className="flex flex-col justify-between gap-4 border-b border-[#ECE6DA] pb-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-serif text-xl font-bold text-[#152924]">
              雙人三系統合盤分析
            </h1>
            <p className="mt-1 text-xs text-[#64736D]">
              直接從命主資料庫挑選兩位個案，即時比對子平八字、勸學齋紫微飛星與生日塔羅關係原型
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAddClient}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#D4CCB9] bg-[#FAF8F3] px-3 py-1.5 text-xs font-medium text-[#152924] transition-colors hover:bg-[#EFEAE0] whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              新增合盤對象
            </button>
            <button
              type="button"
              onClick={() => void handleCopyPlainSummary()}
              disabled={!synastry}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#D4CCB9] bg-white px-3 py-1.5 text-xs font-medium text-[#3F4D48] transition-colors hover:bg-[#F5F1E8] disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              {copiedSummary ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#1E6B4B]" />
                  已複製摘要
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  複製合盤摘要
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pair Selector Row */}
        <div className="mt-4 grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto_1fr]">
          <div>
            <label
              htmlFor="synastry-client-a"
              className="mb-1.5 block text-xs font-medium text-[#4A5853]"
            >
              命主 A（主視角）
            </label>
            <select
              id="synastry-client-a"
              value={clientAId}
              onChange={(e) => handleSelectA(e.target.value)}
              className="w-full rounded-md border border-[#D4CCB9] bg-[#FAF8F3] px-3 py-2 text-sm font-medium text-[#152924] focus:border-[#2B5B4C] focus:bg-white focus:outline-none"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}（{c.gender} · {c.birthDate} {c.birthTime}）
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSwapPair}
            title="互換命主 A 與 B"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-[#D4CCB9] bg-white px-3 text-xs font-medium text-[#3F4D48] transition-colors hover:bg-[#F3EFE6] whitespace-nowrap shrink-0"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-[#8C6830]" />
            <span>互換</span>
          </button>

          <div>
            <label
              htmlFor="synastry-client-b"
              className="mb-1.5 block text-xs font-medium text-[#4A5853]"
            >
              命主 B（合盤對象）
            </label>
            <select
              id="synastry-client-b"
              value={clientBId}
              onChange={(e) => handleSelectB(e.target.value)}
              className="w-full rounded-md border border-[#D4CCB9] bg-[#FAF8F3] px-3 py-2 text-sm font-medium text-[#152924] focus:border-[#2B5B4C] focus:bg-white focus:outline-none"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}（{c.gender} · {c.birthDate} {c.birthTime}）
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Relationship Context Selector */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0EAE0] pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#52605B]">關係情境</span>
            <div
              role="group"
              aria-label="選擇合盤關係情境"
              className="flex flex-wrap items-center gap-1 rounded-md border border-[#DDD6C7] bg-[#EFEBE2] p-0.5"
            >
              {RELATION_OPTIONS.map((opt) => {
                const active = relationType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRelationType(opt.id)}
                    className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
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
          <span className="text-xs text-[#6B7974]">
            {RELATION_OPTIONS.find((r) => r.id === relationType)?.hint}
          </span>
        </div>
      </section>

      {synastry && (
        <>
          {/* 01. 子平八字合盤 */}
          <section className="rounded-lg border border-[#DDD6C7] bg-white p-5 space-y-5">
            <div className="border-b border-[#ECE6DA] pb-3">
              <h2 className="font-serif text-base font-semibold text-[#152924]">
                01. 子平八字合盤・日主生剋、夫妻宮與五行互補
              </h2>
              <p className="mt-0.5 text-xs text-[#6B7974]">
                比對雙方日主天干、日支夫妻宮、四柱干支交會、先天五行強弱補給與古典互相貴人
              </p>
            </div>

            {/* Day Master & Day Branch 2-Column Core */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-md border border-[#EAE3D5] bg-[#FAF8F3] p-4">
                <div className="text-[11px] text-[#73807B]">
                  日主天干互動（外顯個性與氣場牽引）
                </div>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                  <span className="font-serif text-base font-bold text-[#152924]">
                    {synastry.clientA.name} {synastry.bazi.dayMasterRelation.stemA}
                    {synastry.bazi.dayMasterRelation.elementA}
                  </span>
                  <span className="text-xs text-[#8C6830]">×</span>
                  <span className="font-serif text-base font-bold text-[#152924]">
                    {synastry.clientB.name} {synastry.bazi.dayMasterRelation.stemB}
                    {synastry.bazi.dayMasterRelation.elementB}
                  </span>
                </div>
                <div
                  className={`mt-1 text-xs font-semibold ${TONE_TEXT_CLASS[synastry.bazi.dayMasterRelation.tone]}`}
                >
                  {synastry.bazi.dayMasterRelation.relationLabel}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#3F4D48]">
                  {synastry.bazi.dayMasterRelation.summary}
                </p>
              </div>

              <div className="rounded-md border border-[#EAE3D5] bg-[#FAF8F3] p-4">
                <div className="text-[11px] text-[#73807B]">
                  日支內在互動（夫妻宮與日常默契）
                </div>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                  <span className="font-serif text-base font-bold text-[#152924]">
                    {synastry.clientA.name}日支「{synastry.bazi.dayBranchRelation.branchA}」
                  </span>
                  <span className="text-xs text-[#8C6830]">×</span>
                  <span className="font-serif text-base font-bold text-[#152924]">
                    {synastry.clientB.name}日支「{synastry.bazi.dayBranchRelation.branchB}」
                  </span>
                </div>
                <div
                  className={`mt-1 text-xs font-semibold ${TONE_TEXT_CLASS[synastry.bazi.dayBranchRelation.tone]}`}
                >
                  {synastry.bazi.dayBranchRelation.relationLabel}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#3F4D48]">
                  {synastry.bazi.dayBranchRelation.summary}
                </p>
              </div>
            </div>

            {/* Five-Element Complement Matrix & Pillar Table */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {/* Five Elements Matrix */}
              <div>
                <h3 className="text-xs font-semibold text-[#152924]">
                  五行能量互補矩陣（四柱天干＋地支共 8 字計數）
                </h3>
                <div className="mt-2.5 overflow-hidden rounded-md border border-[#ECE6DA]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F3] text-[11px] text-[#64736D]">
                      <tr className="border-b border-[#ECE6DA]">
                        <th className="px-3 py-2 font-medium">五行</th>
                        <th className="px-3 py-2 font-medium">
                          {synastry.clientA.name}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {synastry.clientB.name}
                        </th>
                        <th className="px-3 py-2 font-medium text-right">
                          互補判讀
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EAE0] tabular-nums">
                      {synastry.bazi.elementMatrix.map((row) => (
                        <tr key={row.element} className="hover:bg-[#FAF8F3]/60">
                          <td
                            className={`px-3 py-2 font-serif text-sm font-bold ${ELEMENT_COLORS[row.element]}`}
                          >
                            {row.element}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="w-4 font-mono text-xs text-[#152924]">
                                {row.countA}
                              </span>
                              <div className="h-1.5 w-16 overflow-hidden rounded bg-[#EFEAE0]">
                                <div
                                  className={`h-full ${ELEMENT_BAR_BG[row.element]}`}
                                  style={{
                                    width: `${Math.min(100, (row.countA / 5) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="w-4 font-mono text-xs text-[#152924]">
                                {row.countB}
                              </span>
                              <div className="h-1.5 w-16 overflow-hidden rounded bg-[#EFEAE0]">
                                <div
                                  className={`h-full ${ELEMENT_BAR_BG[row.element]}`}
                                  style={{
                                    width: `${Math.min(100, (row.countB / 5) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-medium ${TONE_TEXT_CLASS[row.tone]}`}
                          >
                            {row.statusLabel}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {synastry.bazi.sharedMissingElements.length > 0 && (
                  <p className="mt-2 text-[11.5px] text-[#8C6830]">
                    共同偏弱五行：{synastry.bazi.sharedMissingElements.join('、')} — 兩人在決策與日常環境中可多留意補足此元素特質。
                  </p>
                )}
              </div>

              {/* Pillar Interactions & Mutual Nobleman */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-[#152924]">
                    關鍵四柱干支交會明細
                  </h3>
                  <div className="mt-2.5 divide-y divide-[#F0EAE0] rounded-md border border-[#ECE6DA]">
                    {synastry.bazi.pillarInteractions.map((item, idx) => (
                      <div key={idx} className="px-3.5 py-2.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-xs font-medium text-[#152924]">
                            {item.pairLabel}
                          </span>
                          <span className="font-mono text-xs text-[#52605B] tabular-nums">
                            {item.pillarA} × {item.pillarB}
                          </span>
                        </div>
                        <div
                          className={`mt-0.5 text-xs font-semibold ${TONE_TEXT_CLASS[item.tone]}`}
                        >
                          {item.relationLabel}
                        </div>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#52605B]">
                          {item.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {synastry.bazi.noblemanLinks.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-[#152924]">
                      古典互相貴人與喜慶星檢核
                    </h3>
                    <div className="mt-2 divide-y divide-[#F0EAE0] rounded-md border border-[#ECE6DA] bg-[#FAF8F3]">
                      {synastry.bazi.noblemanLinks.map((link, idx) => (
                        <div key={idx} className="px-3.5 py-2.5">
                          <div className="flex items-baseline gap-2 text-xs">
                            <span className="font-semibold text-[#8C6830]">
                              {link.starName}
                            </span>
                            <span className="text-[#73807B]">·</span>
                            <span className="font-medium text-[#152924]">
                              {link.direction}
                            </span>
                          </div>
                          <p className="mt-1 text-[11.5px] leading-relaxed text-[#4A5853]">
                            {link.detail}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 02. 紫微斗數合盤（勸學齋飛星規則） */}
          <section className="rounded-lg border border-[#DDD6C7] bg-white p-5 space-y-5">
            <div className="border-b border-[#ECE6DA] pb-3">
              <h2 className="font-serif text-base font-semibold text-[#152924]">
                02. 紫微斗數合盤（勸學齋規則）・命宮落位與雙向命干飛星
              </h2>
              <p className="mt-0.5 text-xs text-[#6B7974]">
                檢視「對方在自己生命中扮演的宮位角色」，以及雙方命宮宮干四化（庚干：太陽祿・武曲權・太陰科・天同忌）互飛入對方盤中的落點
              </p>
            </div>

            {/* Dual Role Mirror */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-md border border-[#EAE3D5] bg-[#FAF8F3] p-4">
                <div className="text-[11px] text-[#73807B]">
                  {synastry.clientA.name} 在 {synastry.clientB.name} 生命中的落宮角色
                </div>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                  <span className="font-serif text-base font-bold text-[#152924]">
                    落入 {synastry.clientB.name}「{synastry.ziwei.aInB.landsInTargetPalace}」
                  </span>
                  <span className="text-xs text-[#64736D]">
                    （{synastry.clientA.name}命宮 {synastry.ziwei.aInB.sourceMingBranch} ·{' '}
                    {synastry.ziwei.aInB.sourceMingStars}）
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#3F4D48]">
                  {synastry.ziwei.aInB.roleInterpretation}
                </p>
              </div>

              <div className="rounded-md border border-[#EAE3D5] bg-[#FAF8F3] p-4">
                <div className="text-[11px] text-[#73807B]">
                  {synastry.clientB.name} 在 {synastry.clientA.name} 生命中的落宮角色
                </div>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
                  <span className="font-serif text-base font-bold text-[#152924]">
                    落入 {synastry.clientA.name}「{synastry.ziwei.bInA.landsInTargetPalace}」
                  </span>
                  <span className="text-xs text-[#64736D]">
                    （{synastry.clientB.name}命宮 {synastry.ziwei.bInA.sourceMingBranch} ·{' '}
                    {synastry.ziwei.bInA.sourceMingStars}）
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#3F4D48]">
                  {synastry.ziwei.bInA.roleInterpretation}
                </p>
              </div>
            </div>

            {/* Dual Flying-Star Four Mutagens Tables */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {[
                {
                  title: `${synastry.clientA.name} 命宮干「${synastry.ziwei.aMingStem}」飛化入 ${synastry.clientB.name} 命盤`,
                  hits: synastry.ziwei.aFliesToB,
                },
                {
                  title: `${synastry.clientB.name} 命宮干「${synastry.ziwei.bMingStem}」飛化入 ${synastry.clientA.name} 命盤`,
                  hits: synastry.ziwei.bFliesToA,
                },
              ].map((block, bIdx) => (
                <div key={bIdx}>
                  <h3 className="text-xs font-semibold text-[#152924]">
                    {block.title}
                  </h3>
                  <div className="mt-2 divide-y divide-[#F0EAE0] rounded-md border border-[#ECE6DA]">
                    {block.hits.map((hit) => (
                      <div key={hit.mutagen} className="px-3.5 py-2.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                          <div className="flex items-baseline gap-2">
                            <span
                              className={`font-serif text-sm font-bold ${MUTAGEN_COLOR[hit.mutagen]}`}
                            >
                              化{hit.mutagen}
                            </span>
                            <span className="font-medium text-[#152924]">
                              {hit.starName}
                            </span>
                            <span className="text-[#73807B]">→</span>
                            <span className="font-semibold text-[#2B5B4C]">
                              入對方「{hit.targetPalaceName}」
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-[#73807B]">
                            {hit.targetBranch}宮
                          </span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-[#52605B]">
                          {hit.interpretation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Archetype & Target Year Rhythm Strip */}
            <div className="grid grid-cols-1 gap-4 border-t border-[#ECE6DA] pt-4 md:grid-cols-2">
              <div className="text-xs leading-relaxed text-[#3F4D48]">
                <div className="font-semibold text-[#152924]">主星派系動靜配對</div>
                <div className="mt-1 text-[#64736D]">
                  {synastry.clientA.name}：{synastry.ziwei.starArchetypeMatch.groupA}
                  <br />
                  {synastry.clientB.name}：{synastry.ziwei.starArchetypeMatch.groupB}
                </div>
                <p className="mt-1.5">
                  {synastry.ziwei.starArchetypeMatch.summary}
                </p>
              </div>
              <div className="text-xs leading-relaxed text-[#3F4D48]">
                <div className="font-semibold text-[#152924] tabular-nums">
                  {synastry.ziwei.currentYearSync.year} 年雙方流年節奏對照
                </div>
                <div className="mt-1.5 space-y-1">
                  <div>
                    <span className="font-medium text-[#152924]">
                      {synastry.clientA.name}：
                    </span>
                    {synastry.ziwei.currentYearSync.aYearlySummary}
                  </div>
                  <div>
                    <span className="font-medium text-[#152924]">
                      {synastry.clientB.name}：
                    </span>
                    {synastry.ziwei.currentYearSync.bYearlySummary}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 03. Mary K. Greer 生日塔羅合盤 */}
          <section className="rounded-lg border border-[#DDD6C7] bg-white p-5 space-y-4">
            <div className="border-b border-[#ECE6DA] pb-3">
              <h2 className="font-serif text-base font-semibold text-[#152924]">
                03. 生日塔羅合盤（Mary K. Greer）・關係原型牌與靈魂鏡像
              </h2>
              <p className="mt-0.5 text-xs text-[#6B7974]">
                由兩人人格數相加縮減得出「共同創造的關係原型牌」，並檢核彼此是否扮演對方的導師／陰影鏡子
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
              {/* Composite Card Anchor */}
              <div className="flex flex-col items-center justify-center rounded-md border border-[#E5DEC9] bg-[#FAF8F3] p-5 text-center">
                <span className="text-[11px] text-[#73807B]">雙人合盤關係原型牌</span>
                <TarotTotemSvg
                  arcanaNumber={synastry.tarot.compositeCard.number}
                  className="my-2.5 h-16 w-16 text-[#8E6F36]"
                />
                <div className="font-serif text-lg font-bold text-[#152924]">
                  {synastry.tarot.compositeCard.displayNumber}{' '}
                  {synastry.tarot.compositeCard.name}
                </div>
                <div className="mt-0.5 text-[11px] text-[#64736D]">
                  {synastry.tarot.compositeCard.englishName}
                </div>
                {synastry.tarot.compositeRootCard && (
                  <div className="mt-2 text-xs text-[#8C6830]">
                    深層靈魂共鳴：{synastry.tarot.compositeRootCard.displayNumber}{' '}
                    {synastry.tarot.compositeRootCard.name}
                  </div>
                )}
                <div className="mt-2 font-mono text-[10.5px] text-[#73807B] tabular-nums">
                  {synastry.tarot.compositeFormula}
                </div>
              </div>

              {/* Tarot Relationship Insights */}
              <div className="space-y-3.5 text-xs leading-relaxed text-[#3F4D48]">
                <div>
                  <div className="font-semibold text-[#152924]">
                    關係場域本質 · {synastry.tarot.compositeCard.keywords.join(' / ')}
                  </div>
                  <p className="mt-1">{synastry.tarot.compositeCard.essence}</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded border border-[#ECE6DA] bg-[#FAF8F3] px-3 py-2">
                      <span className="font-semibold text-[#1E6B4B]">正向顯化：</span>
                      {synastry.tarot.compositeCard.lightSide}
                    </div>
                    <div className="rounded border border-[#ECE6DA] bg-[#FAF8F3] px-3 py-2">
                      <span className="font-semibold text-[#8C6830]">共同功課：</span>
                      {synastry.tarot.compositeCard.growthLesson}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#F0EAE0] pt-3">
                  <div className="font-semibold text-[#152924]">家族原型對照</div>
                  <p className="mt-1">{synastry.tarot.constellationSummary}</p>
                </div>

                {synastry.tarot.mirrorHits.length > 0 && (
                  <div className="border-t border-[#F0EAE0] pt-3 space-y-2">
                    <div className="font-semibold text-[#8C6830]">
                      偵測到靈魂導師／陰影鏡像連結
                    </div>
                    {synastry.tarot.mirrorHits.map((hit, idx) => (
                      <div
                        key={idx}
                        className="rounded border border-[#E6D7B8] bg-[#FBF8F0] px-3 py-2"
                      >
                        <div className="font-medium text-[#152924]">
                          {hit.direction} · {hit.cardName}
                        </div>
                        <p className="mt-1 text-[11.5px] text-[#4A5853]">
                          {hit.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-[#F0EAE0] pt-3 flex flex-wrap items-center gap-x-6 gap-y-1 tabular-nums text-[#52605B]">
                  <span>
                    <strong className="text-[#152924]">{synastry.clientA.name}</strong>{' '}
                    當前流年牌：{synastry.tarot.yearCycleSync.aYearCard}（下次換牌{' '}
                    {synastry.tarot.yearCycleSync.aNextSwitch}）
                  </span>
                  <span>
                    <strong className="text-[#152924]">{synastry.clientB.name}</strong>{' '}
                    當前流年牌：{synastry.tarot.yearCycleSync.bYearCard}（下次換牌{' '}
                    {synastry.tarot.yearCycleSync.bNextSwitch}）
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 04. AI 深度三系統合盤解讀（按需啟動） */}
          <section className="rounded-lg border border-[#DDD6C7] bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE6DA] pb-3">
              <div>
                <h2 className="font-serif text-base font-semibold text-[#152924]">
                  04. AI 三系統深度合盤解讀（{SYNASTRY_RELATION_LABELS[relationType]}視角）
                </h2>
                <p className="mt-0.5 text-xs text-[#6B7974]">
                  綜合上方所有已精算的八字、紫微飛星與塔羅原型事實，產出完整關係剖析與實務相處守則
                </p>
              </div>
              <button
                type="button"
                disabled={aiLoading}
                onClick={() => void handleRequestAiReading()}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#152924] px-4 py-2 text-xs font-medium text-[#FAF8F3] transition-colors hover:bg-[#23433B] disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {aiLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : aiAnalysis ? (
                  <RefreshCw className="h-3.5 w-3.5" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {aiLoading
                  ? '正在整合三系統合盤分析…'
                  : aiAnalysis
                    ? '重新生成合盤解讀'
                    : '啟動 AI 深度合盤解讀'}
              </button>
            </div>

            {aiError && (
              <div className="rounded-md border border-[#A63A2B]/30 bg-[#FDF4F3] px-4 py-3 text-xs text-[#8E2B1E]">
                {aiError}
              </div>
            )}

            {!aiAnalysis && !aiLoading && !aiError && (
              <div className="rounded-md border border-dashed border-[#D8D0C0] bg-[#FAF8F3] px-5 py-6 text-center text-xs text-[#5C6B66]">
                上方已完成 100% 確定性三系統合盤排盤。若需進一步將八字沖合、紫微飛星四化與塔羅關係原型串聯為諮詢解說稿，請點擊右上角「啟動 AI 深度合盤解讀」。
              </div>
            )}

            {aiLoading && !aiAnalysis && (
              <div className="flex flex-col items-center justify-center py-10 text-xs text-[#5C6B66]">
                <Loader2 className="h-5 w-5 animate-spin text-[#2B5B4C]" />
                <p className="mt-2.5">
                  正在以「{SYNASTRY_RELATION_LABELS[relationType]}」情境交叉比對{' '}
                  {synastry.clientA.name} 與 {synastry.clientB.name} 的三系統命盤…
                </p>
              </div>
            )}

            {aiAnalysis && (
              <div className="space-y-5">
                {/* Portrait */}
                <div className="rounded-md border border-[#E5DEC9] bg-[#FAF8F3] p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-serif text-base font-bold text-[#152924]">
                      {aiAnalysis.relationshipPortrait.headline}
                    </h3>
                    <div className="text-xs font-medium text-[#8C6830]">
                      {aiAnalysis.relationshipPortrait.keywords.join(' · ')}
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#2A3833]">
                    {aiAnalysis.relationshipPortrait.summary}
                  </p>
                </div>

                {/* Synergy vs Friction */}
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-semibold text-[#1E6B4B]">
                      核心默契與互補優勢
                    </h3>
                    <div className="mt-2 divide-y divide-[#ECE6DA] rounded-md border border-[#ECE6DA]">
                      {aiAnalysis.synergyHighlights.map((item, idx) => (
                        <div key={idx} className="p-3.5">
                          <div className="font-serif text-sm font-semibold text-[#152924]">
                            {item.title}
                          </div>
                          <div className="mt-1 text-[11px] text-[#2B5B4C]">
                            依據：{item.evidence}
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-[#3F4D48]">
                            {item.insight}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-[#A63A2B]">
                      潛在磨合與溝通盲點
                    </h3>
                    <div className="mt-2 divide-y divide-[#ECE6DA] rounded-md border border-[#ECE6DA]">
                      {aiAnalysis.frictionPoints.map((item, idx) => (
                        <div key={idx} className="p-3.5">
                          <div className="font-serif text-sm font-semibold text-[#152924]">
                            {item.title}
                          </div>
                          <div className="mt-1 text-[11px] text-[#A63A2B]">
                            依據：{item.evidence}
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-[#3F4D48]">
                            {item.resolution}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Role Dynamics & Year Rhythm */}
                <div className="grid grid-cols-1 gap-4 border-t border-[#ECE6DA] pt-4 md:grid-cols-3 text-xs leading-relaxed text-[#3F4D48]">
                  <div>
                    <div className="font-semibold text-[#152924]">
                      {synastry.clientA.name} 對 {synastry.clientB.name} 的影響
                    </div>
                    <p className="mt-1.5">{aiAnalysis.roleAndDynamics.aImpactOnB}</p>
                  </div>
                  <div>
                    <div className="font-semibold text-[#152924]">
                      {synastry.clientB.name} 對 {synastry.clientA.name} 的影響
                    </div>
                    <p className="mt-1.5">{aiAnalysis.roleAndDynamics.bImpactOnA}</p>
                  </div>
                  <div>
                    <div className="font-semibold text-[#8C6830]">
                      今年雙人互動節奏提醒
                    </div>
                    <p className="mt-1.5">
                      {aiAnalysis.roleAndDynamics.currentYearRhythm}
                    </p>
                  </div>
                </div>

                {/* Practical Advice */}
                <div className="border-t border-[#ECE6DA] pt-4">
                  <h3 className="text-xs font-semibold text-[#152924]">
                    {SYNASTRY_RELATION_LABELS[relationType]}實務相處守則
                  </h3>
                  <div className="mt-2.5 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {aiAnalysis.practicalAdvice.map((adv, idx) => (
                      <div
                        key={idx}
                        className="rounded-md border border-[#ECE6DA] bg-[#FAF8F3] p-3.5"
                      >
                        <div className="font-serif text-sm font-semibold text-[#152924]">
                          0{idx + 1}. {adv.focus}
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-[#3F4D48]">
                          {adv.action}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
