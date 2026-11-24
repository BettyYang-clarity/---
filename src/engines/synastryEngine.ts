import {
  BaziChartResult,
  BaziElementComplement,
  BaziPillarInteraction,
  ClientProfile,
  FiveElement,
  SynastryRelationType,
  SynastryResult,
  SynastryTone,
  TarotChartResult,
  ZiweiChartResult,
  ZiweiFlyingMutagenHit,
} from '../types/holistic';
import { ORIGIN_MUTAGEN_MAP } from './ziweiEngine';
import { getArcanaByNumber } from './tarotEngine';

export const SYNASTRY_RELATION_LABELS: Record<SynastryRelationType, string> = {
  romantic: '感情伴侶',
  business: '事業合夥',
  family: '親子家人',
  friendship: '摯友知己',
};

// ============================================================================
// Classical Bazi Stem / Branch Interaction Tables
// ============================================================================

const STEM_FIVE_COMBINATIONS: Array<[string, string, string]> = [
  ['甲', '己', '中正之合（化土）'],
  ['乙', '庚', '仁義之合（化金）'],
  ['丙', '辛', '威制之合（化水）'],
  ['丁', '壬', '淫暱深情之合（化木）'],
  ['戊', '癸', '無情而有情之合（化火）'],
];

const STEM_CLASH_PAIRS: Array<[string, string]> = [
  ['甲', '庚'],
  ['乙', '辛'],
  ['丙', '壬'],
  ['丁', '癸'],
];

const ELEMENT_GENERATES: Record<FiveElement, FiveElement> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
};

const ELEMENT_CONTROLS: Record<FiveElement, FiveElement> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
};

const BRANCH_SIX_COMBINATIONS: Array<[string, string, string]> = [
  ['子', '丑', '子丑六合（土）'],
  ['寅', '亥', '寅亥六合（木）'],
  ['卯', '戌', '卯戌六合（火）'],
  ['辰', '酉', '辰酉六合（金）'],
  ['巳', '申', '巳申六合（水）'],
  ['午', '未', '午未六合（日月合）'],
];

const BRANCH_THREE_HARMONY_GROUPS: Array<{ members: string[]; name: string }> = [
  { members: ['申', '子', '辰'], name: '申子辰三合水局' },
  { members: ['寅', '午', '戌'], name: '寅午戌三合火局' },
  { members: ['巳', '酉', '丑'], name: '巳酉丑三合金局' },
  { members: ['亥', '卯', '未'], name: '亥卯未三合木局' },
];

const BRANCH_SIX_CLASHES: Array<[string, string]> = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
];

const BRANCH_SIX_HARMS: Array<[string, string]> = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
];

const BRANCH_PUNISHMENT_PAIRS: Array<[string, string, string]> = [
  ['子', '卯', '子卯無禮之刑'],
  ['寅', '巳', '寅巳恃勢之刑'],
  ['巳', '申', '巳申恃勢之刑'],
  ['寅', '申', '寅申相刑兼沖'],
  ['丑', '戌', '丑戌無恩之刑'],
  ['戌', '未', '戌未無恩之刑'],
  ['丑', '未', '丑未相刑兼沖'],
];

const SELF_PUNISHMENT_BRANCHES = new Set(['辰', '午', '酉', '亥']);

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

const HONG_LUAN_MAP: Record<string, string> = {
  子: '卯', 丑: '寅', 寅: '丑', 卯: '子', 辰: '亥', 巳: '戌',
  午: '酉', 未: '申', 申: '未', 酉: '午', 戌: '巳', 亥: '辰',
};

const TIAN_XI_MAP: Record<string, string> = {
  子: '酉', 丑: '申', 寅: '未', 卯: '午', 辰: '巳', 巳: '辰',
  午: '卯', 未: '寅', 申: '丑', 酉: '子', 戌: '亥', 亥: '戌',
};

function findStemCombo(s1: string, s2: string): string | null {
  for (const [a, b, label] of STEM_FIVE_COMBINATIONS) {
    if ((s1 === a && s2 === b) || (s1 === b && s2 === a)) return label;
  }
  return null;
}

function isStemClash(s1: string, s2: string): boolean {
  return STEM_CLASH_PAIRS.some(
    ([a, b]) => (s1 === a && s2 === b) || (s1 === b && s2 === a)
  );
}

