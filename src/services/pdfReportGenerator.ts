import { jsPDF } from 'jspdf';
import {
  AICrossSystemAnalysis,
  AIStage1Summary,
  BaziChartResult,
  ClientProfile,
  FiveElement,
  HoroscopeScope,
  PdfExportSections,
  TarotChartResult,
  ZiweiChartResult,
} from '../types/holistic';
import { SCOPE_LABELS } from '../engines/holisticPayload';
import { getSanFangSiZhengIndices } from '../engines/ziweiEngine';
import { calculateTenYearTrend } from '../engines/tenYearTrendEngine';
import { calculateEmotionalFlow } from '../engines/emotionalFlowEngine';
import { calculateUpcomingAlerts } from '../engines/upcomingAlertsEngine';

export interface HolisticPdfExportInput {
  client: ClientProfile;
  ziwei: ZiweiChartResult;
  bazi: BaziChartResult;
  tarot: TarotChartResult;
  targetDate: string;
  activeScope: HoroscopeScope;
  aiSummary: AIStage1Summary | null;
  crossSystemAnalysis?: AICrossSystemAnalysis | null;
  sections?: PdfExportSections;
}

export const DEFAULT_PDF_SECTIONS: PdfExportSections = {
  scopeFocus: true,
  chartRawData: true,
  tenYearTrend: true,
  upcomingAlerts: true,
  aiSummary: true,
  emotionalFlow: true,
  crossSystem: true,
  consultantNotes: true,
};

// High-DPI A4 Canvas dimensions (210mm x 297mm @ ~192 DPI)
const PAGE_W = 1588;
const PAGE_H = 2246;
const MARGIN_X = 96;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const HEADER_SAFE_Y = 122;
const FOOTER_SAFE_Y = PAGE_H - 110;

const FONT_SERIF = '"Noto Serif TC", Georgia, serif';
const FONT_SANS = '"Noto Sans TC", -apple-system, BlinkMacSystemFont, sans-serif';
const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';

const COLORS = {
  paper: '#FAF8F3',
  white: '#FFFFFF',
  inkGreen: '#152924',
  pine: '#2B5B4C',
  gold: '#9A7B3E',
  goldLight: '#C9A861',
  vermilion: '#A63A2B',
  rose: '#9D4A54',
  slateBlue: '#244E70',
  textPrimary: '#1A2421',
  textBody: '#2F3E39',
  textMuted: '#64736D',
  hairline: '#DDD6C7',
  hairlineSoft: '#ECE6DA',
  surfaceSoft: '#F5F1E7',
  green: '#1E6B4B',
  yellow: '#925808',
  red: '#B91C1C',
};

const ELEMENT_HEX: Record<FiveElement, string> = {
  木: '#2B5B4C',
  火: '#A63A2B',
  土: '#8C6830',
  金: '#5A6068',
  水: '#244E70',
};

export interface ScopeExecutiveDigest {
  scopeLabel: string;
  headline: string;
  mutagenLabel: string;
  mutagenLine: string;
  ziweiPoint: string;
  baziPoint: string;
  tarotPoint: string;
}

/**
 * Build a concise, factual executive digest tailored strictly to the selected HoroscopeScope.
 * Shared between the PDF Report Structure Preview Modal and the rendered PDF document.
 */
export function buildScopeExecutiveDigest(
  ziwei: ZiweiChartResult,
  bazi: BaziChartResult,
  tarot: TarotChartResult,
  targetDate: string,
  scope: HoroscopeScope
): ScopeExecutiveDigest {
  const mingPalace = ziwei.palaces[ziwei.mingPalaceIndex];
  const bodyPalace = ziwei.palaces[ziwei.bodyPalaceIndex];
  const decadalPalace = ziwei.palaces[ziwei.activeDecadalInfo.index];
  const yearlyPalace = ziwei.palaces[ziwei.activeYearlyInfo.index];
  const monthlyPalace = ziwei.palaces[ziwei.activeMonthlyInfo.index];
  const dailyPalace = ziwei.palaces[ziwei.activeDailyInfo.index];

  const activeMut =
    ziwei.mutagenTable.find((m) => m.scope === scope) ?? ziwei.mutagenTable[0];
  const mutagenLine = `祿 ${activeMut.lu || '—'} · 權 ${activeMut.quan || '—'} · 科 ${activeMut.ke || '—'} · 忌 ${activeMut.ji || '—'}`;
  const mutagenLabel = `${activeMut.label}四化（${activeMut.ganZhi}）`;

  switch (scope) {
    case 'decadal':
      return {
        scopeLabel: SCOPE_LABELS.decadal,
        headline: `大限・大運十年格局專刊（${ziwei.activeDecadalInfo.range[0]}–${ziwei.activeDecadalInfo.range[1]}歲）`,
        mutagenLabel,
        mutagenLine,
        ziweiPoint: `大限命宮落本命「${decadalPalace.name}」（${ziwei.activeDecadalInfo.ganZhi}），主星：${decadalPalace.majorStars.map((s) => s.name).join('、') || '空宮借對宮'}`,
        baziPoint: bazi.targetFlow.decadePillar
          ? `現行大運「${bazi.targetFlow.decadePillar.ganZhi}」（${bazi.targetFlow.decadePillar.tenStar} · ${bazi.targetFlow.decadePillar.terrain}），神煞：${bazi.targetFlow.decadePillar.shenSha.map((s) => s.name).join('、') || '無'}`
          : '目前處於起運前童限階段，以原局四柱為底盤',
        tarotPoint: `核心家族「${tarot.constellation.name}」（人格 ${tarot.personalityCard.name} → 靈魂 ${tarot.soulCard.name}），陰影導師：${tarot.shadowCards.map((c) => c.name).join('、') || '家族完整無缺'}`,
      };
    case 'yearly':
      return {
        scopeLabel: SCOPE_LABELS.yearly,
        headline: `${targetDate.slice(0, 4)} 流年運勢與心理節律專刊（${ziwei.activeYearlyInfo.ganZhi}年）`,
        mutagenLabel,
        mutagenLine,
        ziweiPoint: `流年命宮落本命「${yearlyPalace.name}」（${ziwei.activeYearlyInfo.ganZhi}），主星：${yearlyPalace.majorStars.map((s) => s.name).join('、') || '空宮借對宮'}`,
        baziPoint: `流年「${bazi.targetFlow.yearPillar.ganZhi}」（${bazi.targetFlow.yearPillar.tenStar} · ${bazi.targetFlow.yearPillar.terrain}），神煞：${bazi.targetFlow.yearPillar.shenSha.map((s) => s.name).join('、') || '無'}`,
        tarotPoint: `個人流年牌「${tarot.currentYearCard.card.displayNumber} ${tarot.currentYearCard.card.name}」${tarot.currentYearCard.rootCard ? `（輔助根數：${tarot.currentYearCard.rootCard.name}）` : ''}，下次換牌 ${tarot.nextSwitchDate}`,
      };
    case 'monthly':
      return {
        scopeLabel: SCOPE_LABELS.monthly,
        headline: `${targetDate.slice(0, 7)} 流月節律與月令調運報告（${ziwei.activeMonthlyInfo.ganZhi}月）`,
        mutagenLabel,
        mutagenLine,
        ziweiPoint: `流月命宮落本命「${monthlyPalace.name}」（${ziwei.activeMonthlyInfo.ganZhi}），主星：${monthlyPalace.majorStars.map((s) => s.name).join('、') || '空宮借對宮'}`,
        baziPoint: `流月「${bazi.targetFlow.monthPillar.ganZhi}」（${bazi.targetFlow.monthPillar.tenStar} · ${bazi.targetFlow.monthPillar.terrain}），神煞：${bazi.targetFlow.monthPillar.shenSha.map((s) => s.name).join('、') || '無'}`,
        tarotPoint: `所屬年度流年原型「${tarot.currentYearCard.card.name}」（${tarot.currentYearCard.card.keywords.slice(0, 2).join('・')}）`,
      };
    case 'daily':
      return {
        scopeLabel: SCOPE_LABELS.daily,
        headline: `${targetDate} 流日氣場與當日推演報告（${ziwei.activeDailyInfo.ganZhi}日）`,
        mutagenLabel,
        mutagenLine,
        ziweiPoint: `流日命宮落本命「${dailyPalace.name}」（${ziwei.activeDailyInfo.ganZhi}），主星：${dailyPalace.majorStars.map((s) => s.name).join('、') || '空宮借對宮'}`,
        baziPoint: `流日「${bazi.targetFlow.dayPillar.ganZhi}」（${bazi.targetFlow.dayPillar.tenStar} · ${bazi.targetFlow.dayPillar.terrain}），神煞：${bazi.targetFlow.dayPillar.shenSha.map((s) => s.name).join('、') || '無'}`,
        tarotPoint: `當日對應個人流年牌「${tarot.currentYearCard.card.displayNumber} ${tarot.currentYearCard.card.name}」`,
      };
    case 'origin':
    default:
      return {
        scopeLabel: SCOPE_LABELS.origin,
        headline: '本命先天格局與人生底盤全息報告書',
        mutagenLabel,
        mutagenLine,
        ziweiPoint: `本命命宮（${mingPalace.heavenlyStem}${mingPalace.earthlyBranch}）主星：${mingPalace.majorStars.map((s) => s.name).join('、') || '空宮借對宮'}；身宮落「${bodyPalace.name}」`,
        baziPoint: `日主「${bazi.dayMaster.stem}」（${bazi.dayMaster.yinYang}${bazi.dayMaster.element}），日空亡 ${bazi.dayKongWang}，日柱神煞：${bazi.pillars[1].shenSha.map((s) => s.name).join('、') || '無'}`,
        tarotPoint: `人格牌「${tarot.personalityCard.name}」・靈魂牌「${tarot.soulCard.name}」・所屬「${tarot.constellation.id} 號${tarot.constellation.name}」`,
      };
  }
}

