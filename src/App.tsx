/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  Plus,
  SlidersHorizontal,
  Copy,
  X,
  Smartphone,
  Table as TableIcon,
  CreditCard,
  ListChecks,
  TrendingUp,
  Compass,
} from 'lucide-react';
import {
  CREDIT_CARDS,
  INITIAL_BENEFIT_TRACKERS,
  INITIAL_SPEND_CAP_TRACKERS,
  SPEND_CATEGORY_GUIDE,
  CreditCardRecord,
  BenefitTrackerItem,
  SpendCapTrackerItem,
} from './data/creditCards';
import {
  exportCardsToCSV,
  copySheetsTSVToClipboard,
} from './lib/googleSheetsService';

type ActiveSection = 'audit-table' | 'benefit-tracker' | 'spend-caps' | 'category-guide';
type TableComparisonMode = 'corrected' | 'diff' | 'original';
type SheetLayoutMode = 'mobile' | 'table';

export default function App() {
  // Navigation & View state
  const [activeSection, setActiveSection] = useState<ActiveSection>('audit-table');
  const [sheetLayoutMode, setSheetLayoutMode] = useState<SheetLayoutMode>('mobile');
  const [tableMode, setTableMode] = useState<TableComparisonMode>('corrected');
  const [issuerFilter, setIssuerFilter] = useState<string>('ALL');
  const [feeFilter, setFeeFilter] = useState<'ALL' | 'ANNUAL_FEE' | 'NO_FEE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [guideSearchQuery, setGuideSearchQuery] = useState<string>('');

  // Editable Tracker State
  const [cards] = useState<CreditCardRecord[]>(CREDIT_CARDS);
  const [trackers, setTrackers] = useState<BenefitTrackerItem[]>(INITIAL_BENEFIT_TRACKERS);
  const [spendCaps, setSpendCaps] = useState<SpendCapTrackerItem[]>(INITIAL_SPEND_CAP_TRACKERS);
  const [trackerCategoryFilter, setTrackerCategoryFilter] = useState<string>('ALL');
  const [trackerStatusFilter, setTrackerStatusFilter] = useState<string>('ALL');

  // New Benefit Modal State
  const [isAddBenefitOpen, setIsAddBenefitOpen] = useState<boolean>(false);
  const [newBenefitCardName, setNewBenefitCardName] = useState<string>(CREDIT_CARDS[0].name);
  const [newBenefitTitle, setNewBenefitTitle] = useState<string>('');
  const [newBenefitCategory, setNewBenefitCategory] =
    useState<BenefitTrackerItem['category']>('生活與外送');
  const [newBenefitCadence, setNewBenefitCadence] =
    useState<BenefitTrackerItem['cadence']>('每曆年');
  const [newBenefitDeadline, setNewBenefitDeadline] = useState<string>('2026/12/31 到期');
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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = [
          card.name,
          card.issuer,
          card.rewardsCurrency,
          card.corrected.chaseTravelCredit,
          card.corrected.airlineCredit,
          card.corrected.hotelStatus,
          card.corrected.primaryRewards,
          card.corrected.otherRewards,
          card.corrected.keyAnnualPerks,
          card.auditSummary,
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
      if (trackerCategoryFilter !== 'ALL' && item.category !== trackerCategoryFilter) {
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
    const totalTrackableCredits = trackers
      .filter((t) => t.id !== 'trk-ff-cell') // Exclude insurance coverage limit from cash credit sum
      .reduce((sum, t) => sum + t.maxValue, 0);
    const usedTrackableCredits = trackers
      .filter((t) => t.id !== 'trk-ff-cell')
      .reduce((sum, t) => sum + t.usedValue, 0);
    const remainingTrackableCredits = Math.max(
      0,
      totalTrackableCredits - usedTrackableCredits
    );
    const netPositiveValue = totalTrackableCredits - totalAnnualFees;

    return {
      totalAnnualFees,
      totalTrackableCredits,
      usedTrackableCredits,
      remainingTrackableCredits,
      netPositiveValue,
    };
  }, [cards, trackers]);

  // Handlers
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
          '已將手機友善版 4 分頁追蹤表（含自動加總公式）複製到剪貼簿！可直接貼上至 Google Sheets。',
      });
    } catch {
      setSheetActionBanner({
        type: 'error',
        message: '複製到剪貼簿失敗，請改用「下載 CSV」按鈕匯入。',
      });
    }
  };

  const handleUpdateTrackerUsedValue = (id: string, newUsed: number) => {
    setTrackers((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const clamped = Math.max(0, Math.min(item.maxValue, newUsed));
        const nextStatus: BenefitTrackerItem['status'] =
          clamped === 0
            ? '未使用'
            : clamped >= item.maxValue
            ? '已用畢'
            : '部分使用';
        return {
          ...item,
          usedValue: clamped,
          status: nextStatus,
        };
      })
    );
  };

  const handleToggleQuickComplete = (id: string) => {
    setTrackers((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const isDone = item.usedValue >= item.maxValue;
        return {
          ...item,
          usedValue: isDone ? 0 : item.maxValue,
          status: isDone ? '未使用' : '已用畢',
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
      category: newBenefitCategory,
      cadence: newBenefitCadence,
      deadlineOrReset: newBenefitDeadline.trim() || '每曆年重置',
      maxValue: maxVal,
      usedValue: 0,
      status: '未使用',
      activationRequired: false,
      notes: newBenefitNotes.trim() || '自訂新增福利追蹤項目',
    };
    setTrackers((prev) => [newItem, ...prev]);
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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 pb-16 md:pb-0">
      {/* Top Bar Contract: Strictly 3 zones (Brand wordmark | 4 Nav Links | Primary Actions) */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3.5 bg-white/95 backdrop-blur-md border-b border-slate-200">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('audit-table');
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap"
        >
          CardLedger
        </a>

        {/* Zone 2: 4 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveSection('audit-table')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 cursor-pointer ${
              activeSection === 'audit-table'
                ? 'text-slate-950 border-slate-950 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            權益總表
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('benefit-tracker')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 cursor-pointer ${
              activeSection === 'benefit-tracker'
                ? 'text-slate-950 border-slate-950 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            年度報銷追蹤
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('spend-caps')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 cursor-pointer ${
              activeSection === 'spend-caps'
                ? 'text-slate-950 border-slate-950 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            季度與滿額進度
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('category-guide')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 cursor-pointer ${
              activeSection === 'category-guide'
                ? 'text-slate-950 border-slate-950 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            最佳刷卡攻略
          </button>
        </nav>

        {/* Zone 3: Primary actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySheetsTSV}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">複製試算表內容</span>
            <span className="sm:hidden">複製</span>
          </button>

          <button
            type="button"
            onClick={() =>
              exportCardsToCSV(cards, trackers, spendCaps, SPEND_CATEGORY_GUIDE)
            }
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>下載 CSV</span>
          </button>
        </div>
      </header>

      {/* Main Content Container (1440px max width, mobile-friendly padding) */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-3.5 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-8">
        {/* Top Hero & Quantitative Portfolio Summary */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 sm:pb-5 border-b border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 flex-wrap">
                <span>2026 美卡權益資料庫</span>
                <span aria-hidden="true">·</span>
                <span>11 張持卡組合</span>
                <span aria-hidden="true">·</span>
                <span>手機友善直式排版</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-950">
                信用卡福利追蹤表
              </h1>
            </div>

            {/* Layout Mode Switcher (Mobile Friendly Cards vs Wide Table) */}
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 shrink-0">
              <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setSheetLayoutMode('mobile')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    sheetLayoutMode === 'mobile'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>手機友善卡片</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSheetLayoutMode('table')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    sheetLayoutMode === 'table'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>精簡表格檢視</span>
                </button>
              </div>
            </div>
          </div>

          {/* Status Banner */}
          {sheetActionBanner && (
            <div className="pt-3 flex items-center justify-between gap-3 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 font-medium ${
                  sheetActionBanner.type === 'success'
                    ? 'text-emerald-700'
                    : sheetActionBanner.type === 'info'
                    ? 'text-slate-700'
                    : 'text-red-600'
                }`}
              >
                {sheetActionBanner.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{sheetActionBanner.message}</span>
              </span>
            </div>
          )}

          {/* Quantitative Portfolio Metrics Strip (2x2 on phone, 4 cols on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6 pt-4 sm:pt-5">
            <div className="p-3 sm:p-0 bg-slate-50/70 sm:bg-transparent rounded-lg">
              <div className="text-[11px] sm:text-xs text-slate-500">持卡總數 · 年費結構</div>
              <div className="mt-0.5 sm:mt-1 text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-950">
                11 張
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                4 張年費 · 7 張免年費
              </div>
            </div>

            <div className="p-3 sm:p-0 bg-slate-50/70 sm:bg-transparent rounded-lg">
              <div className="text-[11px] sm:text-xs text-slate-500">年度總年費支出</div>
              <div className="mt-0.5 sm:mt-1 text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-950">
                ${portfolioStats.totalAnnualFees}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500 truncate">
                CSP/Hyatt/Marriott $95 · IHG $99
              </div>
            </div>

            <div className="p-3 sm:p-0 bg-slate-50/70 sm:bg-transparent rounded-lg">
              <div className="text-[11px] sm:text-xs text-slate-500">年度報銷與免房券總值</div>
              <div className="mt-0.5 sm:mt-1 text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-700">
                ${portfolioStats.totalTrackableCredits.toLocaleString()}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                淨回本 +${portfolioStats.netPositiveValue.toLocaleString()}/年
              </div>
            </div>

            <div className="p-3 sm:p-0 bg-slate-50/70 sm:bg-transparent rounded-lg">
              <div className="text-[11px] sm:text-xs text-slate-500">已用 / 尚餘待用福利</div>
              <div className="mt-0.5 sm:mt-1 text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-950">
                ${portfolioStats.usedTrackableCredits}
                <span className="text-slate-400 font-normal"> / </span>
                <span className="text-amber-700">
                  ${portfolioStats.remainingTrackableCredits.toLocaleString()}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                可於「報銷追蹤」一鍵勾選
              </div>
            </div>
          </div>

          {/* Mobile & Tablet Sheet Switcher Pills (Also accessible via bottom thumb bar on phone) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-4 border-t border-slate-200 md:hidden">
            {[
              { id: 'audit-table', label: '1. 權益總表' },
              { id: 'benefit-tracker', label: '2. 年度報銷追蹤' },
              { id: 'spend-caps', label: '3. 季度與滿額' },
              { id: 'category-guide', label: '4. 最佳刷卡攻略' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id as ActiveSection)}
                className={`min-h-[42px] px-3 py-2 text-xs font-semibold rounded-lg transition-colors text-center cursor-pointer ${
                  activeSection === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* SECTION 1: MASTER BENEFITS SHEET */}
        {activeSection === 'audit-table' && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Controls Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col gap-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h2 className="text-base sm:text-lg font-bold text-slate-950">
                    信用卡完整權益總表
                  </h2>
                  <p className="text-xs text-slate-500">
                    手機直式卡片免橫向滑動，點擊即可切換「修正完整版」或「原表對照」
                  </p>
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋卡片、免房券、Lyft、5x..."
                    className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile-Friendly Scrollable Filter Strips */}
              <div className="flex flex-wrap items-center gap-2">
                {/* View Mode Segmented Control */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full">
                  <button
                    type="button"
                    onClick={() => setTableMode('corrected')}
                    className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      tableMode === 'corrected'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    修正完整版
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableMode('diff')}
                    className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      tableMode === 'diff'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    原表 vs 修正
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableMode('original')}
                    className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      tableMode === 'original'
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    原始表格
                  </button>
                </div>

                {/* Issuer Filter */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full">
                  {['ALL', 'Chase', 'Amex', 'Citi', 'Discover'].map((issuer) => (
                    <button
                      key={issuer}
                      type="button"
                      onClick={() => setIssuerFilter(issuer)}
                      className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        issuerFilter === issuer
                          ? 'bg-white text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {issuer === 'ALL' ? '全部銀行 (11)' : issuer}
                    </button>
                  ))}
                </div>

                {/* Fee Filter */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full">
                  {[
                    { id: 'ALL', label: '全部年費' },
                    { id: 'ANNUAL_FEE', label: '有年費 (4)' },
                    { id: 'NO_FEE', label: '免年費 (7)' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setFeeFilter(f.id as 'ALL' | 'ANNUAL_FEE' | 'NO_FEE')
                      }
                      className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        feeFilter === f.id
                          ? 'bg-white text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Area */}
            {filteredCards.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <p className="text-sm text-slate-600">
                  找不到符合篩選條件的信用卡資料。
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIssuerFilter('ALL');
                    setFeeFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  重設所有篩選條件
                </button>
              </div>
            ) : sheetLayoutMode === 'mobile' ? (
              /* CELLPHONE-FRIENDLY VERTICAL CARD GRID FOR SHEET 1 */
              <div className="p-3.5 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 bg-slate-50/50">
                {filteredCards.map((card) => {
                  const isIHGAirlineError = card.id === 'ihg-premier';
                  return (
                    <article
                      key={card.id}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
                    >
                      {/* Card Top Bar */}
                      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-slate-950 leading-snug">
                            {card.name}
                          </h3>
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
                            <span>{card.issuer}</span>
                            <span aria-hidden="true">·</span>
                            <span>{card.network}</span>
                            <span aria-hidden="true">·</span>
                            <span>{card.foreignTxFee}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-700 font-medium">
                              {card.rewardsCurrency}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-mono tabular-nums font-bold text-slate-950">
                            {card.annualFeeNote}
                          </div>
                          {card.estimatedAnnualPerkValue > 0 && (
                            <div className="mt-0.5 text-[11px] font-mono tabular-nums text-emerald-700 font-medium">
                              福利約 ${card.estimatedAnnualPerkValue}/年
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Structured Mobile Rows */}
                      <div className="divide-y divide-slate-100 text-xs leading-relaxed">
                        {/* Primary Rewards */}
                        <div className="p-3.5 grid grid-cols-12 gap-2">
                          <div className="col-span-4 sm:col-span-3 text-slate-500 font-medium">
                            主要回饋
                          </div>
                          <div className="col-span-8 sm:col-span-9 font-semibold text-slate-900">
                            {tableMode === 'original'
                              ? card.original.primaryRewards
                              : card.corrected.primaryRewards}
                          </div>
                        </div>

                        {/* Other Rewards */}
                        <div className="p-3.5 grid grid-cols-12 gap-2">
                          <div className="col-span-4 sm:col-span-3 text-slate-500 font-medium">
                            其他消費回饋
                          </div>
                          <div className="col-span-8 sm:col-span-9 text-slate-800">
                            {tableMode === 'original' ? (
                              card.original.otherRewards
                            ) : tableMode === 'diff' ? (
                              <div className="space-y-1">
                                <div className="text-slate-400">
                                  原表：{card.original.otherRewards}
                                </div>
                                <div className="text-slate-900 font-medium">
                                  補齊：{card.corrected.otherRewards}
                                </div>
                              </div>
                            ) : (
                              card.corrected.otherRewards
                            )}
                          </div>
                        </div>

                        {/* Compact 2-Column Sub-grid for Hotel Credit & Airline Credit */}
                        <div className="p-3.5 grid grid-cols-2 gap-3 bg-slate-50/40">
                          <div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              Chase Travel 飯店折抵
                            </div>
                            <div className="mt-1 text-slate-900 font-medium">
                              {tableMode === 'original' ? (
                                card.original.chaseTravelCredit
                              ) : tableMode === 'diff' &&
                                card.original.chaseTravelCredit !==
                                  card.corrected.chaseTravelCredit ? (
                                <div className="space-y-0.5">
                                  <div className="text-slate-400 line-through text-[11px]">
                                    {card.original.chaseTravelCredit}
                                  </div>
                                  <div className="text-emerald-800 font-semibold">
                                    {card.corrected.chaseTravelCredit}
                                  </div>
                                </div>
                              ) : (
                                card.corrected.chaseTravelCredit
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              航空帳單回饋
                            </div>
                            <div className="mt-1 text-slate-900 font-medium">
                              {tableMode === 'original' ? (
                                card.original.airlineCredit
                              ) : tableMode === 'diff' && isIHGAirlineError ? (
                                <div className="space-y-0.5">
                                  <div className="text-red-600 line-through text-[11px]">
                                    原表：—（漏填）
                                  </div>
                                  <div className="text-emerald-800 font-semibold">
                                    {card.corrected.airlineCredit}
                                  </div>
                                </div>
                              ) : (
                                <span
                                  className={
                                    isIHGAirlineError
                                      ? 'font-semibold text-emerald-800'
                                      : ''
                                  }
                                >
                                  {card.corrected.airlineCredit}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Hotel Elite Status */}
                        <div className="p-3.5 grid grid-cols-12 gap-2">
                          <div className="col-span-4 sm:col-span-3 text-slate-500 font-medium">
                            會籍與房晚
                          </div>
                          <div className="col-span-8 sm:col-span-9 text-slate-800">
                            {tableMode === 'original' ? (
                              card.original.hotelStatus
                            ) : tableMode === 'diff' &&
                              card.original.hotelStatus !==
                                card.corrected.hotelStatus ? (
                              <div className="space-y-1">
                                <div className="text-slate-400">
                                  原表：{card.original.hotelStatus}
                                </div>
                                <div className="text-emerald-800 font-medium">
                                  補充：{card.corrected.hotelStatus}
                                </div>
                              </div>
                            ) : (
                              card.corrected.hotelStatus
                            )}
                          </div>
                        </div>

                        {/* Key Annual Perks */}
                        {tableMode !== 'original' && (
                          <div className="p-3.5 grid grid-cols-12 gap-2 bg-emerald-50/25">
                            <div className="col-span-4 sm:col-span-3 text-slate-600 font-medium">
                              免房券與福利
                            </div>
                            <div className="col-span-8 sm:col-span-9 text-slate-900 font-medium">
                              {card.corrected.keyAnnualPerks}
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* COMPACT TABLE VIEW FOR SHEET 1 */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-3.5 min-w-[170px]">信用卡 / 年費</th>
                      <th className="py-3 px-3.5 min-w-[200px]">主要與日常消費回饋</th>
                      <th className="py-3 px-3.5 min-w-[180px]">飯店折抵 · 航空 · 會籍</th>
                      {tableMode !== 'original' && (
                        <th className="py-3 px-3.5 min-w-[210px]">
                          年度免房券與重要福利
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs leading-relaxed">
                    {filteredCards.map((card) => (
                      <tr
                        key={card.id}
                        className="hover:bg-slate-50/80 transition-colors align-top"
                      >
                        <td className="py-3.5 px-3.5">
                          <div className="font-bold text-slate-950 text-sm">
                            {card.name}
                          </div>
                          <div className="mt-0.5 font-mono tabular-nums font-semibold text-slate-800">
                            年費：{card.annualFeeNote}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            {card.issuer} · {card.foreignTxFee} · {card.rewardsCurrency}
                          </div>
                        </td>
                        <td className="py-3.5 px-3.5 space-y-1">
                          <div className="font-semibold text-slate-900">
                            【主要】
                            {tableMode === 'original'
                              ? card.original.primaryRewards
                              : card.corrected.primaryRewards}
                          </div>
                          <div className="text-slate-600">
                            【其他】
                            {tableMode === 'original'
                              ? card.original.otherRewards
                              : card.corrected.otherRewards}
                          </div>
                        </td>
                        <td className="py-3.5 px-3.5 space-y-1 text-slate-800">
                          <div>
                            <span className="text-slate-500">飯店折抵：</span>
                            {tableMode === 'original'
                              ? card.original.chaseTravelCredit
                              : card.corrected.chaseTravelCredit}
                          </div>
                          <div>
                            <span className="text-slate-500">航空回饋：</span>
                            {tableMode === 'original'
                              ? card.original.airlineCredit
                              : card.corrected.airlineCredit}
                          </div>
                          <div>
                            <span className="text-slate-500">飯店會籍：</span>
                            {tableMode === 'original'
                              ? card.original.hotelStatus
                              : card.corrected.hotelStatus}
                          </div>
                        </td>
                        {tableMode !== 'original' && (
                          <td className="py-3.5 px-3.5 text-slate-800">
                            {card.corrected.keyAnnualPerks}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* SECTION 2: ANNUAL CREDITS & FREE NIGHT CERTIFICATES TRACKER */}
        {activeSection === 'benefit-tracker' && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col gap-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h2 className="text-base sm:text-lg font-bold text-slate-950">
                    年度帳單報銷、免房券與半年度福利追蹤器
                  </h2>
                  <p className="text-xs text-slate-500">
                    手機版支援一鍵「標記用畢」與快速加減金額，免輸入即可輕鬆紀錄
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddBenefitOpen(true)}
                  className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>新增自訂福利</span>
                </button>
              </div>

              {/* Filter Strips */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Category Filter */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full">
                  {[
                    'ALL',
                    '飯店折抵',
                    '航空報銷',
                    '免房券 (FNA)',
                    '生活與外送',
                    '通關與旅遊保障',
                    '刷卡滿額禮',
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTrackerCategoryFilter(cat)}
                      className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        trackerCategoryFilter === cat
                          ? 'bg-white text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat === 'ALL' ? '全部分類' : cat}
                    </button>
                  ))}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full">
                  {['ALL', '未使用', '部分使用', '已用畢'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTrackerStatusFilter(st)}
                      className={`min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        trackerStatusFilter === st
                          ? 'bg-white text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st === 'ALL' ? '全部狀態' : st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {sheetLayoutMode === 'mobile' ? (
              /* CELLPHONE-FRIENDLY CARDS FOR SHEET 2 */
              <div className="p-3.5 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-3.5 bg-slate-50/50">
                {filteredTrackers.map((item) => {
                  const remaining = Math.max(0, item.maxValue - item.usedValue);
                  const isCompleted = item.usedValue >= item.maxValue;
                  const pct =
                    item.maxValue > 0
                      ? Math.min(100, Math.round((item.usedValue / item.maxValue) * 100))
                      : 0;

                  return (
                    <article
                      key={item.id}
                      className={`p-4 rounded-xl border transition-colors flex flex-col justify-between gap-3 ${
                        isCompleted
                          ? 'bg-slate-50/90 border-slate-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Card & Cadence Meta */}
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-800 truncate">
                            {item.cardName}
                          </span>
                          <span className="shrink-0">
                            {item.cadence} · {item.deadlineOrReset}
                          </span>
                        </div>

                        {/* Title & Value Readout */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3
                              className={`text-sm font-bold leading-snug ${
                                isCompleted
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-950'
                              }`}
                            >
                              {item.benefitTitle}
                            </h3>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {item.category} ·{' '}
                              {item.activationRequired ? '需綁定/登錄' : '自動觸發'}
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono tabular-nums">
                            <div
                              className={`text-sm font-bold ${
                                remaining === 0 ? 'text-slate-400' : 'text-emerald-700'
                              }`}
                            >
                              剩餘 ${remaining}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              總額 ${item.maxValue}
                            </div>
                          </div>
                        </div>

                        {/* Slim Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isCompleted ? 'bg-emerald-600' : 'bg-slate-900'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Notes */}
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {item.notes}
                        </p>
                      </div>

                      {/* Touch-Friendly Action Controls (40px+ hitbox) */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleQuickComplete(item.id)}
                          className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                            isCompleted
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : item.usedValue > 0
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                          }`}
                        >
                          {isCompleted ? '✓ 已用畢 (點擊重置)' : '一鍵標記用畢'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateTrackerUsedValue(
                                item.id,
                                item.usedValue - 10
                              )
                            }
                            className="min-h-[38px] px-2.5 text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                          >
                            -$10
                          </button>
                          <div className="inline-flex items-center bg-white border border-slate-300 rounded-lg px-2 min-h-[38px]">
                            <span className="text-xs text-slate-400 font-mono">$</span>
                            <input
                              type="number"
                              min={0}
                              max={item.maxValue}
                              value={item.usedValue}
                              onChange={(e) =>
                                handleUpdateTrackerUsedValue(
                                  item.id,
                                  Number(e.target.value)
                                )
                              }
                              className="w-16 text-right font-mono tabular-nums text-xs focus:outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateTrackerUsedValue(
                                item.id,
                                item.usedValue + 10
                              )
                            }
                            className="min-h-[38px] px-2.5 text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                          >
                            +$10
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* COMPACT TABLE VIEW FOR SHEET 2 */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-3.5">狀態</th>
                      <th className="py-3 px-3.5 min-w-[200px]">信用卡 / 福利項目</th>
                      <th className="py-3 px-3.5 text-right min-w-[90px]">最高 ($)</th>
                      <th className="py-3 px-3.5 text-right min-w-[110px]">已用 ($)</th>
                      <th className="py-3 px-3.5 text-right min-w-[90px]">剩餘 ($)</th>
                      <th className="py-3 px-3.5 min-w-[220px]">週期與使用說明</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredTrackers.map((item) => {
                      const remaining = Math.max(0, item.maxValue - item.usedValue);
                      const isCompleted = item.usedValue >= item.maxValue;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 transition-colors align-middle ${
                            isCompleted ? 'bg-slate-50/40' : ''
                          }`}
                        >
                          <td className="py-3 px-3.5">
                            <button
                              type="button"
                              onClick={() => handleToggleQuickComplete(item.id)}
                              className={`min-h-[36px] px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                                isCompleted
                                  ? 'bg-emerald-700 text-white border-emerald-700'
                                  : item.usedValue > 0
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {isCompleted
                                ? '✓ 已用畢'
                                : item.usedValue > 0
                                ? '部分使用'
                                : '標記用畢'}
                            </button>
                          </td>

                          <td className="py-3 px-3.5">
                            <div className="text-[11px] font-semibold text-slate-500">
                              {item.cardName}
                            </div>
                            <div
                              className={`font-bold ${
                                isCompleted
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-950'
                              }`}
                            >
                              {item.benefitTitle}
                            </div>
                          </td>

                          <td className="py-3 px-3.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                            ${item.maxValue}
                          </td>

                          <td className="py-3 px-3.5 text-right">
                            <div className="inline-flex items-center justify-end gap-1">
                              <span className="text-slate-400 font-mono">$</span>
                              <input
                                type="number"
                                min={0}
                                max={item.maxValue}
                                value={item.usedValue}
                                onChange={(e) =>
                                  handleUpdateTrackerUsedValue(
                                    item.id,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-16 px-2 py-1 text-right font-mono tabular-nums text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                              />
                            </div>
                          </td>

                          <td
                            className={`py-3 px-3.5 text-right font-mono tabular-nums font-semibold ${
                              remaining === 0 ? 'text-slate-400' : 'text-emerald-700'
                            }`}
                          >
                            ${remaining}
                          </td>

                          <td className="py-3 px-3.5 text-slate-600">
                            <div className="font-medium text-slate-800">
                              {item.cadence} ({item.deadlineOrReset})
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.notes}
                            </div>
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

        {/* SECTION 3: QUARTERLY 5% ROTATING CATEGORIES & SPEND CAPS */}
        {activeSection === 'spend-caps' && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-950">
                  季度 5% 輪替類別與年度刷卡滿額門檻追蹤
                </h2>
                <p className="text-xs text-slate-500">
                  手機版提供快捷加總按鈕（+$100 / +$500 / 滿額），單手即可更新累計消費進度
                </p>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span>即時計算剩餘額度並同步至匯出試算表</span>
              </div>
            </div>

            <div className="p-3.5 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 bg-slate-50/50">
              {spendCaps.map((cap) => {
                const pct = Math.min(
                  100,
                  Math.round((cap.currentSpend / cap.spendCap) * 100)
                );
                const remaining = Math.max(0, cap.spendCap - cap.currentSpend);

                return (
                  <article
                    key={cap.id}
                    className="p-4 sm:p-5 bg-white border border-slate-200 rounded-xl flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2.5">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                            <span className="font-semibold text-slate-900">
                              {cap.cardName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{cap.period}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-semibold text-emerald-700">
                              {cap.rewardRate}
                            </span>
                          </div>
                          <h3 className="mt-1 text-sm sm:text-base font-bold text-slate-950">
                            {cap.programName}
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleSpendCapActivated(cap.id)}
                          className={`min-h-[36px] px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            cap.activated
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {cap.activated ? '✓ 已啟用' : '提醒啟用'}
                        </button>
                      </div>

                      <div className="text-xs text-slate-700 font-medium">
                        指定類別：{cap.categoryDescription}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {cap.notes}
                      </p>

                      {/* Progress Box */}
                      <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">
                            已刷{' '}
                            <strong className="font-mono tabular-nums text-slate-950">
                              ${cap.currentSpend.toLocaleString()}
                            </strong>{' '}
                            / 上限{' '}
                            <span className="font-mono tabular-nums">
                              ${cap.spendCap.toLocaleString()}
                            </span>
                          </span>
                          <span className="font-mono tabular-nums font-bold text-slate-950">
                            {pct}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              pct >= 100 ? 'bg-emerald-600' : 'bg-slate-900'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-500 flex items-center justify-between">
                          <span>
                            尚餘額度：
                            <strong className="font-mono tabular-nums text-slate-900">
                              ${remaining.toLocaleString()}
                            </strong>
                          </span>
                          {pct >= 100 && (
                            <span className="text-emerald-700 font-semibold">
                              ✓ 已達標上限
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Touch Quick-Adjust Bar */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center bg-white border border-slate-300 rounded-lg px-2.5 min-h-[40px]">
                        <span className="text-xs text-slate-400 mr-1">累計 $</span>
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={cap.currentSpend}
                          onChange={(e) =>
                            handleUpdateSpendCap(cap.id, Number(e.target.value))
                          }
                          className="w-20 font-mono tabular-nums text-xs font-semibold text-slate-900 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateSpendCap(cap.id, cap.currentSpend + 100)
                          }
                          className="min-h-[38px] px-2.5 text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                        >
                          +$100
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateSpendCap(cap.id, cap.currentSpend + 500)
                          }
                          className="min-h-[38px] px-2.5 text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                        >
                          +$500
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateSpendCap(cap.id, cap.spendCap)}
                          className="min-h-[38px] px-2.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
                        >
                          滿額
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateSpendCap(cap.id, 0)}
                          className="min-h-[38px] px-2 text-xs font-medium text-slate-500 hover:text-slate-800 rounded-lg cursor-pointer"
                        >
                          歸零
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION 4: BEST CARD BY SPEND CATEGORY CHEAT SHEET */}
        {activeSection === 'category-guide' && (
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-950">
                  11 張持卡組合 — 各消費通路最佳刷卡攻略
                </h2>
                <p className="text-xs text-slate-500">
                  結帳前手機秒查！整理每個日常與旅遊消費場景的最高回饋主力卡與備用卡
                </p>
              </div>

              {/* Quick Category Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={guideSearchQuery}
                  onChange={(e) => setGuideSearchQuery(e.target.value)}
                  placeholder="搜尋通路：餐廳、超市、加油、網購..."
                  className="w-full pl-8 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
                {guideSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setGuideSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {sheetLayoutMode === 'mobile' ? (
              /* CELLPHONE-FRIENDLY QUICK-LOOKUP CARDS FOR SHEET 4 */
              <div className="p-3.5 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-50/50">
                {filteredGuide.map((row) => (
                  <article
                    key={row.id}
                    className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                      <h3 className="text-sm font-bold text-slate-950">
                        {row.category}
                      </h3>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono tabular-nums font-bold text-emerald-700">
                          {row.multiplier}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-500">
                          實質 {row.effectiveReturnNote}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-baseline gap-2">
                        <span className="text-slate-500 shrink-0 font-medium">
                          首選主力：
                        </span>
                        <span className="font-bold text-emerald-800">
                          {row.bestCard}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-slate-500 shrink-0 font-medium">
                          次選備用：
                        </span>
                        <span className="text-slate-800 font-medium">
                          {row.runnerUpCard}
                        </span>
                      </div>

                      <p className="pt-1 text-slate-600 leading-relaxed border-t border-slate-100">
                        {row.tips}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              /* COMPACT TABLE VIEW FOR SHEET 4 */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-3.5 min-w-[160px]">消費通路與場景</th>
                      <th className="py-3 px-3.5 min-w-[200px]">首選主力卡 · 回饋率</th>
                      <th className="py-3 px-3.5 min-w-[240px]">次選備用卡 · 刷卡策略</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs leading-relaxed">
                    {filteredGuide.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50/80 transition-colors align-top"
                      >
                        <td className="py-3.5 px-3.5 font-bold text-slate-950">
                          {row.category}
                        </td>
                        <td className="py-3.5 px-3.5">
                          <div className="font-bold text-emerald-800">
                            {row.bestCard}
                          </div>
                          <div className="mt-0.5 font-mono tabular-nums text-slate-700">
                            {row.multiplier}（實質 {row.effectiveReturnNote}）
                          </div>
                        </td>
                        <td className="py-3.5 px-3.5 space-y-1">
                          <div className="text-slate-800 font-medium">
                            次選：{row.runnerUpCard}
                          </div>
                          <div className="text-slate-600">{row.tips}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Fixed Bottom Thumb-Zone Navigation Bar on Mobile (< md) */}
      <nav
        aria-label="手機底部導覽列"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-4 items-center h-14 px-1"
      >
        {[
          { id: 'audit-table', label: '權益總表', icon: CreditCard },
          { id: 'benefit-tracker', label: '報銷追蹤', icon: ListChecks },
          { id: 'spend-caps', label: '滿額進度', icon: TrendingUp },
          { id: 'category-guide', label: '刷卡攻略', icon: Compass },
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
                  ? 'text-slate-950 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <IconComponent
                className={`w-4 h-4 ${
                  isActive ? 'text-slate-950 stroke-[2.25]' : 'text-slate-500'
                }`}
              />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Clean Quiet Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-5 px-4 sm:px-6">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>CardLedger · 信用卡福利追蹤表（手機友善精簡版）</div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() =>
                exportCardsToCSV(cards, trackers, spendCaps, SPEND_CATEGORY_GUIDE)
              }
              className="hover:text-slate-900 underline underline-offset-4 cursor-pointer"
            >
              匯出手機友善 CSV 備份
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL 1: Add Custom Benefit Item */}
      {isAddBenefitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-950">
                新增自訂福利或報銷追蹤項目
              </h3>
              <button
                type="button"
                onClick={() => setIsAddBenefitOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomBenefit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  選擇信用卡
                </label>
                <select
                  value={newBenefitCardName}
                  onChange={(e) => setNewBenefitCardName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
                >
                  {cards.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  福利項目名稱
                </label>
                <input
                  type="text"
                  required
                  value={newBenefitTitle}
                  onChange={(e) => setNewBenefitTitle(e.target.value)}
                  placeholder="例如：Chase Offer 飯店滿 $200 折 $40"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    分類
                  </label>
                  <select
                    value={newBenefitCategory}
                    onChange={(e) =>
                      setNewBenefitCategory(
                        e.target.value as BenefitTrackerItem['category']
                      )
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
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
                  <label className="block font-medium text-slate-700 mb-1">
                    最高價值 ($)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newBenefitMax}
                    onChange={(e) => setNewBenefitMax(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    重置週期
                  </label>
                  <select
                    value={newBenefitCadence}
                    onChange={(e) =>
                      setNewBenefitCadence(
                        e.target.value as BenefitTrackerItem['cadence']
                      )
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md"
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
                  <label className="block font-medium text-slate-700 mb-1">
                    到期或重置提醒
                  </label>
                  <input
                    type="text"
                    value={newBenefitDeadline}
                    onChange={(e) => setNewBenefitDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  備註說明
                </label>
                <input
                  type="text"
                  value={newBenefitNotes}
                  onChange={(e) => setNewBenefitNotes(e.target.value)}
                  placeholder="輸入使用條件或備註"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddBenefitOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 cursor-pointer"
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
