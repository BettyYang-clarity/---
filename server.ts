import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--port' && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    } else if (argv[i].startsWith('--port=')) {
      const parsed = Number(argv[i].slice('--port='.length));
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return Number(process.env.PORT || 3000);
}

const PORT = resolvePort();
const distPath = path.resolve(__dirname, 'dist');
const hasDistBuild = fs.existsSync(path.join(distPath, 'index.html'));
const isDev =
  process.env.APP_MODE === 'dev' ||
  (!hasDistBuild && process.env.NODE_ENV !== 'production');
const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isRetryableError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err);
  return (
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('429') ||
    raw.includes('503') ||
    raw.includes('UNAVAILABLE') ||
    raw.includes('DEADLINE_EXCEEDED')
  );
}

async function withBackoff<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries && isRetryableError(err)) {
        const delayMs = 1200 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function sanitizeErrorSnippet(raw: string): string {
  return raw
    .replace(/AIza[0-9A-Za-z\-_]{10,}/g, '[REDACTED_KEY]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}

function extractUpstreamReason(raw: string): string {
  try {
    const start = raw.indexOf('{');
    if (start >= 0) {
      const parsed = JSON.parse(raw.slice(start));
      const errObj = parsed?.error ?? parsed;
      const status = errObj?.status ? `${errObj.status}` : '';
      const code = errObj?.code ? `${errObj.code}` : '';
      const msg = errObj?.message ? `${errObj.message}` : '';
      const joined = [code, status, msg].filter(Boolean).join(' · ');
      if (joined) return sanitizeErrorSnippet(joined);
    }
  } catch {
    // Fallback to raw snippet
  }
  return sanitizeErrorSnippet(raw);
}

function classifyGeminiError(err: unknown): {
  status: number;
  code: string;
  message: string;
  reason?: string;
} {
  const raw = err instanceof Error ? err.message : String(err);
  const reason = extractUpstreamReason(raw);
  console.error('[Gemini API Error]', raw.slice(0, 600));

  if (
    raw.includes('API_KEY_INVALID') ||
    raw.includes('API key not valid') ||
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('403')
  ) {
    return {
      status: 403,
      code: 'API_KEY_INVALID',
      reason,
      message:
        'Gemini API 金鑰無效或權限不足，請在 AI Studio 的「Settings > Secrets」面板檢查或重新選擇 GEMINI_API_KEY。排盤與命主管理功能皆不受影響。',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 404,
      code: 'MODEL_NOT_FOUND',
      reason,
      message: '指定的 Gemini 模型暫時無法存取，請稍後再試或檢查 API 權限設定。',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      code: 'RATE_LIMIT',
      reason,
      message:
        '目前 AI 解盤請求已達免費配額或頻率上限（429）。請稍候片刻點擊「重新嘗試連線」，或於 AI Studio 的「Settings > Secrets」面板切換至已啟用計費的 API 金鑰以提升配額。',
    };
  }
  if (
    raw.includes('UNAVAILABLE') ||
    raw.includes('503') ||
    raw.includes('DEADLINE_EXCEEDED') ||
    raw.includes('overloaded')
  ) {
    return {
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      reason,
      message:
        'Gemini 上游服務暫時負載過高（503），請稍候 10 秒後點擊「重新嘗試連線」。您的排盤數據與命主資料庫皆正常運作。',
    };
  }
  return {
    status: 502,
    code: 'UPSTREAM_ERROR',
    reason,
    message:
      'AI 解盤引擎暫時無法連線，請點擊重試。您的排盤數據與命主資料庫皆正常運作。',
  };
}

function parseModelJson(rawText: string): unknown {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

const SUMMARY_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    lifeMapOverview: {
      type: Type.OBJECT,
      properties: {
        headline: {
          type: Type.STRING,
          description: '一句精煉有深度的標題（12~20字），凝練此命主的東西方全息核心特質。',
        },
        summary: {
          type: Type.STRING,
          description:
            '結合紫微命宮三方四正、八字日主五行配置、與塔羅家族及人格/靈魂牌，以專業溫潤的繁體中文撰寫 130~190 字的立體總評。',
        },
        coreThemes: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '3個精準核心天賦關鍵詞（每個 4~8 字）。',
        },
      },
      required: ['headline', 'summary', 'coreThemes'],
    },
    currentFortuneAndPsyche: {
      type: Type.OBJECT,
      properties: {
        headline: {
          type: Type.STRING,
          description: '當前運限與塔羅流年牌交會的一句總結標題（12~20字）。',
        },
        summary: {
          type: Type.STRING,
          description:
            '對照目標日期的紫微大限/流年四化、八字大運/流年十神、與 Mary K. Greer 個人流年牌，精準說明當下內外課題（110~160字）。',
        },
        indicators: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              domain: {
                type: Type.STRING,
                description: '固定為 事業、財運、感情、健康 四項之一。',
              },
              light: {
                type: Type.STRING,
                description: '紅綠黃燈號，固定為 green、yellow 或 red。',
              },
              statusLabel: {
                type: Type.STRING,
                description: '簡短狀態詞（3~5字，例如：順勢推進、穩中求進、審慎避險）。',
              },
              summary: {
                type: Type.STRING,
                description: '該領域 25~45 字精準建議，須點出對應星曜、十神或塔羅流年依據。',
              },
            },
            required: ['domain', 'light', 'statusLabel', 'summary'],
          },
          description: '依序固定包含 事業、財運、感情、健康 四筆指標。',
        },
      },
      required: ['headline', 'summary', 'indicators'],
    },
    blindSpotsAndHiddenResources: {
      type: Type.OBJECT,
      properties: {
        headline: {
          type: Type.STRING,
          description: '點出深層盲區與潛能的一句標題（12~20字）。',
        },
        blindSpots: {
          type: Type.STRING,
          description:
            '結合紫微化忌/弱宮、八字五行偏頗或空亡、與塔羅陰影/導師牌，精準指出命主容易重複卡關的心理與行為盲點（90~140字）。',
        },
        hiddenResources: {
          type: Type.STRING,
          description:
            '說明陰影牌作為導師與星曜轉化後所能釋放的隱藏優勢與資源（80~120字）。',
        },
      },
      required: ['headline', 'blindSpots', 'hiddenResources'],
    },
    actionAndAwareness: {
      type: Type.OBJECT,
      properties: {
        headline: {
          type: Type.STRING,
          description: '造命與覺察的核心行動標題（12~20字）。',
        },
        externalAction: {
          type: Type.STRING,
          description:
            '【外部趨吉避凶行動（造命）】具體可落地的現實策略、時間節奏與人際/決策建議（90~130字）。',
        },
        internalAwareness: {
          type: Type.STRING,
          description:
            '【內在心理轉念（覺察）】對應塔羅原型與星性特質的自我對話、心智轉念練習（90~130字）。',
        },
      },
      required: ['headline', 'externalAction', 'internalAwareness'],
    },
  },
  required: [
    'lifeMapOverview',
    'currentFortuneAndPsyche',
    'blindSpotsAndHiddenResources',
    'actionAndAwareness',
  ],
};

