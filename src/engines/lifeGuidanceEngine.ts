import {
  BaziChartResult,
  BaziDecadeFortune,
  ClientProfile,
  TarotChartResult,
  ZiweiChartResult,
  ZiweiPalaceData,
} from '../types/holistic';

// ============================================================================
// Purely Factual Life Guidance Engine (Zero Fabricated Scores, Zero AI Calls)
// Grounds every guidance signal in real Ziwei 4-Mutagens, Ziwei 6-Axis Palaces,
// Bazi 10-Year Decade Transitions, Bazi 4-Pillar Clash/Harmony, and Tarot Cycle.
// ============================================================================

export type StagePhaseKind = 'opening' | 'deepening' | 'transition' | 'childhood';

export interface StageNodeSummary {
  label: string; // e.g., "上一段十年" | "當前十年" | "下一段十年"
  ageRange: string; // e.g., "24–33 歲"
  yearRange: string; // e.g., "2018–2027"
  startYear: number | null;
  plainTheme: string;
  technicalLabel: string;
}

export interface LifeStagePosition {
  targetYear: number;
  actualAge: number;
  nominalAge: number;
  phaseKind: StagePhaseKind;
  phaseLabel: string;
  decadeTitle: string;
  yearInDecade: number; // 1..10
  yearsRemaining: number; // 0..9
  nextShiftYear: number | null;
  nextShiftAge: number | null;
  stageHeadline: string;
  stageGuidance: string;
  confusionReframe: string; // Directly addresses why someone in this phase might feel lost
  technicalProof: string;
  prevStage: StageNodeSummary | null;
  currentStage: StageNodeSummary;
  nextStage: StageNodeSummary | null;
}

export type TriggerRole = 'tailwind' | 'buffer' | 'arena' | 'stoploss';

export interface EnergyTriggerItem {
  id: string;
  role: TriggerRole;
  domainLabel: string; // Plain-language domain
  headline: string;
  guidance: string;
  sourceSystem: 'ziwei' | 'bazi';
  technicalProof: string; // Shown in consultant mode only
}

export interface LifeCircleTrigger {
  pillarLabel: '年柱' | '月柱' | '日柱' | '時柱';
  circlePlain: string; // e.g., "原生家庭與大環境"
  ganZhi: string;
  relation: 'harmony' | 'clash' | 'repeat' | 'calm';
  relationPlain: string; // e.g., "合作連結" | "變動磨合" | "節奏平穩"
  technicalNote: string;
  guidance: string;
}

export interface LifeGuidanceResult {
  stagePosition: LifeStagePosition;
  tailwinds: EnergyTriggerItem[]; // 有風的地方（祿 / 科 / 合）
  arenas: EnergyTriggerItem[]; // 該扛的主戰場（權 / 流年命宮 / 十神主軸）
  stoplosses: EnergyTriggerItem[]; // 容易白耗的止損區（忌 / 忌沖對宮 / 沖）
  lifeCircles: LifeCircleTrigger[];
}

// ============================================================================
// Classical Lookup Tables (100% Deterministic)
// ============================================================================

const PALACE_PLAIN: Record<
  string,
  {
    short: string;
    tailwindAction: string;
    bufferAction: string;
    arenaAction: string;
    stoplossAction: string;
    decadeFocus: string;
  }
