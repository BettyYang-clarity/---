import { astro } from 'iztro';
import {
  GenderType,
  HoroscopeScope,
  ZiweiChartResult,
  ZiweiMutagenRow,
  ZiweiPalaceData,
  ZiweiStarItem,
} from '../types/holistic';

// Apply 勸學齋 baseline rules: zh-TW & 庚干四化（陽武陰同）
let ziweiConfigured = false;

function ensureZiweiConfig() {
  if (!ziweiConfigured) {
    astro.config({
      language: 'zh-TW',
      mutagens: {
        庚: ['太陽', '武曲', '太陰', '天同'],
      },
    });
    ziweiConfigured = true;
  }
}

// Stem -> [祿, 權, 科, 忌] matching 勸學齋 (庚: 陽武陰同) for Origin Mutagen Table display
const ORIGIN_MUTAGEN_MAP: Record<string, [string, string, string, string]> = {
  甲: ['廉貞', '破軍', '武曲', '太陽'],
  乙: ['天機', '天梁', '紫微', '太陰'],
  丙: ['天同', '天機', '文昌', '廉貞'],
  丁: ['太陰', '天同', '天機', '巨門'],
  戊: ['貪狼', '太陰', '右弼', '天機'],
  己: ['武曲', '貪狼', '天梁', '文曲'],
  庚: ['太陽', '武曲', '太陰', '天同'],
  辛: ['巨門', '太陽', '文曲', '文昌'],
  壬: ['天梁', '紫微', '左輔', '武曲'],
  癸: ['破軍', '巨門', '太陰', '貪狼'],
};

export function getSanFangSiZhengIndices(palaceIndex: number): {
  self: number;
  opposite: number;
  triadA: number;
  triadB: number;
} {
  return {
    self: palaceIndex,
    opposite: (palaceIndex + 6) % 12,
    triadA: (palaceIndex + 4) % 12,
    triadB: (palaceIndex + 8) % 12,
  };
}

