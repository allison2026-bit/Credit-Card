export interface AuditIssue {
  id: string;
  cardName: string;
  severity: 'error' | 'missing' | 'verified';
  column: string;
  originalText: string;
  correctedText: string;
  explanation: string;
}

export interface CreditCardRecord {
  id: string;
  name: string;
  issuer: 'Chase' | 'Amex' | 'Citi' | 'Discover';
  network: 'Visa' | 'Mastercard' | 'Amex' | 'Discover';
  annualFee: number;
  annualFeeNote: string;
  rewardsCurrency: string;
  foreignTxFee: string;
  // Original Table Fields
  original: {
    chaseTravelCredit: string;
    airlineCredit: string;
    hotelStatus: string;
    primaryRewards: string;
    otherRewards: string;
    annualFeeText: string;
  };
  // Corrected & Expanded Fields (2026 Accurate)
  corrected: {
    chaseTravelCredit: string;
    airlineCredit: string;
    hotelStatus: string;
    primaryRewards: string;
    otherRewards: string;
    keyAnnualPerks: string;
    annualFeeText: string;
  };
  // Concise Short Fields for Simplified Mobile/Table View
  shortSummary?: {
    hotelCredit: string;
    airlineCredit: string;
    hotelStatus: string;
    primaryRewards: string;
    otherRewards: string;
    keyPerks: string;
  };
  estimatedAnnualPerkValue: number;
  hasAuditChanges: boolean;
  auditSummary: string;
}

export interface BenefitMonthState {
  month: number;
  label: string;
  amount: number;
  state: 'used' | 'expired' | 'available';
}

export interface BenefitTrackerItem {
  id: string;
  cardId: string;
  cardName: string;
  benefitTitle: string;
  shortTitle: string;
  category: '飯店折抵' | '航空報銷' | '免房券 (FNA)' | '生活與外送' | '通關與旅遊保障' | '刷卡滿額禮';
  cadence: '每年' | '每半年' | '每帳戶周年' | '每半年 (1-6月 / 7-12月)' | '每季' | '每季 (年 $100)' | '每月' | '每曆年' | '每 4 年' | '一次性 / 限時';
  deadlineOrReset: string;
  maxValue: number;
  usedValue: number;
  expiredValue: number;
  recordedDate: string;
  status: '未使用' | '部分使用' | '已用畢' | '部分過期' | '已過期';
  activationRequired: boolean;
  notes: string;
  monthlyStates?: BenefitMonthState[];
  calendarAlertLabel?: string;
  calendarAlertRuleId?: string;
}

export interface SpendCapTrackerItem {
  id: string;
  cardName: string;
  programName: string;
  period: string;
  categoryDescription: string;
  rewardRate: string;
  spendCap: number;
  currentSpend: number;
  activated: boolean;
  notes: string;
}

export interface CategoryBestCard {
  id: string;
  category: string;
  bestCard: string;
  multiplier: string;
  effectiveReturnNote: string;
  runnerUpCard: string;
  tips: string;
}

export const AUDIT_ISSUES: AuditIssue[] = [
  {
    id: 'audit-ihg-airline',
    cardName: 'Chase IHG One Rewards Premier',
    severity: 'error',
    column: '航空帳單回饋 / 飯店折抵',
    originalText: '—（原表空白）',
    correctedText:
      '每年最高 $50 United TravelBank Cash + 2026/2027 改版新增每年官網直購機票滿 $250 折 $100 + 每季 $25 IHG 飯店餐飲折抵 (年 $100)',
    explanation:
      '原表在「航空帳單回饋」欄誤標為「—」。實際上 IHG Premier 享每曆年 $50 UA TravelBank Cash；且 2026/2027 最新改版更重磅加入每年機票滿 $250 折 $100 航空折抵與每季 $25 飯店餐飲額度（每年最高 $100）！',
  },
  {
    id: 'audit-ihg-other',
    cardName: 'Chase IHG One Rewards Premier',
    severity: 'missing',
    column: '主要回饋 / 會籍 / 其他回饋 (2026/10 最新改版)',
    originalText: '使用點數連住 4 晚，第 4 晚免點數；每年周年免房券',
    correctedText:
      '5x 加碼類別（機票/租車/餐飲/超市/加油）；其他 3x；周年免房券升級至 50,000 點；每年送 15 晚定級房晚；現有卡友保留白金會籍至 2027 底；$120 Global Entry；年刷 $20k 送 $100+10k點',
    explanation:
      'Chase 於 2026/2027 針對 IHG Premier 大幅改版升級：免房券上限由 40k 調升至 50k 點；5x 新增生鮮超市、直購機票與租車；年費將自 $99 調升至 $150（現有卡友 2027 續卡前仍享 $99）；現有持卡人保留白金會籍至 2027/12/31 並享每年 15 晚定級房晚。',
  },
  {
    id: 'audit-csp-2026',
    cardName: 'Chase Sapphire Preferred',
    severity: 'missing',
    column: '主要回饋 / 其他回饋',
    originalText: '指定類別每美元 3 點；其他旅遊每美元 2 點；其他消費每美元 1 點',
    correctedText:
      '3x 類別明細（餐飲、線上買菜、串流、2026/6 新增之加油/充電與度假屋租賃）；Lyft 5x；每月 $10 DoorDash 非餐廳折抵 + 免費 DashPass；$120 Global Entry/TSA PreCheck；1 年 Apple TV+',
    explanation:
      '原表之「$100 Chase Travel 飯店折抵」符合 2026/6/15 最新改版！但漏列了每月 $10 DoorDash 折抵（年省 $120）、2026 新增的 $120 Global Entry/TSA 報銷、Lyft 5x，以及 3x 具體類別（含新增的加油/EV充電與 Airbnb/Vrbo 度假屋租賃）。',
  },
  {
    id: 'audit-hyatt-nights',
    cardName: 'Chase World of Hyatt Visa',
    severity: 'missing',
    column: '飯店會籍 / 其他回饋',
    originalText: 'World of Hyatt Discoverist ／ 指定類別每美元 2 點；其他消費每美元 1 點；每年周年免房券',
    correctedText:
      '每年自動送 5 晚定級房晚 + 每刷 $5,000 再送 2 晚定級房晚；曆年刷滿 $15,000 加送第 2 張 Cat 1–4 免房券；2x 類別為餐飲/直購機票/交通通勤/健身房',
    explanation:
      'World of Hyatt 聯名卡最核心的兩大福利為「每年自動送 5 晚定級房晚（每刷 $5k 再送 2 晚）」與「曆年消費滿 $15,000 加送第 2 張 Cat 1–4 免房券」，原表未列出，且未註明免房券為 Category 1–4 等級。',
  },
  {
    id: 'audit-marriott-nights',
    cardName: 'Chase Marriott Bonvoy Boundless',
    severity: 'missing',
    column: '飯店會籍 / 其他回饋',
    originalText: 'Marriott Bonvoy Silver Elite ／ 每年周年免房券；指定類別每美元 3 點；其他消費每美元 2 點',
    correctedText:
      '每年自動送 15 晚定級房晚 + 每刷 $5,000 送 1 晚；曆年刷滿 $35,000 升 Gold Elite；周年免房券為 35,000 點（可加 15k 點 Top-off）；3x 類別為前 $6,000 買菜/加油/餐飲',
    explanation:
      '原表已正確納入 2026–2027 限時每半年滿 $250 折 $50 航空回饋，但漏列每年自動贈送 15 晚定級房晚（15 Elite Night Credits）、周年免房券 35k 點數上限與 3x 類別每年 $6,000 總額上限。',
  },
  {
    id: 'audit-hilton-base',
    cardName: 'Hilton Honors American Express',
    severity: 'missing',
    column: '其他回饋',
    originalText: '美國餐廳、加油站及超市每美元 5 點',
    correctedText: '美國餐廳、加油站及超市每美元 5 點；其他所有一般消費每美元 3 點；Silver 會籍享點數連住第 5 晚免費；無海外交易手續費',
    explanation:
      '原表漏列「其他一般消費每美元 3 點」，以及憑 Silver Elite 會籍即可享有的「點數房連住第 5 晚免點數（5th Night Free）」與免海外交易手續費。',
  },
  {
    id: 'audit-ur-synergy',
    cardName: 'Chase Freedom Flex / Unlimited / Ink Unlimited',
    severity: 'missing',
    column: '其他回饋（點數連動）',
    originalText: '僅標示百分比現金回饋（5% / 3% / 1.5% / 1%）',
    correctedText:
      '累積皆為 Chase Ultimate Rewards (UR) 點數，可合併轉入 Chase Sapphire Preferred 以 1:1 轉點航空/飯店夥伴；Freedom 雙卡亦享 Lyft 5%（至 2027/9/30）與 Freedom Flex $800 手機保險',
    explanation:
      '因為您同時持有 Chase Sapphire Preferred (CSP)，Freedom Flex、Freedom Unlimited 與 Ink Business Unlimited 的回饋實際上都是 UR 點數，轉入 CSP 後價值可從 1¢/pt 提升至 1.5¢–2.0¢/pt。',
  },
];

