import { jsPDF } from 'jspdf';
import {
  AIStage1Summary,
  BaziChartResult,
  ClientProfile,
  FiveElement,
  HoroscopeScope,
  TarotChartResult,
  ZiweiChartResult,
} from '../types/holistic';
import { SCOPE_LABELS } from '../engines/holisticPayload';
import { getSanFangSiZhengIndices } from '../engines/ziweiEngine';

export interface HolisticPdfExportInput {
  client: ClientProfile;
  ziwei: ZiweiChartResult;
  bazi: BaziChartResult;
  tarot: TarotChartResult;
  targetDate: string;
  activeScope: HoroscopeScope;
  aiSummary: AIStage1Summary | null;
}

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

class EditorialCanvasDoc {
  pages: HTMLCanvasElement[] = [];
  ctx!: CanvasRenderingContext2D;
  y = 0;
  private clientName: string;
  private targetDate: string;

  constructor(clientName: string, targetDate: string) {
    this.clientName = clientName;
    this.targetDate = targetDate;
    this.newPage(true);
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

    // Warm archival paper canvas background
    ctx.fillStyle = COLORS.paper;
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // Subtle page border frame
    ctx.strokeStyle = COLORS.hairline;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(48, 48, PAGE_W - 96, PAGE_H - 96);

    if (!isFirst) {
      // Running header on continuation pages
      ctx.font = `500 20px ${FONT_SERIF}`;
      ctx.fillStyle = COLORS.inkGreen;
      ctx.textBaseline = 'top';
      ctx.fillText(`全息人生地圖報告・${this.clientName}`, MARGIN_X, 72);

      ctx.font = `400 18px ${FONT_MONO}`;
      ctx.fillStyle = COLORS.textMuted;
      const rightText = `推演座標 ${this.targetDate}`;
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

  drawSectionHeader(num: string, title: string, subtitle?: string) {
    this.ensureSpace(subtitle ? 100 : 72);
    const ctx = this.ctx;

    // Gold numeral + Editorial Serif heading
    ctx.textBaseline = 'top';
    ctx.font = `600 22px ${FONT_MONO}`;
    ctx.fillStyle = COLORS.gold;
    ctx.fillText(num, MARGIN_X, this.y + 4);

    ctx.font = `700 30px ${FONT_SERIF}`;
    ctx.fillStyle = COLORS.inkGreen;
    ctx.fillText(title, MARGIN_X + 46, this.y);

    this.y += 40;

    if (subtitle) {
      ctx.font = `400 19px ${FONT_SANS}`;
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

  // Deep Ink Green masthead block
  const bannerH = 228;
  ctx.fillStyle = COLORS.inkGreen;
  ctx.fillRect(MARGIN_X, doc.y, CONTENT_W, bannerH);

  // Subtle gold inner rule
  ctx.strokeStyle = COLORS.goldLight;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(MARGIN_X + 12, doc.y + 12, CONTENT_W - 24, bannerH - 24);

  ctx.textBaseline = 'top';
  ctx.font = `500 18px ${FONT_SANS}`;
  ctx.fillStyle = COLORS.goldLight;
  ctx.fillText(
    '東方命理 × 西方原型 ｜ 全息人生地圖專業綜合報告',
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

  doc.y += bannerH + 28;

  // 4-Column Executive Anchor Summary Strip
  const colW = CONTENT_W / 4;
  const stripH = 114;
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, stripH, COLORS.white, COLORS.hairline);

  const mingPalace = ziwei.palaces[ziwei.mingPalaceIndex];
  const bodyPalace = ziwei.palaces[ziwei.bodyPalaceIndex];
  const anchors = [
    {
      kicker: '紫微命宮主星',
      main:
        mingPalace.majorStars.map((s) => s.name).join('・') || '空宮（借對宮）',
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

    ctx.font = `700 24px ${FONT_SERIF}`;
    ctx.fillStyle = COLORS.inkGreen;
    ctx.fillText(a.main, cx + 22, doc.y + 46);

    ctx.font = `400 16px ${FONT_SANS}`;
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(a.sub, cx + 22, doc.y + 80);
  });

  doc.y += stripH + 34;
}

function renderZiweiSection(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const { ziwei } = input;
  doc.drawSectionHeader(
    '01',
    '紫微斗數（勸學齋規則）',
    `命主 ${ziwei.soulLord} · 身主 ${ziwei.bodyLord} · ${ziwei.fiveElementsClass} · 庚干四化：太陽祿、武曲權、太陰科、天同忌`
  );

  // San Fang Si Zheng + Current Horoscope Box
  const mingPalace = ziwei.palaces[ziwei.mingPalaceIndex];
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

  // Four Transformations Table (本命/大限/流年/流月/流日)
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
      // Truncate cleanly if unusually long
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
  void mingPalace;
}

function renderBaziSection(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const { bazi } = input;
  doc.drawSectionHeader(
    '02',
    '主流子平八字（四柱・神煞・大運流運）',
    `日主 ${bazi.dayMaster.stem}（${bazi.dayMaster.yinYang}${bazi.dayMaster.element}） · ${bazi.startAgeDescription}（${bazi.isForward ? '順行' : '逆行'}） · 日空亡 ${bazi.dayKongWang}`
  );

  // Columns: Label + [大運, 流年] + [時柱, 日柱, 月柱, 年柱]
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

  // Pre-calculate wrapped Shen Sha height
  const shenShaFont = `400 15.5px ${FONT_SANS}`;
  const shenShaWrapped = cols.map((c) =>
    doc.wrapText(c.shenSha, dataColW - 20, shenShaFont)
  );
  const maxShenShaLines = Math.max(1, ...shenShaWrapped.map((l) => l.length));
  const shenShaRowH = Math.max(54, maxShenShaLines * 22 + 20);

  const hiddenFont = `400 15.5px ${FONT_SANS}`;
  const hiddenWrapped = cols.map((c) =>
    doc.wrapText(c.hidden, dataColW - 20, hiddenFont)
  );
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

  // Draw background columns for flow & day master
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

  // Left label column background
  ctx.fillStyle = COLORS.surfaceSoft;
  ctx.fillRect(MARGIN_X, doc.y, labelColW, totalTableH);

  // Horizontal dividers + content per row
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
        const lines = hiddenWrapped[cIdx];
        let ly = ry + 10;
        lines.forEach((l) => {
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
        const lines = shenShaWrapped[cIdx];
        let ly = ry + 10;
        lines.forEach((l) => {
          ctx.fillText(l, centerX, ly);
          ly += 22;
        });
      }
      ctx.textAlign = 'left';
    });

    ry += row.h;
  });

  // Vertical dividers
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
  ctx.font = `600 18px ${FONT_SERIF}`;
  ctx.fillStyle = COLORS.inkGreen;
  ctx.fillText('原局五行分佈', MARGIN_X + 22, doc.y + 16);

  const elements: FiveElement[] = ['木', '火', '土', '金', '水'];
  let ex = MARGIN_X + 180;
  elements.forEach((el) => {
    const cnt = bazi.elementCounts[el];
    ctx.font = `600 18px ${FONT_SERIF}`;
    ctx.fillStyle = ELEMENT_HEX[el];
    ctx.fillText(`${el} ${cnt}`, ex, doc.y + 16);
    ex += 92;
  });

  ctx.strokeStyle = COLORS.hairlineSoft;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X + 20, doc.y + 52);
  ctx.lineTo(MARGIN_X + CONTENT_W - 20, doc.y + 52);
  ctx.stroke();

