import { astro } from 'iztro';
import { ChildLimit, Gender, SolarTime } from 'tyme4ts';
import {
  ClientProfile,
  FiveElement,
  TenYearTrendPoint,
  TenYearTrendResult,
  TenYearTurningPoint,
} from '../types/holistic';
import { calculateTarotChart } from './tarotEngine';

// Ensure 勸學齋 rules (zh-TW + 庚干四化：陽武陰同)
let configured = false;
function ensureZiweiConfig() {
  if (!configured) {
    astro.config({
      language: 'zh-TW',
      mutagens: {
        庚: ['太陽', '武曲', '太陰', '天同'],
      },
    });
    configured = true;
  }
}

const S2T_MAP: Record<string, string> = {
  财: '財',
  伤: '傷',
  杀: '殺',
  临: '臨',
  带: '帶',
  绝: '絕',
  养: '養',
};

function toTrad(str: string): string {
  return str
    .split('')
    .map((ch) => S2T_MAP[ch] ?? ch)
    .join('');
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

// Ziwei brightness weights
const BRIGHTNESS_SCORE: Record<string, number> = {
  廟: 11,
  旺: 8,
  得: 4,
  利: 2,
  平: 0,
  不: -5,
  陷: -8,
};

const ZIWEI_AUSPICIOUS_STARS = new Set([
  '左輔',
  '右弼',
  '文昌',
  '文曲',
  '天魁',
  '天鉞',
  '祿存',
  '天馬',
]);

const ZIWEI_SHA_STARS = new Set([
  '擎羊',
  '陀羅',
  '火星',
  '鈴星',
  '地空',
  '地劫',
]);

// Bazi 十二長生 weights
const TERRAIN_SCORE: Record<string, number> = {
  帝旺: 11,
  臨官: 9,
  長生: 7,
  冠帶: 6,
  養: 3,
  胎: 2,
  沐浴: 1,
  衰: -2,
  墓: -3,
  病: -4,
  死: -6,
  絕: -7,
};

// Classical branch Six Clash (六沖) & Six Harmony (六合)
const BRANCH_CLASH: Record<string, string> = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳',
};

const BRANCH_HARMONY: Record<string, string> = {
  子: '丑',
  丑: '子',
  寅: '亥',
  亥: '寅',
  卯: '戌',
  戌: '卯',
  辰: '酉',
  酉: '辰',
  巳: '申',
  申: '巳',
  午: '未',
  未: '午',
};

// Lightweight classical Shen Sha tables for yearly branch/stem check
const TIAN_YI: Record<string, string[]> = {
  甲: ['丑', '未'],
  戊: ['丑', '未'],
  庚: ['丑', '未'],
  乙: ['子', '申'],
  己: ['子', '申'],
  丙: ['亥', '酉'],
  丁: ['亥', '酉'],
  壬: ['卯', '巳'],
  癸: ['卯', '巳'],
  辛: ['午', '寅'],
};
const WEN_CHANG: Record<string, string> = {
  甲: '巳',
  乙: '午',
  丙: '申',
  丁: '酉',
  戊: '申',
  己: '酉',
  庚: '亥',
  辛: '子',
  壬: '寅',
  癸: '卯',
};
const LU_SHEN: Record<string, string> = {
  甲: '寅',
  乙: '卯',
  丙: '巳',
  丁: '午',
  戊: '巳',
  己: '午',
  庚: '申',
  辛: '酉',
  壬: '亥',
  癸: '子',
};
const YANG_REN: Record<string, string> = {
  甲: '卯',
  乙: '寅',
  丙: '午',
  丁: '巳',
  戊: '午',
  己: '巳',
  庚: '酉',
  辛: '申',
  壬: '子',
  癸: '亥',
};
const HONG_LUAN: Record<string, string> = {
  子: '卯',
  丑: '寅',
  寅: '丑',
  卯: '子',
  辰: '亥',
  巳: '戌',
  午: '酉',
  未: '申',
  申: '未',
  酉: '午',
  戌: '巳',
  亥: '辰',
};
const TIAN_XI: Record<string, string> = {
  子: '酉',
  丑: '申',
  寅: '未',
  卯: '午',
  辰: '巳',
  巳: '辰',
  午: '卯',
  未: '寅',
  申: '丑',
  酉: '子',
  戌: '亥',
  亥: '戌',
};
const JIE_SHA: Record<string, string> = {
  申: '巳',
  子: '巳',
  辰: '巳',
  寅: '亥',
  午: '亥',
  戌: '亥',
  巳: '寅',
  酉: '寅',
  丑: '寅',
  亥: '申',
  卯: '申',
  未: '申',
};
const WANG_SHEN: Record<string, string> = {
  申: '亥',
  子: '亥',
  辰: '亥',
  寅: '巳',
  午: '巳',
  戌: '巳',
  巳: '申',
  酉: '申',
  丑: '申',
  亥: '寅',
  卯: '寅',
  未: '寅',
};
const YI_MA: Record<string, string> = {
  申: '寅',
  子: '寅',
  辰: '寅',
  寅: '申',
  午: '申',
  戌: '申',
  巳: '亥',
  酉: '亥',
  丑: '亥',
  亥: '巳',
  卯: '巳',
  未: '巳',
};

