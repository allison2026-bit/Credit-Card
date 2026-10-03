// Monthly Credit Card Info Update & App Publishing Automation Service
// Manages recurring monthly cron schedules, card info audits, and auto-publishing

export interface MonthlyAutomationConfig {
  enabled: boolean;
  scheduleDay: number; // Day of month: 1, 5, 10, 15, or -1 for last day
  scheduleTime: string; // "00:00"
  timezone: string; // e.g. "America/Los_Angeles"
  cronExpression: string; // e.g. "0 0 1 * *"

  // Card Info Audit & Maintenance Options
  autoAuditCardPerks: boolean; // Check issuer policy changes & annual fee updates
  autoRolloverMonthlyCredits: boolean; // Reset DoorDash $10, dining credits, and expire unused prior month
  autoUpdateQuarterlyCaps: boolean; // Toggle Q1/Q2/Q3/Q4 categories on 1/1, 4/1, 7/1, 10/1
  autoSyncGoogleCalendar: boolean; // Sync monthly & quarterly deadlines to Google Calendar
  autoBackupGoogleSheets: boolean; // Export updated tracker snapshot to Google Sheets

  // Publishing & Deployment Options
  autoPublishApp: boolean; // Build and publish release to preview/production URL
  publishTargetUrl: string;
  autoGenerateScreenshots: boolean; // Auto-generate 2x Retina PNG and SVG screenshots
  notifyEmail: string;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;

  // Runtime State
  lastRunTimestamp: string | null;
  lastRunStatus: 'success' | 'warning' | 'idle' | 'running';
  lastRunSummary: string;
  nextScheduledRun: string;
}

export interface AutomationExecutionStep {
  id: string;
  name: string;
  category: 'audit' | 'rollover' | 'sync' | 'backup' | 'build' | 'publish';
  status: 'pending' | 'running' | 'success' | 'failed';
  detail: string;
}

export interface AutomationExecutionLog {
  id: string;
  timestamp: string;
  triggerType: 'scheduled' | 'manual';
  status: 'success' | 'failed' | 'running';
  versionTag: string;
  summary: string;
  steps: AutomationExecutionStep[];
  publishedUrl?: string;
}

const STORAGE_KEY_AUTOMATION_CONFIG = 'cardledger_automation_config_v1';
const STORAGE_KEY_AUTOMATION_LOGS = 'cardledger_automation_logs_v1';

export const DEFAULT_AUTOMATION_CONFIG: MonthlyAutomationConfig = {
  enabled: true,
  scheduleDay: 1,
  scheduleTime: '00:00',
  timezone: 'America/Los_Angeles (PT)',
  cronExpression: '0 0 1 * *',

  autoAuditCardPerks: true,
  autoRolloverMonthlyCredits: true,
  autoUpdateQuarterlyCaps: true,
  autoSyncGoogleCalendar: true,
  autoBackupGoogleSheets: true,

  autoPublishApp: true,
  publishTargetUrl: 'https://ais-pre-p7nubtyuwgs635s3qo4b65-56578231960.us-west1.run.app',
  autoGenerateScreenshots: true,
  notifyEmail: 'allisonvlog2026@gmail.com',
  notifyOnSuccess: true,
  notifyOnFailure: true,

  lastRunTimestamp: '2026-10-01 00:00:00',
  lastRunStatus: 'success',
  lastRunSummary: '成功完成 10 月份權益審查（IHG 改版同步、Q4 輪替開跑、DoorDash 9月過期結清/10月可用），並成功發布 October 3rd Version。',
  nextScheduledRun: '2026-11-01 00:00:00',
};

