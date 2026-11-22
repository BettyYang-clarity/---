import { ChildLimit, Gender, HideHeavenStemType, SixtyCycle, SolarTime } from 'tyme4ts';
import {
  BaziChartResult,
  BaziDecadeFortune,
  BaziFlowPillar,
  BaziHiddenStem,
  BaziPillar,
  BaziShenShaItem,
  BaziYearlyFortune,
  FiveElement,
  GenderType,
} from '../types/holistic';

// Convert simplified characters emitted by tyme4ts TenStar / NaYin / Terrain into Traditional Chinese (zh-TW)
const S2T_CHAR_MAP: Record<string, string> = {
  财: '財',
  伤: '傷',
  杀: '殺',
  剑: '劍',
  锋: '鋒',
  杨: '楊',
  涧: '澗',
  头: '頭',
  蜡: '蠟',
  雳: '靂',
  长: '長',
  钗: '釵',
  钏: '釧',
  炉: '爐',
  驿: '驛',
  阳: '陽',
  阴: '陰',
  节: '節',
  气: '氣',
  灯: '燈',
  溪: '溪',
  覆: '覆',
  临: '臨',
  带: '帶',
  绝: '絕',
  养: '養',
};

function toTraditional(str: string): string {
  return str
    .split('')
    .map((ch) => S2T_CHAR_MAP[ch] ?? ch)
    .join('');
}

function normalizeElement(el: string): FiveElement {
  if (el === '木' || el === '火' || el === '土' || el === '金' || el === '水') {
    return el;
  }
  return '土';
}

function getHideTypeLabel(t: HideHeavenStemType): '本氣' | '中氣' | '餘氣' {
  if (t === HideHeavenStemType.MAIN) return '本氣';
  if (t === HideHeavenStemType.MIDDLE) return '中氣';
  return '餘氣';
}

// ============================================================================
// Classical ZiPing Bazi Shen Sha (神煞) Deterministic Lookup Tables
// Strictly derived from tyme4ts-computed Stems & Branches (no hand-rolled calendar)
// ============================================================================