const CROSS_SYSTEM_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overallVerdict: {
      type: Type.OBJECT,
      properties: {
        headline: {
          type: Type.STRING,
          description: '精煉一句總標題（12~22字），概括紫微主星格局與八字五行強弱的整體合參關係。',
        },
        harmonyLevel: {
          type: Type.STRING,
          description:
            '固定三選一：high_synergy（高度互補協同）、dynamic_balance（剛柔動態平衡）、creative_tension（張力衝突待轉化）。',
        },
        harmonyLabel: {
          type: Type.STRING,
          description: '對應之繁體中文狀態詞（4~8字），例如：高度互補協同、剛柔動態平衡、張力衝突待轉化。',
        },
        summary: {
          type: Type.STRING,
          description:
            '110~170 字總評，從雙體系結構出發說明紫微主星氣質與八字五行強弱（身強/身弱/喜忌偏頗）如何交互影響命主一生格局。',
        },
      },
      required: ['headline', 'harmonyLevel', 'harmonyLabel', 'summary'],
    },
    ziweiPatternAnchor: {
      type: Type.OBJECT,
      properties: {
        patternTitle: {
          type: Type.STRING,
          description: '紫微主星格局名稱（例如：紫府相朝、殺破狼開創格、機月同梁穩健格、命無正曜借星格等，8~16字）。',
        },
        coreTraits: {
          type: Type.STRING,
          description: '依據命宮、身宮、三方四正與本命/流年四化，概述紫微格局的核心星性與動能（55~90字）。',
        },
      },
      required: ['patternTitle', 'coreTraits'],
    },
    baziBalanceAnchor: {
      type: Type.OBJECT,
      properties: {
        balanceTitle: {
          type: Type.STRING,
          description: '八字日主與五行強弱定性（例如：庚金身旺火煉成器、丙火偏弱喜木火生扶等，8~16字）。',
        },
        elementProfile: {
          type: Type.STRING,
          description: '依據日主、四柱五行計數、十神配置與藏干長生，說明五行偏旺/偏弱與調候喜用方向（55~90字）。',
        },
      },
      required: ['balanceTitle', 'elementProfile'],
    },
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description: '固定為 conflict（衝突張力點）或 complement（互補增益點）。',
          },
          domain: {
            type: Type.STRING,
            description: '對應領域（2~4字，例如：決策風格、事業動能、財富守成、人際互動、身心節律）。',
          },
          title: {
            type: Type.STRING,
            description: '該衝突或互補點的鮮明標題（10~18字）。',
          },
          ziweiEvidence: {
            type: Type.STRING,
            description: '引用 JSON 中真實的紫微宮位、主星亮度或四化作為依據（18~42字）。',
          },
          baziEvidence: {
            type: Type.STRING,
            description: '引用 JSON 中真實的八字日主、五行強弱、十神、星運或神煞作為依據（18~42字）。',
          },
          synthesis: {
            type: Type.STRING,
            description: '深度解釋兩套系統為何在此處產生拉扯衝突或加乘互補，以及外顯的真實行為表現（65~115字）。',
          },
          advice: {
            type: Type.STRING,
            description: '針對此點給出具體可落地的命理建議與心態/策略調校方法（55~95字）。',
          },
        },
        required: [
          'type',
          'domain',
          'title',
          'ziweiEvidence',
          'baziEvidence',
          'synthesis',
          'advice',
        ],
      },
      description: '共產出 4 筆高含金量合參項目，需同時包含至少 1 筆 conflict（衝突點）與至少 1 筆 complement（互補點）。',
    },
    integratedRecommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          focus: {
            type: Type.STRING,
            description: '建議核心面向（6~12字，例如：五行補缺與環境調候、星性收斂與授權節奏）。',
          },
          action: {
            type: Type.STRING,
            description: '具體可執行的命理調運與行為策略（55~90字）。',
          },
          timingNote: {
            type: Type.STRING,
            description: '結合當前大限/大運與流年之時機提醒（20~40字）。',
          },
        },
        required: ['focus', 'action', 'timingNote'],
      },
      description: '固定產出 3 項跨體系整合命理建議。',
    },
  },
  required: [
    'overallVerdict',
    'ziweiPatternAnchor',
    'baziBalanceAnchor',
    'findings',
    'integratedRecommendations',
  ],
};

