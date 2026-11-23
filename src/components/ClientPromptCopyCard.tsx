import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, Sparkles } from 'lucide-react';
import {
  AIStage1Summary,
  HolisticChartSummaryPayload,
} from '../types/holistic';

interface ClientPromptCopyCardProps {
  payload: HolisticChartSummaryPayload;
  summary: AIStage1Summary | null;
}

type PromptTopicId = 'general' | 'career' | 'wealth' | 'relationship' | 'custom';

interface PromptTopicOption {
  id: PromptTopicId;
  label: string;
  question: string;
}

const TOPIC_OPTIONS: PromptTopicOption[] = [
  {
    id: 'general',
    label: '今年整體決策',
    question:
      '請根據我的命盤結構與今年運勢節奏，直接分析今年該「進攻」還是「守成」，點出最值得把握的 2 個機會與最需避開的 2 個風險，並給出接下來半年的具體行動順序。',
  },
  {
    id: 'career',
    label: '職涯與轉型',
    question:
      '我想評估今年在事業上的下一步（包含轉職、晉升、副業或合作創業）。請結合我的先天優勢與目前流年節奏，直言分析適不適合變動、最容易踩的職場盲點，以及具體的推進時間點。',
  },
  {
    id: 'wealth',
    label: '財務與風險控管',
    question:
      '請從我的性格慣性與近期運勢波動出發，分析我在財務決策、投資或合作分潤上最容易失誤的地方，並給出今年務實的開源與避險原則。',
  },
  {
    id: 'relationship',
    label: '感情與人際盲點',
    question:
      '請直接點出我在親密關係與核心人際合作中容易重複出現的互動盲點，分析今年關係升溫或容易起摩擦的關鍵時期，並給出具體的溝通調整建議。',
  },
  {
    id: 'custom',
    label: '自訂我的問題',
    question: '',
  },
];

function buildClientExternalPrompt(
  payload: HolisticChartSummaryPayload,
  summary: AIStage1Summary | null,
  questionText: string
): string {
  const activeMut =
    payload.ziwei.mutagenTable.find(
      (m) => m.scope === payload.targetContext.activeScope
    ) ?? payload.ziwei.mutagenTable[0];

  const keyPalaceLines = payload.ziwei.keyPalaces
    .map(
      (p) =>
        `- ${p.name}(${p.ganZhi})：${p.majorStars.join('、') || '空宮'}${
          p.mutagens.length ? `［${p.mutagens.join('、')}］` : ''
        }`
    )
    .join('\n');

  const elementsLine = (['木', '火', '土', '金', '水'] as const)
    .map((el) => `${el}${payload.bazi.elementCounts[el]}`)
    .join(' / ');

  const summaryBlock = summary
    ? `\n【初步運勢摘要參考】\n- 整體定位：${summary.lifeMapOverview.headline}\n- 當期重點：${summary.currentFortuneAndPsyche.headline}\n- 核心盲點：${summary.blindSpotsAndHiddenResources.headline}\n`
    : '';

  const finalQuestion =
    questionText.trim() ||
    '請針對我目前的運勢階段，直接點出核心優勢、最需要注意的風險盲點，以及接下來 3–6 個月最務實的行動建議。';

  return `你是一位務實、客觀、一針見血的人生策略與運勢顧問。
請嚴格以我提供的【已驗證命盤事實數據】為唯一依據，切勿自行重算農曆、干支、四化或塔羅數字。

【回答風格要求】
1. 使用繁體中文（台灣慣用語），直接稱呼我「你」。
2. 語氣清晰、直白、有建設性——不要說教、不要寫空泛的心靈雞湯，也不要堆砌艱澀命理術語；請把命盤訊號直接翻譯成現實生活中的「優勢、風險、取捨建議與具體行動」。
3. 結構清楚（可用條列重點），最後附上 2–3 項接下來可立刻執行的具體步驟。

【已驗證命盤事實數據】
- 基本資料：${payload.client.name}（${payload.client.gender}）｜國曆 ${payload.client.solarBirthDate} ${payload.client.birthTime}｜農曆 ${payload.client.lunarBirthDate}
- 推演座標：${payload.targetContext.targetDate}（聚焦：${payload.targetContext.activeScopeLabel}）

1. 紫微斗數（勸學齋四化規則）：
- 五行局：${payload.ziwei.fiveElementsClass}｜命主 ${payload.ziwei.soulLord}｜身主 ${payload.ziwei.bodyLord}
- 命宮(${payload.ziwei.mingPalace.ganZhi})：${payload.ziwei.mingPalace.majorStars.join('、') || '空宮借對宮'}｜身宮落「${payload.ziwei.bodyPalace.name}」
- 當前運限：${payload.ziwei.currentDecadal}；${payload.ziwei.currentYearly}；${payload.ziwei.currentMonthly}
- 當期四化（${activeMut.label} ${activeMut.ganZhi}）：化祿 ${activeMut.lu}、化權 ${activeMut.quan}、化科 ${activeMut.ke}、化忌 ${activeMut.ji}
- 重點宮位：
${keyPalaceLines}

2. 子平八字：
- 四柱：${payload.bazi.fourPillars}
- 日主：${payload.bazi.dayMaster}｜五行分布：${elementsLine}｜日空亡：${payload.bazi.dayKongWang}
- 現行歲運：${payload.bazi.currentDecade}｜流年 ${payload.bazi.currentFlow.year}｜流月 ${payload.bazi.currentFlow.month}

3. 生日塔羅原型：
- 所屬家族：${payload.tarot.constellation}（${payload.tarot.constellationTheme}）
- 人格牌：${payload.tarot.personalityCard}｜靈魂牌：${payload.tarot.soulCard}
- 陰影／導師牌：${payload.tarot.shadowCards.length ? payload.tarot.shadowCards.join('、') : '無缺牌'}
- 個人流年牌：${payload.tarot.currentYearCard}${payload.tarot.currentYearRootCard ? `（輔助根數：${payload.tarot.currentYearRootCard}）` : ''}（週期 ${payload.tarot.yearCyclePeriod}）
${summaryBlock}
【我想深入詢問的問題】
${finalQuestion}`;
}