const TIAN_YI_MAP: Record<string, string[]> = {
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

const TAI_JI_MAP: Record<string, string[]> = {
  甲: ['子', '午'],
  乙: ['子', '午'],
  丙: ['卯', '酉'],
  丁: ['卯', '酉'],
  戊: ['辰', '戌', '丑', '未'],
  己: ['辰', '戌', '丑', '未'],
  庚: ['寅', '亥'],
  辛: ['寅', '亥'],
  壬: ['巳', '申'],
  癸: ['巳', '申'],
};

const WEN_CHANG_MAP: Record<string, string> = {
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

const TIAN_DE_MAP: Record<string, string> = {
  寅: '丁',
  卯: '申',
  辰: '壬',
  巳: '辛',
  午: '亥',
  未: '甲',
  申: '癸',
  酉: '寅',
  戌: '丙',
  亥: '乙',
  子: '巳',
  丑: '庚',
};

const YUE_DE_MAP: Record<string, string> = {
  寅: '丙',
  午: '丙',
  戌: '丙',
  申: '壬',
  子: '壬',
  辰: '壬',
  亥: '甲',
  卯: '甲',
  未: '甲',
  巳: '庚',
  酉: '庚',
  丑: '庚',
};

const LU_SHEN_MAP: Record<string, string> = {
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

const YANG_REN_MAP: Record<string, string> = {
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

const JIN_YU_MAP: Record<string, string> = {
  甲: '辰',
  乙: '巳',
  丙: '未',
  丁: '申',
  戊: '未',
  己: '申',
  庚: '戌',
  辛: '亥',
  壬: '丑',
  癸: '寅',
};

const GUO_YIN_MAP: Record<string, string> = {
  甲: '戌',
  乙: '亥',
  丙: '丑',
  丁: '寅',
  戊: '丑',
  己: '寅',
  庚: '辰',
  辛: '巳',
  壬: '未',
  癸: '申',
};

const HONG_YAN_MAP: Record<string, string> = {
  甲: '午',
  乙: '午',
  丙: '寅',
  丁: '未',
  戊: '辰',
  己: '辰',
  庚: '戌',
  辛: '酉',
  壬: '子',
  癸: '申',
};

const YI_MA_MAP: Record<string, string> = {
  申: '寅', 子: '寅', 辰: '寅',
  寅: '申', 午: '申', 戌: '申',
  巳: '亥', 酉: '亥', 丑: '亥',
  亥: '巳', 卯: '巳', 未: '巳',
};

const TAO_HUA_MAP: Record<string, string> = {
  申: '酉', 子: '酉', 辰: '酉',
  寅: '卯', 午: '卯', 戌: '卯',
  巳: '午', 酉: '午', 丑: '午',
  亥: '子', 卯: '子', 未: '子',
};

const HUA_GAI_MAP: Record<string, string> = {
  申: '辰', 子: '辰', 辰: '辰',
  寅: '戌', 午: '戌', 戌: '戌',
  巳: '丑', 酉: '丑', 丑: '丑',
  亥: '未', 卯: '未', 未: '未',
};

const JIANG_XING_MAP: Record<string, string> = {
  申: '子', 子: '子', 辰: '子',
  寅: '午', 午: '午', 戌: '午',
  巳: '酉', 酉: '酉', 丑: '酉',
  亥: '卯', 卯: '卯', 未: '卯',
};

const JIE_SHA_MAP: Record<string, string> = {
  申: '巳', 子: '巳', 辰: '巳',
  寅: '亥', 午: '亥', 戌: '亥',
  巳: '寅', 酉: '寅', 丑: '寅',
  亥: '申', 卯: '申', 未: '申',
};

const WANG_SHEN_MAP: Record<string, string> = {
  申: '亥', 子: '亥', 辰: '亥',
  寅: '巳', 午: '巳', 戌: '巳',
  巳: '申', 酉: '申', 丑: '申',
  亥: '寅', 卯: '寅', 未: '寅',
};

const HONG_LUAN_MAP: Record<string, string> = {
  子: '卯', 丑: '寅', 寅: '丑', 卯: '子', 辰: '亥', 巳: '戌',
  午: '酉', 未: '申', 申: '未', 酉: '午', 戌: '巳', 亥: '辰',
};

const TIAN_XI_MAP: Record<string, string> = {
  子: '酉', 丑: '申', 寅: '未', 卯: '午', 辰: '巳', 巳: '辰',
  午: '卯', 未: '寅', 申: '丑', 酉: '子', 戌: '亥', 亥: '戌',
};

const GU_CHEN_MAP: Record<string, string> = {
  亥: '寅', 子: '寅', 丑: '寅',
  寅: '巳', 卯: '巳', 辰: '巳',
  巳: '申', 午: '申', 未: '申',
  申: '亥', 酉: '亥', 戌: '亥',
};

const GUA_SU_MAP: Record<string, string> = {
  亥: '戌', 子: '戌', 丑: '戌',
  寅: '丑', 卯: '丑', 辰: '丑',
  巳: '辰', 午: '辰', 未: '辰',
  申: '未', 酉: '未', 戌: '未',
};

const KUI_GANG_SET = new Set(['庚辰', '庚戌', '壬辰', '戊戌']);
const SHI_E_SET = new Set(['甲辰', '乙巳', '丙申', '丁亥', '戊戌', '己丑', '庚辰', '辛巳', '壬申', '癸亥']);
const YIN_YANG_CHA_CUO_SET = new Set([
  '丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳',
  '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥',
]);

interface ShenShaContext {
  yearStem: string;
  yearBranch: string;
  monthBranch: string;
  dayStem: string;
  dayBranch: string;
  dayKongWang: string;
}

function computePillarShenSha(
  stem: string,
  branch: string,
  ctx: ShenShaContext,
  isDayPillar = false
): BaziShenShaItem[] {
  const result: BaziShenShaItem[] = [];
  const seen = new Set<string>();

  const add = (
    name: string,
    category: BaziShenShaItem['category'],
    description: string
  ) => {
    if (seen.has(name)) return;
    seen.add(name);
    result.push({ name, category, description });
  };

  // 吉神類
  if (
    TIAN_YI_MAP[ctx.dayStem]?.includes(branch) ||
    TIAN_YI_MAP[ctx.yearStem]?.includes(branch)
  ) {
    add('天乙貴人', 'auspicious', '命中最尊貴之吉星，主逢凶化吉、關鍵時刻得貴人提攜相助。');
  }

  const tianDeTarget = TIAN_DE_MAP[ctx.monthBranch];
  if (tianDeTarget && (stem === tianDeTarget || branch === tianDeTarget)) {
    add('天德貴人', 'auspicious', '天地德秀之氣，主一生福厚安穩、遇災減輕、口碑與信用俱佳。');
  }

  const yueDeTarget = YUE_DE_MAP[ctx.monthBranch];
  if (yueDeTarget && stem === yueDeTarget) {
    add('月德貴人', 'auspicious', '仁慈寬厚之吉曜，處事圓融，能化解人際摩擦與突發波折。');
  }

  if (WEN_CHANG_MAP[ctx.dayStem] === branch || WEN_CHANG_MAP[ctx.yearStem] === branch) {
    add('文昌貴人', 'auspicious', '主聰穎好學、文筆表達與專業考證運佳，擅長知識整合與企劃。');
  }

  if (
    TAI_JI_MAP[ctx.dayStem]?.includes(branch) ||
    TAI_JI_MAP[ctx.yearStem]?.includes(branch)
  ) {
    add('太極貴人', 'auspicious', '主悟性高、對哲學、身心靈或深度系統研究具備天賦，善始善終。');
  }

  if (LU_SHEN_MAP[ctx.dayStem] === branch) {
    add('祿神', 'auspicious', '日主臨官旺地，象徵食祿豐厚、正財穩健與自主承擔事業的實力。');
  }

  if (JIN_YU_MAP[ctx.dayStem] === branch) {
    add('金輿', 'auspicious', '富貴安泰之象，主生活品味佳、財富累積順遂，亦主得賢助。');
  }

  if (GUO_YIN_MAP[ctx.dayStem] === branch || GUO_YIN_MAP[ctx.yearStem] === branch) {
    add('國印貴人', 'auspicious', '主誠實可靠、掌權印信，在組織制度與管理職務中易獲授權信任。');
  }

  if (JIANG_XING_MAP[ctx.yearBranch] === branch || JIANG_XING_MAP[ctx.dayBranch] === branch) {
    add('將星', 'auspicious', '主領導統御力與決策魄力，能於關鍵專案或團隊中挑大樑。');
  }

  if (HONG_LUAN_MAP[ctx.yearBranch] === branch) {
    add('紅鸞', 'auspicious', '主喜慶、良緣與好人緣，亦象徵情感升溫或喜訊臨門。');
  }

  if (TIAN_XI_MAP[ctx.yearBranch] === branch) {
    add('天喜', 'auspicious', '主樂觀喜悅、貴人歡心與婚戀、添丁或合作喜事。');
  }

  // 中性特色神煞
  if (YI_MA_MAP[ctx.yearBranch] === branch || YI_MA_MAP[ctx.dayBranch] === branch) {
    add('驛馬', 'neutral', '主奔波移動、跨區發展、差旅遷徙與變動中生財之象。');
  }

  if (TAO_HUA_MAP[ctx.yearBranch] === branch || TAO_HUA_MAP[ctx.dayBranch] === branch) {
    add('桃花', 'neutral', '主魅力人緣、審美敏銳與異性吸引力，宜善用於公關與創意領域。');
  }

  if (HUA_GAI_MAP[ctx.yearBranch] === branch || HUA_GAI_MAP[ctx.dayBranch] === branch) {
    add('華蓋', 'neutral', '主孤高出眾、藝術哲思與獨立深造，喜靜處沉澱，專業底蘊深厚。');
  }

  const ganZhi = `${stem}${branch}`;
  if (isDayPillar && KUI_GANG_SET.has(ganZhi)) {
    add('魁罡', 'neutral', '性格剛毅果決、聰明絕頂、不畏權勢，成敗格局大，宜修柔和彈性。');
  }

  if (HONG_YAN_MAP[ctx.dayStem] === branch) {
    add('紅豔煞', 'neutral', '情感豐沛、浪漫具感染力，人際魅力出眾，需留意界線清晰。');
  }

  // 警示／轉化神煞
  if (YANG_REN_MAP[ctx.dayStem] === branch) {
    add('羊刃', 'caution', '剛烈果斷、執行爆發力極強，但須防急躁硬碰硬或過度耗損身體。');
  }

  if (JIE_SHA_MAP[ctx.yearBranch] === branch || JIE_SHA_MAP[ctx.dayBranch] === branch) {
    add('劫煞', 'caution', '主節奏緊繃或突發考驗；若為喜用則為危機突破力，為忌則須防破耗。');
  }

  if (WANG_SHEN_MAP[ctx.yearBranch] === branch || WANG_SHEN_MAP[ctx.dayBranch] === branch) {
    add('亡神', 'caution', '城府深沉、思慮細密，須留意過度內耗、鑽牛角尖或口舌是非。');
  }

  if (GU_CHEN_MAP[ctx.yearBranch] === branch) {
    add('孤辰', 'caution', '偏重獨立自主、內心不易敞開，提醒在親密與團隊關係中適度分享。');
  }

  if (GUA_SU_MAP[ctx.yearBranch] === branch) {
    add('寡宿', 'caution', '重視個人空間與內心秩序，有時易感疏離，適合培養深度知音。');
  }

  if (isDayPillar && YIN_YANG_CHA_CUO_SET.has(ganZhi)) {
    add('陰陽差錯', 'caution', '在親密關係與家庭溝通上易有期待落差，重在主動釐清共識。');
  }

  if (isDayPillar && SHI_E_SET.has(ganZhi)) {
    add('十惡大敗', 'caution', '提醒財務規劃須建立紀律與儲備機制，切忌衝動投資或無度開支。');
  }

  if (!isDayPillar && ctx.dayKongWang.includes(branch)) {
    add('空亡', 'caution', '落入日柱旬空，該柱所代表之人事物宜採彈性格局，反適合創意與心靈轉化。');
  }

  return result;
}

export function calculateBaziChart(
  solarBirthDate: string,
  birthTime: string,
  gender: GenderType,
  targetDateStr: string
): BaziChartResult {
  const [bYear, bMonth, bDay] = solarBirthDate.split('-').map(Number);
  const [bHour, bMinute] = birthTime.split(':').map(Number);
  const [tYear, tMonth, tDay] = targetDateStr.split('-').map(Number);

  const solarTime = SolarTime.fromYmdHms(bYear, bMonth, bDay, bHour, bMinute, 0);
  const lunarHour = solarTime.getLunarHour();
  const eightChar = lunarHour.getEightChar();

  const yearCycle = eightChar.getYear();
  const monthCycle = eightChar.getMonth();
  const dayCycle = eightChar.getDay();
  const hourCycle = eightChar.getHour();

  const dayStem = dayCycle.getHeavenStem();
  const dayMasterElement = normalizeElement(dayStem.getElement().getName());
  const dayMasterYinYang: '陽' | '陰' = dayStem.getYinYang() === 1 ? '陽' : '陰';
  const dayKongWang = dayCycle
    .getExtraEarthBranches()
    .map((b) => b.getName())
    .join('');

  const shenShaCtx: ShenShaContext = {
    yearStem: yearCycle.getHeavenStem().getName(),
    yearBranch: yearCycle.getEarthBranch().getName(),
    monthBranch: monthCycle.getEarthBranch().getName(),
    dayStem: dayStem.getName(),
    dayBranch: dayCycle.getEarthBranch().getName(),
    dayKongWang,
  };

  const buildHiddenStems = (cycle: SixtyCycle): BaziHiddenStem[] =>
    cycle
      .getEarthBranch()
      .getHideHeavenStems()
      .map((h) => {
        const hs = h.getHeavenStem();
        return {
          stem: hs.getName(),
          element: normalizeElement(hs.getElement().getName()),
          tenStar: toTraditional(dayStem.getTenStar(hs).getName()),
          typeLabel: getHideTypeLabel(h.getType()),
        };
      });

  const buildPillar = (
    cycle: SixtyCycle,
    label: BaziPillar['label'],
    isDayMaster = false
  ): BaziPillar => {
    const stem = cycle.getHeavenStem();
    const branch = cycle.getEarthBranch();
    const tenStar = isDayMaster
      ? '日主'
      : toTraditional(dayStem.getTenStar(stem).getName());

    const kongWang = cycle
      .getExtraEarthBranches()
      .map((b) => b.getName())
      .join('');

    const terrain = toTraditional(dayStem.getTerrain(branch).getName());

    return {
      label,
      stem: stem.getName(),
      branch: branch.getName(),
      stemElement: normalizeElement(stem.getElement().getName()),
      branchElement: normalizeElement(branch.getElement().getName()),
      stemYinYang: stem.getYinYang() === 1 ? '陽' : '陰',
      tenStar,
      hiddenStems: buildHiddenStems(cycle),
      terrain,
      sound: toTraditional(cycle.getSound().getName()),
      kongWang,
      shenSha: computePillarShenSha(
        stem.getName(),
        branch.getName(),
        shenShaCtx,
        isDayMaster
      ),
      isDayMaster,
    };
  };

  const buildFlowPillar = (
    cycle: SixtyCycle,
    label: BaziFlowPillar['label'],
    subLabel: string
  ): BaziFlowPillar => {
    const stem = cycle.getHeavenStem();
    const branch = cycle.getEarthBranch();
    return {
      label,
      subLabel,
      ganZhi: cycle.getName(),
      stem: stem.getName(),
      branch: branch.getName(),
      stemElement: normalizeElement(stem.getElement().getName()),
      branchElement: normalizeElement(branch.getElement().getName()),
      stemYinYang: stem.getYinYang() === 1 ? '陽' : '陰',
      tenStar: toTraditional(dayStem.getTenStar(stem).getName()),
      hiddenStems: buildHiddenStems(cycle),
      terrain: toTraditional(dayStem.getTerrain(branch).getName()),
      sound: toTraditional(cycle.getSound().getName()),
      kongWang: cycle
        .getExtraEarthBranches()
        .map((b) => b.getName())
        .join(''),
      shenSha: computePillarShenSha(
        stem.getName(),
        branch.getName(),
        shenShaCtx,
        false
      ),
    };
  };

  // Ordered: 時 / 日 / 月 / 年 as specified
  const pillars: BaziPillar[] = [
    buildPillar(hourCycle, '時柱'),
    buildPillar(dayCycle, '日柱', true),
    buildPillar(monthCycle, '月柱'),
    buildPillar(yearCycle, '年柱'),
  ];

  // Five Elements count across 4 Stems + 4 Branches
  const elementCounts: Record<FiveElement, number> = {
    木: 0,
    火: 0,
    土: 0,
    金: 0,
    水: 0,
  };
  for (const p of pillars) {
    elementCounts[p.stemElement] += 1;
    elementCounts[p.branchElement] += 1;
  }

  // Decade Fortunes (大運) via ChildLimit
  const childLimit = ChildLimit.fromSolarTime(
    solarTime,
    gender === '男' ? Gender.MAN : Gender.WOMAN
  );

  const startAgeDescription = `出生後 ${childLimit.getYearCount()} 年 ${childLimit.getMonthCount()} 個月 ${childLimit.getDayCount()} 天起運`;
  const isForward = childLimit.isForward();

  const startDf = childLimit.getStartDecadeFortune();
  const decadeFortunes: BaziDecadeFortune[] = [];
  const decadeCycles: SixtyCycle[] = [];

  for (let i = 0; i < 9; i++) {
    const df = startDf.next(i);
    const sc = df.getSixtyCycle();
    decadeCycles.push(sc);
    const dfStem = sc.getHeavenStem();
    const dfBranch = sc.getEarthBranch();

    const startYear = df.getStartSixtyCycleYear().getYear();
    const endYear = df.getEndSixtyCycleYear().getYear();

    // Expand 10 Yearly Fortunes inside this Decade Fortune
    const startFortune = df.getStartFortune();
    const yearlyFortunes: BaziYearlyFortune[] = [];
    for (let j = 0; j < 10; j++) {
      const f = startFortune.next(j);
      const ySc = f.getSixtyCycleYear().getSixtyCycle();
      const yStem = ySc.getHeavenStem();
      const yBranch = ySc.getEarthBranch();
      yearlyFortunes.push({
        year: f.getSixtyCycleYear().getYear(),
        age: f.getAge(),
        ganZhi: ySc.getName(),
        stem: yStem.getName(),
        branch: yBranch.getName(),
        tenStar: toTraditional(dayStem.getTenStar(yStem).getName()),
        sound: toTraditional(ySc.getSound().getName()),
      });
    }

    decadeFortunes.push({
      index: i,
      ganZhi: sc.getName(),
      stem: dfStem.getName(),
      branch: dfBranch.getName(),
      tenStar: toTraditional(dayStem.getTenStar(dfStem).getName()),
      startAge: df.getStartAge(),
      endAge: df.getEndAge(),
      startYear,
      endYear,
      sound: toTraditional(sc.getSound().getName()),
      yearlyFortunes,
    });
  }

  // Target Date Flow (流年 / 流月 / 流日)
  const targetSolarTime = SolarTime.fromYmdHms(tYear, tMonth, tDay, 12, 0, 0);
  const targetEightChar = targetSolarTime.getLunarHour().getEightChar();

  const tYearCycle = targetEightChar.getYear();
  const tMonthCycle = targetEightChar.getMonth();
  const tDayCycle = targetEightChar.getDay();

  const activeDecadeIdx = decadeFortunes.findIndex(
    (d) => tYear >= d.startYear && tYear <= d.endYear
  );
  const activeDecade =
    activeDecadeIdx >= 0 ? decadeFortunes[activeDecadeIdx] : null;
  const activeDecadeCycle =
    activeDecadeIdx >= 0 ? decadeCycles[activeDecadeIdx] : null;

  const decadePillar =
    activeDecade && activeDecadeCycle
      ? buildFlowPillar(
          activeDecadeCycle,
          '大運',
          `${activeDecade.startAge}–${activeDecade.endAge}歲`
        )
      : null;

  const yearPillar = buildFlowPillar(tYearCycle, '流年', `${tYear}年`);
  const monthPillar = buildFlowPillar(tMonthCycle, '流月', `${tMonth}月令`);
  const dayPillar = buildFlowPillar(tDayCycle, '流日', `${tMonth}/${tDay}`);

  return {
    pillars,
    dayMaster: {
      stem: dayStem.getName(),
      element: dayMasterElement,
      yinYang: dayMasterYinYang,
    },
    dayKongWang,
    elementCounts,
    startAgeDescription,
    isForward,
    decadeFortunes,
    targetFlow: {
      yearGanZhi: tYearCycle.getName(),
      yearTenStar: yearPillar.tenStar,
      monthGanZhi: tMonthCycle.getName(),
      monthTenStar: monthPillar.tenStar,
      dayGanZhi: tDayCycle.getName(),
      dayTenStar: dayPillar.tenStar,
      activeDecade,
      decadePillar,
      yearPillar,
      monthPillar,
      dayPillar,
    },
  };
}
