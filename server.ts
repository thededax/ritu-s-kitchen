import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  CategoryRecord,
  ContributionRecord,
  DatabaseState,
  DEFAULT_CATEGORIES_TREE,
  ExpenseRecord,
  INITIAL_MEMBERS,
  MemberRecord,
  SHEET_HEADERS,
} from './src/types';
import { getTodayIST, round2, shiftDateDays } from './src/utils/calculations';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'ritus-cloud-kitchen-db.json');
const SPREADSHEET_NAME = "Ritu's Cloud Kitchen - Expense Database";

function buildDefaultCategories(): CategoryRecord[] {
  const list: CategoryRecord[] = [];
  let idx = 1;
  for (const group of DEFAULT_CATEGORIES_TREE) {
    for (const sub of group.subcategories) {
      list.push({
        category_id: `CAT-${String(idx++).padStart(3, '0')}`,
        category_name: group.category_name,
        subcategory_name: sub,
        is_active: true,
      });
    }
  }
  return list;
}

function buildInitialMembers(): MemberRecord[] {
  const nowIso = new Date().toISOString();
  return INITIAL_MEMBERS.map((m) => ({
    member_id: m.member_id,
    member_name: m.member_name,
    role: m.role,
    avatar_url: m.avatar_url,
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  }));
}

function createInitialSeedData(): DatabaseState {
  const today = getTodayIST();
  const yesterday = shiftDateDays(today, -1);
  const twoDaysAgo = shiftDateDays(today, -2);
  const fourDaysAgo = shiftDateDays(today, -4);
  const sixDaysAgo = shiftDateDays(today, -6);
  const monthStart = `${today.slice(0, 7)}-01`;
  const nowIso = new Date().toISOString();

  const members = buildInitialMembers();
  const categories = buildDefaultCategories();

  const contributions: ContributionRecord[] = [
    {
      contribution_id: 'CNT-1001',
      member_id: 'MEM-1',
      contribution_date: monthStart,
      amount: 2000,
      payment_method: 'UPI',
      note: 'Monthly kitchen pool contribution',
      created_at: nowIso,
    },
    {
      contribution_id: 'CNT-1002',
      member_id: 'MEM-2',
      contribution_date: monthStart,
      amount: 2000,
      payment_method: 'UPI',
      note: 'Monthly kitchen pool contribution',
      created_at: nowIso,
    },
    {
      contribution_id: 'CNT-1003',
      member_id: 'MEM-3',
      contribution_date: twoDaysAgo,
      amount: 1500,
      payment_method: 'Cash',
      note: 'Added cash for vegetables & milk',
      created_at: nowIso,
    },
    {
      contribution_id: 'CNT-1004',
      member_id: 'MEM-4',
      contribution_date: fourDaysAgo,
      amount: 2000,
      payment_method: 'UPI',
      note: 'Monthly kitchen share',
      created_at: nowIso,
    },
  ];

  const expenses: ExpenseRecord[] = [
    {
      expense_id: 'EXP-1001',
      expense_date: today,
      product_name: 'Potato & Onion',
      quantity: 5,
      unit: 'kg',
      category: 'Vegetables and Fruits',
      subcategory: 'Vegetables',
      amount: 220,
      payment_method: 'Cash',
      created_at: nowIso,
      updated_at: nowIso,
      is_deleted: false,
    },
    {
      expense_id: 'EXP-1002',
      expense_date: today,
      product_name: 'Full Cream Milk',
      quantity: 3,
      unit: 'litre',
      category: 'Dairy and Other Food',
      subcategory: 'Milk',
      amount: 198,
      payment_method: 'UPI',
      created_at: nowIso,
      updated_at: nowIso,
      is_deleted: false,
    },
    {
      expense_id: 'EXP-1003',
      expense_date: yesterday,
      product_name: 'Mustard Cooking Oil',
      quantity: 2,
      unit: 'litre',
      category: 'Grocery and Ingredients',
      subcategory: 'Cooking Oil',
      amount: 340,
      payment_method: 'UPI',
      created_at: nowIso,
      updated_at: nowIso,
      is_deleted: false,
    },
    {
      expense_id: 'EXP-1004',
      expense_date: twoDaysAgo,
      product_name: 'Basmati Rice',
      quantity: 10,
      unit: 'kg',
      category: 'Grocery and Ingredients',
      subcategory: 'Rice',
      amount: 950,
      payment_method: 'UPI',
      created_at: nowIso,
      updated_at: nowIso,
      is_deleted: false,
    },
    {
      expense_id: 'EXP-1005',
      expense_date: fourDaysAgo,
      product_name: 'Fresh Paneer & Curd',
      quantity: 1,
      unit: 'kg',
      category: 'Dairy and Other Food',
      subcategory: 'Paneer',
      amount: 380,
      payment_method: 'Cash',
      created_at: nowIso,
      updated_at: nowIso,
      is_deleted: false,
    },
    {
      expense_id: 'EXP-1006',
      expense_date: sixDaysAgo,
      product_name: 'LPG Cylinder Refill',
      quantity: 1,
      unit: 'piece',
      category: 'Kitchen Essentials',
      subcategory: 'LPG / Gas',
      amount: 910,
      payment_method: 'UPI',
      created_at: nowIso,
      updated_at: nowIso,
      is_deleted: false,
    },
  ];

  return {
    expenses,
    contributions,
    members,
    categories,
    connection: {
      connected: true,
      mode: 'workspace_ledger',
      spreadsheetId: null,
      spreadsheetName: SPREADSHEET_NAME,
      spreadsheetUrl: null,
      lastSyncTime: nowIso,
      currentUserEmail: null,
    },
  };
}

