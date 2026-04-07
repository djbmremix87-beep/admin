import React, { useState, useEffect, useMemo, Component, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  Wallet, 
  ShieldCheck, 
  BarChart3, 
  Wrench, 
  Settings, 
  User, 
  Plus, 
  X,
  Search, 
  Filter, 
  ChevronRight, 
  ArrowLeft, 
  MessageSquare, 
  Download, 
  Trash2, 
  Minus, 
  Moon, 
  Sun, 
  Leaf,
  Bell,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  FileText,
  Save,
  RefreshCcw,
  Calculator,
  Hammer,
  Construction,
  Server,
  Zap,
  Share2,
  Database,
  Smartphone,
  Sparkles,
  Send,
  Image as ImageIcon,
  Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { cn, formatCurrency, numberToWords } from './lib/utils';
import { 
  Category, 
  ClientStatus, 
  ExpenseCategory, 
  Product, 
  Client, 
  Expense, 
  CartItem,
  Order,
  WorkHistory,
  PaymentHistory
} from './types';
// @ts-ignore
import html2pdf from 'html2pdf.js';

// --- Default Data ---
const DEFAULT_PRODUCTS: Product[] = [
  { id: 1, name: 'Ranger 2 Pro 3MP', price: 3200, stock: 15, category: 'indoor', badge: 'new' },
  { id: 2, name: 'Ranger 2 Pro 5MP', price: 4500, stock: 8, category: 'indoor', badge: 'hot' },
  { id: 3, name: 'Bulb Cam 3MP', price: 2800, stock: 3, category: 'indoor', badge: 'lowstock' },
  { id: 4, name: 'NVR 8CH', price: 8500, stock: 5, category: 'nvr' },
  { id: 5, name: 'Outdoor Bullet 5MP', price: 5200, stock: 12, category: 'outdoor', badge: 'new' }
];

const DEFAULT_CLIENTS: Client[] = [
  { 
    id: 1, name: 'Rahim Mia', phone: '8801711111111', address: 'Dhaka', status: ClientStatus.ACTIVE, 
    due: 5000, works: 2, totalPaid: 10000, workHistory: [], paymentHistory: [], orders: [],
    warrantyExpiry: '2026-12-31'
  },
  { 
    id: 2, name: 'Karim Hossain', phone: '8801822222222', address: 'Chittagong', status: ClientStatus.DUE, 
    due: 12000, works: 1, totalPaid: 0, workHistory: [], paymentHistory: [], orders: [],
    warrantyExpiry: '2025-06-15'
  }
];

import { 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  updateDoc,
  getDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { GoogleGenAI } from "@google/genai";

// --- Components ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    // @ts-ignore
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    // @ts-ignore
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        // @ts-ignore
        const parsedError = JSON.parse(this.state.error.message);
        if (parsedError.error.includes('resource-exhausted') || parsedError.error.includes('Quota limit exceeded')) {
          errorMessage = "Firestore free tier quota exceeded. This usually happens after 20,000 writes in a single day. The quota will reset automatically at midnight UTC. Please try again tomorrow.";
        } else {
          errorMessage = `Firestore Error: ${parsedError.error} during ${parsedError.operationType} at ${parsedError.path}`;
        }
      } catch (e) {
        // @ts-ignore
        errorMessage = this.state.error?.message || String(this.state.error);
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">
          <div className="glass-card p-8 max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Application Error</h1>
            <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
              {errorMessage}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    // @ts-ignore
    return this.props.children;
  }
}