class EditorialCanvasDoc {
  pages: HTMLCanvasElement[] = [];
  ctx!: CanvasRenderingContext2D;
  y = 0;
  private clientName: string;
  private targetDate: string;
  private scopeLabel: string;
  private chapterCounter = 0;

  constructor(clientName: string, targetDate: string, scopeLabel: string) {
    this.clientName = clientName;
    this.targetDate = targetDate;
    this.scopeLabel = scopeLabel;
    this.newPage(true);
  }

  nextChapterNum(): string {
    this.chapterCounter += 1;
    return String(this.chapterCounter).padStart(2, '0');
  }

  newPage(isFirst = false) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('無法初始化 PDF 繪圖畫布');
    }
    this.pages.push(canvas);
    this.ctx = ctx;

    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    ctx.strokeStyle = COLORS.hairline;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(48, 48, PAGE_W - 96, PAGE_H - 96);

    if (!isFirst) {
      ctx.font = `500 20px ${FONT_SERIF}`;
      ctx.fillStyle = COLORS.inkGreen;
      ctx.textBaseline = 'top';
      ctx.fillText(`全息人生地圖報告・${this.clientName}`, MARGIN_X, 72);

      ctx.font = `400 18px ${FONT_MONO}`;
      ctx.fillStyle = COLORS.textMuted;
      const rightText = `${this.targetDate}（${this.scopeLabel}）`;
      const rw = ctx.measureText(rightText).width;
      ctx.fillText(rightText, PAGE_W - MARGIN_X - rw, 74);

      ctx.strokeStyle = COLORS.hairline;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, 106);
      ctx.lineTo(PAGE_W - MARGIN_X, 106);
      ctx.stroke();

      this.y = HEADER_SAFE_Y + 14;
    } else {
      this.y = 76;
    }
  }

  ensureSpace(neededHeight: number) {
    if (this.y + neededHeight > FOOTER_SAFE_Y) {
      this.newPage(false);
    }
  }

  wrapText(text: string, maxWidth: number, font: string): string[] {
    this.ctx.font = font;
    const paragraphs = text.split(/\r?\n/);
    const lines: string[] = [];

    for (const para of paragraphs) {
      if (!para.trim()) {
        lines.push('');
        continue;
      }
      let current = '';
      for (const ch of para) {
        const candidate = current + ch;
        if (this.ctx.measureText(candidate).width > maxWidth && current) {
          lines.push(current);
          current = ch;
        } else {
          current = candidate;
        }
      }
      if (current) lines.push(current);
    }
    return lines;
  }

  drawSectionHeader(title: string, subtitle?: string) {
    const num = this.nextChapterNum();
    this.ensureSpace(subtitle ? 104 : 76);
    const ctx = this.ctx;

    ctx.textBaseline = 'top';
    ctx.font = `600 22px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(num, MARGIN_X, this.y + 4);

    ctx.font = `700 30px ${FONT_SERIF}`;
    ctx.fillStyle = COLORS.inkGreen;
    ctx.fillText(title, MARGIN_X + 46, this.y);

    this.y += 40;

    if (subtitle) {
      ctx.font = `400 18.5px ${FONT_SANS}`;
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(subtitle, MARGIN_X + 46, this.y);
      this.y += 28;
    }

    ctx.strokeStyle = COLORS.inkGreen;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(MARGIN_X, this.y + 4);
    ctx.lineTo(PAGE_W - MARGIN_X, this.y + 4);
    ctx.stroke();

    this.y += 24;
  }

  drawCardBox(
    x: number,
    y: number,
    w: number,
    h: number,
    fill = COLORS.white,
    stroke = COLORS.hairline
  ) {
    const ctx = this.ctx;
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
  }

  finalizeFooters() {
    const total = this.pages.length;
    const exportedAt = new Date().toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    this.pages.forEach((canvas, idx) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const lineY = PAGE_H - 96;
      ctx.strokeStyle = COLORS.hairline;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, lineY);
      ctx.lineTo(PAGE_W - MARGIN_X, lineY);
      ctx.stroke();

      ctx.textBaseline = 'top';
      ctx.font = `400 17px ${FONT_SANS}`;
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(
        `全息人生地圖工作台｜東方命理 × 西方原型 · 報告生成日 ${exportedAt}`,
        MARGIN_X,
        lineY + 14
      );

      const pageText = `第 ${idx + 1} / ${total} 頁`;
      ctx.font = `500 17px ${FONT_MONO}`;
      const pw = ctx.measureText(pageText).width;
      ctx.fillText(pageText, PAGE_W - MARGIN_X - pw, lineY + 14);
    });
  }
}

function renderMasthead(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const { client, ziwei, bazi, tarot, targetDate, activeScope } = input;
  const ctx = doc.ctx;

  const bannerH = 228;
  ctx.fillStyle = COLORS.inkGreen;
  ctx.fillRect(MARGIN_X, doc.y, CONTENT_W, bannerH);

  ctx.strokeStyle = COLORS.goldLight;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(MARGIN_X + 12, doc.y + 12, CONTENT_W - 24, bannerH - 24);

  ctx.textBaseline = 'top';
  ctx.font = `500 18px ${FONT_SANS}`;
  ctx.fillStyle = COLORS.goldLight;
  ctx.fillText(
    `東方命理 × 西方原型 ｜ 全息人生地圖專業報告書（${SCOPE_LABELS[activeScope]}視角）`,
    MARGIN_X + 36,
    doc.y + 30
  );

  ctx.font = `700 44px ${FONT_SERIF}`;
  ctx.fillStyle = '#FAF8F3';
  ctx.fillText(`${client.name}・全息命盤報告書`, MARGIN_X + 36, doc.y + 66);

  ctx.font = `400 20px ${FONT_SANS}`;
  ctx.fillStyle = '#C9D7D2';
  const metaLine1 = `${client.gender}命  ·  生肖${ziwei.zodiac}  ·  ${ziwei.fiveElementsClass}  ·  日主 ${bazi.dayMaster.stem}（${bazi.dayMaster.yinYang}${bazi.dayMaster.element}）  ·  塔羅 ${tarot.constellation.id} 號${tarot.constellation.name}`;
  ctx.fillText(metaLine1, MARGIN_X + 36, doc.y + 132);

  ctx.font = `400 18px ${FONT_MONO}`;
  ctx.fillStyle = '#A8BCB4';
  const metaLine2 = `國曆 ${client.birthDate} ${client.birthTime}（${ziwei.time}）  |  農曆 ${ziwei.lunarDate}  |  查詢座標 ${targetDate}（${SCOPE_LABELS[activeScope]}）`;
  ctx.fillText(metaLine2, MARGIN_X + 36, doc.y + 168);

  doc.y += bannerH + 26;

  // 4-Column Executive Anchor Summary Strip
  const colW = CONTENT_W / 4;
  const stripH = 114;
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, stripH, COLORS.white, COLORS.hairline);

  const mingPalace = ziwei.palaces[ziwei.mingPalaceIndex];
  const bodyPalace = ziwei.palaces[ziwei.bodyPalaceIndex];
  const anchors = [
    {
      kicker: '紫微命宮主星',
      main: mingPalace.majorStars.map((s) => s.name).join('・') || '空宮（借對宮）',
      sub: `${mingPalace.heavenlyStem}${mingPalace.earthlyBranch}宮 · 身宮落${bodyPalace.name}`,
    },
    {
      kicker: '子平八字日主',
      main: `${bazi.dayMaster.stem}（${bazi.dayMaster.yinYang}${bazi.dayMaster.element}）`,
      sub: `日空亡 ${bazi.dayKongWang} · ${bazi.targetFlow.activeDecade ? `大運 ${bazi.targetFlow.activeDecade.ganZhi}` : '童限期'}`,
    },
    {
      kicker: '塔羅人生原型',
      main: `${tarot.personalityCard.name} / ${tarot.soulCard.name}`,
      sub: `${tarot.constellation.id} 號${tarot.constellation.name}`,
    },
    {
      kicker: '個人流年塔羅',
      main: `${tarot.currentYearCard.card.displayNumber} ${tarot.currentYearCard.card.name}`,
      sub: `下次切換 ${tarot.nextSwitchDate}`,
    },
  ];

  anchors.forEach((a, i) => {
    const cx = MARGIN_X + i * colW;
    if (i > 0) {
      ctx.strokeStyle = COLORS.hairlineSoft;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, doc.y + 16);
      ctx.lineTo(cx, doc.y + stripH - 16);
      ctx.stroke();
    }
    ctx.textBaseline = 'top';
    ctx.font = `500 17px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(a.kicker, cx + 22, doc.y + 18);

    ctx.font = `700 23px ${FONT_SERIF}`;
    ctx.fillStyle = COLORS.inkGreen;
    ctx.fillText(a.main, cx + 22, doc.y + 46);

    ctx.font = `400 16px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(a.sub, cx + 22, doc.y + 80);
  });

  doc.y += stripH + 30;
}

function renderScopeFocusSection(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const digest = buildScopeExecutiveDigest(
    input.ziwei,
    input.bazi,
    input.tarot,
    input.targetDate,
    input.activeScope
  );

  doc.drawSectionHeader(
    `選定運限核心摘要（${digest.scopeLabel}）`,
    `${digest.headline} · ${digest.mutagenLabel}：${digest.mutagenLine}`
  );

  const font = `400 18.5px ${FONT_SANS}`;
  const rows = [
    { label: '紫微焦點', color: COLORS.inkGreen, text: digest.ziweiPoint },
    { label: '八字焦點', color: COLORS.pine, text: digest.baziPoint },
    { label: '塔羅焦點', color: COLORS.gold, text: digest.tarotPoint },
  ].map((r) => ({
    ...r,
    lines: doc.wrapText(`${r.label}：${r.text}`, CONTENT_W - 48, font),
  }));

  const boxH = 34 + rows.reduce((s, r) => s + r.lines.length * 29 + 10, 0) + 10;
  doc.ensureSpace(boxH + 24);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, boxH, COLORS.white, COLORS.hairline);

  let cy = doc.y + 20;
  const ctx = doc.ctx;
  ctx.textBaseline = 'top';
  ctx.font = font;
  rows.forEach((r) => {
    r.lines.forEach((line, idx) => {
      ctx.fillStyle = idx === 0 ? r.color : COLORS.textBody;
      ctx.fillText(line, MARGIN_X + 24, cy);
      cy += 29;
    });
    cy += 10;
  });

  doc.y += boxH + 28;
}

function renderZiweiSection(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const { ziwei } = input;
  doc.drawSectionHeader(
    '紫微斗數原始命盤（勸學齋規則）',
    `命主 ${ziwei.soulLord} · 身主 ${ziwei.bodyLord} · ${ziwei.fiveElementsClass} · 庚干四化：太陽祿、武曲權、太陰科、天同忌`
  );

  const sf = getSanFangSiZhengIndices(ziwei.mingPalaceIndex);
  const sfText = [sf.self, sf.opposite, sf.triadA, sf.triadB]
    .map((idx) => {
      const p = ziwei.palaces[idx];
      const stars =
        p.majorStars
          .map(
            (s) =>
              `${s.name}${s.brightness ? `(${s.brightness})` : ''}${s.mutagen ? `[${s.mutagen}]` : ''}`
          )
          .join('、') || '空宮';
      return `${p.name}(${p.heavenlyStem}${p.earthlyBranch})：${stars}`;
    })
    .join('  ｜  ');

  const decPalace = ziwei.palaces[ziwei.activeDecadalInfo.index];
  const yrPalace = ziwei.palaces[ziwei.activeYearlyInfo.index];
  const moPalace = ziwei.palaces[ziwei.activeMonthlyInfo.index];
  const dyPalace = ziwei.palaces[ziwei.activeDailyInfo.index];
  const flowSummary = `大限命宮：本命${decPalace.name}(${ziwei.activeDecadalInfo.ganZhi}，${ziwei.activeDecadalInfo.range[0]}–${ziwei.activeDecadalInfo.range[1]}歲)  ·  流年命宮：本命${yrPalace.name}(${ziwei.activeYearlyInfo.ganZhi})  ·  流月：${moPalace.name}(${ziwei.activeMonthlyInfo.ganZhi})  ·  流日：${dyPalace.name}(${ziwei.activeDailyInfo.ganZhi})`;

  const sfLines = doc.wrapText(`命宮三方四正：${sfText}`, CONTENT_W - 44, `400 18px ${FONT_SANS}`);
  const flowLines = doc.wrapText(flowSummary, CONTENT_W - 44, `500 18px ${FONT_SANS}`);
  const boxH = 34 + sfLines.length * 28 + flowLines.length * 28 + 16;

  doc.ensureSpace(boxH + 20);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, boxH, COLORS.white, COLORS.hairline);

  let cy = doc.y + 18;
  doc.ctx.textBaseline = 'top';
  doc.ctx.font = `400 18px ${FONT_SANS}`;
  doc.ctx.fillStyle = COLORS.textBody;
  sfLines.forEach((line) => {
    doc.ctx.fillText(line, MARGIN_X + 22, cy);
    cy += 28;
  });
  cy += 6;
  doc.ctx.font = `500 18px ${FONT_SANS}`;
  doc.ctx.fillStyle = COLORS.pine;
  flowLines.forEach((line) => {
    doc.ctx.fillText(line, MARGIN_X + 22, cy);
    cy += 28;
  });
  doc.y += boxH + 18;

  // Four Transformations Table
  const mutHeaderH = 40;
  const mutRowH = 38;
  const mutTableH = mutHeaderH + ziwei.mutagenTable.length * mutRowH;
  doc.ensureSpace(mutTableH + 24);

  const mutCols = [240, 290, 290, 290, CONTENT_W - 1110];
  const mutHeaders = ['運限層級（干支）', '化祿（資源・順勢）', '化權（主導・開創）', '化科（名聲・貴人）', '化忌（執著・課題）'];

  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, mutTableH, COLORS.white, COLORS.hairline);
  doc.ctx.fillStyle = COLORS.surfaceSoft;
  doc.ctx.fillRect(MARGIN_X, doc.y, CONTENT_W, mutHeaderH);

  let colX = MARGIN_X;
  doc.ctx.textBaseline = 'middle';
  mutHeaders.forEach((h, i) => {
    doc.ctx.font = `600 17px ${FONT_SANS}`;
    doc.ctx.fillStyle =
      i === 1 ? COLORS.green : i === 2 ? '#3B4D8F' : i === 3 ? '#0F6D7A' : i === 4 ? COLORS.red : COLORS.inkGreen;
    doc.ctx.fillText(h, colX + 16, doc.y + mutHeaderH / 2);
    colX += mutCols[i];
  });

  ziwei.mutagenTable.forEach((row, rIdx) => {
    const ry = doc.y + mutHeaderH + rIdx * mutRowH;
    if (row.scope === input.activeScope) {
      doc.ctx.fillStyle = '#FAF4E8';
      doc.ctx.fillRect(MARGIN_X + 1, ry, CONTENT_W - 2, mutRowH);
    }
    doc.ctx.strokeStyle = COLORS.hairlineSoft;
    doc.ctx.lineWidth = 1;
    doc.ctx.beginPath();
    doc.ctx.moveTo(MARGIN_X, ry);
    doc.ctx.lineTo(MARGIN_X + CONTENT_W, ry);
    doc.ctx.stroke();

    const vals = [`${row.label}（${row.ganZhi}）`, row.lu, row.quan, row.ke, row.ji];
    let rx = MARGIN_X;
    vals.forEach((v, cIdx) => {
      doc.ctx.font = cIdx === 0 ? `600 18px ${FONT_SERIF}` : `500 18px ${FONT_SANS}`;
      doc.ctx.fillStyle = cIdx === 0 ? COLORS.inkGreen : COLORS.textBody;
      doc.ctx.fillText(v || '—', rx + 16, ry + mutRowH / 2);
      rx += mutCols[cIdx];
    });
  });

  doc.y += mutTableH + 18;

  // Key 7 Palaces Compact Grid
  const keyNames = ['命宮', '財帛', '官祿', '遷移', '夫妻', '福德', '疾厄'];
  const keyPalaces = keyNames
    .map((n) => ziwei.palaces.find((p) => p.name === n))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const pHeaderH = 38;
  const pRowH = 40;
  const pTableH = pHeaderH + keyPalaces.length * pRowH;
  doc.ensureSpace(pTableH + 30);

  const pCols = [190, 440, 440, CONTENT_W - 1070];
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, pTableH, COLORS.white, COLORS.hairline);
  doc.ctx.fillStyle = COLORS.surfaceSoft;
  doc.ctx.fillRect(MARGIN_X, doc.y, CONTENT_W, pHeaderH);

  const pHeaders = ['重點宮位（干支）', '主星（亮度・本命四化）', '輔星吉煞', '大限歲數'];
  let px = MARGIN_X;
  doc.ctx.textBaseline = 'middle';
  pHeaders.forEach((h, i) => {
    doc.ctx.font = `600 17px ${FONT_SANS}`;
    doc.ctx.fillStyle = COLORS.inkGreen;
    doc.ctx.fillText(h, px + 16, doc.y + pHeaderH / 2);
    px += pCols[i];
  });

  keyPalaces.forEach((p, idx) => {
    const ry = doc.y + pHeaderH + idx * pRowH;
    doc.ctx.strokeStyle = COLORS.hairlineSoft;
    doc.ctx.beginPath();
    doc.ctx.moveTo(MARGIN_X, ry);
    doc.ctx.lineTo(MARGIN_X + CONTENT_W, ry);
    doc.ctx.stroke();

    const majorStr =
      p.majorStars
        .map(
          (s) =>
            `${s.name}${s.brightness ? `(${s.brightness})` : ''}${s.mutagen ? `[${s.mutagen}]` : ''}`
        )
        .join('、') || '空宮';
    const minorStr = p.minorStars.map((s) => s.name).join('、') || '—';
    const nameStr = `${p.name}${p.isBodyPalace ? '[身]' : ''}（${p.heavenlyStem}${p.earthlyBranch}）`;
    const ageStr = `${p.decadalRange[0]}–${p.decadalRange[1]}歲`;

    const rowVals = [nameStr, majorStr, minorStr, ageStr];
    let rx = MARGIN_X;
    rowVals.forEach((v, cIdx) => {
      doc.ctx.font =
        cIdx === 0
          ? `600 17px ${FONT_SERIF}`
          : cIdx === 3
            ? `400 17px ${FONT_MONO}`
            : `400 17px ${FONT_SANS}`;
      doc.ctx.fillStyle = cIdx === 1 ? COLORS.vermilion : COLORS.textBody;
      let display = v;
      const maxW = pCols[cIdx] - 28;
      while (doc.ctx.measureText(display).width > maxW && display.length > 4) {
        display = `${display.slice(0, -2)}…`;
      }
      doc.ctx.fillText(display, rx + 16, ry + pRowH / 2);
      rx += pCols[cIdx];
    });
  });

  doc.y += pTableH + 34;
}

function renderBaziSection(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const { bazi } = input;
  doc.drawSectionHeader(
    '主流子平八字（四柱・神煞・大運流運）',
    `日主 ${bazi.dayMaster.stem}（${bazi.dayMaster.yinYang}${bazi.dayMaster.element}） · ${bazi.startAgeDescription}（${bazi.isForward ? '順行' : '逆行'}） · 日空亡 ${bazi.dayKongWang}`
  );

  const flowCols = [
    ...(bazi.targetFlow.decadePillar ? [bazi.targetFlow.decadePillar] : []),
    bazi.targetFlow.yearPillar,
  ];

  const cols = [
    ...flowCols.map((fp) => ({
      title: `${fp.label}`,
      sub: fp.subLabel,
      tenStar: fp.tenStar,
      stem: fp.stem,
      branch: fp.branch,
      stemEl: fp.stemElement,
      branchEl: fp.branchElement,
      hidden: fp.hiddenStems.map((h) => `${h.stem}(${h.tenStar})`).join(' '),
      terrain: fp.terrain,
      sound: fp.sound,
      kongWang: fp.kongWang,
      shenSha: fp.shenSha.map((s) => s.name).join('、') || '—',
      isFlow: true,
      isDay: false,
    })),
    ...bazi.pillars.map((p) => ({
      title: p.label,
      sub: p.isDayMaster ? '日主' : '',
      tenStar: p.tenStar,
      stem: p.stem,
      branch: p.branch,
      stemEl: p.stemElement,
      branchEl: p.branchElement,
      hidden: p.hiddenStems.map((h) => `${h.stem}(${h.tenStar})`).join(' '),
      terrain: p.terrain,
      sound: p.sound,
      kongWang: p.kongWang,
      shenSha: p.shenSha.map((s) => s.name).join('、') || '—',
      isFlow: false,
      isDay: Boolean(p.isDayMaster),
    })),
  ];

  const labelColW = 148;
  const dataColW = (CONTENT_W - labelColW) / cols.length;

  const shenShaFont = `400 15.5px ${FONT_SANS}`;
  const shenShaWrapped = cols.map((c) => doc.wrapText(c.shenSha, dataColW - 20, shenShaFont));
  const maxShenShaLines = Math.max(1, ...shenShaWrapped.map((l) => l.length));
  const shenShaRowH = Math.max(54, maxShenShaLines * 22 + 20);

  const hiddenFont = `400 15.5px ${FONT_SANS}`;
  const hiddenWrapped = cols.map((c) => doc.wrapText(c.hidden, dataColW - 20, hiddenFont));
  const maxHiddenLines = Math.max(1, ...hiddenWrapped.map((l) => l.length));
  const hiddenRowH = Math.max(54, maxHiddenLines * 22 + 18);

  const rowDefs = [
    { name: '柱位', h: 52 },
    { name: '主星十神', h: 38 },
    { name: '天干地支', h: 96 },
    { name: '地支藏干', h: hiddenRowH },
    { name: '星運長生', h: 38 },
    { name: '納音五行', h: 38 },
    { name: '旬空空亡', h: 38 },
    { name: '古典神煞', h: shenShaRowH },
  ];
  const totalTableH = rowDefs.reduce((s, r) => s + r.h, 0);

  doc.ensureSpace(totalTableH + 24);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, totalTableH, COLORS.white, COLORS.hairline);

  const ctx = doc.ctx;
  let ry = doc.y;

  cols.forEach((col, i) => {
    const cx = MARGIN_X + labelColW + i * dataColW;
    if (col.isFlow) {
      ctx.fillStyle = '#FAF4E8';
      ctx.fillRect(cx, doc.y, dataColW, totalTableH);
    } else if (col.isDay) {
      ctx.fillStyle = '#F3F7F5';
      ctx.fillRect(cx, doc.y, dataColW, totalTableH);
    }
  });

  ctx.fillStyle = COLORS.surfaceSoft;
  ctx.fillRect(MARGIN_X, doc.y, labelColW, totalTableH);

  rowDefs.forEach((row, rIdx) => {
    if (rIdx > 0) {
      ctx.strokeStyle = COLORS.hairlineSoft;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, ry);
      ctx.lineTo(MARGIN_X + CONTENT_W, ry);
      ctx.stroke();
    }

    ctx.textBaseline = 'middle';
    ctx.font = `600 17px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(row.name, MARGIN_X + 18, ry + row.h / 2);

    cols.forEach((col, cIdx) => {
      const cx = MARGIN_X + labelColW + cIdx * dataColW;
      const centerX = cx + dataColW / 2;
      ctx.textAlign = 'center';

      if (rIdx === 0) {
        ctx.font = `700 20px ${FONT_SERIF}`;
        ctx.fillStyle = col.isFlow ? COLORS.gold : COLORS.inkGreen;
        ctx.fillText(col.title, centerX, ry + (col.sub ? 18 : row.h / 2));
        if (col.sub) {
          ctx.font = `500 14px ${FONT_SANS}`;
          ctx.fillStyle = col.isDay ? COLORS.vermilion : COLORS.gold;
          ctx.fillText(col.sub, centerX, ry + 39);
        }
      } else if (rIdx === 1) {
        ctx.font = `600 17px ${FONT_SANS}`;
        ctx.fillStyle = col.isDay ? COLORS.vermilion : COLORS.pine;
        ctx.fillText(col.tenStar, centerX, ry + row.h / 2);
      } else if (rIdx === 2) {
        ctx.font = `700 36px ${FONT_SERIF}`;
        ctx.fillStyle = ELEMENT_HEX[col.stemEl];
        ctx.fillText(col.stem, centerX, ry + 28);
        ctx.fillStyle = ELEMENT_HEX[col.branchEl];
        ctx.fillText(col.branch, centerX, ry + 70);
      } else if (rIdx === 3) {
        ctx.font = hiddenFont;
        ctx.fillStyle = COLORS.textBody;
        ctx.textBaseline = 'top';
        let ly = ry + 10;
        hiddenWrapped[cIdx].forEach((l) => {
          ctx.fillText(l, centerX, ly);
          ly += 22;
        });
      } else if (rIdx === 4) {
        ctx.font = `600 17px ${FONT_SANS}`;
        ctx.fillStyle = COLORS.pine;
        ctx.fillText(col.terrain, centerX, ry + row.h / 2);
      } else if (rIdx === 5) {
        ctx.font = `400 16px ${FONT_SANS}`;
        ctx.fillStyle = COLORS.textBody;
        ctx.fillText(col.sound, centerX, ry + row.h / 2);
      } else if (rIdx === 6) {
        ctx.font = `500 17px ${FONT_SERIF}`;
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText(col.kongWang, centerX, ry + row.h / 2);
      } else if (rIdx === 7) {
        ctx.font = shenShaFont;
        ctx.fillStyle = COLORS.textBody;
        ctx.textBaseline = 'top';
        let ly = ry + 10;
        shenShaWrapped[cIdx].forEach((l) => {
          ctx.fillText(l, centerX, ly);
          ly += 22;
        });
      }
      ctx.textAlign = 'left';
    });

    ry += row.h;
  });

  ctx.strokeStyle = COLORS.hairlineSoft;
  ctx.lineWidth = 1;
  for (let i = 0; i < cols.length; i++) {
    const vx = MARGIN_X + labelColW + i * dataColW;
    ctx.beginPath();
    ctx.moveTo(vx, doc.y);
    ctx.lineTo(vx, doc.y + totalTableH);
    ctx.stroke();
  }

  doc.y += totalTableH + 18;

  // Five Elements + Decade Fortunes Strip
  const stripH = 120;
  doc.ensureSpace(stripH + 28);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, stripH, COLORS.white, COLORS.hairline);

  ctx.textBaseline = 'top';
  ctx.font = `600 17px ${FONT_SANS}`;
  ctx.fillStyle = COLORS.inkGreen;
  ctx.fillText('原局五行分佈（干支八字計數）', MARGIN_X + 22, doc.y + 16);

  const elements: FiveElement[] = ['木', '火', '土', '金', '水'];
  elements.forEach((el, idx) => {
    const ex = MARGIN_X + 290 + idx * 145;
    ctx.font = `700 20px ${FONT_SERIF}`;
    ctx.fillStyle = ELEMENT_HEX[el];
    ctx.fillText(`${el}：${bazi.elementCounts[el]}`, ex, doc.y + 14);
  });

  ctx.strokeStyle = COLORS.hairlineSoft;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X + 20, doc.y + 52);
  ctx.lineTo(MARGIN_X + CONTENT_W - 20, doc.y + 52);
  ctx.stroke();

  ctx.font = `600 16px ${FONT_SANS}`;
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('大運序列：', MARGIN_X + 22, doc.y + 72);

  const decadeList = bazi.decadeFortunes
    .slice(0, 8)
    .map((d) => `${d.ganZhi}(${d.startAge}歲)`)
    .join('  →  ');
  ctx.font = `500 17px ${FONT_SANS}`;
  ctx.fillStyle = COLORS.textBody;
  ctx.fillText(decadeList, MARGIN_X + 112, doc.y + 71);

  doc.y += stripH + 34;
}