> = {
  命: {
    short: '自我定位與個人表現',
    tailwindAction: '個人能見度與自我狀態都在順風位，適合主動爭取舞台、展現實力。',
    bufferAction: '個人口碑與氣質加分，遇事保持冷靜與專業就能自然服人。',
    arenaAction: '必須自己拍板拿主意，不能再把方向盤交給別人決定。',
    stoplossAction: '容易過度自我懷疑或鑽牛角尖，先減少內耗性自責，用小步驟驗證想法。',
    decadeFocus: '建立個人主體性與核心代表作',
  },
  兄弟: {
    short: '現金儲備與近身盟友',
    tailwindAction: '周轉彈性與平輩協作順暢，善用身邊可信任的夥伴與備用資金。',
    bufferAction: '同溫層或熟人圈能提供實用建議與緩衝，遇到卡點可找平輩商量。',
    arenaAction: '需要主動整合核心小團隊並管好日常現金流，界定清楚分工。',
    stoplossAction: '避免與熟人或平輩有模糊金錢往來，也要防範無計畫的零碎開銷。',
    decadeFocus: '打穩現金底盤與精選核心盟友',
  },
  夫妻: {
    short: '感情關係與關鍵合作',
    tailwindAction: '感情互動與一對一深度合作有正向進展，適合談長期共識。',
    bufferAction: '關係裡適合用理性溝通化解誤會，彼此給空間反而更穩。',
    arenaAction: '關係或合夥進入重新談規則的階段，別避談核心期待，把條件說清楚。',
    stoplossAction: '感情與合作最容易出現期待落差或反覆拉扯，先降控制欲，別用情緒逼對方表態。',
    decadeFocus: '重塑親密關係與長期合作模式',
  },
  子女: {
    short: '新專案與創意產出',
    tailwindAction: '副業、新點子或專案孵化容易得到好評，適合小步快跑試水溫。',
    bufferAction: '透過教學、分享或作品輸出，能累積意想不到的好感與名聲。',
    arenaAction: '把想法真正做出成品並落地交付，而不是停留在構思階段。',
    stoplossAction: '避免同時開太多新坑分散精力，也別在沒驗證前就投入過重成本。',
    decadeFocus: '孵化新專案與放大個人產出',
  },
  財帛: {
    short: '收入變現與資源定價',
    tailwindAction: '實質收入與商業回報有順風，適合談加薪、調價或把專長直接變現。',
    bufferAction: '財務節奏偏穩健，靠專業信譽與穩定交付就能維持良好進帳。',
    arenaAction: '主動掌控收支結構與定價權，別再靠純苦工換低毛利回報。',
    stoplossAction: '對錢的焦慮感偏高，容易因急著翻身而誤判風險；今年財務以守成、控現金流為先。',
    decadeFocus: '重組收入結構與提升專業定價',
  },
  疾厄: {
    short: '身心負荷與日常節律',
    tailwindAction: '體力恢復快、工作底氣足，適合把穩定的運動與作息建立起來。',
    bufferAction: '留意身體釋放的小訊號並提早調整，就能避開累積性的過勞。',
    arenaAction: '把體能管理當成工作績效的一部分，強制排定休息與健檢，別硬撐。',
    stoplossAction: '最容易用健康換進度、或因緊繃導致睡眠與免疫下滑；身體亮黃燈時必須立刻減載。',
    decadeFocus: '調整生活節律與建立長期續航力',
  },
  遷移: {
    short: '外部機會與跨界破圈',
    tailwindAction: '機會在原本舒適圈之外——跨部門、外地市場或陌生合作更容易帶來突破。',
    bufferAction: '在外表現與第一印象佳，適合公開曝光、拓展新圈層。',
    arenaAction: '主動走出去爭取外部資源與新戰場，停在原地只會越待越悶。',
    stoplossAction: '外出變動、環境轉換或陌生合作容易節外生枝，重大搬遷或跳槽前務必做好備案。',
    decadeFocus: '跳脫原有框架、向外拓展新局',
  },
  交友: {
    short: '人脈圈層與團隊協作',
    tailwindAction: '客戶、社群或同事能帶來實質推力，適合借力使力、擴大合作面。',
    bufferAction: '維持不卑不亢的人際邊界，自然會有懂你專業的人在關鍵時幫忙。',
    arenaAction: '主動篩選高價值圈層並主導跨人協作，不再被動迎合所有人。',
    stoplossAction: '人情消耗與無效社交是最大精力黑洞；對不對頻的人際與口頭承諾要果斷設界線。',
    decadeFocus: '篩選同頻圈層與升級協作網絡',
  },
  官祿: {
    short: '事業主線與工作執行',
    tailwindAction: '工作推進順暢、專業成果容易被看見，適合把力氣集中在核心任務。',
    bufferAction: '靠流程整理、專業名聲與穩定交付，能在職場站穩不可替代的位置。',
    arenaAction: '事業進入扛責與搶佔主導權的關鍵期，直接面對核心難題、做出明確取捨。',
    stoplossAction: '工作容易陷入越忙越沒方向或流程卡關；先砍掉低價值雜事，別用忙碌掩蓋焦慮。',
    decadeFocus: '確立事業主軸與拉高專業位階',
  },
  田宅: {
    short: '家庭根基與資產配置',
    tailwindAction: '居住環境、資產累積或家庭後盾有利，適合穩步存底與整理生活空間。',
    bufferAction: '把居家與工作環境整理清爽，能明顯提升日常穩定度與專注力。',
    arenaAction: '主動處理家務分工、居住安排或中長期資產配置，先把大後方穩住。',
    stoplossAction: '家務瑣事、居住變動或大額不動產決策易起摩擦，大筆固定支出先放緩評估。',
    decadeFocus: '穩固家庭根基與累積長期資產',
  },
  福德: {
    short: '內在心態與情緒續航',
    tailwindAction: '心態較為敞開、懂得取捨，容易在喜歡的事物中找到穩定滋養。',
    bufferAction: '透過閱讀、復盤或靜心思考，能把混亂思緒梳理成清晰判斷。',
    arenaAction: '重新校準你真正想要的生活標準，別再照別人的劇本勉強自己。',
    stoplossAction: '精神內耗與反覆糾結最嚴重；減少夜間滑手機與過度比較，先把心理雜訊關小。',
    decadeFocus: '重校內在價值觀與長期幸福標準',
  },
  父母: {
    short: '主管長輩與制度合約',
    tailwindAction: '容易獲得主管、前輩或大平台的認可與資源傾斜，適合借勢向上。',
    bufferAction: '走正規流程、拿證照或強化文書表達，都能為你帶來長線背書。',
    arenaAction: '正面處理與上位者、客戶端或合約條款的談判，爭取合理條件。',
    stoplossAction: '文書合約細節、制度規範或與主管／長輩的溝通易生摩擦；重要協議務必白紙黑字看清。',
    decadeFocus: '善用體制背書、累積名聲與專業信用',
  },
};

