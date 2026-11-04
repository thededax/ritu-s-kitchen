import {
  ContributionRecord,
  ExpenseRecord,
  MemberRecord,
} from '../types';

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatINR(amount: number | undefined | null): string {
  const safe = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return inrFormatter.format(round2(safe));
}

export function getTodayIST(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!match) return dateStr;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function shiftDateDays(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

export interface KitchenDashboardMetrics {
  totalExpenses: number;
  last7DaysExpenses: number;
  thisMonthExpenses: number;
  totalContributions: number;
  availableBalance: number;
  isNegativeBalance: boolean;
}

/**
 * Section 10 Calculations:
 * 1. Total Expenses = Sum of all active expense records.
 * 2. Last 7 Days = Sum of expenses within the last 7 calendar days, including today, using Asia/Kolkata timezone.
 * 3. This Month = Sum of expenses in the current calendar month.
 * 4. Total Contributions = Sum of all active member contribution records.
 * 5. Available Kitchen Balance = Total Contributions - Total Expenses.
 */
export function computeKitchenMetrics(
  expenses: ExpenseRecord[],
  contributions: ContributionRecord[],
  todayStr: string = getTodayIST()
): KitchenDashboardMetrics {
  const activeExpenses = expenses.filter((e) => !e.is_deleted);
  const sevenDaysAgoStr = shiftDateDays(todayStr, -6); // 7 calendar days inclusive of today
  const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM

  let totalExpenses = 0;
  let last7DaysExpenses = 0;
  let thisMonthExpenses = 0;

  for (const exp of activeExpenses) {
    const amt = round2(Number(exp.amount) || 0);
    totalExpenses = round2(totalExpenses + amt);

    if (exp.expense_date >= sevenDaysAgoStr && exp.expense_date <= todayStr) {
      last7DaysExpenses = round2(last7DaysExpenses + amt);
    }

    if (exp.expense_date.startsWith(currentMonthPrefix)) {
      thisMonthExpenses = round2(thisMonthExpenses + amt);
    }
  }

  let totalContributions = 0;
  for (const c of contributions) {
    totalContributions = round2(totalContributions + (Number(c.amount) || 0));
  }

  const availableBalance = round2(totalContributions - totalExpenses);

  return {
    totalExpenses,
    last7DaysExpenses,
    thisMonthExpenses,
    totalContributions,
    availableBalance,
    isNegativeBalance: availableBalance < 0,
  };
}

export interface MemberContributionStats {
  member_id: string;
  member_name: string;
  role?: string;
  avatar_url?: string;
  totalContribution: number;
  monthContribution: number;
  previousMonthsContribution: number;
  contributionCount: number;
  transactions: ContributionRecord[];
}

/**
 * Section 10 Calculations:
 * 6. Individual Member Contribution = Sum of that member's contribution records.
 * 7. Monthly Member Contribution = Sum of that member's contributions during the selected month.
 */
export function computeMemberStats(
  members: MemberRecord[],
  contributions: ContributionRecord[],
  selectedMonthPrefix: string = getTodayIST().slice(0, 7)
): MemberContributionStats[] {
  return members.slice(0, 4).map((m) => {
    const memberContribs = contributions
      .filter((c) => c.member_id === m.member_id)
      .sort((a, b) => {
        const cmp = b.contribution_date.localeCompare(a.contribution_date);
        return cmp !== 0 ? cmp : b.created_at.localeCompare(a.created_at);
      });

    let totalContribution = 0;
    let monthContribution = 0;

    for (const c of memberContribs) {
      const amt = round2(Number(c.amount) || 0);
      totalContribution = round2(totalContribution + amt);
      if (c.contribution_date.startsWith(selectedMonthPrefix)) {
        monthContribution = round2(monthContribution + amt);
      }
    }

    const previousMonthsContribution = round2(
      totalContribution - monthContribution
    );

    return {
      member_id: m.member_id,
      member_name: m.member_name,
      role: m.role ?? (m.member_id === 'MEM-1' ? 'Chef' : undefined),
      avatar_url:
        m.avatar_url ??
        (m.member_id === 'MEM-1'
          ? '/assets/aistudio/image_99379257.png'
          : undefined),
      totalContribution,
      monthContribution,
      previousMonthsContribution,
      contributionCount: memberContribs.length,
      transactions: memberContribs,
    };
  });
}