function renderTarotSection(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const { tarot } = input;
  doc.drawSectionHeader(
    'Mary K. Greer 生日塔羅密碼',
    `所屬家族：${tarot.constellation.id} 號${tarot.constellation.name}（${tarot.constellation.title}） · 驗算公式：${tarot.birthSumFormula}`
  );

  const gap = 20;
  const cardW = (CONTENT_W - gap) / 2;
  const cardDefs = [
    {
      role: '人格牌（Personality Card）',
      accent: COLORS.inkGreen,
      title: `No.${tarot.personalityCard.displayNumber}  ${tarot.personalityCard.name}（${tarot.personalityCard.englishName}）`,
      sub: `關鍵詞：${tarot.personalityCard.keywords.join('・')}`,
      desc: tarot.personalityCard.essence,
    },
    {
      role: tarot.isSamePersonalitySoul ? '靈魂牌（同人格牌）' : '靈魂牌（Soul Card）',
      accent: COLORS.pine,
      title: `No.${tarot.soulCard.displayNumber}  ${tarot.soulCard.name}（${tarot.soulCard.englishName}）`,
      sub: `光明展現：${tarot.soulCard.lightSide}`,
      desc: tarot.soulCard.growthLesson,
    },
    {
      role: '陰影／導師牌（Hidden Factor）',
      accent: COLORS.vermilion,
      title:
        tarot.shadowCards.length > 0
          ? tarot.shadowCards.map((c) => `No.${c.displayNumber} ${c.name}`).join('  /  ')
          : tarot.isSpecialCase19
            ? '19 太陽 - 10 命運之輪 - 1 魔術師（三星連動無陰影）'
            : '本家族成員全數顯化（無陰影缺牌）',
      sub:
        tarot.shadowCards.length > 0
          ? `陰影提醒：${tarot.shadowCards[0].shadowSide}`
          : tarot.constellation.theme,
      desc:
        tarot.shadowCards.length > 0
          ? `轉化導師課：${tarot.shadowCards[0].growthLesson}`
          : '具備完整家族光譜整合潛能。',
    },
    {
      role: `個人流年牌（${tarot.currentYearCard.cycleYear} 週期）`,
      accent: COLORS.gold,
      title: `No.${tarot.currentYearCard.card.displayNumber}  ${tarot.currentYearCard.card.name}${
        tarot.currentYearCard.rootCard ? `  →  輔助根數：${tarot.currentYearCard.rootCard.name}` : ''
      }`,
      sub: `週期：${tarot.currentYearCard.periodStart} 至 ${tarot.currentYearCard.periodEnd}（下次切換 ${tarot.nextSwitchDate}）`,
      desc: tarot.currentYearCard.card.essence,
    },
  ];

  const cardH = 178;
  for (let row = 0; row < 2; row++) {
    doc.ensureSpace(cardH + 20);
    for (let col = 0; col < 2; col++) {
      const def = cardDefs[row * 2 + col];
      const cx = MARGIN_X + col * (cardW + gap);
      const cy = doc.y;
      doc.drawCardBox(cx, cy, cardW, cardH, COLORS.white, COLORS.hairline);

      const ctx = doc.ctx;
      ctx.textBaseline = 'top';
      ctx.font = `600 15.5px ${FONT_SANS}`;
      ctx.fillStyle = def.accent;
      ctx.fillText(def.role, cx + 20, cy + 16);

      ctx.font = `700 21px ${FONT_SERIF}`;
      ctx.fillStyle = COLORS.inkGreen;
      const tLines = doc.wrapText(def.title, cardW - 40, `700 21px ${FONT_SERIF}`);
      ctx.fillText(tLines[0] ?? '', cx + 20, cy + 42);

      ctx.font = `500 15.5px ${FONT_SANS}`;
      ctx.fillStyle = COLORS.textMuted;
      const subLines = doc.wrapText(def.sub, cardW - 40, `500 15.5px ${FONT_SANS}`);
      ctx.fillText(subLines[0] ?? '', cx + 20, cy + 74);

      ctx.font = `400 16px ${FONT_SANS}`;
      ctx.fillStyle = COLORS.textBody;
      const descLines = doc.wrapText(def.desc, cardW - 40, `400 16px ${FONT_SANS}`);
      let dy = cy + 104;
      descLines.slice(0, 3).forEach((l) => {
        ctx.fillText(l, cx + 20, dy);
        dy += 22;
      });
    }
    doc.y += cardH + 18;
  }

  // 5-Year Tarot Trajectory Bar
  const trajH = 82;
  doc.ensureSpace(trajH + 30);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, trajH, COLORS.white, COLORS.hairline);
  const tColW = CONTENT_W / tarot.yearTrajectory.length;
  tarot.yearTrajectory.forEach((entry, idx) => {
    const tx = MARGIN_X + idx * tColW;
    if (entry.isCurrent) {
      doc.ctx.fillStyle = '#FAF4E8';
      doc.ctx.fillRect(tx + 1, doc.y + 1, tColW - 2, trajH - 2);
    }
    if (idx > 0) {
      doc.ctx.strokeStyle = COLORS.hairlineSoft;
      doc.ctx.beginPath();
      doc.ctx.moveTo(tx, doc.y + 12);
      doc.ctx.lineTo(tx, doc.y + trajH - 12);
      doc.ctx.stroke();
    }
    doc.ctx.textAlign = 'center';
    doc.ctx.textBaseline = 'top';
    doc.ctx.font = `500 15px ${FONT_MONO}`;
    doc.ctx.fillStyle = entry.isCurrent ? COLORS.gold : COLORS.textMuted;
    doc.ctx.fillText(`${entry.cycleYear}${entry.isCurrent ? ' (當期)' : ''}`, tx + tColW / 2, doc.y + 14);

    doc.ctx.font = `700 20px ${FONT_SERIF}`;
    doc.ctx.fillStyle = COLORS.inkGreen;
    doc.ctx.fillText(`${entry.card.displayNumber} ${entry.card.name}`, tx + tColW / 2, doc.y + 42);
    doc.ctx.textAlign = 'left';
  });

  doc.y += trajH + 34;
}