function inspectBranchPair(
  b1: string,
  b2: string
): { label: string; tone: SynastryTone; detail: string } {
  if (b1 === b2) {
    if (SELF_PUNISHMENT_BRANCHES.has(b1)) {
      return {
        label: `同支伏吟兼自刑（${b1}${b2}）`,
        tone: 'dynamic',
        detail: '彼此生活慣性與思考模式高度相似，容易彼此看懂，卻也容易在同一件事上一起鑽牛角尖。',
      };
    }
    return {
      label: `同支伏吟（${b1}${b2}）`,
      tone: 'complement',
      detail: '內在節奏與價值底色相近，日常相處較有安全感，但長期仍須刻意製造新鮮話題與分工差異。',
    };
  }

  for (const [a, b, name] of BRANCH_SIX_COMBINATIONS) {
    if ((b1 === a && b2 === b) || (b1 === b && b2 === a)) {
      return {
        label: name,
        tone: 'harmony',
        detail: '地支六合代表深層默契與自然親近感，相處時較容易互相體諒、迅速找到共同頻率。',
      };
    }
  }

  for (const grp of BRANCH_THREE_HARMONY_GROUPS) {
    if (grp.members.includes(b1) && grp.members.includes(b2)) {
      return {
        label: `半三合（${grp.name}）`,
        tone: 'harmony',
        detail: '屬於同一地支三合局，方向感與長期願景容易對齊，合作或共同經營生活具有放大綜效。',
      };
    }
  }

  const hasClash = BRANCH_SIX_CLASHES.some(
    ([a, b]) => (b1 === a && b2 === b) || (b1 === b && b2 === a)
  );
  if (hasClash) {
    return {
      label: `${b1}${b2}六沖`,
      tone: 'caution',
      detail: '內在節奏與處理壓力的直覺反應相反，初期常帶來強烈火花或刺激，長久相處重在保留各自空間與清楚約定。',
    };
  }

  const hasHarm = BRANCH_SIX_HARMS.some(
    ([a, b]) => (b1 === a && b2 === b) || (b1 === b && b2 === a)
  );
  if (hasHarm) {
    return {
      label: `${b1}${b2}六害（相穿）`,
      tone: 'caution',
      detail: '雙方容易各自懷抱善意卻解讀錯位，累積隱性委屈；把真實期待直接攤開來說，即可大幅降低誤會。',
    };
  }

  const punishment = BRANCH_PUNISHMENT_PAIRS.find(
    ([a, b]) => (b1 === a && b2 === b) || (b1 === b && b2 === a)
  );
  if (punishment) {
    return {
      label: punishment[2],
      tone: 'dynamic',
      detail: '對彼此標準較高、細節上容易互相挑剔或較真，適合把能量導向共同任務與專業打磨。',
    };
  }

  return {
    label: `${b1}與${b2}平和無刑沖`,
    tone: 'complement',
    detail: '地支結構平穩無劇烈沖剋，相處張力溫和，關係品質主要取決於天干互動與日常溝通習慣。',
  };
}