export const ClientPromptCopyCard: React.FC<ClientPromptCopyCardProps> = ({
  payload,
  summary,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<PromptTopicId>('general');
  const [customQuestion, setCustomQuestion] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const activeQuestion = useMemo(() => {
    if (selectedTopic === 'custom') return customQuestion;
    const found = TOPIC_OPTIONS.find((t) => t.id === selectedTopic);
    return found?.question ?? '';
  }, [selectedTopic, customQuestion]);

  const generatedPrompt = useMemo(
    () => buildClientExternalPrompt(payload, summary, activeQuestion),
    [payload, summary, activeQuestion]
  );

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedPrompt);
      } else {
        const ta = document.createElement('textarea');
        ta.value = generatedPrompt;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2600);
    } catch {
      setShowPreview(true);
    }
  };

  return (
    <section
      aria-label="複製專屬 AI 提問 Prompt"
      className="rounded-lg border border-[#DDD6C7] bg-white"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-[#ECE6DA] px-6 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="inline-flex items-center gap-2 font-serif text-base font-semibold text-[#152924]">
            <Sparkles className="h-4 w-4 text-[#8C6830]" />
            想繼續深入追問？一鍵複製專屬 AI 提問指令（Prompt）
          </h2>
          <p className="mt-0.5 text-xs text-[#6B7974]">
            已將你的精準命盤運算結果與問答框架完整打包，複製後可直接貼到你自己的 ChatGPT、Gemini 或 Claude 進行無限次深度對談。
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1.5 self-start rounded-md bg-[#152924] px-4 py-2 text-xs font-medium text-[#FAF8F3] transition-colors hover:bg-[#23433B] sm:self-center whitespace-nowrap shrink-0"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#86EFAC]" />
              已複製 Prompt
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              一鍵複製專屬 Prompt
            </>
          )}
        </button>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Topic Selector */}
        <div>
          <div className="text-xs font-medium text-[#4C5A55]">
            步驟 1：選擇想延伸討論的主題（自動套入提問指令）
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {TOPIC_OPTIONS.map((opt) => {
              const active = selectedTopic === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSelectedTopic(opt.id);
                    setCopied(false);
                  }}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'border-[#152924] bg-[#152924] text-[#FAF8F3]'
                      : 'border-[#DDD6C7] bg-[#FAF8F3] text-[#3F4D48] hover:border-[#2B5B4C] hover:text-[#152924]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Preview or Custom Input */}
        {selectedTopic === 'custom' ? (
          <div>
            <label
              htmlFor="client-custom-prompt-q"
              className="block text-xs font-medium text-[#4C5A55]"
            >
              步驟 2：輸入你想問自己 AI 的具體問題
            </label>
            <textarea
              id="client-custom-prompt-q"
              rows={3}
              value={customQuestion}
              onChange={(e) => {
                setCustomQuestion(e.target.value);
                setCopied(false);
              }}
              placeholder="例如：我目前正在考慮下半年是否離職接案，或是留在原公司爭取管理職，請結合我的流年節奏給我務實的利弊分析與時機建議。"
              className="mt-1.5 w-full rounded-md border border-[#D4CCB9] bg-[#FAF8F3] px-3.5 py-2.5 text-sm leading-relaxed text-[#1A2421] placeholder-[#82908B] focus:border-[#2B5B4C] focus:bg-white focus:outline-none"
            />
          </div>
        ) : (
          <div className="rounded-md border border-[#EAE3D5] bg-[#FAF8F3] px-4 py-3 text-xs leading-relaxed text-[#2F3E39]">
            <span className="font-semibold text-[#152924]">預設提問內容：</span>
            {activeQuestion}
          </div>
        )}

        {/* Action Row + Collapsible Prompt Preview */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE6DA] pt-3">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#2B5B4C] transition-colors hover:text-[#152924]"
          >
            {showPreview ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                收合完整 Prompt 預覽
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                檢視將複製的完整 Prompt 內容
              </>
            )}
          </button>

          <div className="flex items-center gap-3">
            {copied && (
              <span className="text-xs font-medium text-[#1E6B4B]">
                已複製到剪貼簿，直接貼上至 ChatGPT / Gemini / Claude 即可提問
              </span>
            )}
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#152924] bg-white px-3.5 py-1.5 text-xs font-medium text-[#152924] transition-colors hover:bg-[#FAF8F3]"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? '再次複製' : '複製 Prompt'}
            </button>
          </div>
        </div>

        {showPreview && (
          <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-[#DDD6C7] bg-[#FAF8F3] p-4 font-mono text-[11.5px] leading-relaxed text-[#2F3E39]">
            {generatedPrompt}
          </pre>
        )}
      </div>
    </section>
  );
};
