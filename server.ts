import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';
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

function classifyGeminiError(err: unknown): {
  status: number;
  code: string;
  message: string;
  detail?: string;
} {
  const raw = err instanceof Error ? err.message : String(err);
  console.error('[Gemini API Error]', raw.slice(0, 600));

  if (
    raw.includes('API_KEY_INVALID') ||
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('403')
  ) {
    return {
      status: 403,
      code: 'API_KEY_INVALID',
      message:
        'Gemini API 金鑰無效或權限不足，請在 AI Studio 的「Settings > Secrets」面板檢查或重新選擇 GEMINI_API_KEY。排盤與命主管理功能皆不受影響。',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('404')) {
    return {
      status: 404,
      code: 'MODEL_NOT_FOUND',
      message: '指定的 Gemini 模型暫時無法存取，請稍後再試或檢查 API 權限設定。',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      code: 'RATE_LIMIT',
      message:
        '目前 AI 解盤請求已達免費配額或頻率上限（429）。請稍候片刻點擊「重新嘗試連線」，或於 AI Studio 的「Settings > Secrets」面板切換至已啟用計費的 API 金鑰以提升配額。',
    };
  }
  return {
    status: 502,
    code: 'UPSTREAM_ERROR',
    message:
      'AI 解盤引擎暫時無法連線，請點擊重試。您的排盤數據與命主資料庫皆正常運作。',
  };
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

const SYSTEM_INSTRUCTION = `你是一位精通東方傳統命理（勸學齋紫微斗數規則、主流子平八字）與西方原型心理學（Mary K. Greer 生日塔羅密碼）的資深商用命理顧問。
請嚴格遵守以下準則：
1. 絕對以輸入 JSON 中已算好的「紫微斗數、子平八字、生日塔羅密碼」數據為唯一依據，嚴禁自行重新推算農曆、干支、四化或塔羅數字。
2. 全程使用優雅、精準、具備高階商業與心理諮詢質感的繁體中文（台灣慣用語彙 zh-TW），不宿命恐嚇、不空泛敷衍，每一項論斷都自然引用命盤中真實存在的星曜、四化、十神、五行或塔羅牌名。
3. 兼顧「東方命理的時空節奏（造命）」與「西方塔羅的原型覺察（修心）」，讓命主既看見現實佈局策略，也能照見內在心理模式。`;

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
    if (
      raw.includes('RESOURCE_EXHAUSTED') ||
      raw.includes('429') ||
      raw.includes('NOT_FOUND') ||
      raw.includes('404')
    ) {
      console.warn(
        `[Gemini Fallback] Primary model ${MODEL_NAME} unavailable (${raw.slice(0, 160)}), falling back to ${FALLBACK_MODEL_NAME}`
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

  try {
    const prompt = `請依據以下前端精密排盤系統已計算完成的「全息人生地圖 JSON 數據」，產出 Stage 1 四張精要解盤卡片。
請特別注意：
- 「紫微」部分已套用勸學齋庚干四化（太陽祿、武曲權、太陰科、天同忌），請直接使用 JSON 中的星曜與四化表。
- 「八字」部分已包含十神、藏干、星運長生與古典神煞，請適度結合重點神煞與五行結構論斷。
- 「塔羅」部分請精準引用所屬家族、人格牌、靈魂牌、陰影/導師牌（若為 19-10-1 特例或無陰影牌請明確依 JSON 說明）以及個人流年牌。
- 「當前流年運勢與心理課題」的 indicators 必須嚴格包含 事業、財運、感情、健康 四項。

命盤結構化 JSON：
${JSON.stringify(chartSummary, null, 2)}`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      systemInstruction: SYSTEM_INSTRUCTION,
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

    const parsed = JSON.parse(text);
    res.json({ summary: parsed });
  } catch (err) {
    const info = classifyGeminiError(err);
    res.status(info.status).json({ code: info.code, error: info.message });
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

  try {
    const historyTranscript =
      sanitizedHistory.length > 0
        ? `\n\n【先前諮詢對話紀錄】\n${sanitizedHistory
            .map((t) => `${t.role === 'user' ? '命主/諮詢師提問' : '顧問回覆'}：${t.content}`)
            .join('\n\n')}`
        : '';

    const fullPrompt = `【命主全息命盤結構化數據（唯一事實來源，請勿重算）】
${JSON.stringify(chartSummary, null, 2)}
${historyTranscript}

【本次深入解析／追問】
${question}

請以清晰的條理回覆（可使用小標題與條列重點，長度約 250~550 字），務必三系統交叉印證（紫微星曜四化 × 八字十神五行神煞 × 塔羅原型與流年牌），最後給出 1~2 項具體可執行的「造命行動」與「心理覺察提問」。`;

    const response = await generateWithFallback(ai, {
      contents: fullPrompt,
      systemInstruction: SYSTEM_INSTRUCTION,
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
    res.status(info.status).json({ code: info.code, error: info.message });
  }
});

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Holistic Life Map Workbench server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
