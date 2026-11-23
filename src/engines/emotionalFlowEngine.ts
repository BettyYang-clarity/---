import { astro } from 'iztro';
import { SolarTime } from 'tyme4ts';
import {
  ClientProfile,
  EmotionalFlowResult,
  EmotionalResonanceKind,
  MonthlyEmotionalFlowPoint,
} from '../types/holistic';
import { calculateTarotChart } from './tarotEngine';

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

const BRIGHTNESS_WEIGHT: Record<string, number> = {
  廟: 10,
  旺: 7,
  得: 4,
  利: 2,
  平: 0,
  不: -4,
  陷: -7,
};

const TERRAIN_WEIGHT: Record<string, number> = {
  帝旺: 10,
  臨官: 8,
  長生: 7,
  冠帶: 5,
  養: 3,
  胎: 2,
  沐浴: 0,
  衰: -2,
  墓: -3,
  病: -5,
  死: -6,
  絕: -7,
};

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

// Tarot Major Arcana psychological emotional tone baseline (-32 .. +32)
// Positive = expansive/open/hopeful, Neutral = contemplative/balanced, Negative = tense/introspective/transformational
const TAROT_EMOTION_BASE: Record<number, number> = {
  0: 18, // 愚者：輕盈敞開
  1: 16, // 魔術師：專注有感
  2: -2, // 女祭師：靜默內收
  3: 24, // 皇后：豐盈滋養
  4: 6, // 皇帝：自律承擔
  5: 8, // 教皇：安穩信念
  6: 15, // 戀人：共鳴渴望
  7: 10, // 戰車：緊繃衝刺
  8: 19, // 力量：柔韌安定
  9: -12, // 隱者：獨處沉潛
  10: 12, // 命運之輪：變動期待
  11: 2, // 正義：理性權衡
  12: -16, // 吊人：懸置等待
  13: -22, // 死神：斷捨陣痛
  14: 17, // 節制：平靜調和
  15: -18, // 惡魔：執念拉扯
  16: -26, // 高塔：突變震撼
  17: 25, // 星星：療癒希望
  18: -20, // 月亮：敏感迷霧
  19: 30, // 太陽：澄明喜悅
  20: 14, // 審判：釋懷覺醒
  21: 26, // 世界：圓滿篤定
};

// Emotional nuance per Bazi monthly Ten God (psychological feeling, distinct from outer luck)
const TEN_STAR_EMOTION_SHIFT: Record<string, number> = {
  食神: 12,
  正印: 10,
  正財: 6,
  比肩: 4,
  正官: 1,
  偏財: 5,
  偏印: -8,
  傷官: -6,
  劫財: -7,
  七殺: -11,
};

// Ziwei Mental Palace (福德宮) star emotional warmth / pressure
const MENTAL_CALM_STARS = new Set([
  '天同',
  '天梁',
  '天府',
  '太陰',
  '天相',
  '天喜',
  '左輔',
  '右弼',
]);
const MENTAL_TENSE_STARS = new Set([
  '廉貞',
  '七殺',
  '破軍',
  '巨門',
  '擎羊',
  '陀羅',
  '火星',
  '鈴星',
  '地空',
  '地劫',
]);

function getEmotionToneLabel(score: number): string {
  if (score >= 22) return '澄明敞開';
  if (score >= 7) return '溫潤平穩';
  if (score >= -8) return '內省平衡';
  if (score >= -22) return '敏感內耗';
  return '深潛修復';
}

function classifyResonance(
  fortuneScore: number,
  emotionalScore: number
): { kind: EmotionalResonanceKind; label: string } {
  const normalizedEmotion = emotionalScore + 50; // 0..100
  const gap = fortuneScore - normalizedEmotion;

  if (fortuneScore >= 64 && emotionalScore <= -6 && gap >= 18) {
    return { kind: 'outer_high_inner_low', label: '外順內耗・需同理喘息' };
  }
  if (fortuneScore <= 52 && emotionalScore >= 6 && gap <= -14) {
    return { kind: 'outer_low_inner_calm', label: '外阻內定・從容蓄能' };
  }
  if (fortuneScore >= 65 && emotionalScore >= 12) {
    return { kind: 'aligned_high', label: '心運同頻・順勢綻放' };
  }
  if (fortuneScore <= 52 && emotionalScore <= -10) {
    return { kind: 'both_gentle', label: '低谷收斂・減載止損' };
  }
  return { kind: 'steady_flow', label: '心運平穩・循序前行' };
}

