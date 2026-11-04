import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Receipt,
  Users,
  Wallet,
} from 'lucide-react';
import {
  ContributionRecord,
  ExpenseRecord,
  MemberRecord,
  NavSection,
} from '../types';
import {
  computeKitchenMetrics,
  formatDateDisplay,
  formatINR,
} from '../utils/calculations';

interface DashboardViewProps {
  expenses: ExpenseRecord[];
  contributions: ContributionRecord[];
  members: MemberRecord[];
  onOpenAddExpense: () => void;
  onNavigate: (section: NavSection) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  expenses,
  contributions,
  members,
  onOpenAddExpense,
  onNavigate,
}) => {
  const metrics = computeKitchenMetrics(expenses, contributions);

  const activeExpenses = expenses
    .filter((e) => !e.is_deleted)
    .sort((a, b) => {
      const cmp = b.expense_date.localeCompare(a.expense_date);
      return cmp !== 0 ? cmp : b.created_at.localeCompare(a.created_at);
    });

  const recent5Expenses = activeExpenses.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Negative Kitchen Balance Warning */}
      {metrics.isNegativeBalance && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-bold">Kitchen Balance is Negative</p>
            <p className="text-red-700 mt-0.5">
              Total kitchen expenses ({formatINR(metrics.totalExpenses)}) have
              exceeded total member contributions (
              {formatINR(metrics.totalContributions)}) by{' '}
              <span className="font-mono font-bold">
                {formatINR(Math.abs(metrics.availableBalance))}
              </span>
              . Please record member contributions on the Members page.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('members')}
            className="shrink-0 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
          >
            Add Money
          </button>
        </div>
      )}

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Expenses */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Expenses
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
            {formatINR(metrics.totalExpenses)}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Total spent since beginning of records
          </p>
        </div>

        {/* Card 2: Last 7 Days */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Last 7 Days
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
            {formatINR(metrics.last7DaysExpenses)}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Recorded in the last 7 calendar days
          </p>
        </div>

        {/* Card 3: This Month */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            This Month
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
            {formatINR(metrics.thisMonthExpenses)}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Current calendar month spending
          </p>
        </div>

        {/* Card 4: Available Kitchen Balance */}
        <div
          className={`rounded-xl border p-5 shadow-xs ${
            metrics.isNegativeBalance
              ? 'border-red-300 bg-red-50/50'
              : 'border-emerald-200 bg-emerald-50/40'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Available Kitchen Balance
          </div>
          <div
            className={`mt-2 text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
              metrics.isNegativeBalance ? 'text-red-700' : 'text-emerald-900'
            }`}
          >
            {formatINR(metrics.availableBalance)}
          </div>
          <p className="mt-1.5 text-xs text-slate-600 font-mono tabular-nums">
            {formatINR(metrics.totalContributions)} −{' '}
            {formatINR(metrics.totalExpenses)}
          </p>
        </div>
      </div>

      {/* Prominent Large Add Expense Button */}
      <div className="rounded-xl border border-emerald-800/20 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Daily Kitchen Expense Tracker
          </h2>
          <p className="text-sm text-slate-600">
            Bought vegetables, milk, groceries, or gas today? Record it right
            away.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddExpense}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-800 px-6 py-4 text-base font-bold text-white shadow-sm hover:bg-emerald-900 active:scale-[0.99] transition-all cursor-pointer shrink-0 whitespace-nowrap"
        >
          <span>+ Add Today&apos;s Expense</span>
        </button>
      </div>

      {/* Bottom 2-Column Layout: Recent Expenses & Member Fund Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Expenses (Last 5 Entries) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-800" />
              <h3 className="text-base font-bold text-slate-900">
                Recent Expenses
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
            >
              View All ({activeExpenses.length})
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {recent5Expenses.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">
                No expenses recorded yet. Click{' '}
                <span className="font-semibold text-slate-700">
                  + Add Today&apos;s Expense
                </span>{' '}
                to start.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {recent5Expenses.map((exp) => (
                      <tr
                        key={exp.expense_id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {exp.product_name}
                          <span className="ml-2 text-xs font-normal text-slate-500 font-mono">
                            ({exp.quantity} {exp.unit})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                          {formatDateDisplay(exp.expense_date)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                          {formatINR(exp.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Compact List */}
              <div className="sm:hidden divide-y divide-slate-200">
                {recent5Expenses.map((exp) => (
                  <div
                    key={exp.expense_id}
                    className="p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {exp.product_name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatDateDisplay(exp.expense_date)} • {exp.category}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono tabular-nums font-bold text-slate-900">
                        {formatINR(exp.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Member Fund Summary */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-800" />
                <h3 className="text-base font-bold text-slate-900">
                  Member Fund Summary
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('members')}
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-950"
              >
                Manage
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-600">
                  Total money contributed
                </span>
                <span className="font-mono tabular-nums text-base font-bold text-emerald-800">
                  {formatINR(metrics.totalContributions)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-600">
                  Total money spent
                </span>
                <span className="font-mono tabular-nums text-base font-bold text-slate-900">
                  {formatINR(metrics.totalExpenses)}
                </span>
              </div>

              <div
                className={`flex items-center justify-between rounded-lg p-3.5 ${
                  metrics.isNegativeBalance
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-emerald-50/70 border border-emerald-200'
                }`}
              >
                <span className="text-sm font-bold text-slate-900">
                  Remaining kitchen fund
                </span>
                <span
                  className={`font-mono tabular-nums text-lg font-bold ${
                    metrics.isNegativeBalance
                      ? 'text-red-700'
                      : 'text-emerald-900'
                  }`}
                >
                  {formatINR(metrics.availableBalance)}
                </span>
              </div>

              {/* Quick 4-member overview */}
              <div className="pt-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                  4 Kitchen Members
                </div>
                <div className="space-y-2.5">
                  {members.slice(0, 4).map((m) => {
                    const memberTotal = contributions
                      .filter((c) => c.member_id === m.member_id)
                      .reduce((s, c) => s + (Number(c.amount) || 0), 0);
                    const avatarUrl =
                      m.avatar_url ||
                      (m.member_id === 'MEM-1'
                        ? '/assets/aistudio/image_99379257.png'
                        : undefined);
                    const role =
                      m.role || (m.member_id === 'MEM-1' ? 'Chef' : undefined);
                    return (
                      <div
                        key={m.member_id}
                        className="flex items-center justify-between text-xs text-slate-700"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={m.member_name}
                              className="h-6 w-6 shrink-0 rounded-full object-cover object-top ring-1 ring-emerald-800 bg-white"
                            />
                          ) : (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                              {m.member_name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                          <span className="font-semibold text-slate-900 truncate">
                            {m.member_name}
                          </span>
                          {role && (
                            <span className="rounded bg-emerald-800 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {role}
                            </span>
                          )}
                        </div>
                        <span className="font-mono tabular-nums font-semibold text-slate-900">
                          {formatINR(memberTotal)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 p-4 bg-slate-50/60">
            <button
              type="button"
              onClick={() => onNavigate('members')}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
            >
              <Users className="h-4 w-4 text-emerald-800" />
              Add Member Contribution
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