// Mary K. Greer Major Arcana annual momentum index (archetypal expansion vs. contraction/restructuring)
const TAROT_MOMENTUM_SCORE: Record<number, number> = {
  0: 68, // 愚者: 歸零啟程
  1: 77, // 魔術師: 創造顯化
  2: 60, // 女祭師: 靜觀直覺
  3: 80, // 皇后: 豐盛滋養
  4: 73, // 皇帝: 結構穩固
  5: 66, // 教皇: 傳承定位
  6: 72, // 戀人: 契合抉擇
  7: 76, // 戰車: 突破推進
  8: 74, // 力量: 柔韌駕馭
  9: 54, // 隱者: 內省沉澱
  10: 78, // 命運之輪: 轉輪順勢
  11: 64, // 正義: 平衡校準
  12: 49, // 吊人: 留白換位
  13: 43, // 死神: 汰舊蛻變
  14: 67, // 節制: 調和融合
  15: 47, // 惡魔: 慾望考驗
  16: 37, // 高塔: 破框重塑
  17: 79, // 星星: 遠見希望
  18: 46, // 月亮: 迷霧潛意識
  19: 86, // 太陽: 光明綻放
  20: 71, // 審判: 召喚覺醒
  21: 84, // 世界: 圓滿集成
};

const TAROT_PIVOT_CARDS = new Set([0, 10, 13, 16, 20, 21]);

// Element generating cycle: A generates B
const GENERATES: Record<FiveElement, FiveElement> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
};

function normalizeEl(el: string): FiveElement {
  if (el === '木' || el === '火' || el === '土' || el === '金' || el === '水') {
    return el;
  }
  return '土';
}

/**
 * Compute a deterministic 10-year holistic fortune trajectory (startYear .. startYear + 9)
 * strictly backed by iztro, tyme4ts, and Mary K. Greer Birthday Tarot calculations.
 */