function normalizeLegacyExpense(raw: Record<string, unknown>, idx: number): ExpenseRecord {
  const nowIso = new Date().toISOString();
  const productName = String(
    raw.product_name || raw.description || raw.subcategory || 'Kitchen Item'
  ).trim();
  const amount = round2(
    Number(raw.amount ?? raw.total_amount ?? raw.unit_price ?? 0)
  );
  const rawMethod = String(raw.payment_method || 'Cash').trim();
  const paymentMethod = rawMethod === 'UPI' ? 'UPI' : 'Cash';

  return {
    expense_id: String(raw.expense_id || `EXP-${1000 + idx}`),
    expense_date: String(raw.expense_date || getTodayIST()),
    product_name: productName,
    quantity: Number(raw.quantity) > 0 ? Number(raw.quantity) : 1,
    unit: String(raw.unit || 'kg'),
    category: String(raw.category || 'Other'),
    subcategory: String(raw.subcategory || 'Miscellaneous'),
    amount,
    payment_method: paymentMethod,
    created_at: String(raw.created_at || nowIso),
    updated_at: String(raw.updated_at || nowIso),
    is_deleted: raw.is_deleted === true || raw.is_deleted === 'TRUE',
  };
}

function loadLocalDb(): DatabaseState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const seed = createInitialSeedData();
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
      return seed;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const seed = createInitialSeedData();

    // Ensure exactly 4 members exist
    const existingMembers: MemberRecord[] = Array.isArray(parsed.members)
      ? parsed.members
      : [];
    const members: MemberRecord[] = INITIAL_MEMBERS.map((initM, idx) => {
      const found =
        existingMembers.find((m) => m.member_id === initM.member_id) ||
        existingMembers[idx];
      if (found) {
        const currentName = String(found.member_name || '').trim();
        const resolvedName =
          initM.member_id === 'MEM-1' &&
          (!currentName || currentName === 'Member 1')
            ? 'Ritu Raj'
            : currentName || initM.member_name;
        return {
          member_id: initM.member_id,
          member_name: resolvedName,
          role: found.role || initM.role,
          avatar_url: found.avatar_url || initM.avatar_url,
          is_active: true,
          created_at: found.created_at || new Date().toISOString(),
          updated_at: found.updated_at || new Date().toISOString(),
        };
      }
      return {
        member_id: initM.member_id,
        member_name: initM.member_name,
        role: initM.role,
        avatar_url: initM.avatar_url,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    // Migrate or preserve expenses
    const expenses: ExpenseRecord[] =
      Array.isArray(parsed.expenses) && parsed.expenses.length > 0
        ? parsed.expenses.map((e: Record<string, unknown>, i: number) =>
            normalizeLegacyExpense(e, i + 1)
          )
        : seed.expenses;

    // Contributions
    const contributions: ContributionRecord[] =
      Array.isArray(parsed.contributions) && parsed.contributions.length > 0
        ? parsed.contributions
        : seed.contributions;

    // Categories: ensure new simplified categories exist
    const hasSimplifiedCategories =
      Array.isArray(parsed.categories) &&
      parsed.categories.some(
        (c: CategoryRecord) => c.category_name === 'Vegetables and Fruits'
      );
    const categories: CategoryRecord[] = hasSimplifiedCategories
      ? parsed.categories
      : seed.categories;

    const state: DatabaseState = {
      expenses,
      contributions,
      members,
      categories,
      connection: {
        ...seed.connection,
        ...(parsed.connection || {}),
      },
    };
    saveLocalDb(state);
    return state;
  } catch (err) {
    console.error('Failed to read local DB, resetting to seed:', err);
    return createInitialSeedData();
  }
}

function saveLocalDb(db: DatabaseState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db.connection.lastSyncTime = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write local DB:', err);
  }
}