function buildEmpathyCopy(params: {
  month: number;
  resonanceKind: EmotionalResonanceKind;
  tarotName: string;
  tarotKeyword: string;
  tenStar: string;
  mentalPalaceName: string;
  isBirthdaySwitch: boolean;
  jiHitMental: boolean;
}): { empathyNote: string; selfCareTip: string } {
  const {
    month,
    resonanceKind,
    tarotName,
    tarotKeyword,
    tenStar,
    mentalPalaceName,
    isBirthdaySwitch,
    jiHitMental,
  } = params;

  const switchPrefix = isBirthdaySwitch
    ? `本月適逢國曆生日，塔羅個人流年剛切換為「${tarotName}」（${tarotKeyword}），內在正經歷年度心理轉頻。`
    : '';

  switch (resonanceKind) {
    case 'outer_high_inner_low':
      return {
        empathyNote: `${switchPrefix}${month}月外在機會與表現動能頗佳，但八字月令逢「${tenStar}」${
          jiHitMental ? '且流月化忌牽動福德心神' : `加上流月福德落本命「${mentalPalaceName}」`
        }，容易出現「別人看你很順、自己內心卻很累」的隱性消耗。`,
        selfCareTip:
          '請別用高標準催促自己做到滿分；為每個外在進展預留半天空白，允許脆弱與疲憊被看見。',
      };
    case 'outer_low_inner_calm':
      return {
        empathyNote: `${switchPrefix}${month}月外在節奏相對放緩或偶有阻力，但塔羅「${tarotName}」的${tarotKeyword}能量穩住了內心底盤，使你保有難得的清明與定力。`,
        selfCareTip:
          '外境暫慢時正好向內整理策略與人脈，這份內在安定本身就是下一波升勢的根基。',
      };
    case 'aligned_high':
      return {
        empathyNote: `${switchPrefix}${month}月外在運程與內在心流高度同頻，塔羅「${tarotName}」與月令「${tenStar}」彼此滋養，行動起來自然流暢且有成就感。`,
        selfCareTip:
          '把握這段心力充沛的窗口推動關鍵對話與重要決策，同時記下讓你發光的狀態作為日常錨點。',
      };
    case 'both_gentle':
      return {
        empathyNote: `${switchPrefix}${month}月內外節奏同步進入收斂期，月令「${tenStar}」與塔羅「${tarotName}」提醒你情緒承載量較敏感，不宜同時扛下過多人情與責任。`,
        selfCareTip:
          '本月最高優先級不是加速突破，而是減少無效社交、固定作息，對額外人情與任務明確設下界線、果斷說「不」。',
      };
    case 'steady_flow':
    default:
      return {
        empathyNote: `${switchPrefix}${month}月外在進度與內在情緒維持平衡，在塔羅「${tarotName}」（${tarotKeyword}）與月令「${tenStar}」的引導下，適合穩紮穩打。`,
        selfCareTip:
          '維持穩定日常節律即可累積複利，每週留 15 分鐘書寫感受，讓細微靈感自然浮現。',
      };
  }
}

/**
 * Compute 12-month dual-axis Emotional Flow (Tarot archetype + Mental Palace + Bazi psychology)
 * paired with Destiny Fortune (Ziwei monthly horoscope + Bazi monthly stem/branch) for targetYear.
 */