const SYNASTRY_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    relationshipPortrait: {
      type: Type.OBJECT,
      properties: {
        headline: {
          type: Type.STRING,
          description: '一句精煉且具洞見的合盤總標題（12~22字），概括兩人在所選關係情境中的核心化學反應。',
        },
        keywords: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '3個精準關係核心關鍵詞（每個 4~8 字）。',
        },
        summary: {
          type: Type.STRING,
          description:
            '結合紫微命宮落位與飛星四化、八字日主日支與五行互補、以及塔羅合盤關係原型牌，撰寫 140~210 字的立體三系統合盤總評。',
        },
      },
      required: ['headline', 'keywords', 'summary'],
    },
    synergyHighlights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: '默契或互補亮點標題（8~16字）。',
          },
          evidence: {
            type: Type.STRING,
            description: '引用輸入 JSON 中真實的八字合會/五行互補/貴人、紫微落宮/飛星祿科、或塔羅合盤原型作為依據（18~45字）。',
          },
          insight: {
            type: Type.STRING,
            description: '說明此特質在真實相處或合作中的具體展現與價值（55~95字）。',
          },
        },
        required: ['title', 'evidence', 'insight'],
      },
      description: '固定產出 3 筆核心默契與互補優勢。',
    },
    frictionPoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: '磨合或張力盲點標題（8~16字）。',
          },
          evidence: {
            type: Type.STRING,
            description: '引用輸入 JSON 中真實的八字刑沖害剋/共同缺行、紫微飛星化權化忌落宮、或塔羅陰影課題作為依據（18~45字）。',
          },
          resolution: {
            type: Type.STRING,
            description: '客觀剖析摩擦成因，並給出可落地的溝通轉念或分工解法（60~100字）。',
          },
        },
        required: ['title', 'evidence', 'resolution'],
      },
      description: '固定產出 3 筆潛在磨合與溝通盲點。',
    },
    roleAndDynamics: {
      type: Type.OBJECT,
      properties: {
        aImpactOnB: {
          type: Type.STRING,
          description: '依據 A 落入 B 之宮位、A 飛化入 B 盤與五行生剋，說明 A 對 B 的實質影響與扮演角色（55~95字）。',
        },
        bImpactOnA: {
          type: Type.STRING,
          description: '依據 B 落入 A 之宮位、B 飛化入 A 盤與五行生剋，說明 B 對 A 的實質影響與扮演角色（55~95字）。',
        },
        currentYearRhythm: {
          type: Type.STRING,
          description: '對照目標年份兩人的紫微流年與塔羅流年牌，說明今年雙方互動的攻守節奏與注意事項（65~110字）。',
        },
      },
      required: ['aImpactOnB', 'bImpactOnA', 'currentYearRhythm'],
    },
    practicalAdvice: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          focus: {
            type: Type.STRING,
            description: '建議主題（6~12字，須緊扣所選關係情境）。',
          },
          action: {
            type: Type.STRING,
            description: '具體可執行的相處守則、分工方式或界線約定（55~90字）。',
          },
        },
        required: ['focus', 'action'],
      },
      description: '固定產出 3 條針對所選關係情境的實務相處守則。',
    },
  },
  required: [
    'relationshipPortrait',
    'synergyHighlights',
    'frictionPoints',
    'roleAndDynamics',
    'practicalAdvice',
  ],
};