export const CREDIT_CARDS: CreditCardRecord[] = [
  {
    id: 'csp',
    name: 'Chase Sapphire Preferred',
    issuer: 'Chase',
    network: 'Visa',
    annualFee: 95,
    annualFeeNote: '$95',
    rewardsCurrency: 'Chase Ultimate Rewards (UR)',
    foreignTxFee: '$0 無海外手續費',
    original: {
      chaseTravelCredit: '每帳戶周年年度最高 $100',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: 'Chase Travel 消費每美元 5 點',
      otherRewards: '指定類別每美元 3 點；其他旅遊每美元 2 點；其他消費每美元 1 點',
      annualFeeText: '$95',
    },
    corrected: {
      chaseTravelCredit: '每帳戶周年最高 $100（2026/6/15 起由 $50 調升至 $100，自動折抵無需登錄）',
      airlineCredit: '—',
      hotelStatus: '—（可 1:1 轉點至 IHG / Marriott，或以 4:3 轉點至 Hyatt）',
      primaryRewards: 'Chase Travel 旅遊預訂 5x；Lyft 乘車 5x（至 2027/9/30）',
      otherRewards:
        '3x 指定類別：全球餐飲、線上生鮮雜貨、串流服務、加油與電動車充電（2026/6 新增）、度假屋租賃 Airbnb/Vrbo（2026/6 新增）；其他旅遊 2x；一般消費 1x',
      keyAnnualPerks:
        '每月 $10 DoorDash 非餐廳折抵（每年共 $120）+ 免費 DashPass（至 2027/12/31）；$120 Global Entry / TSA PreCheck / NEXUS 報銷（每4年）；1 年 Apple TV+；Primary 租車險',
      annualFeeText: '$95',
    },
    shortSummary: {
      hotelCredit: '每年 $100 折抵',
      airlineCredit: '—',
      hotelStatus: '1:1 轉點夥伴',
      primaryRewards: 'Chase Travel 5x · Lyft 5x',
      otherRewards: '餐飲/網購菜/串流/加油/Airbnb 3x · 旅遊 2x',
      keyPerks: 'DoorDash $10/月 · GE/TSA $120 · 一級租車險',
    },
    estimatedAnnualPerkValue: 250,
    hasAuditChanges: true,
    auditSummary: '確認 $100 飯店折抵正確；補齊 3x 五大類別、每月 $10 DoorDash 折抵、$120 Global Entry 與 Lyft 5x',
  },
  {
    id: 'ihg-premier',
    name: 'Chase IHG One Rewards Premier',
    issuer: 'Chase',
    network: 'Mastercard',
    annualFee: 99,
    annualFeeNote: '$99 (新辦或2027續卡$150)',
    rewardsCurrency: 'IHG One Rewards Points',
    foreignTxFee: '$0 無海外手續費',
    original: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: 'IHG Platinum Elite；年度消費滿 $40,000 可取得 Diamond Elite（至翌年年底）',
      primaryRewards: 'IHG 住宿最高每美元 26 點',
      otherRewards: '使用點數連住 4 晚，第 4 晚免點數；每年周年免房券',
      annualFeeText: '$99',
    },
    corrected: {
      chaseTravelCredit: '每季 $25 IHG 飯店餐飲額度 (年最高 $100，2026/2027 改版新福利，掛帳房帳折抵)',
      airlineCredit:
        '每年最高 $50 UA TravelBank Cash（1/5 與 7/5 各發 $25）+ 2026/2027 改版新增每年航空公司官網直購機票滿 $250 折 $100（有效至 2027/12/31）',
      hotelStatus:
        'IHG Platinum Elite（現有持卡人保障保留至 2027/12/31；新持卡人或 2028 起為 Gold Elite）；每年自動贈送 15 晚定級房晚（2027/1/1 起生效入帳）；單一曆年消費滿 $40,000 升 Diamond Elite',
      primaryRewards:
        'IHG 旗下飯店消費最高 26x（含持卡 10x + IHG 會員 10x + 現有白金會籍加碼 6x；金卡為 24x）',
      otherRewards:
        '5x 五大生活與旅遊加碼：生鮮超市 (Grocery Stores)、航空公司官網直購機票、租車、加油站、全球餐飲；其他所有一般消費 3x',
      keyAnnualPerks:
        '每年周年免房券（上限升級至 50,000 點，2026 年續卡 40k、2027 年起全面 50k，支援無上限加點 Top-off）；每曆季 $25 IHG 飯店餐飲折抵（年省 $100）；點數連住 4 晚第 4 晚免點數；$120 Global Entry/TSA PreCheck（每4年）；每年消費滿 $20,000 送 $100 折抵 + 10,000 點；買點數 8 折',
      annualFeeText: '$99 (現有卡友至 2027 續卡前 $99；新申辦 $150)',
    },
    shortSummary: {
      hotelCredit: '每季 $25 飯店餐飲 (年 $100)',
      airlineCredit: '每年 $100 機票折抵 + $50 UA TravelBank',
      hotelStatus: 'Platinum (至2027底) + 年送 15 晚',
      primaryRewards: 'IHG 住宿最高 26x',
      otherRewards: '超市/機票/租車/加油/餐飲 5x · 其他 3x',
      keyPerks: '周年 50k 免房券 · 點數住4送1 · GE/TSA $120',
    },
    estimatedAnnualPerkValue: 480,
    hasAuditChanges: true,
    auditSummary:
      '納入 2026/10 最新改版：新增每季 $25 飯店餐飲 (年 $100) 與每年 $100 機票折抵；免房券升級 50k 點；5x 新增超市/機票/租車；年送 15 晚房晚；保留白金會籍至 2027 底',
  },
  {
    id: 'hyatt',
    name: 'Chase World of Hyatt Visa',
    issuer: 'Chase',
    network: 'Visa',
    annualFee: 95,
    annualFeeNote: '$95',
    rewardsCurrency: 'World of Hyatt Points',
    foreignTxFee: '$0 無海外手續費',
    original: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: 'World of Hyatt Discoverist',
      primaryRewards: 'Hyatt 住宿最高每美元 9 點（含 Hyatt 會員基本點數）',
      otherRewards: '指定類別每美元 2 點；其他消費每美元 1 點；每年周年免房券',
      annualFeeText: '$95',
    },
    corrected: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus:
        'World of Hyatt Discoverist；每年自動獲贈 5 晚定級房晚 (Qualifying Nights)；每消費 $5,000 再送 2 晚定級房晚（無上限）',
      primaryRewards: 'Hyatt 旗下住宿與消費最高 9x（含持卡 4x + Hyatt 基本會員 5x）',
      otherRewards:
        '2x 指定類別：餐廳、航空公司直購機票、本地通勤與交通、健身房與健身俱樂部會籍；其他消費 1x',
      keyAnnualPerks:
        '每年帳戶周年贈 1 張 Category 1–4 標準免房券；單一曆年消費滿 $15,000 再贈第 2 張 Category 1–4 免房券',
      annualFeeText: '$95',
    },
    shortSummary: {
      hotelCredit: '—',
      airlineCredit: '—',
      hotelStatus: 'Discoverist + 每年送 5 晚房晚',
      primaryRewards: 'Hyatt 住宿最高 9x',
      otherRewards: '餐飲/機票/交通/健身房 2x · 其他 1x',
      keyPerks: '周年 Cat 1-4 免房券 · 年刷 $15k 再送 1 張',
    },
    estimatedAnnualPerkValue: 220,
    hasAuditChanges: true,
    auditSummary: '補齊每年自動 5 晚定級房晚、每刷 $5k 送 2 晚、曆年刷滿 $15k 送第 2 張 Cat 1-4 免房券與 2x 類別明細',
  },
  {
    id: 'marriott-boundless',
    name: 'Chase Marriott Bonvoy Boundless',
    issuer: 'Chase',
    network: 'Visa',
    annualFee: 95,
    annualFeeNote: '$95',
    rewardsCurrency: 'Marriott Bonvoy Points',
    foreignTxFee: '$0 無海外手續費',
    original: {
      chaseTravelCredit: '—',
      airlineCredit: '符合條件的航空公司直購消費，每半年滿 $250 折抵 $50，最高 $100（優惠至 2027/6/30）',
      hotelStatus: 'Marriott Bonvoy Silver Elite',
      primaryRewards: 'Marriott 住宿最高每美元 17 點（含 Bonvoy 會員及會籍點數）',
      otherRewards: '每年周年免房券；指定類別每美元 3 點；其他消費每美元 2 點',
      annualFeeText: '$95',
    },
    corrected: {
      chaseTravelCredit: '—',
      airlineCredit:
        '航空公司直購消費，每半年（1–6月、7–12月）滿 $250 折抵 $50，每年最高 $100（限時優惠至 2027/6/30）',
      hotelStatus:
        'Marriott Bonvoy Silver Elite；每年自動送 15 晚定級房晚 (Elite Night Credits)；每刷 $5,000 送 1 晚定級房晚；曆年刷滿 $35,000 升 Gold Elite',
      primaryRewards: 'Marriott 旗下飯店最高 17x（含持卡 6x + 會員 10x + Silver 會籍 1x）',
      otherRewards:
        '3x 指定類別：每年合計前 $6,000 之生鮮雜貨 (Grocery)、加油站 (Gas)、餐廳 (Dining) 消費；其他一般消費 2x',
      keyAnnualPerks:
        '每年周年贈 1 張 35,000 點免房券（支援自費加點 Top-off 最多 15,000 點，可兌換最高 50,000 點房晚）',
      annualFeeText: '$95',
    },
    shortSummary: {
      hotelCredit: '—',
      airlineCredit: '每半年機票滿 $250 折 $50 (年 $100)',
      hotelStatus: 'Silver Elite + 每年送 15 晚房晚',
      primaryRewards: 'Marriott 住宿最高 17x',
      otherRewards: '超市/加油/餐飲 3x (前$6k) · 其他 2x',
      keyPerks: '周年 35k 免房券 (可加 15k 點)',
    },
    estimatedAnnualPerkValue: 260,
    hasAuditChanges: true,
    auditSummary: '補齊每年 15 晚定級房晚、每刷 $5k 送 1 晚、周年 35k 免房券 Top-off 規則與 3x 類別 $6,000 上限',
  },
  {
    id: 'hilton-amex',
    name: 'Hilton Honors American Express',
    issuer: 'Amex',
    network: 'Amex',
    annualFee: 0,
    annualFeeNote: '$0',
    rewardsCurrency: 'Hilton Honors Points',
    foreignTxFee: '$0 無海外手續費',
    original: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: 'Hilton Honors Silver；年消費滿 $20,000 可升 Gold，至翌年年底',
      primaryRewards: 'Hilton 合格消費每美元 7 點',
      otherRewards: '美國餐廳、加油站及超市每美元 5 點',
      annualFeeText: '$0',
    },
    corrected: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: 'Hilton Honors Silver Elite；單一曆年消費滿 $20,000 可升等至 Gold Elite（至次年年底）',
      primaryRewards: 'Hilton 旗下飯店消費 7x（另加會員基本 10x + Silver 加碼 2x = 合計 19x）',
      otherRewards: '美國境內餐廳、加油站及超市每美元 5 點 (5x)；其他所有一般消費每美元 3 點 (3x)',
      keyAnnualPerks: '憑 Silver Elite 會籍享點數房連住 5 晚「第 5 晚免點數 (5th Night Free)」；無海外交易手續費；Amex Offers 商家折抵',
      annualFeeText: '$0',
    },
    shortSummary: {
      hotelCredit: '—',
      airlineCredit: '—',
      hotelStatus: 'Silver Elite 會籍',
      primaryRewards: 'Hilton 住宿合計 19x',
      otherRewards: '美國餐廳/加油/超市 5x · 其他 3x',
      keyPerks: '點數連住第 5 晚免費 · 免年費免 FTF',
    },
    estimatedAnnualPerkValue: 40,
    hasAuditChanges: true,
    auditSummary: '補齊「其他一般消費每美元 3 點」、點數房連住第 5 晚免費與無海外手續費說明',
  },
  {
    id: 'freedom-flex',
    name: 'Chase Freedom Flex',
    issuer: 'Chase',
    network: 'Mastercard',
    annualFee: 0,
    annualFeeNote: '$0',
    rewardsCurrency: 'Chase Ultimate Rewards (UR)',
    foreignTxFee: '3%',
    original: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: '啟用季度輪替類別，合併消費最高每季 $1,500 得 5%',
      otherRewards: 'Chase Travel 5%；餐飲與藥局 3%；其他消費 1%',
      annualFeeText: '$0',
    },
    corrected: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: '每季啟用季度輪替指定類別，每季前 $1,500 消費享 5% (5x UR 點數)',
      otherRewards: 'Chase Travel 5x；Lyft 乘車 5x（至 2027/9/30）；全球餐飲（含外帶外送）3x；藥局 (Drugstores) 3x；其他消費 1x',
      keyAnnualPerks:
        '點數可合併轉入 Chase Sapphire Preferred 放大價值；World Elite Mastercard 手機保險（單次最高理賠 $800，每年最高 $1,000，自付額 $50）；3 個月免費 DashPass',
      annualFeeText: '$0',
    },
    shortSummary: {
      hotelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: '季度輪替 5x UR (每季上限 $1,500)',
      otherRewards: 'Chase Travel/Lyft 5x · 餐飲/藥局 3x',
      keyPerks: '$800 手機保險 · 點數可併入 CSP',
    },
    estimatedAnnualPerkValue: 75,
    hasAuditChanges: true,
    auditSummary: '補齊 UR 點數可轉入 CSP 規則、Lyft 5% 回饋與 Mastercard 最高 $800 手機保險',
  },
  {
    id: 'freedom-unlimited',
    name: 'Chase Freedom Unlimited',
    issuer: 'Chase',
    network: 'Visa',
    annualFee: 0,
    annualFeeNote: '$0',
    rewardsCurrency: 'Chase Ultimate Rewards (UR)',
    foreignTxFee: '3%',
    original: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: 'Chase Travel 5%',
      otherRewards: '餐飲與藥局 3%；其他消費至少 1.5%',
      annualFeeText: '$0',
    },
    corrected: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: 'Chase Travel 5% (5x UR)；Lyft 乘車 5%（至 2027/9/30）；所有一般消費無上限 1.5% (1.5x UR)',
      otherRewards: '餐飲（含外帶外送）3% (3x UR)；藥局 (Drugstores) 3% (3x UR)',
      keyAnnualPerks: '點數可合併轉入 Chase Sapphire Preferred 以 1:1 轉點航空/飯店夥伴；3 個月免費 DashPass；延長保固與購物保障',
      annualFeeText: '$0',
    },
    shortSummary: {
      hotelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: '一般消費無上限 1.5x UR · Travel/Lyft 5x',
      otherRewards: '餐飲 3x · 藥局 3x',
      keyPerks: '點數可併入 CSP 放大價值 · 延長保固',
    },
    estimatedAnnualPerkValue: 30,
    hasAuditChanges: true,
    auditSummary: '補齊 Lyft 5% 回饋與 UR 點數合併至 CSP 轉點優勢',
  },
  {
    id: 'prime-visa',
    name: 'Chase Prime Visa',
    issuer: 'Chase',
    network: 'Visa',
    annualFee: 0,
    annualFeeNote: '$0（Prime 會員費另計）',
    rewardsCurrency: 'Amazon Rewards Points (1pt = 1¢)',
    foreignTxFee: '$0 無海外手續費',
    original: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: '符合資格的 Prime 會員在 Amazon、Whole Foods、Chase Travel 消費得 5%',
      otherRewards: '加油、餐飲與通勤 2%；其他消費 1%',
      annualFeeText: '$0（Prime 會員費另計）',
    },
    corrected: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards:
        '具備有效 Prime 會員於 Amazon.com、Amazon Fresh、Whole Foods Market 及 Chase Travel 消費享無限額 5%（精選 Prime Card Bonus 商品享 10%+）',
      otherRewards: '加油站、餐廳、本地交通與通勤（含共乘）享 2%；其他所有消費 1%',
      keyAnnualPerks: '無海外交易手續費 (No FTF)；選擇 Amazon Day 延遲配送有時可享 6% 回饋；旅遊不便險與租車保障',
      annualFeeText: '$0（Prime 會員費另計）',
    },
    shortSummary: {
      hotelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: 'Amazon / Whole Foods / Chase Travel 5%',
      otherRewards: '加油/餐廳/通勤 2% · 其他 1%',
      keyPerks: '精選商品 10% · 免海外交易手續費',
    },
    estimatedAnnualPerkValue: 50,
    hasAuditChanges: false,
    auditSummary: '原表資訊正確；補充 Prime Card Bonus 10% 精選回饋與無海外交易手續費優勢',
  },
  {
    id: 'ink-unlimited',
    name: 'Chase Ink Business Unlimited',
    issuer: 'Chase',
    network: 'Visa',
    annualFee: 0,
    annualFeeNote: '$0',
    rewardsCurrency: 'Chase Ultimate Rewards (UR)',
    foreignTxFee: '3%',
    original: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: '所有商務消費 1.5% 現金回饋',
      otherRewards: 'Lyft 消費總計 5% 回饋（至 2027/9/30）',
      annualFeeText: '$0',
    },
    corrected: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: '所有商務與一般消費無上限 1.5% 回饋（實質為 1.5x Chase UR 點數）',
      otherRewards: 'Lyft 消費總計 5% (5x UR) 回饋（至 2027/9/30）',
      keyAnnualPerks:
        '累積之 UR 點數可轉入個人 Chase Sapphire Preferred 合併轉點；商務用途租車享 Primary 一級車體險 (CDW)；免費申辦員工副卡',
      annualFeeText: '$0',
    },
    shortSummary: {
      hotelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: '所有消費無上限 1.5x UR',
      otherRewards: 'Lyft 5x UR (至 2027/9)',
      keyPerks: '點數可併入 CSP · 商務租車一級車險',
    },
    estimatedAnnualPerkValue: 40,
    hasAuditChanges: true,
    auditSummary: '補充 UR 點數可與個人 CSP 合併轉點，以及商務租車 Primary 車險保障',
  },
  {
    id: 'citi-double-cash',
    name: 'Citi Double Cash',
    issuer: 'Citi',
    network: 'Mastercard',
    annualFee: 0,
    annualFeeNote: '$0',
    rewardsCurrency: 'Citi ThankYou Points (TYP)',
    foreignTxFee: '3%',
    original: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: '消費得 1%，還款再得 1%，合計 2%',
      otherRewards: 'Citi Travel 預訂飯店、租車及景點消費得 5 點／美元',
      annualFeeText: '$0',
    },
    corrected: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: '所有消費無上限 2%（消費得 1x + 準時繳款得 1x = 每美元 2 點 Citi ThankYou Points）',
      otherRewards: '透過 Citi Travel 預訂飯店、租車與景點享總計 5x ThankYou Points',
      keyAnnualPerks: '直接賺取 ThankYou Points（可 1¢/點折現，或直接轉點至 JetBlue、Choice、Wyndham 等夥伴）',
      annualFeeText: '$0',
    },
    shortSummary: {
      hotelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: '所有消費無上限 2% (2x TYP)',
      otherRewards: 'Citi Travel 飯店/租車 5x',
      keyPerks: '2% 現金等值點數 · 可轉點夥伴',
    },
    estimatedAnnualPerkValue: 20,
    hasAuditChanges: false,
    auditSummary: '原表資訊正確；補充說明回饋實為 ThankYou Points 點數體系',
  },
  {
    id: 'discover-it',
    name: 'Discover it Cash Back',
    issuer: 'Discover',
    network: 'Discover',
    annualFee: 0,
    annualFeeNote: '$0',
    rewardsCurrency: 'Cashback Bonus',
    foreignTxFee: '$0 無海外手續費',
    original: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: '啟用季度輪替類別，合併消費最高每季 $1,500 得 5%',
      otherRewards: '其他消費 1%；首年結束時自動配對首年現金回饋',
      annualFeeText: '$0',
    },
    corrected: {
      chaseTravelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: '每季啟用季度輪替指定類別，每季前 $1,500 消費享 5% 現金回饋',
      otherRewards: '其他所有消費 1%；首年持卡結束時享 Unlimited Cashback Match（首年變相輪替 10% / 一般 2%）',
      keyAnnualPerks: '無海外交易手續費；現金回饋兌換指定品牌禮品卡 (Gift Cards) 享額外 5%–20% 加碼價值',
      annualFeeText: '$0',
    },
    shortSummary: {
      hotelCredit: '—',
      airlineCredit: '—',
      hotelStatus: '—',
      primaryRewards: '季度輪替 5% (每季上限 $1,500)',
      otherRewards: '其他消費 1% (首年雙倍配對)',
      keyPerks: '免海外手續費 · 換禮品卡加碼 5%-20%',
    },
    estimatedAnnualPerkValue: 75,
    hasAuditChanges: false,
    auditSummary: '原表資訊正確；補充無海外手續費與禮品卡兌換加碼優惠',
  },
];

