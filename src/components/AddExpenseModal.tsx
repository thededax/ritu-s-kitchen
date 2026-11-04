import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X, Check } from 'lucide-react';
import {
  CategoryRecord,
  DEFAULT_CATEGORIES_TREE,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_UNITS,
  ExpenseRecord,
} from '../types';
import { ExpenseDraftItem } from '../services/api';
import { formatINR, getTodayIST, round2 } from '../utils/calculations';

interface AddExpenseModalProps {
  isOpen: boolean;
  editingExpense: ExpenseRecord | null;
  categories: CategoryRecord[];
  onClose: () => void;
  onSaveExpenses: (
    items: ExpenseDraftItem[],
    keepOpen: boolean
  ) => Promise<void>;
  onUpdateExpense: (
    expenseId: string,
    payload: ExpenseDraftItem
  ) => Promise<void>;
  onAddCustomCategory: (
    categoryName: string,
    subcategoryName: string
  ) => Promise<void>;
}

function createBlankItem(
  defaultCategory: string,
  defaultSubcategory: string,
  defaultDate: string
): ExpenseDraftItem {
  return {
    product_name: '',
    quantity: 1,
    unit: 'kg',
    category: defaultCategory,
    subcategory: defaultSubcategory,
    amount: 0,
    payment_method: 'Cash',
    expense_date: defaultDate,
  };
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  editingExpense,
  categories,
  onClose,
  onSaveExpenses,
  onUpdateExpense,
  onAddCustomCategory,
}) => {
  const categoryMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const group of DEFAULT_CATEGORIES_TREE) {
      map.set(group.category_name, [...group.subcategories]);
    }
    for (const c of categories) {
      if (!c.is_active) continue;
      const list = map.get(c.category_name) || [];
      if (!list.includes(c.subcategory_name)) {
        list.push(c.subcategory_name);
      }
      map.set(c.category_name, list);
    }
    return map;
  }, [categories]);

  const categoryNames = useMemo(
    () => Array.from(categoryMap.keys()),
    [categoryMap]
  );

  const defaultCat = categoryNames[0] || 'Vegetables and Fruits';
  const defaultSub =
    (categoryMap.get(defaultCat) || [])[0] || 'Vegetables';

  const [expenseDate, setExpenseDate] = useState<string>(getTodayIST());
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI'>('Cash');
  const [items, setItems] = useState<ExpenseDraftItem[]>([
    createBlankItem(defaultCat, defaultSub, getTodayIST()),
  ]);

  const [showCustomCatForm, setShowCustomCatForm] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customSubcategoryName, setCustomSubcategoryName] = useState('');
  const [savingCustomCat, setSavingCustomCat] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setShowCustomCatForm(false);
    const today = getTodayIST();
    if (editingExpense) {
      setExpenseDate(editingExpense.expense_date || today);
      setPaymentMethod(
        editingExpense.payment_method === 'UPI' ? 'UPI' : 'Cash'
      );
      setItems([
        {
          product_name: editingExpense.product_name,
          quantity: Number(editingExpense.quantity) || 1,
          unit: editingExpense.unit || 'kg',
          category: editingExpense.category || defaultCat,
          subcategory: editingExpense.subcategory || defaultSub,
          amount: Number(editingExpense.amount) || 0,
          payment_method:
            editingExpense.payment_method === 'UPI' ? 'UPI' : 'Cash',
          expense_date: editingExpense.expense_date || today,
        },
      ]);
    } else {
      setExpenseDate(today);
      setPaymentMethod('Cash');
      setItems([createBlankItem(defaultCat, defaultSub, today)]);
    }
  }, [isOpen, editingExpense, defaultCat, defaultSub]);

  if (!isOpen) return null;

  const updateItem = (index: number, patch: Partial<ExpenseDraftItem>) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        if (patch.category && patch.category !== item.category) {
          const subs = categoryMap.get(patch.category) || ['Miscellaneous'];
          next.subcategory = subs[0] || 'Miscellaneous';
        }
        return next;
      })
    );
  };

  const handleAddAnotherRow = () => {
    setItems((prev) => [
      ...prev,
      createBlankItem(defaultCat, defaultSub, expenseDate),
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateCustomCategory = async () => {
    const cat = customCategoryName.trim();
    const sub = customSubcategoryName.trim();
    if (!cat || !sub) {
      setError('Enter both Category and Subcategory names.');
      return;
    }
    setSavingCustomCat(true);
    setError(null);
    try {
      await onAddCustomCategory(cat, sub);
      // Apply to the first/last item for convenience
      updateItem(items.length - 1, { category: cat, subcategory: sub });
      setCustomCategoryName('');
      setCustomSubcategoryName('');
      setShowCustomCatForm(false);
    } catch (err: any) {
      setError(err?.message || 'Could not add custom category.');
    } finally {
      setSavingCustomCat(false);
    }
  };

  const handleSubmit = async (keepOpen: boolean) => {
    setError(null);
    const prepared: ExpenseDraftItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const name = item.product_name.trim();
      const qty = Number(item.quantity);
      const amt = round2(Number(item.amount));

      if (!name) {
        setError(
          items.length > 1
            ? `Item #${i + 1}: Please enter a Product Name.`
            : 'Please enter a Product Name (e.g., Potato, Milk, Rice).'
        );
        return;
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        setError(
          items.length > 1
            ? `Item #${i + 1}: Quantity must be greater than 0.`
            : 'Quantity must be greater than 0.'
        );
        return;
      }
      if (!Number.isFinite(amt) || amt <= 0) {
        setError(
          items.length > 1
            ? `Item #${i + 1}: Please enter an Amount in ₹ greater than 0.`
            : 'Please enter an Amount in ₹ greater than 0.'
        );
        return;
      }

      prepared.push({
        product_name: name,
        quantity: qty,
        unit: item.unit || 'kg',
        category: item.category || defaultCat,
        subcategory: item.subcategory || defaultSub,
        amount: amt,
        payment_method: paymentMethod,
        expense_date: expenseDate || getTodayIST(),
      });
    }

    setSubmitting(true);
    try {
      if (editingExpense) {
        await onUpdateExpense(editingExpense.expense_id, prepared[0]);
      } else {
        await onSaveExpenses(prepared, keepOpen);
        if (keepOpen) {
          setItems([createBlankItem(defaultCat, defaultSub, expenseDate)]);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalFormAmount = items.reduce(
    (sum, item) => round2(sum + (Number(item.amount) || 0)),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <div className="w-full max-w-xl rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <h2
              id="expense-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              {editingExpense ? 'Edit Expense' : "+ Add Today's Expense"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record daily kitchen purchases in seconds
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Item Rows */}
          <div className="space-y-4">
            {items.map((item, idx) => {
              const subcategories = categoryMap.get(item.category) || [
                'Miscellaneous',
              ];
              return (
                <div
                  key={idx}
                  className={`space-y-3.5 ${
                    items.length > 1
                      ? 'rounded-lg border border-slate-200 bg-slate-50/70 p-3.5'
                      : ''
                  }`}
                >
                  {items.length > 1 && (
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                        Item #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  )}

                  {/* 1. Product Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.product_name}
                      onChange={(e) =>
                        updateItem(idx, { product_name: e.target.value })
                      }
                      placeholder="e.g., Potato, Onion, Rice, Milk, Cooking Oil"
                      autoFocus={idx === 0}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
                    />
                  </div>

                  {/* 2. Quantity, 3. Unit, 6. Amount */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={(e) =>
                          updateItem(idx, {
                            quantity:
                              e.target.value === ''
                                ? 0
                                : Number(e.target.value),
                          })
                        }
                        placeholder="e.g., 2"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono tabular-nums text-slate-900 focus:border-emerald-700 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Unit <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={item.unit}
                        onChange={(e) =>
                          updateItem(idx, { unit: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                      >
                        {DEFAULT_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Amount (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        value={item.amount === 0 ? '' : item.amount}
                        onChange={(e) =>
                          updateItem(idx, {
                            amount:
                              e.target.value === ''
                                ? 0
                                : Number(e.target.value),
                          })
                        }
                        placeholder="₹250"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono tabular-nums font-semibold text-slate-900 focus:border-emerald-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 4. Category & 5. Subcategory */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={item.category}
                        onChange={(e) =>
                          updateItem(idx, { category: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                      >
                        {categoryNames.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subcategory <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={item.subcategory}
                        onChange={(e) =>
                          updateItem(idx, { subcategory: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
                      >
                        {subcategories.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Small Inline Control for Custom Category / Subcategory + Optional Add Another Item */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowCustomCatForm((v) => !v)}
              className="text-xs font-medium text-emerald-800 hover:text-emerald-950 underline underline-offset-2"
            >
              {showCustomCatForm
                ? 'Hide custom category form'
                : '+ Add custom category / subcategory'}
            </button>

            {!editingExpense && (
              <button
                type="button"
                onClick={handleAddAnotherRow}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Another Item
              </button>
            )}
          </div>

          {showCustomCatForm && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5 space-y-2.5">
              <div className="text-xs font-semibold text-emerald-950">
                Add Custom Category or Subcategory
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  list="existing-category-names"
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  placeholder="Category (e.g., Vegetables and Fruits)"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
                <datalist id="existing-category-names">
                  {categoryNames.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <input
                  type="text"
                  value={customSubcategoryName}
                  onChange={(e) => setCustomSubcategoryName(e.target.value)}
                  placeholder="Subcategory (e.g., Leafy Greens)"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomCatForm(false)}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200/60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingCustomCat}
                  onClick={handleCreateCustomCategory}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  {savingCustomCat ? 'Adding...' : 'Add Category'}
                </button>
              </div>
            </div>
          )}

          {/* 7. Payment Method & 8. Optional Expense Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {DEFAULT_PAYMENT_METHODS.map((method) => {
                  const active = paymentMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                        active
                          ? 'border-emerald-800 bg-emerald-800 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expense Date{' '}
                <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          {items.length > 1 && (
            <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3.5 py-2 text-sm">
              <span className="font-medium text-slate-700">
                Total for {items.length} items:
              </span>
              <span className="font-mono tabular-nums font-bold text-slate-900">
                {formatINR(totalFormAmount)}
              </span>
            </div>
          )}
        </div>

        {/* Form Actions: Keep only two main actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-4">
          {!editingExpense && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmit(true)}
              className="rounded-lg border border-emerald-800 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save & Add Another'}
            </button>
          )}
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit(false)}
            className="rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 transition-colors disabled:opacity-50"
          >
            {submitting
              ? 'Saving...'
              : editingExpense
              ? 'Save Changes'
              : 'Save Expense'}
          </button>
        </div>
      </div>
    </div>
  );
};