function renderTenYearTrendSection(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const trend = calculateTenYearTrend(input.client, input.targetDate);
  doc.drawSectionHeader(
    `未來十年運程趨勢與關鍵轉折點（${trend.startYear}–${trend.endYear}）`,
    `整合紫微流年四化・八字歲運長生神煞・塔羅個人流年牌 · 十年均勢 ${trend.averageScore} · 高峰 ${trend.peakPoint.year}(${trend.peakPoint.compositeScore}) · 築底 ${trend.troughPoint.year}(${trend.troughPoint.compositeScore})`
  );

  // Canvas2D high-DPI Line Chart
  const chartBoxH = 380;
  doc.ensureSpace(chartBoxH + 24);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, chartBoxH, COLORS.white, COLORS.hairline);

  const ctx = doc.ctx;
  const padL = 78;
  const padR = 46;
  const padT = 56;
  const padB = 64;
  const plotX = MARGIN_X + padL;
  const plotY = doc.y + padT;
  const plotW = CONTENT_W - padL - padR;
  const plotH = chartBoxH - padT - padB;

  const xOf = (year: number) =>
    plotX + ((year - trend.startYear) / Math.max(1, trend.endYear - trend.startYear)) * plotW;
  const yOf = (score: number) => plotY + ((100 - score) / 80) * plotH;

  // Gridlines & Y labels
  [20, 40, 60, 80, 100].forEach((val) => {
    const gy = yOf(val);
    ctx.strokeStyle = val === 60 ? '#CFC7B5' : COLORS.hairlineSoft;
    ctx.lineWidth = val === 60 ? 1.5 : 1;
    ctx.setLineDash(val === 60 ? [6, 6] : []);
    ctx.beginPath();
    ctx.moveTo(plotX, gy);
    ctx.lineTo(plotX + plotW, gy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.font = `400 15px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(String(val), plotX - 14, gy);
  });
  ctx.textAlign = 'left';

  // Legend top right
  ctx.textBaseline = 'top';
  ctx.font = `500 15px ${FONT_SANS}`;
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText(
    '實線：全息綜合指數（0–100）  ·  菱形：換大運／大限  ·  綠環：高峰  ·  紅環：築底  ·  金環：轉折',
    plotX,
    doc.y + 18
  );

  // Decade shift vertical dashed rules
  trend.points
    .filter((p) => p.turningPoint?.kind === 'decade_shift')
    .forEach((p) => {
      const sx = xOf(p.year);
      ctx.strokeStyle = COLORS.goldLight;
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(sx, plotY - 8);
      ctx.lineTo(sx, plotY + plotH);
      ctx.stroke();
      ctx.setLineDash([]);
    });

  // Soft Area Fill
  const areaGrad = ctx.createLinearGradient(0, plotY, 0, plotY + plotH);
  areaGrad.addColorStop(0, 'rgba(43, 91, 76, 0.16)');
  areaGrad.addColorStop(1, 'rgba(250, 248, 243, 0)');
  ctx.beginPath();
  trend.points.forEach((p, idx) => {
    const px = xOf(p.year);
    const py = yOf(p.compositeScore);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.lineTo(xOf(trend.endYear), plotY + plotH);
  ctx.lineTo(xOf(trend.startYear), plotY + plotH);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Primary Line
  ctx.beginPath();
  trend.points.forEach((p, idx) => {
    const px = xOf(p.year);
    const py = yOf(p.compositeScore);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = COLORS.inkGreen;
  ctx.lineWidth = 3.2;
  ctx.stroke();

  // X Labels + Nodes + Turning Point Callouts
  trend.points.forEach((p, idx) => {
    const px = xOf(p.year);
    const py = yOf(p.compositeScore);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `600 16px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.inkGreen;
    ctx.fillText(String(p.year), px, plotY + plotH + 12);

    ctx.font = `400 14.5px ${FONT_SANS}`;
    ctx.fillStyle = p.turningPoint ? COLORS.gold : COLORS.textMuted;
    ctx.fillText(p.ganZhi, px, plotY + plotH + 34);

    if (p.turningPoint) {
      const tpColor =
        p.turningPoint.kind === 'decade_shift'
          ? COLORS.gold
          : p.turningPoint.kind === 'peak'
            ? COLORS.green
            : p.turningPoint.kind === 'trough'
              ? COLORS.vermilion
              : '#B45309';

      if (p.turningPoint.kind === 'decade_shift') {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = tpColor;
        ctx.fillRect(-7, -7, 14, 14);
        ctx.strokeStyle = COLORS.white;
        ctx.lineWidth = 2;
        ctx.strokeRect(-7, -7, 14, 14);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.white;
        ctx.fill();
        ctx.strokeStyle = tpColor;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      const preferBelow = p.turningPoint.kind === 'trough' || py < plotY + 34;
      ctx.font = `600 15px ${FONT_SANS}`;
      ctx.fillStyle = tpColor;
      ctx.textAlign = idx === 0 ? 'left' : idx === trend.points.length - 1 ? 'right' : 'center';
      ctx.fillText(
        `${p.turningPoint.shortTag} ${p.compositeScore}`,
        px,
        preferBelow ? py + 14 : py - 28
      );
    } else {
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.paper;
      ctx.fill();
      ctx.strokeStyle = COLORS.inkGreen;
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }
    ctx.textAlign = 'left';
  });

  doc.y += chartBoxH + 18;

  // Turning Points Summary List
  if (trend.turningPoints.length > 0) {
    const rowFont = `400 16.5px ${FONT_SANS}`;
    const wrapped = trend.turningPoints.map((pt) => ({
      pt,
      lines: doc.wrapText(pt.turningPoint!.reason, CONTENT_W - 290, rowFont),
    }));
    const listH =
      24 + wrapped.reduce((s, w) => s + Math.max(46, w.lines.length * 24 + 18), 0);
    doc.ensureSpace(listH + 26);
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, listH, COLORS.white, COLORS.hairline);

    let ry = doc.y + 12;
    wrapped.forEach((w, idx) => {
      const rowH = Math.max(46, w.lines.length * 24 + 18);
      if (idx > 0) {
        ctx.strokeStyle = COLORS.hairlineSoft;
        ctx.beginPath();
        ctx.moveTo(MARGIN_X + 16, ry);
        ctx.lineTo(MARGIN_X + CONTENT_W - 16, ry);
        ctx.stroke();
      }
      ctx.textBaseline = 'top';
      ctx.font = `700 17px ${FONT_MONO}`;
      ctx.fillStyle = COLORS.inkGreen;
      ctx.fillText(`${w.pt.year} ${w.pt.ganZhi}`, MARGIN_X + 20, ry + 10);

      ctx.font = `600 15.5px ${FONT_SANS}`;
      ctx.fillStyle = COLORS.gold;
      ctx.fillText(`${w.pt.turningPoint!.label}（${w.pt.compositeScore}）`, MARGIN_X + 20, ry + 32);

      ctx.font = rowFont;
      ctx.fillStyle = COLORS.textBody;
      let ly = ry + 10;
      w.lines.forEach((l) => {
        ctx.fillText(l, MARGIN_X + 265, ly);
        ly += 24;
      });
      ry += rowH;
    });

    doc.y += listH + 30;
  }
}

