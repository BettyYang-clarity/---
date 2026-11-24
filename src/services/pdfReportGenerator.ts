import { jsPDF } from 'jspdf';
import {
  AICrossSystemAnalysis,
  AIStage1Summary,
  BaziChartResult,
  ClientProfile,
  FiveElement,
  HoroscopeScope,
  PdfExportSections,
  PdfReportEdition,
  TarotChartResult,
  ZiweiChartResult,
} from '../types/holistic';
import { SCOPE_LABELS } from '../engines/holisticPayload';
import { getSanFangSiZhengIndices } from '../engines/ziweiEngine';
import { calculateTenYearTrend } from '../engines/tenYearTrendEngine';
import { calculateEmotionalFlow } from '../engines/emotionalFlowEngine';
import { calculateUpcomingAlerts } from '../engines/upcomingAlertsEngine';
import {
  calculateLifeGuidance,
  EnergyTriggerItem,
} from '../engines/lifeGuidanceEngine';

export interface HolisticPdfExportInput {
  client: ClientProfile;
  ziwei: ZiweiChartResult;
  bazi: BaziChartResult;
  tarot: TarotChartResult;
  targetDate: string;
  activeScope: HoroscopeScope;
  edition?: PdfReportEdition;
  aiSummary: AIStage1Summary | null;
  crossSystemAnalysis?: AICrossSystemAnalysis | null;
  sections?: PdfExportSections;
}