const SYSTEM_INSTRUCTION = `你是一位精通東方傳統命理（勸學齋紫微斗數規則、主流子平八字）與西方原型心理學（Mary K. Greer 生日塔羅密碼）的資深商用命理顧問。
請嚴格遵守以下準則：
1. 絕對以輸入 JSON 中已算好的「紫微斗數、子平八字、生日塔羅密碼」數據為唯一依據，嚴禁自行重新推算農曆、干支、四化或塔羅數字。
2. 全程使用優雅、精準、具備高階商業與心理諮詢質感的繁體中文（台灣慣用語彙 zh-TW），不宿命恐嚇、不空泛敷衍，每一項論斷都自然引用命盤中真實存在的星曜、四化、十神、五行或塔羅牌名。
3. 兼顧「東方命理的時空節奏（造命）」與「西方塔羅的原型覺察（修心）」，讓命主既看見現實佈局策略，也能照見內在心理模式。`;

const CLIENT_SYSTEM_INSTRUCTION = `你是一位清晰、客觀、一針見血且具建設性的人生策略與運勢顧問，負責將底層東方命理與西方塔羅運算結果，轉譯成一般人也能立刻看懂並執行的重點分析與行動指引。
請嚴格遵守以下準則：
1. 嚴格以輸入 JSON 中的數據作為推論基礎，確保判斷真實有據，絕不憑空捏造或重算排盤。
2. 全程使用俐落、直白、務實的繁體中文（台灣慣用語彙 zh-TW），直接以第二人稱「你」稱呼使用者。
3. 【去術語、不說教、不煽情】：避免堆砌艱澀命理專有名詞（如三方四正、四化飛星、化忌、天干地支代碼、十二長生、劫煞空亡、十神等），也避免過度柔軟安撫或空泛心靈雞湯；請直接說清優勢、現實風險、盲點與「該攻還是該守」的具體取捨建議。
4. 聚焦在「現階段核心局勢、關鍵盲點與風險提醒、以及可立刻落地的行動步驟」，讓閱讀體驗明快、有料、具說服力。`;

const app = express();
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(getGeminiClient()) });
});

const FALLBACK_MODEL_NAME = 'gemini-3.1-flash-lite';