export const INITIAL_BENEFIT_TRACKERS: BenefitTrackerItem[] = [
  {
    id: 'trk-csp-hotel',
    cardId: 'csp',
    cardName: 'Chase Sapphire Preferred',
    benefitTitle: 'Chase Travel 飯店住宿折抵 ($100)',
    shortTitle: 'Chase Travel $100 飯店折抵',
    category: '飯店折抵',
    cadence: '每年',
    deadlineOrReset: '周年重置',
    maxValue: 100,
    usedValue: 0,
    expiredValue: 0,
    recordedDate: '2026-10-03',
    status: '未使用',
    activationRequired: false,
    calendarAlertLabel: '10/1 提醒',
    calendarAlertRuleId: 'alert-csp-hotel',
    notes: '透過 Chase Travel 預訂飯店自動觸發帳單折抵 $100（每年 10/1 日曆提醒）',
  },
  {
    id: 'trk-ihg-dining',
    cardId: 'ihg-premier',
    cardName: 'Chase IHG One Rewards Premier',
    benefitTitle: 'IHG 飯店餐飲: 每季 $25 折抵 (年 $100 新福利)',
    shortTitle: 'IHG 每季 $25 餐飲折抵',
    category: '飯店折抵',
    cadence: '每季',
    deadlineOrReset: '每季季末 (3/31, 6/30, 9/30, 12/31)',
    maxValue: 100,
    usedValue: 0,
    expiredValue: 75,
    recordedDate: '2026-10-03',
    status: '部分過期',
    activationRequired: false,
    calendarAlertLabel: '每季 1/1, 4/1, 7/1, 10/1 提醒',
    calendarAlertRuleId: 'alert-ihg-dining',
    notes:
      '2026/2027 改版新福利：每曆季於全球 IHG 飯店消費掛帳房帳享 $25 折抵。截至 2026/10/03：前三季 (Q1–Q3) 共 $75 已過期，目前 Q4 (10–12月) 尚有 $25 可用。點擊下方季度可切換狀態',
    monthlyStates: [
      { month: 3, label: 'Q1 (1–3月)', amount: 25, state: 'expired' },
      { month: 6, label: 'Q2 (4–6月)', amount: 25, state: 'expired' },
      { month: 9, label: 'Q3 (7–9月)', amount: 25, state: 'expired' },
      { month: 12, label: 'Q4 (10–12月)', amount: 25, state: 'available' },
    ],
  },
  {
    id: 'trk-ihg-air',
    cardId: 'ihg-premier',
    cardName: 'Chase IHG One Rewards Premier',
    benefitTitle: '航空: 官網直購機票滿 $250 折 $100 (年 $100 新福利)',
    shortTitle: 'IHG 航空購票折抵 $100',
    category: '航空報銷',
    cadence: '每曆年',
    deadlineOrReset: '每年 12/31 重置（至 2027/12/31）',
    maxValue: 100,
    usedValue: 0,
    expiredValue: 0,
    recordedDate: '2026-10-03',
    status: '未使用',
    activationRequired: false,
    calendarAlertLabel: '10/1 提醒',
    calendarAlertRuleId: 'alert-ihg-air',
    notes:
      '2026/2027 改版新福利：每年在航空公司官網直購機票滿 $250，享 $100 帳單折抵（優惠至 2027/12/31）',
  },
  {
    id: 'trk-ihg-ua',
    cardId: 'ihg-premier',
    cardName: 'Chase IHG One Rewards Premier',
    benefitTitle: 'United TravelBank Cash ($25 × 2 = 年 $50)',
    shortTitle: 'UA TravelBank',
    category: '航空報銷',
    cadence: '每半年',
    deadlineOrReset: '1/5 & 7/5 各 $25',
    maxValue: 50,
    usedValue: 0,
    expiredValue: 25,
    recordedDate: '2026-10-03',
    status: '部分過期',
    activationRequired: true,
    calendarAlertLabel: '1/5 · 7/5 提醒',
    calendarAlertRuleId: 'alert-ihg-ua',
    notes: '每年 1/5 與 7/5 各入帳 $25 UA TravelBank Cash（上半年於 7/15 到期，下半年於次年 1/15 到期）。點擊下方期別可切換狀態',
    monthlyStates: [
      { month: 1, label: '1/5 上半年', amount: 25, state: 'expired' },
      { month: 7, label: '7/5 下半年', amount: 25, state: 'available' },
    ],
  },
  {
    id: 'trk-marriott-air',
    cardId: 'marriott-boundless',
    cardName: 'Chase Marriott Bonvoy Boundless',
    benefitTitle: '航空: 每半年機票滿 $250 折 $50 (年 $100)',
    shortTitle: '航空直購折價',
    category: '航空報銷',
    cadence: '每半年',
    deadlineOrReset: '滿 $250 折 $50',
    maxValue: 100,
    usedValue: 0,
    expiredValue: 50,
    recordedDate: '2026-10-03',
    status: '部分過期',
    activationRequired: true,
    calendarAlertLabel: '1/5 · 7/5 提醒',
    calendarAlertRuleId: 'alert-marriott-air',
    notes: '每半年（1–6月、7–12月）於航空公司官網直購滿 $250 折抵 $50，全年最高 $100。點擊下方期別可切換狀態',
    monthlyStates: [
      { month: 1, label: '1-6月 上半年', amount: 50, state: 'expired' },
      { month: 7, label: '7-12月 下半年', amount: 50, state: 'available' },
    ],
  },
  {
    id: 'trk-marriott-fna',
    cardId: 'marriott-boundless',
    cardName: 'Chase Marriott Bonvoy Boundless',
    benefitTitle: 'Marriott 周年免房券 (35,000 點，可加 15k 點)',
    shortTitle: 'Marriott 周年免房券 (35k點)',
    category: '免房券 (FNA)',
    cadence: '每年',
    deadlineOrReset: '12 個月有效',
    maxValue: 180,
    usedValue: 0,
    expiredValue: 0,
    recordedDate: '2026-10-03',
    status: '未使用',
    activationRequired: false,
    calendarAlertLabel: '3/1 提醒',
    calendarAlertRuleId: 'alert-marriott-fna',
    notes: '每年 3/1 提醒；最多可自費貼補 15,000 點兌換最高 50,000 點之萬豪住宿',
  },
  {
    id: 'trk-ihg-fna',
    cardId: 'ihg-premier',
    cardName: 'Chase IHG One Rewards Premier',
    benefitTitle: 'IHG 周年免房券 (現 40k / 升級 50,000 點，可加點 Top-off)',
    shortTitle: 'IHG 周年免房券 (50k點)',
    category: '免房券 (FNA)',
    cadence: '每年',
    deadlineOrReset: '12 個月有效',
    maxValue: 200,
    usedValue: 0,
    expiredValue: 0,
    recordedDate: '2026-10-03',
    status: '未使用',
    activationRequired: false,
    calendarAlertLabel: '9/1 提醒',
    calendarAlertRuleId: 'alert-ihg-fna',
    notes:
      '每年 9/1 提醒；改版後免房券上限升級至 50,000 點（現有卡友 2026 續卡 40k、2027 起全面 50k），超過額度可無上限補點數差額',
  },
  {
    id: 'trk-hyatt-fna1',
    cardId: 'hyatt',
    cardName: 'Chase World of Hyatt Visa',
    benefitTitle: 'Hyatt 周年免房券 (Category 1–4)',
    shortTitle: 'Hyatt 周年免房券 (Cat 1-4)',
    category: '免房券 (FNA)',
    cadence: '每年',
    deadlineOrReset: '12 個月有效',
    maxValue: 200,
    usedValue: 0,
    expiredValue: 0,
    recordedDate: '2026-10-03',
    status: '未使用',
    activationRequired: false,
    calendarAlertLabel: '11/1 提醒',
    calendarAlertRuleId: 'alert-hyatt-fna',
    notes: '每年 11/1 提醒；可兌換全球 Category 1–4 凱悅飯店（最高價值可達 $200–$300+）',
  },
  {
    id: 'trk-csp-doordash',
    cardId: 'csp',
    cardName: 'Chase Sapphire Preferred',
    benefitTitle: 'DoorDash 每月 $10 非餐廳折抵 (全年 12 次)',
    shortTitle: 'DoorDash 每月 $10 折抵',
    category: '生活與外送',
    cadence: '每月',
    deadlineOrReset: '每月月底到期（不累積）',
    maxValue: 120,
    usedValue: 0,
    expiredValue: 90,
    recordedDate: '2026-10-03',
    status: '部分過期',
    activationRequired: true,
    notes: '截至 2026/10/03：1–9月共 9 個月 ($90) 已過期失效；10月當期尚未折抵（可用 $10），10–12月共剩餘 $30 可用。',
    monthlyStates: [
      { month: 1, label: '1月', amount: 10, state: 'expired' },
      { month: 2, label: '2月', amount: 10, state: 'expired' },
      { month: 3, label: '3月', amount: 10, state: 'expired' },
      { month: 4, label: '4月', amount: 10, state: 'expired' },
      { month: 5, label: '5月', amount: 10, state: 'expired' },
      { month: 6, label: '6月', amount: 10, state: 'expired' },
      { month: 7, label: '7月', amount: 10, state: 'expired' },
      { month: 8, label: '8月', amount: 10, state: 'expired' },
      { month: 9, label: '9月', amount: 10, state: 'expired' },
      { month: 10, label: '10月', amount: 10, state: 'available' },
      { month: 11, label: '11月', amount: 10, state: 'available' },
      { month: 12, label: '12月', amount: 10, state: 'available' },
    ],
  },
  {
    id: 'trk-csp-ge',
    cardId: 'csp',
    cardName: 'Chase Sapphire Preferred',
    benefitTitle: 'Global Entry / TSA PreCheck / NEXUS 報名費折抵',
    shortTitle: 'Global Entry / TSA $120',
    category: '通關與旅遊保障',
    cadence: '每 4 年',
    deadlineOrReset: '每 4 年重置',
    maxValue: 120,
    usedValue: 0,
    expiredValue: 0,
    recordedDate: '2026-10-03',
    status: '未使用',
    activationRequired: false,
    notes: '2026/6/15 新增福利，刷卡支付報名費自動折抵最高 $120',
  },
  {
    id: 'trk-ihg-ge',
    cardId: 'ihg-premier',
    cardName: 'Chase IHG One Rewards Premier',
    benefitTitle: 'Global Entry / TSA PreCheck / NEXUS 報名費折抵',
    shortTitle: 'Global Entry / TSA $120',
    category: '通關與旅遊保障',
    cadence: '每 4 年',
    deadlineOrReset: '每 4 年重置',
    maxValue: 120,
    usedValue: 0,
    expiredValue: 0,
    recordedDate: '2026-10-03',
    status: '未使用',
    activationRequired: false,
    notes: '可幫親友刷卡報名同樣觸發 $120 折抵',
  },
  {
    id: 'trk-ff-cell',
    cardId: 'freedom-flex',
    cardName: 'Chase Freedom Flex',
    benefitTitle: 'Mastercard 手機損壞與失竊保險 ($800/次)',
    shortTitle: '手機損壞與失竊險 $800',
    category: '通關與旅遊保障',
    cadence: '每曆年',
    deadlineOrReset: '繳交每月話費即生效',
    maxValue: 800,
    usedValue: 0,
    expiredValue: 0,
    recordedDate: '2026-10-03',
    status: '未使用',
    activationRequired: false,
    notes: '使用此卡扣繳每月手機話費，即享單次最高 $800（自付額 $50）手機螢幕破裂/失竊理賠',
  },
];

