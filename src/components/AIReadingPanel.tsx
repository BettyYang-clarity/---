import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  AIChatMessage,
  AIStage1Summary,
  DomainFortuneIndicator,
  HolisticChartSummaryPayload,
} from '../types/holistic';
import { SafeMarkdown } from './SafeMarkdown';

interface AIReadingPanelProps {
  cacheKey: string;
  payload: HolisticChartSummaryPayload;
}

const LIGHT_STYLES: Record<
  DomainFortuneIndicator['light'],
  { bg: string; text: string; label: string }
> = {
  green: {
    bg: 'bg-[#1E6B4B]/12 border-[#1E6B4B]/30',
    text: 'text-[#1E6B4B]',
    label: '綠燈',
  },
  yellow: {
    bg: 'bg-[#A16207]/12 border-[#A16207]/30',
    text: 'text-[#925808]',
    label: '黃燈',
  },
  red: {
    bg: 'bg-[#B91C1C]/12 border-[#B91C1C]/30',
    text: 'text-[#B91C1C]',
    label: '紅燈',
  },
};

const QUICK_PROMPTS = [
  '請結合四化與塔羅流年，評估我今年適不適合轉換跑道或創業？',
  '從紫微夫妻宮、八字日支與塔羅原型，看我的親密關係相處盲點？',
  '接下來三個月在財務與合作上，最該把握與避開的節點為何？',
];

const SUMMARY_CACHE_STORAGE_KEY = 'holistic_ai_summary_cache_v1';

function loadSessionSummaryCache(): Record<string, AIStage1Summary> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(SUMMARY_CACHE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AIStage1Summary>) : {};
  } catch {
    return {};
  }
}

function saveSessionSummaryCache(cache: Record<string, AIStage1Summary>) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      SUMMARY_CACHE_STORAGE_KEY,
      JSON.stringify(cache)
    );
  } catch {
    // Ignore storage quota errors
  }
}

