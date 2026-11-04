import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatINR,
  formatDateDisplay,
  computeKitchenMetrics,
  computeMemberStats,
} from './calculations';
import {
  ContributionRecord,
  ExpenseRecord,
  MemberRecord,
} from '../types';

test('formatINR formats Indian Rupee amounts accurately', () => {
  assert.ok(formatINR(8000).includes('8,000.00'));
  assert.ok(formatINR(7500).includes('7,500.00'));
});

test('formatDateDisplay converts YYYY-MM-DD to DD/MM/YYYY', () => {
  assert.equal(formatDateDisplay('2026-11-04'), '04/11/2026');
});

test('computeKitchenMetrics calculates Total Expenses, Last 7 Days, This Month, and Available Kitchen Balance accurately', () => {
  const contributions: ContributionRecord[] = [
    {
      contribution_id: 'CON-1',
      member_id: 'MEM-1',
      contribution_date: '2026-11-01',
      amount: 2000,
      payment_method: 'UPI',
      note: 'Monthly share',
      created_at: '2026-11-01T08:00:00Z',
    },
    {
      contribution_id: 'CON-2',
      member_id: 'MEM-2',
      contribution_date: '2026-11-01',
      amount: 2000,
      payment_method: 'UPI',
      note: 'Monthly share',
      created_at: '2026-11-01T08:00:00Z',
    },
    {
      contribution_id: 'CON-3',
      member_id: 'MEM-3',
      contribution_date: '2026-11-02',
      amount: 1500,
      payment_method: 'Cash',
      note: '',
      created_at: '2026-11-02T08:00:00Z',
    },
    {
      contribution_id: 'CON-4',
      member_id: 'MEM-4',
      contribution_date: '2026-11-02',
      amount: 2500,
      payment_method: 'UPI',
      note: '',
      created_at: '2026-11-02T08:00:00Z',
    },
  ];

  const expenses: ExpenseRecord[] = [
    {
      expense_id: 'EXP-1',
      expense_date: '2026-11-04',
      product_name: 'Potato & Onion',
      quantity: 5,
      unit: 'kg',
      category: 'Vegetables and Fruits',
      subcategory: 'Vegetables',
      amount: 500,
      payment_method: 'Cash',
      created_at: '2026-11-04T08:00:00Z',
      updated_at: '2026-11-04T08:00:00Z',
      is_deleted: false,
    },
    {
      expense_id: 'EXP-2',
      expense_date: '2026-10-15',
      product_name: 'Old October Rice Bag',
      quantity: 10,
      unit: 'kg',
      category: 'Grocery and Ingredients',
      subcategory: 'Rice',
      amount: 1000,
      payment_method: 'UPI',
      created_at: '2026-10-15T08:00:00Z',
      updated_at: '2026-10-15T08:00:00Z',
      is_deleted: false,
    },
    {
      expense_id: 'EXP-DELETED',
      expense_date: '2026-11-04',
      product_name: 'Deleted Entry',
      quantity: 1,
      unit: 'piece',
      category: 'Other',
      subcategory: 'Miscellaneous',
      amount: 9999,
      payment_method: 'Cash',
      created_at: '2026-11-04T08:00:00Z',
      updated_at: '2026-11-04T08:00:00Z',
      is_deleted: true,
    },
  ];

  const metrics = computeKitchenMetrics(expenses, contributions, '2026-11-04');
  assert.equal(metrics.totalContributions, 8000);
  assert.equal(metrics.totalExpenses, 1500);
  assert.equal(metrics.last7DaysExpenses, 500);
  assert.equal(metrics.thisMonthExpenses, 500);
  assert.equal(metrics.availableBalance, 6500);
  assert.equal(metrics.isNegativeBalance, false);
});

test('computeKitchenMetrics flags negative available balance when expenses exceed contributions', () => {
  const contributions: ContributionRecord[] = [
    {
      contribution_id: 'CON-1',
      member_id: 'MEM-1',
      contribution_date: '2026-11-01',
      amount: 500,
      payment_method: 'Cash',
      note: '',
      created_at: '2026-11-01T08:00:00Z',
    },
  ];
  const expenses: ExpenseRecord[] = [
    {
      expense_id: 'EXP-1',
      expense_date: '2026-11-04',
      product_name: 'LPG Gas Cylinder',
      quantity: 1,
      unit: 'piece',
      category: 'Kitchen Essentials',
      subcategory: 'LPG / Gas',
      amount: 1100,
      payment_method: 'UPI',
      created_at: '2026-11-04T08:00:00Z',
      updated_at: '2026-11-04T08:00:00Z',
      is_deleted: false,
    },
  ];

  const metrics = computeKitchenMetrics(expenses, contributions, '2026-11-04');
  assert.equal(metrics.availableBalance, -600);
  assert.equal(metrics.isNegativeBalance, true);
});

test('computeMemberStats calculates individual total and monthly contributions without deducting shared expenses', () => {
  const members: MemberRecord[] = [
    { member_id: 'MEM-1', member_name: 'Member 1', is_active: true, created_at: '', updated_at: '' },
    { member_id: 'MEM-2', member_name: 'Member 2', is_active: true, created_at: '', updated_at: '' },
    { member_id: 'MEM-3', member_name: 'Member 3', is_active: true, created_at: '', updated_at: '' },
    { member_id: 'MEM-4', member_name: 'Member 4', is_active: true, created_at: '', updated_at: '' },
  ];

  const contributions: ContributionRecord[] = [
    {
      contribution_id: 'C1',
      member_id: 'MEM-1',
      contribution_date: '2026-10-10',
      amount: 1500,
      payment_method: 'Cash',
      note: 'Oct share',
      created_at: '2026-10-10T10:00:00Z',
    },
    {
      contribution_id: 'C2',
      member_id: 'MEM-1',
      contribution_date: '2026-11-02',
      amount: 2000,
      payment_method: 'UPI',
      note: 'Nov share',
      created_at: '2026-11-02T10:00:00Z',
    },
  ];

  const stats = computeMemberStats(members, contributions, '2026-11');
  assert.equal(stats.length, 4);
  assert.equal(stats[0].totalContribution, 3500);
  assert.equal(stats[0].monthContribution, 2000);
  assert.equal(stats[0].previousMonthsContribution, 1500);
  assert.equal(stats[0].contributionCount, 2);
});
