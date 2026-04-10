import React, { useState, useEffect, useMemo, Component, useRef } from 'react';
import Fuse from 'fuse.js';
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
  CloudUpload,
  Info,
  Lock,
  Key,
  Edit2,
  Calendar,
  Image,
  Music,
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
  OrderStatus,
  WorkHistory,
  PaymentHistory,
  PublicOrder
} from './types';

// --- Default Data ---
const DEFAULT_PRODUCTS: Product[] = [
  { id: 1, name: 'Ranger 2 Pro 3MP', price: 3200, stock: 15, category: 'indoor', badge: 'new', description: '360° coverage with AI human detection and privacy mode.' },
  { id: 2, name: 'Ranger 2 Pro 5MP', price: 4500, stock: 8, category: 'indoor', badge: 'hot', description: 'Ultra HD 5MP resolution with smart tracking and two-way talk.' },
  { id: 3, name: 'Bulb Cam 3MP', price: 2800, stock: 3, category: 'indoor', badge: 'lowstock', description: 'Easy installation in standard bulb socket with full color night vision.' },
  { id: 4, name: 'NVR 8CH', price: 8500, stock: 5, category: 'nvr', description: '8-channel network video recorder with H.265+ compression.' },
  { id: 5, name: 'Outdoor Bullet 5MP', price: 5200, stock: 12, category: 'outdoor', badge: 'new', description: 'IP67 weatherproof outdoor camera with 30m IR range.' }
];

