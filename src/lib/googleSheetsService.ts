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
    '年費 ($)',
    '免海外手續費 (No FTF)',
    '主要與日常回饋 (精簡)',
    '飯店折抵 · 航空 · 會籍',
    '年度重要福利',
    '預估福利價值 ($)',
  ];

  const rows = cards.map((c) => [
    `${c.name} (${c.issuer})`,
    c.annualFee,
    c.foreignTxFee.includes('$0') ? '✓ 免海外手續費 ($0)' : `✕ ${c.foreignTxFee} 海外手續費`,
    `${c.shortSummary?.primaryRewards ?? c.corrected.primaryRewards} ｜ ${
      c.shortSummary?.otherRewards ?? c.corrected.otherRewards
    }`,
    `飯店：${c.shortSummary?.hotelCredit ?? c.corrected.chaseTravelCredit} ｜ 航空：${
      c.shortSummary?.airlineCredit ?? c.corrected.airlineCredit
    } ｜ 會籍：${c.shortSummary?.hotelStatus ?? c.corrected.hotelStatus}`,
    c.shortSummary?.keyPerks ?? c.corrected.keyAnnualPerks,
    c.estimatedAnnualPerkValue,
  ]);

  const summaryRowIndex = rows.length + 2;
  const totalRow = [
    '合計 (11 張卡)',
    `=SUM(B2:B${summaryRowIndex - 1})`,
    '7 張免海外手續費',
    '4 張年費卡 + 7 張免年費卡',
    '',
    '年度預估福利總值：',
    `=SUM(G2:G${summaryRowIndex - 1})`,
  ];

  return [header, ...rows, totalRow];
}

function buildTab2Rows(trackers: BenefitTrackerItem[]): (string | number)[][] {
  const header = [
    '紀錄日期',
    '狀態',
    '信用卡 / 福利項目',
    '總額 ($)',
    '已用 ($)',
    '已過期無法用 ($)',
    '剩餘可用 ($)',
    '週期与簡要說明',
  ];

  const rows = trackers.map((t, idx) => {
    const rowNum = idx + 2;
    return [
      t.recordedDate || '2026-09-29',
      t.status,
      `${t.cardName} — ${t.shortTitle || t.benefitTitle}`,
      t.maxValue,
      t.usedValue,
      t.expiredValue || 0,
      `=MAX(0, D${rowNum}-E${rowNum}-F${rowNum})`,
      t.calendarAlertLabel
        ? `${t.calendarAlertLabel} ｜ ${t.cadence}`
        : `${t.cadence} (${t.deadlineOrReset})`,
    ];
  });

  const lastDataRow = rows.length + 1;
  const totalRow = [
    '2026-09-29',
    '合計',
    '年度可追蹤福利總計',
    `=SUM(D2:D${lastDataRow})`,
    `=SUM(E2:E${lastDataRow})`,
    `=SUM(F2:F${lastDataRow})`,
    `=SUM(G2:G${lastDataRow})`,
    '剩餘可用 = 總額 - 已用 - 已過期',
  ];

  return [header, ...rows, totalRow];
}

function buildTab3Rows(caps: SpendCapTrackerItem[]): (string | number)[][] {
  const header = [
    '狀態',
    '信用卡 / 計畫',
    '上限 ($)',
    '已刷 ($)',
    '尚餘 ($)',
    '回饋率與指定類別',
  ];

  const rows = caps.map((item, idx) => {
    const rowNum = idx + 2;
    return [
      item.activated ? '✓ 已啟用' : '待啟用',
      `${item.cardName} — ${item.programName}`,
      item.spendCap,
      item.currentSpend,
      `=MAX(0, C${rowNum}-D${rowNum})`,
      `${item.rewardRate} ｜ ${item.categoryDescription}`,
    ];
  });

  return [header, ...rows];
}

