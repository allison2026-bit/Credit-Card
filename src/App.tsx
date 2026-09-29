/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Copy,
  X,
  Smartphone,
  Table as TableIcon,
  CreditCard,
  ListChecks,
  TrendingUp,
  Compass,
  Calendar,
  Bell,
  Save,
  ChevronDown,
  RotateCcw,
  Globe,
  LogOut,
  ExternalLink,
  Camera,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  CREDIT_CARDS,
  INITIAL_BENEFIT_TRACKERS,
  INITIAL_SPEND_CAP_TRACKERS,
  SPEND_CATEGORY_GUIDE,
  CreditCardRecord,
  BenefitTrackerItem,
  BenefitMonthState,
  SpendCapTrackerItem,
} from './data/creditCards';
import {
  exportCardsToCSV,
  copySheetsTSVToClipboard,
  downloadAppDemoScreenshotPNG,
} from './lib/googleSheetsService';
import {
  PRESET_CALENDAR_ALERTS,
  CardCalendarAlertRule,
  CreatedCalendarEventResult,
  initCalendarAuth,
  googleCalendarSignIn,
  getCalendarAccessToken,
  calendarLogout,
  createGoogleCalendarAlertEvents,
  getNextOccurrenceDates,
} from './lib/googleCalendarService';

type ActiveSection =
  | 'audit-table'
  | 'benefit-tracker'
  | 'spend-caps'
  | 'category-guide';
type TableComparisonMode = 'corrected' | 'diff';
type SheetLayoutMode = 'mobile' | 'table';

// Bumped to v3 so the new 10-item chronological order and removed Hyatt $15k FNA take effect immediately
const STORAGE_KEY_TRACKERS = 'cardledger_benefit_trackers_v3';
const STORAGE_KEY_SPEND_CAPS = 'cardledger_spend_caps_v3';
const STORAGE_KEY_SAVED_AT = 'cardledger_last_saved_at_v3';
const STORAGE_KEY_SYNCED_ALERTS = 'cardledger_synced_calendar_alerts_v1';

// Morandi Palette Themes per Issuer
function getIssuerMorandiTheme(issuer: CreditCardRecord['issuer']) {
  switch (issuer) {
    case 'Chase':
      return {
        topBar: 'bg-[#667889]',
        headerBg: 'bg-[#ECEFF2]',
        badgeText: 'text-[#3A4956] bg-[#DCE3EA] border border-[#C5D0DA]',
        borderAccent: 'border-[#C9D2DC]',
      };
    case 'Amex':
      return {
        topBar: 'bg-[#627D80]',
        headerBg: 'bg-[#E9F0F0]',
        badgeText: 'text-[#374B4D] bg-[#D8E5E6] border border-[#C0D2D4]',
        borderAccent: 'border-[#C2D3D5]',
      };
    case 'Citi':
      return {
        topBar: 'bg-[#6B8071]',
        headerBg: 'bg-[#EBF0EC]',
        badgeText: 'text-[#3B4D40] bg-[#DCE6DD] border border-[#C2D1C4]',
        borderAccent: 'border-[#C5D3C7]',
      };
    case 'Discover':
      return {
        topBar: 'bg-[#947B66]',
        headerBg: 'bg-[#F2ECE6]',
        badgeText: 'text-[#574435] bg-[#E6DDD3] border border-[#D4C5B6]',
        borderAccent: 'border-[#D6C7B8]',
      };
  }
}

// Morandi Palette Themes per Benefit Category
function getCategoryMorandiTheme(category: BenefitTrackerItem['category']) {
  switch (category) {
    case '飯店折抵':
      return 'bg-[#E2E7EC] text-[#3A4956] border-[#C5D0DA]';
    case '航空報銷':
      return 'bg-[#E0EAEB] text-[#374C4E] border-[#BDD0D2]';
    case '免房券 (FNA)':
      return 'bg-[#EAE4EC] text-[#4B3F50] border-[#CCC2D1]';
    case '生活與外送':
      return 'bg-[#EFE3E1] text-[#5E3F3C] border-[#D8C0BC]';
    case '通關與旅遊保障':
      return 'bg-[#E3EBE4] text-[#3B4D40] border-[#C2D1C4]';
    case '刷卡滿額禮':
      return 'bg-[#EFEAD8] text-[#574B35] border-[#D6CCB0]';
  }
}