const DEFAULT_CLIENTS: Client[] = [
  { 
    id: 1, name: 'Rahim Mia', phone: '8801711111111', address: 'Dhaka', status: ClientStatus.ACTIVE, 
    due: 5000, works: 2, totalPaid: 10000, workHistory: [], paymentHistory: [], orders: [],
    warrantyExpiry: '2026-12-31',
    installationDate: '2024-01-15',
    notes: 'Standard 4-camera setup with NVR.'
  },
  { 
    id: 2, name: 'Karim Hossain', phone: '8801822222222', address: 'Chittagong', status: ClientStatus.DUE, 
    due: 12000, works: 1, totalPaid: 0, workHistory: [], paymentHistory: [], orders: [],
    warrantyExpiry: '2025-06-15',
    installationDate: '2024-06-15',
    notes: 'Requested additional outdoor bullet cam next month.'
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
  where,
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
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Four pieces animation background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-600/10 border-r border-b border-white/10"
        />
        <div 
          className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/10 border-l border-b border-white/10"
        />
        <div 
          className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-blue-600/10 border-r border-t border-white/10"
        />
        <div 
          className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-blue-600/10 border-l border-t border-white/10"
        />
      </div>

      <div 
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
          
          <div 
            className="relative w-48 h-48 rounded-3xl border-4 border-white dark:border-slate-900 shadow-2xl overflow-hidden bg-white dark:bg-slate-800 flex items-center justify-center z-10"
          >
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Package size={80} className="text-gray-300" strokeWidth={1} />
            )}
          </div>

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
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{product.description ? 'Description' : 'Specifications'}</h3>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              {product.description || `Professional grade ${product.name} with high-definition clarity. Optimized for 24/7 surveillance with smart motion detection and IR night vision.`}
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
      </div>
    </div>
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
  formatCurrency,
  productCategories
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
  formatCurrency: (v: number) => string,
  productCategories: string[]
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const fuse = useMemo(() => new Fuse(products, {
    keys: ['name', 'category', 'description'],
    threshold: 0.4,
    includeScore: true
  }), [products]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (search) {
      const fuzzyResults = fuse.search(search);
      result = fuzzyResults.map(r => r.item);
    }

    if (filter !== 'all') {
      result = result.filter(p => p.category === filter);
    }

    return result;
  }, [search, filter, products, fuse]);

  // Find related categories based on search
  const suggestedCategories = useMemo(() => {
    if (!search) return [];
    return productCategories.filter(cat => 
      cat.toLowerCase().includes(search.toLowerCase()) && cat !== filter
    );
  }, [search, productCategories, filter]);

  // Get all categories including custom ones
  const allCategories = ['all', ...productCategories];

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{inventoryMode ? 'Inventory' : 'Premium Gear'}</h2>
            <p className="text-xs text-gray-500 font-medium">
              {inventoryMode ? 'Manage your product stock' : 'Select items to build your order'}
            </p>
          </div>
          <div className="relative flex gap-2">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setInventoryMode(!inventoryMode)}
              className={cn(
                "p-2 rounded-xl transition-all duration-300",
                inventoryMode 
                  ? "bg-green-600 text-white shadow-lg shadow-green-500/30" 
                  : "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              )}
            >
              <Settings size={20} />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.preventDefault();
                setShowAddProduct(true);
              }}
              className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
            >
              <Plus size={20} />
            </motion.button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
          {allCategories.map(cat => (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-[11px] font-bold whitespace-nowrap transition-all duration-300 border",
                filter === cat 
                  ? "bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/30" 
                  : "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
              )}
            >
              {cat.toUpperCase()}
            </motion.button>
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

        {suggestedCategories.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Related:</span>
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {suggestedCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => {
                    setFilter(cat);
                    setSearch('');
                  }}
                  className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[10px] font-bold rounded-full border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.map((product, idx) => (
          <motion.div 
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
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
  formatCurrency,
  addToCart,
  setActiveTab
}: { 
  products: Product[], 
  clients: Client[], 
  expenses: Expense[], 
  formatCurrency: (v: number) => string,
  addToCart: (p: Product) => void,
  setActiveTab: (t: string) => void
}) => {
  const totalClients = clients.length;
  const totalProducts = products.length;
  const totalDue = clients.reduce((sum, c) => sum + c.due, 0);
  const monthlyIncome = clients.reduce((sum, c) => sum + c.totalPaid, 0);
  
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

const ClientList = ({ 
  clients, 
  formatCurrency, 
  setShowClientProfile, 
  withPassword, 
  setShowAddClient 
}: { 
  clients: Client[], 
  formatCurrency: (v: number) => string, 
  setShowClientProfile: (c: Client) => void, 
  withPassword: (fn: () => void, adminOnly: boolean) => void, 
  setShowAddClient: (v: boolean) => void 
}) => {
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

      <motion.button 
        whileTap={{ scale: 0.95 }}
        onClick={() => withPassword(() => setShowAddClient(true), true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center btn-ripple z-40 opacity-90 hover:opacity-100"
      >
        <Plus size={28} />
      </motion.button>
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
  onAdd,
  productCategories,
  setProductCategories
}: { 
  onClose: () => void, 
  onAdd: (p: any) => void,
  productCategories: string[],
  setProductCategories: (categories: string[]) => void
}) => {
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: productCategories[0] || 'indoor',
    stock: '',
    image: '',
    description: ''
  });
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIMENSION = 512;
          
          if (width > height && width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setFormData({...formData, image: canvas.toDataURL(file.type || 'image/jpeg', 0.7)});
          } else {
            setFormData({...formData, image: reader.result as string});
          }
        };
        img.src = reader.result as string;
      };
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
          <h3 className="text-xl font-bold">Add Product</h3>
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
            {showNewCategoryInput ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="New Category Name"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  autoFocus
                />
                <button 
                  onClick={() => {
                    if (newCategory.trim() && !productCategories.includes(newCategory.trim())) {
                      setProductCategories([...productCategories, newCategory.trim()]);
                      setFormData({...formData, category: newCategory.trim()});
                    } else if (productCategories.includes(newCategory.trim())) {
                      setFormData({...formData, category: newCategory.trim()});
                    }
                    setShowNewCategoryInput(false);
                    setNewCategory('');
                  }}
                  className="px-4 py-3 bg-blue-600 text-white rounded-2xl font-bold"
                >
                  Add
                </button>
                <button 
                  onClick={() => {
                    setShowNewCategoryInput(false);
                    setNewCategory('');
                  }}
                  className="px-4 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <select 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                value={formData.category}
                onChange={e => {
                  if (e.target.value === 'add_new') {
                    setShowNewCategoryInput(true);
                  } else {
                    setFormData({...formData, category: e.target.value});
                  }
                }}
              >
                {productCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="add_new">+ Add New Category</option>
              </select>
            )}
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
            <textarea 
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] text-sm"
              placeholder="Product features, specifications, etc."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
          
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (!formData.name.trim()) {
                alert("Product name is required");
                return;
              }
              onAdd({
                ...formData,
                price: Number(formData.price) || 0,
                stock: Number(formData.stock) || 0
              });
            }}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg opacity-90 hover:opacity-100 dark:shadow-none mt-4"
          >
            Create Product
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const EditProductModal = ({ 
  product,
  onClose, 
  onSave,
  productCategories,
  setProductCategories
}: { 
  product: Product,
  onClose: () => void, 
  onSave: (p: Product) => void,
  productCategories: string[],
  setProductCategories: (categories: string[]) => void
}) => {
  const [formData, setFormData] = useState({
    ...product,
    price: product.price.toString(),
    stock: product.stock.toString(),
    description: product.description || ''
  });
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIMENSION = 512;
          
          if (width > height && width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setFormData({...formData, image: canvas.toDataURL(file.type || 'image/jpeg', 0.7)});
          } else {
            setFormData({...formData, image: reader.result as string});
          }
        };
        img.src = reader.result as string;
      };
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
            {showNewCategoryInput ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="New Category Name"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  autoFocus
                />
                <button 
                  onClick={() => {
                    if (newCategory.trim() && !productCategories.includes(newCategory.trim())) {
                      setProductCategories([...productCategories, newCategory.trim()]);
                      setFormData({...formData, category: newCategory.trim()});
                    } else if (productCategories.includes(newCategory.trim())) {
                      setFormData({...formData, category: newCategory.trim()});
                    }
                    setShowNewCategoryInput(false);
                    setNewCategory('');
                  }}
                  className="px-4 py-3 bg-blue-600 text-white rounded-2xl font-bold"
                >
                  Add
                </button>
                <button 
                  onClick={() => {
                    setShowNewCategoryInput(false);
                    setNewCategory('');
                  }}
                  className="px-4 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <select 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                value={formData.category}
                onChange={e => {
                  if (e.target.value === 'add_new') {
                    setShowNewCategoryInput(true);
                  } else {
                    setFormData({...formData, category: e.target.value});
                  }
                }}
              >
                {productCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="add_new">+ Add New Category</option>
              </select>
            )}
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Description</label>
            <textarea 
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px] text-sm"
              placeholder="Product features, specifications, etc."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
          
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (!formData.name.trim()) {
                alert("Product name is required");
                return;
              }
              onSave({
                ...formData,
                price: Number(formData.price) || 0,
                stock: Number(formData.stock) || 0
              });
            }}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg opacity-90 hover:opacity-100 dark:shadow-none mt-4"
          >
            Update Product
          </motion.button>
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
      // Use Function constructor instead of eval for better security and to avoid build warnings
      const result = new Function(`return ${equation + display}`)();
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
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + Math.random() * 15;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Premium Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5" />
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Glow behind logo */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="absolute w-64 h-64 bg-blue-500/30 blur-[60px] rounded-full"
        />

        {/* Logo Container */}
        <motion.div 
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-40 h-40 bg-gradient-to-br from-blue-600 to-blue-800 rounded-[40px] flex items-center justify-center shadow-[0_20px_50px_rgba(37,99,235,0.4)] mb-10 overflow-hidden border border-white/20 relative z-20"
        >
          {customLogo ? (
            <img src={customLogo} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <ShieldCheck size={80} className="text-white" />
          )}
        </motion.div>

        {/* Text Content */}
        <div className="text-center relative z-20">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-black text-white mb-1 tracking-tight"
          >
            IT DEPARTMENT PRO
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.6 }}
            className="text-blue-400 text-xs font-bold uppercase tracking-[0.3em] mb-8"
          >
            Security & Management Systems
          </motion.p>

          {/* Premium Loading Bar */}
          <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600"
            />
            {/* Shimmer effect on loading bar */}
            <motion.div 
              animate={{ x: ['-100%', '200%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/2"
            />
          </div>
          <motion.p 
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-[10px] text-gray-500 font-bold mt-3 uppercase tracking-widest"
          >
            {progress < 100 ? 'System Initializing...' : 'Ready to Launch'}
          </motion.p>
        </div>
      </motion.div>

      {/* Footer Branding */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1 }}
        className="absolute bottom-10 text-[10px] text-white font-bold tracking-[0.2em] uppercase"
      >
        Enterprise Edition v2.0
      </motion.div>
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inventoryMode, setInventoryMode] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(() => localStorage.getItem('cctv_custom_logo'));
  const [customIntroMusic, setCustomIntroMusic] = useState<string | null>(() => localStorage.getItem('cctv_custom_intro_music'));
  const [customClickSound, setCustomClickSound] = useState<string | null>(() => localStorage.getItem('cctv_custom_click_sound'));
  
  const isAdmin = user?.email === 'djbmremix87@gmail.com';

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
  const [publicOrders, setPublicOrders] = useState<PublicOrder[]>([]);
  const [showPendingOrders, setShowPendingOrders] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showClientProfile, setShowClientProfile] = useState<Client | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordCallback, setPasswordCallback] = useState<{ onSuccess: () => void } | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => {
    return localStorage.getItem('adminPassword') || '1233@';
  });
  const [notifications, setNotifications] = useState<{id: number, text: string}[]>([]);

  useEffect(() => {
    if (isAuthReady && !isAdmin) {
      if (['dashboard', 'clients', 'expenses', 'warranty'].includes(activeTab)) {
        setActiveTab('products');
      }
    }
  }, [isAdmin, isAuthReady, activeTab]);

  const withPassword = (action: () => void, strict = false) => {
    // If strict is false and user is logged in via Firebase, they are the admin
    if (!strict && (isAdmin || isVerified)) {
      action();
      return;
    }
    
    if (strict && !isAdmin) {
      addNotification("Only the owner can perform this action. Please log in.");
      return;
    }

    setShowPasswordModal(true);
    setPasswordCallback({ 
      onSuccess: () => {
        setIsVerified(true);
        action();
      } 
    });
  };

  const lockAdmin = () => {
    setIsVerified(false);
    addNotification("Admin session locked.");
  };
  const [productCategories, setProductCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('cctv_product_categories');
    return saved ? JSON.parse(saved) : Object.values(Category);
  });
  const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('cctv_expense_categories');
    return saved ? JSON.parse(saved) : Object.values(ExpenseCategory);
  });

  const lastSyncedSettings = useRef({
    darkMode: isDarkMode,
    customLogo: customLogo,
    customIntroMusic: customIntroMusic,
    customClickSound: customClickSound,
    expenseCategories: JSON.stringify(expenseCategories),
    productCategories: JSON.stringify(productCategories)
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
    // Fetch global data even if not logged in (for public sharing)
    
    // Global Settings
    const userDocRef = doc(db, 'settings', 'global');
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
        if (data.productCategories !== undefined) {
          setProductCategories(data.productCategories);
          lastSyncedSettings.current.productCategories = JSON.stringify(data.productCategories);
          localStorage.setItem('cctv_product_categories', JSON.stringify(data.productCategories));
        }
        if (data.customIntroMusic !== undefined) {
          setCustomIntroMusic(data.customIntroMusic);
          lastSyncedSettings.current.customIntroMusic = data.customIntroMusic;
          if (data.customIntroMusic) localStorage.setItem('cctv_custom_intro_music', data.customIntroMusic);
          else localStorage.removeItem('cctv_custom_intro_music');
        }
        if (data.customClickSound !== undefined) {
          setCustomClickSound(data.customClickSound);
          lastSyncedSettings.current.customClickSound = data.customClickSound;
          if (data.customClickSound) localStorage.setItem('cctv_custom_click_sound', data.customClickSound);
          else localStorage.removeItem('cctv_custom_click_sound');
        }
        
        // Seed if not already seeded and user is logged in
        if (!data.seeded && user && !isSeeding.current) {
          seedUserData(user.uid);
        }
      } else if (user && !isSeeding.current) {
        // Initialize user doc if it doesn't exist
        isSeeding.current = true;
        setDoc(userDocRef, { 
          darkMode: isDarkMode, 
          customLogo, 
          expenseCategories,
          productCategories,
          seeded: true 
        }, { merge: true }).then(() => {
          seedUserData(user.uid);
        }).finally(() => {
          isSeeding.current = false;
        });
      }
      setIsInitialLoad(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `settings/global`);
      setIsInitialLoad(false);
    });

    // Products
    const productsRef = collection(db, 'products');
    const unsubProducts = onSnapshot(query(productsRef, orderBy('name')), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data() } as Product));
      
      // If Firestore has data, it's the source of truth
      if (items.length > 0) {
        setProducts(items);
        localStorage.setItem('cctv_products', JSON.stringify(items));
      } else if (isInitialLoad === false) {
        // If Firestore is empty and we've finished initial load, 
        // check if we have local data to sync up
        const localData = localStorage.getItem('cctv_products');
        if (localData && user) {
          const parsed = JSON.parse(localData);
          if (parsed.length > 0) {
            console.log("Syncing local products to Firestore...");
            parsed.forEach((p: Product) => {
              setDoc(doc(db, 'products', String(p.id)), p);
            });
          }
        } else {
          setProducts([]);
          localStorage.setItem('cctv_products', '[]');
        }
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, `products`));

    // Clients (Only for admin)
    let unsubClients = () => {};
    if (isAdmin) {
      const clientsRef = collection(db, 'clients');
      unsubClients = onSnapshot(query(clientsRef, orderBy('name')), (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data() } as Client));
        
        if (items.length > 0) {
          setClients(items);
          localStorage.setItem('cctv_clients', JSON.stringify(items));
        } else if (isInitialLoad === false) {
          // Sync local to cloud if cloud is empty
          const localData = localStorage.getItem('cctv_clients');
          if (localData && user) {
            const parsed = JSON.parse(localData);
            if (parsed.length > 0) {
              console.log("Syncing local clients to Firestore...");
              parsed.forEach((c: Client) => {
                setDoc(doc(db, 'clients', String(c.id)), c);
              });
            }
          } else {
            setClients([]);
            localStorage.setItem('cctv_clients', '[]');
          }
        }
      }, (error) => handleFirestoreError(error, OperationType.LIST, `clients`));
    } else {
      setClients([]);
    }

    // Expenses (Only for admin)
    let unsubExpenses = () => {};
    if (isAdmin) {
      const expensesRef = collection(db, 'expenses');
      unsubExpenses = onSnapshot(query(expensesRef, orderBy('date', 'desc')), (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data() } as Expense));
        
        if (items.length > 0) {
          setExpenses(items);
          localStorage.setItem('cctv_expenses', JSON.stringify(items));
        } else if (isInitialLoad === false) {
          // Sync local to cloud if cloud is empty
          const localData = localStorage.getItem('cctv_expenses');
          if (localData && user) {
            const parsed = JSON.parse(localData);
            if (parsed.length > 0) {
              console.log("Syncing local expenses to Firestore...");
              parsed.forEach((e: Expense) => {
                setDoc(doc(db, 'expenses', e.id), e);
              });
            }
          } else {
            setExpenses([]);
            localStorage.setItem('cctv_expenses', '[]');
          }
        }
      }, (error) => handleFirestoreError(error, OperationType.LIST, `expenses`));
    } else {
      setExpenses([]);
    }

    // Public Orders (Only for admin)
    let unsubPublicOrders = () => {};
    let isInitialOrdersLoad = true;
    if (isAdmin) {
      const poRef = collection(db, 'public_orders');
      unsubPublicOrders = onSnapshot(query(poRef, where('status', '==', 'pending')), (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PublicOrder));
        
        if (!isInitialOrdersLoad) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(() => {}); // Silence autoplay block errors
            }
          });
        }
        isInitialOrdersLoad = false;
        setPublicOrders(items);
      }, (error) => handleFirestoreError(error, OperationType.LIST, `public_orders`));
    } else {
      setPublicOrders([]);
    }

    return () => {
      unsubUser();
      unsubProducts();
      unsubClients();
      unsubExpenses();
      unsubPublicOrders();
    };
  }, [user, isAdmin]);

  // Sync Settings to Firestore (Only if changed by user)
  useEffect(() => {
    if (user && !isInitialLoad) {
      const categoriesJson = JSON.stringify(expenseCategories);
      const productCategoriesJson = JSON.stringify(productCategories);
      
      // Only sync if values actually differ from what's in Firestore
      if (
        isDarkMode !== lastSyncedSettings.current.darkMode ||
        customLogo !== lastSyncedSettings.current.customLogo ||
        customIntroMusic !== lastSyncedSettings.current.customIntroMusic ||
        customClickSound !== lastSyncedSettings.current.customClickSound ||
        categoriesJson !== lastSyncedSettings.current.expenseCategories ||
        productCategoriesJson !== lastSyncedSettings.current.productCategories
      ) {
        const userDocRef = doc(db, 'settings', 'global');
        
        // Update ref immediately to prevent multiple triggers
        lastSyncedSettings.current = {
          darkMode: isDarkMode,
          customLogo: customLogo,
          customIntroMusic: customIntroMusic,
          customClickSound: customClickSound,
          expenseCategories: categoriesJson,
          productCategories: productCategoriesJson
        };

        setDoc(userDocRef, { darkMode: isDarkMode, customLogo, customIntroMusic, customClickSound, expenseCategories, productCategories }, { merge: true })
          .catch(error => {
            // If it fails, we might want to revert the ref, but usually quota errors are persistent
            handleFirestoreError(error, OperationType.WRITE, `settings/global`);
          });
      }
    }
  }, [isDarkMode, customLogo, customIntroMusic, customClickSound, expenseCategories, productCategories, user, isInitialLoad]);

  // Dynamic Title for SEO
  useEffect(() => {
    const tabNames: Record<string, string> = {
      dashboard: 'Dashboard',
      clients: 'Clients Management',
      products: 'Products & Orders',
      expenses: 'Expense Tracker',
      bandwidth: 'Bandwidth Test',
      warranty: 'Warranty Status',
      me: 'Profile & Settings'
    };
    const currentTab = tabNames[activeTab] || activeTab;
    document.title = `${currentTab} | IT Department Pro`;
  }, [activeTab]);

  // Dark Mode Class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Global Click Sound
  useEffect(() => {
    const tapAudio = new Audio(customClickSound || 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    tapAudio.volume = 0.3;
    tapAudio.preload = 'auto';

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if the clicked element is a button or inside a button
      if (target.closest('button') || target.closest('a') || target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'submit') {
        const sound = tapAudio.cloneNode() as HTMLAudioElement;
        sound.volume = 0.3;
        sound.play().catch(() => {});
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Splash Screen Timer & Music
  useEffect(() => {
    const audio = new Audio(customIntroMusic || 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
    audio.volume = 1.0;
    
    const playIntro = () => {
      audio.play().catch(() => {});
    };

    // Try to play immediately
    playIntro();

    // Unlock audio and play if blocked
    const unlockAndPlay = () => {
      playIntro();
      window.removeEventListener('click', unlockAndPlay);
      window.removeEventListener('touchstart', unlockAndPlay);
    };
    window.addEventListener('click', unlockAndPlay);
    window.addEventListener('touchstart', unlockAndPlay);

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); // Faster splash for better UX

    return () => {
      clearTimeout(timer);
      audio.pause();
      audio.currentTime = 0;
      window.removeEventListener('click', unlockAndPlay);
      window.removeEventListener('touchstart', unlockAndPlay);
    };
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
      await setDoc(doc(db, 'clients', String(clientId)), updatedClient);
      addNotification("Work added successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}`);
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
      await setDoc(doc(db, 'clients', String(clientId)), updatedClient);
      addNotification("Payment recorded successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}`);
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
      await setDoc(doc(db, 'clients', String(clientId)), updatedClient);
      addNotification("Payment deleted!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}`);
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
      await setDoc(doc(db, 'clients', String(clientId)), updatedClient);
      addNotification("Work deleted!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}`);
    }
  };

  const updateOrderStatus = async (clientId: number, orderId: string, newStatus: OrderStatus) => {
    if (!user) {
      addNotification("Please login to update status.");
      return;
    }
    const userId = user.uid;
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const updatedClient = {
      ...client,
      orders: client.orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
    };

    try {
      await setDoc(doc(db, 'clients', String(clientId)), updatedClient);
      addNotification(`Order status updated to ${newStatus}`);
    } catch (err) {
      console.error("Update status error:", err);
      addNotification("Failed to update status.");
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
      await setDoc(doc(db, 'clients', String(clientId)), updatedClient);
      addNotification("Order deleted!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}`);
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

  const placePublicOrder = async (customerDetails: {name: string, phone: string, address: string}) => {
    if (cart.length === 0) return;

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderId = `ORD-${Date.now()}`;
    
    const publicOrder: PublicOrder = {
      id: orderId,
      customerName: customerDetails.name,
      customerPhone: customerDetails.phone,
      customerAddress: customerDetails.address,
      items: cart,
      total,
      date: new Date().toISOString().split('T')[0],
      status: 'pending'
    };

    try {
      await setDoc(doc(db, 'public_orders', orderId), publicOrder);
      
      // Decrease stock
      for (const item of cart) {
        const productRef = doc(db, 'products', String(item.productId));
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const currentStock = productSnap.data().stock;
          await updateDoc(productRef, {
            stock: Math.max(0, currentStock - item.quantity)
          });
        }
      }

      setCart([]);
      setShowCart(false);
      addNotification("Order placed successfully! We will contact you soon.");
    } catch (error) {
      console.error("Error placing order:", error);
      addNotification("Failed to place order. Please try again.");
    }
  };

  const acceptPublicOrder = async (order: PublicOrder) => {
    // Find client by phone
    let client = clients.find(c => c.phone === order.customerPhone);
    let clientId = client ? client.id : Date.now();

    const newOrder: Order = {
      id: order.id,
      date: order.date,
      items: order.items,
      total: order.total,
      dueDate: null,
      status: OrderStatus.PENDING
    };

    try {
      if (client) {
        // Update existing client
        const updatedClient = {
          ...client,
          orders: [newOrder, ...client.orders],
          due: client.due + order.total
        };
        await setDoc(doc(db, 'clients', String(clientId)), updatedClient);
      } else {
        // Create new client
        const newClient: Client = {
          id: clientId,
          name: order.customerName,
          phone: order.customerPhone,
          address: order.customerAddress,
          status: ClientStatus.ACTIVE,
          orders: [newOrder],
          due: order.total,
          totalPaid: 0,
          works: 0,
          workHistory: [],
          paymentHistory: []
        };
        await setDoc(doc(db, 'clients', String(clientId)), newClient);
      }

      // Mark public order as accepted
      await updateDoc(doc(db, 'public_orders', order.id), { status: 'accepted' });
      
      addNotification(`Order from ${order.customerName} accepted!`);
      setShowPendingOrders(false);
    } catch (error) {
      console.error("Error accepting order:", error);
      addNotification("Failed to accept order.");
    }
  };

  const placeOrder = async (clientId: number, isPaid: boolean = false, paymentType: 'Cash' | 'Bkash' | 'Bank' = 'Cash') => {
    const client = clients.find(c => c.id === clientId);
    if (!client || cart.length === 0) return;

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderId = `ORD-${Date.now()}`;
    const newOrder: Order = {
      id: orderId,
      date: new Date().toISOString().split('T')[0],
      items: [...cart],
      total,
      dueDate: null,
      status: OrderStatus.PENDING
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
      await setDoc(doc(db, 'clients', String(clientId)), updatedClient);

      // Update Stock in Firestore
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const newStock = product.stock - item.quantity;
          if (newStock < 0) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
          await updateDoc(doc(db, 'products', String(product.id)), {
            stock: newStock
          });
        }
      }

      generatePDF(client, cart, total, isPaid, paymentType);
      generateWhatsAppMessage(client, cart, total, isPaid, paymentType);

      setCart([]);
      setShowCart(false);
      addNotification(isPaid ? "Order placed & Payment recorded!" : "Order placed successfully!");
    } catch (error) {
      if (error instanceof Error && error.message.includes('Insufficient stock')) {
        addNotification(error.message);
        return;
      }
      handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}`);
    }
  };

  const migrateDataToGlobal = async () => {
    if (!user) return;
    const userId = user.uid;
    addNotification("Starting data migration...");
    
    try {
      let productCount = 0;
      let clientCount = 0;
      let expenseCount = 0;

      // 1. Migrate Products
      const oldProductsRef = collection(db, 'users', userId, 'products');
      const productsSnap = await getDocs(oldProductsRef);
      for (const pDoc of productsSnap.docs) {
        await setDoc(doc(db, 'products', pDoc.id), pDoc.data());
        productCount++;
      }

      // 2. Migrate Clients
      const oldClientsRef = collection(db, 'users', userId, 'clients');
      const clientsSnap = await getDocs(oldClientsRef);
      for (const cDoc of clientsSnap.docs) {
        await setDoc(doc(db, 'clients', cDoc.id), cDoc.data());
        clientCount++;
      }

      // 3. Migrate Expenses
      const oldExpensesRef = collection(db, 'users', userId, 'expenses');
      const expensesSnap = await getDocs(oldExpensesRef);
      for (const eDoc of expensesSnap.docs) {
        await setDoc(doc(db, 'expenses', eDoc.id), eDoc.data());
        expenseCount++;
      }

      // 4. Migrate Settings
      const oldSettingsRef = doc(db, 'users', userId);
      const settingsSnap = await getDoc(oldSettingsRef);
      if (settingsSnap.exists()) {
        await setDoc(doc(db, 'settings', 'global'), settingsSnap.data(), { merge: true });
      }

      addNotification(`Migration complete! ${productCount} products, ${clientCount} clients, ${expenseCount} expenses moved.`);
    } catch (error) {
      console.error("Migration error:", error);
      addNotification("Migration failed. Check console for details.");
    }
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
        doc.text('Phone: 01817681233 | Email: worldexplorer233@gmail.com', margin + 35, 38);
      } catch (e) {
        // Fallback if logo fails
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('CCTV PRO SOLUTIONS', margin, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Your Security, Our Priority', margin, 32);
        doc.text('Phone: 01817681233 | Email: worldexplorer233@gmail.com', margin, 38);
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
      doc.text('Phone: 01817681233 | Email: worldexplorer233@gmail.com', margin, 38);
    }

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

    // THANK YOU FOR YOUR BUSINESS!
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text('THANK YOU FOR YOUR BUSINESS!', pageWidth / 2, pageHeight - 15, { align: 'center' });

    // Robust download for iframes
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${client.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      const productsRef = collection(db, 'products');
      const productsSnap = await getDocs(productsRef);
      if (productsSnap.empty) {
        const localProducts = localStorage.getItem('cctv_products');
        if (localProducts && JSON.parse(localProducts).length > 0) {
          const items = JSON.parse(localProducts);
          for (const p of items) {
            batch.set(doc(db, 'products', String(p.id)), p);
          }
        } else {
          for (const p of DEFAULT_PRODUCTS) {
            batch.set(doc(db, 'products', String(p.id)), p);
          }
        }
        hasChanges = true;
      }

      // Seed Clients
      const clientsRef = collection(db, 'clients');
      const clientsSnap = await getDocs(clientsRef);
      if (clientsSnap.empty) {
        const localClients = localStorage.getItem('cctv_clients');
        if (localClients && JSON.parse(localClients).length > 0) {
          const items = JSON.parse(localClients);
          for (const c of items) {
            batch.set(doc(db, 'clients', String(c.id)), c);
          }
        } else {
          for (const c of DEFAULT_CLIENTS) {
            batch.set(doc(db, 'clients', String(c.id)), c);
          }
        }
        hasChanges = true;
      }

      // Mark as seeded
      batch.set(doc(db, 'settings', 'global'), { seeded: true }, { merge: true });
      hasChanges = true;

      if (hasChanges) {
        await batch.commit();
        addNotification("Data synchronized with cloud!");
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

    if (!user) {
      addNotification("Saved locally! Login to sync to cloud.");
      return;
    }
    
    const userId = user.uid;
    try {
      await setDoc(doc(db, 'products', String(productId)), product);
      addNotification("Product synced to cloud!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products/${productId}`);
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
      const docRef = doc(db, 'products', String(id));
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
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
      await setDoc(doc(db, 'products', String(updatedProduct.id)), updatedProduct);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products/${updatedProduct.id}`);
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
      await updateDoc(doc(db, 'clients', String(clientId)), {
        image: image || null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}`);
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
    
    try {
      await updateDoc(doc(db, 'clients', String(clientId)), {
        warrantyExpiry: expiryDate
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}`);
    }
  };

  const handleSetInstallationDate = async (clientId: number, date: string) => {
    setClients(prev => {
      const updated = prev.map(c => c.id === clientId ? { ...c, installationDate: date } : c);
      localStorage.setItem('cctv_clients', JSON.stringify(updated));
      return updated;
    });
    addNotification("Installation date updated!");

    if (!user) return;
    try {
      await updateDoc(doc(db, 'clients', String(clientId)), {
        installationDate: date
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}`);
    }
  };

  const handleUpdateClientDetails = async (clientId: number, details: { name: string, phone: string, address: string }) => {
    setClients(prev => {
      const updated = prev.map(c => c.id === clientId ? { ...c, ...details } : c);
      localStorage.setItem('cctv_clients', JSON.stringify(updated));
      return updated;
    });
    addNotification("Client details updated!");

    if (!user) return;
    try {
      await updateDoc(doc(db, 'clients', String(clientId)), details);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}`);
    }
  };

  const handleUpdateNotes = async (clientId: number, notes: string) => {
    setClients(prev => {
      const updated = prev.map(c => c.id === clientId ? { ...c, notes } : c);
      localStorage.setItem('cctv_clients', JSON.stringify(updated));
      return updated;
    });
    addNotification("Notes updated!");

    if (!user) return;
    try {
      await updateDoc(doc(db, 'clients', String(clientId)), {
        notes
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}`);
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
      await deleteDoc(doc(db, 'clients', String(clientId)));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/${clientId}`);
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
      status: ClientStatus.ACTIVE,
      installationDate: newClient.installationDate || new Date().toISOString().split('T')[0],
      warrantyExpiry: newClient.warrantyExpiry || '',
      notes: newClient.notes || ''
    };

    // Update local state immediately
    setClients(prev => {
      const updated = [...prev, client];
      localStorage.setItem('cctv_clients', JSON.stringify(updated));
      return updated;
    });
    setShowAddClient(false);
    addNotification("Client added!");

    try {
      await setDoc(doc(db, 'clients', String(clientId)), client);
      addNotification("Client synced to cloud!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `clients/${clientId}`);
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

    if (!user) {
      addNotification("Saved locally! Login to sync to cloud.");
      return;
    }
    
    const userId = user.uid;
    try {
      await setDoc(doc(db, 'expenses', expenseId), expense);
      addNotification("Expense synced to cloud!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `expenses/${expenseId}`);
    }
  };

    // Remove local Dashboard and ClientList definitions to use global ones




    // Remove local ClientProfile, AddWorkModal, and AddPaymentModal definitions to use global ones


  const PasswordModal = () => {
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (input === adminPassword) {
        setShowPasswordModal(false);
        if (passwordCallback) {
          passwordCallback.onSuccess();
          setPasswordCallback(null);
        }
      } else {
        setError(true);
        setTimeout(() => setError(false), 500);
      }
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className={cn(
            "bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-white/10",
            error && "animate-shake"
          )}
        >
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
              <Lock size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Security Check</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8">
              Please enter the administrative password to continue with this action.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  autoFocus
                  type="password"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter Password"
                  className={cn(
                    "w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-600 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all font-bold text-center tracking-[0.5em]",
                    error ? "border-red-500 text-red-500" : "text-slate-900 dark:text-white"
                  )}
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordCallback(null);
                  }}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  const CartModal = () => {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const [orderClientId, setOrderClientId] = useState<number | null>(null);
    const [isPaid, setIsPaid] = useState(false);
    const [paymentType, setPaymentType] = useState<'Cash' | 'Bkash' | 'Bank'>('Cash');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');

    return (
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end justify-center"
        onClick={() => setShowCart(false)}
      >
        <div 
          className="w-full max-w-[450px] md:max-w-xl max-h-[90vh] md:max-h-[85vh] bg-white dark:bg-slate-900 rounded-t-[40px] md:rounded-[40px] md:mb-8 shadow-2xl overflow-hidden flex flex-col"
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
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            updateCartQuantity(item.productId, -1);
                          }}
                          className="w-8 h-8 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center justify-center text-gray-400 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            updateCartQuantity(item.productId, 1);
                          }}
                          className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {isAdmin ? (
                  <>
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
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setIsPaid(false)}
                          className={cn(
                            "flex-1 py-3 rounded-2xl font-bold text-xs transition-all border",
                            !isPaid 
                              ? "bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/30" 
                              : "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                          )}
                        >
                          Unpaid (Add to Due)
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setIsPaid(true)}
                          className={cn(
                            "flex-1 py-3 rounded-2xl font-bold text-xs transition-all border",
                            isPaid 
                              ? "bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/30" 
                              : "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                          )}
                        >
                          Paid Now
                        </motion.button>
                      </div>

                      {isPaid && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Payment Method</p>
                          <div className="flex gap-2">
                            {['Cash', 'Bkash', 'Bank'].map(type => (
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                key={type}
                                onClick={() => setPaymentType(type as any)}
                                className={cn(
                                  "flex-1 py-2.5 rounded-xl font-bold text-[10px] transition-all border",
                                  paymentType === type 
                                    ? "bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/30" 
                                    : "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                                )}
                              >
                                {type}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 pt-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Your Details</h3>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold"
                    />
                    <textarea
                      placeholder="Delivery Address"
                      value={customerAddress}
                      onChange={e => setCustomerAddress(e.target.value)}
                      className="w-full p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold h-24 resize-none"
                    />
                  </div>
                )}
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
                {isAdmin ? (
                  <>
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
                      className="flex-[1.5] py-5 bg-green-600 text-white rounded-[24px] font-black text-sm shadow-2xl shadow-green-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={20} />
                      Confirm & Order
                    </motion.button>
                  </>
                ) : (
                  <motion.button 
                    whileTap={{ scale: 0.98 }}
                    disabled={!customerName || !customerPhone || !customerAddress}
                    onClick={() => placePublicOrder({name: customerName, phone: customerPhone, address: customerAddress})}
                    className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-sm shadow-2xl shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    Place Order
                  </motion.button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const PendingOrdersModal = () => {
    return (
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setShowPendingOrders(false)}
      >
        <div 
          className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black">Pending Orders</h2>
              <p className="text-xs text-gray-500">Orders placed by clients</p>
            </div>
            <button 
              onClick={() => setShowPendingOrders(false)}
              className="w-10 h-10 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {publicOrders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No pending orders.</div>
            ) : (
              publicOrders.map(order => (
                <div key={order.id} className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{order.customerName}</h3>
                      <p className="text-sm text-gray-500">{order.customerPhone}</p>
                      <p className="text-xs text-gray-400 mt-1">{order.customerAddress}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-blue-600">{formatCurrency(order.total)}</p>
                      <p className="text-[10px] text-gray-400">{order.date}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {order.items.map(item => (
                      <div key={item.productId} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptPublicOrder(order)}
                      className="flex-1 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors"
                    >
                      Accept Order
                    </button>
                    <button
                      onClick={async () => {
                        await updateDoc(doc(db, 'public_orders', order.id), { status: 'rejected' });
                        addNotification("Order rejected.");
                      }}
                      className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const BandwidthTestPage = () => {
    const [isTesting, setIsTesting] = useState(false);
    const [testPhase, setTestPhase] = useState<'idle' | 'ping' | 'download' | 'upload'>('idle');
    const [downloadSpeed, setDownloadSpeed] = useState<number | null>(null);
    const [uploadSpeed, setUploadSpeed] = useState<number | null>(null);
    const [progress, setProgress] = useState(0);
    const [isTurbo, setIsTurbo] = useState(false);
    const [testHistory, setTestHistory] = useState<{download: number, upload: number, date: string}[]>([]);
    const [ping, setPing] = useState<number>(24);
    const [jitter, setJitter] = useState<number>(3);

    const runTest = async (turbo = false) => {
      setIsTesting(true);
      setIsTurbo(turbo);
      setDownloadSpeed(null);
      setUploadSpeed(null);
      setProgress(0);

      try {
        // Phase 1: Ping
        setTestPhase('ping');
        const pings = [];
        for(let i=0; i<3; i++) {
          const start = performance.now();
          await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' });
          pings.push(performance.now() - start);
          setProgress((i + 1) * 10);
        }
        const avgPing = Math.round(pings.reduce((a, b) => a + b) / pings.length);
        setPing(avgPing);
        setJitter(Math.round(Math.max(...pings) - Math.min(...pings)));

        // Phase 2: Download
        setTestPhase('download');
        const dlStart = performance.now();
        const dlUrl = `https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=2070&auto=format&fit=crop&sig=${Math.random()}`;
        const dlRes = await fetch(dlUrl, { cache: 'no-store' });
        const reader = dlRes.body?.getReader();
        if (!reader) throw new Error('No reader');
        
        const cl = dlRes.headers.get('Content-Length');
        const total = cl ? parseInt(cl) : 5000000;
        let received = 0;
        
        while(true) {
          const {done, value} = await reader.read();
          if (done) break;
          received += value.length;
          const p = 30 + (received / total) * 35;
          setProgress(Math.min(p, 65));
          const elapsed = (performance.now() - dlStart) / 1000;
          if (elapsed > 0.1) setDownloadSpeed(parseFloat(((received * 8) / (elapsed * 1024 * 1024)).toFixed(2)));
        }
        const finalDl = ((received * 8) / ((performance.now() - dlStart) / 1000 * 1024 * 1024));
        setDownloadSpeed(parseFloat(finalDl.toFixed(2)));

        // Phase 3: Upload
        setTestPhase('upload');
        const ulStart = performance.now();
        const ulSize = turbo ? 2000000 : 1000000; // 1-2MB blob
        const blob = new Blob([new Uint8Array(ulSize)]);
        
        // We use a dummy POST to a reliable endpoint
        await fetch('https://httpbin.org/post', {
          method: 'POST',
          body: blob,
          mode: 'cors'
        });
        
        const ulEnd = performance.now();
        const finalUl = (ulSize * 8) / ((ulEnd - ulStart) / 1000 * 1024 * 1024);
        setUploadSpeed(parseFloat(finalUl.toFixed(2)));
        setProgress(100);

        setTestHistory(prev => [{
          download: parseFloat(finalDl.toFixed(2)),
          upload: parseFloat(finalUl.toFixed(2)),
          date: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 5));
        
        addNotification(`Test Complete: DL ${finalDl.toFixed(1)} / UL ${finalUl.toFixed(1)} Mbps`);
      } catch (error) {
        console.error("Test failed:", error);
        addNotification("Test failed. Check connection.");
      } finally {
        setIsTesting(false);
        setTestPhase('idle');
      }
    };

    return (
      <div className="space-y-6 pb-24">
        <div className="glass-card p-8 flex flex-col items-center text-center relative overflow-hidden">
          {isTurbo && isTesting && (
            <motion.div 
              className="absolute inset-0 bg-orange-500/5 -z-10"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
          
          <div className={cn(
            "w-32 h-32 rounded-full flex items-center justify-center mb-6 transition-all duration-500 relative",
            isTesting 
              ? (isTurbo ? "bg-gradient-to-br from-orange-400 to-red-600 shadow-[0_0_50px_rgba(249,115,22,0.6)] scale-110" : "bg-blue-600 shadow-[0_0_40px_rgba(37,99,235,0.4)]") 
              : "bg-gray-100 dark:bg-slate-800"
          )}>
            <Zap size={48} className={cn(isTesting ? "text-white animate-pulse" : "text-blue-600")} />
            {isTesting && (
              <motion.div 
                className={cn("absolute inset-0 rounded-full border-4", isTurbo ? "border-orange-300/50" : "border-white/30")}
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0, 1] }}
                transition={{ duration: isTurbo ? 0.5 : 1, repeat: Infinity }}
              />
            )}
            {isTurbo && isTesting && (
              <motion.div 
                className="absolute -inset-4 rounded-full border-2 border-orange-500/20"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
          
          <h2 className="text-2xl font-bold mb-2">Network Bandwidth Test</h2>
          <p className="text-gray-500 text-sm mb-8">
            {testPhase === 'idle' ? 'Measure your connection speed' : 
             testPhase === 'ping' ? 'Testing Latency...' :
             testPhase === 'download' ? 'Testing Download Speed...' : 'Testing Upload Speed...'}
          </p>

          <div className="grid grid-cols-2 gap-8 w-full mb-8">
            <div className="flex flex-col items-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Download</p>
              <p className={cn("text-4xl font-black", downloadSpeed ? "text-blue-600" : "text-gray-300")}>
                {downloadSpeed || '0.0'} <span className="text-xs">Mbps</span>
              </p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Upload</p>
              <p className={cn("text-4xl font-black", uploadSpeed ? "text-purple-600" : "text-gray-300")}>
                {uploadSpeed || '0.0'} <span className="text-xs">Mbps</span>
              </p>
            </div>
          </div>

          {isTesting && (
            <div className="w-full max-w-xs bg-gray-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden mb-8 p-0.5">
              <motion.div 
                className={cn("h-full rounded-full", isTurbo ? "bg-orange-500" : "bg-blue-600")}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
          )}

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button 
              onClick={() => runTest(false)}
              disabled={isTesting}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95 transition-all"
            >
              <Zap size={20} /> Start Standard Test
            </button>
            <button 
              onClick={() => runTest(true)}
              disabled={isTesting}
              className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 active:scale-95 transition-all"
            >
              <Zap size={20} /> Start Turbo Test
            </button>
          </div>
        </div>

        {testHistory.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-gray-500">
              <RefreshCcw size={14} /> Recent Tests
            </h3>
            <div className="space-y-3">
              {testHistory.map((test, i) => (
                <div key={i} className="flex justify-between items-center border-b dark:border-slate-800 pb-2 last:border-0">
                  <div>
                    <p className="text-xs font-bold">DL: {test.download} / UL: {test.upload}</p>
                    <p className="text-[10px] text-gray-400">{test.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">DL</span>
                    <span className="text-[10px] font-bold text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded">UL</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Ping</p>
            <p className="text-lg font-bold">{ping} ms</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Jitter</p>
            <p className="text-lg font-bold">{jitter} ms</p>
          </div>
        </div>
      </div>
    );
  };

  const MePage = ({ 
    isDarkMode, 
    setIsDarkMode, 
    customLogo, 
    setCustomLogo, 
    customIntroMusic,
    setCustomIntroMusic,
    customClickSound,
    setCustomClickSound,
    onBackup, 
    onOpenCalculator,
    onLock,
    adminPassword,
    setAdminPassword,
    user
  }: { 
    isDarkMode: boolean, 
    setIsDarkMode: (v: boolean) => void, 
    customLogo: string | null, 
    setCustomLogo: (v: string | null) => void, 
    customIntroMusic: string | null,
    setCustomIntroMusic: (v: string | null) => void,
    customClickSound: string | null,
    setCustomClickSound: (v: string | null) => void,
    onBackup: () => void, 
    onOpenCalculator: () => void,
    onLock: () => void,
    adminPassword: string,
    setAdminPassword: (v: string) => void,
    user: FirebaseUser | null
  }) => {
    const [rules, setRules] = useState<string[]>(() => {
      const saved = localStorage.getItem('companyRules');
      return saved ? JSON.parse(saved) : [
        "Warranty is valid only with original invoice.",
        "No return after 7 days of installation.",
        "Service charge applies for out-of-warranty visits."
      ];
    });
    const [showEditRules, setShowEditRules] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && user) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setCustomLogo(base64);
          localStorage.setItem('cctv_custom_logo', base64);
          addNotification("Logo updated!");
        };
        reader.readAsDataURL(file);
      }
    };

    const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'intro' | 'click') => {
      const file = e.target.files?.[0];
      if (file && user) {
        // Check file size (limit to 1MB for Firestore/LocalStorage)
        if (file.size > 1024 * 1024) {
          addNotification("Audio file too large! Max 1MB.");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          if (type === 'intro') {
            setCustomIntroMusic(base64);
            localStorage.setItem('cctv_custom_intro_music', base64);
            addNotification("Intro music updated!");
          } else {
            setCustomClickSound(base64);
            localStorage.setItem('cctv_custom_click_sound', base64);
            addNotification("Click sound updated!");
          }
        };
        reader.readAsDataURL(file);
      }
    };
    const handleChangePassword = () => {
      if (oldPass !== adminPassword) {
        addNotification("Old password incorrect!");
        return;
      }
      if (newPass !== confirmPass) {
        addNotification("Passwords do not match!");
        return;
      }
      if (newPass.length < 4) {
        addNotification("Password too short!");
        return;
      }
      setAdminPassword(newPass);
      localStorage.setItem('adminPassword', newPass);
      addNotification("Password changed successfully!");
      setShowChangePassword(false);
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
    };

    useEffect(() => {
      localStorage.setItem('companyRules', JSON.stringify(rules));
    }, [rules]);

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
              await setDoc(doc(db, 'products', String(p.id)), p);
            }
          }
          if (data.clients) {
            const clients = JSON.parse(data.clients);
            for (const c of clients) {
              await setDoc(doc(db, 'clients', String(c.id)), c);
            }
          }
          if (data.expenses) {
            const expenses = JSON.parse(data.expenses);
            for (const ex of expenses) {
              await setDoc(doc(db, 'expenses', String(ex.id)), ex);
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

    const syncLocalToCloud = async () => {
      if (!user) {
        addNotification("Please login first!");
        return;
      }
      addNotification("Syncing local data...");
      
      try {
        const localProducts = localStorage.getItem('cctv_products');
        if (localProducts) {
          const items = JSON.parse(localProducts);
          for (const p of items) await setDoc(doc(db, 'products', String(p.id)), p);
        }
        
        const localClients = localStorage.getItem('cctv_clients');
        if (localClients) {
          const items = JSON.parse(localClients);
          for (const c of items) await setDoc(doc(db, 'clients', String(c.id)), c);
        }
        
        const localExpenses = localStorage.getItem('cctv_expenses');
        if (localExpenses) {
          const items = JSON.parse(localExpenses);
          for (const e of items) await setDoc(doc(db, 'expenses', e.id), e);
        }
        
        addNotification("Sync complete!");
      } catch (err) {
        console.error("Sync error:", err);
        addNotification("Sync failed. Check console.");
      }
    };

    const shareApp = () => {
      const publicUrl = "https://ais-pre-niyxx6qax65fz4eyeiue32-100814937973.asia-southeast1.run.app";
      navigator.clipboard.writeText(publicUrl);
      addNotification("Public App link copied to clipboard!");
    };

    return (
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 flex flex-col items-center text-center h-fit">
            {!user ? (
              <div className="space-y-4 w-full">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                  <User size={40} />
                </div>
                <h3 className="text-xl font-bold">Welcome to CCTV PRO</h3>
                <p className="text-gray-500 text-sm">Login to sync your data to the cloud.</p>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={loginWithGoogle}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 opacity-90 hover:opacity-100"
                >
                  <Smartphone size={20} /> Login with Google
                </motion.button>
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
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e)} />
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
              <button 
                onClick={() => withPassword(shareApp)}
                className="p-4 glass-card flex flex-col items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors border-blue-200 dark:border-blue-900/30"
              >
                <Share2 className="text-blue-500" />
                <span className="text-xs font-bold">Share App</span>
              </button>
              <button 
                onClick={() => withPassword(migrateDataToGlobal)}
                className="p-4 glass-card flex flex-col items-center gap-2 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors border-orange-200 dark:border-orange-900/30"
              >
                <RefreshCcw className="text-orange-500" />
                <span className="text-xs font-bold">Restore Data</span>
              </button>
              <button 
                onClick={() => withPassword(syncLocalToCloud)}
                className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-600 hover:bg-purple-100 transition-colors"
              >
                <CloudUpload size={20} />
                <div className="text-left">
                  <p className="text-xs font-bold">Sync Cloud</p>
                  <p className="text-[10px] opacity-70">Force update</p>
                </div>
              </button>
              <button 
                onClick={onLock}
                className="p-4 glass-card flex flex-col items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border-red-200 dark:border-red-900/30"
              >
                <Lock className="text-red-500" />
                <span className="text-xs font-bold">Lock Admin</span>
              </button>
              <button 
                onClick={() => setShowChangePassword(true)}
                className="p-4 glass-card flex flex-col items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors border-blue-200 dark:border-blue-900/30"
              >
                <Key className="text-blue-500" />
                <span className="text-xs font-bold">Change Pass</span>
              </button>
            </div>

            {showChangePassword && (
              <div className="mt-6 p-6 glass-card w-full text-left space-y-4 border-blue-200 dark:border-blue-900/30">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <Key size={16} className="text-blue-500" /> Change Admin Password
                </h4>
                <div className="space-y-3">
                  <input 
                    type="password" 
                    placeholder="Old Password"
                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={oldPass}
                    onChange={e => setOldPass(e.target.value)}
                  />
                  <input 
                    type="password" 
                    placeholder="New Password"
                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                  />
                  <input 
                    type="password" 
                    placeholder="Confirm New Password"
                    className="w-full bg-gray-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                  />
                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={handleChangePassword}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs"
                    >
                      Update Password
                    </button>
                    <button 
                      onClick={() => setShowChangePassword(false)}
                      className="flex-1 py-2 bg-gray-100 dark:bg-slate-800 text-gray-500 rounded-xl font-bold text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Debug Info */}
            {user && (
              <div className="mt-8 p-4 glass-card w-full text-left">
                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">System Debug</h4>
                <p className="text-[10px] text-gray-500 break-all">UID: {user.uid}</p>
                <div className="flex gap-4 mt-1">
                  <p className="text-[10px] text-gray-500">Products: <span className="font-bold text-blue-600">{products.length}</span></p>
                  <p className="text-[10px] text-gray-500">Clients: <span className="font-bold text-blue-600">{clients.length}</span></p>
                </div>
                <button 
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="mt-3 text-[10px] text-red-500 font-bold underline flex items-center gap-1"
                >
                  <RefreshCcw size={10} /> Clear Local Cache & Reload
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Customization */}
            <div className="glass-card p-6 space-y-4">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Customization</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                      <Image size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Custom Logo</p>
                      <p className="text-[10px] text-gray-500">Change brand identity</p>
                    </div>
                  </div>
                  <label className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-700 transition-colors">
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600">
                      <Music size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Intro Music</p>
                      <p className="text-[10px] text-gray-500">Custom startup sound</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {customIntroMusic && (
                      <button 
                        onClick={() => {
                          setCustomIntroMusic(null);
                          localStorage.removeItem('cctv_custom_intro_music');
                          addNotification("Intro music reset!");
                        }}
                        className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <label className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-purple-700 transition-colors">
                      Upload
                      <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleAudioUpload(e, 'intro')} />
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600">
                      <Zap size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Click Sound</p>
                      <p className="text-[10px] text-gray-500">Custom button feedback</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {customClickSound && (
                      <button 
                        onClick={() => {
                          setCustomClickSound(null);
                          localStorage.removeItem('cctv_custom_click_sound');
                          addNotification("Click sound reset!");
                        }}
                        className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <label className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-orange-700 transition-colors">
                      Upload
                      <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleAudioUpload(e, 'click')} />
                    </label>
                  </div>
                </div>
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

            {/* App Features */}
            <div className="glass-card p-6 space-y-4">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">App Features</h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                  <Zap size={18} className="text-blue-600" />
                  <span className="text-xs font-bold">High Speed Bandwidth Test</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl">
                  <Zap size={18} className="text-orange-600" />
                  <span className="text-xs font-bold">Turbo Mode Speed Test</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card overflow-hidden h-fit">
            <div className="p-4 border-b dark:border-slate-800 font-bold text-sm flex justify-between items-center">
              Company Rules
              <button onClick={() => setShowEditRules(true)} className="text-blue-600"><Plus size={16} /></button>
            </div>
            <div className="p-4 space-y-3">
              {rules.map((rule, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{index + 1}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{rule}</p>
                </div>
              ))}
            </div>
          </div>

          {showEditRules && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowEditRules(false)}>
              <div className="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">Edit Company Rules</h3>
                <textarea 
                  className="w-full h-40 p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border-none text-sm"
                  value={rules.join('\n')}
                  onChange={(e) => setRules(e.target.value.split('\n'))}
                />
                <button 
                  onClick={() => setShowEditRules(false)}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold mt-4"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          <div className="space-y-6">
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

            <div className="p-4 grid grid-cols-3 gap-3 glass-card">
              <button 
                onClick={() => shareApp()}
                className="flex flex-col items-center gap-1 p-2"
              >
                <Share2 size={18} className="text-blue-500" />
                <span className="text-[8px] font-bold">Share Link</span>
              </button>
              <label className="flex flex-col items-center gap-1 p-2 cursor-pointer">
                <RefreshCcw size={18} className="text-amber-500" />
                <span className="text-[8px] font-bold">Restore</span>
                <input type="file" className="hidden" accept=".json" onChange={(e) => withPassword(() => importAppData(e))} />
              </label>
              <button 
                onClick={() => onBackup()}
                className="flex flex-col items-center gap-1 p-2"
              >
                <Database size={18} className="text-slate-500" />
                <span className="text-[8px] font-bold">Inventory</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ExpensePage = () => {
    const [showAdd, setShowAdd] = useState(false);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    return (
      <div className="space-y-4 pb-20 md:pb-0">
        <div className="glass-card p-6 bg-gradient-to-br from-red-500 to-orange-600 text-white">
          <p className="text-xs font-bold uppercase opacity-80">Total Expenses</p>
          <h2 className="text-3xl font-bold mt-1">{formatCurrency(totalExpenses)}</h2>
        </div>

        <div className="flex justify-between items-center">
          <h3 className="font-bold">Recent Expenses</h3>
          <button 
            onClick={() => withPassword(() => setShowAdd(true))}
            className="p-2 bg-blue-600 text-white rounded-lg"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {expenses.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm italic col-span-full">No expenses recorded</p>
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
    const [installationDate, setInstallationDate] = useState(new Date().toISOString().split('T')[0]);
    const [warrantyExpiry, setWarrantyExpiry] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!name || !phone) return;
      handleAddClient({
        name,
        phone,
        address,
        installationDate,
        warrantyExpiry,
        notes,
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
          className="w-full max-w-[450px] bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
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

            <div className="grid grid-cols-2 gap-4">
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
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Installation Date</label>
                <input 
                  type="date" 
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                  value={installationDate}
                  onChange={e => setInstallationDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Warranty Expiry</label>
              <input 
                type="date" 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                value={warrantyExpiry}
                onChange={e => setWarrantyExpiry(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Address</label>
              <textarea 
                placeholder="Enter client address" 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20 min-h-[60px]"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Notes</label>
              <textarea 
                placeholder="Additional notes about client or installation" 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20 min-h-[60px]"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <motion.button 
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl opacity-90 hover:opacity-100 mt-4"
            >
              Add Client
            </motion.button>
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

            <motion.button 
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl opacity-90 hover:opacity-100 mt-4"
            >
              Save Expense
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    );
  };

  // --- Main Render ---

  return (
    <div className="w-full max-w-[450px] md:max-w-none mx-auto min-h-screen relative shadow-2xl overflow-hidden bg-gray-50 dark:bg-slate-950 flex flex-col md:flex-row">
      <AnimatePresence>
        {showSplash && <SplashScreen customLogo={customLogo} />}
        {showAddProduct && (
          <AddProductModal 
            onClose={() => setShowAddProduct(false)} 
            onAdd={handleAddProduct} 
            productCategories={productCategories}
            setProductCategories={setProductCategories}
          />
        )}
        {showEditProduct && (
          <EditProductModal 
            product={showEditProduct}
            onClose={() => setShowEditProduct(null)} 
            onSave={handleEditProduct} 
            productCategories={productCategories}
            setProductCategories={setProductCategories}
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

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r dark:border-slate-800 h-screen sticky top-0 z-40 shrink-0">
        <div className="p-6 flex items-center gap-3 border-b dark:border-slate-800">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
            {customLogo ? (
              <img src={customLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <ShieldCheck size={24} />
            )}
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">IT Department Pro</h1>
            <p className="text-[10px] text-gray-500 font-medium">Management System</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: true },
            { id: 'clients', icon: Users, label: 'Clients', adminOnly: true },
            { id: 'products', icon: ShoppingCart, label: 'Products & Orders', adminOnly: false },
            { id: 'expenses', icon: Wallet, label: 'Expenses', adminOnly: true },
            { id: 'bandwidth', icon: Zap, label: 'Bandwidth Test', adminOnly: false },
            { id: 'warranty', icon: ShieldCheck, label: 'Warranty', adminOnly: true },
            { id: 'me', icon: User, label: 'Profile & Settings', adminOnly: false },
          ].filter(item => isAdmin || !item.adminOnly).map(item => (
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              key={item.id}
              onClick={() => {
                if (item.id === 'products' && isAdmin && publicOrders.length > 0) {
                  setShowPendingOrders(true);
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300",
                activeTab === item.id 
                  ? "bg-green-600 text-white font-bold shadow-lg shadow-green-500/30" 
                  : "bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-md shadow-blue-500/20"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                <span className="text-sm">{item.label}</span>
              </div>
              {item.id === 'products' && isAdmin && publicOrders.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {publicOrders.length}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="p-4 flex justify-between items-center sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-30 border-b dark:border-slate-800 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden">
              {customLogo ? (
                <img src={customLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <ShieldCheck size={24} />
              )}
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none">IT Department Pro</h1>
              <p className="text-[10px] text-gray-500 font-medium">Management System</p>
            </div>
          </div>
          
          <div className="hidden md:block">
            <h2 className="text-xl font-bold capitalize">
              {activeTab === 'me' ? 'Profile & Settings' : activeTab}
            </h2>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl transition-all duration-300 text-gray-600 dark:text-gray-300 shadow-sm hover:shadow-lg"
            >
              {isDarkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-blue-600" />}
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowCart(true)}
              className="p-2.5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl text-gray-600 dark:text-gray-300 relative shadow-sm hover:shadow-lg"
            >
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </motion.button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="max-w-7xl mx-auto"
            >
              {activeTab === 'dashboard' && (
                <Dashboard 
                  products={products}
                  clients={clients}
                  expenses={expenses}
                  formatCurrency={formatCurrency}
                  addToCart={addToCart}
                  setActiveTab={setActiveTab}
                />
              )}
              {activeTab === 'clients' && (
                <ClientList 
                  clients={clients}
                  formatCurrency={formatCurrency}
                  setShowClientProfile={setShowClientProfile}
                  withPassword={withPassword}
                  setShowAddClient={setShowAddClient}
                />
              )}
              {activeTab === 'products' && (
                <ProductList 
                  products={products}
                  inventoryMode={inventoryMode}
                  setInventoryMode={(v) => v ? withPassword(() => setInventoryMode(v)) : setInventoryMode(v)}
                  setShowAddProduct={(v) => v ? withPassword(() => setShowAddProduct(v), true) : setShowAddProduct(v)}
                  setSelectedProduct={(p) => setSelectedProduct(p)}
                  handleDeleteProduct={(id) => withPassword(() => handleDeleteProduct(id))}
                  onEditProduct={(p) => withPassword(() => setShowEditProduct(p), true)}
                  addToCart={addToCart}
                  isDarkMode={isDarkMode}
                  formatCurrency={formatCurrency}
                  productCategories={productCategories}
                />
              )}
              {activeTab === 'expenses' && (
                <ExpensePage />
              )}
              {activeTab === 'bandwidth' && (
                <BandwidthTestPage />
              )}
              {activeTab === 'warranty' && <WarrantyPage clients={clients} />}
              {activeTab === 'me' && (
                <MePage 
                  isDarkMode={isDarkMode}
                  setIsDarkMode={setIsDarkMode}
                  customLogo={customLogo}
                  setCustomLogo={setCustomLogo}
                  customIntroMusic={customIntroMusic}
                  setCustomIntroMusic={setCustomIntroMusic}
                  customClickSound={customClickSound}
                  setCustomClickSound={setCustomClickSound}
                  onBackup={generateInventoryPDF}
                  onOpenCalculator={() => setShowCalculator(true)}
                  onLock={lockAdmin}
                  adminPassword={adminPassword}
                  setAdminPassword={setAdminPassword}
                  user={user}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Navigation - Mobile Only */}
        <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t dark:border-slate-800 px-2 py-3 flex justify-around items-center z-40">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Home', adminOnly: true },
            { id: 'clients', icon: Users, label: 'Clients', adminOnly: true },
            { id: 'products', icon: ShoppingCart, label: 'Order', adminOnly: false },
            { id: 'expenses', icon: Wallet, label: 'Cash', adminOnly: true },
            { id: 'bandwidth', icon: Zap, label: 'Speed', adminOnly: false },
            { id: 'warranty', icon: ShieldCheck, label: 'Safety', adminOnly: true },
            { id: 'me', icon: User, label: 'Me', adminOnly: false },
          ].filter(item => isAdmin || !item.adminOnly).map(item => (
            <motion.button 
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.9 }}
              key={item.id}
              onClick={() => {
                if (item.id === 'products' && isAdmin && publicOrders.length > 0) {
                  setShowPendingOrders(true);
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-300 px-3 py-1 rounded-xl relative",
                activeTab === item.id 
                  ? "bg-green-600 text-white scale-110 shadow-lg shadow-green-500/30" 
                  : "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              )}
            >
              <item.icon size={activeTab === item.id ? 24 : 20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className="text-[10px] font-bold">{item.label}</span>
              {activeTab === item.id && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-1 h-1 bg-white rounded-full mt-0.5" 
                />
              )}
              {item.id === 'products' && isAdmin && publicOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-slate-900">
                  {publicOrders.length}
                </span>
              )}
            </motion.button>
          ))}
        </nav>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showPendingOrders && (
          <PendingOrdersModal />
        )}
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
            onSetInstallationDate={handleSetInstallationDate}
            onUpdateNotes={handleUpdateNotes}
            onDeleteClient={(id) => withPassword(() => handleDeleteClient(id))}
            onUpdateOrderStatus={updateOrderStatus}
            onUpdateClientDetails={handleUpdateClientDetails}
            formatCurrency={formatCurrency}
            generateWhatsAppMessage={generateWhatsAppMessage}
            generateClientProfilePDF={generateClientProfilePDF}
            handleDeleteWork={handleDeleteWork}
            handleDeletePayment={handleDeletePayment}
            handleDeleteOrder={handleDeleteOrder}
            handleAddWork={handleAddWork}
            handleAddPayment={handleAddPayment}
            clients={clients}
          />
        )}
        {showAddClient && (
          <AddClientModal onClose={() => setShowAddClient(false)} />
        )}
        {showCalculator && (
          <CalculatorModal onClose={() => setShowCalculator(false)} />
        )}
        {showPasswordModal && (
          <PasswordModal />
        )}
      </AnimatePresence>
    </div>
  );
}

const AddWorkModal = ({ clientId, onClose, handleAddWork }: { clientId: number, onClose: () => void, handleAddWork: (clientId: number, description: string, amount: number) => void }) => {
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
          <motion.button 
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl opacity-90 hover:opacity-100 mt-4"
          >
            Save Work
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const AddPaymentModal = ({ clientId, onClose, handleAddPayment }: { clientId: number, onClose: () => void, handleAddPayment: (clientId: number, amount: number, type: 'Cash' | 'Bkash' | 'Bank', purpose: string) => void }) => {
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

const EditClientModal = ({ client, onClose, onUpdate }: { client: Client, onClose: () => void, onUpdate: (id: number, details: { name: string, phone: string, address: string }) => void }) => {
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone);
  const [address, setAddress] = useState(client.address);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !address) return;
    onUpdate(client.id, { name, phone, address });
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-2xl font-black mb-6">Edit Client</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Name</label>
            <input 
              type="text" 
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Phone</label>
            <input 
              type="text" 
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Address</label>
            <input 
              type="text" 
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/20 mt-4"
          >
            Update Details
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const ClientProfile = ({ 
  client, 
  onClose,
  onUpdateImage,
  onSetWarranty,
  onSetInstallationDate,
  onUpdateNotes,
  onDeleteClient,
  onUpdateOrderStatus,
  onUpdateClientDetails,
  formatCurrency,
  generateWhatsAppMessage,
  generateClientProfilePDF,
  handleDeleteWork,
  handleDeletePayment,
  handleDeleteOrder,
  handleAddWork,
  handleAddPayment,
  clients
}: { 
  client: Client, 
  onClose: () => void,
  onUpdateImage: (id: number, img: string | null) => void,
  onSetWarranty: (id: number, date: string) => void,
  onSetInstallationDate: (id: number, date: string) => void,
  onUpdateNotes: (id: number, notes: string) => void,
  onDeleteClient: (id: number) => void,
  onUpdateOrderStatus: (clientId: number, orderId: string, status: OrderStatus) => void,
  onUpdateClientDetails: (id: number, details: { name: string, phone: string, address: string }) => void,
  formatCurrency: (v: number) => string,
  generateWhatsAppMessage: (c: Client, items: any[], total: number) => void,
  generateClientProfilePDF: (c: Client) => void,
  handleDeleteWork: (clientId: number, workId: string) => void,
  handleDeletePayment: (clientId: number, paymentId: string) => void,
  handleDeleteOrder: (clientId: number, orderId: string) => void,
  handleAddWork: (clientId: number, description: string, amount: number) => void,
  handleAddPayment: (clientId: number, amount: number, type: 'Cash' | 'Bkash' | 'Bank', purpose: string) => void,
  clients: Client[]
}) => {
  const [showAddWork, setShowAddWork] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showEditDetails, setShowEditDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentClient = clients.find(c => c.id === client.id) || client;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIMENSION = 512;
          
          if (width > height && width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            onUpdateImage(currentClient.id, canvas.toDataURL(file.type || 'image/jpeg', 0.7));
          } else {
            onUpdateImage(currentClient.id, reader.result as string);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'bg-amber-100 text-amber-600';
      case OrderStatus.PROCESSING: return 'bg-blue-100 text-blue-600';
      case OrderStatus.SHIPPED: return 'bg-purple-100 text-purple-600';
      case OrderStatus.DELIVERED: return 'bg-emerald-100 text-emerald-600';
      case OrderStatus.CANCELLED: return 'bg-rose-100 text-rose-600';
      default: return 'bg-gray-100 text-gray-600';
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
        <h2 className="font-bold text-lg flex-1">Client Profile</h2>
        <button 
          onClick={() => setShowEditDetails(true)}
          className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
        >
          <Edit2 size={20} />
        </button>
      </div>

      <div className="p-4 space-y-6 pb-24">
        <div className="glass-card p-6 flex flex-col items-center text-center relative overflow-hidden">
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
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Calendar size={16} className="text-blue-600" /> Installation Date
              </h4>
              <input 
                type="date" 
                className="text-xs bg-gray-50 dark:bg-slate-800 border-none rounded-lg p-1 outline-none font-bold"
                value={currentClient.installationDate || ''}
                onChange={(e) => onSetInstallationDate(currentClient.id, e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-600" /> Warranty Expiry
              </h4>
              <input 
                type="date" 
                className="text-xs bg-gray-50 dark:bg-slate-800 border-none rounded-lg p-1 outline-none font-bold"
                value={currentClient.warrantyExpiry || ''}
                onChange={(e) => onSetWarranty(currentClient.id, e.target.value)}
              />
            </div>

            {currentClient.warrantyExpiry && (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/10 p-2 rounded-xl">
                <p className="text-[10px] text-gray-500">Status: <span className="font-bold text-blue-600">Active</span></p>
                <span className="text-[10px] text-gray-400 italic">Expires: {currentClient.warrantyExpiry}</span>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-4 rounded-3xl border border-gray-100 dark:border-slate-800">
          <h4 className="font-bold text-sm flex items-center gap-2 mb-3">
            <FileText size={16} className="text-blue-600" /> Client Notes
          </h4>
          <textarea 
            className="w-full text-xs bg-gray-50 dark:bg-slate-800 border-none rounded-xl p-3 outline-none min-h-[80px] font-medium"
            placeholder="Add notes about this client..."
            value={currentClient.notes || ''}
            onChange={(e) => onUpdateNotes(currentClient.id, e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => generateWhatsAppMessage(currentClient, [], 0)}
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
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-black uppercase",
                      getStatusColor(order.status || OrderStatus.PENDING)
                    )}>
                      {order.status || OrderStatus.PENDING}
                    </span>
                    <span className="text-xs text-gray-500">{order.date}</span>
                    <button 
                      onClick={() => handleDeleteOrder(currentClient.id, order.id)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Update Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.values(OrderStatus).map((status) => {
                      const isCurrent = (order.status || OrderStatus.PENDING) === status;
                      return (
                        <button
                          key={status}
                          onClick={() => onUpdateOrderStatus(currentClient.id, order.id, status)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                            isCurrent 
                              ? `${getStatusColor(status)} border-transparent shadow-sm scale-105`
                              : "bg-white dark:bg-slate-800 text-gray-500 border-gray-100 dark:border-slate-700 hover:border-blue-200"
                          )}
                        >
                          {status}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1 mt-4 pt-3 border-t dark:border-slate-800">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Items</p>
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-[10px] font-medium">
                      <span className="text-gray-600 dark:text-gray-400">{item.name} x {item.quantity}</span>
                      <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
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
          <AddWorkModal clientId={client.id} onClose={() => setShowAddWork(false)} handleAddWork={handleAddWork} />
        )}
        {showAddPayment && (
          <AddPaymentModal clientId={client.id} onClose={() => setShowAddPayment(false)} handleAddPayment={handleAddPayment} />
        )}
        {showEditDetails && (
          <EditClientModal client={currentClient} onClose={() => setShowEditDetails(false)} onUpdate={onUpdateClientDetails} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