function getPalaceInfo(rawName?: string) {
  const cleaned = (rawName ?? '').replace(/宮$/, '').trim();
  const normalized =
    cleaned === '僕役' || cleaned === '奴僕' || cleaned === '仆役'
      ? '交友'
      : cleaned;
  return PALACE_PLAIN[normalized] ?? PALACE_PLAIN['命'];
}

const TEN_STAR_DECADE_STYLE: Record<string, string> = {
  比肩: '獨立自立、靠自身硬實力站穩腳步',
  劫財: '在競爭與團隊磨合中找定位，學會算清楚資源帳',
  食神: '透過專業輸出、作品累積與穩定節奏慢慢滾大成果',
  傷官: '打破舊框架、靠創意與差異化突圍，切忌只顧反叛忘了落地',
  偏財: '整合多方資源、抓市場機會與現金流槓桿',
  正財: '踏實累積本業收入與可持續的資產底盤',
  七殺: '直面壓力與高難度挑戰，把危機練成自己的護城河',
  正官: '建立秩序、信用與管理位階，靠長期自律換取信任',
  偏印: '深度內化、鑽研冷門或高門檻專業，先沉潛再出牌',
  正印: '累積知識、貴人背書與穩定根基，不急著跟風衝刺',
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

const STEM_HARMONY: Record<string, string> = {
  甲: '己',
  己: '甲',
  乙: '庚',
  庚: '乙',
  丙: '辛',
  辛: '丙',
  丁: '壬',
  壬: '丁',
  戊: '癸',
  癸: '戊',
};

const PILLAR_CIRCLE_META: Record<
  '年柱' | '月柱' | '日柱' | '時柱',
  {
    plain: string;
    harmonyTip: string;
    clashTip: string;
    repeatTip: string;
    calmTip: string;
  }
> = {
  年柱: {
    plain: '原生家庭與大環境',
    harmonyTip: '與長輩、原生家庭或產業大趨勢較有共鳴，適合借助既有平台資源。',
    clashTip: '家庭事務、長輩健康或所處外部環境易有變動，先預留彈性與心理準備。',
    repeatTip: '過往原生課題容易再次浮現，適合趁今年把舊帳或舊心結理清。',
    calmTip: '家庭與大環境面無直接劇烈沖合，維持基本穩定即可。',
  },
  月柱: {
    plain: '職場環境與同儕協作',
    harmonyTip: '職場合作、跨部門支援或團隊默契加分，適合透過聯手把事情做大。',
    clashTip: '職場架構、職務內容或同儕關係容易出現調整與變動，別把安全感全押在單一崗位。',
    repeatTip: '事業節奏出現似曾相識的考題，檢視過去踩過的坑就能少走彎路。',
    calmTip: '職場外在結構相對平穩，成敗主要看你自己的執行節奏。',
  },
  日柱: {
    plain: '自身狀態與親密關係',
    harmonyTip: '自身步調與身邊重要的人較容易達成默契，適合穩定關係與生活節律。',
    clashTip: '今年變動最直接打在「自己內在」或「親密伴侶」身上，容易想大幅調整生活狀態；重大關係決定先冷靜觀察再拍板。',
    repeatTip: '自我拉扯與關係舊模式反覆出現，是逼自己升級相處界線的訊號。',
    calmTip: '自身底盤與親密圈層相對平穩，不容易被外境劇烈撼動。',
  },
  時柱: {
    plain: '作品產出與未來計畫',
    harmonyTip: '新想法、副業或中長期計畫容易找到落地點與合作資源。',
    clashTip: '原有遠期計畫或下屬／專案配合容易臨時改道，保持迭代彈性，別一次壓滿資源。',
    repeatTip: '長期擱置的個人計畫重新被喚起，適合評估該重啟還是乾脆斷捨離。',
    calmTip: '中長期計畫面節奏平穩，適合按部就班累積作品。',
  },
};

function findPalaceByStar(
  palaces: ZiweiPalaceData[],
  starName: string
): ZiweiPalaceData | null {
  if (!starName) return null;
  return (
    palaces.find(
      (p) =>
        p.majorStars.some((s) => s.name === starName) ||
        p.minorStars.some((s) => s.name === starName)
    ) ?? null
  );
}

function describeDecadeNode(
  label: string,
  decade: BaziDecadeFortune
): StageNodeSummary {
  const style =
    TEN_STAR_DECADE_STYLE[decade.tenStar] ?? '調整方向與累積實力';
  return {
    label,
    ageRange: `${decade.startAge}–${decade.endAge} 歲`,
    yearRange: `${decade.startYear}–${decade.endYear}`,
    startYear: decade.startYear,
    plainTheme: style,
    technicalLabel: `八字大運 ${decade.ganZhi}（${decade.tenStar}）`,
  };
}

export function calculateLifeGuidance(
  client: ClientProfile,
  ziwei: ZiweiChartResult,
  bazi: BaziChartResult,
  tarot: TarotChartResult,
  targetDate: string
): LifeGuidanceResult {
  const birthYear = Number(client.birthDate.split('-')[0]);
  const targetYear = Number(targetDate.split('-')[0]);
  const actualAge = Math.max(0, targetYear - birthYear);
  const nominalAge = actualAge + 1;

  // ==========================================================================
  // PART 1: 當前十年階段定位軸 (Grounded in Real Bazi Decade + Ziwei Decadal)
  // ==========================================================================
  const decadalPalace = ziwei.palaces[ziwei.activeDecadalInfo.index];
  const decadalPalaceInfo = getPalaceInfo(decadalPalace?.name);

  const activeBaziDecade = bazi.targetFlow.activeDecade;
  const activeDecadeIdx = activeBaziDecade
    ? bazi.decadeFortunes.findIndex((d) => d.index === activeBaziDecade.index)
    : -1;

  let phaseKind: StagePhaseKind = 'deepening';
  let phaseLabel = '中段深耕期';
  let yearInDecade = 1;
  let yearsRemaining = 5;
  let nextShiftYear: number | null = null;
  let nextShiftAge: number | null = null;
  let prevStage: StageNodeSummary | null = null;
  let currentStage: StageNodeSummary;
  let nextStage: StageNodeSummary | null = null;

  if (activeBaziDecade && activeDecadeIdx >= 0) {
    yearInDecade = Math.max(
      1,
      Math.min(10, targetYear - activeBaziDecade.startYear + 1)
    );
    yearsRemaining = Math.max(0, activeBaziDecade.endYear - targetYear);
    nextShiftYear = activeBaziDecade.endYear + 1;
    nextShiftAge = activeBaziDecade.endAge + 1;

    if (yearInDecade <= 2) {
      phaseKind = 'opening';
      phaseLabel = '開局適應期';
    } else if (yearsRemaining <= 1) {
      phaseKind = 'transition';
      phaseLabel = '換軌交接期';
    } else {
      phaseKind = 'deepening';
      phaseLabel = '中段深耕期';
    }

    const prevDec =
      activeDecadeIdx > 0 ? bazi.decadeFortunes[activeDecadeIdx - 1] : null;
    const nextDec =
      activeDecadeIdx < bazi.decadeFortunes.length - 1
        ? bazi.decadeFortunes[activeDecadeIdx + 1]
        : null;

    prevStage = prevDec ? describeDecadeNode('上一段十年', prevDec) : null;
    currentStage = {
      label: '你目前所在階段',
      ageRange: `${activeBaziDecade.startAge}–${activeBaziDecade.endAge} 歲`,
      yearRange: `${activeBaziDecade.startYear}–${activeBaziDecade.endYear}`,
      startYear: activeBaziDecade.startYear,
      plainTheme: decadalPalaceInfo.decadeFocus,
      technicalLabel: `紫微大限「${decadalPalace.name}」（${ziwei.activeDecadalInfo.range[0]}–${ziwei.activeDecadalInfo.range[1]}歲）· 八字大運 ${activeBaziDecade.ganZhi}（${activeBaziDecade.tenStar}）`,
    };
    nextStage = nextDec ? describeDecadeNode('下一段十年', nextDec) : null;
  } else {
    // Childhood pre-decade stage
    phaseKind = 'childhood';
    phaseLabel = '起運前築底期';
    const firstDec = bazi.decadeFortunes[0] ?? null;
    yearInDecade = Math.max(1, actualAge + 1);
    yearsRemaining = firstDec ? Math.max(0, firstDec.startYear - targetYear) : 0;
    nextShiftYear = firstDec ? firstDec.startYear : null;
    nextShiftAge = firstDec ? firstDec.startAge : null;

    currentStage = {
      label: '你目前所在階段',
      ageRange: `0–${firstDec ? Math.max(1, firstDec.startAge - 1) : 9} 歲`,
      yearRange: `${birthYear}–${firstDec ? firstDec.startYear - 1 : birthYear + 9}`,
      startYear: birthYear,
      plainTheme: decadalPalaceInfo.decadeFocus,
      technicalLabel: `起運前童限 · 紫微大限「${decadalPalace.name}」`,
    };
    nextStage = firstDec ? describeDecadeNode('第一段大運', firstDec) : null;
  }

  const tenStarStyle = activeBaziDecade
    ? TEN_STAR_DECADE_STYLE[activeBaziDecade.tenStar] ?? '穩步累積籌碼'
    : '累積底氣與探索興趣';

  const stageHeadline = `${decadalPalaceInfo.decadeFocus}（正值${phaseLabel}）`;
  const stageGuidance = `這段十年的核心任務是「${decadalPalaceInfo.decadeFocus}」，運作節奏偏向「${tenStarStyle}」；搭配今年「${tarot.currentYearCard.card.name}」的年度課題（${tarot.currentYearCard.card.keywords.slice(0, 2).join('、')}），代表你不需要跟別人比速度，而是對齊這段十年的主線出牌。`;

  const confusionReframe =
    phaseKind === 'transition'
      ? `你正處於這段十年的最後 ${yearsRemaining === 0 ? '1 年收尾' : `${yearsRemaining + 1} 年交接期`}（${nextShiftYear} 年將正式換軌）。這個刻度對現狀產生懷疑、覺得舊方法開始失效，本來就是結構性的換檔訊號——現在最該做的是「盤點籌碼、替下一階段留餘裕」，而不是硬撐舊跑道。`
      : phaseKind === 'opening'
        ? `你剛跨入這段十年的第 ${yearInDecade} 年，新遊戲規則才剛啟動。這時候感到不確定、還看不到明顯成果完全正常；重點是透過小步試錯確認方向，別拿上一階段的舊標準來否定現在的自己。`
        : phaseKind === 'deepening'
          ? `你已走到這段十年的第 ${yearInDecade} / 10 年（距離下一次大換軌還有 ${yearsRemaining + 1} 年）。這個位置迷惘通常不是沒路走，而是「支線開太多、心力被分散」——把今年精力收斂到下面標出的順風入口，就能重新找回掌控感。`
          : `目前正處於起運前的累積階段，重點在於建立基礎習慣與探索天賦，不必急著過早定型。`;

  const stagePosition: LifeStagePosition = {
    targetYear,
    actualAge,
    nominalAge,
    phaseKind,
    phaseLabel,
    decadeTitle: currentStage.ageRange,
    yearInDecade,
    yearsRemaining,
    nextShiftYear,
    nextShiftAge,
    stageHeadline,
    stageGuidance,
    confusionReframe,
    technicalProof: currentStage.technicalLabel,
    prevStage,
    currentStage,
    nextStage,
  };

  // ==========================================================================
  // PART 2: 今年精力配置圖 — Real Ziwei 4-Mutagens + Bazi 4-Pillar Flow
  // ==========================================================================
  const yearlyMutagens =
    ziwei.mutagenTable.find((m) => m.scope === 'yearly') ??
    ziwei.mutagenTable[0];

  const tailwinds: EnergyTriggerItem[] = [];
  const arenas: EnergyTriggerItem[] = [];
  const stoplosses: EnergyTriggerItem[] = [];

  const addMutagenTrigger = (
    starName: string,
    mutType: '祿' | '權' | '科' | '忌'
  ) => {
    const pal = findPalaceByStar(ziwei.palaces, starName);
    if (!pal) return;

    // In yearly view, yearlyPalaceName tells us which life domain is activated THIS year;
    // pal.name is the natal palace base.
    const activeDomainPalace = pal.yearlyPalaceName || pal.name;
    const info = getPalaceInfo(activeDomainPalace);
    const technicalBase = `流年化${mutType}・${starName}落流年「${activeDomainPalace}」（本命${pal.name}）`;

    if (mutType === '祿') {
      tailwinds.push({
        id: `zw-lu-${pal.index}`,
        role: 'tailwind',
        domainLabel: info.short,
        headline: `今年資源與順風入口落在「${info.short}」`,
        guidance: info.tailwindAction,
        sourceSystem: 'ziwei',
        technicalProof: technicalBase,
      });
    } else if (mutType === '科') {
      tailwinds.push({
        id: `zw-ke-${pal.index}`,
        role: 'buffer',
        domainLabel: info.short,
        headline: `穩定加分與貴人緩衝落在「${info.short}」`,
        guidance: info.bufferAction,
        sourceSystem: 'ziwei',
        technicalProof: technicalBase,
      });
    } else if (mutType === '權') {
      arenas.push({
        id: `zw-quan-${pal.index}`,
        role: 'arena',
        domainLabel: info.short,
        headline: `今年必須主動扛起主導權的領域：「${info.short}」`,
        guidance: info.arenaAction,
        sourceSystem: 'ziwei',
        technicalProof: technicalBase,
      });
    } else if (mutType === '忌') {
      const oppPal = ziwei.palaces[(pal.index + 6) % 12];
      const oppDomainName = oppPal?.yearlyPalaceName || oppPal?.name || '';
      const oppInfo = oppDomainName ? getPalaceInfo(oppDomainName) : null;

      stoplosses.push({
        id: `zw-ji-${pal.index}`,
        role: 'stoploss',
        domainLabel: oppInfo
          ? `${info.short}（連帶牽動${oppInfo.short}）`
          : info.short,
        headline: `今年最容易執著內耗的區域：「${info.short}」`,
        guidance: info.stoplossAction,
        sourceSystem: 'ziwei',
        technicalProof: `${technicalBase}，並沖照對宮流年「${oppDomainName}」（本命${oppPal?.name ?? ''}）`,
      });
    }
  };

  addMutagenTrigger(yearlyMutagens.lu, '祿');
  addMutagenTrigger(yearlyMutagens.quan, '權');
  addMutagenTrigger(yearlyMutagens.ke, '科');
  addMutagenTrigger(yearlyMutagens.ji, '忌');

  // Yearly Ming Palace anchor (where the year's overarching theme sits)
  const yearlyMingPalace = ziwei.palaces[ziwei.activeYearlyInfo.index];
  if (yearlyMingPalace) {
    const ymInfo = getPalaceInfo(yearlyMingPalace.name);
    const alreadyInArena = arenas.some((a) => a.domainLabel === ymInfo.short);
    if (!alreadyInArena) {
      arenas.push({
        id: `zw-ym-${yearlyMingPalace.index}`,
        role: 'arena',
        domainLabel: ymInfo.short,
        headline: `${targetYear} 年度核心舞台聚焦於「${ymInfo.short}」`,
        guidance: `今年你投入最多注意力與時間的場景在「${ymInfo.short}」，與其到處救火，不如把這件事當成年度主線定調。`,
        sourceSystem: 'ziwei',
        technicalProof: `流年命宮（${ziwei.activeYearlyInfo.ganZhi}）疊本命「${yearlyMingPalace.name}」`,
      });
    }
  }

  // ==========================================================================
  // Bazi 4-Pillar Clash / Harmony / Repeat Checks against Yearly GanZhi
  // ==========================================================================
  const yearStem = bazi.targetFlow.yearPillar.stem;
  const yearBranch = bazi.targetFlow.yearPillar.branch;
  const yearGanZhi = bazi.targetFlow.yearPillar.ganZhi;

  // Order for human reading: 年柱 -> 月柱 -> 日柱 -> 時柱
  const orderedPillars = [...bazi.pillars].reverse();
  const lifeCircles: LifeCircleTrigger[] = orderedPillars.map((p) => {
    const meta = PILLAR_CIRCLE_META[p.label];
    const isBranchClash = BRANCH_CLASH[yearBranch] === p.branch;
    const isBranchHarmony = BRANCH_HARMONY[yearBranch] === p.branch;
    const isStemHarmony = STEM_HARMONY[yearStem] === p.stem;
    const isExactRepeat = p.stem === yearStem && p.branch === yearBranch;
    const isBranchRepeat = p.branch === yearBranch && !isExactRepeat;

    if (isBranchClash) {
      stoplosses.push({
        id: `bz-clash-${p.label}`,
        role: 'stoploss',
        domainLabel: meta.plain,
        headline: `今年變動與磨合直接觸動「${meta.plain}」`,
        guidance: meta.clashTip,
        sourceSystem: 'bazi',
        technicalProof: `流年「${yearGanZhi}」與${p.label}「${p.stem}${p.branch}」地支六沖（${yearBranch}${p.branch}沖）`,
      });
      return {
        pillarLabel: p.label,
        circlePlain: meta.plain,
        ganZhi: `${p.stem}${p.branch}`,
        relation: 'clash',
        relationPlain: '變動磨合',
        technicalNote: `流年 ${yearBranch}${p.branch} 相沖`,
        guidance: meta.clashTip,
      };
    }

    if (isBranchHarmony || isStemHarmony) {
      const harmonyTech = [
        isStemHarmony ? `天干 ${yearStem}${p.stem} 合` : '',
        isBranchHarmony ? `地支 ${yearBranch}${p.branch} 六合` : '',
      ]
        .filter(Boolean)
        .join('・');

      tailwinds.push({
        id: `bz-harmony-${p.label}`,
        role: 'tailwind',
        domainLabel: meta.plain,
        headline: `「${meta.plain}」出現連結與合作助力`,
        guidance: meta.harmonyTip,
        sourceSystem: 'bazi',
        technicalProof: `流年「${yearGanZhi}」與${p.label}「${p.stem}${p.branch}」${harmonyTech}`,
      });
      return {
        pillarLabel: p.label,
        circlePlain: meta.plain,
        ganZhi: `${p.stem}${p.branch}`,
        relation: 'harmony',
        relationPlain: '合作連結',
        technicalNote: harmonyTech,
        guidance: meta.harmonyTip,
      };
    }

    if (isExactRepeat || isBranchRepeat) {
      arenas.push({
        id: `bz-repeat-${p.label}`,
        role: 'arena',
        domainLabel: meta.plain,
        headline: `「${meta.plain}」舊課題重現，需要做一次收斂決斷`,
        guidance: meta.repeatTip,
        sourceSystem: 'bazi',
        technicalProof: `流年「${yearGanZhi}」與${p.label}「${p.stem}${p.branch}」${isExactRepeat ? '歲運伏吟' : '地支同氣'}`,
      });
      return {
        pillarLabel: p.label,
        circlePlain: meta.plain,
        ganZhi: `${p.stem}${p.branch}`,
        relation: 'repeat',
        relationPlain: '舊題重現',
        technicalNote: isExactRepeat ? '歲柱伏吟' : '地支同頻',
        guidance: meta.repeatTip,
      };
    }

    return {
      pillarLabel: p.label,
      circlePlain: meta.plain,
      ganZhi: `${p.stem}${p.branch}`,
      relation: 'calm',
      relationPlain: '節奏平穩',
      technicalNote: '無直接沖合',
      guidance: meta.calmTip,
    };
  });

  return {
    stagePosition,
    tailwinds,
    arenas,
    stoplosses,
    lifeCircles,
  };
}
