import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  GitCompareArrows,
  RefreshCw,
} from 'lucide-react';
import {
  AICrossSystemAnalysis,
  CrossSystemHarmonyLevel,
  HolisticChartSummaryPayload,
} from '../types/holistic';

interface CrossSystemAnalysisSectionProps {
  cacheKey: string;
  payload: HolisticChartSummaryPayload;
  isActiveTab: boolean;
  stage1Loading: boolean;
  onAskFollowUp: (question: string, topicTag?: string) => void;
  chatLoading: boolean;
}

type FindingFilter = 'all' | 'conflict' | 'complement';

const CROSS_CACHE_STORAGE_KEY = 'holistic_ai_cross_system_cache_v1';

function loadCrossSessionCache(): Record<string, AICrossSystemAnalysis> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(CROSS_CACHE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AICrossSystemAnalysis>) : {};
  } catch {
    return {};
  }
}

function saveCrossSessionCache(cache: Record<string, AICrossSystemAnalysis>) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      CROSS_CACHE_STORAGE_KEY,
      JSON.stringify(cache)
    );
  } catch {
    // Ignore storage quota errors
  }
}

const HARMONY_META: Record<
  CrossSystemHarmonyLevel,
  { textClass: string; borderClass: string; bgClass: string; fallbackLabel: string }
> = {
  high_synergy: {
    textClass: 'text-[#1E6B4B]',
    borderClass: 'border-[#1E6B4B]/30',
    bgClass: 'bg-[#1E6B4B]/8',
    fallbackLabel: '高度互補協同',
  },
  dynamic_balance: {
    textClass: 'text-[#8C6830]',
    borderClass: 'border-[#8C6830]/30',
    bgClass: 'bg-[#8C6830]/8',
    fallbackLabel: '剛柔動態平衡',
  },
  creative_tension: {
    textClass: 'text-[#A63A2B]',
    borderClass: 'border-[#A63A2B]/30',
    bgClass: 'bg-[#A63A2B]/8',
    fallbackLabel: '張力衝突待轉化',
  },
};

export const CrossSystemAnalysisSection: React.FC<
  CrossSystemAnalysisSectionProps
