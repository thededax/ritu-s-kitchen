export type PaymentMethod = 'Cash' | 'UPI';
export type ExpenseUnit =
  | 'kg'
  | 'gram'
  | 'litre'
  | 'ml'
  | 'packet'
  | 'piece'
  | 'box'
  | 'other';

export interface ExpenseRecord {
  expense_id: string;
  expense_date: string; // YYYY-MM-DD in Asia/Kolkata
  product_name: string;
  quantity: number;
  unit: ExpenseUnit | string;
  category: string;
  subcategory: string;
  amount: number;
  payment_method: PaymentMethod | string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface ContributionRecord {
  contribution_id: string;
  member_id: string;
  contribution_date: string; // YYYY-MM-DD
  amount: number;
  payment_method: PaymentMethod | string;
  note: string;
  created_at: string;
}

export const CHEF_RITU_RAJ_PHOTO = '/assets/aistudio/image_99379257.png';

export interface MemberRecord {
  member_id: string;
  member_name: string;
  role?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryRecord {
  category_id: string;
  category_name: string;
  subcategory_name: string;
  is_active: boolean;
}

export interface DatabaseState {
  expenses: ExpenseRecord[];
  contributions: ContributionRecord[];
  members: MemberRecord[];
  categories: CategoryRecord[];
  connection: {
    connected: boolean;
    mode: 'google_sheets' | 'workspace_ledger';
    spreadsheetId: string | null;
    spreadsheetName: string;
    spreadsheetUrl: string | null;
    lastSyncTime: string;
    currentUserEmail: string | null;
  };
}

export type NavSection = 'dashboard' | 'expenses' | 'members' | 'reports';

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'UPI'];

export const DEFAULT_UNITS: ExpenseUnit[] = [
  'kg',
  'gram',
  'litre',
  'ml',
  'packet',
  'piece',
  'box',
  'other',
];

export const DEFAULT_CATEGORIES_TREE: Array<{
  category_name: string;
  subcategories: string[];
}> = [
  {
    category_name: 'Vegetables and Fruits',
    subcategories: ['Vegetables', 'Fruits'],
  },
  {
    category_name: 'Grocery and Ingredients',
    subcategories: [
      'Rice',
      'Wheat / Flour',
      'Pulses',
      'Cooking Oil',
      'Spices',
      'Sugar',
      'Salt',
      'Other Ingredients',
    ],
  },
  {
    category_name: 'Dairy and Other Food',
    subcategories: ['Milk', 'Paneer', 'Curd', 'Eggs', 'Other Dairy'],
  },
  {
    category_name: 'Kitchen Essentials',
    subcategories: [
      'LPG / Gas',
      'Water',
      'Cleaning Products',
      'Packaging',
      'Other Kitchen Essentials',
    ],
  },
  {
    category_name: 'Other',
    subcategories: ['Miscellaneous'],
  },
];

export const INITIAL_MEMBERS: Array<{
  member_id: string;
  member_name: string;
  role?: string;
  avatar_url?: string;
}> = [
  {
    member_id: 'MEM-1',
    member_name: 'Ritu Raj',
    role: 'Chef',
    avatar_url: CHEF_RITU_RAJ_PHOTO,
  },
  { member_id: 'MEM-2', member_name: 'Member 2' },
  { member_id: 'MEM-3', member_name: 'Member 3' },
  { member_id: 'MEM-4', member_name: 'Member 4' },
];

export const SHEET_HEADERS = {
  Expenses: [
    'expense_id',
    'expense_date',
    'product_name',
    'quantity',
    'unit',
    'category',
    'subcategory',
    'amount',
    'payment_method',
    'created_at',
    'updated_at',
    'is_deleted',
  ],
  Contributions: [
    'contribution_id',
    'member_id',
    'contribution_date',
    'amount',
    'payment_method',
    'note',
    'created_at',
  ],
  Members: [
    'member_id',
    'member_name',
    'is_active',
    'created_at',
    'updated_at',
  ],
  Categories: [
    'category_id',
    'category_name',
    'subcategory_name',
    'is_active',
  ],
};
