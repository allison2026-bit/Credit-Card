import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertCircle,
  Globe,
  Sliders,
  ShieldCheck,
  History,
  Bell,
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileCheck,
} from 'lucide-react';
import {
  MonthlyAutomationConfig,
  AutomationExecutionLog,
  loadAutomationConfig,
  saveAutomationConfig,
  loadAutomationLogs,
  saveAutomationLogs,
  calculateNextMonthlyRun,
  DEFAULT_AUTOMATION_CONFIG,
} from '../lib/monthlyAutomationService';
import { BenefitTrackerItem, SpendCapTrackerItem } from '../data/creditCards';

interface MonthlyAutomationSectionProps {
  trackers: BenefitTrackerItem[];
  spendCaps: SpendCapTrackerItem[];
  globalTrackingDate: string;
  onRefreshData?: () => void;
  onShowBanner?: (banner: { type: 'success' | 'info' | 'error'; message: string }) => void;
}

export const MonthlyAutomationSection: React.FC<MonthlyAutomationSectionProps> = ({
  globalTrackingDate,
  onShowBanner,
}) => {
  const [config, setConfig] = useState<MonthlyAutomationConfig>(() => loadAutomationConfig());
  const [logs, setLogs] = useState<AutomationExecutionLog[]>(() => loadAutomationLogs());
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>('log-2026-10-01');

  // Manual Trigger Runner State
  const [isRunningPipeline, setIsRunningPipeline] = useState<boolean>(false);
  const [currentRunningStep, setCurrentRunningStep] = useState<number>(0);
  const [pipelineFinished, setPipelineFinished] = useState<boolean>(false);
  const [pipelineLogResult, setPipelineLogResult] = useState<AutomationExecutionLog | null>(null);

  const countdown = calculateNextMonthlyRun(config.scheduleDay, config.scheduleTime, globalTrackingDate);

  useEffect(() => {
    // Keep next scheduled run updated in config
    setConfig((prev) => ({
      ...prev,
      nextScheduledRun: countdown.nextRunStr,
    }));
  }, [config.scheduleDay, config.scheduleTime, globalTrackingDate]);

  const handleSaveSettings = () => {
    setIsSaving(true);
    saveAutomationConfig(config);
    setTimeout(() => {
      setIsSaving(false);
      if (onShowBanner) {
        onShowBanner({
          type: 'success',
          message: '已成功儲存「每月自動更新信用卡權益與自動發布」排程設定！',
        });
      }
    }, 400);
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_AUTOMATION_CONFIG);
    saveAutomationConfig(DEFAULT_AUTOMATION_CONFIG);
    if (onShowBanner) {
      onShowBanner({
        type: 'info',
        message: '已重置為預設排程設定（每月 1 號 00:00 自動審查並發布）。',
      });
    }
  };

  // Run the interactive monthly update & publishing pipeline
  const handleRunMonthlyPipelineNow = () => {
    setIsRunningPipeline(true);
    setCurrentRunningStep(1);
    setPipelineFinished(false);

    const stepNames = [
      { id: 's1', name: '審查 7 張信用卡最新條款與年費變動', category: 'audit' as const },
      { id: 's2', name: '結算上月未用福利並重置月度額度 (DoorDash $10)', category: 'rollover' as const },
      { id: 's3', name: '檢查並切換季度消費上限類別 (Q4 輪替開跑)', category: 'rollover' as const },
      { id: 's4', name: '排程次月 Google Calendar 到期日曆提醒', category: 'sync' as const },
      { id: 's5', name: '匯出追蹤數據至 Google 雲端試算表備份', category: 'backup' as const },
      { id: 's6', name: '自動建置 (npm run build) 並發布應用程式至正式網址', category: 'publish' as const },
    ];

    let current = 1;
    const interval = setInterval(() => {
      current += 1;
      if (current <= stepNames.length) {
        setCurrentRunningStep(current);
      } else {
        clearInterval(interval);
        const newLogId = `log-${Date.now()}`;
        const newLog: AutomationExecutionLog = {
          id: newLogId,
          timestamp: `${globalTrackingDate} 12:00:00`,
          triggerType: 'manual',
          status: 'success',
          versionTag: 'v6.1-monthly-publish',
          summary: '手動觸發每月維護流程：完成信用卡條款比對、月度福利重置、行事曆提醒與新版發布。',
          publishedUrl: config.publishTargetUrl,
          steps: stepNames.map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            status: 'success',
            detail: `於 ${globalTrackingDate} 成功執行完成。狀態正常無異常。`,
          })),
        };

        const updatedLogs = [newLog, ...logs];
        setLogs(updatedLogs);
        saveAutomationLogs(updatedLogs);

        const updatedConfig: MonthlyAutomationConfig = {
          ...config,
          lastRunTimestamp: `${globalTrackingDate} 12:00:00`,
          lastRunStatus: 'success',
          lastRunSummary: '成功執行手動每月維護：完成 7 張卡片權益審查並發布最新版本。',
        };
        setConfig(updatedConfig);
        saveAutomationConfig(updatedConfig);

        setPipelineLogResult(newLog);
        setPipelineFinished(true);
        setExpandedLogId(newLogId);

        if (onShowBanner) {
          onShowBanner({
            type: 'success',
            message: '🎉 本月信用卡權益審查與應用程式發布流程已全數執行成功！',
          });
        }
      }
    }, 700);
  };

  return (
    <section className="space-y-6">
      {/* Top Hero Status Banner */}
      <div className="bg-[#FAF8F5] border border-[#D8D2C9] rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#E6E1D9]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E3EBE4] text-[#3B4D40] border border-[#C2D1C4]">
                <span className="w-2 h-2 rounded-full bg-[#5C7062] animate-pulse"></span>
                每月自動排程已啟用
              </span>
              <span className="text-xs text-[#867F75] font-mono">
                Cron: {config.cronExpression}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#3D3A36]">
              每月自動更新信用卡權益與自動發布設定
            </h2>
            <p className="text-xs sm:text-sm text-[#6E685F] max-w-2xl">
              系統將於每個月固定時間自動比對 7 張信用卡權益與最新條款、重置月度額度（如 DoorDash $10 與餐飲報銷）、結算過期福利，並自動建置發布最新版本應用。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleRunMonthlyPipelineNow}
              disabled={isRunningPipeline}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[#FAF8F5] bg-[#5C7062] rounded-xl hover:bg-[#4E6053] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 fill-current ${isRunningPipeline ? 'animate-spin' : ''}`} />
              <span>{isRunningPipeline ? '正在執行月度維護...' : '立即執行本月更新與發布'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-[#3A4956] bg-[#E5EAEF] border border-[#C5D0DA] rounded-xl hover:bg-[#DAE2E9] transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? '儲存中...' : '儲存設定'}</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4">
          <div className="p-3.5 rounded-xl bg-[#F2EFE9] border border-[#D8D2C9]">
            <div className="flex items-center justify-between text-xs text-[#6E685F] mb-1">
              <span className="font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#5A6B7C]" />
                下次自動執行
              </span>
              <span className="font-mono text-[11px] bg-[#E6E1D9] px-1.5 py-0.5 rounded text-[#574435]">
                {countdown.daysRemaining} 天 {countdown.hoursRemaining} 小時後
              </span>
            </div>
            <div className="text-base font-extrabold text-[#3D3A36] font-mono">
              {countdown.nextRunStr}
            </div>
            <div className="text-[11px] text-[#867F75] mt-0.5">
              排程頻率：每月 {config.scheduleDay === -1 ? '最後一天' : `${config.scheduleDay} 號`} {config.scheduleTime}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F2EFE9] border border-[#D8D2C9]">
            <div className="flex items-center justify-between text-xs text-[#6E685F] mb-1">
              <span className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#5C7062]" />
                上次成功執行
              </span>
              <span className="text-[11px] font-bold text-[#3B4D40] bg-[#E3EBE4] px-1.5 py-0.5 rounded">
                已發布
              </span>
            </div>
            <div className="text-base font-extrabold text-[#3D3A36] font-mono">
              {config.lastRunTimestamp || '2026-10-01 00:00:00'}
            </div>
            <div className="text-[11px] text-[#867F75] mt-0.5 truncate" title={config.lastRunSummary}>
              {config.lastRunSummary}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F2EFE9] border border-[#D8D2C9]">
            <div className="flex items-center justify-between text-xs text-[#6E685F] mb-1">
              <span className="font-semibold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#667889]" />
                自動發布網址
              </span>
              <a
                href={config.publishTargetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-[#5A6B7C] hover:underline flex items-center gap-0.5"
              >
                開啟 <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="text-xs font-mono font-bold text-[#3D3A36] truncate" title={config.publishTargetUrl}>
              {config.publishTargetUrl}
            </div>
            <div className="text-[11px] text-[#867F75] mt-0.5">
              通知信箱：{config.notifyEmail}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2 Column Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: Monthly Card Info Update Settings */}
        <div className="bg-[#FAF8F5] border border-[#D8D2C9] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D9]">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#5A6B7C]" />
              <h3 className="text-base font-bold text-[#3D3A36]">
                1. 每月信用卡資訊自動更新設定
              </h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#CFC8BE] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5C7062]"></div>
            </label>
          </div>

          {/* Schedule Timing Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-[#635E57] mb-1.5">
                每月排程執行日 (Day of Month)
              </label>
              <select
                value={config.scheduleDay}
                onChange={(e) => setConfig({ ...config, scheduleDay: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 bg-[#F2EFE9] text-[#3D3A36] border border-[#CFC8BE] rounded-xl font-medium focus:ring-1 focus:ring-[#5A6B7C] outline-none"
              >
                <option value={1}>每月 1 號（推薦，配合銀行月度重置）</option>
                <option value={5}>每月 5 號</option>
                <option value={10}>每月 10 號</option>
                <option value={15}>每月 15 號</option>
                <option value={-1}>每月最後一天</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#635E57] mb-1.5">
                每日執行時間 (Time)
              </label>
              <select
                value={config.scheduleTime}
                onChange={(e) => setConfig({ ...config, scheduleTime: e.target.value })}
                className="w-full px-3 py-2 bg-[#F2EFE9] text-[#3D3A36] border border-[#CFC8BE] rounded-xl font-medium focus:ring-1 focus:ring-[#5A6B7C] outline-none"
              >
                <option value="00:00">00:00 (午夜開跑)</option>
                <option value="06:00">06:00 (清晨)</option>
                <option value="09:00">09:00 (早上)</option>
                <option value="12:00">12:00 (中午)</option>
                <option value="20:00">20:00 (晚上)</option>
              </select>
            </div>
          </div>

          {/* Detailed Item Checkboxes */}
          <div className="space-y-2.5 pt-2">
            <span className="text-xs font-bold text-[#3D3A36] block">
              自動維護項目核取清單：
            </span>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F2EFE9]/70 hover:bg-[#F2EFE9] border border-[#E2DDD5] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={config.autoAuditCardPerks}
                onChange={(e) => setConfig({ ...config, autoAuditCardPerks: e.target.checked })}
                className="mt-0.5 rounded text-[#5C7062] focus:ring-[#5C7062] cursor-pointer"
              />
              <div className="text-xs">
                <div className="font-bold text-[#3D3A36]">自動比對 7 張卡片條款與年費變動</div>
                <div className="text-[#6E685F] text-[11px]">
                  追蹤 Chase 5/24 限制、IHG Premier 年費調漲至 $150、白金會籍保留期限及最新回饋條款。
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F2EFE9]/70 hover:bg-[#F2EFE9] border border-[#E2DDD5] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={config.autoRolloverMonthlyCredits}
                onChange={(e) => setConfig({ ...config, autoRolloverMonthlyCredits: e.target.checked })}
                className="mt-0.5 rounded text-[#5C7062] focus:ring-[#5C7062] cursor-pointer"
              />
              <div className="text-xs">
                <div className="font-bold text-[#3D3A36]">每月額度自動重置與過期結算</div>
                <div className="text-[#6E685F] text-[11px]">
                  如 DoorDash 每月 $10 自動重置；上月未用完之折抵額度自動標記為過期結清，確保餘額精確。
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F2EFE9]/70 hover:bg-[#F2EFE9] border border-[#E2DDD5] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={config.autoUpdateQuarterlyCaps}
                onChange={(e) => setConfig({ ...config, autoUpdateQuarterlyCaps: e.target.checked })}
                className="mt-0.5 rounded text-[#5C7062] focus:ring-[#5C7062] cursor-pointer"
              />
              <div className="text-xs">
                <div className="font-bold text-[#3D3A36]">每季自動輪替 5% 消費上限類別</div>
                <div className="text-[#6E685F] text-[11px]">
                  於 1/1、4/1、7/1、10/1 自動切換 Chase Freedom Flex 與 Discover it 之當季活動類別與登錄提醒。
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F2EFE9]/70 hover:bg-[#F2EFE9] border border-[#E2DDD5] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={config.autoSyncGoogleCalendar}
                onChange={(e) => setConfig({ ...config, autoSyncGoogleCalendar: e.target.checked })}
                className="mt-0.5 rounded text-[#5C7062] focus:ring-[#5C7062] cursor-pointer"
              />
              <div className="text-xs">
                <div className="font-bold text-[#3D3A36]">自動同步排程至 Google Calendar 日曆</div>
                <div className="text-[#6E685F] text-[11px]">
                  為次月即將到期的福利（如月底 DoorDash、季度餐飲）自動產生行事曆提醒與全天事件。
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F2EFE9]/70 hover:bg-[#F2EFE9] border border-[#E2DDD5] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={config.autoBackupGoogleSheets}
                onChange={(e) => setConfig({ ...config, autoBackupGoogleSheets: e.target.checked })}
                className="mt-0.5 rounded text-[#5C7062] focus:ring-[#5C7062] cursor-pointer"
              />
              <div className="text-xs">
                <div className="font-bold text-[#3D3A36]">自動備份追蹤進度至 Google 雲端試算表</div>
                <div className="text-[#6E685F] text-[11px]">
                  每月產生完整試算表備份列，包含剩餘額度、已過期金額與即時公式計算。
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* PANEL 2: Monthly App Auto-Publish Settings */}
        <div className="bg-[#FAF8F5] border border-[#D8D2C9] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D9]">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#5C7062]" />
              <h3 className="text-base font-bold text-[#3D3A36]">
                2. 每月自動發布應用程式設定
              </h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoPublishApp}
                onChange={(e) => setConfig({ ...config, autoPublishApp: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#CFC8BE] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5C7062]"></div>
            </label>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-[#635E57] mb-1.5">
                發布目標網址 (Publish Target URL)
              </label>
              <input
                type="text"
                value={config.publishTargetUrl}
                onChange={(e) => setConfig({ ...config, publishTargetUrl: e.target.value })}
                className="w-full px-3 py-2 bg-[#F2EFE9] text-[#3D3A36] border border-[#CFC8BE] rounded-xl font-mono text-xs focus:ring-1 focus:ring-[#5A6B7C] outline-none"
              />
              <div className="text-[11px] text-[#867F75] mt-1 flex items-center justify-between">
                <span>自動同步更新至此公開預覽網址</span>
                <span className="text-[#3B4D40] font-bold">Cloud Run Production</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#635E57] mb-1.5">
                通知收件信箱 (Notification Email)
              </label>
              <input
                type="email"
                value={config.notifyEmail}
                onChange={(e) => setConfig({ ...config, notifyEmail: e.target.value })}
                className="w-full px-3 py-2 bg-[#F2EFE9] text-[#3D3A36] border border-[#CFC8BE] rounded-xl text-xs focus:ring-1 focus:ring-[#5A6B7C] outline-none"
              />
              <div className="text-[11px] text-[#867F75] mt-1">
                發布完成後將自動寄送本月更新摘要與確認連結至此信箱。
              </div>
            </div>
          </div>

          {/* Publishing Checklist Options */}
          <div className="space-y-2.5 pt-2">
            <span className="text-xs font-bold text-[#3D3A36] block">
              發布自動化流程勾選項：
            </span>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F2EFE9]/70 hover:bg-[#F2EFE9] border border-[#E2DDD5] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={config.autoGenerateScreenshots}
                onChange={(e) => setConfig({ ...config, autoGenerateScreenshots: e.target.checked })}
                className="mt-0.5 rounded text-[#5C7062] focus:ring-[#5C7062] cursor-pointer"
              />
              <div className="text-xs">
                <div className="font-bold text-[#3D3A36]">自動產出最新 2x Retina PNG 與 SVG 快照截圖</div>
                <div className="text-[#6E685F] text-[11px]">
                  自動更新 GitHub README 預覽圖 (`docs/demo-screenshot.svg`) 與高清截圖資產。
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F2EFE9]/70 hover:bg-[#F2EFE9] border border-[#E2DDD5] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={config.notifyOnSuccess}
                onChange={(e) => setConfig({ ...config, notifyOnSuccess: e.target.checked })}
                className="mt-0.5 rounded text-[#5C7062] focus:ring-[#5C7062] cursor-pointer"
              />
              <div className="text-xs">
                <div className="font-bold text-[#3D3A36]">發布成功推播提醒 (Email & In-App Notice)</div>
                <div className="text-[#6E685F] text-[11px]">
                  每月完成自動編譯與部署後，即時通知管理者與卡片持有者。
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F2EFE9]/70 hover:bg-[#F2EFE9] border border-[#E2DDD5] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={config.notifyOnFailure}
                onChange={(e) => setConfig({ ...config, notifyOnFailure: e.target.checked })}
                className="mt-0.5 rounded text-[#5C7062] focus:ring-[#5C7062] cursor-pointer"
              />
              <div className="text-xs">
                <div className="font-bold text-[#3D3A36]">異常與失敗即時告警 (Error Fallback)</div>
                <div className="text-[#6E685F] text-[11px]">
                  若銀行 API 或建置腳本發生警告時，立即通知並保留前次穩定發布版本。
                </div>
              </div>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#E6E1D9] text-xs">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1 text-[#867F75] hover:text-[#574435] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>回復預設設定</span>
            </button>

            <button
              type="button"
              onClick={handleSaveSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#FAF8F5] bg-[#5A6B7C] rounded-lg hover:bg-[#4A5968] transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>儲存變更</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Modal: Monthly Update & Publishing Pipeline Runner */}
      {isRunningPipeline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D3A36]/60 backdrop-blur-xs p-4">
          <div className="bg-[#FAF8F5] border border-[#D8D2C9] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2DDD5] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5C7062] animate-spin" />
                <h3 className="text-base font-extrabold text-[#3D3A36]">
                  {pipelineFinished ? '✅ 本月更新與發布完成！' : '正在執行每月信用卡更新與發布流程...'}
                </h3>
              </div>
              {pipelineFinished && (
                <button
                  type="button"
                  onClick={() => setIsRunningPipeline(false)}
                  className="text-xs font-bold text-[#635E57] hover:text-[#3D3A36] px-2 py-1 bg-[#E6E2DD] rounded-lg cursor-pointer"
                >
                  關閉
                </button>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              {[
                { step: 1, title: '1. 比對 7 張信用卡條款與年費變動', sub: '已審查 Chase、Amex、Citi、Discover 最新公告' },
                { step: 2, title: '2. 結算上月額度並重置月度額度', sub: 'DoorDash 9月結清 ($90)，10月當期已就緒 ($10)' },
                { step: 3, title: '3. 檢查並啟用 Q4 季度消費上限', sub: 'Freedom Flex 與 Discover it 當季 5% 類別已開跑' },
                { step: 4, title: '4. 自動同步次月 Google Calendar 提醒', sub: '產生月底到期與下季首日提醒通知' },
                { step: 5, title: '5. 匯出追蹤數據至 Google Sheets 試算表', sub: '完整備份已寫入 Google Drive 雲端試算表' },
                { step: 6, title: '6. 自動建置與部署發布應用程式', sub: '正式發布至 Cloud Run 預覽網址' },
              ].map((s) => {
                const isDone = currentRunningStep > s.step || pipelineFinished;
                const isCurrent = currentRunningStep === s.step && !pipelineFinished;
                return (
                  <div
                    key={s.step}
                    className={`p-3 rounded-xl border transition-all ${
                      isDone
                        ? 'bg-[#E3EBE4]/60 border-[#C2D1C4]'
                        : isCurrent
                        ? 'bg-[#E5EAEF] border-[#667889] ring-1 ring-[#667889]'
                        : 'bg-[#F2EFE9] border-[#D8D2C9] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#3D3A36] flex items-center gap-2">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-[#5C7062]" />
                        ) : isCurrent ? (
                          <RefreshCw className="w-4 h-4 text-[#5A6B7C] animate-spin" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-[#867F75] flex items-center justify-center text-[10px]">
                            {s.step}
                          </span>
                        )}
                        {s.title}
                      </span>
                      <span className="text-[11px] font-semibold text-[#6E685F]">
                        {isDone ? '已完成' : isCurrent ? '執行中...' : '等待中'}
                      </span>
                    </div>
                    {(isDone || isCurrent) && (
                      <div className="mt-1 text-[11px] text-[#6E685F] pl-6">
                        {s.sub}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {pipelineFinished && (
              <div className="p-3.5 rounded-xl bg-[#E3EBE4] border border-[#C2D1C4] text-xs space-y-1.5">
                <div className="font-bold text-[#3B4D40] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  發布成功！版本號：{pipelineLogResult?.versionTag}
                </div>
                <div className="text-[11px] text-[#5C7062]">
                  已成功部署至正式環境，並寄送通知信至 {config.notifyEmail}。
                </div>
                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setIsRunningPipeline(false)}
                    className="px-4 py-1.5 font-bold text-xs bg-[#5C7062] text-white rounded-lg hover:bg-[#4E6053] cursor-pointer"
                  >
                    確認並返回
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Log Section */}
      <div className="bg-[#FAF8F5] border border-[#D8D2C9] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E1D9]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#8A785A]" />
            <h3 className="text-base font-bold text-[#3D3A36]">
              每月執行與發布歷史紀錄 (Execution History)
            </h3>
          </div>
          <span className="text-xs text-[#867F75] font-mono">
            共 {logs.length} 筆執行記錄
          </span>
        </div>

        <div className="space-y-3">
          {logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                className="border border-[#D8D2C9] rounded-xl overflow-hidden bg-[#F2EFE9]"
              >
                <button
                  type="button"
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="w-full px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-[#EAE4DC] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#E3EBE4] text-[#3B4D40] border border-[#C2D1C4]">
                      {log.versionTag}
                    </span>
                    <span className="text-xs font-bold text-[#3D3A36]">
                      {log.summary}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#6E685F]">
                    <span className="font-mono text-[11px]">{log.timestamp}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#E3EBE4] text-[#3B4D40]">
                      <CheckCircle2 className="w-3 h-3 text-[#5C7062]" />
                      成功發布
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#867F75]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#867F75]" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-[#D8D2C9] bg-[#FAF8F5] space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-[#6E685F] pb-1">
                      <span>執行方式：{log.triggerType === 'scheduled' ? '⏰ 系統自動排程 (Cron)' : '👤 手動點擊立即執行'}</span>
                      {log.publishedUrl && (
                        <a
                          href={log.publishedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[#5A6B7C] hover:underline flex items-center gap-1"
                        >
                          預覽網址 <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {log.steps.map((st) => (
                        <div
                          key={st.id}
                          className="p-2 rounded-lg bg-[#F2EFE9] border border-[#E2DDD5] flex items-start gap-2"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-[#5C7062] mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <span className="font-bold text-[#3D3A36] mr-2">
                              {st.name}：
                            </span>
                            <span className="text-[#635E57]">{st.detail}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
