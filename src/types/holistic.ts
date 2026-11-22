export type GenderType = '男' | '女';

export type HoroscopeScope = 'origin' | 'decadal' | 'yearly' | 'monthly' | 'daily';

export type ActiveTab = 'overview' | 'ziwei' | 'bazi' | 'tarot' | 'ai';

export interface ClientProfile {
  id: string;
  name: string;
  gender: GenderType;
  birthDate: string; // YYYY-MM-DD (Solar)
  birthTime: string; // HH:mm (24h)
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ClientInput = Omit<ClientProfile, 'id' | 'createdAt' | 'updatedAt'>;

// ---------- Mary K. Greer Tarot Types ----------

export interface TarotArcanaInfo {
  number: number; // 0..21 (22 maps to 0/22 愚者)
  displayNumber: string; // "0 / 22", "1", ..., "21"
  name: string; // Traditional Chinese name
  englishName: string;
  roman: string;
  constellationId: number; // 1..9
  keywords: string[];
  essence: string;
  lightSide: string;
  shadowSide: string;
  growthLesson: string;
}

export interface TarotConstellation {
  id: number; // 1..9
  name: string;
  title: string;
  theme: string;
  memberNumbers: number[]; // e.g., [1, 10, 19] or [4, 13, 22]
}

export interface TarotYearEntry {
  cycleYear: number;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  card: TarotArcanaInfo;
  rawNumber: number; // 1..22
  rootCard: TarotArcanaInfo | null; // auxiliary single-digit card when rawNumber is 10..22
  isCurrent: boolean;
}

export interface TarotChartResult {
  birthSum: number;
  birthSumFormula: string;
  personalityRawNumber: number; // 1..22
  personalityCard: TarotArcanaInfo;
  soulCard: TarotArcanaInfo;
  isSamePersonalitySoul: boolean;
  isSpecialCase19: boolean;
  specialTrioCards: TarotArcanaInfo[]; // [19, 10, 1] when special case 19
  constellation: TarotConstellation;
  shadowCards: TarotArcanaInfo[];
  currentYearCard: TarotYearEntry;
  nextSwitchDate: string; // YYYY-MM-DD
  yearTrajectory: TarotYearEntry[]; // 5-year span around current cycleYear
}

// ---------- Bazi (tyme4ts) Types ----------

export type FiveElement = '木' | '火' | '土' | '金' | '水';

export interface BaziHiddenStem {
  stem: string;
  element: FiveElement;
  tenStar: string;
  typeLabel: '本氣' | '中氣' | '餘氣';
}

export interface BaziShenShaItem {
  name: string;
  category: 'auspicious' | 'neutral' | 'caution'; // 吉神 / 中性 / 警示煞
  description: string;
}

export interface BaziPillar {
  label: '時柱' | '日柱' | '月柱' | '年柱';
  stem: string;
  branch: string;
  stemElement: FiveElement;
  branchElement: FiveElement;
  stemYinYang: '陽' | '陰';
  tenStar: string; // "日主" for Day pillar
  hiddenStems: BaziHiddenStem[];
  terrain: string; // 十二長生星運（tyme4ts getTerrain）
  sound: string; // 納音
  kongWang: string; // 空亡 e.g. "申酉"
  shenSha: BaziShenShaItem[];
  isDayMaster?: boolean;
}

export interface BaziFlowPillar {
  label: '大運' | '流年' | '流月' | '流日';
  subLabel: string;
  ganZhi: string;
  stem: string;
  branch: string;
  stemElement: FiveElement;
  branchElement: FiveElement;
  stemYinYang: '陽' | '陰';
  tenStar: string;
  hiddenStems: BaziHiddenStem[];
  terrain: string;
  sound: string;
  kongWang: string;
  shenSha: BaziShenShaItem[];
}

export interface BaziYearlyFortune {
  year: number;
  age: number;
  ganZhi: string;
  stem: string;
  branch: string;
  tenStar: string;
  sound: string;
}

export interface BaziDecadeFortune {
  index: number;
  ganZhi: string;
  stem: string;
  branch: string;
  tenStar: string;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  sound: string;
  yearlyFortunes: BaziYearlyFortune[];
}

export interface BaziTargetFlow {
  yearGanZhi: string;
  yearTenStar: string;
  monthGanZhi: string;
  monthTenStar: string;
  dayGanZhi: string;
  dayTenStar: string;
  activeDecade: BaziDecadeFortune | null;
  decadePillar: BaziFlowPillar | null;
  yearPillar: BaziFlowPillar;
  monthPillar: BaziFlowPillar;
  dayPillar: BaziFlowPillar;
}

export interface BaziChartResult {
  pillars: BaziPillar[]; // Ordered: 時柱, 日柱, 月柱, 年柱
  dayMaster: {
    stem: string;
    element: FiveElement;
    yinYang: '陽' | '陰';
  };
  dayKongWang: string;
  elementCounts: Record<FiveElement, number>;
  startAgeDescription: string;
  isForward: boolean;
  decadeFortunes: BaziDecadeFortune[];
  targetFlow: BaziTargetFlow;
}

// ---------- Ziwei (iztro) Types ----------

export interface ZiweiStarItem {
  name: string;
  type: string;
  brightness?: string;
  mutagen?: string; // 本命 祿/權/科/忌
}

export interface ZiweiScopeMutagenBadge {
  scope: HoroscopeScope;
  scopeLabel: string;
  starName: string;
  mutagen: '祿' | '權' | '科' | '忌';
}

export interface ZiweiPalaceData {
  index: number; // 0=寅 .. 11=丑
  name: string; // 本命宮名
  isBodyPalace: boolean;
  isOriginalPalace: boolean;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: ZiweiStarItem[];
  minorStars: ZiweiStarItem[];
  adjectiveStars: ZiweiStarItem[];
  changsheng12: string;
  boshi12: string;
  decadalRange: [number, number];
  ages: number[];
  // Overlaid horoscope palace names for targetDate
  decadalPalaceName: string;
  yearlyPalaceName: string;
  monthlyPalaceName: string;
  dailyPalaceName: string;
  // Overlaid horoscope stars
  decadalStars: string[];
  yearlyStars: string[];
  monthlyStars: string[];
  dailyStars: string[];
}

export interface ZiweiMutagenRow {
  scope: HoroscopeScope;
  label: string;
  ganZhi: string;
  lu: string;
  quan: string;
  ke: string;
  ji: string;
}

export interface ZiweiChartResult {
  solarDate: string;
  lunarDate: string;
  chineseDate: string;
  time: string;
  timeRange: string;
  zodiac: string;
  sign: string;
  fiveElementsClass: string;
  soulLord: string; // 命主
  bodyLord: string; // 身主
  mingPalaceIndex: number;
  bodyPalaceIndex: number;
  palaces: ZiweiPalaceData[]; // index 0..11
  mutagenTable: ZiweiMutagenRow[];
  targetLunarDate: string;
  activeDecadalInfo: {
    index: number;
    ganZhi: string;
    range: [number, number];
    mingPalaceBranch: string;
  };
  activeYearlyInfo: {
    index: number;
    ganZhi: string;
    mingPalaceBranch: string;
  };
  activeMonthlyInfo: {
    index: number;
    ganZhi: string;
    mingPalaceBranch: string;
  };
  activeDailyInfo: {
    index: number;
    ganZhi: string;
    mingPalaceBranch: string;
  };
}

// ---------- Unified AI Payload & Reading Types ----------

export interface HolisticChartSummaryPayload {
  client: {
    name: string;
    gender: GenderType;
    solarBirthDate: string;
    birthTime: string;
    lunarBirthDate: string;
  };
  targetContext: {
    targetDate: string;
    activeScope: HoroscopeScope;
    activeScopeLabel: string;
  };
  ziwei: {
    fiveElementsClass: string;
    soulLord: string;
    bodyLord: string;
    mingPalace: {
      ganZhi: string;
      majorStars: string[];
      minorStars: string[];
      sanFangSiZhengSummary: string[];
    };
    bodyPalace: {
      name: string;
      ganZhi: string;
      majorStars: string[];
    };
    keyPalaces: Array<{
      name: string;
      ganZhi: string;
      majorStars: string[];
      mutagens: string[];
    }>;
    mutagenTable: ZiweiMutagenRow[];
    currentDecadal: string;
    currentYearly: string;
    currentMonthly: string;
    currentDaily: string;
  };
  bazi: {
    fourPillars: string;
    dayMaster: string;
    dayKongWang: string;
    elementCounts: Record<FiveElement, number>;
    pillarDetails: Array<{
      label: string;
      ganZhi: string;
      tenStar: string;
      hiddenStems: string[];
      terrain: string;
      sound: string;
      shenSha: string[];
    }>;
    currentDecade: string;
    currentFlow: {
      year: string;
      month: string;
      day: string;
    };
  };
  tarot: {
    constellation: string;
    constellationTheme: string;
    personalityCard: string;
    soulCard: string;
    isSpecialCase19: boolean;
    shadowCards: string[];
    currentYearCard: string;
    currentYearRootCard: string | null;
    yearCyclePeriod: string;
    nextSwitchDate: string;
  };
}

export type TrafficLightColor = 'green' | 'yellow' | 'red';

export interface DomainFortuneIndicator {
  domain: '事業' | '財運' | '感情' | '健康';
  light: TrafficLightColor;
  statusLabel: string; // e.g., "順勢推進", "審慎佈局", "保守避險"
  summary: string;
}

export interface AIStage1Summary {
  lifeMapOverview: {
    headline: string;
    summary: string;
    coreThemes: string[];
  };
  currentFortuneAndPsyche: {
    headline: string;
    summary: string;
    indicators: DomainFortuneIndicator[];
  };
  blindSpotsAndHiddenResources: {
    headline: string;
    blindSpots: string;
    hiddenResources: string;
  };
  actionAndAwareness: {
    headline: string;
    externalAction: string; // 外部趨吉避凶行動（造命）
    internalAwareness: string; // 內在心理轉念（覺察）
  };
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  topicTag?: string;
  timestamp: string;
}

// ---------- 10-Year Holistic Fortune Trend (D3 Visualization) ----------

export type TurningPointKind = 'decade_shift' | 'peak' | 'trough' | 'pivot';

export interface TenYearTurningPoint {
  kind: TurningPointKind;
  label: string; // e.g., "大運換軌", "十年高峰", "築底重整", "關鍵轉折"
  shortTag: string; // concise chart callout e.g. "換大運", "高峰", "築底", "轉折"
  reason: string; // concrete 3-system rationale
  priority: number; // higher = more important for callout placement
}

export interface TenYearTrendPoint {
  year: number;
  age: number; // nominal age (虛歲 / 實歲參考)
  ganZhi: string; // 流年干支 from tyme4ts
  compositeScore: number; // 0..100 holistic momentum index
  ziweiScore: number; // 0..100
  baziScore: number; // 0..100
  tarotScore: number; // 0..100
  deltaFromPrev: number | null;
  // 3-system factual anchors
  ziweiDecadalRange: [number, number];
  ziweiDecadalGanZhi: string;
  ziweiYearlyPalaceName: string;
  ziweiYearlyMajorStars: string[];
  ziweiYearlyMutagenSummary: string;
  ziweiDecadalChanged: boolean;
  baziDecadeGanZhi: string | null;
  baziDecadeChanged: boolean;
  baziYearTenStar: string;
  baziYearTerrain: string;
  baziBranchRelation: string | null; // e.g. "沖日支", "合日支", "沖年支"
  baziAuspiciousStars: string[];
  baziCautionStars: string[];
  tarotYearCardName: string;
  tarotYearCardDisplayNumber: string;
  tarotYearCardNumber: number;
  tarotRootCardName: string | null;
  tarotConstellationResonance: boolean;
  tarotShadowActivated: boolean;
  turningPoint: TenYearTurningPoint | null;
  highlightSummary: string;
}

export interface TenYearTrendResult {
  startYear: number;
  endYear: number;
  points: TenYearTrendPoint[];
  turningPoints: TenYearTrendPoint[];
  averageScore: number;
  peakPoint: TenYearTrendPoint;
  troughPoint: TenYearTrendPoint;
}

// ---------- AI Cross-System Synthesis (Ziwei × Bazi) ----------

export type CrossSystemHarmonyLevel =
  | 'high_synergy'
  | 'dynamic_balance'
  | 'creative_tension';

export interface CrossSystemFinding {
  type: 'conflict' | 'complement';
  domain: string;
  title: string;
  ziweiEvidence: string;
  baziEvidence: string;
  synthesis: string;
  advice: string;
}

export interface CrossSystemRecommendation {
  focus: string;
  action: string;
  timingNote: string;
}

export interface AICrossSystemAnalysis {
  overallVerdict: {
    headline: string;
    harmonyLevel: CrossSystemHarmonyLevel;
    harmonyLabel: string;
    summary: string;
  };
  ziweiPatternAnchor: {
    patternTitle: string;
    coreTraits: string;
  };
  baziBalanceAnchor: {
    balanceTitle: string;
    elementProfile: string;
  };
  findings: CrossSystemFinding[];
  integratedRecommendations: CrossSystemRecommendation[];
}

// ---------- Dual-Axis Emotional Flow × Fortune Trajectory (D3) ----------

export type EmotionalResonanceKind =
  | 'aligned_high'
  | 'outer_high_inner_low'
  | 'outer_low_inner_calm'
  | 'both_gentle'
  | 'steady_flow';

export interface MonthlyEmotionalFlowPoint {
  month: number; // 1..12
  monthLabel: string; // "1月" .. "12月"
  baziMonthGanZhi: string;
  baziMonthTenStar: string;
  baziMonthTerrain: string;
  ziweiMonthPalaceName: string;
  ziweiMentalPalaceName: string; // 流月福德宮落點
  ziweiMonthMutagenJi: string; // 流月化忌星
  tarotCardNumber: number;
  tarotCardDisplayNumber: string;
  tarotCardName: string;
  tarotKeywords: string[];
  isBirthdaySwitchMonth: boolean;
  isTargetMonth: boolean;
  fortuneScore: number; // Left Y-axis: 0..100 外在命理運程
  emotionalScore: number; // Right Y-axis: -50..+50 內在情緒心流
  normalizedEmotion: number; // 0..100 mapped equivalent for gap comparison
  empathyGap: number; // fortuneScore - normalizedEmotion (positive => 外順內耗)
  emotionToneLabel: string; // e.g., "澄明敞開", "溫潤平衡", "深潛內觀", "敏感緊繃"
  resonanceKind: EmotionalResonanceKind;
  resonanceLabel: string;
  empathyNote: string;
  selfCareTip: string;
}

export interface EmotionalFlowResult {
  year: number;
  targetMonth: number;
  birthMonth: number;
  preBirthdayCardName: string;
  postBirthdayCardName: string;
  points: MonthlyEmotionalFlowPoint[];
  avgFortune: number;
  avgEmotion: number;
  highestEmotionMonth: MonthlyEmotionalFlowPoint;
  mostCareNeededMonth: MonthlyEmotionalFlowPoint;
  burnoutRiskMonths: MonthlyEmotionalFlowPoint[];
}

// ---------- Upcoming 3-Month Solar Terms & Fortune Volatility Alerts ----------

export type UpcomingAlertKind =
  | 'milestone'
  | 'opportunity'
  | 'caution'
  | 'balance';

export interface UpcomingAlertItem {
  id: string;
  date: string; // YYYY-MM-DD
  exactTime?: string; // e.g., "15:23" from tyme4ts astronomical solar term time
  daysFromBase: number; // 0 = today/baseDate, >0 = upcoming days
  countdownLabel: string; // "今日交節" / "3 天後"
  title: string; // e.g., "大雪節令・換入庚子月" / "立春換歲・進入丁未流年" / "塔羅生日換牌"
  categoryLabel: string; // "節令換月" | "二至二分" | "換歲節點" | "塔羅轉頻"
  kind: UpcomingAlertKind;
  signalLabel: string; // "格局換頻" | "順勢進取" | "波動警示" | "平穩蓄能"
  ganZhiTag: string; // e.g., "庚子月 · 正印・胎"
  ziweiNote: string; // e.g., "流月命宮落遷移・化祿天機"
  summary: string; // concise volatility explanation
  actionTip: string; // concrete 1-line preparation advice
  recommendedScope: HoroscopeScope;
}

export interface UpcomingAlertsResult {
  baseDate: string;
  endDate: string;
  annualContextTitle: string;
  annualContextNote: string;
  items: UpcomingAlertItem[];
  cautionCount: number;
  opportunityCount: number;
  milestoneCount: number;
}