function analyzeDayMasterRelation(
  nameA: string,
  baziA: BaziChartResult,
  nameB: string,
  baziB: BaziChartResult
) {
  const sA = baziA.dayMaster.stem;
  const eA = baziA.dayMaster.element;
  const yA = baziA.dayMaster.yinYang;
  const sB = baziB.dayMaster.stem;
  const eB = baziB.dayMaster.element;
  const yB = baziB.dayMaster.yinYang;

  const combo = findStemCombo(sA, sB);
  if (combo) {
    return {
      stemA: sA,
      elementA: eA,
      stemB: sB,
      elementB: eB,
      relationLabel: `天干五合・${sA}${sB}${combo}`,
      tone: 'harmony' as SynastryTone,
      summary: `${nameA}（${sA}${eA}）與${nameB}（${sB}${eB}）構成古典「天干五合」，天生具有強烈的吸引力與互動黏著度，彼此觀點容易形成互補融合。`,
    };
  }

  if (eA === eB) {
    const samePolarity = yA === yB;
    return {
      stemA: sA,
      elementA: eA,
      stemB: sB,
      elementB: eB,
      relationLabel: samePolarity
        ? `同氣比肩（同為${yA}${eA}）`
        : `陰陽互補（${sA}${eA} × ${sB}${eB}）`,
      tone: 'complement' as SynastryTone,
      summary: samePolarity
        ? `兩人同為${yA}${eA}，核心價值與行事邏輯高度一致，相處像戰友與鏡子；需留意意見相左時雙方都不願輕易讓步。`
        : `同屬${eA}行但一陽一陰，既能理解彼此底層思維，又能在外顯剛柔節奏上互補，是很舒服的平輩夥伴感。`,
    };
  }

  if (ELEMENT_GENERATES[eA] === eB) {
    return {
      stemA: sA,
      elementA: eA,
      stemB: sB,
      elementB: eB,
      relationLabel: `相生滋養（${nameA}之${eA}生${nameB}之${eB}）`,
      tone: 'harmony' as SynastryTone,
      summary: `${nameA}（${eA}）自然生扶${nameB}（${eB}），互動中${nameA}較容易成為傾聽、支持或提供資源的一方，${nameB}則在對方身邊更有發揮與安全感；需留意付出與回饋的雙向平衡。`,
    };
  }

  if (ELEMENT_GENERATES[eB] === eA) {
    return {
      stemA: sA,
      elementA: eA,
      stemB: sB,
      elementB: eB,
      relationLabel: `相生滋養（${nameB}之${eB}生${nameA}之${eA}）`,
      tone: 'harmony' as SynastryTone,
      summary: `${nameB}（${eB}）自然生扶${nameA}（${eA}），${nameB}在觀念啟發、情緒包容或實務協助上常成為${nameA}的助力，讓${nameA}感到被托舉；記得適時表達感謝以維持流動。`,
    };
  }

  if (ELEMENT_CONTROLS[eA] === eB) {
    const clash = isStemClash(sA, sB);
    return {
      stemA: sA,
      elementA: eA,
      stemB: sB,
      elementB: eB,
      relationLabel: clash
        ? `天干相沖剋（${sA}${eA}剋${sB}${eB}）`
        : `主導磨合（${nameA}之${eA}剋${nameB}之${eB}）`,
      tone: (clash ? 'caution' : 'dynamic') as SynastryTone,
      summary: `${nameA}（${eA}）在氣場上較容易主導節奏或無意間給${nameB}（${eB}）帶來標準與壓力；若雙方分工明確，這種「制衡感」反而能促成務實結果，但溝通時宜放軟語氣。`,
    };
  }

  const clash = isStemClash(sA, sB);
  return {
    stemA: sA,
    elementA: eA,
    stemB: sB,
    elementB: eB,
    relationLabel: clash
      ? `天干相沖剋（${sB}${eB}剋${sA}${eA}）`
      : `主導磨合（${nameB}之${eB}剋${nameA}之${eA}）`,
    tone: (clash ? 'caution' : 'dynamic') as SynastryTone,
    summary: `${nameB}（${eB}）的表達與決策風格容易牽動或制約${nameA}（${eA}）；在需要推進進度或把關風險時頗有效率，但日常相處需尊重${nameA}的自主空間。`,
  };
}

// ============================================================================
// Classical Ziwei Flying-Star & Palace Overlay Helpers (勸學齋規則)
// ============================================================================

const PALACE_ROLE_MEANINGS: Record<
  SynastryRelationType,
  Record<string, string>