  ctx.font = `600 17px ${FONT_SERIF}`;
  ctx.fillStyle = COLORS.inkGreen;
  ctx.fillText('大運序列：', MARGIN_X + 22, doc.y + 68);

  const decStr = bazi.decadeFortunes
    .slice(0, 8)
    .map((d) => `${d.startAge}歲 ${d.ganZhi}(${d.tenStar})`)
    .join('  ·  ');
  ctx.font = `400 16.5px ${FONT_SANS}`;
  ctx.fillStyle = COLORS.textBody;
  ctx.fillText(decStr, MARGIN_X + 120, doc.y + 70);

  doc.y += stripH + 34;
}

function renderTarotSection(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const { tarot } = input;
  doc.drawSectionHeader(
    '03',
    'Mary K. Greer 生日塔羅密碼',
    `第 ${tarot.constellation.id} 家族「${tarot.constellation.name}」— ${tarot.constellation.title} · 驗算：${tarot.birthSumFormula}`
  );

  // 4 Archetype Summary Cards (2x2 Grid)
  const cardGap = 20;
  const cardW = (CONTENT_W - cardGap) / 2;

  const shadowText =
    tarot.shadowCards.length > 0
      ? tarot.shadowCards
          .map((c) => `${c.displayNumber} ${c.name}（${c.keywords.slice(0, 2).join('、')}）`)
          .join('；')
      : tarot.isSpecialCase19
      ? '19 太陽 — 10 命運之輪 — 1 魔術師 三星連動（無陰影牌）'
      : '所屬家族大牌已全數顯化，無隱藏陰影牌';

  const shadowLesson =
    tarot.shadowCards.length > 0
      ? tarot.shadowCards[0].growthLesson
      : '專注於平衡既有主牌的光暗兩面，穩定顯化天賦。';

  const cards = [
    {
      role: '人格牌（外在展現與人生功課）',
      accent: COLORS.pine,
      title: `No.${tarot.personalityCard.displayNumber} ${tarot.personalityCard.name} · ${tarot.personalityCard.englishName}`,
      body: tarot.personalityCard.essence,
      footer: `成長功課：${tarot.personalityCard.growthLesson}`,
    },
    {
      role: tarot.isSamePersonalitySoul
        ? '靈魂牌（與人格牌同一原型）'
        : '靈魂牌（內在核心渴望）',
      accent: COLORS.gold,
      title: `No.${tarot.soulCard.displayNumber} ${tarot.soulCard.name} · ${tarot.soulCard.englishName}`,
      body: tarot.soulCard.essence,
      footer: `正向天賦：${tarot.soulCard.lightSide}`,
    },
    {
      role: '陰影／導師牌（盲點與隱藏資源）',
      accent: COLORS.vermilion,
      title: shadowText,
      body:
        tarot.shadowCards[0]?.shadowSide ??
        '此家族組合無缺失牌，關鍵在於覺察自我能量過度或不足的擺盪。',
      footer: `轉化指引：${shadowLesson}`,
    },
    {
      role: `${tarot.currentYearCard.cycleYear} 個人流年牌（${tarot.currentYearCard.periodStart} 起）`,
      accent: COLORS.inkGreen,
      title: `No.${tarot.currentYearCard.card.displayNumber} ${tarot.currentYearCard.card.name}${
        tarot.currentYearCard.rootCard
          ? ` → 輔助根數：${tarot.currentYearCard.rootCard.displayNumber} ${tarot.currentYearCard.rootCard.name}`
          : ''
      }`,
      body: tarot.currentYearCard.card.essence,
      footer: `下次換牌生日：${tarot.nextSwitchDate} · 關鍵詞：${tarot.currentYearCard.card.keywords.slice(0, 3).join('、')}`,
    },
  ];

  // Render in 2 rows of 2 cards
  for (let row = 0; row < 2; row++) {
    const pair = cards.slice(row * 2, row * 2 + 2);
    const bodyFont = `400 17px ${FONT_SANS}`;
    const footerFont = `500 16px ${FONT_SANS}`;
    const titleFont = `700 20px ${FONT_SERIF}`;

    const measured = pair.map((c) => {
      const tLines = doc.wrapText(c.title, cardW - 40, titleFont);
      const bLines = doc.wrapText(c.body, cardW - 40, bodyFont);
      const fLines = doc.wrapText(c.footer, cardW - 40, footerFont);
      const h = 48 + tLines.length * 28 + 10 + bLines.length * 26 + 14 + fLines.length * 24 + 22;
      return { c, tLines, bLines, fLines, h };
    });

    const rowH = Math.max(measured[0].h, measured[1].h);
    doc.ensureSpace(rowH + 22);

    measured.forEach((m, colIdx) => {
      const cx = MARGIN_X + colIdx * (cardW + cardGap);
      doc.drawCardBox(cx, doc.y, cardW, rowH, COLORS.white, COLORS.hairline);

      const ctx = doc.ctx;
      ctx.textBaseline = 'top';
      let ly = doc.y + 18;

      ctx.font = `600 15.5px ${FONT_SANS}`;
      ctx.fillStyle = m.c.accent;
      ctx.fillText(m.c.role, cx + 20, ly);
      ly += 28;

      ctx.font = titleFont;
      ctx.fillStyle = COLORS.inkGreen;
      m.tLines.forEach((l) => {
        ctx.fillText(l, cx + 20, ly);
        ly += 28;
      });
      ly += 8;

      ctx.font = bodyFont;
      ctx.fillStyle = COLORS.textBody;
      m.bLines.forEach((l) => {
        ctx.fillText(l, cx + 20, ly);
        ly += 26;
      });
      ly += 10;

      ctx.font = footerFont;
      ctx.fillStyle = COLORS.textMuted;
      m.fLines.forEach((l) => {
        ctx.fillText(l, cx + 20, ly);
        ly += 24;
      });
    });

    doc.y += rowH + 18;
  }

  // 5-Year Trajectory Strip
  const trajH = 74;
  doc.ensureSpace(trajH + 30);
  doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, trajH, COLORS.surfaceSoft, COLORS.hairline);
  doc.ctx.textBaseline = 'middle';
  doc.ctx.font = `600 17px ${FONT_SERIF}`;
  doc.ctx.fillStyle = COLORS.inkGreen;
  doc.ctx.fillText('五年流年軌跡：', MARGIN_X + 20, doc.y + trajH / 2);

  const trajText = tarot.yearTrajectory
    .map(
      (t) =>
        `${t.cycleYear}年 ${t.card.displayNumber} ${t.card.name}${t.isCurrent ? '（當前）' : ''}`
    )
    .join('   ·   ');
  doc.ctx.font = `400 17px ${FONT_SANS}`;
  doc.ctx.fillStyle = COLORS.textBody;
  doc.ctx.fillText(trajText, MARGIN_X + 158, doc.y + trajH / 2);

  doc.y += trajH + 34;
}

