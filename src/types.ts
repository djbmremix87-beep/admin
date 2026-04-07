export enum Category {
  INDOOR = 'indoor',
  OUTDOOR = 'outdoor',
  NVR = 'nvr',
  ACCESSORIES = 'accessories'
}

export enum ClientStatus {
  ACTIVE = 'active',
  DUE = 'due',
  INACTIVE = 'inactive'
}

export enum ExpenseCategory {
  SALARY = 'Salary',
  RENT = 'Rent',
  ELECTRICITY = 'Electricity',
  TRANSPORT = 'Transport',
  OTHER = 'Other'
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  image?: string; // base64 or URL
  badge?: 'new' | 'hot' | 'lowstock';
}

export interface WorkHistory {
  id: string;
  date: string;
  description: string;
  amount: number;
  paid: number;
}

export interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  type: 'Cash' | 'Bkash' | 'Bank';
  purpose?: string;
}

export interface Order {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  dueDate?: string | null;
}

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  address: string;
  status: ClientStatus;
  due: number;
  works: number;
  totalPaid: number;
  workHistory: WorkHistory[];
  paymentHistory: PaymentHistory[];
  orders: Order[];
  warrantyExpiry?: string;
  image?: string; // base64 or URL
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
}