> = ({
  cacheKey,
  payload,
  isActiveTab,
  stage1Loading,
  onAskFollowUp,
  chatLoading,
}) => {
  const [cache, setCache] = useState<Record<string, AICrossSystemAnalysis>>(
    () => loadCrossSessionCache()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FindingFilter>('all');

  const reqSeqRef = useRef(0);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const currentAnalysis = cache[cacheKey] ?? null;

  const fetchCrossAnalysis = async (force = false) => {
    if (!force && cache[cacheKey]) {
      setError(null);
      return;
    }

    const reqId = ++reqSeqRef.current;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/reading/cross-system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartSummary: payloadRef.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (reqId !== reqSeqRef.current) return;

      if (!res.ok || !data.analysis) {
        setError(
          data.error ||
            '跨體系合參分析暫時無法載入，請稍候點擊重試。'
        );
        return;
      }

      setCache((prev) => {
        const next = {
          ...prev,
          [cacheKey]: data.analysis as AICrossSystemAnalysis,
        };
        saveCrossSessionCache(next);
        return next;
      });
    } catch {
      if (reqId !== reqSeqRef.current) return;
      setError('無法連線至 AI 合參後端，請稍後再點擊重新偵測。');
    } finally {
      if (reqId === reqSeqRef.current) {
        setLoading(false);
      }
    }
  };

  // Auto-detect once the AI tab is active and Stage 1 summary request has settled
  // (avoids concurrent Gemini burst / 429 rate-limit collisions)
  useEffect(() => {
    setFilter('all');
    if (cache[cacheKey]) {
      setError(null);
      setLoading(false);
      return;
    }
    if (!isActiveTab || stage1Loading) return;

    const timer = window.setTimeout(() => {
      void fetchCrossAnalysis(false);
    }, 550);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, isActiveTab, stage1Loading]);

  const counts = useMemo(() => {
    const items = currentAnalysis?.findings ?? [];
    return {
      all: items.length,
      conflict: items.filter((f) => f.type === 'conflict').length,
      complement: items.filter((f) => f.type === 'complement').length,
    };
  }, [currentAnalysis]);

  const visibleFindings = useMemo(() => {
    const items = currentAnalysis?.findings ?? [];
    if (filter === 'all') return items;
    return items.filter((f) => f.type === filter);
  }, [currentAnalysis, filter]);

  const harmonyStyle = currentAnalysis
    ? HARMONY_META[currentAnalysis.overallVerdict.harmonyLevel] ??
      HARMONY_META.dynamic_balance
    : HARMONY_META.dynamic_balance;

  const elementSummaryText = (['木', '火', '土', '金', '水'] as const)
    .map((el) => `${el}${payload.bazi.elementCounts[el]}`)
    .join(' · ');

  return (
    <section
      aria-label="跨體系合參分析模塊"
      className="rounded-lg border border-[#DDD6C7] bg-white"
    >
      {/* Section Header */}
      <div className="flex flex-col justify-between gap-3 border-b border-[#ECE6DA] px-6 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="inline-flex items-center gap-2 font-serif text-base font-semibold text-[#152924]">
            <GitCompareArrows className="h-4 w-4 text-[#8C6830]" />
            第三階段：跨體系合參（紫微主星格局 × 八字五行強弱）
          </h2>
          <p className="mt-0.5 text-xs text-[#6B7974] tabular-nums">
            自動比對紫微命宮「
            {payload.ziwei.mingPalace.majorStars.join('・') || '空宮借星'}」與八字日主「
            {payload.bazi.dayMaster}」（{elementSummaryText}）之衝突張力與互補增益
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchCrossAnalysis(true)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start rounded-md border border-[#D4CCB9] bg-[#FAF8F3] px-3.5 py-2 text-xs font-medium text-[#152924] transition-colors hover:bg-[#EFEAE0] disabled:opacity-50 sm:self-center whitespace-nowrap shrink-0"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
          />
          {currentAnalysis ? '重新合參偵測' : '執行跨體系合參'}
        </button>
      </div>

      <div className="px-6 py-5">
        {/* Waiting for Stage 1 or Loading State */}
        {(loading || (!currentAnalysis && !error && stage1Loading)) && (
          <div className="space-y-4" aria-busy="true">
            <div className="text-xs text-[#64736D]">
              {stage1Loading && !loading
                ? '待第一階段全息大綱完成後，將自動啟動紫微主星 × 八字五行跨體系合參偵測…'
                : 'AI 正在交叉比對紫微命身三方四正、四化飛星與八字日主五行強弱，偵測衝突與互補節點…'}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="animate-pulse rounded-md border border-[#ECE6DA] bg-[#FAF8F3] p-5 space-y-2.5"
                >
                  <div className="h-3.5 w-28 rounded bg-[#E6DFD0]" />
                  <div className="h-4 w-2/3 rounded bg-[#EAE4D7]" />
                  <div className="h-3 w-full rounded bg-[#F1ECE1]" />
                  <div className="h-3 w-5/6 rounded bg-[#F1ECE1]" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-md border border-[#A63A2B]/30 bg-[#FCF6F5] p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#A63A2B]" />
              <div className="space-y-2.5">
                <div className="font-serif text-sm font-semibold text-[#A63A2B]">
                  無法載入跨體系合參分析
                </div>
                <p className="text-xs leading-relaxed text-[#4C5A55]">{error}</p>
                <button
                  type="button"
                  onClick={() => void fetchCrossAnalysis(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#D4CCB9] bg-white px-3.5 py-1.5 text-xs font-medium text-[#152924] transition-colors hover:bg-[#FAF8F3]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  重新偵測合參
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Idle / Manual Trigger Fallback (if neither loaded nor auto-running) */}
        {!loading && !currentAnalysis && !error && !stage1Loading && (
          <div className="flex flex-col items-start justify-between gap-3 rounded-md border border-[#ECE6DA] bg-[#FAF8F3] px-5 py-4 sm:flex-row sm:items-center">
            <p className="text-xs leading-relaxed text-[#4C5A55]">
              尚未建立此命盤的紫微 × 八字跨體系合參報告，點擊右側按鈕立即偵測主星格局與五行強弱的衝突與互補點。
            </p>
            <button
              type="button"
              onClick={() => void fetchCrossAnalysis(true)}
              className="rounded-md bg-[#152924] px-4 py-2 text-xs font-medium text-[#FAF8F3] transition-colors hover:bg-[#23433B] whitespace-nowrap shrink-0"
            >
              立即啟動合參分析
            </button>
          </div>
        )}

        {/* Populated Analysis Content */}
        {!loading && currentAnalysis && (
          <div className="space-y-6">
            {/* Overall Verdict & Dual System Structural Anchors */}
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-baseline">
                <h3 className="font-serif text-lg font-semibold text-[#152924]">
                  {currentAnalysis.overallVerdict.headline}
                </h3>
                <span
                  className={`inline-flex self-start rounded border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shrink-0 ${harmonyStyle.bgClass} ${harmonyStyle.borderClass} ${harmonyStyle.textClass}`}
                >
                  合參定性：
                  {currentAnalysis.overallVerdict.harmonyLabel ||
                    harmonyStyle.fallbackLabel}
                </span>
              </div>

              <p className="text-[14.5px] leading-[1.8] text-[#2F3E39]">
                {currentAnalysis.overallVerdict.summary}
              </p>

              {/* Dual Anchor Comparison (Hairline Divided Surface) */}
              <div className="grid grid-cols-1 divide-y divide-[#ECE6DA] rounded-md border border-[#ECE6DA] bg-[#FAF8F3] md:grid-cols-2 md:divide-x md:divide-y-0">
                <div className="p-4">
                  <div className="text-[11px] font-medium text-[#2B5B4C]">
                    紫微斗數・主星格局座標
                  </div>
                  <div className="mt-1 font-serif text-sm font-semibold text-[#152924]">
                    {currentAnalysis.ziweiPatternAnchor.patternTitle}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#45534E]">
                    {currentAnalysis.ziweiPatternAnchor.coreTraits}
                  </p>
                </div>

                <div className="p-4">
                  <div className="text-[11px] font-medium text-[#8C6830]">
                    子平八字・五行強弱座標
                  </div>
                  <div className="mt-1 font-serif text-sm font-semibold text-[#152924]">
                    {currentAnalysis.baziBalanceAnchor.balanceTitle}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#45534E]">
                    {currentAnalysis.baziBalanceAnchor.elementProfile}
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Filter Toolbar + Findings Grid */}
            <div className="border-t border-[#ECE6DA] pt-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="text-xs font-semibold text-[#152924]">
                  AI 偵測之衝突張力與互補增益節點
                </div>

                {/* Segmented Filter Control (Functional Buttons) */}
                <div
                  role="group"
                  aria-label="篩選合參項目"
                  className="flex items-center gap-0.5 self-start rounded-md border border-[#DDD6C7] bg-[#EFEBE2] p-0.5 sm:self-auto"
                >
                  {(
                    [
                      { id: 'all', label: `全部 (${counts.all})` },
                      { id: 'conflict', label: `衝突張力 (${counts.conflict})` },
                      {
                        id: 'complement',
                        label: `互補增益 (${counts.complement})`,
                      },
                    ] as Array<{ id: FindingFilter; label: string }>
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

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {visibleFindings.map((item, idx) => {
                  const isConflict = item.type === 'conflict';
                  return (
                    <article
                      key={`${item.title}-${idx}`}
                      className="flex flex-col justify-between rounded-md border border-[#E5DEC9] bg-[#FAF8F3]/60 p-5"
                    >
                      <div>
                        {/* Quiet Unboxed Typographic Kicker */}
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span
                            className={`font-semibold ${
                              isConflict ? 'text-[#A63A2B]' : 'text-[#1E6B4B]'
                            }`}
                          >
                            {isConflict ? '衝突張力點' : '互補增益點'} ·{' '}
                            {item.domain}
                          </span>
                          <span className="font-mono text-[11px] text-[#8A948F] tabular-nums">
                            0{idx + 1}
                          </span>
                        </div>

                        <h4 className="mt-1.5 font-serif text-base font-semibold text-[#152924]">
                          {item.title}
                        </h4>

                        {/* Evidence Pair */}
                        <div className="mt-3 space-y-1 border-y border-[#EAE3D5] py-2.5 text-xs leading-relaxed text-[#4C5A55]">
                          <div>
                            <span className="font-semibold text-[#2B5B4C]">
                              紫微依據：
                            </span>
                            {item.ziweiEvidence}
                          </div>
                          <div>
                            <span className="font-semibold text-[#8C6830]">
                              八字依據：
                            </span>
                            {item.baziEvidence}
                          </div>
                        </div>

                        {/* Synthesis & Concrete Advice */}
                        <p className="mt-3 text-[13.5px] leading-[1.75] text-[#2F3E39]">
                          {item.synthesis}
                        </p>

                        <div className="mt-3 border-t border-[#EFEAE0] pt-2.5 text-xs leading-relaxed text-[#25332E]">
                          <span className="font-semibold text-[#152924]">
                            命理調校建議：
                          </span>
                          {item.advice}
                        </div>
                      </div>

                      <div className="mt-4 border-t border-[#EAE3D5] pt-3">
                        <button
                          type="button"
                          disabled={chatLoading}
                          onClick={() =>
                            onAskFollowUp(
                              `請針對跨體系合參偵測到的「${item.title}」（紫微：${item.ziweiEvidence}；八字：${item.baziEvidence}），進一步說明我在日常決策與今年流年應該如何具體落實「${item.advice}」？`,
                              `合參追問：${item.domain}`
                            )
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2B5B4C] transition-colors hover:text-[#152924] disabled:opacity-50"
                        >
                          針對此節點送入追問室詳解
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* Integrated Actionable Recommendations */}
            {currentAnalysis.integratedRecommendations?.length > 0 && (
              <div className="border-t border-[#ECE6DA] pt-5">
                <div className="text-xs font-semibold text-[#152924]">
                  跨體系整合命理建議（調候・格局・時機）
                </div>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                  {currentAnalysis.integratedRecommendations.map((rec, i) => (
                    <div
                      key={`${rec.focus}-${i}`}
                      className="border-t border-[#DDD6C7] pt-3"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-xs font-semibold text-[#8C6830] tabular-nums">
                          0{i + 1}
                        </span>
                        <h4 className="font-serif text-sm font-semibold text-[#152924]">
                          {rec.focus}
                        </h4>
                      </div>
                      <p className="mt-1.5 text-xs leading-[1.75] text-[#354540]">
                        {rec.action}
                      </p>
                      <div className="mt-2 text-[11.5px] text-[#6B7974]">
                        時機節奏：{rec.timingNote}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