// ============================================================================
// Google Sheets Live Sync Helpers (using Bearer token from client OAuth)
// ============================================================================

async function fetchGoogleJson(
  url: string,
  token: string,
  init: RequestInit = {}
): Promise<any> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google API HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

function expenseToRow(e: ExpenseRecord): (string | number | boolean)[] {
  return [
    e.expense_id,
    e.expense_date,
    e.product_name,
    e.quantity,
    e.unit,
    e.category,
    e.subcategory,
    e.amount,
    e.payment_method,
    e.created_at,
    e.updated_at,
    e.is_deleted ? 'TRUE' : 'FALSE',
  ];
}

function rowToExpense(row: any[]): ExpenseRecord {
  // Handle both new 12-col format and legacy 28-col format gracefully
  if (row.length > 15) {
    return {
      expense_id: String(row[0] ?? ''),
      expense_date: String(row[1] ?? getTodayIST()),
      product_name: String(row[4] || row[3] || 'Kitchen Expense'),
      quantity: Number(row[7] ?? 1) || 1,
      unit: String(row[8] ?? 'kg'),
      category: String(row[2] ?? 'Other'),
      subcategory: String(row[3] ?? 'Miscellaneous'),
      amount: round2(Number(row[14] ?? row[9] ?? 0)),
      payment_method: String(row[15] ?? 'Cash') === 'UPI' ? 'UPI' : 'Cash',
      created_at: String(row[23] ?? new Date().toISOString()),
      updated_at: String(row[25] ?? new Date().toISOString()),
      is_deleted:
        String(row[26] ?? 'FALSE').toUpperCase() === 'TRUE' || row[26] === true,
    };
  }
  return {
    expense_id: String(row[0] ?? ''),
    expense_date: String(row[1] ?? getTodayIST()),
    product_name: String(row[2] ?? ''),
    quantity: Number(row[3] ?? 1) || 1,
    unit: String(row[4] ?? 'kg'),
    category: String(row[5] ?? 'Other'),
    subcategory: String(row[6] ?? 'Miscellaneous'),
    amount: round2(Number(row[7] ?? 0)),
    payment_method: String(row[8] ?? 'Cash') === 'UPI' ? 'UPI' : 'Cash',
    created_at: String(row[9] ?? new Date().toISOString()),
    updated_at: String(row[10] ?? new Date().toISOString()),
    is_deleted:
      String(row[11] ?? 'FALSE').toUpperCase() === 'TRUE' || row[11] === true,
  };
}

function contributionToRow(c: ContributionRecord): (string | number)[] {
  return [
    c.contribution_id,
    c.member_id,
    c.contribution_date,
    c.amount,
    c.payment_method,
    c.note || '',
    c.created_at,
  ];
}

function rowToContribution(row: any[]): ContributionRecord {
  return {
    contribution_id: String(row[0] ?? ''),
    member_id: String(row[1] ?? 'MEM-1'),
    contribution_date: String(row[2] ?? getTodayIST()),
    amount: round2(Number(row[3] ?? 0)),
    payment_method: String(row[4] ?? 'Cash') === 'UPI' ? 'UPI' : 'Cash',
    note: String(row[5] ?? ''),
    created_at: String(row[6] ?? new Date().toISOString()),
  };
}

