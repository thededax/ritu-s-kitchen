import { useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  ExternalLink,
  LayoutDashboard,
  Plus,
  Receipt,
  RefreshCw,
  Users,
} from 'lucide-react';
import {
  CHEF_RITU_RAJ_PHOTO,
  DatabaseState,
  ExpenseRecord,
  NavSection,
} from './types';
import { api, ExpenseDraftItem } from './services/api';
import { onAuthChange } from './services/auth';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { DashboardView } from './components/DashboardView';
import { AllExpensesView } from './components/AllExpensesView';
import { MembersView } from './components/MembersView';
import { ReportsView } from './components/ReportsView';
import { AddExpenseModal } from './components/AddExpenseModal';

export default function App() {
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [db, setDb] = useState<DatabaseState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Add / Edit Expense Modal
  const [expenseModalOpen, setExpenseModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(
    null
  );

  // Small success toast notification
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const loadBootstrap = async (email?: string | null) => {
    try {
      const data = await api.bootstrap(email ?? userEmail);
      setDb(data);
    } catch (err) {
      console.error('Bootstrap error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthChange((user) => {
      const email = user?.email || null;
      setUserEmail(email);
      loadBootstrap(email);
    });
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const updated = await api.syncSheets(userEmail);
      setDb(updated);
      showToast('Synced with Google Sheets');
    } catch (err: any) {
      showToast(err?.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (expense: ExpenseRecord) => {
    setEditingExpense(expense);
    setExpenseModalOpen(true);
  };

  const handleSaveExpenses = async (
    items: ExpenseDraftItem[],
    keepOpen: boolean
  ) => {
    const res = await api.createExpenses(items, userEmail);
    setDb(res.state);
    showToast(
      items.length > 1
        ? `Saved ${items.length} expenses`
        : 'Expense saved successfully'
    );
    if (!keepOpen) {
      setExpenseModalOpen(false);
    }
  };

  const handleUpdateExpense = async (
    expenseId: string,
    payload: ExpenseDraftItem
  ) => {
    const res = await api.updateExpense(expenseId, payload, userEmail);
    setDb(res.state);
    setEditingExpense(null);
    setExpenseModalOpen(false);
    showToast('Expense updated');
  };

  const handleDeleteExpense = async (expenseId: string) => {
    const res = await api.deleteExpense(expenseId, userEmail);
    setDb(res.state);
    showToast('Expense deleted');
  };

  const handleAddContribution = async (payload: {
    member_id: string;
    amount: number;
    contribution_date: string;
    payment_method: 'Cash' | 'UPI';
    note?: string;
  }) => {
    const res = await api.addContribution(payload, userEmail);
    setDb(res.state);
    showToast('Member contribution added');
  };

  const handleDeleteContribution = async (contributionId: string) => {
    const res = await api.deleteContribution(contributionId, userEmail);
    setDb(res.state);
    showToast('Contribution removed');
  };

  const handleRenameMember = async (memberId: string, memberName: string) => {
    const res = await api.renameMember(memberId, memberName, userEmail);
    setDb(res.state);
    showToast(`Renamed to ${memberName}`);
  };

  const handleAddCustomCategory = async (
    categoryName: string,
    subcategoryName: string
  ) => {
    const res = await api.addCategory(categoryName, subcategoryName, userEmail);
    setDb(res.state);
    showToast(`Added ${categoryName} → ${subcategoryName}`);
  };

  const navItems: Array<{
    id: NavSection;
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-10">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-2 sm:gap-3">
            {/* Brand Title with Chef Ritu Raj Logo Photo */}
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={CHEF_RITU_RAJ_PHOTO}
                alt="Chef Ritu Raj — Ritu's Cloud Kitchen Logo"
                className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full object-cover object-top ring-2 ring-emerald-800 bg-white shadow-2xs"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap leading-tight">
                  Ritu&apos;s Cloud Kitchen
                </span>
                <span className="text-[11px] font-medium text-emerald-800 whitespace-nowrap leading-tight">
                  Chef Ritu Raj
                </span>
              </div>
            </div>

            {/* Strictly 4 Desktop Navigation Links */}
            <nav
              className="hidden md:flex items-center gap-1 shrink-0"
              aria-label="Main Navigation"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveNav(item.id)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-emerald-800 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Actions: Quick Add + Google Sheets Connection */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenAddExpense}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-emerald-800 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-900 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span>Add Expense</span>
              </button>

              {db?.connection.spreadsheetUrl && (
                <a
                  href={db.connection.spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden xl:inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                  title="Open Google Sheet"
                >
                  <span>Sheet</span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                </a>
              )}

              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncing}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                title="Sync with Google Sheets"
                aria-label="Sync with Google Sheets"
              >
                <RefreshCw
                  className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
                />
              </button>

              {userEmail ? (
                <button
                  type="button"
                  onClick={async () => {
                    const { logout } = await import('./services/auth');
                    await logout();
                    setUserEmail(null);
                    showToast('Signed out');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  title={`Signed in as ${userEmail} (Click to sign out)`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  <span className="max-w-[100px] truncate">{userEmail}</span>
                </button>
              ) : (
                <GoogleSignInButton
                  label="Sheets"
                  onClick={async () => {
                    try {
                      const { googleSignIn } = await import('./services/auth');
                      const res = await googleSignIn();
                      if (res?.user) {
                        setUserEmail(res.user.email);
                        await loadBootstrap(res.user.email);
                        showToast('Connected to Google Sheets');
                      }
                    } catch (err: any) {
                      showToast(err?.message || 'Google Sign-In cancelled');
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {loading || !db ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            Loading Ritu&apos;s Cloud Kitchen records...
          </div>
        ) : (
          <>
            {activeNav === 'dashboard' && (
              <DashboardView
                expenses={db.expenses}
                contributions={db.contributions}
                members={db.members}
                onOpenAddExpense={handleOpenAddExpense}
                onNavigate={setActiveNav}
              />
            )}

            {activeNav === 'expenses' && (
              <AllExpensesView
                expenses={db.expenses}
                categories={db.categories}
                onOpenAddExpense={handleOpenAddExpense}
                onEditExpense={handleOpenEditExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {activeNav === 'members' && (
              <MembersView
                members={db.members}
                contributions={db.contributions}
                onAddContribution={handleAddContribution}
                onDeleteContribution={handleDeleteContribution}
                onRenameMember={handleRenameMember}
              />
            )}

            {activeNav === 'reports' && (
              <ReportsView
                expenses={db.expenses}
                contributions={db.contributions}
                members={db.members}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation (Strictly 4 Sections) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white grid grid-cols-4"
        aria-label="Mobile Navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveNav(item.id)}
              className={`flex flex-col items-center justify-center py-2.5 text-xs font-semibold transition-colors ${
                active ? 'text-emerald-800' : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Add / Edit Today's Expense Modal */}
      {db && (
        <AddExpenseModal
          isOpen={expenseModalOpen}
          editingExpense={editingExpense}
          categories={db.categories}
          onClose={() => {
            setExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          onSaveExpenses={handleSaveExpenses}
          onUpdateExpense={handleUpdateExpense}
          onAddCustomCategory={handleAddCustomCategory}
        />
      )}
    </div>
  );
}
