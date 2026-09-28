import {
  CreditCardRecord,
  BenefitTrackerItem,
  SpendCapTrackerItem,
  CategoryBestCard,
} from '../data/creditCards';

export interface CreatedSheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  lastSyncedAt: string;
}

function buildTab1Rows(cards: CreditCardRecord[]): (string | number)[][] {
  const header = [
    '信用卡名稱',
    '發卡銀行',
    '卡組織',
    '年費 ($)',
    '年費備註',
    '點數體系',
    '海外交易手續費',
    'Chase Travel 飯店折抵',
    '航空帳單回饋',
    '飯店會籍與定級房晚',
    '主要回饋',
    '其他消費回饋',
    '年度免房券與重要福利',
    '預估年度福利價值 ($)',
    '原表勘誤與補充摘要',
  ];

  const rows = cards.map((c) => [
    c.name,
    c.issuer,
    c.network,
    c.annualFee,
    c.annualFeeNote,
    c.rewardsCurrency,
    c.foreignTxFee,
    c.corrected.chaseTravelCredit,
    c.corrected.airlineCredit,
    c.corrected.hotelStatus,
    c.corrected.primaryRewards,
    c.corrected.otherRewards,
    c.corrected.keyAnnualPerks,
    c.estimatedAnnualPerkValue,
    c.auditSummary,
  ]);

  const summaryRowIndex = rows.length + 2;
  const totalRow = [
    '合計 / 總覽 (11 張信用卡)',
    '',
    '',
    `=SUM(D2:D${summaryRowIndex - 1})`,
    '4張年費卡 + 7張免年費卡',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '年度預估福利總價值：',
    `=SUM(N2:N${summaryRowIndex - 1})`,
    '淨回本價值 = 福利總值 - 總年費',
  ];

  return [header, ...rows, totalRow];
}

function buildTab2Rows(trackers: BenefitTrackerItem[]): (string | number)[][] {
  const header = [
    '項目編號',
    '信用卡名稱',
    '福利項目名稱',
    '福利分類',
    '重置週期',
    '重置 / 到期時間提醒',
    '是否需手動登錄/綁定',
    '最高額度 / 預估價值 ($)',
    '已使用價值 ($)',
    '剩餘可用價值 ($)',
    '目前狀態',
    '使用方式與備註紀錄',
  ];

  const rows = trackers.map((t, idx) => {
    const rowNum = idx + 2;
    return [
      `B-${String(idx + 1).padStart(2, '0')}`,
      t.cardName,
      t.benefitTitle,
      t.category,
      t.cadence,
      t.deadlineOrReset,
      t.activationRequired ? '需綁定/啟用' : '自動觸發',
      t.maxValue,
      t.usedValue,
      `=MAX(0, H${rowNum}-I${rowNum})`,
      t.status,
      t.notes,
    ];
  });

  const lastDataRow = rows.length + 1;
  const totalRow = [
    '合計',
    '年度可追蹤福利總計',
    '',
    '',
    '',
    '',
    '',
    `=SUM(H2:H${lastDataRow})`,
    `=SUM(I2:I${lastDataRow})`,
    `=SUM(J2:J${lastDataRow})`,
    '',
    '即時自動計算已用與剩餘福利價值',
  ];

  return [header, ...rows, totalRow];
}

function buildTab3Rows(caps: SpendCapTrackerItem[]): (string | number)[][] {
  const header = [
    '信用卡名稱',
    '季度 / 年度計畫名稱',
    '適用期間',
    '指定加碼類別明細',
    '回饋率',
    '是否已啟用 (Activate)',
    '消費上限 / 門檻 ($)',
    '目前累計消費 ($)',
    '剩餘額度 / 距離門檻 ($)',
    '完成進度 (%)',
    '備註提醒',
  ];

  const rows = caps.map((item, idx) => {
    const rowNum = idx + 2;
    return [
      item.cardName,
      item.programName,
      item.period,
      item.categoryDescription,
      item.rewardRate,
      item.activated ? '已啟用' : '尚未啟用',
      item.spendCap,
      item.currentSpend,
      `=MAX(0, G${rowNum}-H${rowNum})`,
      `=IF(G${rowNum}>0, ROUND((H${rowNum}/G${rowNum})*100, 1)&"%", "0%")`,
      item.notes,
    ];
  });

  return [header, ...rows];
}

function buildTab4Rows(guide: CategoryBestCard[]): (string | number)[][] {
  const header = [
    '日常消費場景 / 類別',
    '首選主力卡 (Best Card)',
    '最高回饋倍率',
    '預估實質投報率',
    '次選備用卡 (Runner-Up)',
    '實戰刷卡策略與注意事項',
  ];

  const rows = guide.map((g) => [
    g.category,
    g.bestCard,
    g.multiplier,
    g.effectiveReturnNote,
    g.runnerUpCard,
    g.tips,
  ]);

  return [header, ...rows];
}

export function exportCardsToCSV(
  cards: CreditCardRecord[],
  trackers: BenefitTrackerItem[],
  caps: SpendCapTrackerItem[] = [],
  guide: CategoryBestCard[] = []
): void {
  const rows: (string | number)[][] = [
    ['=== 分頁 1：信用卡完整權益總表 ==='],
    ...buildTab1Rows(cards),
    [],
    ['=== 分頁 2：年度報銷與免房券追蹤表 ==='],
    ...buildTab2Rows(trackers),
  ];

  if (caps.length > 0) {
    rows.push([], ['=== 分頁 3：季度 5% 輪替與滿額進度 ==='], ...buildTab3Rows(caps));
  }
  if (guide.length > 0) {
    rows.push([], ['=== 分頁 4：最佳刷卡通路攻略 ==='], ...buildTab4Rows(guide));
  }

  const csvContent =
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? '').replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(',')
      )
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'credit-card-benefits-tracker-2026.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copySheetsTSVToClipboard(
  cards: CreditCardRecord[],
  trackers: BenefitTrackerItem[],
  caps: SpendCapTrackerItem[],
  guide: CategoryBestCard[]
): Promise<void> {
  const rows: (string | number)[][] = [
    ['【分頁 1：信用卡完整權益總表】'],
    ...buildTab1Rows(cards),
    [],
    ['【分頁 2：年度報銷與免房券追蹤表】'],
    ...buildTab2Rows(trackers),
    [],
    ['【分頁 3：季度 5% 輪替與滿額進度】'],
    ...buildTab3Rows(caps),
    [],
    ['【分頁 4：最佳刷卡通路攻略】'],
    ...buildTab4Rows(guide),
  ];

  const tsvContent = rows
    .map((row) =>
      row
        .map((cell) =>
          String(cell ?? '')
            .replace(/\t/g, ' ')
            .replace(/\r?\n/g, ' ')
        )
        .join('\t')
    )
    .join('\n');

  await navigator.clipboard.writeText(tsvContent);
}