export const DEFAULT_PDF_SECTIONS: PdfExportSections = {
  scopeFocus: true,
  lifeGuidance: true,
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
const HEADER_SAFE_Y = 124;
const FOOTER_SAFE_Y = PAGE_H - 114;

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
  private edition: PdfReportEdition;
  private chapterCounter = 0;

  constructor(
    clientName: string,
    targetDate: string,
    scopeLabel: string,
    edition: PdfReportEdition = 'consultant'
  ) {
    this.clientName = clientName;
    this.targetDate = targetDate;
    this.scopeLabel = scopeLabel;
    this.edition = edition;
    this.newPage(true);
  }

  nextChapterNum(): string {
    this.chapterCounter += 1;
    return String(this.chapterCounter).padStart(2, '0');
  }

  resetTextState() {
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.setLineDash([]);
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

    this.resetTextState();

    if (!isFirst) {
      ctx.font = `500 20px ${FONT_SERIF}`;
      ctx.fillStyle = COLORS.inkGreen;
      const headerBase =
        this.edition === 'handout'
          ? `個人專屬人生指南・${this.clientName}`
          : `全息人生地圖報告・${this.clientName}`;
      const leftTitle = this.fitText(
        headerBase,
        CONTENT_W - 360,
        `500 20px ${FONT_SERIF}`
      );
      ctx.fillText(leftTitle, MARGIN_X, 72);

      ctx.font = `400 18px ${FONT_MONO}`;
      ctx.fillStyle = COLORS.textMuted;
      const rightText = `${this.targetDate}（${this.scopeLabel}）`;
      const rw = ctx.measureText(rightText).width;
      ctx.fillText(rightText, PAGE_W - MARGIN_X - rw, 74);

      ctx.strokeStyle = COLORS.hairline;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, 108);
      ctx.lineTo(PAGE_W - MARGIN_X, 108);
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

  fitText(text: string, maxWidth: number, font: string): string {
    this.ctx.font = font;
    if (this.ctx.measureText(text).width <= maxWidth) return text;
    let trimmed = text;
    while (trimmed.length > 2 && this.ctx.measureText(`${trimmed}…`).width > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    return `${trimmed}…`;
  }

  wrapText(text: string, maxWidth: number, font: string): string[] {
    this.ctx.font = font;
    const safeWidth = Math.max(40, maxWidth - 4);
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
        if (this.ctx.measureText(candidate).width > safeWidth && current) {
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
    const titleFont = `700 28px ${FONT_SERIF}`;
    const subFont = `400 18px ${FONT_SANS}`;
    const titleLines = this.wrapText(title, CONTENT_W - 56, titleFont);
    const subLines = subtitle ? this.wrapText(subtitle, CONTENT_W - 56, subFont) : [];
    const headerH =
      titleLines.length * 38 +
      (subLines.length > 0 ? 6 + subLines.length * 26 : 0) +
      28;

    // Reserve header + minimum space for the start of the section's first card to avoid orphan headers
    this.ensureSpace(headerH + 90);
    const ctx = this.ctx;
    this.resetTextState();

    ctx.font = `600 22px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(num, MARGIN_X, this.y + 4);

    ctx.font = titleFont;
    ctx.fillStyle = COLORS.inkGreen;
    titleLines.forEach((line) => {
      ctx.fillText(line, MARGIN_X + 50, this.y);
      this.y += 38;
    });

    if (subLines.length > 0) {
      this.y += 4;
      ctx.font = subFont;
      ctx.fillStyle = COLORS.textMuted;
      subLines.forEach((line) => {
        ctx.fillText(line, MARGIN_X + 50, this.y);
        this.y += 26;
      });
    }

    ctx.strokeStyle = COLORS.inkGreen;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(MARGIN_X, this.y + 6);
    ctx.lineTo(PAGE_W - MARGIN_X, this.y + 6);
    ctx.stroke();

    this.y += 26;
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
      ctx.setLineDash([]);
      ctx.strokeStyle = COLORS.hairline;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, lineY);
      ctx.lineTo(PAGE_W - MARGIN_X, lineY);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = `400 17px ${FONT_SANS}`;
      ctx.fillStyle = COLORS.textMuted;
      const footerLeft =
        this.edition === 'handout'
          ? `個人專屬人生指南（交付閱讀版） · 報告生成日 ${exportedAt}`
          : `全息人生地圖工作台｜東方命理 × 西方原型 · 報告生成日 ${exportedAt}`;
      ctx.fillText(footerLeft, MARGIN_X, lineY + 14);

      const pageText = `第 ${idx + 1} / ${total} 頁`;
      ctx.font = `500 17px ${FONT_MONO}`;
      const pw = ctx.measureText(pageText).width;
      ctx.fillText(pageText, PAGE_W - MARGIN_X - pw, lineY + 14);
    });
  }
}

function renderMasthead(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const { client, ziwei, bazi, tarot, targetDate, activeScope } = input;
  const isHandout = (input.edition ?? 'consultant') === 'handout';
  const guidance = isHandout
    ? calculateLifeGuidance(client, ziwei, bazi, tarot, targetDate)
    : null;
  const ctx = doc.ctx;
  doc.resetTextState();

  const innerW = CONTENT_W - 72;
  const meta1Font = `400 19.5px ${FONT_SANS}`;
  const meta2Font = `400 17.5px ${FONT_MONO}`;
  const metaLine1Text = isHandout
    ? `${client.gender}  ·  生肖${ziwei.zodiac}  ·  實歲 ${guidance!.stagePosition.actualAge} 歲  ·  人格原型 ${tarot.personalityCard.name} / 靈魂原型 ${tarot.soulCard.name}`
    : `${client.gender}命  ·  生肖${ziwei.zodiac}  ·  ${ziwei.fiveElementsClass}  ·  日主 ${bazi.dayMaster.stem}（${bazi.dayMaster.yinYang}${bazi.dayMaster.element}）  ·  塔羅 ${tarot.constellation.id} 號${tarot.constellation.name}`;
  const metaLine2Text = isHandout
    ? `出生日期 ${client.birthDate} ${client.birthTime}  |  農曆 ${ziwei.lunarDate}  |  推演基準日 ${targetDate}（${SCOPE_LABELS[activeScope]}）`
    : `國曆 ${client.birthDate} ${client.birthTime}（${ziwei.time}）  |  農曆 ${ziwei.lunarDate}  |  查詢座標 ${targetDate}（${SCOPE_LABELS[activeScope]}）`;

  const meta1Lines = doc.wrapText(metaLine1Text, innerW, meta1Font);
  const meta2Lines = doc.wrapText(metaLine2Text, innerW, meta2Font);
  const bannerH = 142 + meta1Lines.length * 29 + meta2Lines.length * 26 + 26;

  ctx.fillStyle = COLORS.inkGreen;
  ctx.fillRect(MARGIN_X, doc.y, CONTENT_W, bannerH);

  ctx.strokeStyle = COLORS.goldLight;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(MARGIN_X + 12, doc.y + 12, CONTENT_W - 24, bannerH - 24);

  let by = doc.y + 30;
  ctx.font = `500 18px ${FONT_SANS}`;
  ctx.fillStyle = COLORS.goldLight;
  const bannerKicker = isHandout
    ? `個人運勢與行動指南 ｜ 交付閱讀版（${SCOPE_LABELS[activeScope]}視角）`
    : `東方命理 × 西方原型 ｜ 全息人生地圖專業報告書（${SCOPE_LABELS[activeScope]}視角）`;
  ctx.fillText(
    doc.fitText(bannerKicker, innerW, `500 18px ${FONT_SANS}`),
    MARGIN_X + 36,
    by
  );
  by += 36;

  ctx.font = `700 42px ${FONT_SERIF}`;
  ctx.fillStyle = '#FAF8F3';
  const bannerTitle = isHandout
    ? `${client.name}・個人專屬人生指南`
    : `${client.name}・全息命盤報告書`;
  ctx.fillText(
    doc.fitText(bannerTitle, innerW, `700 42px ${FONT_SERIF}`),
    MARGIN_X + 36,
    by
  );
  by += 62;

  ctx.font = meta1Font;
  ctx.fillStyle = '#C9D7D2';
  meta1Lines.forEach((l) => {
    ctx.fillText(l, MARGIN_X + 36, by);
    by += 29;
  });
  by += 6;

  ctx.font = meta2Font;
  ctx.fillStyle = '#A8BCB4';
  meta2Lines.forEach((l) => {
    ctx.fillText(l, MARGIN_X + 36, by);
    by += 26;
  });

  doc.y += bannerH + 24;

  // 4-Column Executive Anchor Summary Strip (safely wrapped/fitted inside each column)
  const colW = CONTENT_W / 4;
  const colInnerW = colW - 36;
  const mingPalace = ziwei.palaces[ziwei.mingPalaceIndex];
  const bodyPalace = ziwei.palaces[ziwei.bodyPalaceIndex];

  const mainFont = `700 21px ${FONT_SERIF}`;
  const subFont = `400 15.5px ${FONT_SANS}`;
  const rawAnchors = isHandout
    ? [
        {
          kicker: '當前人生刻度',
          main: guidance!.stagePosition.phaseLabel,
          sub: `${guidance!.stagePosition.decadeTitle} · 第 ${guidance!.stagePosition.yearInDecade} / 10 年`,
        },
        {
          kicker: '這段十年核心主線',
          main: guidance!.stagePosition.currentStage.plainTheme,
          sub: guidance!.stagePosition.nextShiftYear
            ? `預計 ${guidance!.stagePosition.nextShiftYear} 年（${guidance!.stagePosition.nextShiftAge}歲）換軌`
            : '穩步累積與打底期',
        },
        {
          kicker: '天賦與靈魂原型',
          main: `${tarot.personalityCard.name} / ${tarot.soulCard.name}`,
          sub: `${tarot.constellation.name}`,
        },
        {
          kicker: '今年年度課題',
          main: `${tarot.currentYearCard.card.name}`,
          sub: `${tarot.currentYearCard.card.keywords.slice(0, 2).join('・')} · 換牌 ${tarot.nextSwitchDate}`,
        },
      ]
    : [
        {
          kicker: '紫微命宮主星',
          main:
            mingPalace.majorStars.map((s) => s.name).join('・') ||
            '空宮（借對宮）',
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

  const anchors = rawAnchors.map((a) => ({
    ...a,
    mainLines: doc.wrapText(a.main, colInnerW, mainFont).slice(0, 2),
    subLines: doc.wrapText(a.sub, colInnerW, subFont).slice(0, 2),
  }));

  const maxMainLines = Math.max(1, ...anchors.map((a) => a.mainLines.length));
  const maxSubLines = Math.max(1, ...anchors.map((a) => a.subLines.length));
  const stripH = 48 + maxMainLines * 29 + 8 + maxSubLines * 22 + 18;

  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, stripH, COLORS.white, COLORS.hairline);

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
    let ay = doc.y + 18;
    ctx.font = `500 16px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(a.kicker, cx + 18, ay);
    ay += 28;

    ctx.font = mainFont;
    ctx.fillStyle = COLORS.inkGreen;
    a.mainLines.forEach((l) => {
      ctx.fillText(l, cx + 18, ay);
      ay += 29;
    });
    ay += 6;

    ctx.font = subFont;
    ctx.fillStyle = COLORS.textMuted;
    a.subLines.forEach((l) => {
      ctx.fillText(l, cx + 18, ay);
      ay += 22;
    });
  });

  doc.y += stripH + 28;
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
  const lineH = 30;
  const rows = [
    { label: '紫微焦點', color: COLORS.inkGreen, text: digest.ziweiPoint },
    { label: '八字焦點', color: COLORS.pine, text: digest.baziPoint },
    { label: '塔羅焦點', color: COLORS.gold, text: digest.tarotPoint },
  ].map((r) => ({
    ...r,
    lines: doc.wrapText(`${r.label}：${r.text}`, CONTENT_W - 48, font),
  }));

  const boxH = 22 + rows.reduce((s, r) => s + r.lines.length * lineH + 12, 0) + 12;
  doc.ensureSpace(boxH + 24);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, boxH, COLORS.white, COLORS.hairline);

  const ctx = doc.ctx;
  doc.resetTextState();
  let cy = doc.y + 22;
  ctx.font = font;
  rows.forEach((r) => {
    r.lines.forEach((line, idx) => {
      ctx.fillStyle = idx === 0 ? r.color : COLORS.textBody;
      ctx.fillText(line, MARGIN_X + 24, cy);
      cy += lineH;
    });
    cy += 12;
  });

  doc.y += boxH + 28;
}

function renderLifeGuidanceSection(
  doc: EditorialCanvasDoc,
  input: HolisticPdfExportInput
) {
  const isConsultant = (input.edition ?? 'consultant') === 'consultant';
  const guidance = calculateLifeGuidance(
    input.client,
    input.ziwei,
    input.bazi,
    input.tarot,
    input.targetDate
  );
  const { stagePosition, tailwinds, arenas, stoplosses, lifeCircles } = guidance;

  doc.drawSectionHeader(
    `當前十年階段定位與今年精力配置（${stagePosition.targetYear} 年）`,
    isConsultant
      ? `實歲 ${stagePosition.actualAge} 歲 · ${stagePosition.phaseLabel}（第 ${stagePosition.yearInDecade}/10 年） · ${stagePosition.technicalProof}`
      : `實歲 ${stagePosition.actualAge} 歲 · 正處於「${stagePosition.decadeTitle}」第 ${stagePosition.yearInDecade} / 10 年（${stagePosition.phaseLabel}）`
  );

  // ==========================================================================
  // Part A: Current 10-Year Stage Position Card + 10-Step Progress Bar
  // ==========================================================================
  const innerW = CONTENT_W - 48;
  const headlineFont = `700 22px ${FONT_SERIF}`;
  const bodyFont = `400 18px ${FONT_SANS}`;
  const reframeFont = `400 17.5px ${FONT_SANS}`;
  const techFont = `400 15.5px ${FONT_MONO}`;

  const headlineLines = doc.wrapText(
    stagePosition.stageHeadline,
    innerW,
    headlineFont
  );
  const guidanceLines = doc.wrapText(
    stagePosition.stageGuidance,
    innerW,
    bodyFont
  );
  const reframeLines = doc.wrapText(
    stagePosition.confusionReframe,
    innerW - 32,
    reframeFont
  );
  const techLines = isConsultant
    ? doc.wrapText(`命理依據：${stagePosition.technicalProof}`, innerW, techFont)
    : [];

  const nodes = [
    stagePosition.prevStage,
    stagePosition.currentStage,
    stagePosition.nextStage,
  ];
  const nodeColW = innerW / 3;
  const nodeThemeFont = `400 15.5px ${FONT_SANS}`;
  const nodeWrapped = nodes.map((n) =>
    n ? doc.wrapText(n.plainTheme, nodeColW - 28, nodeThemeFont).slice(0, 2) : []
  );
  const maxNodeLines = Math.max(1, ...nodeWrapped.map((l) => l.length));
  const nodesStripH = 54 + maxNodeLines * 22 + 12;

  const progressBarBlockH = 56;
  const reframeBoxH = 38 + reframeLines.length * 27 + 16;
  const stageCardH =
    24 +
    28 +
    headlineLines.length * 32 +
    12 +
    progressBarBlockH +
    16 +
    guidanceLines.length * 29 +
    16 +
    reframeBoxH +
    16 +
    nodesStripH +
    (techLines.length > 0 ? 12 + techLines.length * 22 : 0) +
    22;

  doc.ensureSpace(stageCardH + 22);
  doc.drawCardBox(
    MARGIN_X,
    doc.y,
    CONTENT_W,
    stageCardH,
    COLORS.white,
    COLORS.hairline
  );

  {
    const ctx = doc.ctx;
    doc.resetTextState();
    let sy = doc.y + 22;
    const sx = MARGIN_X + 24;

    ctx.font = `600 16.5px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(
      `一、當下十年階段座標 · ${stagePosition.decadeTitle}（${stagePosition.currentStage.yearRange}）`,
      sx,
      sy
    );

    const stepSummary = `第 ${stagePosition.yearInDecade} / 10 年 · ${stagePosition.phaseLabel}`;
    ctx.font = `600 16px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.inkGreen;
    const sw = ctx.measureText(stepSummary).width;
    ctx.fillText(stepSummary, MARGIN_X + CONTENT_W - 24 - sw, sy);
    sy += 30;

    ctx.font = headlineFont;
    ctx.fillStyle = COLORS.inkGreen;
    headlineLines.forEach((l) => {
      ctx.fillText(l, sx, sy);
      sy += 32;
    });
    sy += 12;

    // 10-Step Progress Bar
    const totalSteps = 10;
    const stepGap = 8;
    const segW = (innerW - stepGap * (totalSteps - 1)) / totalSteps;
    const barH = 16;
    for (let i = 0; i < totalSteps; i++) {
      const stepNum = i + 1;
      const bx = sx + i * (segW + stepGap);
      if (stepNum < stagePosition.yearInDecade) {
        ctx.fillStyle = COLORS.inkGreen;
      } else if (stepNum === stagePosition.yearInDecade) {
        ctx.fillStyle = COLORS.gold;
      } else {
        ctx.fillStyle = '#E5DEC9';
      }
      ctx.fillRect(bx, sy, segW, barH);
    }

    ctx.font = `400 14.5px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(
      `階段起點 ${stagePosition.currentStage.yearRange.split('–')[0] ?? ''}`,
      sx,
      sy + 24
    );
    const midLabel = `今年 ${stagePosition.targetYear}（實歲 ${stagePosition.actualAge} 歲）`;
    ctx.font = `600 15px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.gold;
    const midW = ctx.measureText(midLabel).width;
    ctx.fillText(midLabel, sx + innerW / 2 - midW / 2, sy + 24);

    const endLabel = stagePosition.nextShiftYear
      ? `預計 ${stagePosition.nextShiftYear} 年（${stagePosition.nextShiftAge}歲）換軌`
      : `階段終點 ${stagePosition.currentStage.yearRange.split('–')[1] ?? ''}`;
    ctx.font = `400 14.5px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.textMuted;
    const endW = ctx.measureText(endLabel).width;
    ctx.fillText(endLabel, sx + innerW - endW, sy + 24);
    sy += progressBarBlockH + 14;

    // Stage Guidance paragraph
    ctx.font = bodyFont;
    ctx.fillStyle = COLORS.textBody;
    guidanceLines.forEach((l) => {
      ctx.fillText(l, sx, sy);
      sy += 29;
    });
    sy += 14;

    // Confusion Reframe Callout Box
    ctx.fillStyle = COLORS.surfaceSoft;
    ctx.fillRect(sx, sy, innerW, reframeBoxH);
    ctx.strokeStyle = COLORS.hairline;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, innerW, reframeBoxH);

    let ry = sy + 14;
    ctx.font = `600 16px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.inkGreen;
    ctx.fillText('若近期感到迷惘，請這樣看現在的位置：', sx + 16, ry);
    ry += 26;

    ctx.font = reframeFont;
    ctx.fillStyle = COLORS.textBody;
    reframeLines.forEach((l) => {
      ctx.fillText(l, sx + 16, ry);
      ry += 27;
    });
    sy += reframeBoxH + 16;

    // 3-Stage Context Row (Prev / Current / Next Decade)
    ctx.strokeStyle = COLORS.hairlineSoft;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + innerW, sy);
    ctx.stroke();

    nodes.forEach((node, idx) => {
      const nx = sx + idx * nodeColW;
      if (idx > 0) {
        ctx.strokeStyle = COLORS.hairlineSoft;
        ctx.beginPath();
        ctx.moveTo(nx, sy + 10);
        ctx.lineTo(nx, sy + nodesStripH - 6);
        ctx.stroke();
      }
      const padLeft = idx === 0 ? 0 : 16;
      let ny = sy + 14;
      if (!node) {
        ctx.font = `500 15px ${FONT_SANS}`;
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText(idx === 0 ? '上一段十年：—' : '下一段十年：—', nx + padLeft, ny);
        return;
      }

      ctx.font = `600 15px ${FONT_SANS}`;
      ctx.fillStyle = idx === 1 ? COLORS.gold : COLORS.textMuted;
      ctx.fillText(`${node.label}（${node.ageRange}）`, nx + padLeft, ny);
      ny += 22;

      ctx.font = `400 14px ${FONT_MONO}`;
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(node.yearRange, nx + padLeft, ny);
      ny += 20;

      ctx.font = nodeThemeFont;
      ctx.fillStyle = idx === 1 ? COLORS.inkGreen : COLORS.textBody;
      nodeWrapped[idx].forEach((l) => {
        ctx.fillText(l, nx + padLeft, ny);
        ny += 22;
      });
    });
    sy += nodesStripH;

    if (techLines.length > 0) {
      sy += 10;
      ctx.font = techFont;
      ctx.fillStyle = COLORS.textMuted;
      techLines.forEach((l) => {
        ctx.fillText(l, sx, sy);
        sy += 22;
      });
    }
  }

  doc.y += stageCardH + 22;

  // ==========================================================================
  // Part B: 3-Zone Yearly Energy Allocation (Stacked Full-Width Editorial Cards)
  // ==========================================================================
  const zones: Array<{
    title: string;
    subtitle: string;
    accent: string;
    bgTint: string;
    emptyText: string;
    items: EnergyTriggerItem[];
  }> = [
    {
      title: '二之一、有風的地方（順風入口與助力）',
      subtitle: '阻力最小、回報最容易放大的切入點，適合主動出擊與借勢',
      accent: COLORS.green,
      bgTint: '#F4FAF7',
      emptyText: '今年外在順風入口較為低調，適合以穩健累積自身實力為主。',
      items: tailwinds,
    },
    {
      title: '二之二、該扛的主戰場（今年核心舞台）',
      subtitle: '時間與注意力最該聚焦的核心任務，主動定調就能拉開差距',
      accent: COLORS.gold,
      bgTint: '#FCF9F0',
      emptyText: '今年無單一強制聚焦的衝突戰場，可依自身長期目標推進。',
      items: arenas,
    },
    {
      title: '二之三、容易白耗的止損區（減載與設界線）',
      subtitle: '最容易反覆拉扯、事倍功半的地方，務必先停損再談進攻',
      accent: COLORS.vermilion,
      bgTint: '#FDF6F5',
      emptyText: '今年未觸發明顯的結構性止損警訊，維持既有風險控管即可。',
      items: stoplosses,
    },
  ];

  const itemHeadlineFont = `600 18px ${FONT_SANS}`;
  const itemBodyFont = `400 17.5px ${FONT_SANS}`;
  const itemTechFont = `400 15px ${FONT_MONO}`;

  zones.forEach((zone) => {
    const wrappedItems = zone.items.map((item) => {
      const headLines = doc.wrapText(
        `【${item.domainLabel}】${item.headline}`,
        innerW,
        itemHeadlineFont
      );
      const bodyLines = doc.wrapText(item.guidance, innerW, itemBodyFont);
      const proofLines = isConsultant
        ? doc.wrapText(`依據：${item.technicalProof}`, innerW, itemTechFont)
        : [];
      const h =
        headLines.length * 27 +
        4 +
        bodyLines.length * 27 +
        (proofLines.length > 0 ? 4 + proofLines.length * 21 : 0);
      return { headLines, bodyLines, proofLines, h };
    });

    const headerBarH = 68;
    const bodyContentH =
      wrappedItems.length > 0
        ? wrappedItems.reduce((sum, it, idx) => sum + it.h + (idx > 0 ? 22 : 0), 0)
        : 32;
    const zoneCardH = headerBarH + 20 + bodyContentH + 22;

    doc.ensureSpace(zoneCardH + 18);
    doc.drawCardBox(
      MARGIN_X,
      doc.y,
      CONTENT_W,
      zoneCardH,
      COLORS.white,
      COLORS.hairline
    );

    const ctx = doc.ctx;
    doc.resetTextState();

    // Tinted Zone Header Strip
    ctx.fillStyle = zone.bgTint;
    ctx.fillRect(MARGIN_X + 1, doc.y + 1, CONTENT_W - 2, headerBarH - 1);
    ctx.strokeStyle = COLORS.hairlineSoft;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGIN_X, doc.y + headerBarH);
    ctx.lineTo(MARGIN_X + CONTENT_W, doc.y + headerBarH);
    ctx.stroke();

    ctx.font = `700 19.5px ${FONT_SERIF}`;
    ctx.fillStyle = zone.accent;
    ctx.fillText(zone.title, MARGIN_X + 24, doc.y + 14);

    ctx.font = `400 15.5px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(zone.subtitle, MARGIN_X + 24, doc.y + 42);

    let zy = doc.y + headerBarH + 18;
    if (wrappedItems.length === 0) {
      ctx.font = itemBodyFont;
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(zone.emptyText, MARGIN_X + 24, zy);
    } else {
      wrappedItems.forEach((it, idx) => {
        if (idx > 0) {
          ctx.strokeStyle = COLORS.hairlineSoft;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(MARGIN_X + 24, zy - 10);
          ctx.lineTo(MARGIN_X + CONTENT_W - 24, zy - 10);
          ctx.stroke();
        }
        ctx.font = itemHeadlineFont;
        ctx.fillStyle = COLORS.inkGreen;
        it.headLines.forEach((l) => {
          ctx.fillText(l, MARGIN_X + 24, zy);
          zy += 27;
        });
        zy += 4;

        ctx.font = itemBodyFont;
        ctx.fillStyle = COLORS.textBody;
        it.bodyLines.forEach((l) => {
          ctx.fillText(l, MARGIN_X + 24, zy);
          zy += 27;
        });

        if (it.proofLines.length > 0) {
          zy += 4;
          ctx.font = itemTechFont;
          ctx.fillStyle = COLORS.textMuted;
          it.proofLines.forEach((l) => {
            ctx.fillText(l, MARGIN_X + 24, zy);
            zy += 21;
          });
        }
        zy += 22;
      });
    }

    doc.y += zoneCardH + 18;
  });

  // ==========================================================================
  // Part C: Four Life Circles Scan (2x2 Grid, Dynamic Row Heights)
  // ==========================================================================
  const circleHeaderH = 38;
  doc.ensureSpace(circleHeaderH + 170);
  {
    const ctx = doc.ctx;
    doc.resetTextState();
    ctx.font = `700 19.5px ${FONT_SERIF}`;
    ctx.fillStyle = COLORS.inkGreen;
    ctx.fillText(
      `三、${stagePosition.targetYear} 年四大生活圈變動掃描`,
      MARGIN_X,
      doc.y + 4
    );
  }
  doc.y += circleHeaderH;

  const gap = 20;
  const colW = (CONTENT_W - gap) / 2;
  const cardInnerW = colW - 40;
  const cBodyFont = `400 16.5px ${FONT_SANS}`;
  const cTechFont = `400 14.5px ${FONT_MONO}`;

  const preparedCircles = lifeCircles.map((c) => {
    const bodyLines = doc.wrapText(c.guidance, cardInnerW, cBodyFont);
    const techText = isConsultant
      ? `${c.pillarLabel} ${c.ganZhi} · ${c.technicalNote}`
      : '';
    const statusColor =
      c.relation === 'clash'
        ? COLORS.vermilion
        : c.relation === 'harmony'
          ? COLORS.green
          : c.relation === 'repeat'
            ? COLORS.gold
            : COLORS.textMuted;
    const h =
      20 +
      30 +
      (techText ? 22 : 4) +
      bodyLines.length * 25 +
      20;
    return { ...c, bodyLines, techText, statusColor, h };
  });

  for (let row = 0; row < 2; row++) {
    const left = preparedCircles[row * 2];
    const right = preparedCircles[row * 2 + 1];
    if (!left) break;
    const rowH = Math.max(left.h, right?.h ?? 0, 134);

    doc.ensureSpace(rowH + 18);
    const ctx = doc.ctx;
    doc.resetTextState();

    [left, right].forEach((item, colIdx) => {
      if (!item) return;
      const cx = MARGIN_X + colIdx * (colW + gap);
      const cy = doc.y;
      doc.drawCardBox(cx, cy, colW, rowH, COLORS.white, COLORS.hairline);

      let ly = cy + 18;
      ctx.font = `700 18.5px ${FONT_SERIF}`;
      ctx.fillStyle = COLORS.inkGreen;
      ctx.fillText(item.circlePlain, cx + 20, ly);

      ctx.font = `600 16px ${FONT_SANS}`;
      ctx.fillStyle = item.statusColor;
      const stW = ctx.measureText(item.relationPlain).width;
      ctx.fillText(item.relationPlain, cx + colW - 20 - stW, ly + 2);
      ly += 30;

      if (item.techText) {
        ctx.font = cTechFont;
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText(item.techText, cx + 20, ly);
        ly += 22;
      } else {
        ly += 4;
      }

      ctx.font = cBodyFont;
      ctx.fillStyle = COLORS.textBody;
      item.bodyLines.forEach((l) => {
        ctx.fillText(l, cx + 20, ly);
        ly += 25;
      });
    });

    doc.y += rowH + 18;
  }

  doc.y += 14;
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
  const boxH = 20 + sfLines.length * 29 + 10 + flowLines.length * 29 + 18;

  doc.ensureSpace(boxH + 20);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, boxH, COLORS.white, COLORS.hairline);

  {
    const ctx = doc.ctx;
    doc.resetTextState();
    let cy = doc.y + 20;
    ctx.font = `400 18px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.textBody;
    sfLines.forEach((line) => {
      ctx.fillText(line, MARGIN_X + 22, cy);
      cy += 29;
    });
    cy += 10;
    ctx.font = `500 18px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.pine;
    flowLines.forEach((line) => {
      ctx.fillText(line, MARGIN_X + 22, cy);
      cy += 29;
    });
  }
  doc.y += boxH + 18;

  // Four Transformations Table
  const mutHeaderH = 42;
  const mutRowH = 40;
  const mutTableH = mutHeaderH + ziwei.mutagenTable.length * mutRowH;
  doc.ensureSpace(mutTableH + 24);

  {
    const ctx = doc.ctx;
    doc.resetTextState();
    const mutCols = [260, 284, 284, 284, CONTENT_W - 1112];
    const mutHeaders = ['運限層級（干支）', '化祿（資源・順勢）', '化權（主導・開創）', '化科（名聲・貴人）', '化忌（執著・課題）'];

    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, mutTableH, COLORS.white, COLORS.hairline);
    ctx.fillStyle = COLORS.surfaceSoft;
    ctx.fillRect(MARGIN_X + 1, doc.y + 1, CONTENT_W - 2, mutHeaderH - 1);

    let colX = MARGIN_X;
    ctx.textBaseline = 'middle';
    mutHeaders.forEach((h, i) => {
      const f = `600 17px ${FONT_SANS}`;
      ctx.font = f;
      ctx.fillStyle =
        i === 1 ? COLORS.green : i === 2 ? '#3B4D8F' : i === 3 ? '#0F6D7A' : i === 4 ? COLORS.red : COLORS.inkGreen;
      ctx.fillText(doc.fitText(h, mutCols[i] - 24, f), colX + 14, doc.y + mutHeaderH / 2);
      colX += mutCols[i];
    });

    ziwei.mutagenTable.forEach((row, rIdx) => {
      const ry = doc.y + mutHeaderH + rIdx * mutRowH;
      if (row.scope === input.activeScope) {
        ctx.fillStyle = '#FAF4E8';
        ctx.fillRect(MARGIN_X + 1, ry, CONTENT_W - 2, mutRowH);
      }
      ctx.strokeStyle = COLORS.hairlineSoft;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, ry);
      ctx.lineTo(MARGIN_X + CONTENT_W, ry);
      ctx.stroke();

      const vals = [`${row.label}（${row.ganZhi}）`, row.lu, row.quan, row.ke, row.ji];
      let rx = MARGIN_X;
      vals.forEach((v, cIdx) => {
        const f = cIdx === 0 ? `600 17.5px ${FONT_SERIF}` : `500 17.5px ${FONT_SANS}`;
        ctx.font = f;
        ctx.fillStyle = cIdx === 0 ? COLORS.inkGreen : COLORS.textBody;
        ctx.fillText(doc.fitText(v || '—', mutCols[cIdx] - 24, f), rx + 14, ry + mutRowH / 2);
        rx += mutCols[cIdx];
      });
    });
    doc.resetTextState();
  }

  doc.y += mutTableH + 18;

  // Key 7 Palaces Compact Grid
  const keyNames = ['命宮', '財帛', '官祿', '遷移', '夫妻', '福德', '疾厄'];
  const keyPalaces = keyNames
    .map((n) => ziwei.palaces.find((p) => p.name === n))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const pHeaderH = 40;
  const pRowH = 42;
  const pTableH = pHeaderH + keyPalaces.length * pRowH;
  doc.ensureSpace(pTableH + 30);

  {
    const ctx = doc.ctx;
    doc.resetTextState();
    const pCols = [220, 460, 476, CONTENT_W - 1156];
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, pTableH, COLORS.white, COLORS.hairline);
    ctx.fillStyle = COLORS.surfaceSoft;
    ctx.fillRect(MARGIN_X + 1, doc.y + 1, CONTENT_W - 2, pHeaderH - 1);

    const pHeaders = ['重點宮位（干支）', '主星（亮度・本命四化）', '輔星吉煞', '大限歲數'];
    let px = MARGIN_X;
    ctx.textBaseline = 'middle';
    pHeaders.forEach((h, i) => {
      const f = `600 17px ${FONT_SANS}`;
      ctx.font = f;
      ctx.fillStyle = COLORS.inkGreen;
      ctx.fillText(doc.fitText(h, pCols[i] - 24, f), px + 14, doc.y + pHeaderH / 2);
      px += pCols[i];
    });

    keyPalaces.forEach((p, idx) => {
      const ry = doc.y + pHeaderH + idx * pRowH;
      ctx.strokeStyle = COLORS.hairlineSoft;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, ry);
      ctx.lineTo(MARGIN_X + CONTENT_W, ry);
      ctx.stroke();

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
        const f =
          cIdx === 0
            ? `600 17px ${FONT_SERIF}`
            : cIdx === 3
              ? `400 17px ${FONT_MONO}`
              : `400 17px ${FONT_SANS}`;
        ctx.font = f;
        ctx.fillStyle = cIdx === 1 ? COLORS.vermilion : COLORS.textBody;
        ctx.fillText(doc.fitText(v, pCols[cIdx] - 24, f), rx + 14, ry + pRowH / 2);
        rx += pCols[cIdx];
      });
    });
    doc.resetTextState();
  }

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
  const shenShaWrapped = cols.map((c) => doc.wrapText(c.shenSha, dataColW - 22, shenShaFont));
  const maxShenShaLines = Math.max(1, ...shenShaWrapped.map((l) => l.length));
  const shenShaRowH = Math.max(58, maxShenShaLines * 24 + 22);

  const hiddenFont = `400 15.5px ${FONT_SANS}`;
  const hiddenWrapped = cols.map((c) => doc.wrapText(c.hidden, dataColW - 22, hiddenFont));
  const maxHiddenLines = Math.max(1, ...hiddenWrapped.map((l) => l.length));
  const hiddenRowH = Math.max(58, maxHiddenLines * 24 + 22);

  const rowDefs = [
    { name: '柱位', h: 62 },
    { name: '主星十神', h: 42 },
    { name: '天干地支', h: 102 },
    { name: '地支藏干', h: hiddenRowH },
    { name: '星運長生', h: 42 },
    { name: '納音五行', h: 42 },
    { name: '旬空空亡', h: 42 },
    { name: '古典神煞', h: shenShaRowH },
  ];
  const totalTableH = rowDefs.reduce((s, r) => s + r.h, 0);

  doc.ensureSpace(totalTableH + 24);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, totalTableH, COLORS.white, COLORS.hairline);

  {
    const ctx = doc.ctx;
    doc.resetTextState();
    let ry = doc.y;

    cols.forEach((col, i) => {
      const cx = MARGIN_X + labelColW + i * dataColW;
      if (col.isFlow) {
        ctx.fillStyle = '#FAF4E8';
        ctx.fillRect(cx, doc.y + 1, dataColW, totalTableH - 2);
      } else if (col.isDay) {
        ctx.fillStyle = '#F3F7F5';
        ctx.fillRect(cx, doc.y + 1, dataColW, totalTableH - 2);
      }
    });

    ctx.fillStyle = COLORS.surfaceSoft;
    ctx.fillRect(MARGIN_X + 1, doc.y + 1, labelColW - 1, totalTableH - 2);

    rowDefs.forEach((row, rIdx) => {
      if (rIdx > 0) {
        ctx.strokeStyle = COLORS.hairlineSoft;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(MARGIN_X, ry);
        ctx.lineTo(MARGIN_X + CONTENT_W, ry);
        ctx.stroke();
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `600 17px ${FONT_SANS}`;
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(row.name, MARGIN_X + 18, ry + row.h / 2);

      cols.forEach((col, cIdx) => {
        const cx = MARGIN_X + labelColW + cIdx * dataColW;
        const centerX = cx + dataColW / 2;
        ctx.textAlign = 'center';

        if (rIdx === 0) {
          ctx.textBaseline = 'middle';
          const titleF = `700 19.5px ${FONT_SERIF}`;
          ctx.font = titleF;
          ctx.fillStyle = col.isFlow ? COLORS.gold : COLORS.inkGreen;
          ctx.fillText(
            doc.fitText(col.title, dataColW - 16, titleF),
            centerX,
            ry + (col.sub ? 21 : row.h / 2)
          );
          if (col.sub) {
            const subF = `500 14px ${FONT_SANS}`;
            ctx.font = subF;
            ctx.fillStyle = col.isDay ? COLORS.vermilion : COLORS.gold;
            ctx.fillText(doc.fitText(col.sub, dataColW - 16, subF), centerX, ry + 45);
          }
        } else if (rIdx === 1) {
          ctx.textBaseline = 'middle';
          ctx.font = `600 17px ${FONT_SANS}`;
          ctx.fillStyle = col.isDay ? COLORS.vermilion : COLORS.pine;
          ctx.fillText(col.tenStar, centerX, ry + row.h / 2);
        } else if (rIdx === 2) {
          ctx.textBaseline = 'middle';
          ctx.font = `700 36px ${FONT_SERIF}`;
          ctx.fillStyle = ELEMENT_HEX[col.stemEl];
          ctx.fillText(col.stem, centerX, ry + 30);
          ctx.fillStyle = ELEMENT_HEX[col.branchEl];
          ctx.fillText(col.branch, centerX, ry + 74);
        } else if (rIdx === 3) {
          ctx.font = hiddenFont;
          ctx.fillStyle = COLORS.textBody;
          ctx.textBaseline = 'top';
          let ly = ry + 11;
          hiddenWrapped[cIdx].forEach((l) => {
            ctx.fillText(l, centerX, ly);
            ly += 24;
          });
        } else if (rIdx === 4) {
          ctx.textBaseline = 'middle';
          ctx.font = `600 17px ${FONT_SANS}`;
          ctx.fillStyle = COLORS.pine;
          ctx.fillText(col.terrain, centerX, ry + row.h / 2);
        } else if (rIdx === 5) {
          ctx.textBaseline = 'middle';
          ctx.font = `400 16px ${FONT_SANS}`;
          ctx.fillStyle = COLORS.textBody;
          ctx.fillText(col.sound, centerX, ry + row.h / 2);
        } else if (rIdx === 6) {
          ctx.textBaseline = 'middle';
          ctx.font = `500 17px ${FONT_SERIF}`;
          ctx.fillStyle = COLORS.textMuted;
          ctx.fillText(col.kongWang, centerX, ry + row.h / 2);
        } else if (rIdx === 7) {
          ctx.font = shenShaFont;
          ctx.fillStyle = COLORS.textBody;
          ctx.textBaseline = 'top';
          let ly = ry + 11;
          shenShaWrapped[cIdx].forEach((l) => {
            ctx.fillText(l, centerX, ly);
            ly += 24;
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
    doc.resetTextState();
  }

  doc.y += totalTableH + 18;

  // Five Elements + Decade Fortunes Strip (acquire fresh ctx AFTER ensureSpace!)
  const decadeList = bazi.decadeFortunes
    .slice(0, 8)
    .map((d) => `${d.ganZhi}(${d.startAge}歲)`)
    .join('  →  ');
  const decadeFont = `500 17px ${FONT_SANS}`;
  const decadeLines = doc.wrapText(decadeList, CONTENT_W - 150, decadeFont);
  const stripH = 66 + decadeLines.length * 26 + 20;

  doc.ensureSpace(stripH + 28);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, stripH, COLORS.white, COLORS.hairline);

  {
    const ctx = doc.ctx;
    doc.resetTextState();

    ctx.font = `600 17px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.inkGreen;
    ctx.fillText('原局五行分佈（干支八字計數）', MARGIN_X + 22, doc.y + 18);

    const elements: FiveElement[] = ['木', '火', '土', '金', '水'];
    elements.forEach((el, idx) => {
      const ex = MARGIN_X + 340 + idx * 175;
      ctx.font = `700 20px ${FONT_SERIF}`;
      ctx.fillStyle = ELEMENT_HEX[el];
      ctx.fillText(`${el}：${bazi.elementCounts[el]}`, ex, doc.y + 15);
    });

    ctx.strokeStyle = COLORS.hairlineSoft;
    ctx.beginPath();
    ctx.moveTo(MARGIN_X + 20, doc.y + 54);
    ctx.lineTo(MARGIN_X + CONTENT_W - 20, doc.y + 54);
    ctx.stroke();

    ctx.font = `600 16.5px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('大運序列：', MARGIN_X + 22, doc.y + 70);

    ctx.font = decadeFont;
    ctx.fillStyle = COLORS.textBody;
    let dy = doc.y + 70;
    decadeLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 122, dy);
      dy += 26;
    });
  }

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
  const innerW = cardW - 40;
  const titleFont = `700 20.5px ${FONT_SERIF}`;
  const subFont = `500 15.5px ${FONT_SANS}`;
  const descFont = `400 16px ${FONT_SANS}`;

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
  ].map((def) => {
    const tLines = doc.wrapText(def.title, innerW, titleFont);
    const subLines = doc.wrapText(def.sub, innerW, subFont);
    const descLines = doc.wrapText(def.desc, innerW, descFont).slice(0, 4);
    const neededH =
      18 +
      26 +
      tLines.length * 29 +
      8 +
      subLines.length * 23 +
      10 +
      descLines.length * 24 +
      20;
    return { ...def, tLines, subLines, descLines, neededH };
  });

  for (let row = 0; row < 2; row++) {
    const leftCard = cardDefs[row * 2];
    const rightCard = cardDefs[row * 2 + 1];
    const rowCardH = Math.max(leftCard.neededH, rightCard.neededH, 178);

    doc.ensureSpace(rowCardH + 20);
    const ctx = doc.ctx;
    doc.resetTextState();

    [leftCard, rightCard].forEach((def, col) => {
      const cx = MARGIN_X + col * (cardW + gap);
      const cy = doc.y;
      doc.drawCardBox(cx, cy, cardW, rowCardH, COLORS.white, COLORS.hairline);

      let ly = cy + 18;
      ctx.font = `600 15.5px ${FONT_SANS}`;
      ctx.fillStyle = def.accent;
      ctx.fillText(def.role, cx + 20, ly);
      ly += 26;

      ctx.font = titleFont;
      ctx.fillStyle = COLORS.inkGreen;
      def.tLines.forEach((l) => {
        ctx.fillText(l, cx + 20, ly);
        ly += 29;
      });
      ly += 8;

      ctx.font = subFont;
      ctx.fillStyle = COLORS.textMuted;
      def.subLines.forEach((l) => {
        ctx.fillText(l, cx + 20, ly);
        ly += 23;
      });
      ly += 10;

      ctx.font = descFont;
      ctx.fillStyle = COLORS.textBody;
      def.descLines.forEach((l) => {
        ctx.fillText(l, cx + 20, ly);
        ly += 24;
      });
    });

    doc.y += rowCardH + 18;
  }

  // 5-Year Tarot Trajectory Bar
  const trajH = 88;
  doc.ensureSpace(trajH + 30);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, trajH, COLORS.white, COLORS.hairline);

  {
    const ctx = doc.ctx;
    doc.resetTextState();
    const tColW = CONTENT_W / tarot.yearTrajectory.length;
    tarot.yearTrajectory.forEach((entry, idx) => {
      const tx = MARGIN_X + idx * tColW;
      if (entry.isCurrent) {
        ctx.fillStyle = '#FAF4E8';
        ctx.fillRect(tx + 1, doc.y + 1, tColW - 2, trajH - 2);
      }
      if (idx > 0) {
        ctx.strokeStyle = COLORS.hairlineSoft;
        ctx.beginPath();
        ctx.moveTo(tx, doc.y + 12);
        ctx.lineTo(tx, doc.y + trajH - 12);
        ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `500 15px ${FONT_MONO}`;
      ctx.fillStyle = entry.isCurrent ? COLORS.gold : COLORS.textMuted;
      ctx.fillText(`${entry.cycleYear}${entry.isCurrent ? ' (當期)' : ''}`, tx + tColW / 2, doc.y + 16);

      const cardFont = `700 19.5px ${FONT_SERIF}`;
      ctx.font = cardFont;
      ctx.fillStyle = COLORS.inkGreen;
      ctx.fillText(
        doc.fitText(`${entry.card.displayNumber} ${entry.card.name}`, tColW - 18, cardFont),
        tx + tColW / 2,
        doc.y + 46
      );
      ctx.textAlign = 'left';
    });
    doc.resetTextState();
  }

  doc.y += trajH + 34;
}

function drawLabelWithHalo(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  font: string,
  align: CanvasTextAlign = 'center'
) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  const tw = ctx.measureText(text).width;
  const padX = 5;
  const padY = 2;
  const boxX =
    align === 'center' ? x - tw / 2 - padX : align === 'right' ? x - tw - padX : x - padX;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillRect(boxX, y - padY, tw + padX * 2, 20 + padY * 2);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function renderTenYearTrendSection(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const trend = calculateTenYearTrend(input.client, input.targetDate);
  doc.drawSectionHeader(
    `未來十年運程趨勢與關鍵轉折點（${trend.startYear}–${trend.endYear}）`,
    `整合紫微流年四化・八字歲運長生神煞・塔羅個人流年牌 · 十年均勢 ${trend.averageScore} · 高峰 ${trend.peakPoint.year}(${trend.peakPoint.compositeScore}) · 築底 ${trend.troughPoint.year}(${trend.troughPoint.compositeScore})`
  );

  // Canvas2D high-DPI Line Chart
  const chartBoxH = 404;
  doc.ensureSpace(chartBoxH + 24);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, chartBoxH, COLORS.white, COLORS.hairline);

  {
    const ctx = doc.ctx;
    doc.resetTextState();
    const padL = 78;
    const padR = 52;
    const padT = 66;
    const padB = 72;
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
    doc.resetTextState();

    // Legend top
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

    // Track placed label bounding boxes to avoid any callout text collisions
    const placedBoxes: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const calloutFont = `600 14.5px ${FONT_SANS}`;

    // X Labels + Nodes + Turning Point Callouts
    trend.points.forEach((p, idx) => {
      const px = xOf(p.year);
      const py = yOf(p.compositeScore);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `600 16px ${FONT_MONO}`;
      ctx.fillStyle = COLORS.inkGreen;
      ctx.fillText(String(p.year), px, plotY + plotH + 14);

      ctx.font = `400 14.5px ${FONT_SANS}`;
      ctx.fillStyle = p.turningPoint ? COLORS.gold : COLORS.textMuted;
      ctx.fillText(p.ganZhi, px, plotY + plotH + 38);

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

        const labelText = `${p.turningPoint.shortTag} ${p.compositeScore}`;
        ctx.font = calloutFont;
        const lw = ctx.measureText(labelText).width + 12;
        const lh = 22;
        const align: CanvasTextAlign =
          idx === 0 ? 'left' : idx === trend.points.length - 1 ? 'right' : 'center';
        const x1 = align === 'left' ? px - 4 : align === 'right' ? px - lw + 4 : px - lw / 2;
        const x2 = x1 + lw;

        const preferBelow = p.turningPoint.kind === 'trough' || py < plotY + 40;
        const candidateYs = preferBelow
          ? [py + 14, py - 32, py + 38, py - 56]
          : [py - 32, py + 14, py - 56, py + 38];

        let chosenY = candidateYs[0];
        for (const cy of candidateYs) {
          const clampedY = Math.max(plotY - 14, Math.min(plotY + plotH - lh - 4, cy));
          const overlaps = placedBoxes.some(
            (b) => x1 < b.x2 + 4 && x2 + 4 > b.x1 && clampedY < b.y2 + 3 && clampedY + lh + 3 > b.y1
          );
          chosenY = clampedY;
          if (!overlaps) break;
        }
        placedBoxes.push({ x1, y1: chosenY, x2, y2: chosenY + lh });
        drawLabelWithHalo(ctx, labelText, px, chosenY, tpColor, calloutFont, align);
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
    doc.resetTextState();
  }

  doc.y += chartBoxH + 18;

  // Turning Points Summary List (rendered row-by-row with fresh ctx AFTER ensureSpace!)
  if (trend.turningPoints.length > 0) {
    const leftColW = 248;
    const rightX = MARGIN_X + leftColW + 24;
    const rightW = CONTENT_W - leftColW - 44;
    const tagFont = `600 15.5px ${FONT_SANS}`;
    const rowFont = `400 16.5px ${FONT_SANS}`;

    const wrapped = trend.turningPoints.map((pt) => {
      const tagLines = doc.wrapText(
        `${pt.turningPoint!.label}（${pt.compositeScore}）`,
        leftColW - 12,
        tagFont
      );
      const reasonLines = doc.wrapText(pt.turningPoint!.reason, rightW, rowFont);
      const leftH = 12 + 24 + tagLines.length * 22 + 12;
      const rightH = 12 + reasonLines.length * 25 + 12;
      return {
        pt,
        tagLines,
        reasonLines,
        rowH: Math.max(66, leftH, rightH),
      };
    });

    const listH = 20 + wrapped.reduce((s, w) => s + w.rowH, 0);
    doc.ensureSpace(listH + 26);
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, listH, COLORS.white, COLORS.hairline);

    const ctx = doc.ctx;
    doc.resetTextState();
    let ry = doc.y + 10;
    wrapped.forEach((w, idx) => {
      if (idx > 0) {
        ctx.strokeStyle = COLORS.hairlineSoft;
        ctx.beginPath();
        ctx.moveTo(MARGIN_X + 16, ry);
        ctx.lineTo(MARGIN_X + CONTENT_W - 16, ry);
        ctx.stroke();
      }
      ctx.font = `700 17px ${FONT_MONO}`;
      ctx.fillStyle = COLORS.inkGreen;
      ctx.fillText(`${w.pt.year} ${w.pt.ganZhi}`, MARGIN_X + 20, ry + 12);

      ctx.font = tagFont;
      ctx.fillStyle = COLORS.gold;
      let ty = ry + 38;
      w.tagLines.forEach((tl) => {
        ctx.fillText(tl, MARGIN_X + 20, ty);
        ty += 22;
      });

      ctx.font = rowFont;
      ctx.fillStyle = COLORS.textBody;
      let ly = ry + 12;
      w.reasonLines.forEach((l) => {
        ctx.fillText(l, rightX, ly);
        ly += 25;
      });
      ry += w.rowH;
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

  const leftColW = 264;
  const rightX = MARGIN_X + leftColW + 24;
  const rightW = CONTENT_W - leftColW - 44;

  const dateFont = `700 17.5px ${FONT_MONO}`;
  const sigFont = `600 15.5px ${FONT_SANS}`;
  const gzFont = `400 14.5px ${FONT_SANS}`;
  const titleFont = `700 19px ${FONT_SERIF}`;
  const bodyFont = `400 16.5px ${FONT_SANS}`;

  alerts.items.forEach((item) => {
    const dateText = `${item.date}${item.exactTime ? ` ${item.exactTime}` : ''}`;
    const sigLines = doc.wrapText(`${item.countdownLabel} · ${item.signalLabel}`, leftColW - 12, sigFont);
    const gzLines = doc.wrapText(item.ganZhiTag, leftColW - 12, gzFont);
    const leftH = 18 + 28 + sigLines.length * 22 + 6 + gzLines.length * 21 + 18;

    const titleLines = doc.wrapText(item.title, rightW, titleFont);
    const sumLines = doc.wrapText(item.summary, rightW, bodyFont);
    const tipLines = doc.wrapText(`應對提示：${item.actionTip}`, rightW, bodyFont);
    const rightH =
      18 +
      titleLines.length * 27 +
      8 +
      sumLines.length * 25 +
      6 +
      tipLines.length * 25 +
      18;

    const cardH = Math.max(leftH, rightH, 108);

    // CRITICAL: acquire ctx strictly AFTER ensureSpace!
    doc.ensureSpace(cardH + 14);
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, cardH, COLORS.white, COLORS.hairline);

    const ctx = doc.ctx;
    doc.resetTextState();

    const accent =
      item.kind === 'caution'
        ? COLORS.vermilion
        : item.kind === 'opportunity'
          ? COLORS.green
          : item.kind === 'milestone'
            ? COLORS.gold
            : COLORS.slateBlue;

    // Subtle vertical divider between date column and content column
    ctx.strokeStyle = COLORS.hairlineSoft;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGIN_X + leftColW + 8, doc.y + 16);
    ctx.lineTo(MARGIN_X + leftColW + 8, doc.y + cardH - 16);
    ctx.stroke();

    // Left column
    let leftY = doc.y + 18;
    ctx.font = dateFont;
    ctx.fillStyle = COLORS.inkGreen;
    ctx.fillText(doc.fitText(dateText, leftColW - 12, dateFont), MARGIN_X + 20, leftY);
    leftY += 28;

    ctx.font = sigFont;
    ctx.fillStyle = accent;
    sigLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 20, leftY);
      leftY += 22;
    });
    leftY += 6;

    ctx.font = gzFont;
    ctx.fillStyle = COLORS.textMuted;
    gzLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 20, leftY);
      leftY += 21;
    });

    // Right column
    let rightY = doc.y + 18;
    ctx.font = titleFont;
    ctx.fillStyle = COLORS.inkGreen;
    titleLines.forEach((l) => {
      ctx.fillText(l, rightX, rightY);
      rightY += 27;
    });
    rightY += 8;

    ctx.font = bodyFont;
    ctx.fillStyle = COLORS.textBody;
    sumLines.forEach((l) => {
      ctx.fillText(l, rightX, rightY);
      rightY += 25;
    });
    rightY += 6;

    ctx.fillStyle = COLORS.pine;
    tipLines.forEach((l) => {
      ctx.fillText(l, rightX, rightY);
      rightY += 25;
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

  const chartBoxH = 414;
  doc.ensureSpace(chartBoxH + 24);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, chartBoxH, COLORS.white, COLORS.hairline);

  {
    const ctx = doc.ctx;
    doc.resetTextState();
    const padL = 82;
    const padR = 86;
    const padT = 82;
    const padB = 72;
    const plotX = MARGIN_X + padL;
    const plotY = doc.y + padT;
    const plotW = CONTENT_W - padL - padR;
    const plotH = chartBoxH - padT - padB;

    const xOf = (m: number) => plotX + ((m - 1) / 11) * plotW;
    const yLeft = (v: number) => plotY + ((100 - v) / 85) * plotH;
    const yRight = (v: number) => plotY + ((50 - v) / 100) * plotH;

    // Axis headers
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
    doc.resetTextState();

    // Birthday Tarot switch vertical marker (clamped horizontally inside plot bounds)
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

      const switchFont = `600 14px ${FONT_SANS}`;
      const switchText = `生日換牌：${flow.postBirthdayCardName}`;
      ctx.font = switchFont;
      const sw = ctx.measureText(switchText).width;
      const clampedX = Math.max(plotX + sw / 2, Math.min(plotX + plotW - sw / 2, sx));
      drawLabelWithHalo(ctx, switchText, clampedX, plotY - 30, COLORS.gold, switchFont, 'center');
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

    // Month labels + nodes + collision-safe burnout callouts
    const burnoutPlaced: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const burnoutFont = `600 13px ${FONT_SANS}`;

    flow.points.forEach((p, idx) => {
      const px = xOf(p.month);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = p.isTargetMonth ? `700 15.5px ${FONT_SANS}` : `500 15px ${FONT_SANS}`;
      ctx.fillStyle = p.isTargetMonth ? COLORS.inkGreen : COLORS.textMuted;
      ctx.fillText(p.monthLabel, px, plotY + plotH + 14);

      ctx.font = `400 13.5px ${FONT_SANS}`;
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(p.baziMonthGanZhi, px, plotY + plotH + 38);

      // Outer node
      ctx.beginPath();
      ctx.arc(px, yLeft(p.fortuneScore), 4.5, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.white;
      ctx.fill();
      ctx.strokeStyle = COLORS.inkGreen;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner node
      const ey = yRight(p.emotionalScore);
      const isBurnout = p.resonanceKind === 'outer_high_inner_low';
      ctx.beginPath();
      ctx.arc(px, ey, isBurnout ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isBurnout ? COLORS.rose : COLORS.white;
      ctx.fill();
      ctx.strokeStyle = COLORS.rose;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (isBurnout) {
        const align: CanvasTextAlign =
          idx === 0 ? 'left' : idx === flow.points.length - 1 ? 'right' : 'center';
        const bw = 54;
        const bh = 20;
        const x1 = align === 'left' ? px - 4 : align === 'right' ? px - bw + 4 : px - bw / 2;
        const x2 = x1 + bw;
        const nearBottom = ey > plotY + plotH - 32;
        const candidates = nearBottom
          ? [ey - 28, ey - 50, ey + 10]
          : [ey + 12, ey - 28, ey + 34];

        let chosenY = candidates[0];
        for (const cy of candidates) {
          const clampedY = Math.max(plotY + 2, Math.min(plotY + plotH - bh - 4, cy));
          const overlaps = burnoutPlaced.some(
            (b) => x1 < b.x2 + 2 && x2 + 2 > b.x1 && clampedY < b.y2 + 2 && clampedY + bh + 2 > b.y1
          );
          chosenY = clampedY;
          if (!overlaps) break;
        }
        burnoutPlaced.push({ x1, y1: chosenY, x2, y2: chosenY + bh });
        drawLabelWithHalo(ctx, '宜喘息', px, chosenY, COLORS.rose, burnoutFont, align);
      }
      ctx.textAlign = 'left';
    });
    doc.resetTextState();
  }

  doc.y += chartBoxH + 16;

  // Empathetic Insight Card (acquire fresh ctx AFTER ensureSpace!)
  const targetPt =
    flow.points.find((p) => p.isTargetMonth) ?? flow.mostCareNeededMonth;
  const careFont = `400 17px ${FONT_SANS}`;
  const noteLines = doc.wrapText(
    `當月心境覺察（${targetPt.monthLabel}・${targetPt.resonanceLabel}）：${targetPt.empathyNote}`,
    CONTENT_W - 48,
    careFont
  );
  const tipLines = doc.wrapText(
    `狀態調整建議：${targetPt.selfCareTip}${
      flow.burnoutRiskMonths.length > 0
        ? `  ｜  全年「外順內耗」提醒月份：${flow.burnoutRiskMonths.map((m) => m.monthLabel).join('、')}。`
        : ''
    }`,
    CONTENT_W - 48,
    careFont
  );

  const careBoxH = 22 + noteLines.length * 27 + 12 + tipLines.length * 27 + 20;
  doc.ensureSpace(careBoxH + 26);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, careBoxH, COLORS.white, COLORS.hairline);

  {
    const ctx = doc.ctx;
    doc.resetTextState();
    let cy = doc.y + 22;
    ctx.font = careFont;
    ctx.fillStyle = COLORS.textBody;
    noteLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, cy);
      cy += 27;
    });
    cy += 12;
    ctx.fillStyle = COLORS.rose;
    tipLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, cy);
      cy += 27;
    });
  }

  doc.y += careBoxH + 30;
}

function renderAISummarySection(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const { aiSummary } = input;
  doc.drawSectionHeader(
    'AI 深度解盤總結（全息結構化大綱）',
    '整合紫微勸學齋四化、子平八字十神神煞與生日塔羅原型生成之雙向造命與覺察總覽'
  );

  if (!aiSummary) {
    const emptyFont = `400 18px ${FONT_SANS}`;
    const emptyLines = doc.wrapText(
      '本次匯出時尚未取得 AI 解盤大綱（可能正在載入或尚未設定 API 金鑰）；其他已勾選章節皆已完整收錄。',
      CONTENT_W - 48,
      emptyFont
    );
    const emptyH = 26 + emptyLines.length * 28 + 20;
    doc.ensureSpace(emptyH + 20);
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, emptyH, COLORS.white, COLORS.hairline);
    const ctx = doc.ctx;
    doc.resetTextState();
    ctx.font = emptyFont;
    ctx.fillStyle = COLORS.textMuted;
    let ey = doc.y + 24;
    emptyLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, ey);
      ey += 28;
    });
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
      22 +
      28 +
      hLines.length * 34 +
      12 +
      wrappedParas.reduce((sum, p) => sum + p.lines.length * 30 + 12, 0) +
      16;

    doc.ensureSpace(totalH + 20);
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, totalH, COLORS.white, COLORS.hairline);

    const ctx = doc.ctx;
    doc.resetTextState();
    let ly = doc.y + 22;

    ctx.font = `600 16px ${FONT_SANS}`;
    ctx.fillStyle = accent;
    ctx.fillText(kicker, MARGIN_X + 24, ly);
    ly += 28;

    ctx.font = headFont;
    ctx.fillStyle = COLORS.inkGreen;
    hLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, ly);
      ly += 34;
    });
    ly += 12;

    wrappedParas.forEach((p) => {
      ctx.font = bodyFont;
      p.lines.forEach((l, idx) => {
        ctx.fillStyle = idx === 0 && p.labelColor ? p.labelColor : COLORS.textBody;
        ctx.fillText(l, MARGIN_X + 24, ly);
        ly += 30;
      });
      ly += 12;
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
    const lines = doc.wrapText(ind.summary, indColW - 32, indFont);
    return { ind, lines, h: 48 + lines.length * 26 + 18 };
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
    22 +
    28 +
    c2HeadLines.length * 34 +
    12 +
    c2SummaryLines.length * 30 +
    (indTotalH > 0 ? 20 + indTotalH : 0) +
    24;

  doc.ensureSpace(c2TotalH + 20);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, c2TotalH, COLORS.white, COLORS.hairline);

  {
    const ctx = doc.ctx;
    doc.resetTextState();
    let ly = doc.y + 22;

    ctx.font = `600 16px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.gold;
    ctx.fillText('02. 當前流年運勢與心理課題', MARGIN_X + 24, ly);
    ly += 28;

    ctx.font = headFont;
    ctx.fillStyle = COLORS.inkGreen;
    c2HeadLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, ly);
      ly += 34;
    });
    ly += 12;

    ctx.font = bodyFont;
    ctx.fillStyle = COLORS.textBody;
    c2SummaryLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, ly);
      ly += 30;
    });
    ly += 20;

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

      const badgeFont = `600 15px ${FONT_SANS}`;
      const badgeText = doc.fitText(
        `${lightPrefix}・${item.ind.statusLabel}`,
        indColW * 0.55,
        badgeFont
      );
      ctx.font = badgeFont;
      const bw = ctx.measureText(badgeText).width;
      ctx.fillStyle = lightColor;
      ctx.fillText(badgeText, ix + indColW - 16 - bw, iy + 16);

      const domainFont = `700 18px ${FONT_SERIF}`;
      ctx.font = domainFont;
      ctx.fillStyle = COLORS.inkGreen;
      ctx.fillText(
        doc.fitText(item.ind.domain, indColW - 44 - bw, domainFont),
        ix + 16,
        iy + 14
      );

      ctx.font = indFont;
      ctx.fillStyle = COLORS.textBody;
      let ty = iy + 48;
      item.lines.forEach((l) => {
        ctx.fillText(l, ix + 16, ty);
        ty += 26;
      });
    });
  }

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
    const emptyFont = `400 18px ${FONT_SANS}`;
    const emptyLines = doc.wrapText(
      '本次匯出時尚未取得跨體系合參結果（可於「AI 深度解盤」分頁生成後再次匯出）。',
      CONTENT_W - 48,
      emptyFont
    );
    const emptyH = 26 + emptyLines.length * 28 + 20;
    doc.ensureSpace(emptyH + 20);
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, emptyH, COLORS.white, COLORS.hairline);
    const ctx = doc.ctx;
    doc.resetTextState();
    ctx.font = emptyFont;
    ctx.fillStyle = COLORS.textMuted;
    let ey = doc.y + 24;
    emptyLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, ey);
      ey += 28;
    });
    doc.y += emptyH + 28;
    return;
  }

  const bodyFont = `400 17.5px ${FONT_SANS}`;
  const headFont = `700 22px ${FONT_SERIF}`;

  // Overall Verdict Box (acquire fresh ctx AFTER ensureSpace!)
  const verdictHeadLines = doc.wrapText(analysis.overallVerdict.headline, CONTENT_W - 48, headFont);
  const sumLines = doc.wrapText(analysis.overallVerdict.summary, CONTENT_W - 48, bodyFont);
  const verdictH = 22 + 28 + verdictHeadLines.length * 33 + 10 + sumLines.length * 28 + 22;

  doc.ensureSpace(verdictH + 18);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, verdictH, COLORS.white, COLORS.hairline);

  {
    const ctx = doc.ctx;
    doc.resetTextState();
    let vy = doc.y + 22;
    ctx.font = `600 16px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(`合參定性：${analysis.overallVerdict.harmonyLabel}`, MARGIN_X + 24, vy);
    vy += 28;

    ctx.font = headFont;
    ctx.fillStyle = COLORS.inkGreen;
    verdictHeadLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, vy);
      vy += 33;
    });
    vy += 10;

    ctx.font = bodyFont;
    ctx.fillStyle = COLORS.textBody;
    sumLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, vy);
      vy += 28;
    });
  }
  doc.y += verdictH + 16;

  // Findings Cards (acquire fresh ctx AFTER each ensureSpace!)
  const fTitleFont = `700 20px ${FONT_SERIF}`;
  const smallFont = `400 16.5px ${FONT_SANS}`;
  analysis.findings.forEach((f, idx) => {
    const titleLines = doc.wrapText(f.title, CONTENT_W - 48, fTitleFont);
    const evLines = doc.wrapText(
      `紫微依據：${f.ziweiEvidence}  ｜  八字依據：${f.baziEvidence}`,
      CONTENT_W - 48,
      smallFont
    );
    const synLines = doc.wrapText(f.synthesis, CONTENT_W - 48, smallFont);
    const advLines = doc.wrapText(`命理建議：${f.advice}`, CONTENT_W - 48, smallFont);
    const fH =
      20 +
      26 +
      titleLines.length * 29 +
      10 +
      evLines.length * 25 +
      8 +
      synLines.length * 25 +
      8 +
      advLines.length * 25 +
      20;

    doc.ensureSpace(fH + 14);
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, fH, COLORS.white, COLORS.hairline);

    const ctx = doc.ctx;
    doc.resetTextState();
    const isConflict = f.type === 'conflict';
    let fy = doc.y + 20;

    ctx.font = `600 15.5px ${FONT_SANS}`;
    ctx.fillStyle = isConflict ? COLORS.vermilion : COLORS.green;
    ctx.fillText(
      `0${idx + 1}  ${isConflict ? '衝突張力點' : '互補增益點'} · ${f.domain}`,
      MARGIN_X + 24,
      fy
    );
    fy += 26;

    ctx.font = fTitleFont;
    ctx.fillStyle = COLORS.inkGreen;
    titleLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, fy);
      fy += 29;
    });
    fy += 10;

    ctx.font = smallFont;
    ctx.fillStyle = COLORS.textMuted;
    evLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, fy);
      fy += 25;
    });
    fy += 8;

    ctx.fillStyle = COLORS.textBody;
    synLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, fy);
      fy += 25;
    });
    fy += 8;

    ctx.fillStyle = COLORS.pine;
    advLines.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, fy);
      fy += 25;
    });

    doc.y += fH + 12;
  });

  // Integrated Recommendations Strip
  if (analysis.integratedRecommendations?.length > 0) {
    const recHeadFont = `700 18px ${FONT_SERIF}`;
    const recBodyFont = `400 16px ${FONT_SANS}`;
    const recItems = analysis.integratedRecommendations.map((rec, i) => {
      const actionLines = doc.wrapText(rec.action, CONTENT_W - 48, recBodyFont);
      const timingLines = doc.wrapText(`時機節奏：${rec.timingNote}`, CONTENT_W - 48, recBodyFont);
      const h = 16 + 26 + actionLines.length * 24 + 4 + timingLines.length * 24 + 14;
      return { idx: i + 1, focus: rec.focus, actionLines, timingLines, h };
    });

    const totalRecH = 44 + recItems.reduce((s, r) => s + r.h, 0) + 12;
    doc.ensureSpace(totalRecH + 16);
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, totalRecH, COLORS.white, COLORS.hairline);

    const ctx = doc.ctx;
    doc.resetTextState();
    let ry = doc.y + 18;
    ctx.font = `600 16px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.inkGreen;
    ctx.fillText('跨體系整合命理建議（調候・格局・時機）', MARGIN_X + 24, ry);
    ry += 28;

    recItems.forEach((r, idx) => {
      if (idx > 0) {
        ctx.strokeStyle = COLORS.hairlineSoft;
        ctx.beginPath();
        ctx.moveTo(MARGIN_X + 24, ry);
        ctx.lineTo(MARGIN_X + CONTENT_W - 24, ry);
        ctx.stroke();
      }
      ry += 14;
      ctx.font = recHeadFont;
      ctx.fillStyle = COLORS.gold;
      ctx.fillText(`0${r.idx}  ${r.focus}`, MARGIN_X + 24, ry);
      ry += 28;

      ctx.font = recBodyFont;
      ctx.fillStyle = COLORS.textBody;
      r.actionLines.forEach((l) => {
        ctx.fillText(l, MARGIN_X + 24, ry);
        ry += 24;
      });
      ry += 4;
      ctx.fillStyle = COLORS.textMuted;
      r.timingLines.forEach((l) => {
        ctx.fillText(l, MARGIN_X + 24, ry);
        ry += 24;
      });
      ry += 10;
    });

    doc.y += totalRecH + 18;
  }

  doc.y += 12;
}

