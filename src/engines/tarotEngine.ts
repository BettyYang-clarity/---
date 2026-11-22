import {
  TarotArcanaInfo,
  TarotChartResult,
  TarotConstellation,
  TarotYearEntry,
} from '../types/holistic';

export const TAROT_CONSTELLATIONS: Record<number, TarotConstellation> = {
  1: {
    id: 1,
    name: '魔術師家族',
    title: '創造、顯化與主導權',
    theme: '將抽象靈感轉化為具體現實，在主動開創與順應流轉之間掌握生命舞台。',
    memberNumbers: [1, 10, 19],
  },
  2: {
    id: 2,
    name: '女祭師家族',
    title: '直覺、平衡與高階覺醒',
    theme: '傾聽內在靜默的智慧，透過客觀公允的判斷迎向靈魂的召喚與蛻變。',
    memberNumbers: [2, 11, 20],
  },
  3: {
    id: 3,
    name: '皇后家族',
    title: '豐盛、換位與圓滿整合',
    theme: '滋養生命與創造美感，懂得在懸置中轉換視角，最終完成階段性的大圓滿。',
    memberNumbers: [3, 12, 21],
  },
  4: {
    id: 4,
    name: '皇帝家族',
    title: '秩序、破舊與無畏新生',
    theme: '建立穩固的邊界與架構，同時具備斷捨離的勇氣與歸零重啟的純真信任。',
    memberNumbers: [4, 13, 22],
  },
  5: {
    id: 5,
    name: '教皇家族',
    title: '傳承、調和與中道實踐',
    theme: '連結傳統價值與深層信念，在對立能量中煉金般地調配出長遠和諧。',
    memberNumbers: [5, 14],
  },
  6: {
    id: 6,
    name: '戀人家族',
    title: '選擇、渴望與真實連結',
    theme: '誠實面對內心熱愛與執念，透過覺察慾望的本質做出忠於自我的抉擇。',
    memberNumbers: [6, 15],
  },
  7: {
    id: 7,
    name: '戰車家族',
    title: '駕馭、突破與結構重塑',
    theme: '以清晰意志推動目標前行，並在外在劇變來臨時果斷拆解舊有框架。',
    memberNumbers: [7, 16],
  },
  8: {
    id: 8,
    name: '力量家族',
    title: '柔韌、希望與內在療癒',
    theme: '以溫柔堅定馴服內在焦躁與本能，在漫長旅程中始終保持清澈信念與星光。',
    memberNumbers: [8, 17],
  },
  9: {
    id: 9,
    name: '隱者家族',
    title: '沉澱、潛意識與獨行明燈',
    theme: '向內深潛探問生命真相，穿越情緒迷霧與未知恐懼，成為照亮他人的引路者。',
    memberNumbers: [9, 18],
  },
};