export function calculateTenYearTrend(
  client: ClientProfile,
  baseTargetDate: string
): TenYearTrendResult {
  ensureZiweiConfig();

  const [bYear, bMonth, bDay] = client.birthDate.split('-').map(Number);
  const [bHour, bMinute] = client.birthTime.split(':').map(Number);
  const startYear = Number(baseTargetDate.split('-')[0]);
  const years = Array.from({ length: 10 }, (_, i) => startYear + i);

  // 1. Build base Ziwei astrolabe once
  const timeIndex = Math.floor(((bHour + 1) % 24) / 2);
  const astrolabe = astro.bySolar(
    `${bYear}-${bMonth}-${bDay}`,
    timeIndex,
    client.gender,
    true,
    'zh-TW'
  );

  // Map star name -> palace index for fast mutagen lookup
  const starPalaceIndexMap = new Map<string, number>();
  astrolabe.palaces.forEach((p, idx) => {
    [...p.majorStars, ...p.minorStars].forEach((s) => {
      starPalaceIndexMap.set(s.name, idx);
    });
  });

  // 2. Build base Bazi chart & Decade Fortunes once via tyme4ts
  const birthSolarTime = SolarTime.fromYmdHms(bYear, bMonth, bDay, bHour, bMinute, 0);
  const eightChar = birthSolarTime.getLunarHour().getEightChar();
  const yearCycle = eightChar.getYear();
  const monthCycle = eightChar.getMonth();
  const dayCycle = eightChar.getDay();
  const hourCycle = eightChar.getHour();

  const dayStem = dayCycle.getHeavenStem();
  const dayStemName = dayStem.getName();
  const dayBranchName = dayCycle.getEarthBranch().getName();
  const yearStemName = yearCycle.getHeavenStem().getName();
  const yearBranchName = yearCycle.getEarthBranch().getName();
  const monthBranchName = monthCycle.getEarthBranch().getName();
  const dayKongWang = dayCycle
    .getExtraEarthBranches()
    .map((b) => b.getName())
    .join('');

  const dayMasterEl = normalizeEl(dayStem.getElement().getName());
  const resourceEl = (Object.keys(GENERATES) as FiveElement[]).find(
    (k) => GENERATES[k] === dayMasterEl
  )!;

  // Estimate Day Master strength (support count across 8 characters + month branch weight)
  const natalCycles = [hourCycle, dayCycle, monthCycle, yearCycle];
  let supportWeight = 0;
  for (const c of natalCycles) {
    const sEl = normalizeEl(c.getHeavenStem().getElement().getName());
    const bEl = normalizeEl(c.getEarthBranch().getElement().getName());
    if (sEl === dayMasterEl || sEl === resourceEl) supportWeight += 1;
    if (bEl === dayMasterEl || bEl === resourceEl) supportWeight += 1;
  }
  // Extra month-branch seasonal weight
  const monthEl = normalizeEl(monthCycle.getEarthBranch().getElement().getName());
  if (monthEl === dayMasterEl || monthEl === resourceEl) supportWeight += 1;
  const dayMasterStrength: 'strong' | 'balanced' | 'weak' =
    supportWeight >= 6 ? 'strong' : supportWeight <= 3 ? 'weak' : 'balanced';

  const childLimit = ChildLimit.fromSolarTime(
    birthSolarTime,
    client.gender === '男' ? Gender.MAN : Gender.WOMAN
  );
  const startDf = childLimit.getStartDecadeFortune();
  const decades: Array<{
    ganZhi: string;
    startYear: number;
    endYear: number;
    tenStar: string;
    terrain: string;
  }> = [];
  for (let i = 0; i < 10; i++) {
    const df = startDf.next(i);
    const sc = df.getSixtyCycle();
    decades.push({
      ganZhi: sc.getName(),
      startYear: df.getStartSixtyCycleYear().getYear(),
      endYear: df.getEndSixtyCycleYear().getYear(),
      tenStar: toTrad(dayStem.getTenStar(sc.getHeavenStem()).getName()),
      terrain: toTrad(dayStem.getTerrain(sc.getEarthBranch()).getName()),
    });
  }

  // Reference baseline previous year (startYear - 1) to detect transitions on year 0 accurately
  const prevYearHoroscope = astrolabe.horoscope(`${startYear - 1}-06-15`);
  let prevZiweiDecadalIdx = prevYearHoroscope.decadal.index;
  const prevBaziDecade =
    decades.find((d) => startYear - 1 >= d.startYear && startYear - 1 <= d.endYear) ??
    null;
  let prevBaziDecadeGanZhi = prevBaziDecade?.ganZhi ?? null;

  const rawPoints: TenYearTrendPoint[] = [];

  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const age = Math.max(1, year - bYear + 1); // 虛歲參考
    const midYearDate = `${year}-06-15`;

    // ---------- A. Ziwei Yearly Calculation (iztro) ----------
    const horo = astrolabe.horoscope(midYearDate);
    const yIdx = horo.yearly.index;
    const dIdx = horo.decadal.index;
    const ziweiDecadalChanged = dIdx !== prevZiweiDecadalIdx;
    prevZiweiDecadalIdx = dIdx;

    const yPalace = astrolabe.palaces[yIdx];
    const oppPalace = astrolabe.palaces[(yIdx + 6) % 12];
    const triadA = astrolabe.palaces[(yIdx + 4) % 12];
    const triadB = astrolabe.palaces[(yIdx + 8) % 12];
    const sanFangSet = new Set([yIdx, (yIdx + 6) % 12, (yIdx + 4) % 12, (yIdx + 8) % 12]);

    const effectiveMajorStars =
      yPalace.majorStars.length > 0 ? yPalace.majorStars : oppPalace.majorStars;

    let brightnessSum = 0;
    effectiveMajorStars.forEach((s) => {
      brightnessSum += BRIGHTNESS_SCORE[s.brightness ?? '平'] ?? 0;
    });
    const brightnessAvg =
      effectiveMajorStars.length > 0 ? brightnessSum / effectiveMajorStars.length : 0;

    // Auspicious & Sha stars in yearly Ming + SanFang
    let ziweiMinorDelta = 0;
    yPalace.minorStars.forEach((s) => {
      if (ZIWEI_AUSPICIOUS_STARS.has(s.name)) ziweiMinorDelta += 3;
      if (ZIWEI_SHA_STARS.has(s.name)) ziweiMinorDelta -= 3.5;
    });
    [oppPalace, triadA, triadB].forEach((p) => {
      p.minorStars.forEach((s) => {
        if (ZIWEI_AUSPICIOUS_STARS.has(s.name)) ziweiMinorDelta += 1.2;
        if (ZIWEI_SHA_STARS.has(s.name)) ziweiMinorDelta -= 1.2;
      });
    });
    ziweiMinorDelta = Math.max(-12, Math.min(12, ziweiMinorDelta));

    // Yearly Four Mutagens (化祿/權/科/忌) landing in yearly SanFangSiZheng
    const [luStar, quanStar, keStar, jiStar] = horo.yearly.mutagen;
    let mutagenDelta = 0;
    if (luStar && sanFangSet.has(starPalaceIndexMap.get(luStar) ?? -1)) mutagenDelta += 10;
    if (quanStar && sanFangSet.has(starPalaceIndexMap.get(quanStar) ?? -1)) mutagenDelta += 6;
    if (keStar && sanFangSet.has(starPalaceIndexMap.get(keStar) ?? -1)) mutagenDelta += 5;
    if (jiStar && sanFangSet.has(starPalaceIndexMap.get(jiStar) ?? -1)) {
      mutagenDelta -= starPalaceIndexMap.get(jiStar) === yIdx ? 12 : 8;
    }

    // Decadal foundation subtle bias
    const dPalace = astrolabe.palaces[dIdx];
    const dMajor =
      dPalace.majorStars.length > 0
        ? dPalace.majorStars
        : astrolabe.palaces[(dIdx + 6) % 12].majorStars;
    const dBright =
      dMajor.length > 0
        ? dMajor.reduce((acc, s) => acc + (BRIGHTNESS_SCORE[s.brightness ?? '平'] ?? 0), 0) /
          dMajor.length
        : 0;

    const ziweiScore = clamp(
      62 + brightnessAvg * 1.15 + ziweiMinorDelta + mutagenDelta + dBright * 0.35,
      25,
      96
    );

    const ziweiDecadalRange = dPalace.decadal.range as [number, number];
    const ziweiDecadalGanZhi = `${horo.decadal.heavenlyStem}${horo.decadal.earthlyBranch}`;
    const ziweiYearlyMutagenSummary = `祿${luStar || '—'} · 權${quanStar || '—'} · 科${keStar || '—'} · 忌${jiStar || '—'}`;

    // ---------- B. Bazi Yearly Calculation (tyme4ts) ----------
    const ySolarTime = SolarTime.fromYmdHms(year, 6, 15, 12, 0, 0);
    const yCycle = ySolarTime.getLunarHour().getEightChar().getYear();
    const yStem = yCycle.getHeavenStem();
    const yBranch = yCycle.getEarthBranch();
    const yStemName = yStem.getName();
    const yBranchName = yBranch.getName();
    const yGanZhi = yCycle.getName();
    const yTenStar = toTrad(dayStem.getTenStar(yStem).getName());
    const yTerrain = toTrad(dayStem.getTerrain(yBranch).getName());

    const activeDecade =
      decades.find((d) => year >= d.startYear && year <= d.endYear) ?? null;
    const baziDecadeGanZhi = activeDecade?.ganZhi ?? null;
    const baziDecadeChanged =
      baziDecadeGanZhi !== null && baziDecadeGanZhi !== prevBaziDecadeGanZhi;
    prevBaziDecadeGanZhi = baziDecadeGanZhi;

    // Ten God alignment with Day Master strength
    const supportGods = new Set(['正印', '偏印', '比肩', '劫財']);
    const smoothGods = new Set(['正財', '正官', '食神', '正印']);
    const volatileGods = new Set(['七殺', '傷官', '劫財']);
    let tenStarDelta = 0;
    if (dayMasterStrength === 'weak') {
      tenStarDelta = supportGods.has(yTenStar)
        ? 8
        : volatileGods.has(yTenStar)
          ? -5
          : 2;
    } else if (dayMasterStrength === 'strong') {
      tenStarDelta = !supportGods.has(yTenStar)
        ? 8
        : yTenStar === '劫財'
          ? -5
          : -1;
    } else {
      tenStarDelta = smoothGods.has(yTenStar)
        ? 6
        : volatileGods.has(yTenStar)
          ? -3
          : 2;
    }

    const terrainDelta = TERRAIN_SCORE[yTerrain] ?? 0;

    // Shen Sha for this year
    const auspiciousStars: string[] = [];
    const cautionStars: string[] = [];
    if (TIAN_YI[dayStemName]?.includes(yBranchName) || TIAN_YI[yearStemName]?.includes(yBranchName)) {
      auspiciousStars.push('天乙貴人');
    }
    if (WEN_CHANG[dayStemName] === yBranchName || WEN_CHANG[yearStemName] === yBranchName) {
      auspiciousStars.push('文昌');
    }
    if (LU_SHEN[dayStemName] === yBranchName) {
      auspiciousStars.push('祿神');
    }
    if (HONG_LUAN[yearBranchName] === yBranchName) {
      auspiciousStars.push('紅鸞');
    }
    if (TIAN_XI[yearBranchName] === yBranchName) {
      auspiciousStars.push('天喜');
    }
    if (YI_MA[yearBranchName] === yBranchName || YI_MA[dayBranchName] === yBranchName) {
      auspiciousStars.push('驛馬');
    }

    if (YANG_REN[dayStemName] === yBranchName) {
      cautionStars.push('羊刃');
    }
    if (JIE_SHA[yearBranchName] === yBranchName || JIE_SHA[dayBranchName] === yBranchName) {
      cautionStars.push('劫煞');
    }
    if (WANG_SHEN[yearBranchName] === yBranchName || WANG_SHEN[dayBranchName] === yBranchName) {
      cautionStars.push('亡神');
    }
    if (dayKongWang.includes(yBranchName)) {
      cautionStars.push('空亡');
    }

    const shenShaDelta =
      Math.min(10, auspiciousStars.length * 3.5) - Math.min(9, cautionStars.length * 3);

    // Branch clash/harmony with Day/Year/Month branch
    let branchDelta = 0;
    let baziBranchRelation: string | null = null;
    if (BRANCH_CLASH[dayBranchName] === yBranchName) {
      branchDelta -= 8;
      baziBranchRelation = '歲沖日支';
    } else if (BRANCH_CLASH[yearBranchName] === yBranchName) {
      branchDelta -= 6;
      baziBranchRelation = '歲沖年支（犯太歲）';
    } else if (BRANCH_CLASH[monthBranchName] === yBranchName) {
      branchDelta -= 5;
      baziBranchRelation = '歲沖月支';
    } else if (BRANCH_HARMONY[dayBranchName] === yBranchName) {
      branchDelta += 6;
      baziBranchRelation = '歲合日支';
    } else if (BRANCH_HARMONY[monthBranchName] === yBranchName) {
      branchDelta += 4;
      baziBranchRelation = '歲合月支';
    }

    if (activeDecade && activeDecade.ganZhi === yGanZhi) {
      branchDelta -= 4;
      baziBranchRelation = baziBranchRelation
        ? `${baziBranchRelation}・歲運伏吟`
        : '歲運伏吟';
    }

    // Decade terrain slight baseline
    const decTerrainBias = activeDecade
      ? (TERRAIN_SCORE[activeDecade.terrain] ?? 0) * 0.25
      : 0;

    const baziScore = clamp(
      60 + tenStarDelta + terrainDelta * 0.85 + shenShaDelta + branchDelta + decTerrainBias,
      24,
      96
    );

    // ---------- C. Tarot Personal Year Card (Mary K. Greer) ----------
    // Anchor on the client's birthday in that year so Personal Year Card corresponds to `year`
    const bMonthStr = String(bMonth).padStart(2, '0');
    const bDayStr = String(bDay).padStart(2, '0');
    const tarotAtYear = calculateTarotChart(
      client.birthDate,
      `${year}-${bMonthStr}-${bDayStr}`
    );
    const yearCard = tarotAtYear.currentYearCard.card;
    const tarotConstellationResonance =
      yearCard.constellationId === tarotAtYear.constellation.id;
    const tarotShadowActivated = tarotAtYear.shadowCards.some(
      (sc) => sc.number === yearCard.number
    );

    let tarotScore = TAROT_MOMENTUM_SCORE[yearCard.number] ?? 62;
    if (tarotConstellationResonance && !tarotShadowActivated) {
      tarotScore = clamp(tarotScore + 4, 28, 95);
    }

    // ---------- D. Composite Holistic Score ----------
    const compositeScore = clamp(
      ziweiScore * 0.4 + baziScore * 0.35 + tarotScore * 0.25,
      24,
      96
    );

    const prevScore = i > 0 ? rawPoints[i - 1].compositeScore : null;
    const deltaFromPrev = prevScore !== null ? compositeScore - prevScore : null;

    const highlightParts: string[] = [
      `流年命宮落「${yPalace.name}」`,
      `八字「${yGanZhi}」${yTenStar}・${yTerrain}`,
      `塔羅「${yearCard.name}」年`,
    ];
    if (baziBranchRelation) {
      highlightParts.push(baziBranchRelation);
    }

    rawPoints.push({
      year,
      age,
      ganZhi: yGanZhi,
      compositeScore,
      ziweiScore,
      baziScore,
      tarotScore,
      deltaFromPrev,
      ziweiDecadalRange,
      ziweiDecadalGanZhi,
      ziweiYearlyPalaceName: yPalace.name,
      ziweiYearlyMajorStars:
        yPalace.majorStars.length > 0
          ? yPalace.majorStars.map((s) => s.name)
          : [`借對宮(${oppPalace.majorStars.map((s) => s.name).join('・') || '空'})`],
      ziweiYearlyMutagenSummary,
      ziweiDecadalChanged,
      baziDecadeGanZhi,
      baziDecadeChanged,
      baziYearTenStar: yTenStar,
      baziYearTerrain: yTerrain,
      baziBranchRelation,
      baziAuspiciousStars: auspiciousStars,
      baziCautionStars: cautionStars,
      tarotYearCardName: yearCard.name,
      tarotYearCardDisplayNumber: yearCard.displayNumber,
      tarotYearCardNumber: yearCard.number,
      tarotRootCardName: tarotAtYear.currentYearCard.rootCard?.name ?? null,
      tarotConstellationResonance,
      tarotShadowActivated,
      turningPoint: null,
      highlightSummary: highlightParts.join('｜'),
    });
  }

  // ---------- E. Detect Key Turning Points Across the 10-Year Window ----------
  let peakPoint = rawPoints[0];
  let troughPoint = rawPoints[0];
  for (const pt of rawPoints) {
    if (pt.compositeScore > peakPoint.compositeScore) peakPoint = pt;
    if (pt.compositeScore < troughPoint.compositeScore) troughPoint = pt;
  }

  const candidates: Array<{ index: number; tp: TenYearTurningPoint }> = [];

  rawPoints.forEach((pt, idx) => {
    const reasons: string[] = [];

    // 1. Decade / Decadal shift (highest structural significance)
    if (pt.ziweiDecadalChanged || pt.baziDecadeChanged) {
      const shiftLabels: string[] = [];
      if (pt.ziweiDecadalChanged) {
        shiftLabels.push(
          `紫微換入 ${pt.ziweiDecadalRange[0]}–${pt.ziweiDecadalRange[1]}歲大限（${pt.ziweiDecadalGanZhi}）`
        );
      }
      if (pt.baziDecadeChanged && pt.baziDecadeGanZhi) {
        shiftLabels.push(`八字交脫「${pt.baziDecadeGanZhi}」大運`);
      }
      candidates.push({
        index: idx,
        tp: {
          kind: 'decade_shift',
          label:
            pt.ziweiDecadalChanged && pt.baziDecadeChanged
              ? '雙盤換運大轉折'
              : pt.baziDecadeChanged
                ? '八字大運交脫'
                : '紫微大限換宮',
          shortTag: '換運',
          reason: `${shiftLabels.join('，並同步')}，十年格局底盤切換，宜提前調整長期賽道。`,
          priority: 100 + (pt.ziweiDecadalChanged && pt.baziDecadeChanged ? 15 : 0),
        },
      });
      return;
    }

    // 2. Global 10-year peak
    if (pt.year === peakPoint.year) {
      reasons.push(`紫微流年「${pt.ziweiYearlyPalaceName}」氣勢達高點`);
      reasons.push(`八字「${pt.baziYearTenStar}・${pt.baziYearTerrain}」`);
      reasons.push(`塔羅「${pt.tarotYearCardName}」助力`);
      candidates.push({
        index: idx,
        tp: {
          kind: 'peak',
          label: '十年運勢高峰',
          shortTag: '高峰',
          reason: `${reasons.join('，')}，為未來十年最利於衝刺擴張與收穫顯化的關鍵窗口。`,
          priority: 90,
        },
      });
      return;
    }

    // 3. Global 10-year trough
    if (pt.year === troughPoint.year) {
      const stressNotes: string[] = [];
      if (pt.baziBranchRelation) stressNotes.push(pt.baziBranchRelation);
      if (pt.baziCautionStars.length > 0)
        stressNotes.push(`見${pt.baziCautionStars.slice(0, 2).join('、')}`);
      if (pt.tarotYearCardNumber === 16 || pt.tarotYearCardNumber === 13) {
        stressNotes.push(`逢塔羅「${pt.tarotYearCardName}」重塑年`);
      }
      candidates.push({
        index: idx,
        tp: {
          kind: 'trough',
          label: '低谷築底與重整',
          shortTag: '築底',
          reason: `${
            stressNotes.length > 0
              ? stressNotes.join('、')
              : `流年動能收斂至十年低檔（${pt.compositeScore}分）`
          }，宜採防守策略、汰弱留強並為下一波升勢蓄能。`,
          priority: 88,
        },
      });
      return;
    }

    // 4. Significant inflection / Tarot pivot / Branch clash
    const prev = idx > 0 ? rawPoints[idx - 1] : null;
    const next = idx < rawPoints.length - 1 ? rawPoints[idx + 1] : null;
    const isSharpJump = pt.deltaFromPrev !== null && Math.abs(pt.deltaFromPrev) >= 10;
    const isLocalInflection =
      prev !== null &&
      next !== null &&
      ((pt.compositeScore > prev.compositeScore + 5 &&
        pt.compositeScore > next.compositeScore + 5) ||
        (pt.compositeScore < prev.compositeScore - 5 &&
          pt.compositeScore < next.compositeScore - 5));

    const pivotSignals: string[] = [];
    let score = 0;

    if (isSharpJump) {
      pivotSignals.push(
        pt.deltaFromPrev! > 0
          ? `年度運勢大幅拉升（+${pt.deltaFromPrev}）`
          : `年度動能急轉收斂（${pt.deltaFromPrev}）`
      );
      score += 35 + Math.abs(pt.deltaFromPrev!);
    } else if (isLocalInflection) {
      pivotSignals.push('波段節律反轉節點');
      score += 28;
    }

    if (pt.baziBranchRelation && pt.baziBranchRelation.includes('沖')) {
      pivotSignals.push(pt.baziBranchRelation);
      score += 26;
    }

    if (TAROT_PIVOT_CARDS.has(pt.tarotYearCardNumber)) {
      pivotSignals.push(`塔羅流年「${pt.tarotYearCardName}」`);
      score += 22;
    }

    if (pt.tarotShadowActivated) {
      pivotSignals.push(`陰影導師牌「${pt.tarotYearCardName}」顯化`);
      score += 20;
    }

    if (score >= 42 && pivotSignals.length > 0) {
      candidates.push({
        index: idx,
        tp: {
          kind: 'pivot',
          label:
            pt.deltaFromPrev !== null && pt.deltaFromPrev >= 10
              ? '上行轉折點'
              : pt.baziBranchRelation?.includes('沖')
                ? '動盪調整節點'
                : '格局轉折點',
          shortTag: '轉折',
          reason: `${pivotSignals.slice(0, 3).join('，')}，適合重新校準節奏與資源配置。`,
          priority: score,
        },
      });
    }
  });

  // Select up to 5 highest-priority turning points so the chart stays crisp & uncluttered
  candidates.sort((a, b) => b.tp.priority - a.tp.priority);
  const chosenIndices = new Set<number>();
  for (const c of candidates) {
    if (chosenIndices.size >= 5) break;
    // Keep decade_shift, peak, trough always; avoid crowding adjacent minor pivots
    const isCore = c.tp.priority >= 88;
    const tooCloseToMinor =
      !isCore &&
      Array.from(chosenIndices).some(
        (ci) => Math.abs(ci - c.index) <= 1 && rawPoints[ci].turningPoint!.priority < 88
      );
    if (tooCloseToMinor) continue;
    rawPoints[c.index].turningPoint = c.tp;
    chosenIndices.add(c.index);
  }

  const turningPoints = rawPoints.filter((p) => p.turningPoint !== null);
  const averageScore = Math.round(
    rawPoints.reduce((acc, p) => acc + p.compositeScore, 0) / rawPoints.length
  );

  return {
    startYear,
    endYear: years[years.length - 1],
    points: rawPoints,
    turningPoints,
    averageScore,
    peakPoint,
    troughPoint,
  };
}