function buildTab4Rows(guide: CategoryBestCard[]): (string | number)[][] {
  const header = [
    '消費通路',
    '首選主力卡',
    '回饋率 (實質投報)',
    '次選備用卡',
  ];

  const rows = guide.map((g) => [
    g.category,
    g.bestCard,
    `${g.multiplier} (${g.effectiveReturnNote})`,
    g.runnerUpCard,
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

/**
 * Generates and downloads a 2x Retina PNG screenshot of the live Morandi tracker state
 * for sharing on GitHub or social media.
 */
export function downloadAppDemoScreenshotPNG(
  trackers: BenefitTrackerItem[],
  trackingDate: string,
  stats: {
    totalAnnualFees: number;
    totalTrackableCredits: number;
    usedTrackableCredits: number;
    expiredTrackableCredits: number;
    remainingTrackableCredits: number;
  }
): void {
  const width = 1200;
  const height = 820;
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);

  const drawRoundRect = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string,
    stroke?: string
  ) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };

  // Background
  drawRoundRect(0, 0, width, height, 0, '#F2EFE9');

  // Header card
  drawRoundRect(32, 28, 1136, 150, 16, '#FAF8F5', '#D8D2C9');
  ctx.fillStyle = '#6E685F';
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`CardLedger · 信用卡福利追蹤表 · 紀錄日：${trackingDate}`, 54, 58);

  ctx.fillStyle = '#3D3A36';
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('信用卡福利追蹤表 (Morandi Edition)', 54, 90);

  // 4 KPI Boxes
  const kpis = [
    {
      label: '持卡組合 · 免海外手續費',
      val: '11 張卡 (7 張免 FTF)',
      bg: '#E5EAEF',
      border: '#C5D0DA',
      color: '#3A4956',
    },
    {
      label: '總年費 vs 總福利',
      val: `$${stats.totalAnnualFees} / $${stats.totalTrackableCredits}`,
      bg: '#EFEAD8',
      border: '#D6CCB0',
      color: '#574B35',
    },
    {
      label: '已使用 / 已過期失效',
      val: `$${stats.usedTrackableCredits} / -$${stats.expiredTrackableCredits}`,
      bg: '#EFE3E1',
      border: '#D8C0BC',
      color: '#5E3F3C',
    },
    {
      label: '目前真正剩餘可用',
      val: `$${stats.remainingTrackableCredits}`,
      bg: '#E3EBE4',
      border: '#C2D1C4',
      color: '#3B4D40',
    },
  ];

  kpis.forEach((k, idx) => {
    const x = 54 + idx * 276;
    drawRoundRect(x, 108, 260, 54, 10, k.bg, k.border);
    ctx.fillStyle = k.color;
    ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(k.label, x + 14, 128);
    ctx.fillStyle = '#3D3A36';
    ctx.font = '800 16px "JetBrains Mono", monospace';
    ctx.fillText(k.val, x + 14, 150);
  });

  // Main Tracker Table Card
  drawRoundRect(32, 196, 1136, 592, 16, '#FAF8F5', '#D8D2C9');
  ctx.fillStyle = '#3D3A36';
  ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('年度報銷與免房券追蹤（時序排列 · Google 日曆提醒）', 54, 232);

  // 10 Tracker Rows (2 columns x 5 rows)
  trackers.slice(0, 10).forEach((item, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 54 + col * 552;
    const y = 252 + row * 102;
    const expired = item.expiredValue || 0;
    const rem = Math.max(0, item.maxValue - item.usedValue - expired);

    drawRoundRect(x, y, 536, 90, 12, '#F2EFE9', '#D8D2C9');

    ctx.fillStyle = '#635E57';
    ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      `${String(idx + 1).padStart(2, '0')}. ${item.cardName} ${
        item.calendarAlertLabel ? `· 🔔 ${item.calendarAlertLabel}` : ''
      }`,
      x + 16,
      y + 24
    );

    ctx.fillStyle = '#3D3A36';
    ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(item.shortTitle || item.benefitTitle, x + 16, y + 48);

    ctx.fillStyle = '#3B4D40';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillText(
      `已用 $${item.usedValue}  ｜  過期 -$${expired}  ｜  尚餘 $${rem} (總額 $${item.maxValue})`,
      x + 16,
      y + 72
    );
  });

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cardledger-demo-${trackingDate}.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