function renderNotesSection(doc: EditorialCanvasDoc, notes: string) {
  const trimmed = notes.trim();
  if (!trimmed) return;

  doc.drawSectionHeader('諮詢師備忘筆記');
  const font = `400 18px ${FONT_SANS}`;
  const lineH = 30;
  const allLines = doc.wrapText(trimmed, CONTENT_W - 48, font);

  // Paginate long notes cleanly if they exceed remaining page height
  let offset = 0;
  while (offset < allLines.length) {
    const availH = FOOTER_SAFE_Y - doc.y - 44;
    let maxLinesHere = Math.floor((availH - 40) / lineH);
    if (maxLinesHere < 2) {
      doc.newPage(false);
      maxLinesHere = Math.floor((FOOTER_SAFE_Y - doc.y - 84) / lineH);
    }
    const chunk = allLines.slice(offset, offset + Math.max(1, maxLinesHere));
    const boxH = Math.max(88, chunk.length * lineH + 40);

    doc.ensureSpace(boxH + 20);
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, boxH, COLORS.white, COLORS.hairline);

    const ctx = doc.ctx;
    doc.resetTextState();
    let ly = doc.y + 20;
    ctx.font = font;
    ctx.fillStyle = COLORS.textBody;
    chunk.forEach((l) => {
      ctx.fillText(l, MARGIN_X + 24, ly);
      ly += lineH;
    });

    doc.y += boxH + 18;
    offset += chunk.length;
  }
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

  const edition: PdfReportEdition = input.edition ?? 'consultant';
  const sections: PdfExportSections = {
    ...DEFAULT_PDF_SECTIONS,
    ...(input.sections ?? {}),
  };

  const editorialDoc = new EditorialCanvasDoc(
    input.client.name,
    input.targetDate,
    SCOPE_LABELS[input.activeScope],
    edition
  );

  renderMasthead(editorialDoc, input);

  if (sections.lifeGuidance) {
    renderLifeGuidanceSection(editorialDoc, input);
  }
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
  const editionTag = edition === 'handout' ? '交付閱讀版' : '專業完整版';
  const fileName = `全息人生地圖_${safeClientName}_${editionTag}_${safeScope}_${input.targetDate}.pdf`;
  pdf.save(fileName);
}
