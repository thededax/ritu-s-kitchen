import {
  CategoryRecord,
  ContributionRecord,
  DatabaseState,
  ExpenseRecord,
  MemberRecord,
} from '../types';
import { getGoogleAccessToken } from './auth';

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  userEmail?: string | null
): Promise<T> {
  const token = getGoogleAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (userEmail) {
    headers['x-user-email'] = userEmail;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export interface ExpenseDraftItem {
  product_name: string;
  quantity: number;
  unit: string;
  category: string;
  subcategory: string;
  amount: number;
  payment_method: 'Cash' | 'UPI';
  expense_date: string;
}

export const api = {
  bootstrap: (userEmail?: string | null) =>
    apiRequest<DatabaseState>('/api/bootstrap', { method: 'GET' }, userEmail),

  syncSheets: (userEmail?: string | null) =>
    apiRequest<DatabaseState>('/api/sync', { method: 'POST' }, userEmail),

  createExpenses: (items: ExpenseDraftItem[], userEmail?: string | null) =>
    apiRequest<{ created: ExpenseRecord[]; state: DatabaseState }>(
      '/api/expenses',
      {
        method: 'POST',
        body: JSON.stringify({ items }),
      },
      userEmail
    ),

  updateExpense: (
    id: string,
    payload: Partial<ExpenseDraftItem>,
    userEmail?: string | null
  ) =>
    apiRequest<{ expense: ExpenseRecord; state: DatabaseState }>(
      `/api/expenses/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      userEmail
    ),

  deleteExpense: (id: string, userEmail?: string | null) =>
    apiRequest<{ state: DatabaseState }>(
      `/api/expenses/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      userEmail
    ),

  addContribution: (
    payload: {
      member_id: string;
      amount: number;
      contribution_date: string;
      payment_method: 'Cash' | 'UPI';
      note?: string;
    },
    userEmail?: string | null
  ) =>
    apiRequest<{ contribution: ContributionRecord; state: DatabaseState }>(
      '/api/contributions',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      userEmail
    ),

  deleteContribution: (id: string, userEmail?: string | null) =>
    apiRequest<{ state: DatabaseState }>(
      `/api/contributions/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      userEmail
    ),

  renameMember: (
    memberId: string,
    memberName: string,
    userEmail?: string | null
  ) =>
    apiRequest<{ member: MemberRecord; state: DatabaseState }>(
      `/api/members/${encodeURIComponent(memberId)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ member_name: memberName }),
      },
      userEmail
    ),

  addCategory: (
    categoryName: string,
    subcategoryName: string,
    userEmail?: string | null
  ) =>
    apiRequest<{ category: CategoryRecord; state: DatabaseState }>(
      '/api/categories',
      {
        method: 'POST',
        body: JSON.stringify({
          category_name: categoryName,
          subcategory_name: subcategoryName,
        }),
      },
      userEmail
    ),
};
