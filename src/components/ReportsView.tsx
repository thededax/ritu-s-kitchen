import React, { useMemo, useState } from 'react';
import { Calendar, Download, FileText, Layers, Users } from 'lucide-react';
import {
  ContributionRecord,
  DEFAULT_CATEGORIES_TREE,
  ExpenseRecord,
  MemberRecord,
} from '../types';
import {
  computeKitchenMetrics,
  computeMemberStats,
  formatDateDisplay,
  formatINR,
  getTodayIST,
  round2,
} from '../utils/calculations';

type ReportFilterMode = 'month' | 'custom';

interface ReportsViewProps {
  expenses: ExpenseRecord[];
  contributions: ContributionRecord[];
  members: MemberRecord[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  expenses,
  contributions,
  members,
}) => {
  const todayStr = getTodayIST();
  const currentMonth = todayStr.slice(0, 7);

  const [filterMode, setFilterMode] = useState<ReportFilterMode>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [customStart, setCustomStart] = useState<string>(`${currentMonth}-01`);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  const availableMonths = useMemo(() => {
    const set = new Set<string>([currentMonth]);
    for (const e of expenses) {
      if (!e.is_deleted && e.expense_date.length >= 7) {
        set.add(e.expense_date.slice(0, 7));
      }
    }
    for (const c of contributions) {
      if (c.contribution_date.length >= 7) {
        set.add(c.contribution_date.slice(0, 7));
      }
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [expenses, contributions, currentMonth]);

  // Expenses in selected period
  const periodExpenses = useMemo(() => {
    return expenses
      .filter((e) => !e.is_deleted)
      .filter((e) => {
        if (filterMode === 'month') {
          return e.expense_date.startsWith(selectedMonth);
        }
        const afterStart = !customStart || e.expense_date >= customStart;
        const beforeEnd = !customEnd || e.expense_date <= customEnd;
        return afterStart && beforeEnd;
      })
      .sort((a, b) => b.expense_date.localeCompare(a.expense_date));
  }, [expenses, filterMode, selectedMonth, customStart, customEnd]);

  // Contributions in selected period
  const periodContributions = useMemo(() => {
    return contributions.filter((c) => {
      if (filterMode === 'month') {
        return c.contribution_date.startsWith(selectedMonth);
      }
      const afterStart = !customStart || c.contribution_date >= customStart;
      const beforeEnd = !customEnd || c.contribution_date <= customEnd;
      return afterStart && beforeEnd;
    });
  }, [contributions, filterMode, selectedMonth, customStart, customEnd]);

  const overallMetrics = useMemo(
    () => computeKitchenMetrics(expenses, contributions, todayStr),
    [expenses, contributions, todayStr]
  );

  const totalPeriodExpenses = useMemo(
    () =>
      periodExpenses.reduce(
        (sum, e) => round2(sum + (Number(e.amount) || 0)),
        0
      ),
    [periodExpenses]
  );

  const totalPeriodContributions = useMemo(
    () =>
      periodContributions.reduce(
        (sum, c) => round2(sum + (Number(c.amount) || 0)),
        0
      ),
    [periodContributions]
  );

  // Category-wise Expenses breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const group of DEFAULT_CATEGORIES_TREE) {
      map.set(group.category_name, 0);
    }
    for (const exp of periodExpenses) {
      const cat = exp.category || 'Other';
      const prev = map.get(cat) || 0;
      map.set(cat, round2(prev + (Number(exp.amount) || 0)));
    }
    return Array.from(map.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage:
        totalPeriodExpenses > 0
          ? Math.round((amount / totalPeriodExpenses) * 100)
          : 0,
    }));
  }, [periodExpenses, totalPeriodExpenses]);

  // Daily Expense Breakdown
  const dailyBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { date: string; count: number; total: number; items: string[] }
    >();
    for (const exp of periodExpenses) {
      const existing = map.get(exp.expense_date) || {
        date: exp.expense_date,
        count: 0,
        total: 0,
        items: [],
      };
      existing.count += 1;
      existing.total = round2(existing.total + (Number(exp.amount) || 0));
      if (existing.items.length < 4) {
        existing.items.push(exp.product_name);
      }
      map.set(exp.expense_date, existing);
    }
    return Array.from(map.values()).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }, [periodExpenses]);

  // Member Contributions
  const memberStats = useMemo(() => {
    if (filterMode === 'month') {
      return computeMemberStats(members, contributions, selectedMonth);
    }
    // For custom date range, compute period contribution per member
    return members.slice(0, 4).map((m) => {
      const allMember = contributions.filter(
        (c) => c.member_id === m.member_id
      );
      const periodMember = periodContributions.filter(
        (c) => c.member_id === m.member_id
      );
      const totalContribution = allMember.reduce(
        (s, c) => round2(s + (Number(c.amount) || 0)),
        0
      );
      const monthContribution = periodMember.reduce(
        (s, c) => round2(s + (Number(c.amount) || 0)),
        0
      );
      return {
        member_id: m.member_id,
        member_name: m.member_name,
        totalContribution,
        monthContribution,
        previousMonthsContribution: round2(
          totalContribution - monthContribution
        ),
        contributionCount: allMember.length,
        transactions: allMember,
      };
    });
  }, [
    members,
    contributions,
    periodContributions,
    filterMode,
    selectedMonth,
  ]);

  const handleDownloadCsv = () => {
    const headers = [
      'Date',
      'Product Name',
      'Quantity',
      'Unit',
      'Category',
      'Subcategory',
      'Amount (INR)',
      'Payment Method',
    ];
    const rows = periodExpenses.map((e) => [
      e.expense_date,
      `"${e.product_name.replace(/"/g, '""')}"`,
      e.quantity,
      e.unit,
      `"${e.category}"`,
      `"${e.subcategory}"`,
      e.amount,
      e.payment_method,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const periodLabel =
      filterMode === 'month'
        ? selectedMonth
        : `${customStart}_to_${customEnd}`;
    a.href = url;
    a.download = `ritus-cloud-kitchen-report-${periodLabel}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header + Date Filter + CSV Export */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Monthly Expense Report
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Clean summary of monthly expenses, categories, and member
              contributions
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setFilterMode('month')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterMode === 'month'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Select Month
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('custom')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                filterMode === 'custom'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom Date Range
            </button>
          </div>

          {filterMode === 'month' ? (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Select Report Month"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-mono text-slate-900 focus:border-emerald-700 focus:outline-none"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono text-slate-900"
              />
              <span className="text-xs text-slate-500">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-mono text-slate-900"
              />
            </div>
          )}
        </div>
      </div>

      {/* 1. Monthly Expense Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Monthly Expenses
          </div>
          <div className="mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-bold text-slate-900">
            {formatINR(totalPeriodExpenses)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Across {periodExpenses.length} recorded purchase
            {periodExpenses.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Money Contributed
          </div>
          <div className="mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-bold text-emerald-800">
            {formatINR(overallMetrics.totalContributions)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {formatINR(totalPeriodContributions)} added in selected period
          </p>
        </div>

        <div
          className={`rounded-xl border p-5 shadow-xs ${
            overallMetrics.isNegativeBalance
              ? 'border-red-300 bg-red-50/50'
              : 'border-emerald-200 bg-emerald-50/40'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Remaining Kitchen Fund
          </div>
          <div
            className={`mt-2 font-mono tabular-nums text-2xl sm:text-3xl font-bold ${
              overallMetrics.isNegativeBalance
                ? 'text-red-700'
                : 'text-emerald-900'
            }`}
          >
            {formatINR(overallMetrics.availableBalance)}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Overall shared balance available
          </p>
        </div>
      </div>

      {/* 2. Category-wise Expenses & 3. Member Contributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category-wise Expenses */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Layers className="h-4 w-4 text-emerald-800" />
            <h2 className="text-base font-bold text-slate-900">
              Category-wise Expenses
            </h2>
          </div>

          <div className="divide-y divide-slate-200">
            {categoryBreakdown.map((item) => (
              <div key={item.category} className="p-4 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">
                    {item.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono">
                      ({item.percentage}%)
                    </span>
                    <span className="font-mono tabular-nums font-bold text-slate-900">
                      {formatINR(item.amount)}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-700 transition-all"
                    style={{ width: `${Math.min(100, item.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Member Contributions */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Users className="h-4 w-4 text-emerald-800" />
            <h2 className="text-base font-bold text-slate-900">
              Member Contributions
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4 text-right">
                    {filterMode === 'month'
                      ? `Month (${selectedMonth})`
                      : 'Selected Period'}
                  </th>
                  <th className="py-3 px-4 text-right">Total Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {memberStats.map((m) => {
                  const avatarUrl =
                    m.avatar_url ||
                    (m.member_id === 'MEM-1'
                      ? '/assets/aistudio/image_99379257.png'
                      : undefined);
                  const role =
                    m.role || (m.member_id === 'MEM-1' ? 'Chef' : undefined);
                  return (
                    <tr
                      key={m.member_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="inline-flex items-center gap-2">
                          {avatarUrl && (
                            <img
                              src={avatarUrl}
                              alt={m.member_name}
                              className="h-7 w-7 shrink-0 rounded-full object-cover object-top ring-1 ring-emerald-800 bg-white"
                            />
                          )}
                          <span>{m.member_name}</span>
                          {role && (
                            <span className="rounded bg-emerald-800 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {role}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-800 font-semibold">
                        {formatINR(m.monthContribution)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                        {formatINR(m.totalContribution)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Daily Expense Breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-800" />
            <h2 className="text-base font-bold text-slate-900">
              Daily Expense Breakdown
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {dailyBreakdown.length} active day
            {dailyBreakdown.length === 1 ? '' : 's'}
          </span>
        </div>

        {dailyBreakdown.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No expenses recorded in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Items Purchased</th>
                  <th className="py-3 px-4 text-right">Entries</th>
                  <th className="py-3 px-4 text-right">Daily Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {dailyBreakdown.map((day) => (
                  <tr
                    key={day.date}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {formatDateDisplay(day.date)}
                    </td>
                    <td className="py-3 px-4 text-slate-700 text-xs">
                      {day.items.join(', ')}
                      {day.count > day.items.length
                        ? ` +${day.count - day.items.length} more`
                        : ''}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-600">
                      {day.count}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                      {formatINR(day.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