function renderUpcomingAlertsSection(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const alerts = calculateUpcomingAlerts(input.client, input.targetDate);
  doc.drawSectionHeader(
    '重要節氣／運程通知（未來三個月波動期）',
    `監測區間 ${alerts.baseDate} 至 ${alerts.endDate} · 流年轉折底盤：${alerts.annualContextTitle}`
  );

  const ctx = doc.ctx;
  const bodyFont = `400 16.5px ${FONT_SANS}`;

  alerts.items.forEach((item) => {
    const sumLines = doc.wrapText(item.summary, CONTENT_W - 260, bodyFont);
    const tipLines = doc.wrapText(`應對提示：${item.actionTip}`, CONTENT_W - 260, bodyFont);
    const cardH = 44 + (sumLines.length + tipLines.length) * 24 + 26;

    doc.ensureSpace(cardH + 14);
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, cardH, COLORS.white, COLORS.hairline);

    const accent =
      item.kind === 'caution'
        ? COLORS.vermilion
        : item.kind === 'opportunity'
          ? COLORS.green
          : item.kind === 'milestone'
            ? COLORS.gold
            : COLORS.slateBlue;

    ctx.textBaseline = 'top';
    ctx.font = `700 18px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.inkGreen;
    ctx.fillText(
      `${item.date}${item.exactTime ? ` ${item.exactTime}` : ''}`,
      MARGIN_X + 20,
      doc.y + 18
    );

    ctx.font = `600 15.5px ${FONT_SANS}`;
    ctx.fillStyle = accent;
    ctx.fillText(`${item.countdownLabel} · ${item.signalLabel}`, MARGIN_X + 20, doc.y + 46);

    ctx.font = `400 15px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(item.ganZhiTag, MARGIN_X + 20, doc.y + 72);

    ctx.font = `700 19px ${FONT_SERIF}`;
    ctx.fillStyle = COLORS.inkGreen;
    ctx.fillText(item.title, MARGIN_X + 236, doc.y + 16);

    let ly = doc.y + 46;
    ctx.font = bodyFont;
    ctx.fillStyle = COLORS.textBody;
    sumLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 236, ly);
      ly += 24;
    });
    ctx.fillStyle = COLORS.pine;
    tipLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 236, ly);
      ly += 24;
    });

    doc.y += cardH + 12;
  });

  doc.y += 18;
}