function memberToRow(m: MemberRecord): (string | boolean)[] {
  return [
    m.member_id,
    m.member_name,
    m.is_active ? 'TRUE' : 'FALSE',
    m.created_at,
    m.updated_at,
  ];
}

function rowToMember(row: any[]): MemberRecord {
  const memberId = String(row[0] ?? '');
  const rawName = String(row[1] ?? '').trim();
  const isFirst = memberId === 'MEM-1';
  const initFirst = INITIAL_MEMBERS[0];
  return {
    member_id: memberId,
    member_name:
      isFirst && (!rawName || rawName === 'Member 1') ? 'Ritu Raj' : rawName,
    role: isFirst ? initFirst.role : undefined,
    avatar_url: isFirst ? initFirst.avatar_url : undefined,
    is_active: String(row[2] ?? 'TRUE').toUpperCase() !== 'FALSE',
    created_at: String(row[3] ?? new Date().toISOString()),
    updated_at: String(row[4] ?? new Date().toISOString()),
  };
}

function categoryToRow(c: CategoryRecord): (string | boolean)[] {
  return [
    c.category_id,
    c.category_name,
    c.subcategory_name,
    c.is_active ? 'TRUE' : 'FALSE',
  ];
}

function rowToCategory(row: any[]): CategoryRecord {
  return {
    category_id: String(row[0] ?? ''),
    category_name: String(row[1] ?? ''),
    subcategory_name: String(row[2] ?? ''),
    is_active: String(row[3] ?? 'TRUE').toUpperCase() !== 'FALSE',
  };
}

async function ensureGoogleSpreadsheet(
  token: string,
  db: DatabaseState
): Promise<string> {
  if (db.connection.spreadsheetId) {
    try {
      const check = await fetchGoogleJson(
        `https://sheets.googleapis.com/v4/spreadsheets/${db.connection.spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties.title`,
        token
      );
      if (check?.spreadsheetId) {
        await ensureRequiredTabsExist(
          token,
          check.spreadsheetId,
          check.sheets || [],
          db
        );
        return check.spreadsheetId;
      }
    } catch {
      // Fall through to search/create
    }
  }

  const q = encodeURIComponent(
    `name = "${SPREADSHEET_NAME}" and mimeType = "application/vnd.google-apps.spreadsheet" and trashed = false`
  );
  const searchData = await fetchGoogleJson(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)&pageSize=5`,
    token
  );

  if (searchData.files && searchData.files.length > 0) {
    const file = searchData.files[0];
    const spreadsheetId = file.id;
    db.connection.spreadsheetId = spreadsheetId;
    db.connection.spreadsheetUrl =
      file.webViewLink ||
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    db.connection.mode = 'google_sheets';

    const meta = await fetchGoogleJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      token
    );
    await ensureRequiredTabsExist(
      token,
      spreadsheetId,
      meta.sheets || [],
      db
    );
    return spreadsheetId;
  }

  // Create new spreadsheet with the 4 required worksheets
  const sheetNames = Object.keys(SHEET_HEADERS) as Array<
    keyof typeof SHEET_HEADERS
  >;
  const createPayload = {
    properties: { title: SPREADSHEET_NAME },
    sheets: sheetNames.map((title) => ({
      properties: {
        title,
        gridProperties: { frozenRowCount: 1 },
      },
    })),
  };

  const created = await fetchGoogleJson(
    'https://sheets.googleapis.com/v4/spreadsheets',
    token,
    {
      method: 'POST',
      body: JSON.stringify(createPayload),
    }
  );

  const newId = created.spreadsheetId;
  db.connection.spreadsheetId = newId;
  db.connection.spreadsheetUrl =
    created.spreadsheetUrl ||
    `https://docs.google.com/spreadsheets/d/${newId}/edit`;
  db.connection.mode = 'google_sheets';

  await pushAllToGoogleSheets(token, newId, db);
  return newId;
}