export const INITIAL_SPEND_CAP_TRACKERS: SpendCapTrackerItem[] = [
  {
    id: 'cap-ff-q3',
    cardName: 'Chase Freedom Flex',
    programName: '2026 Q3 季度 5% 輪替類別',
    period: '2026 Q3 (7/1 – 9/30)',
    categoryDescription: '加油站、電動車充電、精選現場娛樂、電影院',
    rewardRate: '5% (5x UR)',
    spendCap: 1500,
    currentSpend: 0,
    activated: true,
    notes: '每季合併上限 $1,500 享 5x UR（已於 9/30 結束）',
  },
  {
    id: 'cap-ff-q4',
    cardName: 'Chase Freedom Flex',
    programName: '2026 Q4 季度 5% 輪替類別',
    period: '2026 Q4 (10/1 – 12/31)',
    categoryDescription: 'PayPal、百貨公司、慈善捐款（每年 9/15 起開放登錄）',
    rewardRate: '5% (5x UR)',
    spendCap: 1500,
    currentSpend: 0,
    activated: true,
    notes: '2026 Q4 (10/1–12/31) 已正式開跑！記得於 Chase App 啟用 5% UR',
  },
  {
    id: 'cap-disc-q3',
    cardName: 'Discover it Cash Back',
    programName: '2026 Q3 季度 5% 輪替類別',
    period: '2026 Q3 (7/1 – 9/30)',
    categoryDescription: 'Walmart、生鮮雜貨超市 (Grocery Stores)',
    rewardRate: '5% Cash Back',
    spendCap: 1500,
    currentSpend: 0,
    activated: true,
    notes: '每季前 $1,500 享 5%（已於 9/30 結束）',
  },
  {
    id: 'cap-disc-q4',
    cardName: 'Discover it Cash Back',
    programName: '2026 Q4 季度 5% 輪替類別',
    period: '2026 Q4 (10/1 – 12/31)',
    categoryDescription: 'Amazon.com、Target 實體與線上消費',
    rewardRate: '5% Cash Back',
    spendCap: 1500,
    currentSpend: 0,
    activated: true,
    notes: '2026 Q4 節慶購物季神卡，與 Chase Prime Visa 互補 Target 5%',
  },
  {
    id: 'cap-marriott-3x',
    cardName: 'Chase Marriott Bonvoy Boundless',
    programName: '年度前 $6,000 指定類別 3x 回饋',
    period: '2026 全年 (1/1 – 12/31)',
    categoryDescription: '生鮮雜貨 (Grocery)、加油站 (Gas)、餐廳 (Dining) 合併計算',
    rewardRate: '3x Bonvoy Points',
    spendCap: 6000,
    currentSpend: 0,
    activated: true,
    notes: '每曆年合併上限 $6,000，超過後恢復為 2x',
  },
  {
    id: 'cap-hyatt-15k',
    cardName: 'Chase World of Hyatt Visa',
    programName: '曆年消費滿 $15,000 送第 2 張 Cat 1–4 免房券',
    period: '2026 全年 (1/1 – 12/31)',
    categoryDescription: '所有一般合格刷卡消費（同時每滿 $5,000 送 2 晚定級房晚）',
    rewardRate: '1x–2x + Cat 1–4 免房券 + 6 晚房晚',
    spendCap: 15000,
    currentSpend: 0,
    activated: true,
    notes: '每刷滿 $5,000 送 2 晚定級房晚；曆年刷滿 $15,000 加贈第 2 張 Cat 1–4 免房券',
  },
  {
    id: 'cap-ihg-20k',
    cardName: 'Chase IHG One Rewards Premier',
    programName: '曆年消費滿 $20,000 送 $100 折抵 + 10,000 點',
    period: '2026 全年 (1/1 – 12/31)',
    categoryDescription: '所有一般合格刷卡消費（滿 $40,000 可升等 Diamond Elite）',
    rewardRate: '3x–5x + $100 帳單折抵 + 10k 點',
    spendCap: 20000,
    currentSpend: 0,
    activated: true,
    notes:
      '改版後現有卡友保留白金會籍至 2027 底；單一曆年滿 $40k 依然可直升鑽石 Diamond Elite',
  },
];