function renderEmotionalFlowSection(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const flow = calculateEmotionalFlow(input.client, input.targetDate);
  doc.drawSectionHeader(
    `流年情緒流向 × 命理運程雙軸圖譜（${flow.year} 年）`,
    `塔羅流年原型：${flow.preBirthdayCardName}${
      flow.preBirthdayCardName !== flow.postBirthdayCardName
        ? ` → ${flow.birthMonth}月生日轉「${flow.postBirthdayCardName}」`
        : ''
    } · 心境最澄明 ${flow.highestEmotionMonth.monthLabel} · 最需護心 ${flow.mostCareNeededMonth.monthLabel}`
  );

  const chartBoxH = 388;
  doc.ensureSpace(chartBoxH + 24);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, chartBoxH, COLORS.white, COLORS.hairline);

  const ctx = doc.ctx;
  const padL = 82;
  const padR = 86;
  const padT = 60;
  const padB = 64;
  const plotX = MARGIN_X + padL;
  const plotY = doc.y + padT;
  const plotW = CONTENT_W - padL - padR;
  const plotH = chartBoxH - padT - padB;

  const xOf = (m: number) => plotX + ((m - 1) / 11) * plotW;
  const yLeft = (v: number) => plotY + ((100 - v) / 85) * plotH;
  const yRight = (v: number) => plotY + ((50 - v) / 100) * plotH;

  // Axis headers
  ctx.textBaseline = 'top';
  ctx.font = `600 15px ${FONT_SANS}`;
  ctx.fillStyle = COLORS.inkGreen;
  ctx.fillText('左軸（實線）：外在運程 0–100', plotX, doc.y + 18);

  const rTitle = '右軸（虛線）：內在情緒心流 -50~+50';
  ctx.fillStyle = COLORS.rose;
  const rtw = ctx.measureText(rTitle).width;
  ctx.fillText(rTitle, plotX + plotW - rtw, doc.y + 18);

  // Horizontal gridlines aligned with Right Axis (-50, -25, 0, +25, +50)
  [-50, -25, 0, 25, 50].forEach((val) => {
    const gy = yRight(val);
    ctx.strokeStyle = val === 0 ? '#CFC7B5' : COLORS.hairlineSoft;
    ctx.lineWidth = val === 0 ? 1.5 : 1;
    ctx.setLineDash(val === 0 ? [6, 6] : []);
    ctx.beginPath();
    ctx.moveTo(plotX, gy);
    ctx.lineTo(plotX + plotW, gy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `400 14.5px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.rose;
    ctx.fillText(val > 0 ? `+${val}` : String(val), plotX + plotW + 12, gy);
  });

  // Left axis ticks
  [20, 40, 60, 80, 100].forEach((val) => {
    const gy = yLeft(val);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.font = `400 14.5px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.pine;
    ctx.fillText(String(val), plotX - 12, gy);
  });
  ctx.textAlign = 'left';

  // Birthday Tarot switch vertical marker
  const switchPt = flow.points.find((p) => p.isBirthdaySwitchMonth);
  if (switchPt) {
    const sx = xOf(switchPt.month);
    ctx.strokeStyle = COLORS.goldLight;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(sx, plotY - 8);
    ctx.lineTo(sx, plotY + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = `600 14px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(`生日換牌：${flow.postBirthdayCardName}`, sx, plotY - 4);
    ctx.textAlign = 'left';
  }

  // Emotional Flow Area relative to 0
  const zeroY = yRight(0);
  ctx.beginPath();
  flow.points.forEach((p, idx) => {
    const px = xOf(p.month);
    const py = yRight(p.emotionalScore);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.lineTo(xOf(12), zeroY);
  ctx.lineTo(xOf(1), zeroY);
  ctx.closePath();
  ctx.fillStyle = 'rgba(157, 74, 84, 0.12)';
  ctx.fill();

  // Outer Fortune Curve (Solid Deep Ink Green)
  ctx.beginPath();
  flow.points.forEach((p, idx) => {
    const px = xOf(p.month);
    const py = yLeft(p.fortuneScore);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = COLORS.inkGreen;
  ctx.lineWidth = 2.8;
  ctx.stroke();

  // Inner Emotional Curve (Dashed Rose-Plum)
  ctx.beginPath();
  ctx.setLineDash([8, 4]);
  flow.points.forEach((p, idx) => {
    const px = xOf(p.month);
    const py = yRight(p.emotionalScore);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = COLORS.rose;
  ctx.lineWidth = 2.8;
  ctx.stroke();
  ctx.setLineDash([]);

  // Month labels + nodes
  flow.points.forEach((p) => {
    const px = xOf(p.month);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = p.isTargetMonth ? `700 15.5px ${FONT_SANS}` : `500 15px ${FONT_SANS}`;
    ctx.fillStyle = p.isTargetMonth ? COLORS.inkGreen : COLORS.textMuted;
    ctx.fillText(p.monthLabel, px, plotY + plotH + 12);

    ctx.font = `400 13.5px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(p.baziMonthGanZhi, px, plotY + plotH + 34);

    // Outer node
    ctx.beginPath();
    ctx.arc(px, yLeft(p.fortuneScore), 4.5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.white;
    ctx.fill();
    ctx.strokeStyle = COLORS.inkGreen;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner node
    const isBurnout = p.resonanceKind === 'outer_high_inner_low';
    ctx.beginPath();
    ctx.arc(px, yRight(p.emotionalScore), isBurnout ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = isBurnout ? COLORS.rose : COLORS.white;
    ctx.fill();
    ctx.strokeStyle = COLORS.rose;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (isBurnout) {
      ctx.font = `600 13px ${FONT_SANS}`;
      ctx.fillStyle = COLORS.rose;
      ctx.fillText('宜喘息', px, yRight(p.emotionalScore) + 10);
    }
    ctx.textAlign = 'left';
  });

  doc.y += chartBoxH + 16;

  // Empathetic Insight Card for Target Month + Burnout Care Summary
  const targetPt =
    flow.points.find((p) => p.isTargetMonth) ?? flow.mostCareNeededMonth;
  const careFont = `400 17px ${FONT_SANS}`;
  const noteLines = doc.wrapText(
    `當月心境覺察（${targetPt.monthLabel}・${targetPt.resonanceLabel}）：${targetPt.empathyNote}`,
    CONTENT_W - 48,
    careFont
  );
  const tipLines = doc.wrapText(
    `溫柔護心建議：${targetPt.selfCareTip}${
      flow.burnoutRiskMonths.length > 0
        ? `  ｜  全年「外順內耗」提醒月份：${flow.burnoutRiskMonths.map((m) => m.monthLabel).join('、')}。`
        : ''
    }`,
    CONTENT_W - 48,
    careFont
  );

  const careBoxH = 34 + (noteLines.length + tipLines.length) * 26 + 18;
  doc.ensureSpace(careBoxH + 26);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, careBoxH, COLORS.white, COLORS.hairline);

  let cy = doc.y + 18;
  ctx.textBaseline = 'top';
  ctx.font = careFont;
  ctx.fillStyle = COLORS.textBody;
  noteLines.forEach((l) => {
    ctx.fillText(l, MARGIN_X + 24, cy);
    cy += 26;
  });
  cy += 8;
  ctx.fillStyle = COLORS.rose;
  tipLines.forEach((l) => {
    ctx.fillText(l, MARGIN_X + 24, cy);
    cy += 26;
  });

  doc.y += careBoxH + 30;
}

function renderAISummarySection(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const { aiSummary } = input;
  doc.drawSectionHeader(
    'AI 深度解盤總結（全息結構化大綱）',
    '整合紫微勸學齋四化、子平八字十神神煞與生日塔羅原型生成之雙向造命與覺察總覽'
  );

  if (!aiSummary) {
    const emptyH = 92;
    doc.ensureSpace(emptyH + 20);
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, emptyH, COLORS.white, COLORS.hairline);
    doc.ctx.textBaseline = 'middle';
    doc.ctx.font = `400 18px ${FONT_SANS}`;
    doc.ctx.fillStyle = COLORS.textMuted;
    doc.ctx.fillText(
      '本次匯出時尚未取得 AI 解盤大綱（可能正在載入或尚未設定 API 金鑰）；其他已勾選章節皆已完整收錄。',
      MARGIN_X + 24,
      doc.y + emptyH / 2
    );
    doc.y += emptyH + 30;
    return;
  }

  const drawEditorialBlock = (
    kicker: string,
    accent: string,
    headline: string,
    paragraphs: Array<{ label?: string; labelColor?: string; text: string }>
  ) => {
    const headFont = `700 22px ${FONT_SERIF}`;
    const bodyFont = `400 18px ${FONT_SANS}`;

    const hLines = doc.wrapText(headline, CONTENT_W - 48, headFont);
    const wrappedParas = paragraphs.map((p) => ({
      ...p,
      lines: doc.wrapText(
        p.label ? `${p.label}：${p.text}` : p.text,
        CONTENT_W - 48,
        bodyFont
      ),
    }));

    const totalH =
      46 +
      hLines.length * 30 +
      14 +
      wrappedParas.reduce((sum, p) => sum + p.lines.length * 29 + 12, 0) +
      16;

    doc.ensureSpace(totalH + 20);
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, totalH, COLORS.white, COLORS.hairline);

    const ctx = doc.ctx;
    ctx.textBaseline = 'top';
    let ly = doc.y + 20;

    ctx.font = `600 16px ${FONT_SANS}`;
    ctx.fillStyle = accent;
    ctx.fillText(kicker, MARGIN_X + 24, ly);
    ly += 26;

    ctx.font = headFont;
    ctx.fillStyle = COLORS.inkGreen;
    hLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, ly);
      ly += 30;
    });
    ly += 10;

    wrappedParas.forEach((p) => {
      ctx.font = bodyFont;
      p.lines.forEach((l, idx) => {
        ctx.fillStyle = idx === 0 && p.labelColor ? p.labelColor : COLORS.textBody;
        ctx.fillText(l, MARGIN_X + 24, ly);
        ly += 29;
      });
      ly += 10;
    });

    doc.y += totalH + 18;
  };

  drawEditorialBlock(
    '01. 人生地圖總評',
    COLORS.pine,
    aiSummary.lifeMapOverview.headline,
    [
      { text: aiSummary.lifeMapOverview.summary },
      ...(aiSummary.lifeMapOverview.coreThemes?.length
        ? [
            {
              label: '核心天賦特質',
              labelColor: COLORS.gold,
              text: aiSummary.lifeMapOverview.coreThemes.join(' · '),
            },
          ]
        : []),
    ]
  );

  // Card 2: 當前流年運勢與心理課題 + 4 Traffic-Light Indicators
  const c2 = aiSummary.currentFortuneAndPsyche;
  const headFont = `700 22px ${FONT_SERIF}`;
  const bodyFont = `400 18px ${FONT_SANS}`;
  const indFont = `400 16.5px ${FONT_SANS}`;

  const c2HeadLines = doc.wrapText(c2.headline, CONTENT_W - 48, headFont);
  const c2SummaryLines = doc.wrapText(c2.summary, CONTENT_W - 48, bodyFont);
  const indColW = (CONTENT_W - 48 - 18) / 2;
  const indItems = (c2.indicators ?? []).map((ind) => {
    const lines = doc.wrapText(ind.summary, indColW - 28, indFont);
    return { ind, lines, h: 46 + lines.length * 24 + 16 };
  });

  const indRow1H =
    indItems.length >= 2
      ? Math.max(indItems[0].h, indItems[1].h)
      : indItems[0]?.h ?? 0;
  const indRow2H =
    indItems.length >= 4
      ? Math.max(indItems[2].h, indItems[3].h)
      : indItems[2]?.h ?? 0;
  const indTotalH =
    (indRow1H > 0 ? indRow1H : 0) + (indRow2H > 0 ? indRow2H + 16 : 0);

  const c2TotalH =
    46 +
    c2HeadLines.length * 30 +
    12 +
    c2SummaryLines.length * 29 +
    (indTotalH > 0 ? 22 + indTotalH : 0) +
    24;

  doc.ensureSpace(c2TotalH + 20);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, c2TotalH, COLORS.white, COLORS.hairline);

  let ly = doc.y + 20;
  const ctx = doc.ctx;
  ctx.textBaseline = 'top';
  ctx.font = `600 16px ${FONT_SANS}`;
  ctx.fillStyle = COLORS.gold;
  ctx.fillText('02. 當前流年運勢與心理課題', MARGIN_X + 24, ly);
  ly += 26;

  ctx.font = headFont;
  ctx.fillStyle = COLORS.inkGreen;
  c2HeadLines.forEach((l) => {
    ctx.fillText(l, MARGIN_X + 24, ly);
    ly += 30;
  });
  ly += 10;

  ctx.font = bodyFont;
  ctx.fillStyle = COLORS.textBody;
  c2SummaryLines.forEach((l) => {
    ctx.fillText(l, MARGIN_X + 24, ly);
    ly += 29;
  });
  ly += 18;

  indItems.forEach((item, idx) => {
    const row = Math.floor(idx / 2);
    const col = idx % 2;
    const ix = MARGIN_X + 24 + col * (indColW + 18);
    const iy = ly + (row === 0 ? 0 : indRow1H + 16);
    const ih = row === 0 ? indRow1H : indRow2H;

    doc.drawCardBox(ix, iy, indColW, ih, COLORS.paper, COLORS.hairlineSoft);

    const lightColor =
      item.ind.light === 'green'
        ? COLORS.green
        : item.ind.light === 'red'
          ? COLORS.red
          : COLORS.yellow;
    const lightPrefix =
      item.ind.light === 'green'
        ? '綠燈'
        : item.ind.light === 'red'
          ? '紅燈'
          : '黃燈';

    ctx.font = `700 18px ${FONT_SERIF}`;
    ctx.fillStyle = COLORS.inkGreen;
    ctx.fillText(item.ind.domain, ix + 14, iy + 14);

    const badgeText = `${lightPrefix}・${item.ind.statusLabel}`;
    ctx.font = `600 15px ${FONT_SANS}`;
    ctx.fillStyle = lightColor;
    const bw = ctx.measureText(badgeText).width;
    ctx.fillText(badgeText, ix + indColW - 14 - bw, iy + 16);

    ctx.font = indFont;
    ctx.fillStyle = COLORS.textBody;
    let ty = iy + 44;
    item.lines.forEach((l) => {
      ctx.fillText(l, ix + 14, ty);
      ty += 24;
    });
  });

  doc.y += c2TotalH + 18;

  drawEditorialBlock(
    '03. 盲區與隱藏資源',
    COLORS.vermilion,
    aiSummary.blindSpotsAndHiddenResources.headline,
    [
      {
        label: '慣性盲點',
        labelColor: COLORS.vermilion,
        text: aiSummary.blindSpotsAndHiddenResources.blindSpots,
      },
      {
        label: '隱藏資源',
        labelColor: COLORS.green,
        text: aiSummary.blindSpotsAndHiddenResources.hiddenResources,
      },
    ]
  );

  drawEditorialBlock(
    '04. 造命與覺察行動',
    COLORS.inkGreen,
    aiSummary.actionAndAwareness.headline,
    [
      {
        label: '外部造命行動',
        labelColor: COLORS.pine,
        text: aiSummary.actionAndAwareness.externalAction,
      },
      {
        label: '內在心理覺察',
        labelColor: COLORS.gold,
        text: aiSummary.actionAndAwareness.internalAwareness,
      },
    ]
  );

  doc.y += 12;
}