export function calculateEmotionalFlow(
  client: ClientProfile,
  targetDate: string
): EmotionalFlowResult {
  ensureZiweiConfig();

  const [bYear, bMonth, bDay] = client.birthDate.split('-').map(Number);
  const [bHour, bMinute] = client.birthTime.split(':').map(Number);
  const [targetYear, targetMonth] = targetDate.split('-').map(Number);

  // 1. Base Ziwei astrolabe (built once)
  const timeIndex = Math.floor(((bHour + 1) % 24) / 2);
  const astrolabe = astro.bySolar(
    `${bYear}-${bMonth}-${bDay}`,
    timeIndex,
    client.gender,
    true,
    'zh-TW'
  );

  const starPalaceIdx = new Map<string, number>();
  astrolabe.palaces.forEach((p, idx) => {
    [...p.majorStars, ...p.minorStars].forEach((s) => {
      starPalaceIdx.set(s.name, idx);
    });
  });

  // 2. Base Bazi Natal Stems/Branches (built once)
  const birthSolar = SolarTime.fromYmdHms(bYear, bMonth, bDay, bHour, bMinute, 0);
  const natalEightChar = birthSolar.getLunarHour().getEightChar();
  const dayStem = natalEightChar.getDay().getHeavenStem();
  const dayBranchName = natalEightChar.getDay().getEarthBranch().getName();
  const monthBranchName = natalEightChar.getMonth().getEarthBranch().getName();

  // Base Tarot charts before & after birthday in targetYear
  const tarotBeforeBday = calculateTarotChart(
    client.birthDate,
    `${targetYear}-01-01`
  );
  const tarotAfterBday = calculateTarotChart(
    client.birthDate,
    `${targetYear}-12-31`
  );

  const points: MonthlyEmotionalFlowPoint[] = [];

  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    const midDate = `${targetYear}-${mm}-15`;

    // --- A. Ziwei Monthly Horoscope (iztro) ---
    const horo = astrolabe.horoscope(midDate);
    const mMingIdx = horo.monthly.index;
    const mMentalIdx = (mMingIdx + 2) % 12; // 順數二位為流月福德宮（命-父-福）
    const mMingPalace = astrolabe.palaces[mMingIdx];
    const mOppPalace = astrolabe.palaces[(mMingIdx + 6) % 12];
    const mMentalPalace = astrolabe.palaces[mMentalIdx];
    const mSanFang = new Set([
      mMingIdx,
      (mMingIdx + 6) % 12,
      (mMingIdx + 4) % 12,
      (mMingIdx + 8) % 12,
    ]);

    const effMajor =
      mMingPalace.majorStars.length > 0
        ? mMingPalace.majorStars
        : mOppPalace.majorStars;
    const brightAvg =
      effMajor.length > 0
        ? effMajor.reduce(
            (acc, s) => acc + (BRIGHTNESS_WEIGHT[s.brightness ?? '平'] ?? 0),
            0
          ) / effMajor.length
        : 0;

    const [luStar, quanStar, keStar, jiStar] = horo.monthly.mutagen;
    let ziweiMutagenFortune = 0;
    if (luStar && mSanFang.has(starPalaceIdx.get(luStar) ?? -1)) ziweiMutagenFortune += 9;
    if (quanStar && mSanFang.has(starPalaceIdx.get(quanStar) ?? -1)) ziweiMutagenFortune += 5;
    if (keStar && mSanFang.has(starPalaceIdx.get(keStar) ?? -1)) ziweiMutagenFortune += 4;
    if (jiStar && mSanFang.has(starPalaceIdx.get(jiStar) ?? -1)) ziweiMutagenFortune -= 10;

    // Mental Palace (福德宮) emotional influence
    let mentalStarDelta = 0;
    [...mMentalPalace.majorStars, ...mMentalPalace.minorStars].forEach((s) => {
      if (MENTAL_CALM_STARS.has(s.name)) mentalStarDelta += 4;
      if (MENTAL_TENSE_STARS.has(s.name)) mentalStarDelta -= 4.5;
    });
    mentalStarDelta = clamp(mentalStarDelta, -14, 14);

    const jiPalace = jiStar ? starPalaceIdx.get(jiStar) ?? -1 : -1;
    const jiHitMental =
      jiPalace === mMentalIdx || jiPalace === (mMentalIdx + 6) % 12;
    const luPalace = luStar ? starPalaceIdx.get(luStar) ?? -1 : -1;
    const luHitMental =
      luPalace === mMentalIdx || luPalace === (mMentalIdx + 6) % 12;

    // --- B. Bazi Monthly Pillar (tyme4ts) ---
    const mSolar = SolarTime.fromYmdHms(targetYear, m, 15, 12, 0, 0);
    const mCycle = mSolar.getLunarHour().getEightChar().getMonth();
    const mStem = mCycle.getHeavenStem();
    const mBranch = mCycle.getEarthBranch();
    const mBranchName = mBranch.getName();
    const mTenStar = toTrad(dayStem.getTenStar(mStem).getName());
    const mTerrain = toTrad(dayStem.getTerrain(mBranch).getName());

    let baziBranchFortune = 0;
    let baziBranchEmotion = 0;
    if (BRANCH_CLASH[dayBranchName] === mBranchName) {
      baziBranchFortune -= 8;
      baziBranchEmotion -= 10;
    } else if (BRANCH_CLASH[monthBranchName] === mBranchName) {
      baziBranchFortune -= 6;
      baziBranchEmotion -= 6;
    } else if (BRANCH_HARMONY[dayBranchName] === mBranchName) {
      baziBranchFortune += 7;
      baziBranchEmotion += 8;
    } else if (BRANCH_HARMONY[monthBranchName] === mBranchName) {
      baziBranchFortune += 5;
      baziBranchEmotion += 5;
    }

    const terrainVal = TERRAIN_WEIGHT[mTerrain] ?? 0;

    // --- C. Mary K. Greer Personal Year Tarot Card for this month ---
    // If birthday is on day >= 16 of birthMonth, we still treat birthMonth as the transition month
    const sampleDay = m === bMonth ? Math.min(28, bDay) : 15;
    const tarotDateStr = `${targetYear}-${mm}-${String(sampleDay).padStart(2, '0')}`;
    const tarotAtMonth = calculateTarotChart(client.birthDate, tarotDateStr);
    const activeCard = tarotAtMonth.currentYearCard.card;
    const isShadowActive = tarotAtMonth.shadowCards.some(
      (sc) => sc.number === activeCard.number
    );
    const isBirthdaySwitchMonth = m === bMonth;

    // --- D. Final Dual-Axis Coordinates ---
    // Left Y-Axis: Outer Destiny Fortune (0..100)
    const fortuneScore = clamp(
      60 + brightAvg * 1.15 + ziweiMutagenFortune + terrainVal * 1.1 + baziBranchFortune,
      24,
      96
    );

    // Right Y-Axis: Inner Emotional Flow (-50..+50)
    const tarotBase = TAROT_EMOTION_BASE[activeCard.number] ?? 4;
    const tenStarEmotion = TEN_STAR_EMOTION_SHIFT[mTenStar] ?? 0;
    // Gentle seasonal/birthday transition introspection dip right before/during birthday switch
    const transitionNudge = isBirthdaySwitchMonth ? -3 : 0;
    const shadowNudge = isShadowActive ? -6 : 0;
    const mentalMutagenNudge = (luHitMental ? 8 : 0) - (jiHitMental ? 12 : 0);

    const emotionalScore = clamp(
      tarotBase * 0.65 +
        tenStarEmotion +
        mentalStarDelta * 0.85 +
        baziBranchEmotion +
        mentalMutagenNudge +
        shadowNudge +
        transitionNudge,
      -46,
      46
    );

    const normalizedEmotion = emotionalScore + 50;
    const empathyGap = fortuneScore - normalizedEmotion;
    const emotionToneLabel = getEmotionToneLabel(emotionalScore);
    const resonance = classifyResonance(fortuneScore, emotionalScore);

    const { empathyNote, selfCareTip } = buildEmpathyCopy({
      month: m,
      resonanceKind: resonance.kind,
      tarotName: activeCard.name,
      tarotKeyword: activeCard.keywords[0] ?? '內在覺察',
      tenStar: mTenStar,
      mentalPalaceName: mMentalPalace.name,
      isBirthdaySwitch: isBirthdaySwitchMonth,
      jiHitMental,
    });

    points.push({
      month: m,
      monthLabel: `${m}月`,
      baziMonthGanZhi: mCycle.getName(),
      baziMonthTenStar: mTenStar,
      baziMonthTerrain: mTerrain,
      ziweiMonthPalaceName: mMingPalace.name,
      ziweiMentalPalaceName: mMentalPalace.name,
      ziweiMonthMutagenJi: jiStar || '—',
      tarotCardNumber: activeCard.number,
      tarotCardDisplayNumber: activeCard.displayNumber,
      tarotCardName: activeCard.name,
      tarotKeywords: activeCard.keywords,
      isBirthdaySwitchMonth,
      isTargetMonth: m === targetMonth,
      fortuneScore,
      emotionalScore,
      normalizedEmotion,
      empathyGap,
      emotionToneLabel,
      resonanceKind: resonance.kind,
      resonanceLabel: resonance.label,
      empathyNote,
      selfCareTip,
    });
  }

  let highestEmotionMonth = points[0];
  let mostCareNeededMonth = points[0];
  for (const pt of points) {
    if (pt.emotionalScore > highestEmotionMonth.emotionalScore) {
      highestEmotionMonth = pt;
    }
    if (pt.emotionalScore < mostCareNeededMonth.emotionalScore) {
      mostCareNeededMonth = pt;
    }
  }

  const burnoutRiskMonths = points.filter(
    (p) => p.resonanceKind === 'outer_high_inner_low'
  );

  const avgFortune = Math.round(
    points.reduce((acc, p) => acc + p.fortuneScore, 0) / points.length
  );
  const avgEmotion = Math.round(
    points.reduce((acc, p) => acc + p.emotionalScore, 0) / points.length
  );

  return {
    year: targetYear,
    targetMonth,
    birthMonth: bMonth,
    preBirthdayCardName: tarotBeforeBday.currentYearCard.card.name,
    postBirthdayCardName: tarotAfterBday.currentYearCard.card.name,
    points,
    avgFortune,
    avgEmotion,
    highestEmotionMonth,
    mostCareNeededMonth,
    burnoutRiskMonths,
  };
}
