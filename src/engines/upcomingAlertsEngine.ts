import { astro } from 'iztro';
import { SolarDay, SolarTime } from 'tyme4ts';
import {
  ClientProfile,
  UpcomingAlertItem,
  UpcomingAlertKind,
  UpcomingAlertsResult,
} from '../types/holistic';
import { calculateTarotChart } from './tarotEngine';
import { calculateTenYearTrend } from './tenYearTrendEngine';

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

const S2T_CHAR_MAP: Record<string, string> = {
  惊: '驚',
  蛰: '蟄',
  谷: '穀',
  满: '滿',
  种: '種',
  处: '處',
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
    .map((ch) => S2T_CHAR_MAP[ch] ?? ch)
    .join('');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatYMD(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function parseLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function diffDays(baseYmd: string, targetYmd: string): number {
  const a = parseLocalDate(baseYmd);
  const b = parseLocalDate(targetYmd);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDaysYMD(baseYmd: string, days: number): string {
  const dt = parseLocalDate(baseYmd);
  dt.setDate(dt.getDate() + days);
  return formatYMD(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

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

const MAJOR_EQUINOX_SOLSTICE = new Set(['春分', '夏至', '秋分', '冬至']);

const SIGNAL_LABEL: Record<UpcomingAlertKind, string> = {
  milestone: '格局換頻',
  opportunity: '順勢進取',
  caution: '波動警示',
  balance: '平穩蓄能',
};

function formatCountdown(days: number): string {
  if (days <= 0) return '今日交節';
  if (days === 1) return '明日';
  return `${days} 天後`;
}

/**
 * Compute upcoming 3-month (~92 days) Solar Terms & Fortune Volatility Notifications
 * strictly backed by tyme4ts 24 Solar Terms, iztro horoscopes, and Mary K. Greer Tarot cycles.
 */
export function calculateUpcomingAlerts(
  client: ClientProfile,
  baseTargetDate: string
): UpcomingAlertsResult {
  ensureZiweiConfig();

  const windowDays = 92;
  const endDate = addDaysYMD(baseTargetDate, windowDays);

  const [bYear, bMonth, bDay] = client.birthDate.split('-').map(Number);
  const [bHour, bMinute] = client.birthTime.split(':').map(Number);
  const [baseY, baseM, baseD] = baseTargetDate.split('-').map(Number);

  // 1. Annual turning-point backdrop from 10-year trend engine
  const tenYear = calculateTenYearTrend(client, baseTargetDate);
  const currentYearPt = tenYear.points[0];
  const nextYearPt = tenYear.points[1];
  const annualContextTitle = currentYearPt.turningPoint
    ? `${currentYearPt.year} ${currentYearPt.ganZhi}年・${currentYearPt.turningPoint.label}`
    : `${currentYearPt.year} ${currentYearPt.ganZhi}年・流年動能 ${currentYearPt.compositeScore} 分`;

  const annualContextNote = currentYearPt.turningPoint
    ? `${currentYearPt.turningPoint.reason}`
    : nextYearPt?.turningPoint
      ? `本年運勢維持平穩（${currentYearPt.compositeScore}分），且明年 ${nextYearPt.year}（${nextYearPt.ganZhi}）將迎來「${nextYearPt.turningPoint.label}」，未來三個月正是提前佈局的銜接窗口。`
      : `本年流年命宮落「${currentYearPt.ziweiYearlyPalaceName}」、塔羅流年「${currentYearPt.tarotYearCardName}」，以下整理未來三個月內由節氣交接與運勢切換引發的關鍵波動期。`;

  // 2. Build Ziwei astrolabe once
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

  // 3. Build Bazi natal context once via tyme4ts
  const birthSolar = SolarTime.fromYmdHms(bYear, bMonth, bDay, bHour, bMinute, 0);
  const natalEight = birthSolar.getLunarHour().getEightChar();
  const dayStem = natalEight.getDay().getHeavenStem();
  const dayStemName = dayStem.getName();
  const dayBranchName = natalEight.getDay().getEarthBranch().getName();
  const yearStemName = natalEight.getYear().getHeavenStem().getName();
  const yearBranchName = natalEight.getYear().getEarthBranch().getName();
  const monthBranchName = natalEight.getMonth().getEarthBranch().getName();
  const dayKongWang = natalEight
    .getDay()
    .getExtraEarthBranches()
    .map((b) => b.getName())
    .join('');

  const items: UpcomingAlertItem[] = [];

  // 4. Enumerate real astronomical 24 Solar Terms within [baseTargetDate, baseTargetDate + 92d] via tyme4ts
  const startSolarDay = SolarDay.fromYmd(baseY, baseM, baseD);
  const anchorTerm = startSolarDay.getTerm();

  for (let offset = 0; offset <= 8; offset++) {
    const term = anchorTerm.next(offset);
    const termSolarDay = term.getSolarDay();
    const termDate = formatYMD(
      termSolarDay.getYear(),
      termSolarDay.getMonth(),
      termSolarDay.getDay()
    );
    const delta = diffDays(baseTargetDate, termDate);
    if (delta < 0 || delta > windowDays) continue;

    const termName = toTrad(term.getName());
    const exactSolarTime = term.getJulianDay().getSolarTime();
    const exactTime = `${pad2(exactSolarTime.getHour())}:${pad2(
      exactSolarTime.getMinute()
    )}`;
    const isJie = term.isJie();
    const isMajorQi = !isJie && MAJOR_EQUINOX_SOLSTICE.has(termName);

    // Include all 12 Jie (節令 — monthly pillar shifts) and 4 major Qi (春分/夏至/秋分/冬至)
    if (!isJie && !isMajorQi) continue;

    // Sample the day AFTER the exact solar term transition so Bazi month/year reflects the newly entered phase
    const afterDate = addDaysYMD(termDate, 1);
    const [ay, am, ad] = afterDate.split('-').map(Number);
    const afterSolarTime = SolarTime.fromYmdHms(ay, am, ad, 12, 0, 0);
    const afterEight = afterSolarTime.getLunarHour().getEightChar();
    const mCycle = afterEight.getMonth();
    const yCycle = afterEight.getYear();
    const mStem = mCycle.getHeavenStem();
    const mBranch = mCycle.getEarthBranch();
    const mBranchName = mBranch.getName();
    const mGanZhi = mCycle.getName();
    const mTenStar = toTrad(dayStem.getTenStar(mStem).getName());
    const mTerrain = toTrad(dayStem.getTerrain(mBranch).getName());

    // Ziwei monthly horoscope on newly entered phase
    const horo = astrolabe.horoscope(afterDate);
    const mMingIdx = horo.monthly.index;
    const mMingPalace = astrolabe.palaces[mMingIdx];
    const mSanFang = new Set([
      mMingIdx,
      (mMingIdx + 6) % 12,
      (mMingIdx + 4) % 12,
      (mMingIdx + 8) % 12,
    ]);
    const [luStar, quanStar, , jiStar] = horo.monthly.mutagen;
    const luHit = luStar ? mSanFang.has(starPalaceIdx.get(luStar) ?? -1) : false;
    const quanHit = quanStar ? mSanFang.has(starPalaceIdx.get(quanStar) ?? -1) : false;
    const jiHit = jiStar ? mSanFang.has(starPalaceIdx.get(jiStar) ?? -1) : false;

    const isLiChun = termName === '立春';
    const clashDay = BRANCH_CLASH[dayBranchName] === mBranchName;
    const clashYear = BRANCH_CLASH[yearBranchName] === mBranchName;
    const clashMonth = BRANCH_CLASH[monthBranchName] === mBranchName;
    const harmonyDay = BRANCH_HARMONY[dayBranchName] === mBranchName;
    const harmonyMonth = BRANCH_HARMONY[monthBranchName] === mBranchName;
    const hasTianYi =
      TIAN_YI[dayStemName]?.includes(mBranchName) ||
      TIAN_YI[yearStemName]?.includes(mBranchName);
    const hasLuShen = LU_SHEN[dayStemName] === mBranchName;
    const hasYangRen = YANG_REN[dayStemName] === mBranchName;
    const hasKongWang = dayKongWang.includes(mBranchName);

    let kind: UpcomingAlertKind = 'balance';
    let categoryLabel = isJie ? '節令換月' : '二至二分';
    let title = isJie
      ? `${termName}交節・換入${mGanZhi}月`
      : `${termName}轉氣・陰陽能量節點`;

    const signalReasons: string[] = [];
    let actionTip = '維持穩健節奏，適合檢視月度計畫並微調執行優先級。';

    if (isLiChun) {
      kind = 'milestone';
      categoryLabel = '立春換歲';
      title = `立春交歲・正式進入「${yCycle.getName()}」流年`;
      signalReasons.push(
        `八字年柱由舊歲切換為「${yCycle.getName()}」，月令同步換入「${mGanZhi}」（${mTenStar}・${mTerrain}）`
      );
      if (clashDay || clashYear) {
        signalReasons.push('交歲初期地支逢沖，環境或職責易有明顯變動');
      } else if (hasTianYi || harmonyDay) {
        signalReasons.push('交歲即見貴人或六合氣場，利於啟動年度新目標');
      }
      actionTip =
        '建議於立春前後三天定調年度三大目標，完成舊年未竟收尾並展開新年度資源配置。';
    } else if (isMajorQi) {
      kind = clashDay || jiHit ? 'caution' : 'milestone';
      signalReasons.push(
        `${termName}為年度陰陽消長樞紐，當下月令「${mGanZhi}」（${mTenStar}）與流月命宮「${mMingPalace.name}」氣場共振`
      );
      if (jiHit && jiStar) {
        signalReasons.push(`流月化忌「${jiStar}」牽動三方四正，情緒與決策宜放慢`);
      }
      actionTip =
        '二至二分前後體感與思緒較敏銳，宜減少臨時高壓決策，保留半天作息修復與回顧。';
    } else {
      // Standard Jie (節令月柱切換)
      const positiveSignals: string[] = [];
      const cautionSignals: string[] = [];

      if (harmonyDay) positiveSignals.push('月支六合日支');
      if (harmonyMonth) positiveSignals.push('月支六合月令');
      if (hasTianYi) positiveSignals.push('天乙貴人臨月');
      if (hasLuShen) positiveSignals.push('祿神入旺');
      if (luHit && luStar) positiveSignals.push(`紫微流月「${luStar}化祿」照命`);
      if (quanHit && quanStar) positiveSignals.push(`「${quanStar}化權」助推`);
      if (mTerrain === '帝旺' || mTerrain === '臨官' || mTerrain === '長生') {
        positiveSignals.push(`星運入「${mTerrain}」`);
      }

      if (clashDay) cautionSignals.push('月支沖日支（感情／合作防摩擦）');
      if (clashMonth) cautionSignals.push('月支沖提綱（事業節奏波動）');
      if (clashYear) cautionSignals.push('月支沖年支');
      if (jiHit && jiStar) cautionSignals.push(`紫微流月「${jiStar}化忌」衝照三方`);
      if (hasYangRen) cautionSignals.push('見羊刃（防急躁硬碰硬）');
      if (hasKongWang) cautionSignals.push('月令落旬空');

      if (cautionSignals.length >= 2 || (clashDay && jiHit)) {
        kind = 'caution';
        signalReasons.push(cautionSignals.slice(0, 3).join('、'));
        actionTip =
          '交節後兩週內重要簽約、大額開支與高敏對話宜先留緩衝期，多做二次確認以穩為上。';
      } else if (positiveSignals.length >= 2 && cautionSignals.length === 0) {
        kind = 'opportunity';
        signalReasons.push(positiveSignals.slice(0, 3).join('、'));
        actionTip =
          '本月能量順暢且貴人助力顯著，適合主動提案、拓展合作、洽談升遷或推進卡關項目。';
      } else if (cautionSignals.length === 1 && positiveSignals.length >= 1) {
        kind = 'caution';
        signalReasons.push(
          `機遇與張力並存：${positiveSignals[0]}，同時留意${cautionSignals[0]}`
        );
        actionTip =
          '善用月令助力推進核心業務，但在人際溝通與時間分配上保持界線，避免貪多失衡。';
      } else if (positiveSignals.length === 1) {
        kind = 'opportunity';
        signalReasons.push(positiveSignals[0]);
        actionTip =
          '可順勢安排關鍵會面或專業發表，將前期累積的成果具象化呈現。';
      } else if (cautionSignals.length === 1) {
        kind = 'caution';
        signalReasons.push(cautionSignals[0]);
        actionTip =
          '節奏宜守不宜躁進，適度精簡支線任務、優先穩住現金流與身心作息。';
      } else {
        kind = 'balance';
        signalReasons.push(
          `月令換入「${mTenStar}・${mTerrain}」，流月命宮落本命「${mMingPalace.name}」，整體節律平和`
        );
        actionTip = '適合按部就班深耕既有軌道、優化流程與儲備下一階段能量。';
      }
    }

    items.push({
      id: `term-${termDate}-${termName}`,
      date: termDate,
      exactTime,
      daysFromBase: delta,
      countdownLabel: formatCountdown(delta),
      title,
      categoryLabel,
      kind,
      signalLabel: SIGNAL_LABEL[kind],
      ganZhiTag: `${mGanZhi}月 · ${mTenStar}・${mTerrain}`,
      ziweiNote: `流月命宮「${mMingPalace.name}」${
        luHit && luStar
          ? ` · 祿照(${luStar})`
          : jiHit && jiStar
            ? ` · 忌衝(${jiStar})`
            : ` · 四化忌${jiStar || '—'}`
      }`,
      summary: `${signalReasons.join('；')}。`,
      actionTip,
      recommendedScope: isLiChun ? 'yearly' : 'monthly',
    });
  }

  // 5. Check Mary K. Greer Tarot Personal Year Birthday Switch within the next 92 days
  const tarotNow = calculateTarotChart(client.birthDate, baseTargetDate);
  const nextSwitchDelta = diffDays(baseTargetDate, tarotNow.nextSwitchDate);
  if (nextSwitchDelta >= 0 && nextSwitchDelta <= windowDays) {
    const tarotAfterSwitch = calculateTarotChart(
      client.birthDate,
      tarotNow.nextSwitchDate
    );
    const prevCard = tarotNow.currentYearCard.card;
    const nextCard = tarotAfterSwitch.currentYearCard.card;
    items.push({
      id: `tarot-switch-${tarotNow.nextSwitchDate}`,
      date: tarotNow.nextSwitchDate,
      daysFromBase: nextSwitchDelta,
      countdownLabel:
        nextSwitchDelta === 0 ? '今日換牌' : `${nextSwitchDelta} 天後`,
      title: `生日塔羅換牌：「${prevCard.name}」→「${nextCard.name}」`,
      categoryLabel: '塔羅轉頻',
      kind: 'milestone',
      signalLabel: '原型切換',
      ganZhiTag: `No.${nextCard.displayNumber} ${nextCard.name}`,
      ziweiNote: `新年度核心關鍵詞：${nextCard.keywords.slice(0, 3).join('・')}`,
      summary: `國曆生日起正式結束「${prevCard.name}」流年週期，開啟為期一年的「${nextCard.name}」（${nextCard.englishName}）心理成長主題：${nextCard.essence}`,
      actionTip: nextCard.growthLesson,
      recommendedScope: 'yearly',
    });
  }

  // Sort chronologically
  items.sort((a, b) => a.daysFromBase - b.daysFromBase);

  return {
    baseDate: baseTargetDate,
    endDate,
    annualContextTitle,
    annualContextNote,
    items,
    cautionCount: items.filter((i) => i.kind === 'caution').length,
    opportunityCount: items.filter((i) => i.kind === 'opportunity').length,
    milestoneCount: items.filter((i) => i.kind === 'milestone').length,
  };
}