export const MAJOR_ARCANA_MAP: Record<number, TarotArcanaInfo> = {
  0: {
    number: 0,
    displayNumber: '0 / 22',
    name: '愚者',
    englishName: 'The Fool',
    roman: '0 / XXII',
    constellationId: 4,
    keywords: ['歸零重啟', '無限潛能', '信任直覺', '跨界探索'],
    essence: '代表不受既有框架束縛的原初生命力，敢於在尚未看見全貌時邁出第一步。',
    lightSide: '靈活變通、保有初心、對新領域具備天然好奇心與開創勇氣。',
    shadowSide: '忽略現實風險、逃避責任承諾，或在關鍵收尾時因畏懼束縛而抽離。',
    growthLesson: '在擁抱自由探索的同時，為自己的選擇建立安穩的著陸點。',
  },
  1: {
    number: 1,
    displayNumber: '1',
    name: '魔術師',
    englishName: 'The Magician',
    roman: 'I',
    constellationId: 1,
    keywords: ['顯化能力', '資源整合', '專注意志', '溝通表達'],
    essence: '象徵將意念落實為物質成果的煉金術師，善於調動四元素資源開創新局。',
    lightSide: '反應敏銳、多才多藝、執行力與說服力俱佳，能主動創造機會。',
    shadowSide: '過度操控細節、自信過剩或因自我懷疑而遲遲不敢正式出手。',
    growthLesson: '以清澈初衷引導才華，讓技巧服務於真正有價值的長期目標。',
  },
  2: {
    number: 2,
    displayNumber: '2',
    name: '女祭師',
    englishName: 'The High Priestess',
    roman: 'II',
    constellationId: 2,
    keywords: ['深層直覺', '靜觀其變', '隱微洞察', '內在智慧'],
    essence: '守護表意識與潛意識之間的帷幕，擅長在沉默與留白中看見事件底層脈絡。',
    lightSide: '洞察力極強、氣質沉靜、能接收他人未明說的細微訊號與潛在趨勢。',
    shadowSide: '過度防備與疏離、猶豫不決，或因過度依賴等待而錯失表態時機。',
    growthLesson: '信任內在感知的同時，練習將洞見化為具體可執行的現實行動。',
  },
  3: {
    number: 3,
    displayNumber: '3',
    name: '皇后',
    englishName: 'The Empress',
    roman: 'III',
    constellationId: 3,
    keywords: ['豐盛滋養', '美感創造', '感官體驗', '母性包容'],
    essence: '大地豐饒與創作能量的化身，能讓專案、關係與生活環境在悉心灌溉中自然綻放。',
    lightSide: '溫暖具親和力、審美與創意出眾，善於打造舒適且高質感的成果。',
    shadowSide: '過度付出導致消耗、溺愛控制，或在壓力下陷入感官放縱與自我忽略。',
    growthLesson: '先充分滋養自己的身心能量，豐盛才能源源不絕地向外流動。',
  },
  4: {
    number: 4,
    displayNumber: '4',
    name: '皇帝',
    englishName: 'The Emperor',
    roman: 'IV',
    constellationId: 4,
    keywords: ['結構秩序', '決策領導', '界線守護', '穩健實踐'],
    essence: '代表建立規則、扛起責任與長期佈局的王者原型，擅長將混亂梳理為可運轉的系統。',
    lightSide: '邏輯清晰、抗壓可靠、目標導向，能在不確定中成為眾人的定海神針。',
    shadowSide: '過度僵化、控制欲強、難以示弱，或對不在計畫內的變數過度焦慮。',
    growthLesson: '在原則與彈性之間取得平衡，允許自己偶爾放下鎧甲接納未知。',
  },
  5: {
    number: 5,
    displayNumber: '5',
    name: '教皇',
    englishName: 'The Hierophant',
    roman: 'V',
    constellationId: 5,
    keywords: ['系統傳承', '價值信念', '導師啟發', '文化典範'],
    essence: '串聯古老智慧與當代實踐的橋樑，重視原則、倫理與可被傳承的知識體系。',
    lightSide: '具公信力與教導天賦、重視承諾，能在組織或專業領域建立長期聲望。',
    shadowSide: '墨守成規、過度在意體制認同，或對不合自身標準的新觀點過早排斥。',
    growthLesson: '辨別哪些傳統是滋養靈魂的根基，哪些只是需要更新的舊規則。',
  },
  6: {
    number: 6,
    displayNumber: '6',
    name: '戀人',
    englishName: 'The Lovers',
    roman: 'VI',
    constellationId: 6,
    keywords: ['核心價值', '深度連結', '關鍵抉擇', '真誠共鳴'],
    essence: '不僅關乎親密關係，更象徵在人生分岔口對「真正熱愛與認同之事」的承諾。',
    lightSide: '共情力高、關係經營真誠，能在合作與伴侶關係中創造彼此成就的磁場。',
    shadowSide: '在選項之間搖擺逃避、為討好他人而違背內心價值觀。',
    growthLesson: '每一次清晰取捨都在定義自己，選擇與內在價值一致的道路。',
  },
  7: {
    number: 7,
    displayNumber: '7',
    name: '戰車',
    englishName: 'The Chariot',
    roman: 'VII',
    constellationId: 7,
    keywords: ['意志駕馭', '開疆拓土', '自我突破', '動能推進'],
    essence: '象徵駕馭內在矛盾張力、鎖定方向全速推進的勝利原型，在行動中鍛造實力。',
    lightSide: '企圖心明確、執行迅速、面對逆境愈戰愈勇，具備強大專案推進力。',
    shadowSide: '急於求成而忽略情緒訊號、過度防衛，或因方向失焦而陷入內耗。',
    growthLesson: '學會收放節奏，真正的掌控來自內在穩定而非單純加速。',
  },
  8: {
    number: 8,
    displayNumber: '8',
    name: '力量',
    englishName: 'Strength',
    roman: 'VIII',
    constellationId: 8,
    keywords: ['以柔克剛', '內在勇氣', '情緒轉化', '長期耐力'],
    essence: '不是靠硬碰硬征服，而是以慈悲、自信與穩定氣場安撫內在獅子般的本能衝動。',
    lightSide: '韌性極強、沉穩大氣、能溫和化解高壓衝突並給予旁人深層安定感。',
    shadowSide: '壓抑真實憤怒、過度隱忍，或陷入自我懷疑導致能量低落。',
    growthLesson: '接納內在的熱情與脆弱，讓真實情感化為溫厚而不可動搖的力量。',
  },
  9: {
    number: 9,
    displayNumber: '9',
    name: '隱者',
    englishName: 'The Hermit',
    roman: 'IX',
    constellationId: 9,
    keywords: ['深度沉思', '獨立求真', '專業精進', '心靈明燈'],
    essence: '暫離塵囂以提煉純粹洞見的智者，善於在獨處中整理經驗並成為深耕領域的專家。',
    lightSide: '思慮周密、不隨波逐流、擁有極高自我覺察力與專業沉澱深度。',
    shadowSide: '過度孤立疏離、完美主義拖延，或因害怕不被理解而拒絕外界協助。',
    growthLesson: '獨處是為了蓄能與明理，適時分享手中微光能讓智慧發揮更大影響。',
  },
  10: {
    number: 10,
    displayNumber: '10',
    name: '命運之輪',
    englishName: 'Wheel of Fortune',
    roman: 'X',
    constellationId: 1,
    keywords: ['週期轉折', '機緣乘勢', '順應變化', '格局躍升'],
    essence: '揭示萬物循環與時機共振的法則，懂得在高低起伏的節奏裡站穩輪軸核心。',
    lightSide: '嗅覺敏銳、善於捕捉時代與產業風口，能從變動中開創全新賽道。',
    shadowSide: '抗拒不可避免的轉折、過度依賴運氣，或在低谷期喪失主動定力。',
    growthLesson: '外在境遇皆有週期，守住內在中心便能在每次轉輪中順勢升級。',
  },
  11: {
    number: 11,
    displayNumber: '11',
    name: '正義',
    englishName: 'Justice',
    roman: 'XI',
    constellationId: 2,
    keywords: ['因果平衡', '客觀明辨', '契約誠信', '清醒決斷'],
    essence: '以清明理性衡量利弊與責任歸屬，主張每份投入終將迎來對等的回響。',
    lightSide: '公平正直、分析精準、重視承諾與契約精神，適合處理關鍵決策與協商。',
    shadowSide: '過度苛責自己與他人、非黑即白，或陷入反覆權衡而停滯不前。',
    growthLesson: '在堅持真理與法則的同時，為人性與過程保留一份寬容與溫度。',
  },
  12: {
    number: 12,
    displayNumber: '12',
    name: '吊人',
    englishName: 'The Hanged Man',
    roman: 'XII',
    constellationId: 3,
    keywords: ['換位思考', '主動留白', '破框悟道', '沉澱醞釀'],
    essence: '當慣性前進遇阻時，透過倒置視角與自願暫停，看見多數人忽略的逆向解方。',
    lightSide: '創意獨到、不拘泥世俗眼光、能在停頓期完成高價值的思維重構。',
    shadowSide: '無謂犧牲討好、陷入受害者心態，或長期停滯不敢做出實質改變。',
    growthLesson: '分辨「有智慧的等待」與「被動的拖延」，悟透後即刻鬆綁前行。',
  },
  13: {
    number: 13,
    displayNumber: '13',
    name: '死神',
    englishName: 'Death',
    roman: 'XIII',
    constellationId: 4,
    keywords: ['徹底蛻變', '斷捨更新', '週期收束', '重生序幕'],
    essence: '象徵自然界最純粹的汰舊換新力量，唯有讓過時的角色與模式落幕，新生才能萌芽。',
    lightSide: '具備極強的重生與危機轉型能力，能果斷清理冗餘、直指核心本質。',
    shadowSide: '緊抓已失去活力的關係或習慣、恐懼失去控制而拉長陣痛期。',
    growthLesson: '允許舊篇章優雅謝幕，空出來的雙手才能承接下一個階段的禮物。',
  },
  14: {
    number: 14,
    displayNumber: '14',
    name: '節制',
    englishName: 'Temperance',
    roman: 'XIV',
    constellationId: 5,
    keywords: ['跨界融合', '中道平衡', '療癒節律', '耐心煉金'],
    essence: '將看似對立的元素緩緩調和為更高級的整體，追求長期可持續的節奏與和諧。',
    lightSide: '協調力佳、情緒穩定、擅長整合不同團隊或跨領域知識創造綜效。',
    shadowSide: '過度求穩而缺乏爆發力、壓抑極端需求，或因節奏失調而耗損身心。',
    growthLesson: '在動態微調中校準生活與工作的黃金比例，慢即是穩、穩即是快。',
  },
  15: {
    number: 15,
    displayNumber: '15',
    name: '惡魔',
    englishName: 'The Devil',
    roman: 'XV',
    constellationId: 6,
    keywords: ['物質野心', '執念覺察', '強大張力', '打破枷鎖'],
    essence: '映照人性最深層的渴望、權力與物質驅力，同時提醒人們看清自己親手套上的心靈鎖鏈。',
    lightSide: '商業嗅覺與企圖心極強、魅力鮮明，能把強大慾望轉化為驚人的世俗成就。',
    shadowSide: '過度執著於掌控、金錢或依賴關係，在焦慮中受制於短期誘惑。',
    growthLesson: '誠實直視渴望而不被其奴役，覺察本身就是解開束縛的鑰匙。',
  },
  16: {
    number: 16,
    displayNumber: '16',
    name: '高塔',
    englishName: 'The Tower',
    roman: 'XVI',
    constellationId: 7,
    keywords: ['破除虛妄', '瞬間頓悟', '結構重整', '真實解放'],
    essence: '如閃電般擊碎不再穩固的外殼與假象，雖具震撼力，卻是為了讓真實地基重見天日。',
    lightSide: '改革魄力驚人、敢於揭露問題根源，能在巨變中迅速重建更真實的格局。',
    shadowSide: '壓抑累積直至劇烈爆發、抗拒必要改革，或因恐懼動盪而停留在脆弱現狀。',
    growthLesson: '主動進行微調與真實對話，便無須等待外力來強行拆除舊框架。',
  },
  17: {
    number: 17,
    displayNumber: '17',
    name: '星星',
    englishName: 'The Star',
    roman: 'XVII',
    constellationId: 8,
    keywords: ['遠見願景', '純粹療癒', '靈感泉湧', '希望引領'],
    essence: '風暴過後的清澈夜空，象徵回歸本真、重新連結理想與宇宙祝福的療癒頻率。',
    lightSide: '具前瞻視野與感染力、心胸開闊，能為團隊與他人帶來希望與方向感。',
    shadowSide: '過度理想化而脫離現實執行、或因期待落空陷入短暫失落與自我懷疑。',
    growthLesson: '將高遠的星光願景拆解為每日踏實的一步，讓理想真正落地生根。',
  },
  18: {
    number: 18,
    displayNumber: '18',
    name: '月亮',
    englishName: 'The Moon',
    roman: 'XVIII',
    constellationId: 9,
    keywords: ['潛意識海', '夢境直覺', '穿越迷霧', '藝術感知'],
    essence: '探索理性疆界之外的幽微地帶，敏銳感知情緒暗流、集體心理與象徵意象。',
    lightSide: '想像力與同理心豐富、極具藝術與心理洞察天賦，能讀懂人心深處。',
    shadowSide: '容易過度腦補焦慮、受恐懼投影影響判斷，或在模糊處境中迷失界線。',
    growthLesson: '區分「直覺預感」與「恐懼幻想」，帶著覺知穩步穿越迷霧。',
  },
  19: {
    number: 19,
    displayNumber: '19',
    name: '太陽',
    englishName: 'The Sun',
    roman: 'XIX',
    constellationId: 1,
    keywords: ['光明綻放', '坦誠自信', '生命喜悅', '影響力舞台'],
    essence: '最純粹的陽性能量與清晰意識，象徵毫不掩飾地活出本色並照亮周遭世界。',
    lightSide: '樂觀大方、真誠有感染力、思維明朗，容易在公開舞台獲得肯定與貴人相助。',
    shadowSide: '過度在意聚光燈評價、報喜不報憂，或因自我要求過高而感到燃燒殆盡。',
    growthLesson: '允許陰影與脆弱同樣存在，真誠不偽裝的光芒最具長久魅力。',
  },
  20: {
    number: 20,
    displayNumber: '20',
    name: '審判',
    englishName: 'Judgement',
    roman: 'XX',
    constellationId: 2,
    keywords: ['靈魂召喚', '總結昇華', '寬恕釋懷', '使命覺醒'],
    essence: '聽見生命深處的號角，整合過往所有歷練，從舊我中甦醒並回應更高的天命呼喚。',
    lightSide: '格局宏大、善於複盤提煉人生經驗，能在關鍵時刻做出翻轉命運的決定。',
    shadowSide: '過度自我批判、沉溺過往懊悔，或因害怕承擔使命而延遲回應內心召喚。',
    growthLesson: '放下對過去的嚴苛審判，將所有經歷都轉化為邁向新階段的底氣。',
  },
  21: {
    number: 21,
    displayNumber: '21',
    name: '世界',
    englishName: 'The World',
    roman: 'XXI',
    constellationId: 3,
    keywords: ['圓滿集成', '國際視野', '系統完成', '新週期門檻'],
    essence: '大阿爾克那旅程的巔峰整合，代表歷經考驗後達成內外和諧與格局圓滿。',
    lightSide: '視野開闊、整合能力卓越、具備完成大型跨界專案並收穫豐碩成果的天賦。',
    shadowSide: '在最後一哩路缺乏收尾耐性，或過度追求完美圓滿而害怕開啟下段未知。',
    growthLesson: '慶祝每個階段的完成，同時以開放心胸迎接更高層次的新循環。',
  },
};