async function ensureRequiredTabsExist(
  token: string,
  spreadsheetId: string,
  existingSheets: any[],
  db: DatabaseState
): Promise<void> {
  const existingTitles = new Set(
    existingSheets.map((s: any) => s?.properties?.title).filter(Boolean)
  );
  const requiredTitles = Object.keys(SHEET_HEADERS) as Array<
    keyof typeof SHEET_HEADERS
  >;
  const missing = requiredTitles.filter((t) => !existingTitles.has(t));

  if (missing.length > 0) {
    await fetchGoogleJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          requests: missing.map((title) => ({
            addSheet: {
              properties: { title, gridProperties: { frozenRowCount: 1 } },
            },
          })),
        }),
      }
    );
    await pushAllToGoogleSheets(token, spreadsheetId, db);
  }
}

async function pushAllToGoogleSheets(
  token: string,
  spreadsheetId: string,
  db: DatabaseState
): Promise<void> {
  const data = [
    {
      range: 'Expenses!A1',
      values: [SHEET_HEADERS.Expenses, ...db.expenses.map(expenseToRow)],
    },
    {
      range: 'Contributions!A1',
      values: [
        SHEET_HEADERS.Contributions,
        ...db.contributions.map(contributionToRow),
      ],
    },
    {
      range: 'Members!A1',
      values: [SHEET_HEADERS.Members, ...db.members.map(memberToRow)],
    },
    {
      range: 'Categories!A1',
      values: [SHEET_HEADERS.Categories, ...db.categories.map(categoryToRow)],
    },
  ];

  // Clear first so shrunk arrays don't leave ghost rows
  await fetchGoogleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        ranges: [
          'Expenses!A1:Z1000',
          'Contributions!A1:Z1000',
          'Members!A1:Z100',
          'Categories!A1:Z200',
        ],
      }),
    }
  );

  await fetchGoogleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data,
      }),
    }
  );
}