> = {
  romantic: {
    命宮: '高度鏡像共振，彼此個性底色與人生視角極為貼近，既熟悉也容易互踩雷區。',
    兄弟宮: '相處帶有手足與生活戰友感，重視日常實際互助與財務安全感。',
    夫妻宮: '正中情感核心位！對方天生容易觸動你的心動頻率與親密關係想像。',
    子女宮: '互動充滿玩心、激情與創造火花，在一起容易感到輕鬆有趣或激發照顧欲。',
    財帛宮: '彼此對現實價值、金錢觀與生活品質的互動明顯，容易一起談理財與資源規劃。',
    疾厄宮: '能直接碰觸彼此內心最真實的情緒與身體狀態，相處直白不掩飾。',
    遷移宮: '具有強烈的「向外開拓」吸引力，對方往往帶來不同圈層的視野與新鮮感。',
    僕役宮: '從朋友或同好互動感出發，關係自由度高，但長期承諾需要雙方主動確認。',
    官祿宮: '彼此在事業目標與生活成就上高度關聯，是能一起打拼成長的伴侶配置。',
    田宅宮: '帶有深厚的「家」與歸屬感，相處久了會自然想共同建立安穩生活基地。',
    福德宮: '靈魂與精神層次的同頻位置！特別重視思想交流、三觀共鳴與情緒撫慰。',
    父母宮: '相處帶有長輩關懷、引導或被期待的色彩，適合釐清界線以避免過度管束。',
  },
  business: {
    命宮: '思維底色一致，決策節奏快，但合夥時須明訂最終拍板權以避免雙頭馬車。',
    兄弟宮: '典型的並肩作戰位置，重視資源共享、現金流控管與平輩信任。',
    夫妻宮: '容易形成一主內、一主外的互補搭檔，重視長期穩定契約與默契。',
    子女宮: '適合共同孵化新產品、創意專案或跨界合作，點子與執行火花多。',
    財帛宮: '直指商業變現與財務運作！對方容易帶動營收思維或直接影響獲利節奏。',
    疾厄宮: '能看見彼此工作習慣的深層細節與壓力極限，適合高信任度的核心幕僚搭配。',
    遷移宮: '對方擅長為你打開外部市場、人脈通路或品牌曝光，極具拓展價值。',
    僕役宮: '偏向團隊管理、客戶資源或人脈協作角色，須清楚界定權責與分潤比例。',
    官祿宮: '正中事業執行與戰略核心！雙方在專業推進與專案落地上的連結最強。',
    田宅宮: '利於長期資產累積、組織根基建設與穩健型實體或品牌佈局。',
    福德宮: '理念與企業文化共鳴度高，合作起來心累度低，適合中長期策略夥伴。',
    父母宮: '對方在專業威望、制度把關或資源背書上具引導力，呈現師徒或顧問式互補。',
  },
  family: {
    命宮: '彼此性格如出一轍，很容易懂對方在想什麼，也容易因為太像而互不相讓。',
    兄弟宮: '相處偏向平輩交流與日常互助，容易一起分擔家庭事務。',
    夫妻宮: '重視彼此陪伴與情緒回應，對對方的態度與認同特別敏感。',
    子女宮: '互動帶有照顧、教養與付出色彩，一方常不自覺想替對方操心。',
    財帛宮: '家庭資源分配與實際生活開銷是互動重點，坦誠談錢反而更安心。',
    疾厄宮: '彼此健康、作息與內在壓力高度牽動，關懷方式偏向實際生活細節。',
    遷移宮: '彼此常在「給空間獨立」與「想多了解近況」之間尋找舒適距離。',
    僕役宮: '互動較像朋友般自然，保留適度界線反而讓家人關係更長久融洽。',
    官祿宮: '對彼此的學業、職涯表現與人生規劃特別關注，宜多鼓勵少評價。',
    田宅宮: '家庭凝聚力核心位！對家宅環境與團聚氛圍有強烈共同連結。',
    福德宮: '深層心靈寄託所在，彼此的言語溫度會直接影響對方的內在安定感。',
    父母宮: '帶有明顯的長幼權威或照護角色投射，練習平等對話能大幅減少壓力。',
  },
  friendship: {
    命宮: '氣場高度同步，初見就有「同類人」的熟悉感，聊天頻率一致。',
    兄弟宮: '像自己人一樣講義氣，遇到實務困難時願意出手相挺。',
    夫妻宮: '相處極具親和力與默契，彼此重視一對一的深度交流。',
    子女宮: '一起吃喝玩樂、探索興趣特別開心，是能為彼此充電的快樂夥伴。',
    財帛宮: '常交流理財、消費品味或合作機會，務實又具價值感。',
    疾厄宮: '相處毫不做作，可以放心吐露疲憊與真實心聲。',
    遷移宮: '對方常帶你認識新圈子、看更寬廣的世界，是視野拓展型益友。',
    僕役宮: '標準的社交互動與同好圈層，輕鬆自在無負擔。',
    官祿宮: '屬於互相激勵成長的職涯良友，交流工作與目標特別有收穫。',
    田宅宮: '相處安心自在，像去老朋友家作客一樣毫無防備。',
    福德宮: '難得的精神知音！就算不常見面，一聊就能直達靈魂深處。',
    父母宮: '亦師亦友的關係，對方在關鍵時刻常能給出成熟穩重的建議。',
  },
};

function describeFlyingMutagen(
  mutagen: '祿' | '權' | '科' | '忌',
  targetPalaceName: string,
  sourceName: string,
  targetName: string
): string {
  switch (mutagen) {
    case '祿':
      return `${sourceName}對${targetName}的「${targetPalaceName}」帶有欣賞、寬容與資源滋養，容易在此領域帶來順暢感與好心情。`;
    case '權':
      return `${sourceName}對${targetName}的「${targetPalaceName}」具有推動力與主導意識，常積極給意見或協助對方把事情做成。`;
    case '科':
      return `${sourceName}在${targetName}的「${targetPalaceName}」扮演理性溝通與潤滑劑角色，遇事能客觀梳理、緩和緊張。`;
    case '忌':
      return `${sourceName}對${targetName}的「${targetPalaceName}」最在意也最容易產生執念或操心，是雙方最需練習放輕鬆與說清楚的焦點。`;
  }
}