export function getArcanaByNumber(num: number): TarotArcanaInfo {
  if (num === 22 || num === 0) return MAJOR_ARCANA_MAP[0];
  return MAJOR_ARCANA_MAP[num] ?? MAJOR_ARCANA_MAP[0];
}

function sumDigits(n: number): number {
  return String(Math.abs(n))
    .split('')
    .reduce((acc, ch) => acc + Number(ch), 0);
}

/**
 * Reduce a number by summing its digits repeatedly until <= 22.
 */
function reduceToArcana(initialSum: number): number {
  let current = sumDigits(initialSum);
  while (current > 22) {
    current = sumDigits(current);
  }
  return current;
}

/**
 * Reduce a two-digit arcana (10..22) to its single-digit root (1..9).
 */
function reduceToSingleDigit(num: number): number {
  let current = num;
  while (current > 9) {
    current = sumDigits(current);
  }
  return current;
}

function formatDateYMD(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function getPreviousDayYMD(year: number, month: number, day: number): string {
  const dt = new Date(year, month - 1, day);
  dt.setDate(dt.getDate() - 1);
  return formatDateYMD(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

/**
 * Calculate Mary K. Greer Year Card for a specific personal cycle year.
 */
function computeYearEntry(
  birthMonth: number,
  birthDay: number,
  cycleYear: number,
  isCurrent: boolean
): TarotYearEntry {
  const sum = birthMonth + birthDay + cycleYear;
  const rawNumber = reduceToArcana(sum);
  const card = getArcanaByNumber(rawNumber);
  const rootNum = rawNumber >= 10 ? reduceToSingleDigit(rawNumber) : null;
  const rootCard = rootNum !== null ? getArcanaByNumber(rootNum) : null;

  const periodStart = formatDateYMD(cycleYear, birthMonth, birthDay);
  const periodEnd = getPreviousDayYMD(cycleYear + 1, birthMonth, birthDay);

  return {
    cycleYear,
    periodStart,
    periodEnd,
    card,
    rawNumber,
    rootCard,
    isCurrent,
  };
}

/**
 * Pure mathematical calculation for Mary K. Greer Birthday Tarot.
 */
export function calculateTarotChart(
  solarBirthDate: string,
  targetDateStr: string
): TarotChartResult {
  const [bYear, bMonth, bDay] = solarBirthDate.split('-').map(Number);
  const [tYear, tMonth, tDay] = targetDateStr.split('-').map(Number);

  // 1. Personality & Soul Card
  const birthSum = bMonth + bDay + bYear;
  const birthSumFormula = `${bMonth} + ${bDay} + ${bYear} = ${birthSum}`;
  const personalityRawNumber = reduceToArcana(birthSum);
  const personalityCard = getArcanaByNumber(personalityRawNumber);

  const isSpecialCase19 = personalityRawNumber === 19;
  const isSamePersonalitySoul = personalityRawNumber <= 9;

  const soulNumber = isSamePersonalitySoul
    ? personalityRawNumber
    : reduceToSingleDigit(personalityRawNumber);
  const soulCard = getArcanaByNumber(soulNumber);

  // Special case 19 trio: 19 太陽 - 10 命運之輪 - 1 魔術師
  const specialTrioCards = isSpecialCase19
    ? [getArcanaByNumber(19), getArcanaByNumber(10), getArcanaByNumber(1)]
    : [];

  // 2. Constellation & Shadow / Hidden Factor Cards
  const constellation = TAROT_CONSTELLATIONS[soulNumber];
  const appearedNumbers = new Set<number>();
  if (isSpecialCase19) {
    appearedNumbers.add(19);
    appearedNumbers.add(10);
    appearedNumbers.add(1);
  } else {
    appearedNumbers.add(personalityRawNumber);
    appearedNumbers.add(soulNumber);
  }

  const shadowCards = constellation.memberNumbers
    .filter((n) => !appearedNumbers.has(n))
    .map((n) => getArcanaByNumber(n));

  // 3. Personal Year Card (Birthday-to-Birthday cycle)
  const beforeBirthday =
    tMonth < bMonth || (tMonth === bMonth && tDay < bDay);
  const currentCycleYear = beforeBirthday ? tYear - 1 : tYear;
  const nextSwitchDate = formatDateYMD(currentCycleYear + 1, bMonth, bDay);

  const currentYearCard = computeYearEntry(bMonth, bDay, currentCycleYear, true);

  const yearTrajectory: TarotYearEntry[] = [-2, -1, 0, 1, 2].map((offset) =>
    computeYearEntry(bMonth, bDay, currentCycleYear + offset, offset === 0)
  );

  return {
    birthSum,
    birthSumFormula,
    personalityRawNumber,
    personalityCard,
    soulCard,
    isSamePersonalitySoul,
    isSpecialCase19,
    specialTrioCards,
    constellation,
    shadowCards,
    currentYearCard,
    nextSwitchDate,
    yearTrajectory,
  };
}