export const SPEND_CATEGORY_GUIDE: CategoryBestCard[] = [
  {
    id: 'cat-amazon',
    category: 'Amazon.com / Whole Foods 超市',
    bestCard: 'Chase Prime Visa',
    multiplier: '5% 無上限 (精選商品 10%)',
    effectiveReturnNote: '5.0% 現金等值回饋',
    runnerUpCard: 'Discover it (當季輪替命中時 5%)',
    tips: '具備 Prime 會員直接刷 Prime Visa 享無上限 5%，不佔用季度輪替 $1,500 額度。',
  },
  {
    id: 'cat-chase-travel',
    category: 'Chase Travel 平台預訂機票 / 飯店 / 租車',
    bestCard: 'Chase Sapphire Preferred / Freedom 系列',
    multiplier: '5x UR 點數',
    effectiveReturnNote: '約 7.5%–10%（依 UR 估值 1.5¢–2¢/pt）',
    runnerUpCard: 'Chase Prime Visa (5% 現金點數)',
    tips: '每年首筆 $100 飯店預訂務必刷 Chase Sapphire Preferred 以觸發 $100 周年飯店折抵！',
  },
  {
    id: 'cat-dining',
    category: '全球餐廳與外送 (Dining)',
    bestCard: 'Chase Sapphire Preferred',
    multiplier: '3x UR 點數 (無海外手續費)',
    effectiveReturnNote: '約 4.5%–6.0%（UR 轉點價值）',
    runnerUpCard: 'Freedom Flex / Freedom Unlimited (美國境內 3x UR)',
    tips: '在美國境內刷 CSP / CFF / CFU 皆為 3x UR；在海外用餐務必刷無 FTF 的 CSP（或 Hilton Amex / IHG Premier）。',
  },
  {
    id: 'cat-grocery-online',
    category: '線上買菜與生鮮外送 (Online Grocery)',
    bestCard: 'Chase Sapphire Preferred',
    multiplier: '3x UR 點數',
    effectiveReturnNote: '約 4.5%–6.0%',
    runnerUpCard: 'Hilton Honors Amex (美國超市 5x Hilton)',
    tips: 'CSP 的 3x Online Grocery 涵蓋 Instacart、Kroger Pay 門市掃碼、Whole Foods 線上等（不含 Target/Walmart）。',
  },
  {
    id: 'cat-grocery-store',
    category: '美國實體超市買菜 (In-Store Supermarkets)',
    bestCard: 'Freedom Flex / Discover it (輪替季) 或 Hilton Amex / IHG Premier',
    multiplier: '輪替季 5x UR / 5% 或 常駐 5x Hilton / 5x IHG (改版新增) / 3x Marriott',
    effectiveReturnNote: '輪替季 5%–10%；平時約 2.5%–3.0%',
    runnerUpCard: 'Citi Double Cash (2x TYP) / Freedom Unlimited (1.5x UR)',
    tips: 'IHG Premier 最新改版將生鮮超市 (Grocery Stores) 升級為 5x 加碼！非輪替季度可刷 IHG Premier (5x) 或在超市App使用 Kroger Pay 綁定 CSP 觸發 3x。',
  },
  {
    id: 'cat-gas-ev',
    category: '加油站與電動車充電 (Gas & EV Charging)',
    bestCard: 'Chase Sapphire Preferred (2026/6 新增)',
    multiplier: '3x UR 點數',
    effectiveReturnNote: '約 4.5%–6.0%',
    runnerUpCard: 'IHG Premier (加油 5x IHG) / Hilton Amex (5x Hilton)',
    tips: '2026/6/15 起 CSP 將加油與 EV 充電納入常駐 3x UR 類別；持有 IHG Premier 加油亦享 5x IHG 點數。',
  },
  {
    id: 'cat-airbnb',
    category: 'Airbnb / Vrbo 度假屋租賃與一般旅遊',
    bestCard: 'Chase Sapphire Preferred (2026/6 新增)',
    multiplier: '度假屋租賃 3x UR ／ 其他旅遊 2x UR',
    effectiveReturnNote: '約 4.5%–6.0% + Primary 租車險與旅遊延誤險',
    runnerUpCard: 'IHG Premier (租車與機票 5x IHG · 其他旅遊 3x)',
    tips: '租車務必刷 CSP 或 Ink Business Unlimited 以享有 Primary（一級）車體碰撞險；IHG Premier 改版後租車享 5x。',
  },
  {
    id: 'cat-airline-direct',
    category: '航空公司官網直購機票 (Airlines Direct)',
    bestCard: 'Marriott Boundless (每半年滿$250折$50) / IHG Premier (年滿$250折$100 + 5x 機票)',
    multiplier: '直購滿 $250 折 $50–$100 (約 20%–40% 折扣) + 2x–5x 點數',
    effectiveReturnNote: '高達 20%–40%+ 首筆購票折抵',
    runnerUpCard: 'Chase Sapphire Preferred (2x UR + 班機延誤/行李保險)',
    tips: '每年可先用 IHG Premier 官網直購機票滿 $250 拿 $100 折抵（改版新福利）並享 5x IHG 點數；每半年亦可用 Marriott Boundless 滿 $250 拿 $50 折抵！超過改刷 CSP 享旅遊保險與 2x UR。',
  },
  {
    id: 'cat-lyft',
    category: 'Lyft 共乘叫車',
    bestCard: 'Chase Sapphire Preferred / Freedom / Ink Unlimited',
    multiplier: '5x UR 點數（至 2027/9/30）',
    effectiveReturnNote: '約 7.5%–10%',
    runnerUpCard: 'Chase Prime Visa (2%)',
    tips: '海外叫車選 CSP（無 FTF 5x UR）；美國境內 CSP / CFF / CFU / Ink Unlimited 皆享 5x UR。',
  },
  {
    id: 'cat-pharmacy',
    category: '藥局消費 (CVS / Walgreens)',
    bestCard: 'Chase Freedom Flex / Freedom Unlimited',
    multiplier: '3x UR 點數',
    effectiveReturnNote: '約 4.5%–6.0%',
    runnerUpCard: 'Citi Double Cash (2x TYP)',
    tips: '美國藥局購買日用品或禮品卡皆可穩定拿 3x UR。',
  },
  {
    id: 'cat-general',
    category: '其他一般非指定類別消費 (Catch-All)',
    bestCard: 'Chase Freedom Unlimited / Ink Unlimited 或 Citi Double Cash',
    multiplier: '1.5x UR 點數 或 2x ThankYou Points (2% 現金)',
    effectiveReturnNote: '2.0%–3.0%',
    runnerUpCard: 'World of Hyatt (衝刺 $15,000 免房券期間實質約 2.3%)',
    tips: '若重視 UR 轉點選 CFU/Ink (1.5x UR)；若偏好純現金回饋選 Citi Double Cash (2%)；若差額可湊滿 Hyatt $15k 則刷 Hyatt 卡。',
  },
];