function computeFlyingHits(
  sourceStem: string,
  sourceName: string,
  targetChart: ZiweiChartResult,
  targetName: string
): ZiweiFlyingMutagenHit[] {
  const stars = ORIGIN_MUTAGEN_MAP[sourceStem] ?? ['', '', '', ''];
  const labels: Array<'祿' | '權' | '科' | '忌'> = ['祿', '權', '科', '忌'];

  return labels.map((mutagen, idx) => {
    const starName = stars[idx] || '';
    const hitPalace = targetChart.palaces.find(
      (p) =>
        p.majorStars.some((s) => s.name === starName) ||
        p.minorStars.some((s) => s.name === starName)
    );
    const targetPalaceName = hitPalace ? hitPalace.name : '未落主輔星位';
    const targetBranch = hitPalace ? hitPalace.earthlyBranch : '—';
    return {
      mutagen,
      starName: starName || '—',
      targetPalaceName,
      targetBranch,
      interpretation: hitPalace
        ? describeFlyingMutagen(mutagen, targetPalaceName, sourceName, targetName)
        : '此飛化星未直接落於主輔星宮位，影響相對溫和間接。',
    };
  });
}

function classifyZiweiArchetype(ziwei: ZiweiChartResult): {
  group: string;
  starsLabel: string;
} {
  const ming = ziwei.palaces[ziwei.mingPalaceIndex];
  const opp = ziwei.palaces[(ziwei.mingPalaceIndex + 6) % 12];
  const stars =
    ming.majorStars.length > 0 ? ming.majorStars : opp.majorStars;
  const names = stars.map((s) => s.name);
  const starsLabel =
    ming.majorStars.length > 0
      ? names.join('・')
      : `命無正曜（借${names.join('・')}）`;

  if (names.some((n) => ['七殺', '破軍', '貪狼', '廉貞'].includes(n))) {
    return { group: '開創行動型（殺破狼系）', starsLabel };
  }
  if (names.some((n) => ['紫微', '天府', '武曲', '天相'].includes(n))) {
    return { group: '領導統籌型（紫府武相系）', starsLabel };
  }
  if (names.some((n) => ['太陽', '巨門'].includes(n))) {
    return { group: '表達支援型（陽巨系）', starsLabel };
  }
  return { group: '穩健策劃型（機月同梁系）', starsLabel };
}

// ============================================================================
// Mary K. Greer Composite Tarot Math
// ============================================================================

function sumDigits(n: number): number {
  return String(Math.abs(n))
    .split('')
    .reduce((acc, ch) => acc + Number(ch), 0);
}

function reduceToArcana(n: number): number {
  let cur = n;
  while (cur > 22) {
    cur = sumDigits(cur);
  }
  return cur;
}

function reduceToSingleDigit(n: number): number {
  let cur = n;
  while (cur > 9) {
    cur = sumDigits(cur);
  }
  return cur;
}

// ============================================================================
// Main Deterministic Synastry Calculator
// ============================================================================