const ProductDetailsModal = ({ 
  product, 
  onClose, 
  addToCart,
  formatCurrency 
}: { 
  product: Product, 
  onClose: () => void, 
  addToCart: (p: Product) => void,
  formatCurrency: (v: number) => string
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Four pieces animation background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          initial={{ x: '-100%', y: '-100%' }}
          animate={{ x: 0, y: 0 }}
          exit={{ x: '-100%', y: '-100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-600/10 border-r border-b border-white/10"
        />
        <motion.div 
          initial={{ x: '100%', y: '-100%' }}
          animate={{ x: 0, y: 0 }}
          exit={{ x: '100%', y: '-100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/10 border-l border-b border-white/10"
        />
        <motion.div 
          initial={{ x: '-100%', y: '100%' }}
          animate={{ x: 0, y: 0 }}
          exit={{ x: '-100%', y: '100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-blue-600/10 border-r border-t border-white/10"
        />
        <motion.div 
          initial={{ x: '100%', y: '100%' }}
          animate={{ x: 0, y: 0 }}
          exit={{ x: '100%', y: '100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-blue-600/10 border-l border-t border-white/10"
        />
      </div>

      <motion.div 
        initial={{ scale: 0, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        exit={{ scale: 0, opacity: 0, rotate: 10 }}
        transition={{ 
          type: 'spring', 
          damping: 25, 
          stiffness: 200,
          delay: 0.2 
        }}
        className="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-[40px] overflow-hidden flex flex-col shadow-2xl relative z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative pt-12 pb-4 flex flex-col items-center bg-gray-50 dark:bg-slate-800/30">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-md z-20"
          >
            <X size={20} />
          </button>
          
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="relative w-36 h-36 rounded-full border-4 border-white dark:border-slate-900 shadow-2xl overflow-hidden bg-white dark:bg-slate-800 flex items-center justify-center z-10"
          >
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Package size={60} className="text-gray-300" strokeWidth={1} />
            )}
          </motion.div>

          <div className="mt-4">
            <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg">
              {product.category}
            </span>
          </div>
        </div>
        
        <div className="p-6 space-y-5">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{product.name}</h2>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Price</p>
              <p className="text-xl font-black text-blue-600">{formatCurrency(product.price)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-gray-100 dark:border-slate-800">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Stock Status</p>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", product.stock > 0 ? "bg-emerald-500" : "bg-red-500")} />
                <p className={cn(
                  "text-xs font-black",
                  product.stock > 5 ? "text-emerald-500" : product.stock > 0 ? "text-amber-500" : "text-red-500"
                )}>
                  {product.stock > 0 ? `${product.stock} Units` : 'Out of Stock'}
                </p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-gray-100 dark:border-slate-800">
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Warranty</p>
              <div className="flex items-center gap-2 text-blue-600">
                <ShieldCheck size={14} />
                <p className="text-xs font-black">1 Year Service</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Specifications</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              Professional grade {product.name} with high-definition clarity. 
              Optimized for 24/7 surveillance with smart motion detection and IR night vision.
            </p>
          </div>

          <button 
            onClick={() => {
              addToCart(product);
              onClose();
            }}
            disabled={product.stock <= 0}
            className={cn(
              "w-full py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all duration-300 shadow-xl",
              product.stock > 0 
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {product.stock > 0 ? 'Add to Order' : 'Out of Stock'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ProductList = ({ 
  products, 
  inventoryMode, 
  setInventoryMode, 
  setShowAddProduct, 
  setSelectedProduct, 
  handleDeleteProduct,
  onEditProduct,
  addToCart,
  isDarkMode,
  formatCurrency
}: { 
  products: Product[], 
  inventoryMode: boolean, 
  setInventoryMode: (v: boolean) => void, 
  setShowAddProduct: (v: boolean) => void, 
  setSelectedProduct: (p: Product) => void, 
  handleDeleteProduct: (id: number) => void, 
  onEditProduct: (p: Product) => void,
  addToCart: (p: Product) => void,
  isDarkMode: boolean,
  formatCurrency: (v: number) => string
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || p.category === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{inventoryMode ? 'Inventory' : 'Premium Gear'}</h2>
            <p className="text-xs text-gray-500 font-medium">
              {inventoryMode ? 'Manage your product stock' : 'Select items to build your order'}
            </p>
          </div>
          <div className="relative flex gap-2">
            <button 
              onClick={() => setInventoryMode(!inventoryMode)}
              className={cn(
                "p-2 rounded-xl transition-colors",
                inventoryMode ? "bg-blue-600 text-white" : "glass-card text-blue-600"
              )}
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={() => setShowAddProduct(true)}
              className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
          {['all', 'indoor', 'outdoor', 'nvr', 'accessories'].map(cat => (
            <button 
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-[11px] font-bold whitespace-nowrap transition-all duration-300 border",
                filter === cat 
                  ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 dark:shadow-none" 
                  : "bg-white dark:bg-slate-900 text-gray-500 border-gray-100 dark:border-slate-800 hover:border-blue-200"
              )}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search premium products..." 
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filteredProducts.map((product, idx) => (
          <motion.div 
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => setSelectedProduct(product)}
            className="group relative bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 cursor-pointer"
          >
            <div className="aspect-square bg-gray-50 dark:bg-slate-800/50 flex items-center justify-center relative overflow-hidden">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="text-gray-300 dark:text-slate-700"
                >
                  <Package size={56} strokeWidth={1} />
                </motion.div>
              )}
              
              {product.badge && (
                <div className="absolute top-3 left-3 z-10">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm",
                    product.badge === 'new' ? "bg-blue-600 text-white" : 
                    product.badge === 'hot' ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                  )}>
                    {product.badge}
                  </span>
                </div>
              )}

              <div className="absolute top-3 right-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  product.stock > 5 ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                )} />
              </div>
            </div>

            <div className="p-4">
              <div className="mb-1">
                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{product.category}</span>
              </div>
              <h4 className="font-bold text-xs text-gray-800 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 transition-colors">{product.name}</h4>
              
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Price</p>
                  <p className="text-sm font-black text-gray-900 dark:text-white">{formatCurrency(product.price)}</p>
                </div>
                {inventoryMode ? (
                  <div className="flex gap-2">
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditProduct(product);
                      }}
                      className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"
                    >
                      <Settings size={14} />
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProduct(product.id);
                      }}
                      className="w-8 h-8 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </div>
                ) : (
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
                    className="w-10 h-10 bg-slate-900 dark:bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors"
                  >
                    <Plus size={20} />
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = ({ 
  products, 
  clients, 
  expenses, 
  formatCurrency 
}: { 
  products: Product[], 
  clients: Client[], 
  expenses: Expense[], 
  formatCurrency: (v: number) => string 
}) => {
  const totalSales = clients.reduce((sum, c) => sum + c.totalPaid, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const profit = totalSales - totalExpenses;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-xs text-gray-500 font-medium">Overview of your business</p>
        </div>
        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600">
          <LayoutDashboard size={20} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center text-emerald-600 mb-3">
            <Wallet size={16} />
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Revenue</p>
          <p className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(totalSales)}</p>
        </div>
        <div className="glass-card p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="w-8 h-8 bg-rose-50 dark:bg-rose-900/20 rounded-lg flex items-center justify-center text-rose-600 mb-3">
            <Trash2 size={16} />
          </div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Expenses</p>
          <p className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      <div className="glass-card p-6 rounded-[32px] border border-gray-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16" />
        <div className="relative z-10">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Net Profit</p>
          <h3 className="text-3xl font-black text-blue-600">{formatCurrency(profit)}</h3>
          <div className="mt-4 flex items-center gap-2">
            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 text-[9px] font-bold rounded-lg flex items-center gap-1">
              <Plus size={10} /> 12% from last month
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Package, label: 'Stock', color: 'bg-blue-50 text-blue-600' },
            { icon: Users, label: 'Clients', color: 'bg-purple-50 text-purple-600' },
            { icon: Bell, label: 'Alerts', color: 'bg-amber-50 text-amber-600' }
          ].map((action, i) => (
            <button key={i} className="flex flex-col items-center gap-2 p-4 glass-card rounded-2xl border border-gray-100 dark:border-slate-800 hover:border-blue-200 transition-all">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", action.color)}>
                <action.icon size={20} />
              </div>
              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ClientList = ({ 
  clients, 
  setShowClientProfile, 
  formatCurrency 
}: { 
  clients: Client[], 
  setShowClientProfile: (c: Client) => void, 
  formatCurrency: (v: number) => string 
}) => {
  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clients</h2>
          <p className="text-xs text-gray-500 font-medium">Manage your customer base</p>
        </div>
        <button className="p-2 bg-blue-600 text-white rounded-xl shadow-lg">
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {clients.map(client => (
          <motion.div 
            key={client.id}
            whileHover={{ x: 4 }}
            onClick={() => setShowClientProfile(client)}
            className="glass-card p-4 rounded-3xl border border-gray-100 dark:border-slate-800 flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-200 dark:shadow-none overflow-hidden">
                {client.image ? (
                  <img src={client.image} alt={client.name} className="w-full h-full object-cover" />
                ) : (
                  client.name[0]
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{client.name}</h4>
                <p className="text-[10px] text-gray-400 font-medium">{client.phone}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Spent</p>
              <p className="text-sm font-black text-gray-900 dark:text-white">{formatCurrency(client.totalPaid)}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const WarrantyPage = ({ clients }: { clients: Client[] }) => {
  const clientsWithWarranty = clients.filter(c => c.warrantyExpiry);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Warranty</h2>
          <p className="text-xs text-gray-500 font-medium">Service & Support tracking</p>
        </div>
        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg">
          <ShieldCheck size={20} />
        </div>
      </div>

      {clientsWithWarranty.length === 0 ? (
        <div className="glass-card p-8 rounded-[40px] border border-gray-100 dark:border-slate-800 flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-blue-600 mb-2">
            <ShieldCheck size={40} />
          </div>
          <h3 className="text-lg font-bold">No Active Claims</h3>
          <p className="text-xs text-gray-500 max-w-[200px] leading-relaxed">
            All your products are currently within their service periods.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {clientsWithWarranty.map(client => (
            <div key={client.id} className="glass-card p-4 rounded-3xl border border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 font-bold">
                  {client.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-sm">{client.name}</h4>
                  <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                    <ShieldCheck size={10} /> Expires: {client.warrantyExpiry}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2 py-1 bg-emerald-100 text-emerald-600 text-[8px] font-black rounded-full uppercase">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AddProductModal = ({ 
  onClose, 
  onAdd 
}: { 
  onClose: () => void, 
  onAdd: (p: any) => void 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: 'indoor',
    stock: '',
    image: ''
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Add Product</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product Name</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. 4K Dome Camera"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Price</label>
              <input 
                type="number" 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Stock</label>
              <input 
                type="number" 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0"
                value={formData.stock}
                onChange={e => setFormData({...formData, stock: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Category</label>
            <select 
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
            >
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="nvr">NVR</option>
              <option value="accessories">Accessories</option>
            </select>
          </div>
          
          <button 
            onClick={() => onAdd(formData)}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none mt-4"
          >
            Create Product
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const EditProductModal = ({ 
  product,
  onClose, 
  onSave 
}: { 
  product: Product,
  onClose: () => void, 
  onSave: (p: Product) => void 
}) => {
  const [formData, setFormData] = useState({
    ...product,
    price: product.price.toString(),
    stock: product.stock.toString()
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({...formData, image: reader.result as string});
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-[32px] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Edit Product</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center">
              {formData.image ? (
                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Package className="text-gray-300" size={32} />
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Product Name</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. 4K Dome Camera"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Price</label>
              <input 
                type="number" 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Stock</label>
              <input 
                type="number" 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0"
                value={formData.stock}
                onChange={e => setFormData({...formData, stock: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Category</label>
            <select 
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value})}
            >
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="nvr">NVR</option>
              <option value="accessories">Accessories</option>
            </select>
          </div>
          
          <button 
            onClick={() => onSave({
              ...formData,
              price: Number(formData.price),
              stock: Number(formData.stock)
            })}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none mt-4"
          >
            Update Product
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CalculatorModal = ({ onClose }: { onClose: () => void }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handleNumber = (n: string) => {
    if (display === '0') setDisplay(n);
    else setDisplay(display + n);
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const calculate = () => {
    try {
      const result = eval(equation + display);
      setDisplay(result.toString());
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-[320px] bg-slate-900 rounded-[32px] p-6 shadow-2xl border border-slate-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white font-bold">Calculator</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="bg-slate-800 p-4 rounded-2xl mb-4 text-right">
          <p className="text-xs text-gray-400 h-4">{equation}</p>
          <p className="text-2xl font-bold text-white truncate">{display}</p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {['7', '8', '9', '/'].map(btn => (
            <button key={btn} onClick={() => isNaN(Number(btn)) ? handleOperator(btn) : handleNumber(btn)} className="h-12 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700">{btn}</button>
          ))}
          {['4', '5', '6', '*'].map(btn => (
            <button key={btn} onClick={() => isNaN(Number(btn)) ? handleOperator(btn) : handleNumber(btn)} className="h-12 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700">{btn}</button>
          ))}
          {['1', '2', '3', '-'].map(btn => (
            <button key={btn} onClick={() => isNaN(Number(btn)) ? handleOperator(btn) : handleNumber(btn)} className="h-12 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700">{btn}</button>
          ))}
          <button onClick={clear} className="h-12 bg-rose-600 text-white rounded-xl font-bold">C</button>
          <button onClick={() => handleNumber('0')} className="h-12 bg-slate-800 text-white rounded-xl font-bold">0</button>
          <button onClick={calculate} className="h-12 bg-blue-600 text-white rounded-xl font-bold">=</button>
          <button onClick={() => handleOperator('+')} className="h-12 bg-slate-800 text-white rounded-xl font-bold">+</button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const SplashScreen = ({ customLogo }: { customLogo: string | null }) => {
  const dialogues = [
    "Initializing server room...",
    "Checking network connections...",
    "Optimizing database clusters...",
    "Securing the perimeter...",
    "System Online!"
  ];
  const [dialogueIdx, setDialogueIdx] = useState(0);
  const [impacted, setImpacted] = useState(false);
  const [phase, setPhase] = useState<'working' | 'looking' | 'throwing' | 'impacted'>('working');

  useEffect(() => {
    const interval = setInterval(() => {
      setDialogueIdx(prev => (prev + 1) % dialogues.length);
    }, 1000);
    
    // Phase timings
    const workingTimer = setTimeout(() => {
      setPhase('looking');
    }, 1500);

    const lookingTimer = setTimeout(() => {
      setPhase('throwing');
    }, 2200);

    const impactTimer = setTimeout(() => {
      setPhase('impacted');
      setImpacted(true);
    }, 2700);

    return () => {
      clearInterval(interval);
      clearTimeout(workingTimer);
      clearTimeout(lookingTimer);
      clearTimeout(impactTimer);
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.8 }}
      className="fixed inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Server Room Background */}
      {!impacted && (
        <div className="absolute inset-0 grid grid-cols-4 md:grid-cols-6 gap-4 p-8 opacity-20">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <Server size={40} className="text-blue-500" />
              <div className="flex gap-1">
                <motion.div 
                  animate={{ opacity: [0.3, 1, 0.3] }} 
                  transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                  className="w-1 h-1 bg-green-500 rounded-full" 
                />
                <motion.div 
                  animate={{ opacity: [0.3, 1, 0.3] }} 
                  transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.2 }}
                  className="w-1 h-1 bg-blue-500 rounded-full" 
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Person Working / Looking / Throwing */}
      {!impacted && (
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          className="relative z-10 flex flex-col items-center"
        >
          {/* Character Body */}
          <motion.div 
            animate={phase === 'working' ? {
              rotate: [0, 2, 0, -2, 0],
              y: [0, -5, 0]
            } : {}}
            transition={{ repeat: Infinity, duration: 0.4 }}
            className="relative"
          >
            {/* Technician Head */}
            <div className="relative flex flex-col items-center">
              {/* Head */}
              <motion.div 
                animate={phase === 'working' ? { rotate: [0, 5, 0, -5, 0] } : phase === 'looking' ? { rotate: 0, scale: 1.1 } : {}}
                className="w-16 h-16 bg-[#ffdbac] rounded-full relative z-20 border-2 border-[#e0ac69] overflow-hidden"
              >
                {/* Eyes */}
                <motion.div 
                  animate={phase === 'working' ? { y: [0, 2, 0] } : { y: 0 }}
                  className="absolute top-6 left-0 w-full flex justify-around px-3"
                >
                  <div className="w-3 h-3 bg-slate-900 rounded-full" />
                  <div className="w-3 h-3 bg-slate-900 rounded-full" />
                </motion.div>
                
                {/* Looking at screen effect */}
                {phase !== 'working' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-blue-500/20 blur-sm"
                  />
                )}
              </motion.div>
              
              {/* Body */}
              <div className="w-20 h-24 bg-blue-600 rounded-t-[25px] -mt-2 relative z-10 border-x-2 border-t-2 border-blue-700 shadow-inner">
                {/* Shirt Detail */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-blue-700/50" />
                
                {/* Arms */}
                {phase === 'working' ? (
                  <>
                    <motion.div 
                      animate={{ rotate: [0, 30, 0] }}
                      transition={{ repeat: Infinity, duration: 0.3 }}
                      className="absolute -left-6 top-4 w-6 h-12 bg-blue-600 rounded-full origin-top border-l-2 border-blue-700"
                    />
                    <motion.div 
                      animate={{ rotate: [0, -30, 0] }}
                      transition={{ repeat: Infinity, duration: 0.3, delay: 0.1 }}
                      className="absolute -right-6 top-4 w-6 h-12 bg-blue-600 rounded-full origin-top border-r-2 border-blue-700"
                    />
                  </>
                ) : phase === 'looking' ? (
                  <>
                    <motion.div 
                      initial={{ rotate: 0 }}
                      animate={{ rotate: -20 }}
                      className="absolute -left-6 top-4 w-6 h-12 bg-blue-600 rounded-full origin-top border-l-2 border-blue-700"
                    />
                    <motion.div 
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 20 }}
                      className="absolute -right-6 top-4 w-6 h-12 bg-blue-600 rounded-full origin-top border-r-2 border-blue-700"
                    />
                  </>
                ) : (
                  <>
                    <motion.div 
                      animate={{ rotate: -40 }}
                      className="absolute -left-6 top-4 w-6 h-12 bg-blue-600 rounded-full origin-top border-l-2 border-blue-700"
                    />
                    <motion.div 
                      initial={{ rotate: 20 }}
                      animate={{ rotate: [20, -120, 20] }}
                      transition={{ duration: 0.5 }}
                      className="absolute -right-6 top-4 w-6 h-12 bg-blue-600 rounded-full origin-top border-r-2 border-blue-700"
                    >
                      {/* Cable being thrown */}
                      {phase === 'throwing' && (
                        <motion.div
                          initial={{ scale: 1, x: 0, y: 0, opacity: 1 }}
                          animate={{ scale: 10, x: 0, y: -500, opacity: 0 }}
                          transition={{ duration: 0.5, ease: "easeIn" }}
                          className="absolute bottom-0 right-0"
                        >
                          <Zap size={30} className="text-yellow-400 rotate-180" />
                          <div className="w-1 h-20 bg-slate-400 -mt-2 mx-auto" />
                        </motion.div>
                      )}
                    </motion.div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Impact Effect / Flash */}
      {impacted && (
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 10, opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 bg-white z-50 flex items-center justify-center"
        >
          <Zap size={200} className="text-yellow-400" />
        </motion.div>
      )}

      {/* Logo Reveal */}
      <motion.div 
        initial={{ scale: 0, opacity: 0, rotate: -180 }}
        animate={impacted ? { scale: 1, opacity: 1, rotate: 0 } : {}}
        transition={{ 
          type: "spring",
          damping: 8,
          stiffness: 150,
          delay: 0.1
        }}
        className={`w-48 h-48 bg-blue-600 rounded-[56px] flex items-center justify-center shadow-2xl shadow-blue-500/40 mb-8 overflow-hidden border-4 border-white/20 ${impacted ? 'animate-shake' : ''}`}
      >
        {customLogo ? (
          <img src={customLogo} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <ShieldCheck size={100} className="text-white" />
        )}
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={impacted ? { opacity: 1 } : {}}
        className="text-center"
      >
        <motion.h2 
          className="text-4xl font-black text-white mb-2 tracking-tighter"
        >
          CCTV PRO
        </motion.h2>
        
        <motion.div 
          key={dialogueIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-blue-400 text-sm font-bold h-6"
        >
          {dialogues[dialogueIdx]}
        </motion.div>
      </motion.div>

      {/* Progress Bar */}
      <div className="absolute bottom-12 w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          initial={{ x: "-100%" }}
          animate={{ x: "0%" }}
          transition={{ duration: 6, ease: "linear" }}
          className="w-full h-full bg-gradient-to-r from-blue-600 to-cyan-400"
        />
      </div>

      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px]" />
      </div>
    </motion.div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('cctv_dark_mode') === 'true');
  const [showSplash, setShowSplash] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inventoryMode, setInventoryMode] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(() => localStorage.getItem('cctv_custom_logo'));
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('cctv_products');
    return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
  });
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('cctv_clients');
    return saved ? JSON.parse(saved) : DEFAULT_CLIENTS;
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('cctv_expenses');
    return saved ? JSON.parse(saved) : [];
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showClientProfile, setShowClientProfile] = useState<Client | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [notifications, setNotifications] = useState<{id: number, text: string}[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('cctv_expense_categories');
    return saved ? JSON.parse(saved) : Object.values(ExpenseCategory);
  });

  const lastSyncedSettings = useRef({
    darkMode: isDarkMode,
    customLogo: customLogo,
    expenseCategories: JSON.stringify(expenseCategories)
  });
  const isSeeding = useRef(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      setIsInitialLoad(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listeners
  useEffect(() => {
    if (!user) {
      setProducts(DEFAULT_PRODUCTS);
      setClients(DEFAULT_CLIENTS);
      setExpenses([]);
      return;
    }

    const userId = user.uid;

    // User Settings
    const userDocRef = doc(db, 'users', userId);
    const unsubUser = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Update local state and ref to prevent redundant sync back
        if (data.darkMode !== undefined) {
          setIsDarkMode(data.darkMode);
          lastSyncedSettings.current.darkMode = data.darkMode;
        }
        if (data.customLogo !== undefined) {
          setCustomLogo(data.customLogo);
          lastSyncedSettings.current.customLogo = data.customLogo;
          if (data.customLogo) localStorage.setItem('cctv_custom_logo', data.customLogo);
          else localStorage.removeItem('cctv_custom_logo');
        }
        if (data.expenseCategories !== undefined) {
          setExpenseCategories(data.expenseCategories);
          lastSyncedSettings.current.expenseCategories = JSON.stringify(data.expenseCategories);
          localStorage.setItem('cctv_expense_categories', JSON.stringify(data.expenseCategories));
        }
        
        // Seed if not already seeded
        if (!data.seeded && !isSeeding.current) {
          seedUserData(userId);
        }
      } else {
        // Initialize user doc if it doesn't exist
        if (!isSeeding.current) {
          isSeeding.current = true;
          setDoc(userDocRef, { 
            darkMode: isDarkMode, 
            customLogo, 
            expenseCategories,
            seeded: true 
          }, { merge: true }).then(() => {
            seedUserData(userId);
          }).finally(() => {
            isSeeding.current = false;
          });
        }
      }
      setIsInitialLoad(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
      setIsInitialLoad(false);
    });

    // Products
    const productsRef = collection(db, 'users', userId, 'products');
    const unsubProducts = onSnapshot(query(productsRef, orderBy('name')), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data() } as Product));
      if (items.length > 0 || isInitialLoad === false) {
        setProducts(items);
        localStorage.setItem('cctv_products', JSON.stringify(items));
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/products`));

    // Clients
    const clientsRef = collection(db, 'users', userId, 'clients');
    const unsubClients = onSnapshot(query(clientsRef, orderBy('name')), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data() } as Client));
      if (items.length > 0 || isInitialLoad === false) {
        setClients(items);
        localStorage.setItem('cctv_clients', JSON.stringify(items));
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/clients`));

    // Expenses
    const expensesRef = collection(db, 'users', userId, 'expenses');
    const unsubExpenses = onSnapshot(query(expensesRef, orderBy('date', 'desc')), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data() } as Expense));
      if (items.length > 0 || isInitialLoad === false) {
        setExpenses(items);
        localStorage.setItem('cctv_expenses', JSON.stringify(items));
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/expenses`));

    return () => {
      unsubUser();
      unsubProducts();
      unsubClients();
      unsubExpenses();
    };
  }, [user]);

  // Sync Settings to Firestore (Only if changed by user)
  useEffect(() => {
    if (user && !isInitialLoad) {
      const categoriesJson = JSON.stringify(expenseCategories);
      
      // Only sync if values actually differ from what's in Firestore
      if (
        isDarkMode !== lastSyncedSettings.current.darkMode ||
        customLogo !== lastSyncedSettings.current.customLogo ||
        categoriesJson !== lastSyncedSettings.current.expenseCategories
      ) {
        const userId = user.uid;
        const userDocRef = doc(db, 'users', userId);
        
        // Update ref immediately to prevent multiple triggers
        lastSyncedSettings.current = {
          darkMode: isDarkMode,
          customLogo: customLogo,
          expenseCategories: categoriesJson
        };

        setDoc(userDocRef, { darkMode: isDarkMode, customLogo, expenseCategories }, { merge: true })
          .catch(error => {
            // If it fails, we might want to revert the ref, but usually quota errors are persistent
            handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
          });
      }
    }
  }, [isDarkMode, customLogo, expenseCategories, user, isInitialLoad]);

  // Dark Mode Class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Splash Screen Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setCustomLogo(base64);
        addNotification("Logo updated successfully!");
      };
      reader.readAsDataURL(file);
    } else if (!user) {
      addNotification("Please login to upload logo.");
    }
  };

  const addNotification = (text: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, text }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

  // --- Logic Functions ---

  const handleAddWork = async (clientId: number, description: string, amount: number) => {
    if (!user) {
      addNotification("Please login to add work.");
      return;
    }
    const userId = user.uid;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newWork: WorkHistory = {
      id: `WORK-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      description,
      amount,
      paid: 0
    };

    const updatedClient = {
      ...client,
      due: client.due + amount,
      works: client.works + 1,
      workHistory: [newWork, ...client.workHistory]
    };

    try {
      await setDoc(doc(db, 'users', userId, 'clients', String(clientId)), updatedClient);
      addNotification("Work added successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/clients/${clientId}`);
    }
  };

  const handleAddPayment = async (clientId: number, amount: number, type: 'Cash' | 'Bkash' | 'Bank', purpose: string = 'General Payment') => {
    if (!user) {
      addNotification("Please login to record payment.");
      return;
    }
    const userId = user.uid;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newPayment: PaymentHistory = {
      id: `PAY-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      amount,
      type,
      purpose
    };

    const updatedClient = {
      ...client,
      due: client.due - amount,
      totalPaid: client.totalPaid + amount,
      paymentHistory: [newPayment, ...client.paymentHistory]
    };

    try {
      await setDoc(doc(db, 'users', userId, 'clients', String(clientId)), updatedClient);
      addNotification("Payment recorded successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/clients/${clientId}`);
    }
  };

  const handleDeletePayment = async (clientId: number, paymentId: string) => {
    if (!user) {
      addNotification("Please login to delete payment.");
      return;
    }
    const userId = user.uid;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const payment = client.paymentHistory.find(p => p.id === paymentId);
    if (!payment) return;

    const updatedClient = {
      ...client,
      due: client.due + payment.amount,
      totalPaid: client.totalPaid - payment.amount,
      paymentHistory: client.paymentHistory.filter(p => p.id !== paymentId)
    };

    try {
      await setDoc(doc(db, 'users', userId, 'clients', String(clientId)), updatedClient);
      addNotification("Payment deleted!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/clients/${clientId}`);
    }
  };

  const handleDeleteWork = async (clientId: number, workId: string) => {
    if (!user) {
      addNotification("Please login to delete work.");
      return;
    }
    const userId = user.uid;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const work = client.workHistory.find(w => w.id === workId);
    if (!work) return;

    const updatedClient = {
      ...client,
      due: client.due - work.amount,
      works: client.works - 1,
      workHistory: client.workHistory.filter(w => w.id !== workId)
    };

    try {
      await setDoc(doc(db, 'users', userId, 'clients', String(clientId)), updatedClient);
      addNotification("Work deleted!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/clients/${clientId}`);
    }
  };

  const handleDeleteOrder = async (clientId: number, orderId: string) => {
    if (!user) {
      addNotification("Please login to delete order.");
      return;
    }
    const userId = user.uid;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const order = client.orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedClient = {
      ...client,
      due: client.due - order.total,
      orders: client.orders.filter(o => o.id !== orderId)
    };

    try {
      await setDoc(doc(db, 'users', userId, 'clients', String(clientId)), updatedClient);
      addNotification("Order deleted!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/clients/${clientId}`);
    }
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      addNotification("Out of stock!");
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
    addNotification(`${product.name} added to cart`);
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
    addNotification("Item removed from cart");
  };

  const updateCartQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const placeOrder = async (clientId: number, isPaid: boolean = false, paymentType: 'Cash' | 'Bkash' | 'Bank' = 'Cash') => {
    if (!user) {
      addNotification("Please login to place order.");
      return;
    }
    const userId = user.uid;
    const client = clients.find(c => c.id === clientId);
    if (!client || cart.length === 0) return;

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderId = `ORD-${Date.now()}`;
    const newOrder: Order = {
      id: orderId,
      date: new Date().toISOString().split('T')[0],
      items: [...cart],
      total,
      dueDate: null
    };

    // Update Client
    let updatedClient = {
      ...client,
      orders: [newOrder, ...client.orders],
      due: client.due + total
    };

    if (isPaid) {
      const newPayment: PaymentHistory = {
        id: `PAY-${Date.now()}`,
        date: new Date().toLocaleDateString(),
        amount: total,
        type: paymentType,
        purpose: `Product Order (${orderId})`
      };
      updatedClient = {
        ...updatedClient,
        due: updatedClient.due - total,
        totalPaid: updatedClient.totalPaid + total,
        paymentHistory: [newPayment, ...updatedClient.paymentHistory]
      };
    }

    try {
      // Update Client in Firestore
      await setDoc(doc(db, 'users', userId, 'clients', String(clientId)), updatedClient);

      // Update Stock in Firestore
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await updateDoc(doc(db, 'users', userId, 'products', String(product.id)), {
            stock: product.stock - item.quantity
          });
        }
      }

      generateWhatsAppMessage(client, cart, total, isPaid, paymentType);
      generatePDF(client, cart, total, isPaid, paymentType);

      setCart([]);
      setShowCart(false);
      addNotification(isPaid ? "Order placed & Payment recorded!" : "Order placed successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/orders/${orderId}`);
    }
  };

  const generateWhatsAppMessage = (client: Client, items: CartItem[], total: number, isPaid: boolean = false, paymentType: string = 'Cash') => {
    let message = `*CCTV Order Confirmation*\n\n`;
    message += `Client: ${client.name}\n`;
    message += `Phone: ${client.phone}\n`;
    message += `Date: ${new Date().toLocaleDateString()}\n`;
    message += `Status: ${isPaid ? `PAID (${paymentType})` : 'UNPAID'}\n\n`;
    message += `*Product List:*\n`;
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.name} x ${item.quantity} = ${formatCurrency(item.price * item.quantity)}\n`;
    });
    message += `\n*Total Amount: ${formatCurrency(total)}*\n\n`;
    message += `Thank you for choosing us!`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${client.phone}?text=${encoded}`, '_blank');
  };

  const generatePDF = (client: Client, items: CartItem[], total: number, isPaid: boolean = false, paymentType: string = 'Cash') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // --- Header ---
    // Blue background for header
    doc.setFillColor(37, 99, 235); // blue-600
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Logo if available
    if (customLogo) {
      try {
        doc.addImage(customLogo, 'PNG', margin, 10, 30, 30);
        // Company Name shifted
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('CCTV PRO SOLUTIONS', margin + 35, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Your Security, Our Priority', margin + 35, 32);
        doc.text('Phone: +880 1711 111111 | Email: support@cctvpro.com', margin + 35, 38);
      } catch (e) {
        // Fallback if logo fails
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('CCTV PRO SOLUTIONS', margin, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Your Security, Our Priority', margin, 32);
        doc.text('Phone: +880 1711 111111 | Email: support@cctvpro.com', margin, 38);
      }
    } else {
      // Company Name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('CCTV PRO SOLUTIONS', margin, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Your Security, Our Priority', margin, 32);
      doc.text('Phone: +880 1711 111111 | Email: support@cctvpro.com', margin, 38);
    }

    // Invoice Label
    doc.setFontSize(30);
    doc.text('INVOICE', pageWidth - margin - 50, 30);

    // --- Invoice Info ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', margin, 65);
    
    doc.setFont('helvetica', 'normal');
    doc.text(client.name, margin, 72);
    doc.text(client.address, margin, 78);
    doc.text(`Phone: ${client.phone}`, margin, 84);

    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE DETAILS:', pageWidth - margin - 60, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: INV-${Date.now().toString().slice(-6)}`, pageWidth - margin - 60, 72);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin - 60, 78);
    
    if (isPaid) {
      doc.setTextColor(22, 163, 74); // green-600
      doc.setFont('helvetica', 'bold');
      doc.text(`Status: PAID`, pageWidth - margin - 60, 84);
      doc.setFontSize(8);
      doc.text(`Method: ${paymentType}`, pageWidth - margin - 60, 89);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
    } else {
      doc.setTextColor(220, 38, 38); // red-600
      doc.setFont('helvetica', 'bold');
      doc.text(`Status: UNPAID`, pageWidth - margin - 60, 84);
      doc.setTextColor(0, 0, 0);
    }

    // --- Table ---
    const tableData = items.map((item, index) => [
      index + 1,
      item.name,
      item.quantity,
      formatCurrency(item.price).replace('BDT', '').trim(),
      formatCurrency(item.price * item.quantity).replace('BDT', '').trim()
    ]);

    autoTable(doc, {
      startY: 95,
      head: [['SL', 'DESCRIPTION', 'QTY', 'PRICE (BDT)', 'TOTAL (BDT)']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 'auto' },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 35 },
        4: { halign: 'right', cellWidth: 35 }
      },
      styles: {
        fontSize: 9,
        cellPadding: 5
      }
    });

    // --- Summary ---
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', pageWidth - margin - 60, finalY);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', pageWidth - margin - 60, finalY + 8);
    doc.text(formatCurrency(total).replace('BDT', '').trim(), pageWidth - margin - 10, finalY + 8, { align: 'right' });
    
    doc.text('Tax (0%):', pageWidth - margin - 60, finalY + 14);
    doc.text('0.00', pageWidth - margin - 10, finalY + 14, { align: 'right' });

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - margin - 60, finalY + 18, pageWidth - margin, finalY + 18);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('GRAND TOTAL:', pageWidth - margin - 60, finalY + 25);
    doc.text(formatCurrency(total), pageWidth - margin - 10, finalY + 25, { align: 'right' });

    // In Words
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`In Words: ${numberToWords(total)}`, margin, finalY + 35);

    // --- Footer ---
    const footerY = pageHeight - 40;
    
    // Signatures
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY, margin + 50, footerY);
    doc.line(pageWidth - margin - 50, footerY, pageWidth - margin, footerY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Customer Signature', margin + 25, footerY + 5, { align: 'center' });
    doc.text('Authorized Signature', pageWidth - margin - 25, footerY + 5, { align: 'center' });

    // Thank you message
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('THANK YOU FOR YOUR BUSINESS!', pageWidth / 2, pageHeight - 15, { align: 'center' });

    doc.save(`Invoice_${client.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  const generateClientProfilePDF = (client: Client) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);

    if (customLogo) {
      try {
        doc.addImage(customLogo, 'PNG', margin, 5, 30, 30);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('CLIENT PROFILE REPORT', margin + 35, 25);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on: ${new Date().toLocaleString()}`, margin + 35, 32);
      } catch (e) {
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('CLIENT PROFILE REPORT', margin, 25);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, 32);
      }
    } else {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('CLIENT PROFILE REPORT', margin, 25);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, 32);
    }

    // Client Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT INFORMATION', margin, 55);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${client.name}`, margin, 65);
    doc.text(`Phone: ${client.phone}`, margin, 72);
    doc.text(`Address: ${client.address}`, margin, 79);
    doc.text(`Status: ${client.status.toUpperCase()}`, margin, 86);
    doc.text(`Total Due: ${formatCurrency(client.due)}`, margin, 93);
    doc.text(`Total Paid: ${formatCurrency(client.totalPaid)}`, margin, 100);
    doc.text(`Warranty Expiry: ${client.warrantyExpiry || 'N/A'}`, margin, 107);

    // Work History Table
    doc.setFont('helvetica', 'bold');
    doc.text('WORK HISTORY', margin, 120);
    autoTable(doc, {
      startY: 125,
      head: [['Date', 'Description', 'Amount', 'Paid']],
      body: client.workHistory.map(w => [
        w.date,
        w.description,
        formatCurrency(w.amount),
        formatCurrency(w.paid)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });

    // Payment History Table
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT HISTORY', margin, finalY);
    autoTable(doc, {
      startY: finalY + 5,
      head: [['Date', 'Type', 'Purpose', 'Amount']],
      body: client.paymentHistory.map(p => [
        p.date,
        p.type,
        p.purpose || 'N/A',
        formatCurrency(p.amount)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] }
    });

    doc.save(`${client.name.replace(/\s+/g, '_')}_Profile.pdf`);
  };

  const generateInventoryPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);

    if (customLogo) {
      try {
        doc.addImage(customLogo, 'PNG', margin, 5, 30, 30);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('INVENTORY BACKUP REPORT', margin + 35, 25);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on: ${new Date().toLocaleString()}`, margin + 35, 32);
      } catch (e) {
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('INVENTORY BACKUP REPORT', margin, 25);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, 32);
      }
    } else {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('INVENTORY BACKUP REPORT', margin, 25);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, 32);
    }

    autoTable(doc, {
      startY: 50,
      head: [['#', 'Product Name', 'Category', 'Stock', 'Price', 'Value']],
      body: products.map((p, i) => [
        i + 1,
        p.name,
        p.category.toUpperCase(),
        p.stock,
        formatCurrency(p.price),
        formatCurrency(p.price * p.stock)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      columnStyles: {
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });

    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Inventory Value: ${formatCurrency(totalValue)}`, pageWidth - margin, finalY, { align: 'right' });

    doc.save(`Inventory_Backup_${new Date().toISOString().split('T')[0]}.pdf`);
    addNotification("Inventory PDF downloaded!");
  };

  // --- Views ---

  const seedUserData = async (userId: string) => {
    if (isSeeding.current) return;
    isSeeding.current = true;
    
    try {
      const batch = writeBatch(db);
      let hasChanges = false;

      // Seed Products
      const productsRef = collection(db, 'users', userId, 'products');
      const productsSnap = await getDocs(productsRef);
      if (productsSnap.empty) {
        for (const p of DEFAULT_PRODUCTS) {
          batch.set(doc(db, 'users', userId, 'products', String(p.id)), p);
        }
        hasChanges = true;
      }

      // Seed Clients
      const clientsRef = collection(db, 'users', userId, 'clients');
      const clientsSnap = await getDocs(clientsRef);
      if (clientsSnap.empty) {
        for (const c of DEFAULT_CLIENTS) {
          batch.set(doc(db, 'users', userId, 'clients', String(c.id)), c);
        }
        hasChanges = true;
      }

      // Mark as seeded
      batch.set(doc(db, 'users', userId), { seeded: true }, { merge: true });
      hasChanges = true;

      if (hasChanges) {
        await batch.commit();
      }
    } catch (error) {
      console.error("Error seeding user data:", error);
    } finally {
      isSeeding.current = false;
    }
  };

  const handleAddProduct = async (newProduct: Omit<Product, 'id'>) => {
    const productId = Date.now();
    const product: Product = {
      ...newProduct,
      id: productId
    };

    // Update local state immediately for responsiveness
    setProducts(prev => {
      const updated = [...prev, product];
      localStorage.setItem('cctv_products', JSON.stringify(updated));
      return updated;
    });
    setShowAddProduct(false);
    addNotification("Product added!");

    if (!user) return;
    
    const userId = user.uid;
    try {
      await setDoc(doc(db, 'users', userId, 'products', String(productId)), product);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/products/${productId}`);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    // Update local state immediately
    setProducts(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem('cctv_products', JSON.stringify(updated));
      return updated;
    });
    addNotification("Product deleted!");

    if (!user) return;
    
    const userId = user.uid;
    try {
      const docRef = doc(db, 'users', userId, 'products', String(id));
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/products/${id}`);
    }
  };

  const handleEditProduct = async (updatedProduct: Product) => {
    // Update local state immediately
    setProducts(prev => {
      const updated = prev.map(p => p.id === updatedProduct.id ? updatedProduct : p);
      localStorage.setItem('cctv_products', JSON.stringify(updated));
      return updated;
    });
    setShowEditProduct(null);
    addNotification("Product updated!");

    if (!user) return;
    
    const userId = user.uid;
    try {
      await setDoc(doc(db, 'users', userId, 'products', String(updatedProduct.id)), updatedProduct);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/products/${updatedProduct.id}`);
    }
  };

  const handleUpdateClientImage = async (clientId: number, image: string | null) => {
    // Update local state immediately
    setClients(prev => {
      const updated = prev.map(c => c.id === clientId ? { ...c, image: image || undefined } : c);
      localStorage.setItem('cctv_clients', JSON.stringify(updated));
      return updated;
    });
    addNotification(image ? "Profile picture updated!" : "Profile picture reset!");

    if (!user) return;
    
    const userId = user.uid;
    try {
      await updateDoc(doc(db, 'users', userId, 'clients', String(clientId)), {
        image: image || null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/clients/${clientId}`);
    }
  };

  const handleSetWarranty = async (clientId: number, expiryDate: string) => {
    // Update local state immediately
    setClients(prev => {
      const updated = prev.map(c => c.id === clientId ? { ...c, warrantyExpiry: expiryDate } : c);
      localStorage.setItem('cctv_clients', JSON.stringify(updated));
      return updated;
    });
    addNotification("Warranty updated!");

    if (!user) return;
    
    const userId = user.uid;
    try {
      await updateDoc(doc(db, 'users', userId, 'clients', String(clientId)), {
        warrantyExpiry: expiryDate
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/clients/${clientId}`);
    }
  };

  const handleDeleteClient = async (clientId: number) => {
    // Update local state immediately
    setClients(prev => {
      const updated = prev.filter(c => c.id !== clientId);
      localStorage.setItem('cctv_clients', JSON.stringify(updated));
      return updated;
    });
    setShowClientProfile(null);
    addNotification("Client deleted!");

    if (!user) return;
    
    const userId = user.uid;
    try {
      await deleteDoc(doc(db, 'users', userId, 'clients', String(clientId)));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}/clients/${clientId}`);
    }
  };

  const handleAddClient = async (newClient: Omit<Client, 'id' | 'works' | 'totalPaid' | 'workHistory' | 'paymentHistory' | 'orders' | 'due'>) => {
    const clientId = Date.now();
    const client: Client = {
      ...newClient,
      id: clientId,
      works: 0,
      totalPaid: 0,
      due: 0,
      workHistory: [],
      paymentHistory: [],
      orders: [],
      status: ClientStatus.ACTIVE
    };

    // Update local state immediately
    setClients(prev => {
      const updated = [...prev, client];
      localStorage.setItem('cctv_clients', JSON.stringify(updated));
      return updated;
    });
    setShowAddClient(false);
    addNotification("Client added!");

    if (!user) return;
    
    const userId = user.uid;
    try {
      await setDoc(doc(db, 'users', userId, 'clients', String(clientId)), client);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/clients/${clientId}`);
    }
  };

  const handleAddExpense = async (newExpense: Omit<Expense, 'id'>) => {
    const expenseId = `EXP-${Date.now()}`;
    const expense: Expense = {
      ...newExpense,
      id: expenseId
    };

    // Update local state immediately
    setExpenses(prev => {
      const updated = [expense, ...prev];
      localStorage.setItem('cctv_expenses', JSON.stringify(updated));
      return updated;
    });
    addNotification("Expense added!");

    if (!user) return;
    
    const userId = user.uid;
    try {
      await setDoc(doc(db, 'users', userId, 'expenses', expenseId), expense);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}/expenses/${expenseId}`);
    }
  };

  const Dashboard = () => {
    const totalClients = clients.length;
    const totalProducts = products.length;
    const totalDue = clients.reduce((sum, c) => sum + c.due, 0);
    const monthlyIncome = clients.reduce((sum, c) => sum + c.totalPaid, 0); // Simplified for demo
    
    const chartData = [
      { name: 'Jan', profit: 4000, expense: 2400 },
      { name: 'Feb', profit: 3000, expense: 1398 },
      { name: 'Mar', profit: 2000, expense: 9800 },
      { name: 'Apr', profit: 2780, expense: 3908 },
      { name: 'May', profit: 1890, expense: 4800 },
      { name: 'Jun', profit: 2390, expense: 3800 },
    ];

    return (
      <div className="space-y-6 pb-20">
        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                <Users size={20} />
              </div>
              <span className="text-xs text-gray-500 font-medium">Clients</span>
            </div>
            <h3 className="text-xl font-bold">{totalClients}</h3>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                <Package size={20} />
              </div>
              <span className="text-xs text-gray-500 font-medium">Products</span>
            </div>
            <h3 className="text-xl font-bold">{totalProducts}</h3>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                <DollarSign size={20} />
              </div>
              <span className="text-xs text-gray-500 font-medium">Income</span>
            </div>
            <h3 className="text-xl font-bold">{formatCurrency(monthlyIncome)}</h3>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600">
                <AlertTriangle size={20} />
              </div>
              <span className="text-xs text-gray-500 font-medium">Total Due</span>
            </div>
            <h3 className="text-xl font-bold text-red-500">{formatCurrency(totalDue)}</h3>
          </motion.div>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Package size={18} className="text-blue-500" />
            Quick Products
          </h3>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {products.slice(0, 5).map(product => (
              <div key={product.id} className="min-w-[140px] glass-card p-3 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mb-2 overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={24} className="text-gray-400" />
                  )}
                </div>
                <h4 className="text-[10px] font-bold line-clamp-1">{product.name}</h4>
                <p className="text-blue-600 text-[10px] font-bold">{formatCurrency(product.price)}</p>
                <button 
                  onClick={() => addToCart(product)}
                  className="mt-2 w-full py-1 bg-blue-600 text-white rounded text-[10px] font-bold"
                >
                  Add
                </button>
              </div>
            ))}
            <button 
              onClick={() => setActiveTab('products')}
              className="min-w-[100px] glass-card p-3 flex flex-col items-center justify-center text-center text-blue-600"
            >
              <ChevronRight size={24} />
              <span className="text-[10px] font-bold">View All</span>
            </button>
          </div>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-500" />
            Financial Overview
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="profit" stroke="#3b82f6" fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-4">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            Stock Alerts
          </h3>
          <div className="space-y-3">
            {products.filter(p => p.stock < 5).map(p => (
              <div key={p.id} className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900/20">
                <span className="text-sm font-medium">{p.name}</span>
                <span className={cn("text-xs font-bold px-2 py-1 rounded-full", p.stock <= 3 ? "bg-red-100 text-red-600 animate-blink" : "bg-orange-100 text-orange-600")}>
                  {p.stock} left
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const ClientList = () => {
    const [search, setSearch] = useState('');
    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

    return (
      <div className="space-y-4 pb-20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search clients..." 
            className="w-full pl-10 pr-4 py-3 glass-card focus:ring-2 focus:ring-blue-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {filteredClients.map((client, idx) => (
            <motion.div 
              key={client.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setShowClientProfile(client)}
              className="glass-card p-4 flex justify-between items-center cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-lg">
                  {client.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-sm">{client.name}</h4>
                  <p className="text-xs text-gray-500">{client.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn("text-xs font-bold px-2 py-1 rounded-full inline-block", 
                  client.status === ClientStatus.ACTIVE ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                )}>
                  {client.status.toUpperCase()}
                </p>
                <p className="text-xs font-bold mt-1 text-gray-700 dark:text-gray-300">Due: {formatCurrency(client.due)}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <button 
          onClick={() => setShowAddClient(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center btn-ripple z-40"
        >
          <Plus size={28} />
        </button>
      </div>
    );
  };



  const ClientProfile = ({ 
    client, 
    onClose,
    onUpdateImage,
    onSetWarranty,
    onDeleteClient
  }: { 
    client: Client, 
    onClose: () => void,
    onUpdateImage: (id: number, img: string | null) => void,
    onSetWarranty: (id: number, date: string) => void,
    onDeleteClient: (id: number) => void
  }) => {
    const [showAddWork, setShowAddWork] = useState(false);
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Use the latest client data from the clients array
    const currentClient = clients.find(c => c.id === client.id) || client;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => onUpdateImage(currentClient.id, reader.result as string);
        reader.readAsDataURL(file);
      }
    };

    return (
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="fixed inset-0 bg-gray-50 dark:bg-slate-950 z-50 overflow-y-auto"
      >
        <div className="p-4 flex items-center gap-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
            <ArrowLeft size={24} />
          </button>
          <h2 className="font-bold text-lg">Client Profile</h2>
        </div>

        <div className="p-4 space-y-6 pb-24">
          <div className="glass-card p-6 flex flex-col items-center text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-20 bg-blue-600/10 -z-10" />
            
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold mb-4 shadow-2xl border-4 border-white dark:border-slate-900 overflow-hidden">
                {currentClient.image ? (
                  <img src={currentClient.image} alt={currentClient.name} className="w-full h-full object-cover" />
                ) : (
                  currentClient.name[0]
                )}
              </div>
              
              <div className="absolute bottom-4 right-0 flex gap-1">
                <label className="w-8 h-8 bg-white dark:bg-slate-800 text-blue-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-blue-50 transition-colors border border-gray-100 dark:border-slate-700">
                  <Plus size={16} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
                {currentClient.image && (
                  <button 
                    onClick={() => onUpdateImage(currentClient.id, null)}
                    className="w-8 h-8 bg-white dark:bg-slate-800 text-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 transition-colors border border-gray-100 dark:border-slate-700"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <h3 className="text-xl font-bold">{currentClient.name}</h3>
            <p className="text-gray-500 text-sm">{currentClient.phone}</p>
            <p className="text-gray-500 text-xs mt-1">{currentClient.address}</p>
            
            <div className="grid grid-cols-3 gap-4 w-full mt-6">
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Due</p>
                <p className="text-sm font-bold text-red-500">{formatCurrency(currentClient.due)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Works</p>
                <p className="text-sm font-bold">{currentClient.works}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Paid</p>
                <p className="text-sm font-bold text-green-500">{formatCurrency(currentClient.totalPaid)}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setShowAddWork(true)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 btn-ripple"
            >
              <Plus size={16} /> Add Work
            </button>
            <button 
              onClick={() => setShowAddPayment(true)}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 btn-ripple"
            >
              <Wallet size={16} /> Payment
            </button>
          </div>

          <div className="glass-card p-4 rounded-3xl border border-gray-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-600" /> Warranty Status
              </h4>
              <input 
                type="date" 
                className="text-xs bg-gray-50 dark:bg-slate-800 border-none rounded-lg p-1 outline-none"
                value={currentClient.warrantyExpiry || ''}
                onChange={(e) => onSetWarranty(currentClient.id, e.target.value)}
              />
            </div>
            {currentClient.warrantyExpiry ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">Expires on: <span className="font-bold text-blue-600">{currentClient.warrantyExpiry}</span></p>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-600 text-[8px] font-black rounded-full uppercase">Active</span>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No warranty registered for this client.</p>
            )}
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => generateWhatsAppMessage(currentClient, [], 0)} // Just for demo, usually opens chat
              className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 btn-ripple"
            >
              <MessageSquare size={16} /> WhatsApp
            </button>
            <button 
              onClick={() => generateClientProfilePDF(currentClient)}
              className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 btn-ripple"
            >
              <Download size={16} /> PDF Profile
            </button>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Wrench size={18} className="text-blue-500" /> Work History
            </h4>
            {currentClient.workHistory.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4">No work history found</p>
            ) : (
              currentClient.workHistory.map(work => (
                <div key={work.id} className="glass-card p-3 group">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold">{work.description}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{work.date}</span>
                      <button 
                        onClick={() => handleDeleteWork(currentClient.id, work.id)}
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs">Amount: {formatCurrency(work.amount)}</span>
                    <span className="text-xs text-green-600 font-bold">Paid: {formatCurrency(work.paid)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Wallet size={18} className="text-green-500" /> Payment History
            </h4>
            {currentClient.paymentHistory.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4">No payments found</p>
            ) : (
              currentClient.paymentHistory.map(payment => (
                <div key={payment.id} className="glass-card p-3 flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-xs font-bold">{payment.type}</p>
                      <p className="text-[10px] text-gray-500">{payment.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-green-600">+{formatCurrency(payment.amount)}</span>
                    <button 
                      onClick={() => handleDeletePayment(currentClient.id, payment.id)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <ShoppingCart size={18} className="text-purple-500" /> Order History
            </h4>
            {currentClient.orders.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4">No orders found</p>
            ) : (
              currentClient.orders.map(order => (
                <div key={order.id} className="glass-card p-3 group">
                  <div className="flex justify-between border-b dark:border-slate-800 pb-2 mb-2">
                    <div>
                      <span className="text-xs font-bold">{order.id}</span>
                      {order.dueDate && (
                        <p className="text-[8px] text-red-500 font-bold">Due Date: {order.dueDate}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{order.date}</span>
                      <button 
                        onClick={() => handleDeleteOrder(currentClient.id, order.id)}
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-[10px]">
                        <span>{item.name} x {item.quantity}</span>
                        <span>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-right mt-2 pt-2 border-t dark:border-slate-800">
                    <span className="text-xs font-bold text-blue-600">Total: {formatCurrency(order.total)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-8 border-t dark:border-slate-800">
            {showDeleteConfirm ? (
              <div className="glass-card p-4 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30">
                <p className="text-xs font-bold text-red-600 mb-3 text-center">Are you sure you want to delete this client? All history will be lost.</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onDeleteClient(currentClient.id)}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold text-xs"
                  >
                    Yes, Delete
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-lg font-bold text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/30"
              >
                <Trash2 size={16} /> Delete Client
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showAddWork && (
            <AddWorkModal clientId={client.id} onClose={() => setShowAddWork(false)} />
          )}
          {showAddPayment && (
            <AddPaymentModal clientId={client.id} onClose={() => setShowAddPayment(false)} />
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const AddWorkModal = ({ clientId, onClose }: { clientId: number, onClose: () => void }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!description || !amount) return;
      handleAddWork(clientId, description, Number(amount));
      onClose();
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-2xl font-black mb-6">Add New Work</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Description</label>
              <input 
                type="text" 
                placeholder="e.g. Camera Installation" 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Amount</label>
              <input 
                type="number" 
                placeholder="0.00" 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/20 mt-4"
            >
              Save Work
            </button>
          </form>
        </motion.div>
      </motion.div>
    );
  };

  const AddPaymentModal = ({ clientId, onClose }: { clientId: number, onClose: () => void }) => {
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'Cash' | 'Bkash' | 'Bank'>('Cash');
    const [purpose, setPurpose] = useState('General Payment');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!amount) return;
      handleAddPayment(clientId, Number(amount), type, purpose);
      onClose();
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-2xl font-black mb-6">Record Payment</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Amount</label>
              <input 
                type="number" 
                placeholder="0.00" 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Purpose</label>
              <select 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20 appearance-none"
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
              >
                <option value="General Payment">General Payment</option>
                <option value="Product Payment">Product Payment</option>
                <option value="Service/Work Payment">Service/Work Payment</option>
                <option value="Advance Payment">Advance Payment</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Payment Method</label>
              <select 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20 appearance-none"
                value={type}
                onChange={e => setType(e.target.value as any)}
              >
                <option value="Cash">Cash</option>
                <option value="Bkash">Bkash</option>
                <option value="Bank">Bank</option>
              </select>
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-green-500/20 mt-4"
            >
              Record Payment
            </button>
          </form>
        </motion.div>
      </motion.div>
    );
  };

  const CartModal = () => {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const [orderClientId, setOrderClientId] = useState<number | null>(null);
    const [isPaid, setIsPaid] = useState(false);
    const [paymentType, setPaymentType] = useState<'Cash' | 'Bkash' | 'Bank'>('Cash');

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end justify-center"
        onClick={() => setShowCart(false)}
      >
        <motion.div 
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="w-full max-w-[450px] max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-[40px] shadow-2xl overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-8 pb-4">
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full mx-auto mb-8" />
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tight">Checkout</h2>
                <p className="text-xs text-gray-500 font-medium">Review your premium selection</p>
              </div>
              <button 
                onClick={() => setShowCart(false)}
                className="w-10 h-10 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Minus size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-4 hide-scrollbar">
            {cart.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingCart size={40} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your cart is empty</h3>
                <p className="text-sm text-gray-500 mt-2">Add some premium gear to get started</p>
                <button 
                  onClick={() => setShowCart(false)}
                  className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 dark:shadow-none"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  {cart.map(item => (
                    <motion.div 
                      layout
                      key={item.productId} 
                      className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-800/50 rounded-3xl border border-gray-100 dark:border-slate-800"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm">
                          <Package size={24} className="text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">{item.name}</h4>
                          <p className="text-[10px] text-blue-600 font-black">{formatCurrency(item.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                        <button 
                          onClick={() => updateCartQuantity(item.productId, -1)}
                          className="w-8 h-8 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center justify-center text-gray-400 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateCartQuantity(item.productId, 1)}
                          className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Assign to Client</h3>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select 
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-3xl outline-none text-sm font-bold appearance-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      onChange={(e) => setOrderClientId(Number(e.target.value))}
                      value={orderClientId || ''}
                    >
                      <option value="">Select a premium client...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Payment Status</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsPaid(false)}
                      className={cn(
                        "flex-1 py-3 rounded-2xl font-bold text-xs transition-all border",
                        !isPaid ? "bg-red-50 text-red-600 border-red-200" : "bg-gray-50 text-gray-400 border-gray-100"
                      )}
                    >
                      Unpaid (Add to Due)
                    </button>
                    <button 
                      onClick={() => setIsPaid(true)}
                      className={cn(
                        "flex-1 py-3 rounded-2xl font-bold text-xs transition-all border",
                        isPaid ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-50 text-gray-400 border-gray-100"
                      )}
                    >
                      Paid Now
                    </button>
                  </div>

                  {isPaid && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Payment Method</p>
                      <div className="flex gap-2">
                        {['Cash', 'Bkash', 'Bank'].map(type => (
                          <button 
                            key={type}
                            onClick={() => setPaymentType(type as any)}
                            className={cn(
                              "flex-1 py-2.5 rounded-xl font-bold text-[10px] transition-all border",
                              paymentType === type ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-gray-50 text-gray-400 border-gray-100"
                            )}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-8 bg-gray-50 dark:bg-slate-800/30 border-t dark:border-slate-800">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Investment</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(total)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-bold">Items</p>
                  <p className="text-sm font-black text-blue-600">{cart.reduce((s, i) => s + i.quantity, 0)}</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  disabled={!orderClientId}
                  onClick={() => {
                    const client = clients.find(c => c.id === orderClientId);
                    if (client) generateWhatsAppMessage(client, cart, total, isPaid, paymentType);
                  }}
                  className="flex-1 py-5 bg-emerald-500 text-white rounded-[24px] font-black text-sm shadow-2xl shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare size={20} />
                  WhatsApp Quote
                </motion.button>

                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  disabled={!orderClientId}
                  onClick={() => orderClientId && placeOrder(orderClientId, isPaid, paymentType)}
                  className="flex-[1.5] py-5 bg-blue-600 text-white rounded-[24px] font-black text-sm shadow-2xl shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Confirm & Order
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    );
  };

  const AIAssistantPage = () => {
    const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [editingImage, setEditingImage] = useState<string | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedResult, setEditedResult] = useState<string | null>(null);

    const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }), []);

    const handleSend = async () => {
      if (!input.trim()) return;
      const userMsg = input.trim();
      setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
      setInput('');
      setIsTyping(true);

      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: userMsg,
          config: {
            systemInstruction: `You are the official AI Assistant for CCTV PRO. 
            Company Details:
            - Name: CCTV PRO
            - Address: Jatrabari Sohid Faruk road Dhaka 1204
            - Phone: 01817681233
            - Services: CCTV installation, maintenance, security solutions, NVR/DVR setup, IP cameras.
            Answer questions about the company, security systems, and general inquiries politely and professionally.`,
          },
        });
        setMessages(prev => [...prev, { role: 'assistant', text: response.text || "I'm sorry, I couldn't process that." }]);
      } catch (error) {
        setMessages(prev => [...prev, { role: 'assistant', text: "Error connecting to AI service." }]);
      } finally {
        setIsTyping(false);
      }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setEditingImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };

    const handleEditImage = async () => {
      if (!editingImage || !editPrompt.trim()) return;
      setIsEditing(true);
      try {
        const base64Data = editingImage.split(',')[1];
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: "image/png" } },
              { text: editPrompt }
            ]
          }
        });

        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            setEditedResult(`data:image/png;base64,${part.inlineData.data}`);
            break;
          }
        }
      } catch (error) {
        alert("Error editing image.");
      } finally {
        setIsEditing(false);
      }
    };

    return (
      <div className="space-y-6 pb-24">
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
              <Sparkles size={24} />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold">AI Assistant</h2>
              <p className="text-xs text-gray-500">Ask anything or edit photos</p>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto p-2">
            {messages.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                How can I help you today?
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about CCTV PRO..."
              className="flex-1 bg-gray-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              <Send size={20} />
            </button>
          </div>
        </div>

        {/* Image Editor */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <ImageIcon size={20} className="text-purple-500" />
            AI Image Editor
          </h3>
          
          {!editingImage ? (
            <label className="block w-full border-2 border-dashed border-gray-200 dark:border-slate-800 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
              <ImageIcon size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">Upload a photo to edit</p>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden border dark:border-slate-800">
                <img src={editedResult || editingImage} alt="To edit" className="w-full h-auto max-h-[300px] object-contain bg-black/5" />
                <button 
                  onClick={() => {setEditingImage(null); setEditedResult(null);}}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full backdrop-blur-md"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="e.g., Change background to sunset..."
                  className="flex-1 bg-gray-50 dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={handleEditImage}
                  disabled={!editPrompt.trim() || isEditing}
                  className="p-3 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isEditing ? <RefreshCcw size={20} className="animate-spin" /> : <Wand2 size={20} />}
                  <span className="text-xs font-bold">Edit</span>
                </button>
              </div>
              
              {editedResult && (
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = editedResult;
                    link.download = 'edited_image.png';
                    link.click();
                  }}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                >
                  <Download size={18} /> Download Original (No Watermark)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const MePage = ({ 
    isDarkMode, 
    setIsDarkMode, 
    customLogo, 
    setCustomLogo, 
    onBackup, 
    onOpenCalculator,
    user
  }: { 
    isDarkMode: boolean, 
    setIsDarkMode: (v: boolean) => void, 
    customLogo: string | null, 
    setCustomLogo: (v: string | null) => void, 
    onBackup: () => void, 
    onOpenCalculator: () => void,
    user: FirebaseUser | null
  }) => {
    const importAppData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          const userId = user.uid;
          
          if (data.products) {
            const products = JSON.parse(data.products);
            for (const p of products) {
              await setDoc(doc(db, 'users', userId, 'products', String(p.id)), p);
            }
          }
          if (data.clients) {
            const clients = JSON.parse(data.clients);
            for (const c of clients) {
              await setDoc(doc(db, 'users', userId, 'clients', String(c.id)), c);
            }
          }
          if (data.expenses) {
            const expenses = JSON.parse(data.expenses);
            for (const ex of expenses) {
              await setDoc(doc(db, 'users', userId, 'expenses', String(ex.id)), ex);
            }
          }
          if (data.customLogo) setCustomLogo(data.customLogo);
          if (data.darkMode !== undefined) setIsDarkMode(data.darkMode);
          
          alert("Data restored to cloud successfully!");
        } catch (err) {
          alert("Invalid backup file.");
        }
      };
      reader.readAsText(file);
    };

    const shareApp = () => {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      alert("App link copied to clipboard! You can now share it with others.");
    };

    return (
      <div className="space-y-6 pb-20">
        <div className="glass-card p-6 flex flex-col items-center text-center">
          {!user ? (
            <div className="space-y-4 w-full">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                <User size={40} />
              </div>
              <h3 className="text-xl font-bold">Welcome to CCTV PRO</h3>
              <p className="text-gray-500 text-sm">Login to sync your data to the cloud.</p>
              <button 
                onClick={loginWithGoogle}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"
              >
                <Smartphone size={20} /> Login with Google
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-slate-800 text-white flex items-center justify-center text-4xl font-bold mb-4 border-4 border-white shadow-2xl overflow-hidden">
                  {customLogo ? (
                    <img src={customLogo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    user.photoURL ? <img src={user.photoURL} alt="User" className="w-full h-full object-cover" /> : "AD"
                  )}
                </div>
                <label className="absolute bottom-4 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-colors">
                  <Plus size={16} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </label>
              </div>
              <h3 className="text-xl font-bold">{user.displayName || 'Admin Dashboard'}</h3>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <div className="flex gap-4 mt-2">
                <p className="text-[10px] text-blue-600 cursor-pointer" onClick={() => setCustomLogo(null)}>Reset Logo</p>
                <p className="text-[10px] text-red-600 cursor-pointer font-bold" onClick={logout}>Logout</p>
              </div>
            </>
          )}
          
          <div className="grid grid-cols-2 gap-4 w-full mt-8">
            <button className="p-4 glass-card flex flex-col items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
              <ShieldCheck className="text-blue-500" />
              <span className="text-xs font-bold">Security</span>
            </button>
            <button className="p-4 glass-card flex flex-col items-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors">
              <FileText className="text-purple-500" />
              <span className="text-xs font-bold">Reports</span>
            </button>
          </div>
        </div>

        {/* Company Information */}
        <div className="glass-card p-6 space-y-4">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Company Information</h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                <Construction size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-900 dark:text-white">Address</p>
                <p className="text-xs text-gray-500">Jatrabari Sohid Faruk road Dhaka 1204</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-lg">
                <Smartphone size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-900 dark:text-white">Phone</p>
                <p className="text-xs text-gray-500">01817681233</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 grid grid-cols-3 gap-3 border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <button 
              onClick={shareApp}
              className="flex flex-col items-center gap-1 p-2"
            >
              <Share2 size={18} className="text-blue-500" />
              <span className="text-[8px] font-bold">Share Link</span>
            </button>
            <label className="flex flex-col items-center gap-1 p-2 cursor-pointer">
              <RefreshCcw size={18} className="text-amber-500" />
              <span className="text-[8px] font-bold">Restore</span>
              <input type="file" className="hidden" accept=".json" onChange={importAppData} />
            </label>
            <button 
              onClick={onBackup}
              className="flex flex-col items-center gap-1 p-2"
            >
              <Database size={18} className="text-slate-500" />
              <span className="text-[8px] font-bold">Inventory</span>
            </button>
          </div>

        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b dark:border-slate-800 font-bold text-sm">Company Rules</div>
          <div className="p-4 space-y-3">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Warranty is valid only with original invoice.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">No return after 7 days of installation.</p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Service charge applies for out-of-warranty visits.</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 space-y-4">
          <h4 className="font-bold text-sm">System Tools</h4>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={onOpenCalculator}
              className="p-3 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center gap-2 text-xs font-bold"
            >
              <Calculator size={16} /> Calculator
            </button>
            <button 
              onClick={onBackup}
              className="p-3 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center gap-2 text-xs font-bold"
            >
              <RefreshCcw size={16} /> Backup
            </button>
          </div>
        </div>
      </div>
    );
  };

  const WarrantyPage = () => {
    return (
      <div className="space-y-4 pb-20">
        <h3 className="text-lg font-bold">Warranty Management</h3>
        {clients.map(client => (
          <div key={client.id} className="glass-card p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-sm">{client.name}</h4>
                <p className="text-[10px] text-gray-500">Expiry: {client.warrantyExpiry || 'N/A'}</p>
              </div>
              <ShieldCheck className={cn(
                "text-lg",
                new Date(client.warrantyExpiry || '') > new Date() ? "text-green-500" : "text-red-500"
              )} />
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full" 
                style={{ width: client.warrantyExpiry ? '60%' : '0%' }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const ExpensePage = () => {
    const [showAdd, setShowAdd] = useState(false);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
      <div className="space-y-4 pb-20">
        <div className="glass-card p-6 bg-gradient-to-br from-red-500 to-orange-600 text-white">
          <p className="text-xs font-bold uppercase opacity-80">Total Expenses</p>
          <h2 className="text-3xl font-bold mt-1">{formatCurrency(totalExpenses)}</h2>
        </div>

        <div className="flex justify-between items-center">
          <h3 className="font-bold">Recent Expenses</h3>
          <button 
            onClick={() => setShowAdd(true)}
            className="p-2 bg-blue-600 text-white rounded-lg"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {expenses.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm italic">No expenses recorded</p>
          ) : (
            expenses.map(exp => (
              <div key={exp.id} className="glass-card p-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-600">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold">{exp.category}</p>
                    <p className="text-[10px] text-gray-500">{exp.date} • {exp.description}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-red-500">-{formatCurrency(exp.amount)}</span>
              </div>
            ))
          )}
        </div>

        <AnimatePresence>
          {showAdd && (
            <AddExpenseModal onClose={() => setShowAdd(false)} />
          )}
        </AnimatePresence>
      </div>
    );
  };

  const AddClientModal = ({ onClose }: { onClose: () => void }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name || !phone) return;
      handleAddClient({
        name,
        phone,
        address,
        status: ClientStatus.ACTIVE
      });
      onClose();
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-2xl font-black mb-6">Add New Client</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Full Name</label>
              <input 
                type="text" 
                placeholder="Enter client name" 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Phone Number</label>
              <input 
                type="tel" 
                placeholder="e.g. 017XXXXXXXX" 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Address</label>
              <textarea 
                placeholder="Enter client address" 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20 min-h-[80px]"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/20 mt-4"
            >
              Add Client
            </button>
          </form>
        </motion.div>
      </motion.div>
    );
  };

  const AddExpenseModal = ({ onClose }: { onClose: () => void }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<string>(expenseCategories[0] || 'Other');
    const [newCategory, setNewCategory] = useState('');
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!amount || !description) return;
      
      let finalCategory = category;
      if (showNewCategoryInput && newCategory.trim()) {
        finalCategory = newCategory.trim();
        if (!expenseCategories.includes(finalCategory)) {
          setExpenseCategories(prev => [...prev, finalCategory]);
        }
      }

      handleAddExpense({
        amount: Number(amount),
        description,
        category: finalCategory,
        date: new Date().toLocaleDateString()
      });
      onClose();
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-2xl font-black mb-6">Add Expense</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Amount</label>
              <input 
                type="number" 
                placeholder="0.00" 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Description</label>
              <input 
                type="text" 
                placeholder="e.g. Office Rent" 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center px-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                <button 
                  type="button"
                  onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                  className="text-[10px] font-bold text-blue-600 uppercase tracking-widest"
                >
                  {showNewCategoryInput ? 'Select Existing' : '+ New Category'}
                </button>
              </div>
              
              {showNewCategoryInput ? (
                <input 
                  type="text" 
                  placeholder="Enter new category" 
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  required
                />
              ) : (
                <select 
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20 appearance-none"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {expenseCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/20 mt-4"
            >
              Save Expense
            </button>
          </form>
        </motion.div>
      </motion.div>
    );
  };

  const AddProductModal = () => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [category, setCategory] = useState('indoor');
    const [image, setImage] = useState<string | null>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setImage(reader.result as string);
        reader.readAsDataURL(file);
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name || !price || !stock) return;
      handleAddProduct({
        name,
        price: Number(price),
        stock: Number(stock),
        category,
        image: image || undefined
      });
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={() => setShowAddProduct(false)}
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-2xl font-black mb-6">New Product</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center mb-4">
              <label className="w-24 h-24 rounded-2xl bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative">
                {image ? (
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Plus size={24} className="text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-400 mt-1">Photo</span>
                  </>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Product Name</label>
              <input 
                type="text" 
                placeholder="e.g. Hikvision 2MP Dome" 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Price</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Stock</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Category</label>
              <select 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20 appearance-none"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="indoor">Indoor Camera</option>
                <option value="outdoor">Outdoor Camera</option>
                <option value="nvr">NVR/DVR</option>
                <option value="accessories">Accessories</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="button" 
                onClick={() => setShowAddProduct(false)}
                className="flex-1 py-4 bg-gray-50 dark:bg-slate-800 text-gray-500 rounded-2xl font-bold text-sm"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 dark:shadow-none"
              >
                Add Product
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    );
  };



  // --- Main Render ---

  return (
    <div className="max-w-[450px] mx-auto min-h-screen relative shadow-2xl overflow-hidden bg-gray-50 dark:bg-slate-950">
      <AnimatePresence>
        {showSplash && <SplashScreen customLogo={customLogo} />}
        {showAddProduct && (
          <AddProductModal 
            onClose={() => setShowAddProduct(false)} 
            onAdd={handleAddProduct} 
          />
        )}
        {showEditProduct && (
          <EditProductModal 
            product={showEditProduct}
            onClose={() => setShowEditProduct(null)} 
            onSave={handleEditProduct} 
          />
        )}
      </AnimatePresence>

      {/* Notifications */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[400px] px-4 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div 
              key={n.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl mb-2 flex items-center gap-3"
            >
              <Bell size={18} className="text-blue-400" />
              <span className="text-sm font-medium">{n.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <header className="p-4 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-30 border-b dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden">
            {customLogo ? (
              <img src={customLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <ShieldCheck size={24} />
            )}
          </div>
          <div>
            <h1 className="font-bold text-sm leading-none">CCTV Pro</h1>
            <p className="text-[10px] text-gray-500 font-medium">Management System</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 glass-card rounded-full transition-all duration-300 text-gray-600 dark:text-gray-300"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={() => setShowCart(true)}
            className="p-2 glass-card rounded-full text-gray-600 dark:text-gray-300 relative"
          >
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                products={products}
                clients={clients}
                expenses={expenses}
                formatCurrency={formatCurrency}
              />
            )}
            {activeTab === 'clients' && (
              <ClientList 
                clients={clients}
                setShowClientProfile={setShowClientProfile}
                formatCurrency={formatCurrency}
              />
            )}
            {activeTab === 'products' && (
              <ProductList 
                products={products}
                inventoryMode={inventoryMode}
                setInventoryMode={setInventoryMode}
                setShowAddProduct={setShowAddProduct}
                setSelectedProduct={setSelectedProduct}
                handleDeleteProduct={handleDeleteProduct}
                onEditProduct={setShowEditProduct}
                addToCart={addToCart}
                isDarkMode={isDarkMode}
                formatCurrency={formatCurrency}
              />
            )}
            {activeTab === 'expenses' && (
              <ExpensePage />
            )}
            {activeTab === 'ai' && (
              <AIAssistantPage />
            )}
            {activeTab === 'warranty' && <WarrantyPage clients={clients} />}
            {activeTab === 'me' && (
              <MePage 
                isDarkMode={isDarkMode}
                setIsDarkMode={setIsDarkMode}
                customLogo={customLogo}
                setCustomLogo={setCustomLogo}
                onBackup={generateInventoryPDF}
                onOpenCalculator={() => setShowCalculator(true)}
                user={user}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t dark:border-slate-800 px-2 py-3 flex justify-around items-center z-40">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
          { id: 'clients', icon: Users, label: 'Clients' },
          { id: 'products', icon: ShoppingCart, label: 'Order' },
          { id: 'expenses', icon: Wallet, label: 'Cash' },
          { id: 'ai', icon: Sparkles, label: 'AI' },
          { id: 'warranty', icon: ShieldCheck, label: 'Safety' },
          { id: 'me', icon: User, label: 'Me' },
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 px-3 py-1 rounded-xl",
              activeTab === item.id ? "text-blue-600 scale-110" : "text-gray-400"
            )}
          >
            <item.icon size={activeTab === item.id ? 24 : 20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-bold">{item.label}</span>
            {activeTab === item.id && (
              <motion.div layoutId="nav-indicator" className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />
            )}
          </button>
        ))}
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {showCart && (
          <CartModal />
        )}
        {selectedProduct && (
          <ProductDetailsModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
            addToCart={addToCart}
            formatCurrency={formatCurrency}
          />
        )}
        {showClientProfile && (
          <ClientProfile 
            client={showClientProfile} 
            onClose={() => setShowClientProfile(null)} 
            onUpdateImage={handleUpdateClientImage}
            onSetWarranty={handleSetWarranty}
            onDeleteClient={handleDeleteClient}
          />
        )}
        {showAddClient && (
          <AddClientModal onClose={() => setShowAddClient(false)} />
        )}
        {showCalculator && (
          <CalculatorModal onClose={() => setShowCalculator(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