export default function App() {
  // Navigation & View state
  const [activeSection, setActiveSection] =
    useState<ActiveSection>('benefit-tracker');
  const [sheetLayoutMode, setSheetLayoutMode] =
    useState<SheetLayoutMode>('mobile');
  const [tableMode, setTableMode] = useState<TableComparisonMode>('corrected');
  const [issuerFilter, setIssuerFilter] = useState<string>('ALL');
  const [feeFilter, setFeeFilter] = useState<
    'ALL' | 'ANNUAL_FEE' | 'NO_FEE' | 'NO_FTF'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [guideSearchQuery, setGuideSearchQuery] = useState<string>('');

  // Global Tracking Date & Save State
  const [globalTrackingDate, setGlobalTrackingDate] =
    useState<string>('2026-09-29');
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SAVED_AT) || '2026-09-29';
    } catch {
      return '2026-09-29';
    }
  });

  // Google Calendar OAuth State
  const [calendarUser, setCalendarUser] = useState<User | null>(null);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);
  const [isSigningInCalendar, setIsSigningInCalendar] =
    useState<boolean>(false);
  const [isCreatingCalendarEvents, setIsCreatingCalendarEvents] =
    useState<boolean>(false);
  const [pendingAlertRulesToConfirm, setPendingAlertRulesToConfirm] = useState<
    CardCalendarAlertRule[] | null
  >(null);
  const [syncedAlertRuleIds, setSyncedAlertRuleIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SYNCED_ALERTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [lastCreatedEvents, setLastCreatedEvents] = useState<
    CreatedCalendarEventResult[]
  >([]);

  useEffect(() => {
    const unsubscribe = initCalendarAuth(
      (u, tok) => {
        setCalendarUser(u);
        setCalendarToken(tok);
      },
      () => {
        setCalendarUser(null);
        setCalendarToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Editable Tracker State (persisted to localStorage)
  const [cards] = useState<CreditCardRecord[]>(CREDIT_CARDS);
  const [trackers, setTrackers] = useState<BenefitTrackerItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRACKERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_BENEFIT_TRACKERS;
  });

  const [spendCaps, setSpendCaps] = useState<SpendCapTrackerItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SPEND_CAPS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_SPEND_CAP_TRACKERS;
  });

  const [trackerCategoryFilter, setTrackerCategoryFilter] =
    useState<string>('ALL');
  const [trackerStatusFilter, setTrackerStatusFilter] = useState<string>('ALL');

  // Auto-save whenever trackers or spendCaps change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRACKERS, JSON.stringify(trackers));
      localStorage.setItem(STORAGE_KEY_SPEND_CAPS, JSON.stringify(spendCaps));
    } catch {
      // ignore storage quota errors
    }
  }, [trackers, spendCaps]);

  // New Benefit Modal State
  const [isAddBenefitOpen, setIsAddBenefitOpen] = useState<boolean>(false);
  const [newBenefitCardName, setNewBenefitCardName] = useState<string>(
    CREDIT_CARDS[0].name
  );
  const [newBenefitTitle, setNewBenefitTitle] = useState<string>('');
  const [newBenefitCategory, setNewBenefitCategory] =
    useState<BenefitTrackerItem['category']>('生活與外送');
  const [newBenefitCadence, setNewBenefitCadence] =
    useState<BenefitTrackerItem['cadence']>('每曆年');
  const [newBenefitDeadline, setNewBenefitDeadline] =
    useState<string>('2026/12/31 到期');
  const [newBenefitMax, setNewBenefitMax] = useState<string>('50');
  const [newBenefitNotes, setNewBenefitNotes] = useState<string>('');

  // Action Banner State
  const [sheetActionBanner, setSheetActionBanner] = useState<{
    type: 'success' | 'info' | 'error';
    message: string;
  } | null>(null);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (issuerFilter !== 'ALL' && card.issuer !== issuerFilter) return false;
      if (feeFilter === 'ANNUAL_FEE' && card.annualFee === 0) return false;
      if (feeFilter === 'NO_FEE' && card.annualFee > 0) return false;
      if (feeFilter === 'NO_FTF' && !card.foreignTxFee.includes('$0'))
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = [
          card.name,
          card.issuer,
          card.rewardsCurrency,
          card.foreignTxFee,
          card.corrected.chaseTravelCredit,
          card.corrected.airlineCredit,
          card.corrected.hotelStatus,
          card.corrected.primaryRewards,
          card.corrected.otherRewards,
          card.corrected.keyAnnualPerks,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [cards, issuerFilter, feeFilter, searchQuery]);

  // Filtered Trackers
  const filteredTrackers = useMemo(() => {
    return trackers.filter((item) => {
      if (
        trackerCategoryFilter !== 'ALL' &&
        item.category !== trackerCategoryFilter
      ) {
        return false;
      }
      if (trackerStatusFilter !== 'ALL' && item.status !== trackerStatusFilter) {
        return false;
      }
      return true;
    });
  }, [trackers, trackerCategoryFilter, trackerStatusFilter]);

  // Filtered Category Guide
  const filteredGuide = useMemo(() => {
    if (!guideSearchQuery.trim()) return SPEND_CATEGORY_GUIDE;
    const q = guideSearchQuery.toLowerCase();
    return SPEND_CATEGORY_GUIDE.filter((g) =>
      [g.category, g.bestCard, g.multiplier, g.runnerUpCard, g.tips]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [guideSearchQuery]);

  // Portfolio Quantitative Metrics
  const portfolioStats = useMemo(() => {
    const totalAnnualFees = cards.reduce((sum, c) => sum + c.annualFee, 0);
    const activeTrackers = trackers.filter((t) => t.id !== 'trk-ff-cell');
    const totalTrackableCredits = activeTrackers.reduce(
      (sum, t) => sum + t.maxValue,
      0
    );
    const usedTrackableCredits = activeTrackers.reduce(
      (sum, t) => sum + t.usedValue,
      0
    );
    const expiredTrackableCredits = activeTrackers.reduce(
      (sum, t) => sum + (t.expiredValue || 0),
      0
    );
    const remainingTrackableCredits = activeTrackers.reduce(
      (sum, t) =>
        Math.max(0, t.maxValue - t.usedValue - (t.expiredValue || 0)) + sum,
      0
    );
    const netPositiveValue = totalTrackableCredits - totalAnnualFees;

    return {
      totalAnnualFees,
      totalTrackableCredits,
      usedTrackableCredits,
      expiredTrackableCredits,
      remainingTrackableCredits,
      netPositiveValue,
    };
  }, [cards, trackers]);

  // Compute status from usedValue, expiredValue, maxValue
  const computeStatus = (
    used: number,
    expired: number,
    max: number
  ): BenefitTrackerItem['status'] => {
    const rem = Math.max(0, max - used - expired);
    if (used >= max) return '已用畢';
    if (expired >= max) return '已過期';
    if (rem === 0 && used > 0) return '已用畢';
    if (used > 0) return '部分使用';
    if (expired > 0) return '部分過期';
    return '未使用';
  };

  // Google Calendar Sign-In & Alert Creation Handlers
  const handleGoogleCalendarSignIn = async () => {
    setIsSigningInCalendar(true);
    try {
      const result = await googleCalendarSignIn();
      if (result) {
        setCalendarUser(result.user);
        setCalendarToken(result.accessToken);
        setSheetActionBanner({
          type: 'success',
          message: `已成功連結 Google Calendar (${result.user.email || '已授權'})，現在可設定福利提醒！`,
        });
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setSheetActionBanner({
          type: 'error',
          message: `Google 登入失敗：${err?.message || '請稍後再試'}`,
        });
      }
    } finally {
      setIsSigningInCalendar(false);
    }
  };

  const handleGoogleCalendarLogout = async () => {
    await calendarLogout();
    setCalendarUser(null);
    setCalendarToken(null);
    setSheetActionBanner({
      type: 'info',
      message: '已中斷 Google Calendar 連結。',
    });
  };

  // Opens mandatory confirmation dialog before mutating user's Google Calendar
  const handleRequestSetCalendarAlerts = async (
    rules: CardCalendarAlertRule[]
  ) => {
    let token = await getCalendarAccessToken();
    if (!token) {
      try {
        setIsSigningInCalendar(true);
        const result = await googleCalendarSignIn();
        if (!result) return;
        token = result.accessToken;
        setCalendarUser(result.user);
        setCalendarToken(result.accessToken);
      } catch (err: any) {
        if (err?.code !== 'auth/popup-closed-by-user') {
          setSheetActionBanner({
            type: 'error',
            message: '請先完成 Google 帳號授權以設定 Google Calendar 提醒。',
          });
        }
        return;
      } finally {
        setIsSigningInCalendar(false);
      }
    }
    setPendingAlertRulesToConfirm(rules);
  };

  const handleConfirmCreateCalendarAlerts = async () => {
    if (!pendingAlertRulesToConfirm || pendingAlertRulesToConfirm.length === 0)
      return;

    const token = (await getCalendarAccessToken()) || calendarToken;
    if (!token) {
      setPendingAlertRulesToConfirm(null);
      setSheetActionBanner({
        type: 'error',
        message: 'Google Calendar 授權已過期，請重新點擊 Sign in with Google。',
      });
      return;
    }

    setIsCreatingCalendarEvents(true);
    try {
      const created = await createGoogleCalendarAlertEvents(
        token,
        pendingAlertRulesToConfirm,
        globalTrackingDate
      );
      const nextIds = Array.from(
        new Set([
          ...syncedAlertRuleIds,
          ...pendingAlertRulesToConfirm.map((r) => r.id),
        ])
      );
      setSyncedAlertRuleIds(nextIds);
      try {
        localStorage.setItem(
          STORAGE_KEY_SYNCED_ALERTS,
          JSON.stringify(nextIds)
        );
      } catch {
        // ignore storage errors
      }
      setLastCreatedEvents(created);
      setPendingAlertRulesToConfirm(null);
      setSheetActionBanner({
        type: 'success',
        message: `已成功在您的 Google Calendar 建立 ${created.length} 筆每年自動重複提醒事件！`,
      });
    } catch (err: any) {
      setSheetActionBanner({
        type: 'error',
        message: `建立日曆提醒失敗：${err?.message || '請確認已授權 Google Calendar 權限'}`,
      });
    } finally {
      setIsCreatingCalendarEvents(false);
    }
  };

  // Tracker Handlers
  const handleSaveTrackingProgress = () => {
    try {
      localStorage.setItem(STORAGE_KEY_TRACKERS, JSON.stringify(trackers));
      localStorage.setItem(STORAGE_KEY_SPEND_CAPS, JSON.stringify(spendCaps));
      localStorage.setItem(STORAGE_KEY_SAVED_AT, globalTrackingDate);
      setLastSavedTimestamp(globalTrackingDate);
      setSheetActionBanner({
        type: 'success',
        message: `已儲存追蹤日期 (${globalTrackingDate}) 與所有福利報銷狀態！`,
      });
    } catch {
      setSheetActionBanner({
        type: 'error',
        message: '儲存失敗，請檢查瀏覽器權限。',
      });
    }
  };

  const handleResetTrackersToDefault = () => {
    setTrackers(INITIAL_BENEFIT_TRACKERS);
    setSpendCaps(INITIAL_SPEND_CAP_TRACKERS);
    setGlobalTrackingDate('2026-09-29');
    setLastSavedTimestamp('2026-09-29');
    setSheetActionBanner({
      type: 'info',
      message:
        '已重置為 2026/09/29 預設報銷追蹤狀態與最新時序排序。',
    });
  };

  const handleApplyTrackingDateToAll = (newDate: string) => {
    setGlobalTrackingDate(newDate);
    const parsedMonth = Number(newDate.split('-')[1]) || 9;
    const elapsedFullMonths = Math.max(0, Math.min(12, parsedMonth - 1));

    setTrackers((prev) =>
      prev.map((item) => {
        if (item.id === 'trk-csp-doordash' && item.monthlyStates) {
          const nextMonths: BenefitMonthState[] = item.monthlyStates.map(
            (m) => {
              if (m.month <= elapsedFullMonths) {
                return m.state === 'used' ? m : { ...m, state: 'expired' };
              }
              if (m.month === parsedMonth) {
                return m.state === 'expired'
                  ? { ...m, state: 'available' }
                  : m;
              }
              return { ...m, state: 'available' };
            }
          );
          const usedVal = nextMonths
            .filter((m) => m.state === 'used')
            .reduce((s, m) => s + m.amount, 0);
          const expVal = nextMonths
            .filter((m) => m.state === 'expired')
            .reduce((s, m) => s + m.amount, 0);
          return {
            ...item,
            recordedDate: newDate,
            monthlyStates: nextMonths,
            usedValue: usedVal,
            expiredValue: expVal,
            status: computeStatus(usedVal, expVal, item.maxValue),
          };
        }
        return {
          ...item,
          recordedDate: newDate,
        };
      })
    );
  };

  const handleCopySheetsTSV = async () => {
    try {
      await copySheetsTSVToClipboard(
        cards,
        trackers,
        spendCaps,
        SPEND_CATEGORY_GUIDE
      );
      setSheetActionBanner({
        type: 'success',
        message:
          '已將精簡版 4 分頁追蹤表（含免海外手續費欄、時序報銷與日曆提醒）複製到剪貼簿！',
      });
    } catch {
      setSheetActionBanner({
        type: 'error',
        message: '複製失敗，請改用「下載 CSV」按鈕匯入。',
      });
    }
  };

  const handleUpdateTrackerFields = (
    id: string,
    patch: Partial<
      Pick<
        BenefitTrackerItem,
        'usedValue' | 'expiredValue' | 'recordedDate' | 'status'
      >
    >
  ) => {
    setTrackers((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextUsed =
          patch.usedValue !== undefined
            ? Math.max(0, Math.min(item.maxValue, patch.usedValue))
            : item.usedValue;
        const nextExpired =
          patch.expiredValue !== undefined
            ? Math.max(
                0,
                Math.min(item.maxValue - nextUsed, patch.expiredValue)
              )
            : Math.min(item.maxValue - nextUsed, item.expiredValue || 0);
        const nextStatus =
          patch.status !== undefined
            ? patch.status
            : computeStatus(nextUsed, nextExpired, item.maxValue);
        const nextDate =
          patch.recordedDate ?? item.recordedDate ?? globalTrackingDate;
        return {
          ...item,
          usedValue: nextUsed,
          expiredValue: nextExpired,
          status: nextStatus,
          recordedDate: nextDate,
        };
      })
    );
  };

  // Cycle a specific month/period state: available -> used -> expired -> available
  const handleCycleMonthState = (itemId: string, monthNum: number) => {
    setTrackers((prev) =>
      prev.map((item) => {
        if (item.id !== itemId || !item.monthlyStates) return item;
        const nextMonths: BenefitMonthState[] = item.monthlyStates.map((m) => {
          if (m.month !== monthNum) return m;
          const nextState: BenefitMonthState['state'] =
            m.state === 'available'
              ? 'used'
              : m.state === 'used'
              ? 'expired'
              : 'available';
          return { ...m, state: nextState };
        });
        const usedVal = nextMonths
          .filter((m) => m.state === 'used')
          .reduce((s, m) => s + m.amount, 0);
        const expVal = nextMonths
          .filter((m) => m.state === 'expired')
          .reduce((s, m) => s + m.amount, 0);
        return {
          ...item,
          monthlyStates: nextMonths,
          usedValue: usedVal,
          expiredValue: expVal,
          recordedDate: globalTrackingDate,
          status: computeStatus(usedVal, expVal, item.maxValue),
        };
      })
    );
  };

  // Preset for DoorDash on 2026/09/29: 1-8月 expired ($80), toggle whether 9月 is used ($30 left) or not used ($40 left)
  const handleSetDoorDashScenario = (sepUsed: boolean) => {
    setTrackers((prev) =>
      prev.map((item) => {
        if (item.id !== 'trk-csp-doordash' || !item.monthlyStates) return item;
        const nextMonths: BenefitMonthState[] = item.monthlyStates.map((m) => {
          if (m.month <= 8) return { ...m, state: 'expired' };
          if (m.month === 9)
            return { ...m, state: sepUsed ? 'used' : 'available' };
          return { ...m, state: 'available' };
        });
        const usedVal = sepUsed ? 10 : 0;
        const expVal = 80;
        return {
          ...item,
          recordedDate: '2026-09-29',
          monthlyStates: nextMonths,
          usedValue: usedVal,
          expiredValue: expVal,
          status: computeStatus(usedVal, expVal, item.maxValue),
        };
      })
    );
  };

  const handleToggleQuickComplete = (id: string) => {
    setTrackers((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const availableMax = Math.max(
          0,
          item.maxValue - (item.expiredValue || 0)
        );
        const isDone = item.usedValue >= availableMax && availableMax > 0;
        const nextUsed = isDone ? 0 : availableMax;
        return {
          ...item,
          usedValue: nextUsed,
          recordedDate: globalTrackingDate,
          status: computeStatus(
            nextUsed,
            item.expiredValue || 0,
            item.maxValue
          ),
        };
      })
    );
  };

  const handleAddCustomBenefit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBenefitTitle.trim()) return;
    const maxVal = Math.max(1, Number(newBenefitMax) || 50);
    const newItem: BenefitTrackerItem = {
      id: `custom-${Date.now()}`,
      cardId: 'custom',
      cardName: newBenefitCardName,
      benefitTitle: newBenefitTitle.trim(),
      shortTitle: newBenefitTitle.trim(),
      category: newBenefitCategory,
      cadence: newBenefitCadence,
      deadlineOrReset: newBenefitDeadline.trim() || '每曆年重置',
      maxValue: maxVal,
      usedValue: 0,
      expiredValue: 0,
      recordedDate: globalTrackingDate,
      status: '未使用',
      activationRequired: false,
      notes: newBenefitNotes.trim() || '自訂新增福利追蹤項目',
    };
    setTrackers((prev) => [...prev, newItem]);
    setNewBenefitTitle('');
    setNewBenefitNotes('');
    setIsAddBenefitOpen(false);
  };

  const handleUpdateSpendCap = (id: string, nextSpend: number) => {
    setSpendCaps((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        return {
          ...c,
          currentSpend: Math.max(0, Math.min(c.spendCap * 1.5, nextSpend)),
        };
      })
    );
  };

  const handleToggleSpendCapActivated = (id: string) => {
    setSpendCaps((prev) =>
      prev.map((c) => (c.id === id ? { ...c, activated: !c.activated } : c))
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F2EFE9] text-[#3D3A36] pb-16 md:pb-0">
      {/* Top Bar: 3 Clean Zones in Morandi Palette */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#D8D2C9]">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('audit-table');
          }}
          className="text-base sm:text-lg font-extrabold tracking-tight text-[#3D3A36] whitespace-nowrap"
        >
          CardLedger
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#6E685F]">
          {[
            { id: 'audit-table', label: '權益總表' },
            { id: 'benefit-tracker', label: '報銷追蹤' },
            { id: 'spend-caps', label: '季度與滿額' },
            { id: 'category-guide', label: '刷卡攻略' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as ActiveSection)}
              className={`py-1 transition-colors whitespace-nowrap border-b-2 cursor-pointer ${
                activeSection === tab.id
                  ? 'text-[#3D3A36] border-[#667889] font-bold'
                  : 'border-transparent hover:text-[#3D3A36]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              downloadAppDemoScreenshotPNG(
                trackers,
                globalTrackingDate,
                portfolioStats
              );
              setSheetActionBanner({
                type: 'success',
                message: '已下載高清莫蘭迪配色預覽截圖 (PNG)，可直接上傳至 GitHub！',
              });
            }}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-[#3A4956] bg-[#E5EAEF] border border-[#C5D0DA] rounded-lg hover:bg-[#DAE2E9] transition-colors whitespace-nowrap cursor-pointer"
            title="下載 GitHub 預覽截圖 (PNG)"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>截圖</span>
          </button>

          <button
            type="button"
            onClick={() =>
              exportCardsToCSV(
                cards,
                trackers,
                spendCaps,
                SPEND_CATEGORY_GUIDE
              )
            }
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-[#FAF8F5] bg-[#5C7062] rounded-lg hover:bg-[#4E6053] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1380px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Compact Morandi Hero & KPI Strip */}
        <section className="bg-[#FAF8F5] border border-[#D8D2C9] rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6E1D9]">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-[#6E685F]">
                <span>信用卡福利追蹤表</span>
                <span aria-hidden="true">·</span>
                <span>紀錄日：{globalTrackingDate}</span>
                <span aria-hidden="true">·</span>
                <span>支援 Google Calendar 提醒</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#3D3A36] mt-0.5">
                信用卡福利追蹤表
              </h1>
            </div>

            {/* Layout Mode Switcher */}
            <div className="inline-flex items-center gap-1 p-1 bg-[#E6E2DD] rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSheetLayoutMode('mobile')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  sheetLayoutMode === 'mobile'
                    ? 'bg-[#5A6B7C] text-[#FAF8F5]'
                    : 'text-[#635E57] hover:text-[#3D3A36]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>精簡卡片</span>
              </button>
              <button
                type="button"
                onClick={() => setSheetLayoutMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  sheetLayoutMode === 'table'
                    ? 'bg-[#5A6B7C] text-[#FAF8F5]'
                    : 'text-[#635E57] hover:text-[#3D3A36]'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>精簡表格</span>
              </button>
            </div>
          </div>

          {/* Action Banner */}
          {sheetActionBanner && (
            <div className="pt-3 flex items-center justify-between gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 font-semibold ${
                  sheetActionBanner.type === 'success'
                    ? 'text-[#3B4D40]'
                    : sheetActionBanner.type === 'info'
                    ? 'text-[#3A4956]'
                    : 'text-[#61413E]'
                }`}
              >
                {sheetActionBanner.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{sheetActionBanner.message}</span>
              </span>
              <button
                type="button"
                onClick={() => setSheetActionBanner(null)}
                className="text-[#867F75] hover:text-[#3D3A36]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Morandi 4-Card KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 pt-4">
            <div className="p-3 rounded-xl bg-[#E5EAEF] border border-[#C5D0DA]">
              <div className="text-[11px] font-semibold text-[#3A4956]">
                持卡組合 · 免海外手續費
              </div>
              <div className="mt-0.5 text-lg sm:text-xl font-extrabold font-mono tabular-nums text-[#3D3A36]">
                11 張卡
              </div>
              <div className="text-[11px] text-[#526373]">
                7 張免 FTF · 4 張有年費
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#EFEAD8] border border-[#D6CCB0]">
              <div className="text-[11px] font-semibold text-[#574B35]">
                年度總年費 vs 總福利
              </div>
              <div className="mt-0.5 text-lg sm:text-xl font-extrabold font-mono tabular-nums text-[#3D3A36]">
                ${portfolioStats.totalAnnualFees}
                <span className="text-xs font-normal text-[#867F75]"> / </span>
                <span className="text-[#3B4D40]">
                  ${portfolioStats.totalTrackableCredits}
                </span>
              </div>
              <div className="text-[11px] text-[#6B5D43]">
                淨潛在價值 +${portfolioStats.netPositiveValue}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#EFE3E1] border border-[#D8C0BC]">
              <div className="text-[11px] font-semibold text-[#5E3F3C]">
                已用金額 / 已過期失效
              </div>
              <div className="mt-0.5 text-lg sm:text-xl font-extrabold font-mono tabular-nums">
                <span className="text-[#3B4D40]">
                  ${portfolioStats.usedTrackableCredits}
                </span>
                <span className="text-xs font-normal text-[#867F75]"> / </span>
                <span className="text-[#61413E]">
                  -${portfolioStats.expiredTrackableCredits}
                </span>
              </div>
              <div className="text-[11px] text-[#75524E]">
                含過期額度自動扣除
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#E3EBE4] border border-[#C2D1C4]">
              <div className="text-[11px] font-semibold text-[#3B4D40]">
                目前真正剩餘可用
              </div>
              <div className="mt-0.5 text-lg sm:text-xl font-extrabold font-mono tabular-nums text-[#3B4D40]">
                ${portfolioStats.remainingTrackableCredits.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#4E6353]">
                已扣過期與已用額度
              </div>
            </div>
          </div>

          {/* Mobile Section Switcher in Morandi Tones */}
          <div className="grid grid-cols-4 gap-1.5 pt-3.5 mt-3.5 border-t border-[#E6E1D9] md:hidden">
            {[
              { id: 'audit-table', label: '權益總表', color: 'bg-[#5A6B7C]' },
              {
                id: 'benefit-tracker',
                label: '報銷追蹤',
                color: 'bg-[#5C7062]',
              },
              { id: 'spend-caps', label: '季度滿額', color: 'bg-[#8A785A]' },
              {
                id: 'category-guide',
                label: '刷卡攻略',
                color: 'bg-[#736479]',
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id as ActiveSection)}
                className={`min-h-[40px] px-2 py-1.5 text-xs font-bold rounded-xl transition-colors text-center cursor-pointer ${
                  activeSection === tab.id
                    ? `${tab.color} text-[#FAF8F5]`
                    : 'bg-[#E6E2DD] text-[#635E57] hover:bg-[#DDD8D1]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* =========================================================
            SECTION 1: 權益總表 (MORANDI PALETTE + NO FTF COLUMN + DROPDOWN DETAILS)
           ========================================================= */}
        {activeSection === 'audit-table' && (
          <section className="bg-[#FAF8F5] border border-[#D8D2C9] rounded-2xl overflow-hidden">
            {/* Compact Filter Bar */}
            <div className="p-4 border-b border-[#D8D2C9] flex flex-col gap-3 bg-[#EFECE6]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-[#3D3A36]">
                    信用卡完整權益總表
                  </h2>
                  <p className="text-xs text-[#635E57]">
                    精簡重點一覽（含免海外手續費欄），點擊卡片下方「展開詳情」可看完整條款
                  </p>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-[#867F75] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋卡片、免FTF、5x..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-[#FAF8F5] text-[#3D3A36] border border-[#CFC8BE] rounded-lg focus:outline-none focus:border-[#667889]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#867F75] hover:text-[#3D3A36]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Issuer Filter */}
                <div className="flex items-center gap-1 p-1 bg-[#E2DDD5] rounded-lg overflow-x-auto">
                  {['ALL', 'Chase', 'Amex', 'Citi', 'Discover'].map(
                    (issuer) => (
                      <button
                        key={issuer}
                        type="button"
                        onClick={() => setIssuerFilter(issuer)}
                        className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                          issuerFilter === issuer
                            ? 'bg-[#FAF8F5] text-[#3A4956]'
                            : 'text-[#635E57] hover:text-[#3D3A36]'
                        }`}
                      >
                        {issuer === 'ALL' ? '全部 (11)' : issuer}
                      </button>
                    )
                  )}
                </div>

                {/* Fee & No FTF Filter */}
                <div className="flex items-center gap-1 p-1 bg-[#E2DDD5] rounded-lg overflow-x-auto">
                  {[
                    { id: 'ALL', label: '全部卡別' },
                    { id: 'NO_FTF', label: '✓ 免海外手續費 (7)' },
                    { id: 'ANNUAL_FEE', label: '有年費 (4)' },
                    { id: 'NO_FEE', label: '免年費 (7)' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setFeeFilter(
                          f.id as 'ALL' | 'ANNUAL_FEE' | 'NO_FEE' | 'NO_FTF'
                        )
                      }
                      className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        feeFilter === f.id
                          ? 'bg-[#FAF8F5] text-[#3B4D40]'
                          : 'text-[#635E57] hover:text-[#3D3A36]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Comparison Mode */}
                <div className="flex items-center gap-1 p-1 bg-[#E2DDD5] rounded-lg">
                  {[
                    { id: 'corrected', label: '精簡版' },
                    { id: 'diff', label: '原表對照' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setTableMode(m.id as TableComparisonMode)
                      }
                      className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        tableMode === m.id
                          ? 'bg-[#FAF8F5] text-[#3D3A36]'
                          : 'text-[#635E57] hover:text-[#3D3A36]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cards or Table */}
            {sheetLayoutMode === 'mobile' ? (
              <div className="p-3.5 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-[#F5F2EC]">
                {filteredCards.map((card) => {
                  const theme = getIssuerMorandiTheme(card.issuer);
                  const isNoFTF = card.foreignTxFee.includes('$0');

                  return (
                    <article
                      key={card.id}
                      className={`bg-[#FAF8F5] border ${theme.borderAccent} rounded-2xl overflow-hidden flex flex-col`}
                    >
                      {/* Morandi Top Accent Bar */}
                      <div className={`h-1.5 w-full ${theme.topBar}`} />

                      {/* Header */}
                      <div
                        className={`p-3.5 ${theme.headerBg} border-b border-[#E2DDD5] flex items-start justify-between gap-2`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${theme.badgeText}`}
                            >
                              {card.issuer} · {card.network}
                            </span>
                            {/* Explicit No Foreign Transaction Fee Badge */}
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                isNoFTF
                                  ? 'bg-[#E3EBE4] text-[#3B4D40] border-[#C2D1C4]'
                                  : 'bg-[#EFE3E1] text-[#5E3F3C] border-[#D8C0BC]'
                              }`}
                            >
                              <Globe className="w-3 h-3" />
                              {isNoFTF
                                ? '免海外手續費 ($0 FTF)'
                                : '海外手續費 3%'}
                            </span>
                          </div>
                          <h3 className="mt-1.5 text-sm sm:text-base font-extrabold text-[#3D3A36]">
                            {card.name}
                          </h3>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-mono tabular-nums font-extrabold text-[#3D3A36]">
                            年費 {card.annualFeeNote}
                          </div>
                          <div className="text-[11px] font-mono tabular-nums font-semibold text-[#3B4D40]">
                            福利 ~${card.estimatedAnnualPerkValue}/年
                          </div>
                        </div>
                      </div>

                      {/* Simplified 2x2 Key Highlights in Morandi Tones */}
                      <div className="p-3.5 grid grid-cols-2 gap-2.5 text-xs">
                        <div className="p-2.5 rounded-xl bg-[#E5EAEF]/70 border border-[#C5D0DA]">
                          <div className="text-[10px] font-bold text-[#3A4956]">
                            主力回饋
                          </div>
                          <div className="mt-0.5 font-bold text-[#3D3A36] leading-snug">
                            {card.shortSummary?.primaryRewards ??
                              card.corrected.primaryRewards}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#E3EBE4]/70 border border-[#C2D1C4]">
                          <div className="text-[10px] font-bold text-[#3B4D40]">
                            日常加碼
                          </div>
                          <div className="mt-0.5 font-semibold text-[#3D3A36] leading-snug">
                            {card.shortSummary?.otherRewards ??
                              card.corrected.otherRewards}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#EAE4EC]/70 border border-[#CCC2D1]">
                          <div className="text-[10px] font-bold text-[#4B3F50]">
                            旅遊折抵 · 會籍
                          </div>
                          <div className="mt-0.5 font-semibold text-[#3D3A36] leading-snug">
                            {[
                              card.shortSummary?.hotelCredit !== '—'
                                ? `飯店: ${card.shortSummary?.hotelCredit}`
                                : null,
                              card.shortSummary?.airlineCredit !== '—'
                                ? `航空: ${card.shortSummary?.airlineCredit}`
                                : null,
                              card.shortSummary?.hotelStatus !== '—'
                                ? card.shortSummary?.hotelStatus
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ') || '無固定旅遊折抵'}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-[#EFEAD8]/70 border border-[#D6CCB0]">
                          <div className="text-[10px] font-bold text-[#574B35]">
                            年度重點福利
                          </div>
                          <div className="mt-0.5 font-semibold text-[#3D3A36] leading-snug">
                            {card.shortSummary?.keyPerks ??
                              card.corrected.keyAnnualPerks}
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Box for Full Details */}
                      <details className="group border-t border-[#E6E1D9] bg-[#F2EFE9]/60 px-3.5 py-2 text-xs">
                        <summary className="flex items-center justify-between cursor-pointer font-semibold text-[#635E57] hover:text-[#3D3A36] list-none">
                          <span>展開詳細條款與完整說明</span>
                          <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="pt-2.5 pb-1 space-y-1.5 text-[#635E57] border-t border-[#D8D2C9] mt-2">
                          <div>
                            <strong className="text-[#3D3A36]">
                              點數體系：
                            </strong>
                            {card.rewardsCurrency}
                          </div>
                          <div>
                            <strong className="text-[#3D3A36]">
                              海外手續費：
                            </strong>
                            {card.foreignTxFee}
                          </div>
                          <div>
                            <strong className="text-[#3D3A36]">
                              主要與其他回饋：
                            </strong>
                            {card.corrected.primaryRewards}；
                            {card.corrected.otherRewards}
                          </div>
                          {card.corrected.chaseTravelCredit !== '—' && (
                            <div>
                              <strong className="text-[#3D3A36]">
                                飯店折抵：
                              </strong>
                              {card.corrected.chaseTravelCredit}
                            </div>
                          )}
                          {card.corrected.airlineCredit !== '—' && (
                            <div>
                              <strong className="text-[#3D3A36]">
                                航空回饋：
                              </strong>
                              {card.corrected.airlineCredit}
                            </div>
                          )}
                          {card.corrected.hotelStatus !== '—' && (
                            <div>
                              <strong className="text-[#3D3A36]">
                                飯店會籍：
                              </strong>
                              {card.corrected.hotelStatus}
                            </div>
                          )}
                          <div>
                            <strong className="text-[#3D3A36]">
                              年度福利詳情：
                            </strong>
                            {card.corrected.keyAnnualPerks}
                          </div>
                          {tableMode === 'diff' && (
                            <div className="p-2 rounded bg-[#EFEAD8] text-[#574B35]">
                              <strong>原表補充說明：</strong>
                              {card.auditSummary}
                            </div>
                          )}
                        </div>
                      </details>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* Simplified Morandi Table View with Explicit "免海外手續費 (No FTF)" Column */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#EAE6DF] border-b border-[#D8D2C9] text-xs font-bold text-[#3D3A36]">
                      <th className="py-3 px-3.5 min-w-[170px]">信用卡</th>
                      <th className="py-3 px-3 text-right min-w-[70px]">
                        年費
                      </th>
                      <th className="py-3 px-3 min-w-[135px]">
                        免海外手續費 (No FTF)
                      </th>
                      <th className="py-3 px-3.5 min-w-[190px]">
                        核心消費回饋
                      </th>
                      <th className="py-3 px-3.5 min-w-[180px]">
                        旅遊折抵 · 會籍
                      </th>
                      <th className="py-3 px-3.5 min-w-[200px]">
                        年度重點福利 (詳情下拉)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DDD5] text-xs">
                    {filteredCards.map((card) => {
                      const isNoFTF = card.foreignTxFee.includes('$0');
                      const theme = getIssuerMorandiTheme(card.issuer);
                      return (
                        <tr
                          key={card.id}
                          className="hover:bg-[#F2EFE9]/80 transition-colors align-top"
                        >
                          <td className="py-3 px-3.5">
                            <div className="font-extrabold text-[#3D3A36]">
                              {card.name}
                            </div>
                            <span
                              className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${theme.badgeText}`}
                            >
                              {card.issuer} · {card.network}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-[#3D3A36]">
                            {card.annualFeeNote}
                          </td>

                          {/* Dedicated No Foreign Transaction Fee Column */}
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border ${
                                isNoFTF
                                  ? 'bg-[#E3EBE4] text-[#3B4D40] border-[#C2D1C4]'
                                  : 'bg-[#EFE3E1] text-[#5E3F3C] border-[#D8C0BC]'
                              }`}
                            >
                              {isNoFTF ? '✓ 免手續費 ($0)' : '✕ 3% 手續費'}
                            </span>
                          </td>

                          <td className="py-3 px-3.5 space-y-1">
                            <div className="font-bold text-[#3A4956]">
                              {card.shortSummary?.primaryRewards}
                            </div>
                            <div className="text-[#635E57]">
                              {card.shortSummary?.otherRewards}
                            </div>
                          </td>

                          <td className="py-3 px-3.5 space-y-0.5 text-[#3D3A36]">
                            {card.shortSummary?.hotelCredit !== '—' && (
                              <div className="text-[#3A4956] font-semibold">
                                飯店：{card.shortSummary?.hotelCredit}
                              </div>
                            )}
                            {card.shortSummary?.airlineCredit !== '—' && (
                              <div className="text-[#374C4E] font-semibold">
                                航空：{card.shortSummary?.airlineCredit}
                              </div>
                            )}
                            {card.shortSummary?.hotelStatus !== '—' && (
                              <div className="text-[#4B3F50] font-medium">
                                {card.shortSummary?.hotelStatus}
                              </div>
                            )}
                            {card.shortSummary?.hotelCredit === '—' &&
                              card.shortSummary?.airlineCredit === '—' &&
                              card.shortSummary?.hotelStatus === '—' && (
                                <span className="text-[#867F75]">—</span>
                              )}
                          </td>

                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-[#3D3A36]">
                              {card.shortSummary?.keyPerks}
                            </div>
                            <details className="group mt-1">
                              <summary className="cursor-pointer text-[11px] font-semibold text-[#5A6B7C] hover:underline list-none inline-flex items-center gap-1">
                                <span>展開完整說明</span>
                                <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
                              </summary>
                              <div className="mt-1.5 p-2 rounded-lg bg-[#F2EFE9] border border-[#D8D2C9] text-[11px] text-[#635E57] space-y-1">
                                <div>{card.corrected.otherRewards}</div>
                                <div>{card.corrected.keyAnnualPerks}</div>
                              </div>
                            </details>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* =========================================================
            SECTION 2: 報銷追蹤 (CHRONOLOGICAL ORDER + GOOGLE CALENDAR ALERTS + MORANDI PALETTE)
           ========================================================= */}
        {activeSection === 'benefit-tracker' && (
          <section className="bg-[#FAF8F5] border border-[#D8D2C9] rounded-2xl overflow-hidden">
            {/* Top Date & Save Control Bar */}
            <div className="p-4 border-b border-[#D8D2C9] bg-[#EFECE6] space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                <h2 className="text-base sm:text-lg font-extrabold text-[#3D3A36]">
                  報銷追蹤
                </h2>

                {/* Date Picker + Save Button + Reset */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 bg-[#FAF8F5] border border-[#C2D1C4] rounded-xl px-3 py-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#3B4D40]" />
                    <input
                      type="date"
                      value={globalTrackingDate}
                      onChange={(e) =>
                        handleApplyTrackingDateToAll(e.target.value)
                      }
                      className="text-xs font-mono font-bold text-[#3D3A36] bg-transparent focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveTrackingProgress}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#FAF8F5] bg-[#5C7062] hover:bg-[#4E6053] rounded-xl transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>儲存 ({lastSavedTimestamp})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddBenefitOpen(true)}
                    className="min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[#3A4956] bg-[#E5EAEF] border border-[#C5D0DA] hover:bg-[#DAE2E9] rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>新增</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetTrackersToDefault}
                    className="min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#635E57] bg-[#FAF8F5] border border-[#CFC8BE] hover:bg-[#E6E2DD] rounded-xl transition-colors cursor-pointer"
                    title="重置"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>重置</span>
                  </button>
                </div>
              </div>

              {/* SIMPLIFIED GOOGLE CALENDAR ALERT BAR */}
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#C5D0DA] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#3A4956] shrink-0" />
                    <span className="text-xs sm:text-sm font-extrabold text-[#3D3A36]">
                      Google 日曆提醒
                    </span>
                  </div>

                  {/* Google Auth & One-Click Sync */}
                  <div className="flex flex-wrap items-center gap-2">
                    {!calendarToken ? (
                      <button
                        type="button"
                        onClick={handleGoogleCalendarSignIn}
                        disabled={isSigningInCalendar}
                        className="gsi-material-button"
                      >
                        <div className="gsi-material-button-state"></div>
                        <div className="gsi-material-button-content-wrapper">
                          <div className="gsi-material-button-icon">
                            <svg
                              version="1.1"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 48 48"
                              style={{ display: 'block' }}
                            >
                              <path
                                fill="#EA4335"
                                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                              ></path>
                              <path
                                fill="#4285F4"
                                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                              ></path>
                              <path
                                fill="#FBBC05"
                                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                              ></path>
                              <path
                                fill="#34A853"
                                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                              ></path>
                              <path fill="none" d="M0 0h48v48H0z"></path>
                            </svg>
                          </div>
                          <span className="gsi-material-button-contents">
                            {isSigningInCalendar
                              ? '連結中...'
                              : 'Sign in with Google'}
                          </span>
                        </div>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-[#3B4D40] bg-[#E3EBE4] px-2 py-1 rounded-lg border border-[#C2D1C4]">
                          ✓ 已連結
                        </span>
                        <button
                          type="button"
                          onClick={handleGoogleCalendarLogout}
                          className="p-1.5 text-xs text-[#635E57] hover:text-[#3D3A36] bg-[#E6E2DD] rounded-lg cursor-pointer"
                          title="登出"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleRequestSetCalendarAlerts(PRESET_CALENDAR_ALERTS)
                      }
                      className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#FAF8F5] bg-[#5A6B7C] hover:bg-[#4B5A69] rounded-xl transition-colors cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>一鍵加全部提醒</span>
                    </button>
                  </div>
                </div>

                {/* Ultra-Concise 6-Chip Strip (Click any chip to set alert) */}
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_CALENDAR_ALERTS.map((rule) => {
                    const isSynced = syncedAlertRuleIds.includes(rule.id);
                    return (
                      <button
                        key={rule.id}
                        type="button"
                        onClick={() => handleRequestSetCalendarAlerts([rule])}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          isSynced
                            ? 'bg-[#E3EBE4] text-[#3B4D40] border-[#C2D1C4]'
                            : 'bg-[#F2EFE9] text-[#3D3A36] border-[#D8D2C9] hover:bg-[#E5EAEF]'
                        }`}
                      >
                        <span className="font-bold">{rule.shortLabel}</span>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#FAF8F5] text-[#3A4956]">
                          {rule.scheduleSummary}
                        </span>
                        <span className="text-[11px] font-bold text-[#3A4956]">
                          {isSynced ? '✓' : '+'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {lastCreatedEvents.length > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-[#3B4D40]">
                    <span>✓ 已建立 {lastCreatedEvents.length} 筆日曆提醒</span>
                    <a
                      href={lastCreatedEvents[0].htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold underline hover:text-[#3D3A36]"
                    >
                      <span>開啟日曆</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Category & Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-[#E2DDD5] rounded-xl overflow-x-auto max-w-full">
                  {[
                    'ALL',
                    '飯店折抵',
                    '航空報銷',
                    '免房券 (FNA)',
                    '生活與外送',
                    '通關與旅遊保障',
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTrackerCategoryFilter(cat)}
                      className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        trackerCategoryFilter === cat
                          ? 'bg-[#3D3A36] text-[#FAF8F5]'
                          : 'text-[#635E57] hover:text-[#3D3A36]'
                      }`}
                    >
                      {cat === 'ALL' ? '全部分類 (10)' : cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 p-1 bg-[#E2DDD5] rounded-xl overflow-x-auto max-w-full">
                  {[
                    'ALL',
                    '未使用',
                    '部分使用',
                    '部分過期',
                    '已用畢',
                    '已過期',
                  ].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTrackerStatusFilter(st)}
                      className={`min-h-[30px] px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        trackerStatusFilter === st
                          ? 'bg-[#5C7062] text-[#FAF8F5]'
                          : 'text-[#635E57] hover:text-[#3D3A36]'
                      }`}
                    >
                      {st === 'ALL' ? '全部狀態' : st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tracker Cards in Chronological Order */}
            <div className="p-3.5 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-3.5 bg-[#F5F2EC]">
              {filteredTrackers.map((item, idx) => {
                const expired = item.expiredValue || 0;
                const remaining = Math.max(
                  0,
                  item.maxValue - item.usedValue - expired
                );
                const usedPct =
                  item.maxValue > 0
                    ? Math.min(
                        100,
                        Math.round((item.usedValue / item.maxValue) * 100)
                      )
                    : 0;
                const expiredPct =
                  item.maxValue > 0
                    ? Math.min(
                        100 - usedPct,
                        Math.round((expired / item.maxValue) * 100)
                      )
                    : 0;
                const catBadge = getCategoryMorandiTheme(item.category);
                const linkedRule = item.calendarAlertRuleId
                  ? PRESET_CALENDAR_ALERTS.find(
                      (r) => r.id === item.calendarAlertRuleId
                    )
                  : undefined;
                const isRuleSynced = linkedRule
                  ? syncedAlertRuleIds.includes(linkedRule.id)
                  : false;

                return (
                  <article
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#D8D2C9] flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2.5">
                      {/* Top Meta Row */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-bold text-[#867F75]">
                            {String(idx + 1).padStart(2, '0')}.
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${catBadge}`}
                          >
                            {item.category}
                          </span>
                          <span className="text-xs font-bold text-[#635E57]">
                            {item.cardName}
                          </span>
                        </div>

                        {/* Individual Date & Status Selector */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="date"
                            value={item.recordedDate || globalTrackingDate}
                            onChange={(e) =>
                              handleUpdateTrackerFields(item.id, {
                                recordedDate: e.target.value,
                              })
                            }
                            className="text-[11px] font-mono text-[#635E57] bg-[#F2EFE9] border border-[#D8D2C9] rounded-md px-1.5 py-0.5"
                          />
                          <select
                            value={item.status}
                            onChange={(e) => {
                              const nextSt = e.target
                                .value as BenefitTrackerItem['status'];
                              if (nextSt === '已用畢') {
                                handleUpdateTrackerFields(item.id, {
                                  usedValue: Math.max(
                                    0,
                                    item.maxValue - expired
                                  ),
                                  status: '已用畢',
                                });
                              } else if (nextSt === '未使用') {
                                handleUpdateTrackerFields(item.id, {
                                  usedValue: 0,
                                  status: '未使用',
                                });
                              } else if (nextSt === '已過期') {
                                handleUpdateTrackerFields(item.id, {
                                  usedValue: 0,
                                  expiredValue: item.maxValue,
                                  status: '已過期',
                                });
                              } else {
                                handleUpdateTrackerFields(item.id, {
                                  status: nextSt,
                                });
                              }
                            }}
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md border cursor-pointer ${
                              item.status === '已用畢'
                                ? 'bg-[#E3EBE4] text-[#3B4D40] border-[#C2D1C4]'
                                : item.status === '已過期'
                                ? 'bg-[#EFE3E1] text-[#5E3F3C] border-[#D8C0BC]'
                                : item.status === '部分使用' ||
                                  item.status === '部分過期'
                                ? 'bg-[#EFEAD8] text-[#574B35] border-[#D6CCB0]'
                                : 'bg-[#EAE6DF] text-[#635E57] border-[#CFC8BE]'
                            }`}
                          >
                            <option value="未使用">未使用</option>
                            <option value="部分使用">部分使用</option>
                            <option value="部分過期">部分過期</option>
                            <option value="已用畢">✓ 已用畢</option>
                            <option value="已過期">✕ 已過期</option>
                          </select>
                        </div>
                      </div>

                      {/* Main Title & Value Breakdown */}
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm sm:text-base font-extrabold text-[#3D3A36]">
                            {item.shortTitle || item.benefitTitle}
                          </h3>
                          <div className="text-[11px] text-[#635E57] flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span>
                              {item.cadence} · {item.deadlineOrReset}
                            </span>
                            {item.calendarAlertLabel && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#E5EAEF] text-[#3A4956]">
                                <Bell className="w-2.5 h-2.5" />
                                {item.calendarAlertLabel}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`text-base sm:text-lg font-mono tabular-nums font-extrabold ${
                              remaining === 0
                                ? 'text-[#867F75]'
                                : 'text-[#3B4D40]'
                            }`}
                          >
                            剩 ${remaining}
                          </div>
                          <div className="text-[10px] font-mono text-[#867F75]">
                            總額 ${item.maxValue}
                          </div>
                        </div>
                      </div>

                      {/* Morandi 3-Metric Mini Strip: Used / Expired / Left */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-1.5 rounded-lg bg-[#E3EBE4]/80 border border-[#C2D1C4]">
                          <div className="text-[10px] text-[#3B4D40] font-semibold">
                            已使用
                          </div>
                          <div className="font-mono font-bold text-[#3B4D40]">
                            ${item.usedValue}
                          </div>
                        </div>

                        <div className="p-1.5 rounded-lg bg-[#EFE3E1]/80 border border-[#D8C0BC]">
                          <div className="text-[10px] text-[#5E3F3C] font-semibold">
                            過期無法用
                          </div>
                          <div className="font-mono font-bold text-[#5E3F3C]">
                            ${expired}
                          </div>
                        </div>

                        <div className="p-1.5 rounded-lg bg-[#E5EAEF]/80 border border-[#C5D0DA]">
                          <div className="text-[10px] text-[#3A4956] font-semibold">
                            尚餘可用
                          </div>
                          <div className="font-mono font-extrabold text-[#3A4956]">
                            ${remaining}
                          </div>
                        </div>
                      </div>

                      {/* Multi-Segment Progress Bar (Morandi Sage & Dusty Rose) */}
                      <div className="w-full h-2 bg-[#E6E2DD] rounded-full overflow-hidden flex">
                        {usedPct > 0 && (
                          <div
                            className="h-full bg-[#6B8071] transition-all"
                            style={{ width: `${usedPct}%` }}
                            title={`已使用 $${item.usedValue}`}
                          />
                        )}
                        {expiredPct > 0 && (
                          <div
                            className="h-full bg-[#9E7672] transition-all"
                            style={{ width: `${expiredPct}%` }}
                            title={`已過期無法用 $${expired}`}
                          />
                        )}
                      </div>

                      {/* Interactive Period / Monthly Grid (for UA TravelBank, Marriott Airline, and DoorDash 12-month) */}
                      {item.monthlyStates && (
                        <div className="p-2.5 rounded-xl bg-[#F2EFE9] border border-[#D8D2C9] space-y-2">
                          {item.id === 'trk-csp-doordash' ? (
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-[#3D3A36]">
                                每月 $10 狀態點選（1–8月已過期 -$80）：
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSetDoorDashScenario(false)
                                  }
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                                    remaining === 40
                                      ? 'bg-[#5A6B7C] text-[#FAF8F5]'
                                      : 'bg-[#FAF8F5] border border-[#CFC8BE] text-[#635E57]'
                                  }`}
                                >
                                  9月未用 (剩 $40)
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSetDoorDashScenario(true)
                                  }
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                                    remaining === 30
                                      ? 'bg-[#5C7062] text-[#FAF8F5]'
                                      : 'bg-[#FAF8F5] border border-[#CFC8BE] text-[#635E57]'
                                  }`}
                                >
                                  9月已用 (剩 $30)
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] font-bold text-[#635E57]">
                              點擊切換上下半年使用狀態（可用 → 已用 → 過期）：
                            </div>
                          )}

                          <div
                            className={
                              item.monthlyStates.length === 2
                                ? 'grid grid-cols-2 gap-2'
                                : 'grid grid-cols-6 sm:grid-cols-12 gap-1'
                            }
                          >
                            {item.monthlyStates.map((m) => (
                              <button
                                key={m.month}
                                type="button"
                                onClick={() =>
                                  handleCycleMonthState(item.id, m.month)
                                }
                                className={`py-1 px-1.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                                  m.state === 'used'
                                    ? 'bg-[#5C7062] text-[#FAF8F5] border-[#5C7062]'
                                    : m.state === 'expired'
                                    ? 'bg-[#EFE3E1] text-[#5E3F3C] border-[#D8C0BC] line-through'
                                    : 'bg-[#FAF8F5] text-[#3D3A36] border-[#CFC8BE] hover:border-[#667889]'
                                }`}
                                title="點擊切換：可用 → 已用 → 已過期"
                              >
                                <div>{m.label}</div>
                                <div className="text-[9px] font-mono">
                                  {m.state === 'used'
                                    ? `已用 $${m.amount}`
                                    : m.state === 'expired'
                                    ? `過期 $${m.amount}`
                                    : `可用 $${m.amount}`}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Controls, Calendar Reminder Button & Details Dropdown */}
                    <div className="pt-2.5 border-t border-[#E6E1D9] space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleToggleQuickComplete(item.id)}
                            className={`min-h-[34px] px-3 py-1 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                              remaining === 0 && item.usedValue > 0
                                ? 'bg-[#5C7062] text-[#FAF8F5]'
                                : 'bg-[#3D3A36] text-[#FAF8F5] hover:bg-[#524E49]'
                            }`}
                          >
                            {remaining === 0 && item.usedValue > 0
                              ? '✓ 可用額度已用畢'
                              : '一鍵用畢剩餘'}
                          </button>

                          {linkedRule && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRequestSetCalendarAlerts([linkedRule])
                              }
                              className={`min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                                isRuleSynced
                                  ? 'bg-[#E3EBE4] text-[#3B4D40] border-[#C2D1C4]'
                                  : 'bg-[#E5EAEF] text-[#3A4956] border-[#C5D0DA] hover:bg-[#DAE2E9]'
                              }`}
                            >
                              <Bell className="w-3 h-3" />
                              <span>
                                {isRuleSynced ? '已設提醒' : '日曆提醒'}
                              </span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs">
                          <label className="text-[11px] text-[#635E57]">
                            已用$
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={item.maxValue}
                            value={item.usedValue}
                            onChange={(e) =>
                              handleUpdateTrackerFields(item.id, {
                                usedValue: Number(e.target.value),
                              })
                            }
                            className="w-14 px-1.5 py-1 text-right font-mono font-bold bg-[#F2EFE9] text-[#3D3A36] border border-[#CFC8BE] rounded-lg"
                          />
                          <label className="text-[11px] text-[#5E3F3C]">
                            過期$
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={item.maxValue}
                            value={expired}
                            onChange={(e) =>
                              handleUpdateTrackerFields(item.id, {
                                expiredValue: Number(e.target.value),
                              })
                            }
                            className="w-14 px-1.5 py-1 text-right font-mono font-bold text-[#5E3F3C] bg-[#EFE3E1]/60 border border-[#D8C0BC] rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Collapsible Details Box */}
                      <details className="group text-xs">
                        <summary className="cursor-pointer text-[11px] font-semibold text-[#635E57] hover:text-[#3D3A36] list-none flex items-center justify-between">
                          <span>展開使用規則與備註</span>
                          <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                        </summary>
                        <p className="mt-1.5 p-2 rounded-lg bg-[#F2EFE9] text-[#635E57] text-[11px] leading-relaxed">
                          {item.notes}
                        </p>
                      </details>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* =========================================================
            SECTION 3: 季度與滿額進度 (MORANDI PALETTE + DROPDOWN DETAILS)
           ========================================================= */}
        {activeSection === 'spend-caps' && (
          <section className="bg-[#FAF8F5] border border-[#D8D2C9] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#D8D2C9] bg-[#EFECE6] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#3D3A36]">
                  季度 5% 與年度滿額門檻追蹤
                </h2>
                <p className="text-xs text-[#635E57]">
                  精簡進度條與快捷加總按鈕，詳細指定類別可點開下拉選單查看
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveTrackingProgress}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#FAF8F5] bg-[#8A785A] hover:bg-[#76664B] rounded-xl cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>儲存消費進度</span>
              </button>
            </div>

            <div className="p-3.5 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-[#F5F2EC]">
              {spendCaps.map((cap) => {
                const pct = Math.min(
                  100,
                  Math.round((cap.currentSpend / cap.spendCap) * 100)
                );
                const remaining = Math.max(0, cap.spendCap - cap.currentSpend);

                return (
                  <article
                    key={cap.id}
                    className="p-4 bg-[#FAF8F5] border border-[#D8D2C9] rounded-2xl flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EFEAD8] text-[#574B35] border border-[#D6CCB0]">
                              {cap.period}
                            </span>
                            <span className="text-xs font-bold font-mono text-[#3B4D40]">
                              {cap.rewardRate}
                            </span>
                          </div>
                          <h3 className="mt-1 text-sm sm:text-base font-extrabold text-[#3D3A36]">
                            {cap.cardName} · {cap.programName}
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleSpendCapActivated(cap.id)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg border cursor-pointer shrink-0 ${
                            cap.activated
                              ? 'bg-[#E3EBE4] text-[#3B4D40] border-[#C2D1C4]'
                              : 'bg-[#EFEAD8] text-[#574B35] border-[#D6CCB0]'
                          }`}
                        >
                          {cap.activated ? '✓ 已啟用' : '待啟用'}
                        </button>
                      </div>

                      {/* Morandi Progress Block */}
                      <div className="p-3 rounded-xl bg-[#F2EFE9] border border-[#D8D2C9] space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#635E57]">
                            已刷{' '}
                            <strong className="font-mono text-[#3D3A36]">
                              ${cap.currentSpend.toLocaleString()}
                            </strong>{' '}
                            / ${cap.spendCap.toLocaleString()}
                          </span>
                          <span className="font-mono font-extrabold text-[#3A4956]">
                            尚餘 ${remaining.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#E2DDD5] rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              pct >= 100 ? 'bg-[#6B8071]' : 'bg-[#667889]'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Adjust + Details Dropdown */}
                    <div className="pt-2 border-t border-[#E6E1D9] space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="inline-flex items-center bg-[#F2EFE9] border border-[#CFC8BE] rounded-lg px-2 py-1">
                          <span className="text-xs text-[#867F75] mr-1">$</span>
                          <input
                            type="number"
                            min={0}
                            step={50}
                            value={cap.currentSpend}
                            onChange={(e) =>
                              handleUpdateSpendCap(
                                cap.id,
                                Number(e.target.value)
                              )
                            }
                            className="w-20 font-mono text-xs font-bold text-[#3D3A36] bg-transparent focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSpendCap(
                                cap.id,
                                cap.currentSpend + 100
                              )
                            }
                            className="px-2.5 py-1 text-xs font-mono font-bold bg-[#E5EAEF] text-[#3A4956] hover:bg-[#DAE2E9] rounded-lg cursor-pointer"
                          >
                            +$100
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSpendCap(
                                cap.id,
                                cap.currentSpend + 500
                              )
                            }
                            className="px-2.5 py-1 text-xs font-mono font-bold bg-[#E5EAEF] text-[#3A4956] hover:bg-[#DAE2E9] rounded-lg cursor-pointer"
                          >
                            +$500
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateSpendCap(cap.id, cap.spendCap)
                            }
                            className="px-2.5 py-1 text-xs font-bold bg-[#5C7062] text-[#FAF8F5] rounded-lg cursor-pointer"
                          >
                            滿額
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateSpendCap(cap.id, 0)}
                            className="px-2 py-1 text-xs text-[#635E57] hover:text-[#3D3A36] cursor-pointer"
                          >
                            歸零
                          </button>
                        </div>
                      </div>

                      <details className="group text-xs">
                        <summary className="cursor-pointer text-[11px] font-semibold text-[#635E57] hover:text-[#3D3A36] list-none flex items-center justify-between">
                          <span>展開指定加碼類別與備註</span>
                          <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="mt-1.5 p-2 rounded-lg bg-[#F2EFE9] text-[11px] text-[#635E57] space-y-1">
                          <div>
                            <strong className="text-[#3D3A36]">
                              指定類別：
                            </strong>
                            {cap.categoryDescription}
                          </div>
                          <div>
                            <strong className="text-[#3D3A36]">備註：</strong>
                            {cap.notes}
                          </div>
                        </div>
                      </details>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* =========================================================
            SECTION 4: 最佳刷卡攻略 (MORANDI PALETTE + DROPDOWN TIPS)
           ========================================================= */}
        {activeSection === 'category-guide' && (
          <section className="bg-[#FAF8F5] border border-[#D8D2C9] rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-[#D8D2C9] bg-[#EFECE6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#3D3A36]">
                  各消費通路最佳刷卡速查
                </h2>
                <p className="text-xs text-[#635E57]">
                  一眼秒看「首選主力卡」與「回饋率」，實戰秘訣收合於下拉選單
                </p>
              </div>

              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-[#867F75] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={guideSearchQuery}
                  onChange={(e) => setGuideSearchQuery(e.target.value)}
                  placeholder="搜尋：餐廳、超市、加油、機票..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-[#FAF8F5] text-[#3D3A36] border border-[#CFC8BE] rounded-lg focus:outline-none focus:border-[#736479]"
                />
                {guideSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setGuideSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#867F75] hover:text-[#3D3A36]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-3.5 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-[#F5F2EC]">
              {filteredGuide.map((row) => (
                <article
                  key={row.id}
                  className="p-3.5 bg-[#FAF8F5] border border-[#D8D2C9] rounded-2xl flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-[#3D3A36]">
                        {row.category}
                      </h3>
                      <span className="shrink-0 text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-md bg-[#E3EBE4] text-[#3B4D40] border border-[#C2D1C4]">
                        {row.multiplier}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#E3EBE4]/60 border border-[#C2D1C4]">
                      <div className="text-[10px] font-bold text-[#3B4D40]">
                        首選主力卡
                      </div>
                      <div className="text-xs font-extrabold text-[#3D3A36] mt-0.5">
                        {row.bestCard}
                      </div>
                      <div className="text-[10px] font-mono text-[#3B4D40] mt-0.5">
                        實質回饋：{row.effectiveReturnNote}
                      </div>
                    </div>
                  </div>

                  <details className="group text-xs border-t border-[#E6E1D9] pt-2">
                    <summary className="cursor-pointer text-[11px] font-semibold text-[#635E57] hover:text-[#3D3A36] list-none flex items-center justify-between">
                      <span>次選：{row.runnerUpCard}（展開攻略）</span>
                      <ChevronDown className="w-3.5 h-3.5 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="mt-1.5 p-2 rounded-lg bg-[#EAE4EC]/50 text-[11px] text-[#4B3F50] leading-relaxed">
                      {row.tips}
                    </p>
                  </details>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Fixed Bottom Thumb-Zone Navigation Bar on Mobile (Morandi Styled) */}
      <nav
        aria-label="手機底部導覽列"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-t border-[#D8D2C9] grid grid-cols-4 items-center h-14 px-1"
      >
        {[
          {
            id: 'audit-table',
            label: '權益總表',
            icon: CreditCard,
            activeColor: 'text-[#3A4956]',
          },
          {
            id: 'benefit-tracker',
            label: '報銷追蹤',
            icon: ListChecks,
            activeColor: 'text-[#3B4D40]',
          },
          {
            id: 'spend-caps',
            label: '季度滿額',
            icon: TrendingUp,
            activeColor: 'text-[#574B35]',
          },
          {
            id: 'category-guide',
            label: '刷卡攻略',
            icon: Compass,
            activeColor: 'text-[#4B3F50]',
          },
        ].map((item) => {
          const IconComponent = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id as ActiveSection)}
              className={`h-full flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                isActive
                  ? `${item.activeColor} font-extrabold`
                  : 'text-[#867F75] hover:text-[#3D3A36] font-medium'
              }`}
            >
              <IconComponent
                className={`w-4 h-4 ${
                  isActive
                    ? `${item.activeColor} stroke-[2.5]`
                    : 'text-[#867F75]'
                }`}
              />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Clean Quiet Morandi Footer */}
      <footer className="mt-auto border-t border-[#D8D2C9] bg-[#FAF8F5] py-4 px-4 sm:px-6">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#635E57]">
          <div>
            CardLedger · 信用卡福利追蹤表（已儲存於：{lastSavedTimestamp}）
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSaveTrackingProgress}
              className="text-[#3B4D40] font-semibold hover:underline cursor-pointer"
            >
              儲存進度
            </button>
            <button
              type="button"
              onClick={() =>
                exportCardsToCSV(
                  cards,
                  trackers,
                  spendCaps,
                  SPEND_CATEGORY_GUIDE
                )
              }
              className="hover:text-[#3D3A36] underline underline-offset-4 cursor-pointer"
            >
              匯出 CSV
            </button>
          </div>
        </div>
      </footer>

      {/* MANDATORY CONFIRMATION MODAL: Google Calendar Event Creation */}
      {pendingAlertRulesToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D3A36]/50 p-4">
          <div className="bg-[#FAF8F5] border border-[#D8D2C9] rounded-2xl max-w-md w-full p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E2DDD5] pb-2.5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#3A4956]" />
                <h3 className="text-sm font-extrabold text-[#3D3A36]">
                  加入 Google 日曆提醒
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingAlertRulesToConfirm(null)}
                disabled={isCreatingCalendarEvents}
                className="text-[#867F75] hover:text-[#3D3A36]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 text-xs">
              {pendingAlertRulesToConfirm.map((rule) => (
                <div
                  key={rule.id}
                  className="p-2 rounded-xl bg-[#F2EFE9] border border-[#D8D2C9] flex items-center justify-between gap-2"
                >
                  <span className="font-bold text-[#3D3A36]">
                    {rule.shortLabel}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {rule.dates.map((d, i) => {
                      const occ = getNextOccurrenceDates(
                        d.month,
                        d.day,
                        globalTrackingDate
                      );
                      return (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-[#E5EAEF] text-[#3A4956] font-mono text-[11px] font-semibold"
                        >
                          每年 {d.label} ({occ.startDate})
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2.5 flex items-center justify-end gap-2 border-t border-[#E2DDD5]">
              <button
                type="button"
                onClick={() => setPendingAlertRulesToConfirm(null)}
                disabled={isCreatingCalendarEvents}
                className="px-3.5 py-1.5 text-xs font-semibold text-[#635E57] bg-[#E6E2DD] rounded-xl hover:bg-[#DDD8D1] cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateCalendarAlerts}
                disabled={isCreatingCalendarEvents}
                className="px-3.5 py-1.5 text-xs font-bold text-[#FAF8F5] bg-[#5C7062] rounded-xl hover:bg-[#4E6053] cursor-pointer"
              >
                {isCreatingCalendarEvents ? '加入中...' : '確認加入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Custom Benefit Item */}
      {isAddBenefitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3D3A36]/50 p-4">
          <div className="bg-[#FAF8F5] border border-[#D8D2C9] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E2DDD5] pb-3">
              <h3 className="text-base font-bold text-[#3D3A36]">
                新增自訂福利或報銷項目
              </h3>
              <button
                type="button"
                onClick={() => setIsAddBenefitOpen(false)}
                className="text-[#867F75] hover:text-[#3D3A36]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleAddCustomBenefit}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-medium text-[#635E57] mb-1">
                  選擇信用卡
                </label>
                <select
                  value={newBenefitCardName}
                  onChange={(e) => setNewBenefitCardName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F2EFE9] text-[#3D3A36] border border-[#CFC8BE] rounded-lg"
                >
                  {cards.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#635E57] mb-1">
                  福利項目名稱
                </label>
                <input
                  type="text"
                  required
                  value={newBenefitTitle}
                  onChange={(e) => setNewBenefitTitle(e.target.value)}
                  placeholder="例如：Chase Offer 飯店滿 $200 折 $40"
                  className="w-full px-3 py-2 bg-[#F2EFE9] text-[#3D3A36] border border-[#CFC8BE] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#635E57] mb-1">
                    分類
                  </label>
                  <select
                    value={newBenefitCategory}
                    onChange={(e) =>
                      setNewBenefitCategory(
                        e.target.value as BenefitTrackerItem['category']
                      )
                    }
                    className="w-full px-3 py-2 bg-[#F2EFE9] text-[#3D3A36] border border-[#CFC8BE] rounded-lg"
                  >
                    <option value="飯店折抵">飯店折抵</option>
                    <option value="航空報銷">航空報銷</option>
                    <option value="免房券 (FNA)">免房券 (FNA)</option>
                    <option value="生活與外送">生活與外送</option>
                    <option value="通關與旅遊保障">通關與旅遊保障</option>
                    <option value="刷卡滿額禮">刷卡滿額禮</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#635E57] mb-1">
                    最高價值 ($)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newBenefitMax}
                    onChange={(e) => setNewBenefitMax(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-[#F2EFE9] text-[#3D3A36] border border-[#CFC8BE] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#635E57] mb-1">
                    重置週期
                  </label>
                  <select
                    value={newBenefitCadence}
                    onChange={(e) =>
                      setNewBenefitCadence(
                        e.target.value as BenefitTrackerItem['cadence']
                      )
                    }
                    className="w-full px-3 py-2 bg-[#F2EFE9] text-[#3D3A36] border border-[#CFC8BE] rounded-lg"
                  >
                    <option value="每帳戶周年">每帳戶周年</option>
                    <option value="每半年 (1-6月 / 7-12月)">
                      每半年 (1-6月 / 7-12月)
                    </option>
                    <option value="每月">每月</option>
                    <option value="每曆年">每曆年</option>
                    <option value="每 4 年">每 4 年</option>
                    <option value="一次性 / 限時">一次性 / 限時</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#635E57] mb-1">
                    到期提醒
                  </label>
                  <input
                    type="text"
                    value={newBenefitDeadline}
                    onChange={(e) => setNewBenefitDeadline(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F2EFE9] text-[#3D3A36] border border-[#CFC8BE] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#635E57] mb-1">
                  備註說明（將收合於下拉選單）
                </label>
                <input
                  type="text"
                  value={newBenefitNotes}
                  onChange={(e) => setNewBenefitNotes(e.target.value)}
                  placeholder="輸入使用條件或備註"
                  className="w-full px-3 py-2 bg-[#F2EFE9] text-[#3D3A36] border border-[#CFC8BE] rounded-lg"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E2DDD5]">
                <button
                  type="button"
                  onClick={() => setIsAddBenefitOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#635E57] bg-[#E6E2DD] rounded-lg hover:bg-[#DDD8D1] cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-[#FAF8F5] bg-[#5A6B7C] rounded-lg hover:bg-[#4B5A69] cursor-pointer"
                >
                  加入追蹤清單
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