function renderCrossSystemSection(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const analysis = input.crossSystemAnalysis;
  doc.drawSectionHeader(
    '跨體系合參分析（紫微主星格局 × 八字五行強弱）',
    'AI 自動偵測雙體系之衝突張力點、互補增益點與具體命理調校建議'
  );

  if (!analysis) {
    const emptyH = 88;
    doc.ensureSpace(emptyH + 20);
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, emptyH, COLORS.white, COLORS.hairline);
    doc.ctx.textBaseline = 'middle';
    doc.ctx.font = `400 18px ${FONT_SANS}`;
    doc.ctx.fillStyle = COLORS.textMuted;
    doc.ctx.fillText(
      '本次匯出時尚未取得跨體系合參結果（可於「AI 深度解盤」分頁生成後再次匯出）。',
      MARGIN_X + 24,
      doc.y + emptyH / 2
    );
    doc.y += emptyH + 28;
    return;
  }

  const ctx = doc.ctx;
  const bodyFont = `400 17.5px ${FONT_SANS}`;
  const headFont = `700 22px ${FONT_SERIF}`;

  // Overall Verdict Box
  const sumLines = doc.wrapText(analysis.overallVerdict.summary, CONTENT_W - 48, bodyFont);
  const verdictH = 74 + sumLines.length * 27 + 22;
  doc.ensureSpace(verdictH + 18);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, verdictH, COLORS.white, COLORS.hairline);

  ctx.textBaseline = 'top';
  ctx.font = `600 16px ${FONT_SANS}`;
  ctx.fillStyle = COLORS.gold;
  ctx.fillText(`合參定性：${analysis.overallVerdict.harmonyLabel}`, MARGIN_X + 24, doc.y + 18);

  ctx.font = headFont;
  ctx.fillStyle = COLORS.inkGreen;
  ctx.fillText(analysis.overallVerdict.headline, MARGIN_X + 24, doc.y + 44);

  let vy = doc.y + 78;
  ctx.font = bodyFont;
  ctx.fillStyle = COLORS.textBody;
  sumLines.forEach((l) => {
    ctx.fillText(l, MARGIN_X + 24, vy);
    vy += 27;
  });
  doc.y += verdictH + 16;

  // Findings Cards
  const smallFont = `400 16.5px ${FONT_SANS}`;
  analysis.findings.forEach((f, idx) => {
    const evLines = doc.wrapText(
      `紫微依據：${f.ziweiEvidence}  ｜  八字依據：${f.baziEvidence}`,
      CONTENT_W - 48,
      smallFont
    );
    const synLines = doc.wrapText(f.synthesis, CONTENT_W - 48, smallFont);
    const advLines = doc.wrapText(`命理建議：${f.advice}`, CONTENT_W - 48, smallFont);
    const fH = 66 + (evLines.length + synLines.length + advLines.length) * 24 + 26;

    doc.ensureSpace(fH + 14);
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, fH, COLORS.white, COLORS.hairline);

    const isConflict = f.type === 'conflict';
    ctx.textBaseline = 'top';
    ctx.font = `600 15.5px ${FONT_SANS}`;
    ctx.fillStyle = isConflict ? COLORS.vermilion : COLORS.green;
    ctx.fillText(
      `0${idx + 1}  ${isConflict ? '衝突張力點' : '互補增益點'} · ${f.domain}`,
      MARGIN_X + 24,
      doc.y + 16
    );

    ctx.font = `700 20px ${FONT_SERIF}`;
    ctx.fillStyle = COLORS.inkGreen;
    ctx.fillText(f.title, MARGIN_X + 24, doc.y + 40);

    let fy = doc.y + 70;
    ctx.font = smallFont;
    ctx.fillStyle = COLORS.textMuted;
    evLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, fy);
      fy += 24;
    });
    fy += 4;
    ctx.fillStyle = COLORS.textBody;
    synLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, fy);
      fy += 24;
    });
    fy += 4;
    ctx.fillStyle = COLORS.pine;
    advLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, fy);
      fy += 24;
    });

    doc.y += fH + 12;
  });

  doc.y += 18;
}

