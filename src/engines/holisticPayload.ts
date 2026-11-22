import {
  BaziChartResult,
  ClientProfile,
  HolisticChartSummaryPayload,
  HoroscopeScope,
  TarotChartResult,
  ZiweiChartResult,
} from '../types/holistic';
import { getSanFangSiZhengIndices } from './ziweiEngine';

export const SCOPE_LABELS: Record<HoroscopeScope, string> = {
  origin: '本命原局',
  decadal: '大限・大運',
  yearly: '流年運勢',
  monthly: '流月節律',
  daily: '流日氣場',
};

function formatStarList(
  stars: Array<{ name: string; brightness?: string; mutagen?: string }>
): string[] {
  return stars.map((s) => {
    const parts = [s.name];
    if (s.brightness) parts.push(`(${s.brightness})`);
    if (s.mutagen) parts.push(`[化${s.mutagen}]`);
    return parts.join('');
  });
}

export function buildHolisticPayload(
  client: ClientProfile,
  ziwei: ZiweiChartResult,
  bazi: BaziChartResult,
  tarot: TarotChartResult,
  targetDate: string,
  activeScope: HoroscopeScope
): HolisticChartSummaryPayload {
  const mingPalace = ziwei.palaces[ziwei.mingPalaceIndex];
  const bodyPalace = ziwei.palaces[ziwei.bodyPalaceIndex];

  const sf = getSanFangSiZhengIndices(ziwei.mingPalaceIndex);
  const sanFangIndices = [sf.self, sf.opposite, sf.triadA, sf.triadB];
  const sanFangSiZhengSummary = sanFangIndices.map((idx) => {
    const p = ziwei.palaces[idx];
    const majors = formatStarList(p.majorStars).join('、') || '空宮借對宮';
    const minors = p.minorStars.map((s) => s.name).join('、');
    return `${p.name}(${p.heavenlyStem}${p.earthlyBranch})：主星[${majors}]${
      minors ? ` 輔星[${minors}]` : ''
    }`;
  });

  const keyPalaceNames = ['命宮', '財帛', '官祿', '遷移', '夫妻', '福德', '疾厄'];
  const keyPalaces = keyPalaceNames
    .map((targetName) => ziwei.palaces.find((p) => p.name === targetName))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => {
      const mutagens = [...p.majorStars, ...p.minorStars]
        .filter((s) => s.mutagen)
        .map((s) => `${s.name}化${s.mutagen}`);
      return {
        name: p.name,
        ganZhi: `${p.heavenlyStem}${p.earthlyBranch}`,
        majorStars: formatStarList(p.majorStars),
        mutagens,
      };
    });

  // Bazi pillars ordered Year Month Day Hour for standard reading string
  const yearP = bazi.pillars.find((p) => p.label === '年柱');
  const monthP = bazi.pillars.find((p) => p.label === '月柱');
  const dayP = bazi.pillars.find((p) => p.label === '日柱');
  const hourP = bazi.pillars.find((p) => p.label === '時柱');
  const fourPillars = [yearP, monthP, dayP, hourP]
    .filter(Boolean)
    .map((p) => `${p!.stem}${p!.branch}`)
    .join(' ');

  const activeDecade = bazi.targetFlow.activeDecade;
  const currentDecadeStr = activeDecade
    ? `${activeDecade.ganZhi}（${activeDecade.tenStar}，${activeDecade.startAge}~${activeDecade.endAge}歲，${activeDecade.startYear}~${activeDecade.endYear}年）`
    : '尚未起運（童限階段）';

  const decPalace = ziwei.palaces[ziwei.activeDecadalInfo.index];
  const yrPalace = ziwei.palaces[ziwei.activeYearlyInfo.index];
  const moPalace = ziwei.palaces[ziwei.activeMonthlyInfo.index];
  const dyPalace = ziwei.palaces[ziwei.activeDailyInfo.index];

  return {
    client: {
      name: client.name,
      gender: client.gender,
      solarBirthDate: client.birthDate,
      birthTime: client.birthTime,
      lunarBirthDate: ziwei.lunarDate,
    },
    targetContext: {
      targetDate,
      activeScope,
      activeScopeLabel: SCOPE_LABELS[activeScope],
    },
    ziwei: {
      fiveElementsClass: ziwei.fiveElementsClass,
      soulLord: ziwei.soulLord,
      bodyLord: ziwei.bodyLord,
      mingPalace: {
        ganZhi: `${mingPalace.heavenlyStem}${mingPalace.earthlyBranch}`,
        majorStars: formatStarList(mingPalace.majorStars),
        minorStars: mingPalace.minorStars.map((s) => s.name),
        sanFangSiZhengSummary,
      },
      bodyPalace: {
        name: bodyPalace.name,
        ganZhi: `${bodyPalace.heavenlyStem}${bodyPalace.earthlyBranch}`,
        majorStars: formatStarList(bodyPalace.majorStars),
      },
      keyPalaces,
      mutagenTable: ziwei.mutagenTable,
      currentDecadal: `大限命宮落本命${decPalace.name}(${ziwei.activeDecadalInfo.ganZhi}，${ziwei.activeDecadalInfo.range[0]}-${ziwei.activeDecadalInfo.range[1]}歲)，主星：${formatStarList(decPalace.majorStars).join('、') || '空宮'}`,
      currentYearly: `流年命宮落本命${yrPalace.name}(${ziwei.activeYearlyInfo.ganZhi})，主星：${formatStarList(yrPalace.majorStars).join('、') || '空宮'}`,
      currentMonthly: `流月命宮落本命${moPalace.name}(${ziwei.activeMonthlyInfo.ganZhi})`,
      currentDaily: `流日命宮落本命${dyPalace.name}(${ziwei.activeDailyInfo.ganZhi})`,
    },
    bazi: {
      fourPillars,
      dayMaster: `${bazi.dayMaster.stem}（${bazi.dayMaster.yinYang}${bazi.dayMaster.element}）`,
      dayKongWang: bazi.dayKongWang,
      elementCounts: bazi.elementCounts,
      pillarDetails: bazi.pillars.map((p) => ({
        label: p.label,
        ganZhi: `${p.stem}${p.branch}`,
        tenStar: p.tenStar,
        hiddenStems: p.hiddenStems.map((h) => `${h.stem}(${h.tenStar})`),
        terrain: p.terrain,
        sound: p.sound,
        shenSha: p.shenSha.map((s) => s.name),
      })),
      currentDecade: currentDecadeStr,
      currentFlow: {
        year: `${bazi.targetFlow.yearGanZhi}（${bazi.targetFlow.yearTenStar}，神煞：${bazi.targetFlow.yearPillar.shenSha.map((s) => s.name).join('、') || '無'}）`,
        month: `${bazi.targetFlow.monthGanZhi}（${bazi.targetFlow.monthTenStar}）`,
        day: `${bazi.targetFlow.dayGanZhi}（${bazi.targetFlow.dayTenStar}）`,
      },
    },
    tarot: {
      constellation: `${tarot.constellation.id} 號${tarot.constellation.name}（${tarot.constellation.title}）`,
      constellationTheme: tarot.constellation.theme,
      personalityCard: `${tarot.personalityCard.displayNumber} ${tarot.personalityCard.name} (${tarot.personalityCard.englishName})`,
      soulCard: `${tarot.soulCard.displayNumber} ${tarot.soulCard.name} (${tarot.soulCard.englishName})`,
      isSpecialCase19: tarot.isSpecialCase19,
      shadowCards: tarot.shadowCards.map(
        (c) => `${c.displayNumber} ${c.name} (${c.englishName})`
      ),
      currentYearCard: `${tarot.currentYearCard.card.displayNumber} ${tarot.currentYearCard.card.name}`,
      currentYearRootCard: tarot.currentYearCard.rootCard
        ? `${tarot.currentYearCard.rootCard.displayNumber} ${tarot.currentYearCard.rootCard.name}`
        : null,
      yearCyclePeriod: `${tarot.currentYearCard.periodStart} 至 ${tarot.currentYearCard.periodEnd}`,
      nextSwitchDate: tarot.nextSwitchDate,
    },
  };
}