export const INITIAL_AUTOMATION_LOGS: AutomationExecutionLog[] = [
  {
    id: 'log-2026-10-01',
    timestamp: '2026-10-01 00:00:00',
    triggerType: 'scheduled',
    status: 'success',
    versionTag: 'v6.0-oct-release',
    summary: '例行 10 月份信用卡權益滾動與應用程式正式發布 (October 3rd Version)',
    publishedUrl: 'https://ais-pre-p7nubtyuwgs635s3qo4b65-56578231960.us-west1.run.app',
    steps: [
      {
        id: 's1',
        name: '銀行條款與年費審查',
        category: 'audit',
        status: 'success',
        detail: '比對 7 張卡片最新條款：Chase IHG One Rewards Premier 年費 $150、白金會籍保留至 2027、新增 $100 機票與 $100 餐飲折抵。',
      },
      {
        id: 's2',
        name: '月度權益額度滾動',
        category: 'rollover',
        status: 'success',
        detail: 'DoorDash 每月 $10 折抵：1–9月已過期結算 ($90)，10月當期重置為可用狀態 ($10)。',
      },
      {
        id: 's3',
        name: 'Q4 季度輪替消費上限切換',
        category: 'rollover',
        status: 'success',
        detail: 'Chase Freedom Flex Q4 (麥當勞/PayPal) 與 Discover it Q4 (Target/Amazon) 標記為進行中啟用。',
      },
      {
        id: 's4',
        name: 'Google Calendar 提醒同步',
        category: 'sync',
        status: 'success',
        detail: '產生 10/1 IHG 季度餐飲與機票提醒、11/1 Hyatt FNA 提醒之日曆排程。',
      },
      {
        id: 's5',
        name: 'Google Sheets 試算表備份',
        category: 'backup',
        status: 'success',
        detail: '已自動產生 10 月份最新權益追蹤資料列與公式欄位備份。',
      },
      {
        id: 's6',
        name: '自動建置與正式發布',
        category: 'publish',
        status: 'success',
        detail: '編譯通過 (npm run build)，自動生成 2x Retina PNG 截圖並部署發布至公開預覽網址。',
      },
    ],
  },
  {
    id: 'log-2026-09-01',
    timestamp: '2026-09-01 00:00:00',
    triggerType: 'scheduled',
    status: 'success',
    versionTag: 'v5.2-sep-release',
    summary: '例行 9 月份信用卡權益滾動與發布',
    publishedUrl: 'https://ais-pre-p7nubtyuwgs635s3qo4b65-56578231960.us-west1.run.app',
    steps: [
      {
        id: 's1',
        name: '銀行條款與年費審查',
        category: 'audit',
        status: 'success',
        detail: '審查 7 張卡片條款，所有回饋率與免年費卡無異動。',
      },
      {
        id: 's2',
        name: '月度權益額度滾動',
        category: 'rollover',
        status: 'success',
        detail: 'DoorDash 1–8月過期結清 ($80)，9月重置為可用。',
      },
      {
        id: 's3',
        name: '季度類別進度查核',
        category: 'rollover',
        status: 'success',
        detail: 'Q3 進入最後一個月倒數提醒。',
      },
      {
        id: 's4',
        name: '自動建置與正式發布',
        category: 'publish',
        status: 'success',
        detail: '成功打包發布至 Cloud Run 預覽環境。',
      },
    ],
  },
  {
    id: 'log-2026-08-01',
    timestamp: '2026-08-01 00:00:00',
    triggerType: 'scheduled',
    status: 'success',
    versionTag: 'v4.8-aug-release',
    summary: '例行 8 月份信用卡權益滾動與發布',
    publishedUrl: 'https://ais-pre-p7nubtyuwgs635s3qo4b65-56578231960.us-west1.run.app',
    steps: [
      {
        id: 's1',
        name: '月度權益額度滾動',
        category: 'rollover',
        status: 'success',
        detail: '重置 8 月 DoorDash $10 額度。',
      },
      {
        id: 's2',
        name: '自動建置與正式發布',
        category: 'publish',
        status: 'success',
        detail: '完成系統快照發布。',
      },
    ],
  },
];

export function loadAutomationConfig(): MonthlyAutomationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTOMATION_CONFIG);
    if (!raw) return DEFAULT_AUTOMATION_CONFIG;
    return { ...DEFAULT_AUTOMATION_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AUTOMATION_CONFIG;
  }
}

export function saveAutomationConfig(config: MonthlyAutomationConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUTOMATION_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save automation config:', e);
  }
}

export function loadAutomationLogs(): AutomationExecutionLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTOMATION_LOGS);
    if (!raw) return INITIAL_AUTOMATION_LOGS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_AUTOMATION_LOGS;
  } catch {
    return INITIAL_AUTOMATION_LOGS;
  }
}

export function saveAutomationLogs(logs: AutomationExecutionLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_AUTOMATION_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save automation logs:', e);
  }
}

// Calculate next run date based on schedule day and time
export function calculateNextMonthlyRun(
  scheduleDay: number,
  scheduleTime: string,
  referenceDateStr: string = '2026-10-03'
): { nextRunStr: string; daysRemaining: number; hoursRemaining: number } {
  try {
    const ref = new Date(`${referenceDateStr}T12:00:00Z`);
    const year = ref.getFullYear();
    const month = ref.getMonth(); // 9 for Oct (0-indexed)

    const [hours, minutes] = scheduleTime.split(':').map((n) => parseInt(n, 10) || 0);

    // Target for this month
    let targetMonth = month;
    let targetYear = year;
    let targetDay = scheduleDay === -1 ? new Date(year, month + 1, 0).getDate() : scheduleDay;

    let targetDate = new Date(Date.UTC(targetYear, targetMonth, targetDay, hours, minutes, 0));

    // If target is in the past relative to reference, move to next month
    if (targetDate.getTime() <= ref.getTime()) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
      targetDay = scheduleDay === -1 ? new Date(targetYear, targetMonth + 1, 0).getDate() : scheduleDay;
      targetDate = new Date(Date.UTC(targetYear, targetMonth, targetDay, hours, minutes, 0));
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const nextRunStr = `${targetDate.getUTCFullYear()}-${pad(targetDate.getUTCMonth() + 1)}-${pad(
      targetDate.getUTCDate()
    )} ${pad(targetDate.getUTCHours())}:${pad(targetDate.getUTCMinutes())}:00`;

    const diffMs = Math.max(0, targetDate.getTime() - ref.getTime());
    const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return { nextRunStr, daysRemaining, hoursRemaining };
  } catch {
    return {
      nextRunStr: '2026-11-01 00:00:00',
      daysRemaining: 28,
      hoursRemaining: 12,
    };
  }
}