export function calculateSynastry(params: {
  clientA: ClientProfile;
  ziweiA: ZiweiChartResult;
  baziA: BaziChartResult;
  tarotA: TarotChartResult;
  clientB: ClientProfile;
  ziweiB: ZiweiChartResult;
  baziB: BaziChartResult;
  tarotB: TarotChartResult;
  relationType: SynastryRelationType;
  targetDate: string;
}): SynastryResult {
  const {
    clientA,
    ziweiA,
    baziA,
    tarotA,
    clientB,
    ziweiB,
    baziB,
    tarotB,
    relationType,
    targetDate,
  } = params;

  // ---------------- 1. Bazi Synastry ----------------
  const dayMasterRelation = analyzeDayMasterRelation(
    clientA.name,
    baziA,
    clientB.name,
    baziB
  );

  // Pillars in baziEngine are ordered: [0]=時柱, [1]=日柱, [2]=月柱, [3]=年柱
  const dayA = baziA.pillars[1];
  const dayB = baziB.pillars[1];
  const monthA = baziA.pillars[2];
  const monthB = baziB.pillars[2];
  const yearA = baziA.pillars[3];
  const yearB = baziB.pillars[3];

  const dayBranchCheck = inspectBranchPair(dayA.branch, dayB.branch);

  const pillarPairs: Array<{
    pairLabel: string;
    a: typeof dayA;
    b: typeof dayB;
  }> = [
    { pairLabel: '日柱 × 日柱（核心相處與夫妻宮）', a: dayA, b: dayB },
    { pairLabel: '月柱 × 月柱（價值觀與事業節奏）', a: monthA, b: monthB },
    { pairLabel: '年柱 × 年柱（原生背景與第一印象）', a: yearA, b: yearB },
    { pairLabel: `${clientA.name}日柱 × ${clientB.name}月柱`, a: dayA, b: monthB },
    { pairLabel: `${clientB.name}日柱 × ${clientA.name}月柱`, a: monthA, b: dayB },
  ];

  const pillarInteractions: BaziPillarInteraction[] = [];
  for (const item of pillarPairs) {
    const stemCombo = findStemCombo(item.a.stem, item.b.stem);
    const branchInfo = inspectBranchPair(item.a.branch, item.b.branch);
    const isBranchCombo =
      branchInfo.label.includes('六合') || branchInfo.label.includes('三合');

    if (stemCombo && isBranchCombo) {
      pillarInteractions.push({
        pairLabel: item.pairLabel,
        pillarA: `${item.a.stem}${item.a.branch}`,
        pillarB: `${item.b.stem}${item.b.branch}`,
        relationLabel: '天合地合（鴛鴦合・極強牽引）',
        tone: 'harmony',
        explanation: `天干${item.a.stem}${item.b.stem}相合且地支${branchInfo.label}，代表雙方在此層面具有罕見的深層緣分與默契加成。`,
      });
    } else if (
      item.pairLabel.startsWith('日柱') ||
      item.pairLabel.startsWith('月柱') ||
      item.pairLabel.startsWith('年柱') ||
      stemCombo ||
      branchInfo.tone === 'harmony' ||
      branchInfo.tone === 'caution'
    ) {
      const relationLabel = stemCombo
        ? `天干五合 ＋ ${branchInfo.label}`
        : branchInfo.label;
      const tone: SynastryTone =
        stemCombo && branchInfo.tone !== 'caution'
          ? 'harmony'
          : branchInfo.tone;
      pillarInteractions.push({
        pairLabel: item.pairLabel,
        pillarA: `${item.a.stem}${item.a.branch}`,
        pillarB: `${item.b.stem}${item.b.branch}`,
        relationLabel,
        tone,
        explanation: branchInfo.detail,
      });
    }
  }

  // Five-Element Complement Matrix
  const elementsOrder: FiveElement[] = ['木', '火', '土', '金', '水'];
  const bSupplementsA: FiveElement[] = [];
  const aSupplementsB: FiveElement[] = [];
  const sharedMissingElements: FiveElement[] = [];

  const elementMatrix: BaziElementComplement[] = elementsOrder.map((el) => {
    const countA = baziA.elementCounts[el];
    const countB = baziB.elementCounts[el];
    let statusLabel = '平衡共存';
    let tone: SynastryTone = 'complement';

    if (countA <= 1 && countB >= 2) {
      bSupplementsA.push(el);
      statusLabel = `${clientB.name} 補足 ${clientA.name}`;
      tone = 'harmony';
    } else if (countB <= 1 && countA >= 2) {
      aSupplementsB.push(el);
      statusLabel = `${clientA.name} 補足 ${clientB.name}`;
      tone = 'harmony';
    } else if (countA <= 1 && countB <= 1) {
      sharedMissingElements.push(el);
      statusLabel = '雙方皆偏弱';
      tone = 'caution';
    } else if (countA >= 3 && countB >= 3) {
      statusLabel = '雙方皆偏旺';
      tone = 'dynamic';
    }

    return { element: el, countA, countB, statusLabel, tone };
  });

  // Mutual Nobleman & Peach/Romance Star Checks
  const noblemanLinks: Array<{
    direction: string;
    starName: string;
    detail: string;
  }> = [];

  const checkMutualStars = (
    hostName: string,
    hostBazi: BaziChartResult,
    guestName: string,
    guestBazi: BaziChartResult
  ) => {
    const hostDayStem = hostBazi.dayMaster.stem;
    const hostYearBranch = hostBazi.pillars[3].branch;
    const guestDayBranch = guestBazi.pillars[1].branch;
    const guestYearBranch = guestBazi.pillars[3].branch;
    const guestMonthBranch = guestBazi.pillars[2].branch;

    const tianYiBranches = TIAN_YI_MAP[hostDayStem] ?? [];
    if (
      tianYiBranches.includes(guestDayBranch) ||
      tianYiBranches.includes(guestYearBranch)
    ) {
      const hit = tianYiBranches.includes(guestDayBranch)
        ? `日支「${guestDayBranch}」`
        : `年支「${guestYearBranch}」`;
      noblemanLinks.push({
        direction: `${guestName} → ${hostName}`,
        starName: '天乙貴人',
        detail: `${guestName}的${hit}正落於${hostName}（${hostDayStem}日主）的天乙貴人位，關鍵時刻易帶來實質提攜與解圍助力。`,
      });
    }

    const wenChangBranch = WEN_CHANG_MAP[hostDayStem];
    if (
      wenChangBranch &&
      (guestDayBranch === wenChangBranch || guestMonthBranch === wenChangBranch)
    ) {
      noblemanLinks.push({
        direction: `${guestName} → ${hostName}`,
        starName: '文昌貴人',
        detail: `${guestName}帶動${hostName}的文昌位（${wenChangBranch}），雙方討論企劃、學習或釐清思緒時特別流暢有靈感。`,
      });
    }

    const hongLuan = HONG_LUAN_MAP[hostYearBranch];
    const tianXi = TIAN_XI_MAP[hostYearBranch];
    if (guestDayBranch === hongLuan || guestYearBranch === hongLuan) {
      noblemanLinks.push({
        direction: `${guestName} → ${hostName}`,
        starName: '紅鸞星動',
        detail: `${guestName}觸動${hostName}年支紅鸞位（${hongLuan}），主良緣吸引、喜氣升溫與好人緣共振。`,
      });
    } else if (guestDayBranch === tianXi || guestYearBranch === tianXi) {
      noblemanLinks.push({
        direction: `${guestName} → ${hostName}`,
        starName: '天喜相逢',
        detail: `${guestName}觸動${hostName}年支天喜位（${tianXi}），在一起容易感到愉悅放鬆、帶動喜慶與正向氛圍。`,
      });
    }
  };

  checkMutualStars(clientA.name, baziA, clientB.name, baziB);
  checkMutualStars(clientB.name, baziB, clientA.name, baziA);

  // ---------------- 2. Ziwei Synastry ----------------
  const mingA = ziweiA.palaces[ziweiA.mingPalaceIndex];
  const mingB = ziweiB.palaces[ziweiB.mingPalaceIndex];

  const aInBPalace =
    ziweiB.palaces.find((p) => p.earthlyBranch === mingA.earthlyBranch) ??
    ziweiB.palaces[0];
  const bInAPalace =
    ziweiA.palaces.find((p) => p.earthlyBranch === mingB.earthlyBranch) ??
    ziweiA.palaces[0];

  const archA = classifyZiweiArchetype(ziweiA);
  const archB = classifyZiweiArchetype(ziweiB);

  const roleDict = PALACE_ROLE_MEANINGS[relationType];

  const aInB = {
    sourceName: clientA.name,
    sourceMingBranch: `${mingA.heavenlyStem}${mingA.earthlyBranch}`,
    sourceMingStars: archA.starsLabel,
    landsInTargetPalace: aInBPalace.name,
    roleInterpretation:
      roleDict[aInBPalace.name] ??
      `${clientA.name}的命宮落入${clientB.name}的${aInBPalace.name}，互動焦點集中於此宮領域。`,
  };

  const bInA = {
    sourceName: clientB.name,
    sourceMingBranch: `${mingB.heavenlyStem}${mingB.earthlyBranch}`,
    sourceMingStars: archB.starsLabel,
    landsInTargetPalace: bInAPalace.name,
    roleInterpretation:
      roleDict[bInAPalace.name] ??
      `${clientB.name}的命宮落入${clientA.name}的${bInAPalace.name}，互動焦點集中於此宮領域。`,
  };

  const aFliesToB = computeFlyingHits(
    mingA.heavenlyStem,
    clientA.name,
    ziweiB,
    clientB.name
  );
  const bFliesToA = computeFlyingHits(
    mingB.heavenlyStem,
    clientB.name,
    ziweiA,
    clientA.name
  );

  const archetypeSummary =
    archA.group === archB.group
      ? `兩人同屬「${archA.group}」，做事步調與價值重心相近，溝通成本低；關鍵決策時須刻意補上不同視角的風險檢查。`
      : `${clientA.name}偏「${archA.group}」，${clientB.name}偏「${archB.group}」，屬於天然的剛柔與動靜互補配置；若能尊重彼此節奏差異，能形成一攻一守的完整格局。`;

  const aYearlyPalace = ziweiA.palaces[ziweiA.activeYearlyInfo.index];
  const bYearlyPalace = ziweiB.palaces[ziweiB.activeYearlyInfo.index];
  const aYearlyMut = ziweiA.mutagenTable.find((m) => m.scope === 'yearly');
  const bYearlyMut = ziweiB.mutagenTable.find((m) => m.scope === 'yearly');

  // ---------------- 3. Mary K. Greer Tarot Synastry ----------------
  const compositeSum = tarotA.personalityRawNumber + tarotB.personalityRawNumber;
  const compositeRawNumber = reduceToArcana(compositeSum);
  const compositeCard = getArcanaByNumber(compositeRawNumber);
  const compositeRootNum =
    compositeRawNumber >= 10 ? reduceToSingleDigit(compositeRawNumber) : null;
  const compositeRootCard =
    compositeRootNum !== null ? getArcanaByNumber(compositeRootNum) : null;
  const compositeFormula = `${tarotA.personalityRawNumber}（${clientA.name}人格數）＋ ${tarotB.personalityRawNumber}（${clientB.name}人格數）＝ ${compositeSum} → ${compositeCard.displayNumber} ${compositeCard.name}`;

  const sameConstellation =
    tarotA.constellation.id === tarotB.constellation.id;
  const constellationSummary = sameConstellation
    ? `兩人同屬「${tarotA.constellation.id} 號${tarotA.constellation.name}」（${tarotA.constellation.title}），核心靈魂母題一致，極容易在潛意識與價值觀上產生強烈共鳴。`
    : `${clientA.name}屬「${tarotA.constellation.name}」（${tarotA.constellation.title}），${clientB.name}屬「${tarotB.constellation.name}」（${tarotB.constellation.title}），雙方的原型交會能替彼此打開原本看不見的成長維度。`;

  const mirrorHits: Array<{
    direction: string;
    cardName: string;
    explanation: string;
  }> = [];

  const bCoreNumbers = new Set([
    tarotB.personalityCard.number,
    tarotB.soulCard.number,
  ]);
  for (const shadow of tarotA.shadowCards) {
    if (bCoreNumbers.has(shadow.number)) {
      mirrorHits.push({
        direction: `${clientB.name} 映照 ${clientA.name} 的導師／陰影牌`,
        cardName: `${shadow.displayNumber} ${shadow.name}`,
        explanation: `${clientB.name}與生俱來的核心原型，正好就是${clientA.name}家族中的隱藏課題牌「${shadow.name}」——${clientB.name}的存在會自然成為${clientA.name}突破盲點、走向完整的重要靈魂導師。`,
      });
    }
  }

  const aCoreNumbers = new Set([
    tarotA.personalityCard.number,
    tarotA.soulCard.number,
  ]);
  for (const shadow of tarotB.shadowCards) {
    if (aCoreNumbers.has(shadow.number)) {
      mirrorHits.push({
        direction: `${clientA.name} 映照 ${clientB.name} 的導師／陰影牌`,
        cardName: `${shadow.displayNumber} ${shadow.name}`,
        explanation: `${clientA.name}的核心原型正對應${clientB.name}的隱藏課題牌「${shadow.name}」——${clientA.name}的處事方式會成為${clientB.name}看見自己潛能與轉化慣性的重要鏡子。`,
      });
    }
  }

  return {
    relationType,
    targetDate,
    clientA,
    clientB,
    bazi: {
      dayMasterRelation,
      dayBranchRelation: {
        branchA: dayA.branch,
        branchB: dayB.branch,
        relationLabel: dayBranchCheck.label,
        tone: dayBranchCheck.tone,
        summary: dayBranchCheck.detail,
      },
      pillarInteractions,
      elementMatrix,
      bSupplementsA,
      aSupplementsB,
      sharedMissingElements,
      noblemanLinks,
    },
    ziwei: {
      aInB,
      bInA,
      aMingStem: mingA.heavenlyStem,
      aFliesToB,
      bMingStem: mingB.heavenlyStem,
      bFliesToA,
      starArchetypeMatch: {
        groupA: `${archA.group}（${archA.starsLabel}）`,
        groupB: `${archB.group}（${archB.starsLabel}）`,
        summary: archetypeSummary,
      },
      currentYearSync: {
        year: targetDate.slice(0, 4),
        aYearlySummary: `流年命宮落本命「${aYearlyPalace.name}」（${ziweiA.activeYearlyInfo.ganZhi}）${aYearlyMut ? `，流年祿：${aYearlyMut.lu}・忌：${aYearlyMut.ji}` : ''}`,
        bYearlySummary: `流年命宮落本命「${bYearlyPalace.name}」（${ziweiB.activeYearlyInfo.ganZhi}）${bYearlyMut ? `，流年祿：${bYearlyMut.lu}・忌：${bYearlyMut.ji}` : ''}`,
      },
    },
    tarot: {
      compositeRawNumber,
      compositeFormula,
      compositeCard,
      compositeRootCard,
      sameConstellation,
      constellationSummary,
      mirrorHits,
      yearCycleSync: {
        aYearCard: `${tarotA.currentYearCard.card.displayNumber} ${tarotA.currentYearCard.card.name}`,
        aNextSwitch: tarotA.nextSwitchDate,
        bYearCard: `${tarotB.currentYearCard.card.displayNumber} ${tarotB.currentYearCard.card.name}`,
        bNextSwitch: tarotB.nextSwitchDate,
      },
    },
  };
}