async function pullFromGoogleSheets(
  token: string,
  spreadsheetId: string,
  db: DatabaseState
): Promise<void> {
  const ranges = [
    'Expenses!A2:AB2000',
    'Contributions!A2:G2000',
    'Members!A2:E20',
    'Categories!A2:D200',
  ]
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join('&');

  const res = await fetchGoogleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${ranges}`,
    token
  );

  const valueRanges = res.valueRanges || [];
  const expRows = valueRanges[0]?.values || [];
  const contribRows = valueRanges[1]?.values || [];
  const memberRows = valueRanges[2]?.values || [];
  const catRows = valueRanges[3]?.values || [];

  if (
    expRows.length === 0 &&
    contribRows.length === 0 &&
    memberRows.length === 0
  ) {
    // Empty remote sheet — seed it with our local state
    await pushAllToGoogleSheets(token, spreadsheetId, db);
    return;
  }

  if (expRows.length > 0) {
    db.expenses = expRows.filter((r: any[]) => r[0]).map(rowToExpense);
  }
  if (contribRows.length > 0) {
    db.contributions = contribRows
      .filter((r: any[]) => r[0])
      .map(rowToContribution);
  }
  if (memberRows.length >= 4) {
    db.members = memberRows
      .filter((r: any[]) => r[0])
      .slice(0, 4)
      .map(rowToMember);
  }
  if (catRows.length > 0) {
    const parsedCats = catRows.filter((r: any[]) => r[0]).map(rowToCategory);
    if (
      parsedCats.some((c: CategoryRecord) => c.category_name === 'Vegetables and Fruits')
    ) {
      db.categories = parsedCats;
    }
  }
}

async function syncWithGoogleIfTokenPresent(
  req: express.Request,
  db: DatabaseState,
  direction: 'push' | 'pull' = 'push'
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const userEmail =
    typeof req.headers['x-user-email'] === 'string'
      ? req.headers['x-user-email']
      : null;

  if (userEmail) {
    db.connection.currentUserEmail = userEmail;
  }

  if (!token) {
    saveLocalDb(db);
    return;
  }

  try {
    const spreadsheetId = await ensureGoogleSpreadsheet(token, db);
    if (direction === 'pull') {
      await pullFromGoogleSheets(token, spreadsheetId, db);
    } else {
      await pushAllToGoogleSheets(token, spreadsheetId, db);
    }
    db.connection.connected = true;
    db.connection.mode = 'google_sheets';
    saveLocalDb(db);
  } catch (err) {
    console.warn(
      'Google Sheets sync warning (falling back to workspace ledger):',
      err
    );
    saveLocalDb(db);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  const db = loadLocalDb();

  // 1. Bootstrap full state
  app.get('/api/bootstrap', async (req, res) => {
    try {
      await syncWithGoogleIfTokenPresent(req, db, 'pull');
      res.json(db);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Bootstrap failed' });
    }
  });

  // 2. Manual Sync with Google Sheets
  app.post('/api/sync', async (req, res) => {
    try {
      await syncWithGoogleIfTokenPresent(req, db, 'push');
      res.json(db);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Sync failed' });
    }
  });

  // 3. Create Expense(s) — supports single item or multiple items from "Add Another Item"
  app.post('/api/expenses', async (req, res) => {
    try {
      const nowIso = new Date().toISOString();
      const body = req.body || {};
      const itemsInput: any[] = Array.isArray(body.items)
        ? body.items
        : [body];

      const created: ExpenseRecord[] = [];

      for (const raw of itemsInput) {
        const productName = String(raw.product_name || '').trim();
        const amount = round2(Number(raw.amount) || 0);
        if (!productName) {
          return res.status(400).json({ error: 'Product Name is required.' });
        }
        if (amount <= 0) {
          return res
            .status(400)
            .json({ error: 'Amount must be greater than ₹0.' });
        }

        const nextNum =
          db.expenses.reduce((max, e) => {
            const m = /^EXP-(\d+)$/.exec(e.expense_id);
            return m ? Math.max(max, Number(m[1])) : max;
          }, 1000) + 1;

        const record: ExpenseRecord = {
          expense_id: `EXP-${nextNum}`,
          expense_date: String(raw.expense_date || getTodayIST()),
          product_name: productName,
          quantity: Number(raw.quantity) > 0 ? Number(raw.quantity) : 1,
          unit: String(raw.unit || 'kg'),
          category: String(raw.category || 'Vegetables and Fruits'),
          subcategory: String(raw.subcategory || 'Vegetables'),
          amount,
          payment_method: raw.payment_method === 'UPI' ? 'UPI' : 'Cash',
          created_at: nowIso,
          updated_at: nowIso,
          is_deleted: false,
        };

        db.expenses.unshift(record);
        created.push(record);
      }

      await syncWithGoogleIfTokenPresent(req, db, 'push');
      res.json({ created, state: db });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to save expense' });
    }
  });

  // 4. Update Expense
  app.put('/api/expenses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const idx = db.expenses.findIndex((e) => e.expense_id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Expense record not found.' });
      }

      const raw = req.body || {};
      const existing = db.expenses[idx];
      const productName = String(
        raw.product_name ?? existing.product_name
      ).trim();
      const amount = round2(Number(raw.amount ?? existing.amount));

      if (!productName) {
        return res.status(400).json({ error: 'Product Name is required.' });
      }
      if (amount <= 0) {
        return res
          .status(400)
          .json({ error: 'Amount must be greater than ₹0.' });
      }

      const updated: ExpenseRecord = {
        ...existing,
        expense_date: String(raw.expense_date || existing.expense_date),
        product_name: productName,
        quantity:
          Number(raw.quantity) > 0 ? Number(raw.quantity) : existing.quantity,
        unit: String(raw.unit || existing.unit),
        category: String(raw.category || existing.category),
        subcategory: String(raw.subcategory || existing.subcategory),
        amount,
        payment_method:
          (raw.payment_method || existing.payment_method) === 'UPI'
            ? 'UPI'
            : 'Cash',
        updated_at: new Date().toISOString(),
      };

      db.expenses[idx] = updated;
      await syncWithGoogleIfTokenPresent(req, db, 'push');
      res.json({ expense: updated, state: db });
    } catch (err: any) {
      res
        .status(500)
        .json({ error: err?.message || 'Failed to update expense' });
    }
  });

  // 5. Soft-Delete Expense
  app.delete('/api/expenses/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const idx = db.expenses.findIndex((e) => e.expense_id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Expense record not found.' });
      }

      db.expenses[idx] = {
        ...db.expenses[idx],
        is_deleted: true,
        updated_at: new Date().toISOString(),
      };

      await syncWithGoogleIfTokenPresent(req, db, 'push');
      res.json({ state: db });
    } catch (err: any) {
      res
        .status(500)
        .json({ error: err?.message || 'Failed to delete expense' });
    }
  });

  // 6. Add Member Contribution ("Add Money")
  app.post('/api/contributions', async (req, res) => {
    try {
      const raw = req.body || {};
      const memberId = String(raw.member_id || 'MEM-1');
      const amount = round2(Number(raw.amount) || 0);

      if (amount <= 0) {
        return res
          .status(400)
          .json({ error: 'Contribution amount must be greater than ₹0.' });
      }

      const memberExists = db.members.some((m) => m.member_id === memberId);
      if (!memberExists) {
        return res.status(400).json({ error: 'Invalid kitchen member.' });
      }

      const nextNum =
        db.contributions.reduce((max, c) => {
          const m = /^CNT-(\d+)$/.exec(c.contribution_id);
          return m ? Math.max(max, Number(m[1])) : max;
        }, 1000) + 1;

      const record: ContributionRecord = {
        contribution_id: `CNT-${nextNum}`,
        member_id: memberId,
        contribution_date: String(raw.contribution_date || getTodayIST()),
        amount,
        payment_method: raw.payment_method === 'UPI' ? 'UPI' : 'Cash',
        note: String(raw.note || '').trim(),
        created_at: new Date().toISOString(),
      };

      db.contributions.unshift(record);
      await syncWithGoogleIfTokenPresent(req, db, 'push');
      res.json({ contribution: record, state: db });
    } catch (err: any) {
      res
        .status(500)
        .json({ error: err?.message || 'Failed to add contribution' });
    }
  });

  // 7. Delete Member Contribution
  app.delete('/api/contributions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      db.contributions = db.contributions.filter(
        (c) => c.contribution_id !== id
      );
      await syncWithGoogleIfTokenPresent(req, db, 'push');
      res.json({ state: db });
    } catch (err: any) {
      res
        .status(500)
        .json({ error: err?.message || 'Failed to delete contribution' });
    }
  });

  // 8. Rename Member (4 fixed member profiles)
  app.put('/api/members/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const memberName = String(req.body?.member_name || '').trim();
      if (!memberName) {
        return res.status(400).json({ error: 'Member name cannot be empty.' });
      }

      const idx = db.members.findIndex((m) => m.member_id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Member not found.' });
      }

      db.members[idx] = {
        ...db.members[idx],
        member_name: memberName,
        updated_at: new Date().toISOString(),
      };

      await syncWithGoogleIfTokenPresent(req, db, 'push');
      res.json({ member: db.members[idx], state: db });
    } catch (err: any) {
      res
        .status(500)
        .json({ error: err?.message || 'Failed to update member name' });
    }
  });

  // 9. Add Custom Category / Subcategory inline from Expense Modal
  app.post('/api/categories', async (req, res) => {
    try {
      const categoryName = String(req.body?.category_name || '').trim();
      const subcategoryName = String(
        req.body?.subcategory_name || 'General'
      ).trim();

      if (!categoryName || !subcategoryName) {
        return res
          .status(400)
          .json({ error: 'Category and Subcategory names are required.' });
      }

      const duplicate = db.categories.find(
        (c) =>
          c.category_name.toLowerCase() === categoryName.toLowerCase() &&
          c.subcategory_name.toLowerCase() === subcategoryName.toLowerCase()
      );
      if (duplicate) {
        duplicate.is_active = true;
        await syncWithGoogleIfTokenPresent(req, db, 'push');
        return res.json({ category: duplicate, state: db });
      }

      const nextNum = db.categories.length + 1;
      const newCat: CategoryRecord = {
        category_id: `CAT-${String(nextNum).padStart(3, '0')}`,
        category_name: categoryName,
        subcategory_name: subcategoryName,
        is_active: true,
      };
      db.categories.push(newCat);
      await syncWithGoogleIfTokenPresent(req, db, 'push');
      res.json({ category: newCat, state: db });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to add category' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Ritu's Cloud Kitchen server running on http://localhost:${PORT}`
    );
  });
}

startServer();