async function generateWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction: string;
    responseMimeType?: string;
    responseSchema?: Record<string, unknown>;
  }
) {
  try {
    return await withBackoff(
      () =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            ...(params.responseMimeType
              ? { responseMimeType: params.responseMimeType }
              : {}),
            ...(params.responseSchema
              ? { responseSchema: params.responseSchema }
              : {}),
          },
        }),
      1
    );
  } catch (primaryErr) {
    const raw =
      primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    const isAuthFailure =
      raw.includes('API_KEY_INVALID') ||
      raw.includes('API key not valid') ||
      raw.includes('PERMISSION_DENIED') ||
      raw.includes('403');
    if (!isAuthFailure) {
      console.warn(
        `[Gemini Fallback] Primary model ${MODEL_NAME} failed (${raw.slice(0, 200)}), falling back to ${FALLBACK_MODEL_NAME}`
      );
      return await withBackoff(
        () =>
          ai.models.generateContent({
            model: FALLBACK_MODEL_NAME,
            contents: params.contents,
            config: {
              systemInstruction: params.systemInstruction,
              ...(params.responseMimeType
                ? { responseMimeType: params.responseMimeType }
                : {}),
              ...(params.responseSchema
                ? { responseSchema: params.responseSchema }
                : {}),
            },
          }),
        1
      );
    }
    throw primaryErr;
  }
}

app.post('/api/reading/summary', async (req, res) => {
  const chartSummary = req.body?.chartSummary;
  if (!chartSummary || typeof chartSummary !== 'object' || !chartSummary.ziwei || !chartSummary.bazi || !chartSummary.tarot) {
    res.status(400).json({
      code: 'INVALID_INPUT',
      error: '缺少完整的結構化命盤摘要資料。',
    });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      code: 'MISSING_API_KEY',
      error: '尚未偵測到有效的 GEMINI_API_KEY，因此無法啟動 AI 雙段解盤。請於執行環境的 Secrets 設定金鑰；紫微、八字、塔羅排盤與命主資料庫皆可正常使用。',
    });
    return;
  }

  const operationMode =
    req.body?.operationMode === 'client' ? 'client' : 'consultant';

  try {
    const prompt =
      operationMode === 'client'
        ? `請依據以下已運算完成的個人全息命盤 JSON 數據，產出 4 張【清晰直白、客觀務實】的個人運勢與策略重點卡片（對象為命主本人，請用「你」稱呼，不堆砌生硬命理術語，也不要寫空泛雞湯，直接講明核心特質、今年攻守重點、現實盲點與可執行行動）：
- 「當前流年運勢與心理課題」的 indicators 必須嚴格包含 事業、財運、感情、健康 四項，每項用俐落白話點出當下局勢與具體策略。
- 語氣保持專業顧問的客觀與直接，有重點、有取捨、好執行。

底層運算參考 JSON（請轉譯為直白策略分析，不要照抄術語）：
${JSON.stringify(chartSummary, null, 2)}`
        : `請依據以下前端精密排盤系統已計算完成的「全息人生地圖 JSON 數據」，產出 Stage 1 四張精要解盤卡片。
請特別注意：
- 「紫微」部分已套用勸學齋庚干四化（太陽祿、武曲權、太陰科、天同忌），請直接使用 JSON 中的星曜與四化表。
- 「八字」部分已包含十神、藏干、星運長生與古典神煞，請適度結合重點神煞與五行結構論斷。
- 「塔羅」部分請精準引用所屬家族、人格牌、靈魂牌、陰影/導師牌（若為 19-10-1 特例或無陰影牌請明確依 JSON 說明）以及個人流年牌。
- 「當前流年運勢與心理課題」的 indicators 必須嚴格包含 事業、財運、感情、健康 四項。

命盤結構化 JSON：
${JSON.stringify(chartSummary, null, 2)}`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      systemInstruction:
        operationMode === 'client'
          ? CLIENT_SYSTEM_INSTRUCTION
          : SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: SUMMARY_RESPONSE_SCHEMA,
    });

    const text = (response.text ?? '').trim();
    if (!text) {
      res.status(502).json({
        code: 'EMPTY_RESPONSE',
        error: 'AI 解盤回應為空，請重新嘗試。',
      });
      return;
    }

    const parsed = parseModelJson(text);
    res.json({ summary: parsed });
  } catch (err) {
    const info = classifyGeminiError(err);
    res
      .status(info.status)
      .json({ code: info.code, error: info.message, reason: info.reason });
  }
});

interface ChatTurnInput {
  role: 'user' | 'assistant';
  content: string;
}