export const AIReadingPanel: React.FC<AIReadingPanelProps> = ({
  cacheKey,
  payload,
}) => {
  const [summaryCache, setSummaryCache] = useState<
    Record<string, AIStage1Summary>
  >(() => loadSessionSummaryCache());
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [chatByKey, setChatByKey] = useState<Record<string, AIChatMessage[]>>(
    {}
  );
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const stage2SectionRef = useRef<HTMLElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const requestSeqRef = useRef(0);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const currentSummary = summaryCache[cacheKey] ?? null;
  const currentMessages = chatByKey[cacheKey] ?? [];

  const fetchStage1Summary = async (force = false) => {
    if (!force && summaryCache[cacheKey]) {
      setSummaryError(null);
      return;
    }

    const reqId = ++requestSeqRef.current;
    setSummaryLoading(true);
    setSummaryError(null);

    try {
      const res = await fetch('/api/reading/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartSummary: payloadRef.current }),
      });

      const data = await res.json().catch(() => ({}));
      if (reqId !== requestSeqRef.current) return;

      if (!res.ok || !data.summary) {
        setSummaryError(
          data.error || 'AI 解盤服務暫時無法使用，排盤與資料庫皆不受影響。'
        );
        return;
      }

      setSummaryCache((prev) => {
        const next = {
          ...prev,
          [cacheKey]: data.summary as AIStage1Summary,
        };
        saveSessionSummaryCache(next);
        return next;
      });
    } catch {
      if (reqId !== requestSeqRef.current) return;
      setSummaryError(
        '無法連線至 AI 解盤後端，請稍後再點擊重試。排盤與命主資料庫皆正常運作。'
      );
    } finally {
      if (reqId === requestSeqRef.current) {
        setSummaryLoading(false);
      }
    }
  };

  useEffect(() => {
    setChatError(null);
    if (summaryCache[cacheKey]) {
      setSummaryError(null);
      setSummaryLoading(false);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchStage1Summary(false);
    }, 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  useEffect(() => {
    if (currentMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [currentMessages.length, chatLoading]);

  const sendStage2Question = async (questionText: string, topicTag?: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || chatLoading) return;

    const userMsg: AIChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      topicTag,
      timestamp: new Date().toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const existingHistory = chatByKey[cacheKey] ?? [];
    const updatedHistory = [...existingHistory, userMsg];

    setChatByKey((prev) => ({
      ...prev,
      [cacheKey]: updatedHistory,
    }));
    setChatInput('');
    setChatError(null);
    setChatLoading(true);

    // Smoothly bring the Stage 2 dialogue room into view when triggered from a Stage 1 card
    stage2SectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    try {
      const res = await fetch('/api/reading/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartSummary: payloadRef.current,
          question: trimmed,
          history: existingHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.reply) {
        setChatError(data.error || '深入解盤暫時無法回應，請稍後再試。');
        return;
      }

      const assistantMsg: AIChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        topicTag,
        timestamp: new Date().toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setChatByKey((prev) => ({
        ...prev,
        [cacheKey]: [...(prev[cacheKey] ?? []), assistantMsg],
      }));
    } catch {
      setChatError('網路連線異常，請稍後重試深入解析。');
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendStage2Question(chatInput);
  };

  return (
    <div className="space-y-6">
      {/* Full-Page Reading Masthead */}
      <section className="rounded-lg border border-[#DDD6C7] bg-white px-6 py-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#8C6830]">
              <Sparkles className="h-4 w-4" />
              <span>東方命理 × 西方原型 · 全息雙段式 AI 顧問報告</span>
            </div>
            <h1 className="mt-1 font-serif text-2xl font-bold text-[#152924]">
              {payload.client.name}・全息深度解盤報告
            </h1>
            <p className="mt-1 text-xs text-[#5D6B66] tabular-nums">
              {payload.client.gender}命 · 國曆 {payload.client.solarBirthDate}{' '}
              {payload.client.birthTime} · 推演座標 {payload.targetContext.targetDate}（
              {payload.targetContext.activeScopeLabel}）· 依據紫微勸學齋四化、子平八字神煞與塔羅人生密碼交叉生成
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchStage1Summary(true)}
            disabled={summaryLoading}
            className="inline-flex items-center gap-1.5 self-start rounded-md border border-[#D4CCB9] bg-[#FAF8F3] px-3.5 py-2 text-xs font-medium text-[#152924] transition-colors hover:bg-[#EFEAE0] disabled:opacity-50 sm:self-center whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${summaryLoading ? 'animate-spin' : ''}`}
            />
            重新產出解盤大綱
          </button>
        </div>
      </section>

      {/* Stage 1: Full-Width 2x2 Editorial Cards */}
      <section className="space-y-3.5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-base font-semibold text-[#152924]">
            第一階段：全息結構化大綱總覽
          </h2>
          <span className="text-xs text-[#73807B]">
            紫微斗數 × 子平八字 × Mary K. Greer 生日塔羅
          </span>
        </div>

        {/* Loading Skeleton (2x2 Grid) */}
        {summaryLoading && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-busy="true">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-lg border border-[#E5DEC9] bg-white p-6 space-y-3"
              >
                <div className="h-3.5 w-32 rounded bg-[#EAE4D7]" />
                <div className="h-5 w-3/4 rounded bg-[#EFEAE0]" />
                <div className="space-y-2 pt-2">
                  <div className="h-3.5 w-full rounded bg-[#F4F0E7]" />
                  <div className="h-3.5 w-11/12 rounded bg-[#F4F0E7]" />
                  <div className="h-3.5 w-4/5 rounded bg-[#F4F0E7]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Graceful Error Notice */}
        {!summaryLoading && summaryError && (
          <div className="rounded-lg border border-[#A63A2B]/30 bg-white p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#A63A2B]" />
              <div className="space-y-2.5">
                <div className="font-serif text-sm font-semibold text-[#A63A2B]">
                  無法載入 AI 解盤大綱
                </div>
                <p className="text-sm leading-relaxed text-[#4C5A55]">
                  {summaryError}
                </p>
                <button
                  type="button"
                  onClick={() => void fetchStage1Summary(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#D4CCB9] bg-[#FAF8F3] px-4 py-2 text-xs font-medium text-[#152924] transition-colors hover:bg-[#EFEAE0]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  重新嘗試連線
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage 1 Four Spacious Cards in 2-Column Editorial Layout */}
        {!summaryLoading && currentSummary && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Card 1: 人生地圖總評 */}
            <article className="flex flex-col justify-between rounded-lg border border-[#DDD6C7] bg-white p-6">
              <div>
                <div className="text-xs font-medium text-[#2B5B4C]">
                  01. 人生地圖總評
                </div>
                <h3 className="mt-1.5 font-serif text-lg font-semibold text-[#152924]">
                  {currentSummary.lifeMapOverview.headline}
                </h3>
                <p className="mt-3 text-[14.5px] leading-[1.8] text-[#2F3E39]">
                  {currentSummary.lifeMapOverview.summary}
                </p>
                {currentSummary.lifeMapOverview.coreThemes?.length > 0 && (
                  <div className="mt-4 border-t border-[#F0EBE0] pt-3 text-xs font-medium text-[#8C6830]">
                    核心天賦特質：
                    {currentSummary.lifeMapOverview.coreThemes.join(' · ')}
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-[#ECE6DA] pt-3.5">
                <button
                  type="button"
                  disabled={chatLoading}
                  onClick={() =>
                    void sendStage2Question(
                      '請深入解析我的性格天賦、紫微命宮三方四正、八字日主格局與神煞、以及塔羅人格／靈魂牌如何交互影響我的核心優勢與職場定位？',
                      '詳解性格天賦'
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2B5B4C] transition-colors hover:text-[#152924] disabled:opacity-50"
                >
                  深入解析：詳解性格天賦與格局定位
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>

            {/* Card 2: 當前流年運勢與心理課題 */}
            <article className="flex flex-col justify-between rounded-lg border border-[#DDD6C7] bg-white p-6">
              <div>
                <div className="text-xs font-medium text-[#8C6830]">
                  02. 當前流年運勢與心理課題
                </div>
                <h3 className="mt-1.5 font-serif text-lg font-semibold text-[#152924]">
                  {currentSummary.currentFortuneAndPsyche.headline}
                </h3>
                <p className="mt-3 text-[14.5px] leading-[1.8] text-[#2F3E39]">
                  {currentSummary.currentFortuneAndPsyche.summary}
                </p>

                {/* Spacious 2x2 Traffic-Light Grid */}
                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#F0EBE0] pt-4 sm:grid-cols-2">
                  {currentSummary.currentFortuneAndPsyche.indicators?.map(
                    (ind) => {
                      const style =
                        LIGHT_STYLES[ind.light] ?? LIGHT_STYLES.yellow;
                      return (
                        <div
                          key={ind.domain}
                          className="rounded-md border border-[#ECE6DA] bg-[#FAF8F3] p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-serif text-sm font-semibold text-[#152924]">
                              {ind.domain}
                            </span>
                            <span
                              className={`rounded border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${style.bg} ${style.text}`}
                            >
                              {style.label}・{ind.statusLabel}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-[#45534E]">
                            {ind.summary}
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              <div className="mt-5 border-t border-[#ECE6DA] pt-3.5">
                <button
                  type="button"
                  disabled={chatLoading}
                  onClick={() =>
                    void sendStage2Question(
                      '請詳解我當前大限／大運與今年流年的整體走勢，特別針對財運、事業機會與感情關係的關鍵時間點做深度分析。',
                      '詳解當前大運與流年'
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2B5B4C] transition-colors hover:text-[#152924] disabled:opacity-50"
                >
                  深入解析：詳解當前大運、財運與感情節點
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>

            {/* Card 3: 盲區與隱藏資源 */}
            <article className="flex flex-col justify-between rounded-lg border border-[#DDD6C7] bg-white p-6">
              <div>
                <div className="text-xs font-medium text-[#A63A2B]">
                  03. 盲區與隱藏資源
                </div>
                <h3 className="mt-1.5 font-serif text-lg font-semibold text-[#152924]">
                  {currentSummary.blindSpotsAndHiddenResources.headline}
                </h3>
                <div className="mt-3.5 space-y-3.5 text-[14.5px] leading-[1.8] text-[#2F3E39]">
                  <div>
                    <div className="mb-1 text-xs font-semibold text-[#A63A2B]">
                      重複卡關的慣性盲點
                    </div>
                    <p>{currentSummary.blindSpotsAndHiddenResources.blindSpots}</p>
                  </div>
                  <div className="border-t border-[#F0EBE0] pt-3">
                    <div className="mb-1 text-xs font-semibold text-[#1E6B4B]">
                      轉化後的隱藏天賦與資源
                    </div>
                    <p>
                      {
                        currentSummary.blindSpotsAndHiddenResources
                          .hiddenResources
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-[#ECE6DA] pt-3.5">
                <button
                  type="button"
                  disabled={chatLoading}
                  onClick={() =>
                    void sendStage2Question(
                      '請結合我的紫微化忌／弱宮、八字五行失衡與神煞空亡，以及塔羅陰影／導師牌，深入拆解我反覆遇到的盲區模式，以及如何把陰影轉化為助力？',
                      '詳解陰影牌課題'
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2B5B4C] transition-colors hover:text-[#152924] disabled:opacity-50"
                >
                  深入解析：詳解陰影牌與盲區轉化課題
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>

            {/* Card 4: 造命與覺察行動 */}
            <article className="flex flex-col justify-between rounded-lg border border-[#DDD6C7] bg-white p-6">
              <div>
                <div className="text-xs font-medium text-[#152924]">
                  04. 造命與覺察行動
                </div>
                <h3 className="mt-1.5 font-serif text-lg font-semibold text-[#152924]">
                  {currentSummary.actionAndAwareness.headline}
                </h3>
                <div className="mt-3.5 space-y-3.5 text-[14.5px] leading-[1.8] text-[#2F3E39]">
                  <div>
                    <div className="mb-1 text-xs font-semibold text-[#2B5B4C]">
                      外部趨吉避凶行動（造命）
                    </div>
                    <p>{currentSummary.actionAndAwareness.externalAction}</p>
                  </div>
                  <div className="border-t border-[#F0EBE0] pt-3">
                    <div className="mb-1 text-xs font-semibold text-[#8C6830]">
                      內在心理轉念練習（覺察）
                    </div>
                    <p>{currentSummary.actionAndAwareness.internalAwareness}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-[#ECE6DA] pt-3.5">
                <button
                  type="button"
                  disabled={chatLoading}
                  onClick={() =>
                    void sendStage2Question(
                      '請針對接下來的季度，幫我規劃一份具體的「造命行動清單」（外部決策與避險）與「心理覺察練習」（內在轉念與日常功課）。',
                      '詳解造命行動方案'
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2B5B4C] transition-colors hover:text-[#152924] disabled:opacity-50"
                >
                  深入解析：客製季度造命與覺察清單
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          </div>
        )}
      </section>

      {/* Stage 2: Full-Width Consultation Dialogue Room */}
      <section
        ref={stage2SectionRef}
        className="rounded-lg border border-[#DDD6C7] bg-white"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECE6DA] px-6 py-4">
          <div>
            <h2 className="inline-flex items-center gap-2 font-serif text-base font-semibold text-[#152924]">
              <MessageSquare className="h-4 w-4 text-[#2B5B4C]" />
              第二階段：深入解析與命盤追問室
            </h2>
            <p className="mt-0.5 text-xs text-[#6B7974]">
              針對同一份「紫微＋八字＋塔羅」全息結構化數據持續深挖問題，獲得三系統交叉印證的深度回覆。
            </p>
          </div>
          {currentMessages.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setChatByKey((prev) => ({ ...prev, [cacheKey]: [] }))
              }
              className="text-xs text-[#7A8782] underline-offset-4 hover:text-[#A63A2B] hover:underline"
            >
              清除對話紀錄
            </button>
          )}
        </div>

        <div className="px-6 py-5">
          {currentMessages.length === 0 ? (
            <div className="space-y-3">
              <div className="text-xs font-medium text-[#596863]">
                點擊上方任一張卡片的「深入解析」，或從以下熱門諮詢問題開始追問：
              </div>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={chatLoading}
                    onClick={() => void sendStage2Question(q)}
                    className="rounded-md border border-[#E5DEC9] bg-[#FAF8F3] px-4 py-3 text-left text-xs leading-relaxed text-[#25332E] transition-colors hover:border-[#2B5B4C] hover:bg-[#F3F8F5] disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {currentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.role === 'user'
                      ? 'ml-auto max-w-3xl rounded-lg bg-[#152924] px-5 py-3.5 text-sm leading-relaxed text-[#FAF8F3]'
                      : 'max-w-4xl rounded-lg border border-[#E5DEC9] bg-[#FAF8F3] px-5 py-4'
                  }
                >
                  <div
                    className={`mb-1.5 flex items-center justify-between text-[11px] ${
                      msg.role === 'user' ? 'text-[#A8BCB4]' : 'text-[#7A8782]'
                    }`}
                  >
                    <span className="font-medium">
                      {msg.role === 'user'
                        ? msg.topicTag || '命主／諮詢師提問'
                        : '全息命理顧問・三系統交叉詳解'}
                    </span>
                    <span className="font-mono tabular-nums">{msg.timestamp}</span>
                  </div>
                  {msg.role === 'user' ? (
                    <p>{msg.content}</p>
                  ) : (
                    <SafeMarkdown content={msg.content} />
                  )}
                </div>
              ))}
            </div>
          )}

          {chatLoading && (
            <div className="mt-4 max-w-4xl rounded-lg border border-[#E5DEC9] bg-[#FAF8F3] px-5 py-4 text-sm text-[#4C5A55]">
              正在結合紫微四化、八字十神神煞與塔羅原型進行深度推演…
            </div>
          )}

          {chatError && (
            <div className="mt-4 rounded-md border border-[#A63A2B]/30 bg-[#A63A2B]/6 px-4 py-3 text-xs text-[#A63A2B]">
              {chatError}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Full-Width Follow-Up Input Bar */}
        <form
          onSubmit={handleChatSubmit}
          className="border-t border-[#ECE6DA] bg-[#FAF8F3] px-6 py-4 rounded-b-lg"
        >
          <div className="flex items-end gap-3">
            <textarea
              rows={2}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendStage2Question(chatInput);
                }
              }}
              placeholder="針對此命盤輸入您的問題，例如：「請結合四化與塔羅流年，解釋我今年適不適合換工作？」（Enter 送出，Shift+Enter 換行）"
              className="flex-1 resize-none rounded-md border border-[#D4CCB9] bg-white px-4 py-2.5 text-sm leading-relaxed text-[#1A2421] placeholder-[#82908B] focus:border-[#2B5B4C] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md bg-[#152924] px-5 text-xs font-medium text-[#FAF8F3] transition-colors hover:bg-[#23433B] disabled:opacity-40 whitespace-nowrap"
            >
              <Send className="h-3.5 w-3.5" />
              送出追問
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
