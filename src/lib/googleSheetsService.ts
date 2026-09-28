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
    '信用卡 / 發卡行與年費',
    '核心與日常消費回饋',
    '飯店折抵 · 航空報銷 · 會籍',
    '年度免房券與重要福利',
    '年費 ($)',
    '預估福利價值 ($)',
  ];

  const rows = cards.map((c) => [
    `${c.name} (${c.issuer} · ${c.annualFeeNote} · ${c.foreignTxFee})`,
    `【主要】${c.corrected.primaryRewards} ｜ 【其他】${c.corrected.otherRewards}`,
    `飯店折抵：${c.corrected.chaseTravelCredit} ｜ 航空：${c.corrected.airlineCredit} ｜ 會籍：${c.corrected.hotelStatus}`,
    `${c.corrected.keyAnnualPerks}（點數：${c.rewardsCurrency}）`,
    c.annualFee,
    c.estimatedAnnualPerkValue,
  ]);

  const summaryRowIndex = rows.length + 2;
  const totalRow = [
    '合計 / 總覽 (11 張信用卡)',
    '4 張年費卡 + 7 張免年費卡',
    '手機版精簡欄位（免橫向滑動）',
    '淨回本價值 = 福利總值 - 總年費',
    `=SUM(E2:E${summaryRowIndex - 1})`,
    `=SUM(F2:F${summaryRowIndex - 1})`,
  ];

  return [header, ...rows, totalRow];
}

function buildTab2Rows(trackers: BenefitTrackerItem[]): (string | number)[][] {
  const header = [
    '信用卡 / 福利項目',
    '最高額度 ($)',
    '已用 ($)',
    '剩餘 ($)',
    '狀態 · 週期 · 使用說明',
  ];

  const rows = trackers.map((t, idx) => {
    const rowNum = idx + 2;
    return [
      `[${t.status}] ${t.cardName} — ${t.benefitTitle}`,
      t.maxValue,
      t.usedValue,
      `=MAX(0, B${rowNum}-C${rowNum})`,
      `${t.cadence} (${t.deadlineOrReset}) ｜ ${
        t.activationRequired ? '需綁定/啟用' : '自動觸發'
      } ｜ ${t.notes}`,
    ];
  });

  const lastDataRow = rows.length + 1;
  const totalRow = [
    '合計（年度可追蹤福利總計）',
    `=SUM(B2:B${lastDataRow})`,
    `=SUM(C2:C${lastDataRow})`,
    `=SUM(D2:D${lastDataRow})`,
    '手機版 5 欄設計，自動計算已用與剩餘價值',
  ];

  return [header, ...rows, totalRow];
}

function buildTab3Rows(caps: SpendCapTrackerItem[]): (string | number)[][] {
  const header = [
    '信用卡 / 計畫與期間',
    '上限 ($)',
    '已刷 ($)',
    '尚餘 ($)',
    '進度 · 回饋率 · 指定類別與備註',
  ];

  const rows = caps.map((item, idx) => {
    const rowNum = idx + 2;
    const pct =
      item.spendCap > 0
        ? `${Math.min(100, Math.round((item.currentSpend / item.spendCap) * 100))}%`
        : '0%';
    return [
      `[${item.activated ? '已啟用' : '待啟用'}] ${item.cardName} — ${item.programName} (${item.period})`,
      item.spendCap,
      item.currentSpend,
      `=MAX(0, B${rowNum}-C${rowNum})`,
      `進度 ${pct} ｜ ${item.rewardRate} ｜ 類別：${item.categoryDescription} ｜ ${item.notes}`,
    ];
  });

  return [header, ...rows];
}

function buildTab4Rows(guide: CategoryBestCard[]): (string | number)[][] {
  const header = [
    '消費通路與場景',
    '首選主力卡 · 回饋率',
    '次選備用卡 · 實戰刷卡策略',
  ];

  const rows = guide.map((g) => [
    g.category,
    `${g.bestCard} ｜ ${g.multiplier}（實質 ${g.effectiveReturnNote}）`,
    `次選：${g.runnerUpCard} ｜ 策略：${g.tips}`,
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