app.post('/api/reading/chat', async (req, res) => {
  const chartSummary = req.body?.chartSummary;
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  const rawHistory = Array.isArray(req.body?.history) ? req.body.history : [];

  if (!chartSummary || typeof chartSummary !== 'object' || !chartSummary.ziwei || !chartSummary.bazi || !chartSummary.tarot) {
    res.status(400).json({
      code: 'INVALID_INPUT',
      error: '缺少命盤結構化摘要資料。',
    });
    return;
  }

  if (!question || question.length > 2000) {
    res.status(400).json({
      code: 'INVALID_QUESTION',
      error: '請輸入有效問題（1 至 2000 字以內）。',
    });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      code: 'MISSING_API_KEY',
      error: '尚未設定 GEMINI_API_KEY，目前無法進行 AI 深入對話。排盤與命主資料庫功能不受影響。',
    });
    return;
  }

  // Keep only the last 10 valid turns to keep context clean and bounded
  const sanitizedHistory: ChatTurnInput[] = rawHistory
    .filter(
      (item: unknown): item is ChatTurnInput =>
        Boolean(item) &&
        typeof item === 'object' &&
        ((item as ChatTurnInput).role === 'user' || (item as ChatTurnInput).role === 'assistant') &&
        typeof (item as ChatTurnInput).content === 'string'
    )
    .slice(-10)
    .map((item: ChatTurnInput) => ({
      role: item.role,
      content: item.content.slice(0, 3000),
    }));

  const operationMode =
    req.body?.operationMode === 'client' ? 'client' : 'consultant';

  try {
    const historyTranscript =
      sanitizedHistory.length > 0
        ? `\n\n【先前諮詢對話紀錄】\n${sanitizedHistory
            .map((t) => `${t.role === 'user' ? '提問' : '顧問回覆'}：${t.content}`)
            .join('\n\n')}`
        : '';

    const fullPrompt =
      operationMode === 'client'
        ? `【底層命盤參考數據（請完全據此推論，但以清晰白話轉譯，避免艱澀術語）】
${JSON.stringify(chartSummary, null, 2)}
${historyTranscript}

【使用者的提問】
${question}

請直接以第二人稱「你」清晰、客觀地回覆（可用小標題與重點條列，約 220~450 字）。不要堆砌難懂的命理術語，也不要過度安撫煽情，直接指出核心局勢、機會與風險盲點，最後給出 1~2 個務實可落地的行動建議。`
        : `【命主全息命盤結構化數據（唯一事實來源，請勿重算）】
${JSON.stringify(chartSummary, null, 2)}
${historyTranscript}

【本次深入解析／追問】
${question}

請以清晰的條理回覆（可使用小標題與條列重點，長度約 250~550 字），務必三系統交叉印證（紫微星曜四化 × 八字十神五行神煞 × 塔羅原型與流年牌），最後給出 1~2 項具體可執行的「造命行動」與「心理覺察提問」。`;

    const response = await generateWithFallback(ai, {
      contents: fullPrompt,
      systemInstruction:
        operationMode === 'client'
          ? CLIENT_SYSTEM_INSTRUCTION
          : SYSTEM_INSTRUCTION,
    });

    const answer = (response.text ?? '').trim();
    if (!answer) {
      res.status(502).json({
        code: 'EMPTY_RESPONSE',
        error: 'AI 深入解析回應為空，請再試一次。',
      });
      return;
    }

    res.json({ reply: answer });
  } catch (err) {
    const info = classifyGeminiError(err);
    res
      .status(info.status)
      .json({ code: info.code, error: info.message, reason: info.reason });
  }
});

app.post('/api/reading/cross-system', async (req, res) => {
  const chartSummary = req.body?.chartSummary;
  if (
    !chartSummary ||
    typeof chartSummary !== 'object' ||
    !chartSummary.ziwei ||
    !chartSummary.bazi
  ) {
    res.status(400).json({
      code: 'INVALID_INPUT',
      error: '缺少完整的紫微斗數與子平八字結構化命盤資料。',
    });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      code: 'MISSING_API_KEY',
      error:
        '尚未偵測到有效的 GEMINI_API_KEY，因此無法啟動跨體系合參分析。請於執行環境的 Secrets 設定金鑰；排盤與資料庫功能不受影響。',
    });
    return;
  }

  try {
    const prompt = `請針對以下命主的「紫微斗數（勸學齋規則）」與「主流子平八字」結構化排盤數據，進行專業的【跨體系合參分析】：
核心分析任務：
1. 先分別提煉「紫微主星格局」（命宮、身宮、三方四正主星與四化結構）與「八字五行強弱」（日主強弱、五行計數偏頗、十神結構、星運長生與神煞）。
2. 自動偵測這兩套系統之間的【衝突張力點（conflict）】（例如：紫微殺破狼／化權外放敢衝，但八字日主偏弱、正印偏重或五行缺火木導致體力與底氣跟不上；或紫微天同太陰柔和，但八字七殺羊刃剛烈形成內外反差）與【互補增益點（complement）】（例如：紫微財官星曜得位，又得八字食傷生財或天乙貴人／祿神護持，相得益彰）。
3. 產出 4 筆高含金量合參項目（須同時包含 conflict 與 complement），每一筆都必須嚴格引用 JSON 中真實出現的紫微星曜/四化與八字干支/五行/十神/神煞，嚴禁編造未出現的星曜或干支。
4. 最後提出 3 項具體可落地的跨體系命理調運建議（包含實務策略與對應當前大運／流年的時機節奏）。

命盤結構化 JSON：
${JSON.stringify(chartSummary, null, 2)}`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: CROSS_SYSTEM_RESPONSE_SCHEMA,
    });

    const text = (response.text ?? '').trim();
    if (!text) {
      res.status(502).json({
        code: 'EMPTY_RESPONSE',
        error: '跨體系合參分析回應為空，請重新嘗試。',
      });
      return;
    }

    const parsed = parseModelJson(text);
    res.json({ analysis: parsed });
  } catch (err) {
    const info = classifyGeminiError(err);
    res
      .status(info.status)
      .json({ code: info.code, error: info.message, reason: info.reason });
  }
});