function renderNotesSection(doc: EditorialCanvasDoc, notes: string) {
  const trimmed = notes.trim();
  if (!trimmed) return;

  doc.drawSectionHeader('諮詢師備忘筆記');
  const font = `400 18px ${FONT_SANS}`;
  const lines = doc.wrapText(trimmed, CONTENT_W - 48, font);
  const boxH = Math.max(88, lines.length * 29 + 36);

  doc.ensureSpace(boxH + 24);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, boxH, COLORS.white, COLORS.hairline);

  let ly = doc.y + 18;
  doc.ctx.textBaseline = 'top';
  doc.ctx.font = font;
  doc.ctx.fillStyle = COLORS.textBody;
  lines.forEach((l) => {
    doc.ctx.fillText(l, MARGIN_X + 24, ly);
    ly += 29;
  });

  doc.y += boxH + 20;
}

/**
 * Generate and download a customizable, high-DPI multi-page Traditional Chinese PDF report using jsPDF.
 */
export async function exportHolisticPdfReport(
  input: HolisticPdfExportInput
): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const sections: PdfExportSections = {
    ...DEFAULT_PDF_SECTIONS,
    ...(input.sections ?? {}),
  };

  const editorialDoc = new EditorialCanvasDoc(
    input.client.name,
    input.targetDate,
    SCOPE_LABELS[input.activeScope]
  );

  renderMasthead(editorialDoc, input);

  if (sections.scopeFocus) {
    renderScopeFocusSection(editorialDoc, input);
  }
  if (sections.chartRawData) {
    renderZiweiSection(editorialDoc, input);
    renderBaziSection(editorialDoc, input);
    renderTarotSection(editorialDoc, input);
  }
  if (sections.tenYearTrend) {
    renderTenYearTrendSection(editorialDoc, input);
  }
  if (sections.upcomingAlerts) {
    renderUpcomingAlertsSection(editorialDoc, input);
  }
  if (sections.aiSummary) {
    renderAISummarySection(editorialDoc, input);
  }
  if (sections.emotionalFlow) {
    renderEmotionalFlowSection(editorialDoc, input);
  }
  if (sections.crossSystem) {
    renderCrossSystemSection(editorialDoc, input);
  }
  if (sections.consultantNotes) {
    renderNotesSection(editorialDoc, input.client.notes);
  }

  editorialDoc.finalizeFooters();

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  editorialDoc.pages.forEach((canvas, idx) => {
    if (idx > 0) {
      pdf.addPage('a4', 'portrait');
    }
    const imgData = canvas.toDataURL('image/jpeg', 0.94);
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
  });

  const safeClientName = input.client.name.replace(/[\\/:*?"<>|]/g, '_');
  const safeScope = SCOPE_LABELS[input.activeScope].replace(/[\\/:*?"<>|・]/g, '');
  const fileName = `全息人生地圖_${safeClientName}_${safeScope}_${input.targetDate}.pdf`;
  pdf.save(fileName);
}
