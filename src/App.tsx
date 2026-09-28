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

export default function App() {
  // Navigation & View state
  const [activeSection, setActiveSection] = useState<ActiveSection>('audit-table');
  const [tableMode, setTableMode] = useState<TableComparisonMode>('corrected');
  const [issuerFilter, setIssuerFilter] = useState<string>('ALL');
  const [feeFilter, setFeeFilter] = useState<'ALL' | 'ANNUAL_FEE' | 'NO_FEE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
          '已將完整 4 分頁追蹤表（含自動加總公式）複製到剪貼簿！您可直接開啟 Google Sheets 按 Ctrl+V / Cmd+V 貼上。',
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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Top Bar Contract: Strictly 3 zones (Brand wordmark | 4 Nav Links | Primary Actions) */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveSection('audit-table');
          }}
          className="text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap"
        >
          CardLedger
        </a>

        {/* Zone 2: 4 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveSection('audit-table')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
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
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
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
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
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
            className={`py-1 transition-colors whitespace-nowrap border-b-2 ${
              activeSection === 'category-guide'
                ? 'text-slate-950 border-slate-950 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            最佳刷卡攻略
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopySheetsTSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>複製試算表內容</span>
          </button>

          <button
            type="button"
            onClick={() =>
              exportCardsToCSV(cards, trackers, spendCaps, SPEND_CATEGORY_GUIDE)
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>下載 CSV</span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden items-center gap-1 px-4 py-2 bg-white border-b border-slate-200 overflow-x-auto">
        {[
          { id: 'audit-table', label: '權益總表' },
          { id: 'benefit-tracker', label: '年度報銷追蹤' },
          { id: 'spend-caps', label: '季度與滿額進度' },
          { id: 'category-guide', label: '最佳刷卡攻略' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id as ActiveSection)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
              activeSection === tab.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Container (1440px max width) */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 py-8 space-y-8">
        {/* Top Hero & Export Command Bar */}
        <section className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-200">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>2026 美卡權益資料庫</span>
                <span aria-hidden="true">·</span>
                <span>11 張持卡組合</span>
                <span aria-hidden="true">·</span>
                <span>Google Sheets 四分頁匯出</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                信用卡福利追蹤表
              </h1>
            </div>

            {/* Export Actions Panel */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleCopySheetsTSV}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>複製試算表內容</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  exportCardsToCSV(cards, trackers, spendCaps, SPEND_CATEGORY_GUIDE)
                }
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>下載 CSV 試算表</span>
              </button>
            </div>
          </div>

          {/* Status Banner */}
          {sheetActionBanner && (
            <div className="pt-4 flex items-center justify-between gap-3 text-xs">
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

          {/* Quantitative Portfolio Metrics Strip (Single-level hairlines, tabular-nums) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-6 mt-6 border-t border-slate-200">
            <div>
              <div className="text-xs text-slate-500">持卡總數 · 年費結構</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-950">
                11 張
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                4 張年費卡 · 7 張免年費卡
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">年度總年費支出</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-950">
                ${portfolioStats.totalAnnualFees}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                CSP $95 · IHG $99 · Hyatt $95 · Marriott $95
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">年度可量化報銷與免房券總值</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-700">
                ${portfolioStats.totalTrackableCredits.toLocaleString()}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                淨回本價值 +${portfolioStats.netPositiveValue.toLocaleString()} / 年
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">目前已用 / 尚餘待用福利</div>
              <div className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-950">
                ${portfolioStats.usedTrackableCredits}
                <span className="text-slate-400 font-normal"> / </span>
                <span className="text-amber-700">
                  ${portfolioStats.remainingTrackableCredits.toLocaleString()}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                點擊「年度報銷追蹤」可勾選更新進度
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 1: MASTER BENEFITS TABLE */}
        {activeSection === 'audit-table' && (
          <div className="space-y-8">
            {/* Interactive Master Credit Card Table */}
            <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              {/* Controls Bar */}
              <div className="p-5 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-950">
                    信用卡完整權益總表
                  </h2>
                  <p className="text-xs text-slate-500">
                    可切換「修正完整版」、「勘誤差異對照」或「原始表格」檢視
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* View Mode Segmented Control */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                    <button
                      type="button"
                      onClick={() => setTableMode('corrected')}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                        tableMode === 'corrected'
                          ? 'bg-white text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      修正與補齊完整版
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableMode('diff')}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                        tableMode === 'diff'
                          ? 'bg-white text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      原表 vs 修正對照
                    </button>
                    <button
                      type="button"
                      onClick={() => setTableMode('original')}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                        tableMode === 'original'
                          ? 'bg-white text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      原始表格
                    </button>
                  </div>

                  {/* Issuer Filter */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                    {['ALL', 'Chase', 'Amex', 'Citi', 'Discover'].map((issuer) => (
                      <button
                        key={issuer}
                        type="button"
                        onClick={() => setIssuerFilter(issuer)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
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
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
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
                        className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                          feeFilter === f.id
                            ? 'bg-white text-slate-950 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜尋卡片、免房券、Lyft、5x..."
                      className="pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-slate-900 w-52"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Table Content */}
              {filteredCards.length === 0 ? (
                <div className="p-12 text-center space-y-3">
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
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-3.5 px-4 min-w-[200px]">信用卡 / 點數體系</th>
                        <th className="py-3.5 px-4 min-w-[160px]">
                          Chase Travel 飯店折抵
                        </th>
                        <th className="py-3.5 px-4 min-w-[200px]">航空帳單回饋</th>
                        <th className="py-3.5 px-4 min-w-[210px]">
                          飯店會籍與定級房晚
                        </th>
                        <th className="py-3.5 px-4 min-w-[200px]">主要回饋</th>
                        <th className="py-3.5 px-4 min-w-[240px]">其他消費回饋</th>
                        {tableMode !== 'original' && (
                          <th className="py-3.5 px-4 min-w-[250px]">
                            年度免房券與新增重要福利
                          </th>
                        )}
                        <th className="py-3.5 px-4 text-right min-w-[90px]">年費</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs leading-relaxed">
                      {filteredCards.map((card) => {
                        const isIHGAirlineError = card.id === 'ihg-premier';
                        return (
                          <tr
                            key={card.id}
                            className="hover:bg-slate-50/80 transition-colors align-top"
                          >
                            {/* Card Name & Unboxed Metadata */}
                            <td className="py-4 px-4">
                              <div className="font-bold text-slate-950 text-sm">
                                {card.name}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
                                <span>{card.issuer}</span>
                                <span aria-hidden="true">·</span>
                                <span>{card.network}</span>
                                <span aria-hidden="true">·</span>
                                <span>{card.foreignTxFee}</span>
                              </div>
                              <div className="mt-1 text-[11px] text-slate-500">
                                {card.rewardsCurrency}
                              </div>
                            </td>

                            {/* Chase Travel Hotel Credit */}
                            <td className="py-4 px-4 text-slate-800">
                              {tableMode === 'original' ? (
                                card.original.chaseTravelCredit
                              ) : tableMode === 'diff' &&
                                card.original.chaseTravelCredit !==
                                  card.corrected.chaseTravelCredit ? (
                                <div className="space-y-1.5">
                                  <div className="text-slate-400 line-through">
                                    {card.original.chaseTravelCredit}
                                  </div>
                                  <div className="text-emerald-800 font-medium">
                                    {card.corrected.chaseTravelCredit}
                                  </div>
                                </div>
                              ) : (
                                card.corrected.chaseTravelCredit
                              )}
                            </td>

                            {/* Airline Credit */}
                            <td className="py-4 px-4 text-slate-800">
                              {tableMode === 'original' ? (
                                card.original.airlineCredit
                              ) : tableMode === 'diff' && isIHGAirlineError ? (
                                <div className="space-y-1.5">
                                  <div className="text-red-600 line-through font-medium">
                                    原表：—（漏填）
                                  </div>
                                  <div className="text-emerald-800 font-semibold">
                                    修正：{card.corrected.airlineCredit}
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className={
                                    isIHGAirlineError
                                      ? 'font-semibold text-emerald-800'
                                      : ''
                                  }
                                >
                                  {card.corrected.airlineCredit}
                                </div>
                              )}
                            </td>

                            {/* Hotel Elite Status & Night Credits */}
                            <td className="py-4 px-4 text-slate-800">
                              {tableMode === 'original' ? (
                                card.original.hotelStatus
                              ) : tableMode === 'diff' &&
                                card.original.hotelStatus !==
                                  card.corrected.hotelStatus ? (
                                <div className="space-y-1.5">
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
                            </td>

                            {/* Primary Rewards */}
                            <td className="py-4 px-4 text-slate-800 font-medium">
                              {tableMode === 'original'
                                ? card.original.primaryRewards
                                : card.corrected.primaryRewards}
                            </td>

                            {/* Other Rewards */}
                            <td className="py-4 px-4 text-slate-700">
                              {tableMode === 'original' ? (
                                card.original.otherRewards
                              ) : tableMode === 'diff' ? (
                                <div className="space-y-1.5">
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
                            </td>

                            {/* Key Annual Perks & Free Night Awards */}
                            {tableMode !== 'original' && (
                              <td className="py-4 px-4 text-slate-800">
                                {card.corrected.keyAnnualPerks}
                              </td>
                            )}

                            {/* Annual Fee */}
                            <td className="py-4 px-4 text-right font-mono tabular-nums font-semibold text-slate-950 whitespace-nowrap">
                              {card.annualFeeNote}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* SECTION 2: ANNUAL CREDITS & FREE NIGHT CERTIFICATES TRACKER */}
        {activeSection === 'benefit-tracker' && (
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-950">
                  年度帳單報銷、免房券與半年度福利追蹤器
                </h2>
                <p className="text-xs text-slate-500">
                  直接在此勾選或調整已使用金額，點擊上方「複製試算表內容」或「下載 CSV」即可匯出最新進度
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Category Filter */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md overflow-x-auto">
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
                      className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
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
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                  {['ALL', '未使用', '部分使用', '已用畢'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTrackerStatusFilter(st)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                        trackerStatusFilter === st
                          ? 'bg-white text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st === 'ALL' ? '全部狀態' : st}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddBenefitOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增自訂福利</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3.5 px-4">完成勾選</th>
                    <th className="py-3.5 px-4 min-w-[180px]">信用卡</th>
                    <th className="py-3.5 px-4 min-w-[240px]">福利項目與分類</th>
                    <th className="py-3.5 px-4 min-w-[180px]">重置週期 / 到期時間</th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">
                      最高價值 ($)
                    </th>
                    <th className="py-3.5 px-4 text-right min-w-[140px]">
                      已用金額 ($)
                    </th>
                    <th className="py-3.5 px-4 text-right min-w-[110px]">
                      剩餘價值 ($)
                    </th>
                    <th className="py-3.5 px-4 min-w-[260px]">使用說明與備註</th>
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
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleQuickComplete(item.id)}
                            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
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

                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {item.cardName}
                        </td>

                        <td className="py-3.5 px-4">
                          <div
                            className={`font-semibold ${
                              isCompleted
                                ? 'line-through text-slate-400'
                                : 'text-slate-950'
                            }`}
                          >
                            {item.benefitTitle}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            <span>{item.category}</span>
                            <span aria-hidden="true"> · </span>
                            <span>
                              {item.activationRequired ? '需綁定/登錄' : '自動觸發'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="font-medium text-slate-800">
                            {item.cadence}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.deadlineOrReset}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                          ${item.maxValue}
                        </td>

                        <td className="py-3.5 px-4 text-right">
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
                              className="w-20 px-2 py-1 text-right font-mono tabular-nums text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-slate-900"
                            />
                          </div>
                        </td>

                        <td
                          className={`py-3.5 px-4 text-right font-mono tabular-nums font-semibold ${
                            remaining === 0 ? 'text-slate-400' : 'text-emerald-700'
                          }`}
                        >
                          ${remaining}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">{item.notes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* SECTION 3: QUARTERLY 5% ROTATING CATEGORIES & SPEND CAPS */}
        {activeSection === 'spend-caps' && (
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-950">
                  季度 5% 輪替類別與年度刷卡滿額門檻追蹤
                </h2>
                <p className="text-xs text-slate-500">
                  追蹤 Freedom Flex、Discover it 每季 $1,500 上限，以及 Hyatt $15,000 免房券、Marriott $6,000 3x 上限與 IHG $20,000 滿額禮
                </p>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>可直接修改「目前累計消費」以計算剩餘額度並同步至 Google Sheet</span>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {spendCaps.map((cap) => {
                const pct = Math.min(
                  100,
                  Math.round((cap.currentSpend / cap.spendCap) * 100)
                );
                const remaining = Math.max(0, cap.spendCap - cap.currentSpend);

                return (
                  <div
                    key={cap.id}
                    className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
                  >
                    <div className="lg:col-span-5 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
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
                      <h3 className="text-sm font-bold text-slate-950">
                        {cap.programName}
                      </h3>
                      <p className="text-xs text-slate-600">
                        指定類別：{cap.categoryDescription}
                      </p>
                      <p className="text-xs text-slate-500">{cap.notes}</p>
                    </div>

                    <div className="lg:col-span-4 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          已刷{' '}
                          <strong className="font-mono tabular-nums text-slate-900">
                            ${cap.currentSpend.toLocaleString()}
                          </strong>{' '}
                          / 上限{' '}
                          <span className="font-mono tabular-nums">
                            ${cap.spendCap.toLocaleString()}
                          </span>
                        </span>
                        <span className="font-mono tabular-nums font-semibold text-slate-900">
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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
                          <strong className="font-mono tabular-nums text-slate-800">
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

                    <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-4">
                      <div className="space-y-1">
                        <label className="block text-[11px] text-slate-500">
                          更新累計消費 ($)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={cap.currentSpend}
                          onChange={(e) =>
                            handleUpdateSpendCap(cap.id, Number(e.target.value))
                          }
                          className="w-28 px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <span className="block text-[11px] text-slate-500">
                          登錄狀態
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleSpendCapActivated(cap.id)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                            cap.activated
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {cap.activated ? '✓ 已啟用' : '提醒啟用'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION 4: BEST CARD BY SPEND CATEGORY CHEAT SHEET */}
        {activeSection === 'category-guide' && (
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200 space-y-1">
              <h2 className="text-lg font-bold text-slate-950">
                11 張持卡組合 — 各消費通路最佳刷卡攻略
              </h2>
              <p className="text-xs text-slate-500">
                根據您目前持有的 11 張卡，整理每個日常與旅遊消費場景的最高回饋刷法（此分頁亦會自動寫入 Google Sheet 第 4 分頁）
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3.5 px-4 min-w-[220px]">消費通路與場景</th>
                    <th className="py-3.5 px-4 min-w-[220px]">首選主力卡</th>
                    <th className="py-3.5 px-4 min-w-[180px]">回饋倍率</th>
                    <th className="py-3.5 px-4 min-w-[150px]">預估實質回饋率</th>
                    <th className="py-3.5 px-4 min-w-[200px]">次選備用卡</th>
                    <th className="py-3.5 px-4 min-w-[280px]">刷卡策略提示</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs leading-relaxed">
                  {SPEND_CATEGORY_GUIDE.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/80 transition-colors align-top"
                    >
                      <td className="py-4 px-4 font-bold text-slate-950">
                        {row.category}
                      </td>
                      <td className="py-4 px-4 font-semibold text-emerald-800">
                        {row.bestCard}
                      </td>
                      <td className="py-4 px-4 font-mono tabular-nums font-semibold text-slate-900">
                        {row.multiplier}
                      </td>
                      <td className="py-4 px-4 font-mono tabular-nums text-slate-700">
                        {row.effectiveReturnNote}
                      </td>
                      <td className="py-4 px-4 text-slate-600">{row.runnerUpCard}</td>
                      <td className="py-4 px-4 text-slate-600">{row.tips}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Clean Quiet Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-5 px-6">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>CardLedger · 信用卡福利追蹤表</div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() =>
                exportCardsToCSV(cards, trackers, spendCaps, SPEND_CATEGORY_GUIDE)
              }
              className="hover:text-slate-900 underline underline-offset-4 cursor-pointer"
            >
              匯出 CSV 備份
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