app.post('/api/reading/synastry', async (req, res) => {
  const synastryPayload = req.body?.synastryPayload;
  if (
    !synastryPayload ||
    typeof synastryPayload !== 'object' ||
    !synastryPayload.clientA ||
    !synastryPayload.clientB ||
    !synastryPayload.bazi ||
    !synastryPayload.ziwei ||
    !synastryPayload.tarot
  ) {
    res.status(400).json({
      code: 'INVALID_INPUT',
      error: '缺少完整的雙人合盤結構化運算資料。',
    });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      code: 'MISSING_API_KEY',
      error:
        '尚未偵測到有效的 GEMINI_API_KEY，因此無法啟動 AI 合盤深度解讀。前端三系統確定性合盤排盤結果皆可正常瀏覽。',
    });
    return;
  }

  try {
    const prompt = `請依據以下已精密計算完成的「雙人三系統合盤結構化 JSON 數據」（包含勸學齋紫微斗數落宮與命干飛星四化、子平八字日主日支沖合與五行互補貴人、以及 Mary K. Greer 生日塔羅合盤原型與陰影鏡像），針對指定的關係情境，撰寫一份高水準、客觀且具實務指導價值的深度合盤分析報告。

核心要求：
1. 所有論斷必須 100% 引用 JSON 中真實出現的干支、五行計數、宮位、四化飛星與塔羅牌名，嚴禁憑空編造或重算排盤。
2. 緊扣 relationLabel 所指明的關係情境（例如感情伴侶著重情感需求與生活默契；事業合夥著重權責分工與財務節奏；親子家人著重界線與支持；摯友知己著重價值共鳴與互動節律）。
3. 兼顧「看見彼此的真實互補（默契亮點）」與「誠實點出結構性張力（磨合盲點與具體解法）」，語氣溫潤清明、不宿命論斷。

雙人合盤結構化 JSON：
${JSON.stringify(synastryPayload, null, 2)}`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: SYNASTRY_RESPONSE_SCHEMA,
    });

    const text = (response.text ?? '').trim();
    if (!text) {
      res.status(502).json({
        code: 'EMPTY_RESPONSE',
        error: 'AI 合盤深度解讀回應為空，請重新嘗試。',
      });
      return;
    }

    const parsed = parseModelJson(text);
    res.json({ analysis: parsed });
  } catch (err) {
    const info = classifyGeminiError(err);
    res
      .status(info.status)
      .json({ code: info.code, error: info.message, reason: info.reason });
  }
});

async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader(
              'Cache-Control',
              'no-cache, no-store, must-revalidate'
            );
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader(
              'Cache-Control',
              'public, max-age=31536000, immutable'
            );
          }
        },
      })
    );
    app.use((req, res, next) => {
      if (
        (req.method === 'GET' || req.method === 'HEAD') &&
        !req.path.startsWith('/api/') &&
        !req.path.startsWith('/assets/') &&
        !path.extname(req.path)
      ) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(path.join(distPath, 'index.html'));
        return;
      }
      next();
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Holistic Life Map Workbench server running (${isDev ? 'dev' : 'prod'}) on http://0.0.0.0:${PORT}`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
