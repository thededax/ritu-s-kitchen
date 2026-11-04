import React, { useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2 } from 'lucide-react';
import {
  CategoryRecord,
  DEFAULT_CATEGORIES_TREE,
  ExpenseRecord,
} from '../types';
import {
  formatDateDisplay,
  formatINR,
  getTodayIST,
  round2,
  shiftDateDays,
} from '../utils/calculations';
import { ConfirmDialog } from './ConfirmDialog';

type DateFilterPreset =
  | 'all'
  | 'today'
  | 'last7'
  | 'thisMonth'
  | 'prevMonth'
  | 'custom';

interface AllExpensesViewProps {
  expenses: ExpenseRecord[];
  categories: CategoryRecord[];
  onOpenAddExpense: () => void;
  onEditExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (expenseId: string) => Promise<void>;
}

export const AllExpensesView: React.FC<AllExpensesViewProps> = ({
  expenses,
  categories,
  onOpenAddExpense,
  onEditExpense,
  onDeleteExpense,
}) => {
  const todayStr = getTodayIST();
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('all');
  const [customStart, setCustomStart] = useState<string>(
    `${todayStr.slice(0, 7)}-01`
  );
  const [customEnd, setCustomEnd] = useState<string>(todayStr);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [deletingTarget, setDeletingTarget] = useState<ExpenseRecord | null>(
    null
  );

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const g of DEFAULT_CATEGORIES_TREE) {
      set.add(g.category_name);
    }
    for (const c of categories) {
      if (c.is_active && c.category_name) set.add(c.category_name);
    }
    return Array.from(set);
  }, [categories]);

  const previousMonthPrefix = useMemo(() => {
    const [y, m] = todayStr.split('-').map(Number);
    const prevDate = new Date(Date.UTC(y, m - 2, 1));
    return prevDate.toISOString().slice(0, 7);
  }, [todayStr]);

  const filteredExpenses = useMemo(() => {
    const sevenDaysAgo = shiftDateDays(todayStr, -6);
    const currentMonthPrefix = todayStr.slice(0, 7);
    const q = searchQuery.trim().toLowerCase();

    return expenses
      .filter((e) => !e.is_deleted)
      .filter((e) => {
        if (datePreset === 'today') {
          return e.expense_date === todayStr;
        }
        if (datePreset === 'last7') {
          return e.expense_date >= sevenDaysAgo && e.expense_date <= todayStr;
        }
        if (datePreset === 'thisMonth') {
          return e.expense_date.startsWith(currentMonthPrefix);
        }
        if (datePreset === 'prevMonth') {
          return e.expense_date.startsWith(previousMonthPrefix);
        }
        if (datePreset === 'custom') {
          const afterStart = !customStart || e.expense_date >= customStart;
          const beforeEnd = !customEnd || e.expense_date <= customEnd;
          return afterStart && beforeEnd;
        }
        return true;
      })
      .filter((e) => {
        if (selectedCategory !== 'ALL' && e.category !== selectedCategory) {
          return false;
        }
        if (q && !e.product_name.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const cmp = b.expense_date.localeCompare(a.expense_date);
        return cmp !== 0 ? cmp : b.created_at.localeCompare(a.created_at);
      });
  }, [
    expenses,
    datePreset,
    todayStr,
    previousMonthPrefix,
    customStart,
    customEnd,
    selectedCategory,
    searchQuery,
  ]);

  const filteredTotal = useMemo(
    () =>
      filteredExpenses.reduce(
        (sum, e) => round2(sum + (Number(e.amount) || 0)),
        0
      ),
    [filteredExpenses]
  );

  return (
    <div className="space-y-5">
      {/* Header & Filtered Total Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Expenses</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Showing {filteredExpenses.length} expense
            {filteredExpenses.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2 text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Filtered Total Expense
            </div>
            <div className="font-mono tabular-nums text-xl font-bold text-emerald-950">
              {formatINR(filteredTotal)}
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAddExpense}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3.5">
        {/* Date Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'today', label: 'Today' },
              { id: 'last7', label: 'Last 7 Days' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'prevMonth', label: 'Previous Month' },
              { id: 'custom', label: 'Custom Date Range' },
            ] as Array<{ id: DateFilterPreset; label: string }>
          ).map((btn) => {
            const active = datePreset === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setDatePreset(btn.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-emerald-800 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* Custom Date Range Inputs */}
        {datePreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
        )}

        {/* Search Input & Category Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name (e.g., Potato, Milk, Rice)..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by Category"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expense List: Table on Desktop, Compact Cards on Mobile */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-600">
              No matching expenses found.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Try changing the date filter or search query.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Product Name</th>
                    <th className="py-3.5 px-4">Quantity</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Payment Method</th>
                    <th className="py-3.5 px-4 text-right">Amount</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredExpenses.map((exp) => (
                    <tr
                      key={exp.expense_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {formatDateDisplay(exp.expense_date)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {exp.product_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {exp.quantity} {exp.unit}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-medium text-slate-800 text-xs">
                          {exp.category}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {exp.subcategory}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                            exp.payment_method === 'UPI'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-amber-50 text-amber-900 border border-amber-200'
                          }`}
                        >
                          {exp.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                        {formatINR(exp.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditExpense(exp)}
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-emerald-800"
                            title="Edit Expense"
                            aria-label={`Edit ${exp.product_name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTarget(exp)}
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600"
                            title="Delete Expense"
                            aria-label={`Delete ${exp.product_name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Compact Cards */}
            <div className="md:hidden divide-y divide-slate-200">
              {filteredExpenses.map((exp) => (
                <div key={exp.expense_id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        {exp.product_name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatDateDisplay(exp.expense_date)} • {exp.quantity}{' '}
                        {exp.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono tabular-nums text-base font-bold text-slate-900">
                        {formatINR(exp.amount)}
                      </div>
                      <span
                        className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          exp.payment_method === 'UPI'
                            ? 'bg-blue-50 text-blue-800'
                            : 'bg-amber-50 text-amber-900'
                        }`}
                      >
                        {exp.payment_method}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-600 bg-slate-100 rounded-md px-2 py-0.5">
                      {exp.category} → {exp.subcategory}
                    </span>

                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditExpense(exp)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingTarget(exp)}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Confirmation Dialog before deleting */}
      <ConfirmDialog
        isOpen={Boolean(deletingTarget)}
        title="Delete Expense Record"
        message={
          deletingTarget
            ? `Are you sure you want to delete "${deletingTarget.product_name}" (${formatINR(
                deletingTarget.amount
              )}) from ${formatDateDisplay(deletingTarget.expense_date)}?`
            : ''
        }
        confirmLabel="Delete Expense"
        onCancel={() => setDeletingTarget(null)}
        onConfirm={async () => {
          if (!deletingTarget) return;
          const id = deletingTarget.expense_id;
          setDeletingTarget(null);
          await onDeleteExpense(id);
        }}
      />
    </div>
  );
};