function renderAISummarySection(doc: EditorialCanvasDoc, input: HolisticPdfExportInput) {
  const { aiSummary } = input;
  doc.drawSectionHeader(
    '04',
    'AI 全息解盤大綱摘要',
    '結合紫微四化、八字十神神煞與塔羅人生密碼之三系統交叉綜評'
  );

  if (!aiSummary) {
    const emptyH = 92;
    doc.ensureSpace(emptyH + 24);
    doc.drawCardBox(MARGIN_X, doc.y, CONTENT_W, emptyH, COLORS.white, COLORS.hairline);
    doc.ctx.textBaseline = 'middle';
    doc.ctx.font = `400 18px ${FONT_SANS}`;
    doc.ctx.fillStyle = COLORS.textMuted;
    doc.ctx.fillText(
      '本次匯出時尚未取得 AI 解盤大綱（可能正在載入或尚未設定 API 金鑰）；完整三系統排盤數據均已收錄於本報告。',
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
      ctx.fillStyle = p.labelColor ?? COLORS.textBody;
      p.lines.forEach((l, idx) => {
        ctx.fillStyle = idx === 0 && p.labelColor ? p.labelColor : COLORS.textBody;
        ctx.fillText(l, MARGIN_X + 24, ly);
        ly += 29;
      });
      ly += 10;
    });

    doc.y += totalH + 18;
  };

  // Card 1: 人生地圖總評
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

  // Draw 2x2 traffic-light cards
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

  // Card 3: 盲區與隱藏資源
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

  // Card 4: 造命與覺察行動
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
}

function renderNotesSection(doc: EditorialCanvasDoc, notes: string) {
  const trimmed = notes.trim();
  if (!trimmed) return;

  doc.drawSectionHeader('05', '諮詢師備忘筆記');
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
 * Generate and download a high-DPI multi-page Traditional Chinese PDF report using jsPDF.
 */
export async function exportHolisticPdfReport(
  input: HolisticPdfExportInput
): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }

  const editorialDoc = new EditorialCanvasDoc(
    input.client.name,
    input.targetDate
  );

  renderMasthead(editorialDoc, input);
  renderZiweiSection(editorialDoc, input);
  renderBaziSection(editorialDoc, input);
  renderTarotSection(editorialDoc, input);
  renderAISummarySection(editorialDoc, input);
  renderNotesSection(editorialDoc, input.client.notes);
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
  const fileName = `全息人生地圖報告_${safeClientName}_${input.targetDate}.pdf`;
  pdf.save(fileName);
}
