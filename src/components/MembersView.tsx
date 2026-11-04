import React, { useMemo, useState } from 'react';
import {
  Check,
  ChefHat,
  Edit2,
  History,
  Plus,
  Trash2,
  User,
  Wallet,
  X,
} from 'lucide-react';
import {
  ContributionRecord,
  DEFAULT_PAYMENT_METHODS,
  MemberRecord,
} from '../types';
import {
  computeMemberStats,
  formatDateDisplay,
  formatINR,
  getTodayIST,
  round2,
} from '../utils/calculations';
import { ConfirmDialog } from './ConfirmDialog';

interface MembersViewProps {
  members: MemberRecord[];
  contributions: ContributionRecord[];
  onAddContribution: (payload: {
    member_id: string;
    amount: number;
    contribution_date: string;
    payment_method: 'Cash' | 'UPI';
    note?: string;
  }) => Promise<void>;
  onDeleteContribution: (contributionId: string) => Promise<void>;
  onRenameMember: (memberId: string, memberName: string) => Promise<void>;
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  contributions,
  onAddContribution,
  onDeleteContribution,
  onRenameMember,
}) => {
  const currentMonth = getTodayIST().slice(0, 7);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    members[0]?.member_id || 'MEM-1'
  );
  const [historyMonth, setHistoryMonth] = useState<string>('ALL');

  // Inline member rename state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [savingName, setSavingName] = useState<boolean>(false);

  // Add Money Modal State
  const [addMoneyOpen, setAddMoneyOpen] = useState<boolean>(false);
  const [formMemberId, setFormMemberId] = useState<string>('MEM-1');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(getTodayIST());
  const [formMethod, setFormMethod] = useState<'Cash' | 'UPI'>('UPI');
  const [formNote, setFormNote] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submittingMoney, setSubmittingMoney] = useState<boolean>(false);

  const [deletingContribution, setDeletingContribution] =
    useState<ContributionRecord | null>(null);

  const memberStats = useMemo(
    () => computeMemberStats(members, contributions, currentMonth),
    [members, contributions, currentMonth]
  );

  const availableMonths = useMemo(() => {
    const set = new Set<string>([currentMonth]);
    for (const c of contributions) {
      if (c.contribution_date && c.contribution_date.length >= 7) {
        set.add(c.contribution_date.slice(0, 7));
      }
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [contributions, currentMonth]);

  const activeMemberStat =
    memberStats.find((m) => m.member_id === selectedMemberId) ||
    memberStats[0];

  const filteredMemberTransactions = useMemo(() => {
    if (!activeMemberStat) return [];
    if (historyMonth === 'ALL') return activeMemberStat.transactions;
    return activeMemberStat.transactions.filter((t) =>
      t.contribution_date.startsWith(historyMonth)
    );
  }, [activeMemberStat, historyMonth]);

  const openAddMoneyForMember = (memberId: string) => {
    setFormMemberId(memberId);
    setFormAmount('');
    setFormDate(getTodayIST());
    setFormMethod('UPI');
    setFormNote('');
    setFormError(null);
    setAddMoneyOpen(true);
  };

  const handleSaveRename = async (memberId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      await onRenameMember(memberId, trimmed);
      setEditingMemberId(null);
    } finally {
      setSavingName(false);
    }
  };

  const handleAddMoneySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const amt = round2(Number(formAmount));
    if (!Number.isFinite(amt) || amt <= 0) {
      setFormError('Please enter a valid Amount Added in ₹ greater than 0.');
      return;
    }

    setSubmittingMoney(true);
    try {
      await onAddContribution({
        member_id: formMemberId,
        amount: amt,
        contribution_date: formDate || getTodayIST(),
        payment_method: formMethod,
        note: formNote.trim(),
      });
      setSelectedMemberId(formMemberId);
      setAddMoneyOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to add money.');
    } finally {
      setSubmittingMoney(false);
    }
  };

  const totalAllMembers = memberStats.reduce(
    (sum, m) => round2(sum + m.totalContribution),
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Kitchen Members (4)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track shared kitchen money contributed by each of the four members.
            Click the pencil icon to rename any member.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Pool Contributed
            </div>
            <div className="font-mono tabular-nums text-lg font-bold text-emerald-900">
              {formatINR(totalAllMembers)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => openAddMoneyForMember(selectedMemberId)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Money</span>
          </button>
        </div>
      </div>

      {/* 4 Individual Member Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {memberStats.map((stat) => {
          const isSelected = stat.member_id === activeMemberStat?.member_id;
          const isEditing = editingMemberId === stat.member_id;

          return (
            <div
              key={stat.member_id}
              onClick={() => setSelectedMemberId(stat.member_id)}
              className={`rounded-xl border p-5 transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-800 bg-emerald-50/30 ring-2 ring-emerald-800/15'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                {/* Member Name + Photo + Chef Role + Rename Control */}
                <div
                  className="flex items-start justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1 text-sm font-bold text-slate-900 focus:border-emerald-700 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        disabled={savingName}
                        onClick={() => handleSaveRename(stat.member_id)}
                        className="rounded-md bg-emerald-800 p-1.5 text-white hover:bg-emerald-900"
                        title="Save Name"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingMemberId(null)}
                        className="rounded-md bg-slate-200 p-1.5 text-slate-700 hover:bg-slate-300"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        {stat.avatar_url ? (
                          <img
                            src={stat.avatar_url}
                            alt={`${stat.member_name}${
                              stat.role ? ` (${stat.role})` : ''
                            }`}
                            className="h-12 w-12 shrink-0 rounded-full object-cover object-top ring-2 ring-emerald-800 bg-white shadow-xs"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 font-bold text-sm">
                            <User className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-slate-900 truncate">
                            {stat.member_name}
                          </h2>
                          {stat.role && (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-emerald-800 px-2 py-0.5 text-[11px] font-semibold text-white">
                              <ChefHat className="h-3 w-3" />
                              <span>{stat.role}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMemberId(stat.member_id);
                          setEditingName(stat.member_name);
                        }}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Rename Member"
                        aria-label={`Rename ${stat.member_name}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Member Metrics */}
                <div className="mt-4 space-y-2.5 border-t border-slate-200/80 pt-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Total Contribution
                    </div>
                    <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-0.5">
                      {formatINR(stat.totalContribution)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">This Month:</span>
                    <span className="font-mono tabular-nums font-semibold text-emerald-800">
                      {formatINR(stat.monthContribution)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Number of Contributions:
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      {stat.contributionCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Add Money Button */}
              <div className="mt-4 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openAddMoneyForMember(stat.member_id);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Money</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Member Contribution History */}
      {activeMemberStat && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/70 px-5 py-4">
            <div className="flex items-center gap-3">
              {activeMemberStat.avatar_url ? (
                <img
                  src={activeMemberStat.avatar_url}
                  alt={activeMemberStat.member_name}
                  className="h-10 w-10 shrink-0 rounded-full object-cover object-top ring-2 ring-emerald-800 bg-white"
                />
              ) : (
                <History className="h-4 w-4 text-emerald-800" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Member Contribution History — {activeMemberStat.member_name}
                  </h3>
                  {activeMemberStat.role && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-800 px-2 py-0.5 text-[11px] font-semibold text-white">
                      <ChefHat className="h-3 w-3" />
                      <span>{activeMemberStat.role}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Showing all recorded contributions for{' '}
                  {activeMemberStat.member_name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">
                Filter Month:
              </label>
              <select
                value={historyMonth}
                onChange={(e) => setHistoryMonth(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-emerald-700 focus:outline-none"
              >
                <option value="ALL">All Months</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Summary Row for Selected Member */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-200 p-5 bg-white">
            <div className="rounded-lg border border-slate-200 p-3.5">
              <div className="text-xs text-slate-500">Total Contributed</div>
              <div className="mt-1 font-mono tabular-nums text-lg font-bold text-slate-900">
                {formatINR(activeMemberStat.totalContribution)}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3.5">
              <div className="text-xs text-slate-500">
                Current Month&apos;s Contribution ({currentMonth})
              </div>
              <div className="mt-1 font-mono tabular-nums text-lg font-bold text-emerald-800">
                {formatINR(activeMemberStat.monthContribution)}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-3.5">
              <div className="text-xs text-slate-500">
                Previous Months&apos; Contributions
              </div>
              <div className="mt-1 font-mono tabular-nums text-lg font-bold text-slate-700">
                {formatINR(activeMemberStat.previousMonthsContribution)}
              </div>
            </div>
          </div>

          {/* Transactions Table / List */}
          {filteredMemberTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">
                No contributions recorded for {activeMemberStat.member_name} in
                this period.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Note</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredMemberTransactions.map((tx) => (
                    <tr
                      key={tx.contribution_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        {formatDateDisplay(tx.contribution_date)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="inline-flex items-center gap-2">
                          {activeMemberStat.avatar_url && (
                            <img
                              src={activeMemberStat.avatar_url}
                              alt={activeMemberStat.member_name}
                              className="h-6 w-6 rounded-full object-cover object-top ring-1 ring-emerald-700 bg-white"
                            />
                          )}
                          <span>{activeMemberStat.member_name}</span>
                          {activeMemberStat.role && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900">
                              {activeMemberStat.role}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                            tx.payment_method === 'UPI'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-amber-50 text-amber-900 border border-amber-200'
                          }`}
                        >
                          {tx.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {tx.note || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-900">
                        {formatINR(tx.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setDeletingContribution(tx)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete Contribution"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Money Modal */}
      {addMoneyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-money-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-800" />
                <h2
                  id="add-money-title"
                  className="text-base font-bold text-slate-900"
                >
                  Add Kitchen Contribution
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAddMoneyOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddMoneySubmit} className="p-5 space-y-4">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {formError}
                </div>
              )}

              {/* 1. Select Member */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Member <span className="text-red-500">*</span>
                </label>
                <select
                  value={formMemberId}
                  onChange={(e) => setFormMemberId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                >
                  {members.slice(0, 4).map((m) => (
                    <option key={m.member_id} value={m.member_id}>
                      {m.member_name}
                      {m.role || m.member_id === 'MEM-1'
                        ? ` (${m.role || 'Chef'})`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Amount Added */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount Added (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="e.g., 2000"
                  autoFocus
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm font-mono tabular-nums font-bold text-slate-900 focus:border-emerald-700 focus:outline-none"
                />
              </div>

              {/* 3. Contribution Date & 4. Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contribution Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DEFAULT_PAYMENT_METHODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFormMethod(m)}
                        className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
                          formMethod === m
                            ? 'border-emerald-800 bg-emerald-800 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Optional Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Optional Note
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="e.g., Monthly share for kitchen fund"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddMoneyOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMoney}
                  className="rounded-lg bg-emerald-800 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
                >
                  {submittingMoney ? 'Saving...' : 'Save Contribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deletingContribution)}
        title="Delete Contribution Record"
        message={
          deletingContribution
            ? `Are you sure you want to remove this ${formatINR(
                deletingContribution.amount
              )} contribution from ${formatDateDisplay(
                deletingContribution.contribution_date
              )}?`
            : ''
        }
        confirmLabel="Delete"
        onCancel={() => setDeletingContribution(null)}
        onConfirm={async () => {
          if (!deletingContribution) return;
          const id = deletingContribution.contribution_id;
          setDeletingContribution(null);
          await onDeleteContribution(id);
        }}
      />
    </div>
  );
};