export function calculateZiweiChart(
  solarBirthDate: string,
  birthTime: string,
  gender: GenderType,
  targetDateStr: string
): ZiweiChartResult {
  ensureZiweiConfig();

  const [bYear, bMonth, bDay] = solarBirthDate.split('-').map(Number);
  const [bHour] = birthTime.split(':').map(Number);

  // 0~11 mapping 子~亥時
  const timeIndex = Math.floor(((bHour + 1) % 24) / 2);

  const astrolabe = astro.bySolar(
    `${bYear}-${bMonth}-${bDay}`,
    timeIndex,
    gender,
    true,
    'zh-TW'
  );

  const horoscope = astrolabe.horoscope(targetDateStr);

  // Extract Origin Year Heavenly Stem from chineseDate (e.g., "庚午 辛巳 庚辰 壬午")
  const originYearGanZhi = astrolabe.chineseDate.split(' ')[0] ?? '';
  const originYearStem = originYearGanZhi.charAt(0);
  const originMutagens = ORIGIN_MUTAGEN_MAP[originYearStem] ?? ['', '', '', ''];

  const mapStars = (
    stars: Array<{
      name: string;
      type: string;
      brightness?: string;
      mutagen?: string;
    }>
  ): ZiweiStarItem[] =>
    stars.map((s) => ({
      name: s.name,
      type: s.type,
      brightness: s.brightness || undefined,
      mutagen: s.mutagen || undefined,
    }));

  const extractScopeStars = (
    scopeStars: Array<Array<{ name: string }>> | undefined,
    idx: number
  ): string[] => {
    if (!scopeStars || !scopeStars[idx]) return [];
    return scopeStars[idx].map((s) => s.name);
  };

  let mingPalaceIndex = 0;
  let bodyPalaceIndex = 0;

  const palaces: ZiweiPalaceData[] = astrolabe.palaces.map((p, idx) => {
    if (p.name === '命宮') mingPalaceIndex = idx;
    if (p.isBodyPalace) bodyPalaceIndex = idx;

    return {
      index: idx,
      name: p.name,
      isBodyPalace: p.isBodyPalace,
      isOriginalPalace: p.isOriginalPalace,
      heavenlyStem: p.heavenlyStem,
      earthlyBranch: p.earthlyBranch,
      majorStars: mapStars(p.majorStars),
      minorStars: mapStars(p.minorStars),
      adjectiveStars: mapStars(p.adjectiveStars),
      changsheng12: p.changsheng12,
      boshi12: p.boshi12,
      decadalRange: p.decadal.range as [number, number],
      ages: p.ages,
      decadalPalaceName: horoscope.decadal.palaceNames[idx] ?? '',
      yearlyPalaceName: horoscope.yearly.palaceNames[idx] ?? '',
      monthlyPalaceName: horoscope.monthly.palaceNames[idx] ?? '',
      dailyPalaceName: horoscope.daily.palaceNames[idx] ?? '',
      decadalStars: extractScopeStars(horoscope.decadal.stars, idx),
      yearlyStars: extractScopeStars(horoscope.yearly.stars, idx),
      monthlyStars: extractScopeStars(horoscope.monthly.stars, idx),
      dailyStars: extractScopeStars(horoscope.daily.stars, idx),
    };
  });

  const makeMutagenRow = (
    scope: HoroscopeScope,
    label: string,
    ganZhi: string,
    muts: string[]
  ): ZiweiMutagenRow => ({
    scope,
    label,
    ganZhi,
    lu: muts[0] ?? '',
    quan: muts[1] ?? '',
    ke: muts[2] ?? '',
    ji: muts[3] ?? '',
  });

  const mutagenTable: ZiweiMutagenRow[] = [
    makeMutagenRow('origin', '本命', originYearGanZhi, originMutagens),
    makeMutagenRow(
      'decadal',
      '大限',
      `${horoscope.decadal.heavenlyStem}${horoscope.decadal.earthlyBranch}`,
      horoscope.decadal.mutagen
    ),
    makeMutagenRow(
      'yearly',
      '流年',
      `${horoscope.yearly.heavenlyStem}${horoscope.yearly.earthlyBranch}`,
      horoscope.yearly.mutagen
    ),
    makeMutagenRow(
      'monthly',
      '流月',
      `${horoscope.monthly.heavenlyStem}${horoscope.monthly.earthlyBranch}`,
      horoscope.monthly.mutagen
    ),
    makeMutagenRow(
      'daily',
      '流日',
      `${horoscope.daily.heavenlyStem}${horoscope.daily.earthlyBranch}`,
      horoscope.daily.mutagen
    ),
  ];

  const decadalPalace = palaces[horoscope.decadal.index];

  return {
    solarDate: astrolabe.solarDate,
    lunarDate: astrolabe.lunarDate,
    chineseDate: astrolabe.chineseDate,
    time: astrolabe.time,
    timeRange: astrolabe.timeRange,
    zodiac: astrolabe.zodiac,
    sign: astrolabe.sign,
    fiveElementsClass: astrolabe.fiveElementsClass,
    soulLord: astrolabe.soul,
    bodyLord: astrolabe.body,
    mingPalaceIndex,
    bodyPalaceIndex,
    palaces,
    mutagenTable,
    targetLunarDate: horoscope.lunarDate,
    activeDecadalInfo: {
      index: horoscope.decadal.index,
      ganZhi: `${horoscope.decadal.heavenlyStem}${horoscope.decadal.earthlyBranch}`,
      range: decadalPalace ? decadalPalace.decadalRange : [0, 0],
      mingPalaceBranch: horoscope.decadal.earthlyBranch,
    },
    activeYearlyInfo: {
      index: horoscope.yearly.index,
      ganZhi: `${horoscope.yearly.heavenlyStem}${horoscope.yearly.earthlyBranch}`,
      mingPalaceBranch: horoscope.yearly.earthlyBranch,
    },
    activeMonthlyInfo: {
      index: horoscope.monthly.index,
      ganZhi: `${horoscope.monthly.heavenlyStem}${horoscope.monthly.earthlyBranch}`,
      mingPalaceBranch: horoscope.monthly.earthlyBranch,
    },
    activeDailyInfo: {
      index: horoscope.daily.index,
      ganZhi: `${horoscope.daily.heavenlyStem}${horoscope.daily.earthlyBranch}`,
      mingPalaceBranch: horoscope.daily.earthlyBranch,
    },
  };
}
