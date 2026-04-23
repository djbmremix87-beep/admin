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
  Menu,
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
  Image as ImageIcon,
  Music,
  Wand2,
  Ticket,
  MessageCircle,
  AlertCircle,
  CreditCard,
  History,
  ArrowUpCircle,
  Megaphone,
  Headphones,
  Bot,
  LayoutGrid,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
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

interface OfferComment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: string;
}

interface Offer {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  authorName: string;
  likes?: string[]; // Array of user UIDs
  comments?: OfferComment[];
  shares?: number;
}

interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  area?: string;
  active: boolean;
  createdAt: string;
}

// --- Helpers ---
export const generateOrderPDF = (order: PublicOrder) => {
  const doc = new jsPDF();
  
  doc.setFontSize(22);
  doc.text('Invoice / Receipt', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(`Order ID: ${order.id}`, 14, 35);
  doc.text(`Date: ${order.date}`, 14, 42);
  
  doc.setFontSize(14);
  doc.text('Customer Details:', 14, 55);
  doc.setFontSize(11);
  doc.text(`Name: ${order.customerName}`, 14, 62);
  doc.text(`Phone: ${order.customerPhone}`, 14, 69);
  doc.text(`Address: ${order.customerAddress}`, 14, 76);
  
  const tableData = order.items.map(item => [
    item.name,
    item.quantity.toString(),
    formatCurrency(item.price),
    formatCurrency(item.price * item.quantity)
  ]);
  
  autoTable(doc, {
    startY: 85,
    head: [['Item', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    foot: [['', '', 'Grand Total:', formatCurrency(order.total)]],
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] } // Tailwind green-500
  });
  
  doc.save(`Order_${order.id}.pdf`);
};

export const generateReceiptPDF = (order: Order) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('IT DEPARTMENT PRO', 20, 25);
  doc.setFontSize(10);
  doc.text('DIGITAL MONEY RECEIPT', 20, 32);
  doc.text('Email: itdepartmentpro33@gmail.com', 20, 37);
  
  // Order Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text(`Order ID: ${order.id}`, 20, 55);
  doc.text(`Date: ${new Date(order.date).toLocaleDateString()}`, 20, 62);
  doc.text(`Status: ${order.status.toUpperCase()}`, 20, 69);
  
  // Table
  autoTable(doc, {
    startY: 80,
    head: [['Product', 'Qty', 'Price', 'Total']],
    body: order.items.map(item => [
      item.name,
      item.quantity,
      formatCurrency(item.price),
      formatCurrency(item.price * item.quantity)
    ]),
    foot: [['', '', 'Grand Total', formatCurrency(order.total)]],
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
    footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' }
  });
  
  // Footer
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', 105, finalY, { align: 'center' });
  doc.text('This is a computer generated receipt.', 105, finalY + 7, { align: 'center' });
  
  doc.save(`Receipt-${order.id}.pdf`);
};

// --- Components ---

const AIHelpDesk = ({ user, isAdmin, businessData, isDarkMode }: { user: FirebaseUser | null, isAdmin?: boolean, businessData?: { products: Product[], clients: Client[], expenses: Expense[] }, isDarkMode: boolean }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'user', text: input.trim() }]);
      setMessages(prev => [...prev, { role: 'model', text: "AI is not configured. Please set the GEMINI_API_KEY in the Secrets panel." }]);
      setInput('');
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      let systemInstruction = "You are the IT Department Pro Assistant. You help users with internet issues, router settings, and billing questions for an ISP in Bangladesh. Be polite, professional, and helpful. You can speak both English and Bengali. If you don't know something, suggest they open a support ticket.";
      
      if (isAdmin && businessData) {
        const stats = {
          totalClients: businessData.clients.length,
          totalProducts: businessData.products.length,
          totalDue: businessData.clients.reduce((sum, c) => sum + c.due, 0),
          totalPaid: businessData.clients.reduce((sum, c) => sum + c.totalPaid, 0),
          lowStockItems: businessData.products.filter(p => p.stock < 5).map(p => p.name)
        };
        
        systemInstruction += `\n\nYou are also an Admin Assistant. You have access to the following business data:
- Total Clients: ${stats.totalClients}
- Total Products: ${stats.totalProducts}
- Total Due from Clients: ${stats.totalDue}
- Total Paid by Clients: ${stats.totalPaid}
- Low Stock Items: ${stats.lowStockItems.join(', ')}

You can help the admin with business insights, stock alerts, and financial summaries based on this data.`;
      }

      const genAI = new GoogleGenAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: systemInstruction,
      });

      const chat = model.startChat({
        history: messages.map(m => ({ 
          role: m.role === 'model' ? 'model' : 'user', 
          parts: [{ text: m.text }] 
        })),
      });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      const modelResponse = response.text() || "I'm sorry, I couldn't process that. Please try again or contact support.";
      setMessages(prev => [...prev, { role: 'model', text: modelResponse }]);
    } catch (error: any) {
      console.error("AI Error:", error);
      let errorMessage = "Sorry, I'm having trouble connecting right now. Please try again later.";
      
      if (error?.message?.includes("quota")) {
        errorMessage = "Sorry, I've reached my limit for now. Please try again in a few minutes.";
      } else if (error?.message?.includes("API key not valid")) {
        errorMessage = "The API key is invalid. Please check your GEMINI_API_KEY in the Secrets panel.";
      } else if (error?.message) {
        // Show a bit more detail if it's not a sensitive error
        errorMessage = `AI Error: ${error.message.substring(0, 100)}`;
      }
      
      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl">
      <div className={cn("p-6 text-white flex items-center gap-3", isDarkMode ? "bg-emerald-600" : "bg-orange-500")}>
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          <Bot size={24} />
        </div>
        <div>
          <h3 className="font-bold">AI Help Desk</h3>
          <p className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Powered by Gemini</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", isDarkMode ? "bg-emerald-900/20 text-emerald-500" : "bg-orange-50/50 text-orange-500")}>
              <MessageCircle size={32} />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2">How can I help you today?</h4>
            <p className="text-sm text-slate-500 max-w-[200px] mx-auto">Ask me about your internet, router settings, or billing.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
              m.role === 'user' 
                ? (isDarkMode ? "ml-auto bg-emerald-600 text-white rounded-tr-none" : "ml-auto bg-orange-500 text-white rounded-tr-none")
                : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-none"
            )}
          >
            {m.text}
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-2 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-none w-16">
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className={cn("w-1.5 h-1.5 rounded-full", isDarkMode ? "bg-emerald-500" : "bg-orange-500")} />
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className={cn("w-1.5 h-1.5 rounded-full", isDarkMode ? "bg-emerald-500" : "bg-orange-500")} />
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className={cn("w-1.5 h-1.5 rounded-full", isDarkMode ? "bg-emerald-500" : "bg-orange-500")} />
          </div>
        )}
      </div>

      <div className="p-4 border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={cn("p-3 text-white rounded-xl disabled:opacity-50 transition-all shadow-lg", isDarkMode ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20" : "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20")}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};


const OutageAlerts = ({ isAdmin }: { isAdmin: boolean }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [newAlert, setNewAlert] = useState({ title: '', message: '', type: 'info' as Alert['type'], area: '' });

  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'));
    getDocs(q).then((snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert)));
    }).catch(error => handleFirestoreError(error, OperationType.LIST, 'alerts'));
    return () => {};
  }, []);

  const handleAddAlert = async () => {
    if (!newAlert.title || !newAlert.message) return;
    try {
      const id = `ALT-${Date.now()}`;
      await setDoc(doc(db, 'alerts', id), {
        ...newAlert,
        id,
        active: true,
        createdAt: new Date().toISOString()
      });
      setShowAddAlert(false);
      setNewAlert({ title: '', message: '', type: 'info', area: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'alerts');
    }
  };

  const toggleAlert = async (id: string, active: boolean) => {
    try {
      await updateDoc(doc(db, 'alerts', id), { active });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'alerts');
    }
  };

  const activeAlerts = alerts.filter(a => a.active);

  if (activeAlerts.length === 0 && !isAdmin) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
          <Megaphone size={20} />
          <h3 className="font-bold">Maintenance & Alerts</h3>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddAlert(true)}
            className="text-xs font-bold bg-amber-100 text-amber-600 px-3 py-1 rounded-lg hover:bg-amber-200 transition-all"
          >
            Add Alert
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAddAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-lg space-y-3"
          >
            <input 
              placeholder="Alert Title"
              value={newAlert.title}
              onChange={e => setNewAlert({...newAlert, title: e.target.value})}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none"
            />
            <textarea 
              placeholder="Message"
              value={newAlert.message}
              onChange={e => setNewAlert({...newAlert, message: e.target.value})}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none"
            />
            <div className="flex gap-2">
              <select 
                value={newAlert.type}
                onChange={e => setNewAlert({...newAlert, type: e.target.value as any})}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
              <input 
                placeholder="Area (Optional)"
                value={newAlert.area}
                onChange={e => setNewAlert({...newAlert, area: e.target.value})}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddAlert} className="flex-1 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold">Post Alert</button>
              <button onClick={() => setShowAddAlert(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl text-sm font-bold">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-3">
        {(isAdmin ? alerts : activeAlerts).map(alert => (
          <motion.div
            key={alert.id}
            className={cn(
              "p-4 rounded-2xl border flex items-start gap-3 relative overflow-hidden",
              alert.type === 'critical' ? "bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30" :
              alert.type === 'warning' ? "bg-amber-50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30" :
              "bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30"
            )}
          >
            <div className={cn(
              "p-2 rounded-xl shrink-0",
              alert.type === 'critical' ? "bg-red-100 text-red-600" :
              alert.type === 'warning' ? "bg-amber-100 text-amber-600" :
              "bg-blue-100 text-blue-600"
            )}>
              <AlertCircle size={20} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-sm">{alert.title}</h4>
                {isAdmin && (
                  <button 
                    onClick={() => toggleAlert(alert.id, !alert.active)}
                    className={cn(
                      "text-[10px] font-black uppercase px-2 py-0.5 rounded",
                      alert.active ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                    )}
                  >
                    {alert.active ? 'Active' : 'Inactive'}
                  </button>
                )}
              </div>
              <p className="text-xs opacity-80 mt-1">{alert.message}</p>
              {alert.area && (
                <span className="inline-block mt-2 text-[10px] font-bold bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded uppercase tracking-wider">
                  Area: {alert.area}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};


const TrackOrderPage = ({ formatCurrency, clients }: { formatCurrency: (v: number) => string, clients: Client[] }) => {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    
    setLoading(true);
    setHasSearched(true);
    try {
      const unifiedOrders: any[] = [];
      
      // 1. Search in public_orders collection
      const q = query(collection(db, 'public_orders'), where('customerPhone', '==', phone));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(doc => {
        const data = doc.data() as PublicOrder;
        unifiedOrders.push({
          id: doc.id,
          source: 'public',
          date: data.date,
          status: data.status,
          total: data.total,
          items: data.items,
          original: data
        });
      });

      // 2. Search in registered clients
      const matchedClient = clients.find(c => c.phone === phone);
      if (matchedClient && matchedClient.orders) {
        matchedClient.orders.forEach(order => {
          unifiedOrders.push({
            id: order.id,
            source: 'client',
            date: order.date,
            status: order.status,
            total: order.total,
            items: order.items,
            original: order
          });
        });
      }

      setOrders(unifiedOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-black">Track My Order</h2>
        <p className="text-gray-500 text-sm">Enter your phone number to see the status of your orders</p>
      </div>

      <form onSubmit={handleTrack} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Phone Number</label>
          <div className="relative">
            <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01817..." 
              required
              className="w-full bg-gray-50 dark:bg-slate-900 rounded-xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading || !phone}
          className="w-full bg-orange-600 text-white font-bold tracking-widest uppercase rounded-xl py-3 shadow-lg shadow-orange-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCcw className="animate-spin" size={20} /> : <Search size={20} />}
          {loading ? 'Tracking...' : 'Track Orders'}
        </motion.button>
      </form>

      {hasSearched && !loading && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 dark:bg-slate-800 rounded-3xl flex flex-col items-center justify-center text-gray-500">
              <Package size={40} className="mb-4 opacity-50" />
              <p>No orders found for this number.</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-xl flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-700 pb-3">
                  <div>
                    <h4 className="font-black">Order ID: {order.id.slice(-6)}</h4>
                    <span className="text-[10px] text-gray-400 font-bold">{order.date}</span>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest",
                    (order.status === 'pending' || order.status === 'processing') ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30' :
                    (order.status === 'accepted' || order.status === 'delivered') ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30'
                  )}>
                    {order.status}
                  </div>
                </div>
                
                {/* Visual Status Tracker */}
                <div className="py-4 border-b border-gray-100 dark:border-slate-700">
                   <div className="flex items-center justify-between relative">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-slate-700 z-0 rounded-full" />
                      <div className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 h-1 z-0 rounded-full transition-all duration-1000",
                        order.status === 'cancelled' || order.status === 'rejected' ? "bg-red-500 w-full" :
                        order.status === 'pending' ? "bg-yellow-500 w-[10%]" :
                        order.status === 'accepted' ? "bg-blue-500 w-[30%]" :
                        order.status === 'processing' ? "bg-blue-500 w-[50%]" :
                        order.status === 'shipped' ? "bg-orange-500 w-[75%]" :
                        order.status === 'delivered' ? "bg-green-500 w-full" : "bg-gray-300 w-0"
                      )} />
                      
                      {['Pending', 'Processing', 'Shipped', 'Delivered'].map((step, stepId) => {
                         const isActive = 
                           (step === 'Pending' && ['pending', 'accepted', 'processing', 'shipped', 'delivered'].includes(order.status)) ||
                           (step === 'Processing' && ['processing', 'shipped', 'delivered'].includes(order.status)) ||
                           (step === 'Shipped' && ['shipped', 'delivered'].includes(order.status)) ||
                           (step === 'Delivered' && ['delivered'].includes(order.status));
                           
                         const isCancelled = order.status === 'cancelled' || order.status === 'rejected';

                         return (
                           <div key={step} className="relative z-10 flex flex-col items-center gap-1 bg-white dark:bg-slate-800 px-2">
                             <div className={cn(
                               "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                               isCancelled ? "bg-red-500 border-red-500" :
                               isActive ? "bg-white dark:bg-slate-800 border-green-500" : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600"
                             )}>
                               {isActive && !isCancelled && <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
                             </div>
                             <span className={cn(
                               "text-[9px] font-bold uppercase tracking-tighter absolute -bottom-4 truncate",
                               isCancelled ? "text-red-500" :
                               isActive ? "text-slate-800 dark:text-slate-200" : "text-gray-400"
                             )}>{step}</span>
                           </div>
                         );
                      })}
                   </div>
                </div>

                <div className="space-y-2 mt-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-300">{item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                      <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-slate-700 mt-2">
                  <span className="font-bold text-gray-500 uppercase text-xs">Total</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => generateOrderPDF(order.original)}
                      className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors"
                      title="Download Invoice"
                    >
                      <Download size={14} />
                    </button>
                    <span className="font-black text-orange-600 text-lg">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const OffersPage = ({ isAdmin, offers, user, addNotification, withPassword }: { isAdmin: boolean, offers: Offer[], user: FirebaseUser | null, addNotification: (text: string) => void, withPassword: (action: () => void, strict?: boolean) => void }) => {
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        addNotification('File is too large. Please select an image under 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Max dimensions for compression - increased for higher resolution
          const MAX_WIDTH = 1600;
          const MAX_HEIGHT = 1600;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.8 quality for better resolution
          let quality = 0.8;
          let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          
          // Iteratively reduce quality if still too large for Firestore (1MB limit)
          while (compressedDataUrl.length > 950000 && quality > 0.1) {
            quality -= 0.1;
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          
          if (compressedDataUrl.length > 1000000) {
            addNotification('Image is still too large. Please try a smaller image or lower resolution.');
            return;
          }
          
          setImageUrl(compressedDataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const offerId = `OFFER-${Date.now()}`;
      const newOffer: Offer = {
        id: offerId,
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl.trim() || undefined,
        createdAt: new Date().toISOString(),
        authorName: user?.displayName || 'Admin',
        likes: [],
        comments: [],
        shares: 0
      };
      await setDoc(doc(db, 'offers', offerId), newOffer);
      setShowAddOffer(false);
      setTitle('');
      setContent('');
      setImageUrl('');
      addNotification("অফার পাবলিশ করা হয়েছে!");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'offers');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLike = async (offer: Offer) => {
    if (!user) {
      addNotification("লাইক দিতে লগইন করুন!");
      return;
    }
    const userId = user.uid;
    const likes = offer.likes || [];
    const isLiked = likes.includes(userId);
    const newLikes = isLiked ? likes.filter(id => id !== userId) : [...likes, userId];

    try {
      await updateDoc(doc(db, 'offers', offer.id), { likes: newLikes });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `offers/${offer.id}`);
    }
  };

  const addComment = async (offerId: string) => {
    if (!user) {
      addNotification("কমেন্ট করতে লগইন করুন!");
      return;
    }
    const text = commentText[offerId]?.trim();
    if (!text) return;

    const newComment: OfferComment = {
      id: `COM-${Date.now()}`,
      userId: user.uid,
      userName: user.displayName || 'User',
      userPhoto: user.photoURL || undefined,
      text,
      createdAt: new Date().toISOString()
    };

    try {
      const offerRef = doc(db, 'offers', offerId);
      const offerSnap = await getDoc(offerRef);
      if (offerSnap.exists()) {
        const currentComments = offerSnap.data().comments || [];
        await updateDoc(offerRef, { comments: [...currentComments, newComment] });
        setCommentText(prev => ({ ...prev, [offerId]: '' }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `offers/${offerId}`);
    }
  };

  const shareOffer = async (offer: Offer) => {
    const shareUrl = `${window.location.origin}?tab=offers&id=${offer.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: offer.title,
          text: offer.content,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        addNotification("লিঙ্ক কপি করা হয়েছে!");
      }
      
      const offerRef = doc(db, 'offers', offer.id);
      const offerSnap = await getDoc(offerRef);
      if (offerSnap.exists()) {
        const currentShares = offerSnap.data().shares || 0;
        await updateDoc(offerRef, { shares: currentShares + 1 });
      }
    } catch (error) {
      console.error("Sharing failed", error);
    }
  };

  const deleteOffer = (id: string) => {
    withPassword(async () => {
      try {
        await deleteDoc(doc(db, 'offers', id));
        addNotification("অফার মুছে ফেলা হয়েছে!");
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `offers/${id}`);
      }
    });
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">অফার ও আপডেট</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">সর্বশেষ অফার এবং গুরুত্বপূর্ণ ঘোষণা</p>
        </div>
        {isAdmin && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddOffer(!showAddOffer)}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {showAddOffer ? <X size={20} /> : <Plus size={20} />}
            {showAddOffer ? 'বন্ধ করুন' : 'নতুন পোস্ট'}
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showAddOffer && isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-xl"
          >
            <form onSubmit={handleAddOffer} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">পোস্টের শিরোনাম</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="অফারের নাম লিখুন..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">বিস্তারিত বর্ণনা</label>
                <textarea
                  required
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="অফার সম্পর্কে বিস্তারিত লিখুন..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">ছবি আপলোড করুন (ঐচ্ছিক)</label>
                <div className="flex gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold text-slate-500 hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                  >
                    <ImageIcon size={20} />
                    {imageUrl ? 'ছবি পরিবর্তন করুন' : 'ছবি নির্বাচন করুন'}
                  </button>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="px-5 bg-red-50 text-red-500 rounded-2xl font-bold"
                    >
                      মুছে ফেলুন
                    </button>
                  )}
                </div>
                {imageUrl && (
                  <div className="mt-4 relative rounded-2xl overflow-hidden border dark:border-slate-800">
                    <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <RefreshCcw className="animate-spin" size={20} /> : <Send size={20} />}
                {isSubmitting ? 'পোস্ট হচ্ছে...' : 'পাবলিশ করুন'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-8">
        {offers.length === 0 ? (
          <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-900/50 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <Megaphone size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">এখনও কোনো অফার পোস্ট করা হয়নি।</p>
          </div>
        ) : (
          offers.map((offer) => {
            const isLiked = user && offer.likes?.includes(user.uid);
            return (
              <motion.div
                key={offer.id}
                layout
                className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                {/* Post Header */}
                <div className="p-6 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 overflow-hidden">
                      {(!offer.authorName || offer.authorName === 'Admin') ? <User size={24} /> : <div className="font-bold">{offer.authorName[0]}</div>}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{offer.authorName || 'Admin'}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {new Date(offer.createdAt).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button 
                      onClick={() => deleteOffer(offer.id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>

                {/* Post Content */}
                <div className="px-6 pb-4">
                  <h4 className="text-xl font-black text-slate-900 dark:text-white mb-3">{offer.title}</h4>
                  <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                    {offer.content}
                  </p>
                </div>

                {/* Post Image */}
                {offer.imageUrl && (
                  <div className="mt-2">
                    <img 
                      src={offer.imageUrl} 
                      alt={offer.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-auto max-h-[600px] object-cover"
                    />
                  </div>
                )}

                {/* Stats Bar */}
                {( (offer.likes?.length || 0) > 0 || (offer.comments?.length || 0) > 0 || (offer.shares || 0) > 0 ) && (
                  <div className="px-6 py-2 flex justify-between items-center text-[10px] font-bold text-slate-400 border-b dark:border-slate-800">
                    <div className="flex items-center gap-1">
                      { (offer.likes?.length || 0) > 0 && (
                        <span className="flex items-center gap-0.5">
                          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[8px] text-white">
                            <Sparkles size={8} />
                          </div>
                          {offer.likes?.length}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      { (offer.comments?.length || 0) > 0 && <span>{offer.comments?.length} কমেন্ট</span> }
                      { (offer.shares || 0) > 0 && <span>{offer.shares} শেয়ার</span> }
                    </div>
                  </div>
                )}

                {/* Post Footer (Facebook style) */}
                <div className="p-2 flex items-center justify-around">
                  <button 
                    onClick={() => toggleLike(offer)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl font-bold text-sm transition-all",
                      isLiked ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <Sparkles size={18} className={isLiked ? "fill-current" : ""} />
                    <span>লাইক</span>
                  </button>
                  <button 
                    onClick={() => setShowComments(prev => ({ ...prev, [offer.id]: !prev[offer.id] }))}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    <MessageCircle size={18} />
                    <span>কমেন্ট</span>
                  </button>
                  <button 
                    onClick={() => shareOffer(offer)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    <Share2 size={18} />
                    <span>শেয়ার</span>
                  </button>
                </div>

                {/* Comments Section */}
                <AnimatePresence>
                  {showComments[offer.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden"
                    >
                      <div className="p-6 space-y-4">
                        {/* Comment Input */}
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                            {user?.photoURL ? <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : user?.displayName?.[0] || '?'}
                          </div>
                          <div className="flex-1 flex gap-2">
                            <input 
                              type="text"
                              placeholder="কমেন্ট লিখুন..."
                              value={commentText[offer.id] || ''}
                              onChange={(e) => setCommentText(prev => ({ ...prev, [offer.id]: e.target.value }))}
                              onKeyPress={(e) => e.key === 'Enter' && addComment(offer.id)}
                              className="flex-1 bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                            <button 
                              onClick={() => addComment(offer.id)}
                              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
                            >
                              <Send size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                          {offer.comments?.length === 0 ? (
                            <p className="text-center py-4 text-xs text-slate-400 italic">প্রথম কমেন্টটি আপনি করুন!</p>
                          ) : (
                            offer.comments?.slice().reverse().map((comment) => (
                              <div key={comment.id} className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0 overflow-hidden">
                                  {comment.userPhoto ? <img src={comment.userPhoto} alt={comment.userName || 'User'} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : (comment.userName ? comment.userName[0] : 'U')}
                                </div>
                                <div className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-800">
                                  <div className="flex justify-between items-center mb-1">
                                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">{comment.userName || 'User'}</h5>
                                    <span className="text-[8px] text-slate-400 font-bold uppercase">
                                      {new Date(comment.createdAt).toLocaleDateString('bn-BD')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{comment.text}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

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

          <div className="space-y-3 bg-gray-50 dark:bg-slate-800/20 p-4 rounded-3xl border border-gray-100 dark:border-slate-800">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
               <FileText size={14} />
               {product.description ? 'Detailed Description' : 'Specifications'}
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">
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
                : "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            )}
          >
            {product.stock > 0 ? 'Add to Order' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CategoryManager = ({ 
  productCategories, 
  setProductCategories,
  products 
}: { 
  productCategories: string[], 
  setProductCategories: (cats: string[]) => void,
  products: Product[]
}) => {
  const [newCat, setNewCat] = useState('');

  const handleDeleteCategory = (catToDelete: string) => {
    // Check if category is purely an enum value (base category)
    const baseCategories = ['CCTV', 'NVR', 'DVR', 'ACCESSORIES'];
    if (baseCategories.includes(catToDelete.toUpperCase())) {
      const confirm = window.confirm("This is a base category. Are you sure?");
      if (!confirm) return;
    }

    setProductCategories(productCategories.filter(c => c !== catToDelete));
  };

  const handleAddCategory = () => {
    if (newCat && !productCategories.includes(newCat)) {
      setProductCategories([...productCategories, newCat]);
      setNewCat('');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black tracking-tight uppercase">Manage Categories</h2>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Global Catalog Taxonomy Control</p>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div className="flex gap-3">
          <input 
            type="text" 
            placeholder="New category name..." 
            className="flex-1 px-5 py-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 outline-none font-bold text-sm focus:ring-2 focus:ring-green-500/20"
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
          />
          <button 
            onClick={handleAddCategory}
            className="px-6 py-4 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-green-500/20"
          >
            Add Category
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {productCategories.map(cat => {
            const productCount = products.filter(p => p.category === cat).length;
            return (
              <div 
                key={cat} 
                className="p-5 bg-gray-50 dark:bg-slate-800/40 rounded-3xl border border-gray-100 dark:border-slate-800 flex items-center justify-between group"
              >
                <div className="flex flex-col">
                  <span className="font-black text-sm uppercase tracking-tight">{cat}</span>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">{productCount} Products Linked</span>
                </div>
                <button 
                  onClick={() => handleDeleteCategory(cat)}
                  className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
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
  handleDeleteProduct: (id: number | string) => void, 
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
    <div className="space-y-8 pb-32 md:pb-0">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black tracking-tighter leading-none">{inventoryMode ? 'MASTER INVENTORY' : 'PREMIUM HARDWARE'}</h2>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-2">
              {inventoryMode ? 'Node Control & Management' : 'High-End Enterprise Solutions'}
            </p>
          </div>
          <div className="relative flex gap-3">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setInventoryMode(!inventoryMode)}
              className={cn(
                "h-12 px-5 rounded-2xl flex items-center justify-center gap-2 transition-all duration-500 font-bold text-sm",
                inventoryMode 
                  ? "bg-green-600/90 text-white shadow-xl shadow-green-500/30 backdrop-blur-md" 
                  : "bg-blue-600/90 text-white shadow-xl shadow-blue-500/30 backdrop-blur-md"
              )}
            >
              <Edit2 size={18} strokeWidth={2.5} />
              <span className="hidden sm:inline">{inventoryMode ? 'Exit Edit Mode' : 'Edit Mode'}</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1, rotate: -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                setShowAddProduct(true);
              }}
              className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-all backdrop-blur-md"
            >
              <Plus size={24} strokeWidth={3} />
            </motion.button>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto hide-scrollbar py-2">
          {allCategories.map(cat => (
            <motion.button 
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              key={cat}
              onClick={() => setFilter(cat)}
              className={cn(
                "px-6 py-3 rounded-[20px] text-[10px] font-black tracking-[0.1em] whitespace-nowrap transition-all duration-500 uppercase ring-1",
                filter === cat 
                  ? "bg-blue-600 text-white ring-blue-500 shadow-2xl shadow-blue-600/40" 
                  : "bg-white/10 text-gray-400 ring-white/10 hover:bg-white/20 hover:text-white"
              )}
            >
              {cat}
            </motion.button>
          ))}
        </div>

        <div className="relative group overflow-hidden rounded-2xl border border-white/10 shadow-inner">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Query infrastructure nodes..."
            className="w-full bg-white/5 dark:bg-slate-900/50 backdrop-blur-xl border-none pl-14 pr-6 py-5 text-sm font-medium focus:ring-2 focus:ring-orange-500/50 dark:focus:ring-emerald-500/50 transition-all placeholder:text-gray-500"
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
            className="group relative glass-card overflow-hidden hover:translate-y-[-8px] transition-all duration-700 cursor-pointer"
          >
            <div className="aspect-[4/5] bg-slate-950/20 dark:bg-slate-900/50 flex items-center justify-center relative overflow-hidden">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
              ) : (
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="text-gray-300 dark:text-slate-700 opacity-20"
                >
                  <Package size={80} strokeWidth={1} />
                </motion.div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {product.badge && (
                <div className="absolute top-4 left-4 z-10">
                  <span className={cn(
                    "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-2xl backdrop-blur-md ring-1 ring-white/20",
                    product.badge === 'new' ? "bg-blue-600/90 text-white" : 
                    product.badge === 'hot' ? "bg-rose-500/90 text-white" : "bg-amber-500/90 text-white"
                  )}>
                    {product.badge}
                  </span>
                </div>
              )}

              <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md rounded-full p-1.5 px-3 flex items-center gap-2 border border-white/10">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  product.stock > 5 ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : "bg-amber-500 animate-pulse shadow-[0_0_10px_#f59e0b]"
                )} />
                <span className="text-[10px] font-black text-white">
                  {product.stock > 999 ? '999+' : product.stock} IN STOCK
                </span>
              </div>
            </div>

            <div className="p-5 relative">
              <div className="mb-2">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{product.category}</span>
              </div>
              <h4 className="font-black text-lg text-slate-900 dark:text-white leading-tight line-clamp-2 tracking-tighter group-hover:text-blue-500 transition-colors uppercase">{product.name}</h4>
              
              <div className="mt-8 flex items-end justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1 truncate">Exchange Value</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter truncate">{formatCurrency(product.price)}</p>
                </div>
                {inventoryMode ? (
                  <div className="flex gap-2 flex-shrink-0">
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditProduct(product);
                      }}
                      className="w-10 h-10 bg-blue-600/10 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all border border-blue-600/20 shadow-lg"
                    >
                      <Edit2 size={18} />
                    </motion.button>
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProduct(product.id);
                      }}
                      className="w-10 h-10 bg-rose-600/10 text-rose-600 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all border border-rose-600/20 shadow-lg"
                    >
                      <Trash2 size={18} />
                    </motion.button>
                  </div>
                ) : (
                  <motion.button 
                    whileHover={{ scale: 1.05, backgroundColor: '#2563eb' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
                    className="h-12 px-6 bg-blue-600 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-2xl shadow-blue-600/30 flex-shrink-0 whitespace-nowrap"
                  >
                    <Plus size={18} strokeWidth={3} />
                    ORDER NOW
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

const AdminDashboard = ({ 
  products, 
  clients, 
  formatCurrency,
  setActiveTab,
  expenses,
  isAdmin,
  isDarkMode,
  setShowAddProduct,
  onEditProduct
}: { 
  products: Product[], 
  clients: Client[], 
  formatCurrency: (v: number) => string,
  setActiveTab: (t: string) => void,
  expenses: Expense[],
  isAdmin: boolean,
  isDarkMode: boolean,
  setShowAddProduct?: (v: boolean) => void,
  onEditProduct?: (p: Product) => void
}) => {
  const totalClients = clients.length;
  const totalProducts = products.length;
  const totalDue = clients.reduce((sum, c) => sum + c.due, 0);
  const monthlyIncome = clients.reduce((sum, c) => sum + c.totalPaid, 0);
  
  const chartData = useMemo(() => [
    { name: 'Jan', profit: 4000 },
    { name: 'Feb', profit: 3000 },
    { name: 'Mar', profit: 5000 },
    { name: 'Apr', profit: 2780 },
    { name: 'May', profit: 1890 },
    { name: 'Jun', profit: 2390 },
  ], []);

  return (
    <div className="space-y-12 pb-32">
      {/* Maintenance Alerts for Admin */}
      <OutageAlerts isAdmin={isAdmin} />

      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
            Elite <span className="text-orange-500 dark:text-emerald-500 transition-colors">Enterprise</span> Access
          </h2>
          <p className="text-slate-500 font-medium mt-2 text-sm uppercase tracking-widest">Global Infrastructure Monitoring</p>
        </div>
        <div className="flex gap-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('products')}
            className="px-8 py-3 bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800/20 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl transition-all hover:bg-white/10"
          >
            <ShoppingCart size={18} strokeWidth={3} className="text-orange-500 dark:text-emerald-500" />
            Manage Products
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('support')}
            className="px-8 py-3 bg-white/5 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-slate-800/20 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl transition-all hover:bg-white/10"
          >
            <Headphones size={18} strokeWidth={3} className="text-orange-500 dark:text-emerald-500" />
            Satellite Support
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('ai-assistant')}
            className="px-8 py-3 bg-orange-600 dark:bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-orange-600/30 dark:shadow-emerald-600/30 ring-1 ring-white/20 transition-all active:scale-95"
          >
            <Bot size={18} strokeWidth={3} />
            AI Nexus
          </motion.button>
        </div>
      </div>

      {/* Metrics Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Users, label: 'Client Database', value: totalClients, color: 'text-orange-500 dark:text-emerald-500', bg: 'bg-orange-500/10 dark:bg-emerald-500/10' },
          { icon: Package, label: 'Global Assets', value: totalProducts, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { icon: Wallet, label: 'Total Equity', value: formatCurrency(monthlyIncome), color: 'text-orange-600 dark:text-emerald-400', bg: 'bg-orange-600/10 dark:bg-emerald-400/10' },
          { icon: Zap, label: 'Risk Exposure', value: formatCurrency(totalDue), color: 'text-rose-500', bg: 'bg-rose-500/10' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-8 group hover:translate-y-[-8px]"
          >
            <div className="flex items-center justify-between mb-8">
              <div className={cn("p-4 rounded-2xl shadow-inner", stat.bg, stat.color)}>
                <stat.icon size={24} strokeWidth={2.5} />
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            </div>
            <p className={cn("text-3xl font-black tracking-tighter mb-1", stat.color)}>{stat.value}</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Graphs & Fast Access */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div className="lg:col-span-2 glass-card p-10 overflow-hidden relative">
          <h3 className="text-2xl font-black tracking-tighter uppercase mb-2">Revenue Analytics</h3>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-8">6-Month Fiscal Trajectory</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isDarkMode ? "#10b981" : "#f97316"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={isDarkMode ? "#10b981" : "#f97316"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#fff', border: 'none', borderRadius: '16px', color: isDarkMode ? '#fff' : '#1e293b' }}
                />
                <Area type="monotone" dataKey="profit" stroke={isDarkMode ? "#10b981" : "#f97316"} strokeWidth={3} fillOpacity={1} fill="url(#revenueGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="glass-card p-10">
          <h3 className="text-2xl font-black tracking-tighter uppercase mb-2">Product Management</h3>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-8">Add, Edit & Monitor Products</p>
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setActiveTab('products')} className="flex-1 p-6 rounded-3xl flex flex-col items-center justify-center text-white shadow-2xl transition-all hover:scale-[1.02] bg-orange-500 dark:bg-emerald-600 gap-2">
                <Package size={24} />
                <span className="font-black text-[10px] uppercase tracking-widest">Product List</span>
              </button>
              {setShowAddProduct && (
                <button onClick={() => setShowAddProduct(true)} className="flex-1 p-6 rounded-3xl flex flex-col items-center justify-center text-white shadow-2xl transition-all hover:scale-[1.02] bg-blue-500 dark:bg-blue-600 gap-2">
                  <Plus size={24} />
                  <span className="font-black text-[10px] uppercase tracking-widest">Add Product</span>
                </button>
              )}
            </div>
            {[
              { label: 'Client Log', icon: Users, action: () => setActiveTab('clients'), color: 'bg-emerald-500 dark:bg-emerald-700' },
              { label: 'Fiscal Ledger', icon: Wallet, action: () => setActiveTab('expenses'), color: 'bg-slate-900 dark:bg-slate-800 border border-green-500/20' },
            ].map((node, i) => (
              <button key={i} onClick={node.action} className={cn("w-full p-6 rounded-3xl flex items-center justify-between text-white shadow-2xl transition-all hover:scale-[1.02]", node.color)}>
                <span className="font-black text-xs uppercase tracking-widest">{node.label}</span>
                <node.icon size={20} />
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const PublicStore = ({
  products,
  sliderImages,
  offers = [],
  formatCurrency,
  addToCart,
  setActiveTab,
  setSelectedProduct
}: {
  products: Product[],
  sliderImages: string[],
  offers?: Offer[],
  formatCurrency: (v: number) => string,
  addToCart: (p: Product) => void,
  setActiveTab: (t: string) => void,
  setSelectedProduct: (p: Product) => void
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [search, setSearch] = useState('');

  const fuse = useMemo(() => new Fuse(products, {
    keys: ['name', 'category', 'description'],
    threshold: 0.4,
    includeScore: true
  }), [products]);

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    return fuse.search(search).map(r => r.item);
  }, [search, products, fuse]);

  useEffect(() => {
    if (!sliderImages || sliderImages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % sliderImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [sliderImages]);

  return (
    <div className="space-y-6 pb-32 -mt-4">
      {/* Daraz-Style Search Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl -mx-4 px-4 py-3 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-3 bg-gray-100 dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-transparent focus-within:border-orange-500 transition-all">
            <Search size={18} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Search cameras, NVR, DVR..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full font-medium"
            />
          </div>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveTab('me')}
            className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 border border-orange-200 dark:border-orange-800/50"
          >
            <User size={20} />
          </motion.button>
        </div>
      </div>

      {/* Promo Banner Slider - Hide when searching */}
      {!search && (
        <>
          <div className="relative overflow-hidden rounded-3xl h-44 group shadow-2xl bg-slate-900">
            <AnimatePresence mode="wait">
              {sliderImages && sliderImages.length > 0 ? (
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full relative"
                >
                  <img src={sliderImages[currentSlide]} alt={`Slide ${currentSlide}`} className="w-full h-full object-cover" />
                </motion.div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-red-500 to-pink-500 flex items-center px-8">
                  <div className="flex-1 space-y-2">
                    <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest">Flash Sale Now Live</span>
                    <h3 className="text-3xl font-black text-white tracking-tighter leading-none">UP TO 80% OFF<br/><span className="text-orange-200">SUPER DEALS</span></h3>
                    <button className="mt-2 bg-white text-orange-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl">Shop Now</button>
                  </div>
                  <div className="hidden sm:block w-32 h-32 bg-white/20 rounded-full blur-3xl" />
                </div>
              )}
            </AnimatePresence>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {sliderImages && sliderImages.length > 0 ? (
                sliderImages.map((_, i) => (
                  <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-all duration-300", i === currentSlide ? "bg-white w-4" : "bg-white/40")} />
                ))
              ) : (
                [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i === 1 ? "bg-white w-4" : "bg-white/40")} />
                ))
              )}
            </div>
          </div>

          {/* Category Icon Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 py-2">
            {[
              { label: 'Track Order', icon: Package, color: 'bg-blue-500', action: () => setActiveTab('track-order') },
              { label: 'Hot Deals', icon: Sparkles, color: 'bg-orange-500', action: () => setActiveTab('offers') },
              { label: 'Free Delivery', icon: CloudUpload, color: 'bg-teal-500', action: () => setActiveTab('products') },
              { label: 'Support', icon: Headphones, color: 'bg-indigo-500', action: () => window.open('https://wa.me/8801817681233', '_blank') },
              { label: 'Market', icon: ShoppingCart, color: 'bg-pink-500', action: () => setActiveTab('products') },
            ].map((cat, i) => (
              <motion.button 
                key={i}
                animate={{ y: [0, -12, 0], opacity: [1, 0.5, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }}
                whileHover={{ scale: 1.05 }}
                onClick={cat.action}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-active:scale-90", cat.color)}>
                  <cat.icon size={20} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 text-center uppercase tracking-tighter line-clamp-1">{cat.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Latest Marketing Offers */}
          {offers && offers.length > 0 && (
            <div className="py-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white uppercase flex items-center gap-2">
                  <Megaphone size={18} className="text-orange-500" />
                  সাম্প্রতিক অফার
                </h3>
                <button onClick={() => setActiveTab('offers')} className="text-orange-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                  সব দেখুন <ChevronRight size={14} />
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4 snap-x">
                {offers.slice(0, 5).map((offer, i) => (
                  <motion.div 
                    key={offer.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => setActiveTab('offers')}
                    className="min-w-[280px] w-[85vw] max-w-[350px] bg-white dark:bg-slate-800 rounded-[24px] shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden cursor-pointer snap-center group relative"
                  >
                    {offer.imageUrl ? (
                      <div className="h-40 w-full overflow-hidden relative">
                        <img src={offer.imageUrl} alt={offer.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4">
                          <h4 className="text-white font-bold text-lg line-clamp-1 drop-shadow-md">{offer.title}</h4>
                        </div>
                      </div>
                    ) : (
                      <div className="h-40 w-full bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center p-6 relative">
                         <Megaphone size={40} className="text-white/20 absolute -right-2 -bottom-2" />
                         <h4 className="text-white font-bold text-xl line-clamp-2 drop-shadow-md z-10">{offer.title}</h4>
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed">
                        {offer.content}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span className="bg-orange-100 text-orange-600 dark:bg-orange-600/20 px-2 py-1 rounded-md">
                          {new Date(offer.createdAt).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex items-center gap-1 text-blue-500">
                           <Sparkles size={12} /> {offer.likes?.length || 0}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Flash Sale Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black tracking-tighter text-orange-600 italic">FLASH SALE</h3>
              <div className="flex gap-1">
                <span className="bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">02</span>
                <span className="text-orange-600 font-bold">:</span>
                <span className="bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">45</span>
                <span className="text-orange-600 font-bold">:</span>
                <span className="bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">12</span>
              </div>
            </div>
            <button onClick={() => setActiveTab('products')} className="text-orange-600 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              View More <ChevronRight size={14} />
            </button>
          </div>

          {/* Horizontal Flash Sale Products */}
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4">
            {products.slice(0, 6).map((product, i) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelectedProduct(product)}
                className="min-w-[150px] bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-slate-700/50 cursor-pointer"
              >
                <div className="h-28 bg-gray-50 dark:bg-slate-900 rounded-xl mb-3 overflow-hidden relative">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={32} /></div>
                  )}
                  <div className="absolute top-2 left-2 bg-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Save 15%</div>
                </div>
                <h4 className="text-[10px] font-bold line-clamp-1 mb-1">{product.name}</h4>
                <div className="flex flex-col gap-1">
                  <span className="text-orange-600 font-black text-sm">{formatCurrency(product.price)}</span>
                  <span className="text-gray-400 text-[8px] line-through">{formatCurrency(product.price * 1.15)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Main Product Feed Header */}
      <div className="flex items-center justify-between pt-4">
        <h3 className="text-xl font-black tracking-tighter">{search ? 'SEARCH RESULTS' : 'RECOMMENDED FOR YOU'}</h3>
        <Filter size={18} className="text-gray-400" />
      </div>

      {/* Daraz-Style Main Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredProducts.map((product, i) => (
          <motion.div 
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onClick={() => setSelectedProduct(product)}
            className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-slate-700/50 flex flex-col cursor-pointer"
          >
            <div className="aspect-square bg-gray-50 dark:bg-slate-900 relative">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={48} /></div>
              )}
              {product.badge && (
                <div className={cn(
                  "absolute top-3 left-3 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white shadow-xl",
                  product.badge === 'hot' ? 'bg-red-500' : product.badge === 'new' ? 'bg-blue-500' : 'bg-orange-500'
                )}>
                  {product.badge}
                </div>
              )}
            </div>
            
            <div className="p-3 flex flex-col flex-1">
              <h4 className="text-xs font-bold line-clamp-2 min-h-[32px] mb-2 group-hover:text-orange-600 transition-colors uppercase tracking-tight">{product.name}</h4>
              
              <div className="mt-auto space-y-3">
                <div className="flex flex-col">
                  <span className="text-orange-600 font-black text-lg leading-none">{formatCurrency(product.price)}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-400 text-[10px] line-through">{formatCurrency(product.price * 1.2)}</span>
                    <span className="text-emerald-500 text-[10px] font-bold">-20%</span>
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(product);
                  }}
                  className="w-full py-2.5 bg-orange-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-500/20 active:bg-orange-600 transition-colors border border-white/10"
                >
                  ORDER NOW
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Support Contact Section for Clients */}
      <div className="pt-8 pb-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl" />
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-md">
                <Headphones size={24} className="text-blue-400" />
              </div>
              <div>
                <h3 className="font-black text-lg">Need Assistance?</h3>
                <p className="text-xs text-slate-400">Our support team is ready to help</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <a 
                href="https://wa.me/8801817681233"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-2xl p-3 transition-colors group"
              >
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-widest">WhatsApp Us</p>
                  <p className="font-bold text-emerald-300">01817681233</p>
                </div>
              </a>
              
              <a 
                href="tel:01410381233"
                className="flex items-center gap-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-2xl p-3 transition-colors group"
              >
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  <Smartphone size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-blue-400/80 font-bold uppercase tracking-widest">Call Now</p>
                  <p className="font-bold text-blue-300">01410381233</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ 
  products, 
  clients, 
  expenses, 
  sliderImages,
  offers = [],
  formatCurrency,
  addToCart,
  setActiveTab,
  setSelectedProduct,
  setShowAddProduct,
  onEditProduct,
  isAdmin,
  isDarkMode
}: { 
  products: Product[], 
  clients: Client[], 
  expenses: Expense[], 
  sliderImages: string[],
  offers?: Offer[],
  formatCurrency: (v: number) => string,
  addToCart: (p: Product) => void,
  setActiveTab: (t: string) => void,
  setSelectedProduct: (p: Product) => void,
  setShowAddProduct: (v: boolean) => void,
  onEditProduct: (p: Product) => void,
  isAdmin: boolean,
  isDarkMode: boolean
}) => {
  if (!isAdmin) {
    return (
      <PublicStore 
        products={products} 
        sliderImages={sliderImages}
        offers={offers}
        formatCurrency={formatCurrency} 
        addToCart={addToCart} 
        setActiveTab={setActiveTab}
        setSelectedProduct={setSelectedProduct}
      />
    );
  }

  return (
    <AdminDashboard 
      products={products} 
      clients={clients} 
      formatCurrency={formatCurrency} 
      setActiveTab={setActiveTab} 
      expenses={expenses}
      isAdmin={isAdmin}
      isDarkMode={isDarkMode}
      setShowAddProduct={setShowAddProduct}
      onEditProduct={onEditProduct}
    />
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
  const filteredClients = clients.filter(c => 
    (c.name && c.name.toLowerCase().includes(search.toLowerCase())) || 
    (c.phone && c.phone.includes(search))
  );

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
        aria-label="Add new client"
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center btn-ripple z-40 opacity-90 hover:opacity-100"
      >
        <Plus size={28} />
      </motion.button>
    </div>
  );
};

const SupportPage = () => {
  return (
    <div className="space-y-6 pb-24">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Support</h2>
          <p className="text-xs text-gray-500 font-medium">Get help and open tickets</p>
        </div>
        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg">
          <Headphones size={20} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-6 space-y-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600">
            <Bot size={24} />
          </div>
          <h3 className="font-bold">AI Assistant</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Our AI assistant can help you with common internet issues, router settings, and billing questions instantly.
          </p>
          <button 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('changeTab', { detail: 'ai-assistant' }));
            }}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm"
          >
            Chat with AI
          </button>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-600">
            <MessageSquare size={24} />
          </div>
          <h3 className="font-bold">Live Support</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Reach out to our team directly via WhatsApp or Phone Call for immediate assistance.
          </p>
          <div className="flex flex-col gap-2">
            <a 
              href="https://wa.me/8801817681233"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 transition-colors"
            >
              <MessageSquare size={16} /> WhatsApp Us
            </a>
            <a 
              href="tel:01410381233"
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 transition-colors"
            >
              <Smartphone size={16} /> Call Now
            </a>
          </div>
        </div>
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

const SplashScreen = ({ customLogo, onEnter, onPlay, hasMusic }: { customLogo: string | null, onEnter: () => void, onPlay: () => void, hasMusic: boolean }) => {
  const [progress, setProgress] = useState(0);
  const [started, setStarted] = useState(!hasMusic);

  const startIntro = () => {
    if (!started && hasMusic) {
      setStarted(true);
      onPlay();
    }
  };

  useEffect(() => {
    if (!started) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onEnter, 300);
          return 100;
        }
        return prev + Math.random() * 20;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [started, onEnter]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      onClick={startIntro}
      className={cn(
        "fixed inset-0 splash-bg z-[200] flex flex-col items-center justify-center overflow-hidden bg-slate-950 transition-colors duration-500",
        !started && hasMusic && "cursor-pointer hover:bg-slate-900"
      )}
    >
      {/* Premium Background Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-black/40 backdrop-blur-sm">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/30 blur-[120px] rounded-full" />
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
          className="w-36 h-36 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-[48px] flex items-center justify-center shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] mb-10 overflow-hidden border border-white/20 relative z-20 backdrop-blur-xl"
        >
          {customLogo ? (
            <img src={customLogo} alt="Company Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <ShieldCheck size={70} className="text-white" />
          )}
        </motion.div>

        {/* Text Content */}
        <div className="text-center relative z-20 px-6">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-5xl font-black text-white mb-2 tracking-tighter"
          >
            IT DEPARTMENT <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">PRO</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.6 }}
            className="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em] mb-12"
          >
            Security & Management Infrastructure
          </motion.p>
          
          <div className="h-16 flex flex-col items-center justify-center relative w-72 mx-auto">
            <AnimatePresence mode="wait">
              {started ? (
                <motion.div 
                   key="loading"
                   initial={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="w-full flex justify-center"
                >
                  <div className="w-72 h-1 bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-600 via-emerald-400 to-green-600"
                    />
                    <motion.div 
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-1/2"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="enter-btn"
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                     e.stopPropagation();
                     startIntro();
                  }}
                  className="px-8 py-3 bg-white/10 border border-white/20 text-white rounded-[20px] text-xs font-black uppercase tracking-widest backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:bg-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:border-white/40 transition-all flex items-center justify-center gap-2 relative overflow-hidden"
                >
                  <Zap size={14} className="text-emerald-400" /> TAP TO START
                  <motion.div 
                    animate={{ x: ['-200%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/2 -skew-x-12"
                  />
                </motion.button>
              )}
            </AnimatePresence>
            
            <AnimatePresence>
              {started && (
                <motion.p 
                  key="init-text"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-widest absolute bottom-0 translate-y-full"
                >
                  {progress < 100 ? 'System Initializing...' : 'Ready to Launch'}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('cctv_theme_preference');
    return saved !== null ? saved === 'true' : true;
  });
  const [showSplash, setShowSplash] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inventoryMode, setInventoryMode] = useState(false);
  const [customLogo, setCustomLogo] = useState<string | null>(() => localStorage.getItem('cctv_custom_logo'));
  const [sliderImages, setSliderImages] = useState<string[]>(() => {
    const saved = localStorage.getItem('cctv_slider_images');
    return saved ? JSON.parse(saved) : [];
  });
  const [customIntroMusic, setCustomIntroMusic] = useState<string | null>(() => localStorage.getItem('cctv_custom_intro_music'));
  const [customClickSound, setCustomClickSound] = useState<string | null>(() => localStorage.getItem('cctv_custom_click_sound'));
  const [offersMusic, setOffersMusic] = useState<string | null>(() => localStorage.getItem('cctv_offers_music'));
  const offersAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const adminEmails = ['itdepartmentpro33@gmail.com', 'djbmremix87@gmail.com'];
  const isAdmin = user?.email && adminEmails.includes(user.email);

  useEffect(() => {
    if (isAuthReady && isAdmin) {
      setActiveTab('shop-view');
    }
  }, [isAuthReady, isAdmin]);

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
  const [offers, setOffers] = useState<Offer[]>([]);
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
      if (['categories', 'clients', 'expenses', 'warranty'].includes(activeTab)) {
        setActiveTab('dashboard');
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
    offersMusic: offersMusic,
    expenseCategories: JSON.stringify(expenseCategories),
    productCategories: JSON.stringify(productCategories),
    sliderImages: JSON.stringify(sliderImages)
  });
  const isSeeding = useRef(false);

  // Bill Reminder for Clients
  useEffect(() => {
    if (isAuthReady && user && !isAdmin && clients.length > 0) {
      const clientData = clients.find(c => c.phone === user.phoneNumber || c.name === user.displayName);
      if (clientData && clientData.due > 0) {
        setTimeout(() => {
          addNotification(`Reminder: You have a pending bill of ${formatCurrency(clientData.due)}. Please pay to avoid service interruption.`);
        }, 3000);
      }
    }
  }, [isAuthReady, user, isAdmin, clients]);

  useEffect(() => {
    const handleChangeTab = (e: any) => setActiveTab(e.detail);
    window.addEventListener('changeTab', handleChangeTab);
    return () => window.removeEventListener('changeTab', handleChangeTab);
  }, []);

  // Admin Notification for new public orders
  useEffect(() => {
    if (isAdmin && publicOrders.length > 0) {
      const pendingCount = publicOrders.filter(o => o.status === 'pending').length;
      if (pendingCount > 0) {
        addNotification(`Admin Alert: ${pendingCount} new order(s) waiting for confirmation!`);
      }
    }
  }, [publicOrders.length, isAdmin]);

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
    getDoc(userDocRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Update local state and ref to prevent redundant sync back
        if (data.darkMode !== undefined) {
          // Device preference from localStorage always wins for dark mode to prevent reload flash
          lastSyncedSettings.current.darkMode = data.darkMode;
        }
        if (data.customLogo !== undefined) {
          setCustomLogo(data.customLogo);
          lastSyncedSettings.current.customLogo = data.customLogo;
          if (data.customLogo) localStorage.setItem('cctv_custom_logo', data.customLogo);
          else localStorage.removeItem('cctv_custom_logo');
        }
        if (data.sliderImages !== undefined) {
          setSliderImages(data.sliderImages);
          lastSyncedSettings.current.sliderImages = JSON.stringify(data.sliderImages);
          localStorage.setItem('cctv_slider_images', JSON.stringify(data.sliderImages));
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
        if (data.offersMusic !== undefined) {
          setOffersMusic(data.offersMusic);
          lastSyncedSettings.current.offersMusic = data.offersMusic;
          if (data.offersMusic) localStorage.setItem('cctv_offers_music', data.offersMusic);
          else localStorage.removeItem('cctv_offers_music');
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
    }).catch((error) => {
      handleFirestoreError(error, OperationType.GET, `settings/global`);
      setIsInitialLoad(false);
    });

    // Products
    const productsRef = collection(db, 'products');
    getDocs(query(productsRef, orderBy('name'))).then((snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data() } as Product));
      setProducts(items);
      localStorage.setItem('cctv_products', JSON.stringify(items));
    }).catch(e => handleFirestoreError(e, OperationType.LIST, 'products'));

    // Clients
    if (isAdmin) {
      const clientsRef = collection(db, 'clients');
      getDocs(query(clientsRef, orderBy('name'))).then((snapshot) => {
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
      }).catch((error) => handleFirestoreError(error, OperationType.LIST, `clients`));
    } else if (user) {
      // For non-admins, try to fetch their own client record
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, where('email', '==', user.email || ''));
      getDocs(q).then((snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data() } as Client));
        if (items.length > 0) {
          setClients(items);
        } else {
          // Try by name if email fails
          const q2 = query(clientsRef, where('name', '==', user.displayName || ''));
          getDocs(q2).then((snap2) => {
            const items2 = snap2.docs.map(doc => ({ ...doc.data() } as Client));
            if (items2.length > 0) setClients(items2);
          });
        }
      }).catch((error) => {
        // Silent error for non-admins if they don't have a record yet
        console.log("Non-admin client record fetch error or not found");
      });
    }

    // Expenses (Only for admin)
    if (isAdmin) {
      const expensesRef = collection(db, 'expenses');
      getDocs(query(expensesRef, orderBy('date', 'desc'))).then((snapshot) => {
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
      }).catch((error) => handleFirestoreError(error, OperationType.LIST, `expenses`));
    } else {
      setExpenses([]);
    }

    // Public Orders (Only for admin)
    if (isAdmin) {
      const poRef = collection(db, 'public_orders');
      getDocs(query(poRef, where('status', '==', 'pending'))).then((snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PublicOrder));
        setPublicOrders(items);
      }).catch((error) => handleFirestoreError(error, OperationType.LIST, `public_orders`));
    } else {
      setPublicOrders([]);
    }

    // Offers
    const offersRef = collection(db, 'offers');
    getDocs(query(offersRef, orderBy('createdAt', 'desc'))).then((snapshot) => {
      setOffers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Offer)));
    }).catch((error) => handleFirestoreError(error, OperationType.LIST, `offers`));

    return () => {};
  }, [isAdmin]);

  // Offers Music Playback
  useEffect(() => {
    if (activeTab === 'offers' && offersMusic) {
      if (!offersAudioRef.current) {
        offersAudioRef.current = new Audio(offersMusic);
        offersAudioRef.current.loop = true;
      } else if (offersAudioRef.current.src !== offersMusic) {
        offersAudioRef.current.src = offersMusic;
      }
      offersAudioRef.current.play().catch(e => console.log("Audio play failed:", e));
    } else {
      if (offersAudioRef.current) {
        offersAudioRef.current.pause();
      }
    }
    return () => {
      if (offersAudioRef.current) {
        offersAudioRef.current.pause();
      }
    };
  }, [activeTab, offersMusic]);

  // Sync Settings to Firestore (Only if changed by user)
  useEffect(() => {
    if (user && !isInitialLoad) {
      const categoriesJson = JSON.stringify(expenseCategories);
      const productCategoriesJson = JSON.stringify(productCategories);
      const sliderImagesJson = JSON.stringify(sliderImages);
      
      // Only sync if values actually differ from what's in Firestore
      if (
        isDarkMode !== lastSyncedSettings.current.darkMode ||
        customLogo !== lastSyncedSettings.current.customLogo ||
        customIntroMusic !== lastSyncedSettings.current.customIntroMusic ||
        customClickSound !== lastSyncedSettings.current.customClickSound ||
        offersMusic !== lastSyncedSettings.current.offersMusic ||
        categoriesJson !== lastSyncedSettings.current.expenseCategories ||
        productCategoriesJson !== lastSyncedSettings.current.productCategories ||
        sliderImagesJson !== lastSyncedSettings.current.sliderImages
      ) {
        const userDocRef = doc(db, 'settings', 'global');
        
        // Update ref immediately to prevent multiple triggers
        lastSyncedSettings.current = {
          darkMode: isDarkMode,
          customLogo: customLogo,
          customIntroMusic: customIntroMusic,
          customClickSound: customClickSound,
          offersMusic: offersMusic,
          expenseCategories: categoriesJson,
          productCategories: productCategoriesJson,
          sliderImages: sliderImagesJson
        };

        setDoc(userDocRef, { darkMode: isDarkMode, customLogo, customIntroMusic, customClickSound, offersMusic, expenseCategories, productCategories, sliderImages }, { merge: true })
          .catch(error => {
            // If it fails, we might want to revert the ref, but usually quota errors are persistent
            handleFirestoreError(error, OperationType.WRITE, `settings/global`);
          });
      }
    }
  }, [isDarkMode, customLogo, customIntroMusic, customClickSound, offersMusic, expenseCategories, productCategories, sliderImages, user, isInitialLoad]);

  // Dynamic Title for SEO
  useEffect(() => {
    const tabNames: Record<string, string> = {
      dashboard: 'Dashboard',
      clients: 'Clients Management',
      products: 'Products & Orders',
      expenses: 'Expense Tracker',
      bandwidth: 'Bandwidth Test',
      warranty: 'Warranty Status',
      me: 'Profile & Settings',
      'track-order': 'Track Order'
    };
    const currentTab = tabNames[activeTab] || activeTab;
    document.title = `${currentTab} | IT Department Pro`;
  }, [activeTab]);

  // Dark Mode Class & Persist
  useEffect(() => {
    localStorage.setItem('cctv_theme_preference', String(isDarkMode));
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

  // Splash Screen Timer
  useEffect(() => {
    // We now always require a tap to enter for iOS/browser audio policies
    // The timer logic is handled entirely inside the SplashScreen component
  }, []);

  const handlePlayIntro = () => {
    if (customIntroMusic) {
      const audio = new Audio(customIntroMusic);
      audio.volume = 1.0;
      audio.play().catch(e => console.error("Audio block:", e));
    } else {
      // Default intro sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.error(e));
    }
  };

  const handleSplashEnter = () => {
    setShowSplash(false);
  };

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

  const handleAddPayment = async (clientId: number, amount: number, type: 'Cash' | 'Bkash' | 'Bank' | 'Nagad', purpose: string = 'General Payment') => {
    if (!user) {
      addNotification("Please login to record payment.");
      return;
    }
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const newPayment: PaymentHistory = {
      id: `PAY-${Date.now()}`,
      date: new Date().toISOString(),
      amount,
      type,
      purpose
    };

    const updatedClient = {
      ...client,
      due: Math.max(0, client.due - amount),
      totalPaid: client.totalPaid + amount,
      paymentHistory: [newPayment, ...(client.paymentHistory || [])]
    };

    setClients(prev => prev.map(c => c.id === clientId ? updatedClient : c));

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
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    // Update local state first to make it snappy
    setClients(prev => prev.map(c => 
      c.id === clientId 
        ? { ...c, orders: c.orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o) } 
        : c
    ));

    const updatedClient = {
      ...client,
      orders: client.orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
    };

    try {
      // 1. Update in clients collection
      await setDoc(doc(db, 'clients', String(clientId)), updatedClient);
      
      // 2. Try to update in public_orders collection if it exists there too
      // The orderId might match a document in 'public_orders' if the admin moved it from public_orders to clients.
      try {
         const publicOrderRef = doc(db, 'public_orders', orderId);
         const publicOrderSnap = await getDoc(publicOrderRef);
         if (publicOrderSnap.exists()) {
           await updateDoc(publicOrderRef, { status: newStatus });
         }
      } catch (err) {
         console.error("No public order found with this id, which is fine.", err);
      }
      
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

  const updateCartQuantity = (productId: number | string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const placePublicOrder = async (
    customerDetails: {name: string, phone: string, address: string},
    isPaid: boolean = false,
    paymentType: string = 'Cash'
  ) => {
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
      status: isPaid ? 'accepted' : 'pending'
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
      addNotification(isPaid ? `Order placed and paid via ${paymentType}!` : "Order placed successfully! We will contact you soon.");
      
      // Generate PDF for the client
      generateOrderPDF(publicOrder);
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
    doc.setFillColor(255, 140, 0); // orange-500
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Logo if available
    if (customLogo) {
      try {
        doc.addImage(customLogo, 'PNG', margin, 10, 30, 30);
        // Company Name shifted
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('IT DEPARTMENT PRO', margin + 35, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Your Security, Our Priority', margin + 35, 32);
        doc.text('Phone: 01817681233 | Email: itdepartmentpro33@gmail.com', margin + 35, 38);
      } catch (e) {
        // Fallback if logo fails
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('IT DEPARTMENT PRO', margin, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Your Security, Our Priority', margin, 32);
        doc.text('Phone: 01817681233 | Email: itdepartmentpro33@gmail.com', margin, 38);
      }
    } else {
      // Company Name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('IT DEPARTMENT PRO', margin, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Your Security, Our Priority', margin, 32);
      doc.text('Phone: 01817681233 | Email: itdepartmentpro33@gmail.com', margin, 38);
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

  const handleDeleteProduct = async (id: number | string) => {
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

  const handleUpdateClientDetails = async (clientId: number, details: { name: string, phone: string, email?: string, address: string }) => {
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
    // Save client info before deleting so we can use phone to clean up public_orders
    const clientToDelete = clients.find(c => c.id === clientId);
    
    // Update local state immediately
    setClients(prev => {
      const updated = prev.filter(c => c.id !== clientId);
      localStorage.setItem('cctv_clients', JSON.stringify(updated));
      return updated;
    });
    setShowClientProfile(null);
    addNotification("Client deleted!");

    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'clients', String(clientId)));
      
      // Also delete any public_orders associated with this client's phone number
      if (clientToDelete?.phone) {
        const q = query(collection(db, 'public_orders'), where('customerPhone', '==', clientToDelete.phone));
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'public_orders', docSnap.id)));
        await Promise.all(deletePromises);
      }
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
                    "w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-orange-500 dark:focus:border-emerald-500 rounded-2xl py-4 pl-12 pr-4 outline-none transition-all font-bold text-center tracking-[0.5em]",
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

const PaymentGateway = ({ amount, onComplete, onClose }: { amount: number, onComplete: (type: 'Bkash' | 'Nagad') => void, onClose: () => void }) => {
  const [step, setStep] = useState<'select' | 'process'>('select');
  const [method, setMethod] = useState<'Bkash' | 'Nagad' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = () => {
    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      if (method) onComplete(method);
    }, 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black">Digital Payment</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
              <X size={20} />
            </button>
          </div>

          {step === 'select' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4 text-center">Select your preferred payment method to pay <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(amount)}</span></p>
              <button 
                onClick={() => { setMethod('Bkash'); setStep('process'); }}
                className="w-full p-4 bg-[#D12053] text-white rounded-2xl flex items-center justify-between group hover:scale-[1.02] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Bkash_logo.png/640px-Bkash_logo.png" alt="Bkash" className="w-full h-full object-contain" />
                  </div>
                  <span className="font-bold">bKash</span>
                </div>
                <ChevronRight size={20} />
              </button>
              <button 
                onClick={() => { setMethod('Nagad'); setStep('process'); }}
                className="w-full p-4 bg-[#F7941D] text-white rounded-2xl flex items-center justify-between group hover:scale-[1.02] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Nagad_logo.png/640px-Nagad_logo.png" alt="Nagad" className="w-full h-full object-contain" />
                  </div>
                  <span className="font-bold">Nagad</span>
                </div>
                <ChevronRight size={20} />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={cn(
                "p-4 rounded-2xl flex items-center gap-3 mb-4",
                method === 'Bkash' ? "bg-[#D12053]/10 text-[#D12053]" : "bg-[#F7941D]/10 text-[#F7941D]"
              )}>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1">
                  <img src={method === 'Bkash' ? "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Bkash_logo.png/640px-Bkash_logo.png" : "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Nagad_logo.png/640px-Nagad_logo.png"} alt={method || ''} className="w-full h-full object-contain" />
                </div>
                <span className="font-black">{method} Payment</span>
              </div>

              <div className="space-y-3">
                <input 
                  type="tel" 
                  placeholder="Your Account Number" 
                  className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                />
                <input 
                  type="password" 
                  placeholder="Enter PIN" 
                  className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Enter OTP" 
                  className="w-full p-4 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl outline-none font-bold"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                />
              </div>

              <button 
                onClick={handlePayment}
                disabled={isProcessing || !phoneNumber || !pin || !otp}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all flex items-center justify-center gap-2",
                  method === 'Bkash' ? "bg-[#D12053]" : "bg-[#F7941D]",
                  (isProcessing || !phoneNumber || !pin || !otp) && "opacity-50"
                )}
              >
                {isProcessing ? <RefreshCcw className="animate-spin" /> : <ShieldCheck size={20} />}
                {isProcessing ? 'Processing...' : `Pay ${formatCurrency(amount)}`}
              </button>
              <button 
                onClick={() => setStep('select')}
                className="w-full py-2 text-xs font-bold text-gray-500"
              >
                Change Payment Method
              </button>
            </div>
          )}
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
    const [showGateway, setShowGateway] = useState(false);

    const handleDigitalPayment = (type: 'Bkash' | 'Nagad') => {
      setShowGateway(false);
      if (isAdmin && orderClientId) {
        placeOrder(orderClientId, true, type as any);
      } else {
        placePublicOrder({ name: customerName, phone: customerPhone, address: customerAddress }, true, type as any);
      }
    };

    return (
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end justify-center"
        onClick={() => setShowCart(false)}
      >
        <AnimatePresence>
          {showGateway && (
            <PaymentGateway 
              amount={total} 
              onClose={() => setShowGateway(false)} 
              onComplete={handleDigitalPayment} 
            />
          )}
        </AnimatePresence>
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
              
              <div className="flex flex-col gap-3">
                {isAdmin ? (
                  <>
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
                        className="flex-[1.5] py-5 bg-green-600 text-white rounded-[24px] font-black text-sm shadow-2xl shadow-green-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                      >
                        <Save size={20} />
                        Confirm & Order
                      </motion.button>
                    </div>
                    <motion.button 
                      whileTap={{ scale: 0.98 }}
                      disabled={!orderClientId}
                      onClick={() => setShowGateway(true)}
                      className="w-full py-4 bg-gradient-to-r from-[#D12053] to-[#F7941D] text-white rounded-[24px] font-black text-sm shadow-xl flex items-center justify-center gap-2"
                    >
                      <CreditCard size={20} />
                      Digital Payment (Bkash/Nagad)
                    </motion.button>
                  </>
                ) : (
                  <div className="space-y-3">
                    <motion.button 
                      whileTap={{ scale: 0.98 }}
                      disabled={!customerName || !customerPhone || !customerAddress}
                      onClick={() => placePublicOrder({name: customerName, phone: customerPhone, address: customerAddress})}
                      className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black text-sm shadow-2xl shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={20} />
                      Place Order (Cash on Delivery)
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.98 }}
                      disabled={!customerName || !customerPhone || !customerAddress}
                      onClick={() => setShowGateway(true)}
                      className="w-full py-5 bg-gradient-to-r from-[#D12053] to-[#F7941D] text-white rounded-[24px] font-black text-sm shadow-xl flex items-center justify-center gap-2"
                    >
                      <CreditCard size={20} />
                      Pay Now (Bkash/Nagad)
                    </motion.button>
                  </div>
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
                      onClick={() => generateOrderPDF(order)}
                      className="w-10 h-10 shrink-0 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      title="Download PDF"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      onClick={() => acceptPublicOrder(order)}
                      className="flex-1 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors"
                    >
                      Accept
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
    offersMusic,
    setOffersMusic,
    sliderImages,
    setSliderImages,
    onBackup, 
    onOpenCalculator,
    onLock,
    adminPassword,
    setAdminPassword,
    user,
    onRecordPayment,
    clients,
    withPassword
  }: { 
    isDarkMode: boolean, 
    setIsDarkMode: (v: boolean) => void, 
    customLogo: string | null, 
    setCustomLogo: (v: string | null) => void, 
    customIntroMusic: string | null,
    setCustomIntroMusic: (v: string | null) => void,
    customClickSound: string | null,
    setCustomClickSound: (v: string | null) => void,
    offersMusic: string | null,
    setOffersMusic: (v: string | null) => void,
    sliderImages: string[],
    setSliderImages: (v: string[]) => void,
    onBackup: () => void, 
    onOpenCalculator: () => void,
    onLock: () => void,
    adminPassword: string,
    setAdminPassword: (v: string) => void,
    user: FirebaseUser | null,
    onRecordPayment: (clientId: number, amount: number, type: 'Cash' | 'Bkash' | 'Bank' | 'Nagad', purpose: string) => void,
    clients: Client[],
    withPassword: (action: () => void, strict?: boolean) => void
  }) => {
    const [showGateway, setShowGateway] = useState(false);
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
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          // Optimize logo slightly, usually logos are tiny but just in case
          const MAX_SIZE = 500;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // we should probably keep png transparency if possible or webp.
            ctx.drawImage(img, 0, 0, width, height);
            const base64 = canvas.toDataURL('image/webp', 0.8);
            setCustomLogo(base64);
            localStorage.setItem('cctv_custom_logo', base64);
            addNotification("Logo updated and optimized!");
          }
          URL.revokeObjectURL(url);
        };
        img.src = url;
      }
    };

    const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'intro' | 'click') => {
      const file = e.target.files?.[0];
      if (file && user) {
        // Check file size (limit to 1MB for Firestore/LocalStorage)
        if (file.size > 1024 * 1024) {
          addNotification("Audio file too large! Max 1MB limit for smooth loading.");
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          
          // Test the audio playback immediately
          const audio = new Audio(base64);
          audio.volume = 1.0;
          audio.play().catch(err => {
            console.error("Audio playback test failed:", err);
            addNotification("Audio format issue. Please try a different mp3.");
          });

          if (type === 'intro') {
            setCustomIntroMusic(base64);
            localStorage.setItem('cctv_custom_intro_music', base64);
            addNotification("Intro music updated! Playing preview...");
          } else {
            setCustomClickSound(base64);
            localStorage.setItem('cctv_custom_click_sound', base64);
            addNotification("Click sound updated! Playing preview...");
          }
        };
        reader.readAsDataURL(file);
      }
    };

    const handleOffersMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && user) {
        // Check file size (limit to 300MB as requested)
        if (file.size > 300 * 1024 * 1024) {
          addNotification("File too large! Max 300MB.");
          return;
        }
        
        // Password protection for upload
        withPassword(() => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            // Warn if over 1MB for Firestore
            if (base64.length > 1000000) {
              addNotification("Warning: Large files may fail to sync to cloud. Recommended < 1MB.");
            }
            setOffersMusic(base64);
            localStorage.setItem('cctv_offers_music', base64);
            addNotification("Offers background music updated!");
          };
          reader.readAsDataURL(file);
        }, true); // strict = true for admin only
      }
    };

    const removeOffersMusic = () => {
      withPassword(() => {
        setOffersMusic(null);
        localStorage.removeItem('cctv_offers_music');
        addNotification("Offers background music removed.");
      }, true);
    };

    const clientData = useMemo(() => {
      if (!user) return null;
      return clients.find(c => 
        (user.email && c.email === user.email) || 
        c.phone === user.phoneNumber || 
        c.name === user.displayName
      );
    }, [user, clients]);

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
      <div className="space-y-6 pb-24">
        {/* Profile Header */}
        {isAdmin && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16" />
            <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-blue-500/40 overflow-hidden border-4 border-white dark:border-slate-800">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    user?.displayName?.[0] || 'U'
                  )}
                </div>
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">{user?.displayName || 'User'}</h2>
                <p className="text-sm text-slate-500 font-medium">{user?.email}</p>
                <div className="flex gap-2 mt-3 justify-center md:justify-start">
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {isAdmin ? 'Administrator' : 'Client'}
                  </span>
                  {clientData && (
                    <span className="px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Active Connection
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {isAdmin && clientData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Paid</p>
                <h4 className="text-xl font-black text-green-600">{formatCurrency(clientData.totalPaid)}</h4>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Current Due</p>
                <h4 className="text-xl font-black text-red-600">{formatCurrency(clientData.due)}</h4>
              </div>
            </div>
            
            <div className="flex gap-3">
              {clientData.due > 0 && (
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowGateway(true)}
                  className="flex-1 py-4 bg-gradient-to-r from-[#D12053] to-[#F7941D] text-white rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2"
                >
                  <CreditCard size={18} />
                  Pay Due Bill
                </motion.button>
              )}
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setActiveTab('support');
                  // We could auto-fill the ticket form here if we had a way to pass state
                }}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2"
              >
                <ArrowUpCircle size={18} />
                Upgrade Plan
              </motion.button>
            </div>
          </div>
        )}

        {/* Payment History */}
        {isAdmin && clientData && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600">
                <CreditCard size={20} />
              </div>
              <h3 className="font-bold text-lg">Payment History</h3>
            </div>
            <div className="space-y-4">
              {clientData.paymentHistory && clientData.paymentHistory.length > 0 ? (
                clientData.paymentHistory.map((payment: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{payment.type}</p>
                      <h4 className="font-bold text-green-600">+{formatCurrency(payment.amount)}</h4>
                      <p className="text-[10px] text-slate-500">{new Date(payment.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-lg text-[8px] font-black uppercase">Success</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-slate-400 text-sm italic">No payments recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Order History */}
        {isAdmin && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                <History size={20} />
              </div>
              <h3 className="font-bold text-lg">Order History</h3>
            </div>
            <div className="space-y-4">
              {clientData?.orders && clientData.orders.length > 0 ? (
                clientData.orders.map((order: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-between group">
                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Order #{order.id}</p>
                      <h4 className="font-bold text-slate-900 dark:text-white">{formatCurrency(order.total)}</h4>
                      <p className="text-[10px] text-slate-500">{new Date(order.date).toLocaleDateString()}</p>
                    </div>
                    <button 
                      onClick={() => generateReceiptPDF(order)}
                      className="p-3 bg-white dark:bg-slate-800 text-blue-600 rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-center py-8 text-slate-400 text-sm italic">No orders found yet.</p>
              )}
            </div>
          </div>
        )}

        <AnimatePresence>
          {isAdmin && showGateway && clientData && (
            <PaymentGateway 
              amount={clientData.due} 
              onClose={() => setShowGateway(false)} 
              onComplete={(type) => {
                setShowGateway(false);
                onRecordPayment(clientData.id, clientData.due, type as any, 'Bill Payment');
                addNotification(`Payment of ${formatCurrency(clientData.due)} successful via ${type}!`);
              }} 
            />
          )}
        </AnimatePresence>

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
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      customLogo ? <img src={customLogo} alt="Company Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : "AD"
                    )}
                  </div>
                  {isAdmin && (
                    <label className="absolute bottom-4 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-colors">
                      <Plus size={16} />
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e)} />
                    </label>
                  )}
                </div>
                <h3 className="text-xl font-bold">{user.displayName || 'User Profile'}</h3>
                <p className="text-gray-500 text-sm">{user.email}</p>
                <div className="flex gap-4 mt-2">
                  {isAdmin && <p className="text-[10px] text-blue-600 cursor-pointer" onClick={() => setCustomLogo(null)}>Reset Logo</p>}
                  <p className="text-[10px] text-red-600 cursor-pointer font-bold" onClick={logout}>Logout</p>
                </div>
              </>
            )}
          </div>

          {isAdmin && (
            <div className="space-y-6">
                <button 
                  onClick={() => withPassword(shareApp)}
                  className="p-4 glass-card flex flex-col items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors border-blue-200 dark:border-blue-900/30 w-full"
                >
                  <Share2 className="text-blue-500" />
                  <span className="text-xs font-bold">লিংক শেয়ার</span>
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
            )}
          </div>

            {isAdmin && showChangePassword && (
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
            {isAdmin && user && (
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

        {isAdmin && (
          <div className="space-y-6">
              {/* Customization */}
              <div className="glass-card p-6 space-y-4">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Customization</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                        <ImageIcon size={20} />
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
                         <>
                           <button 
                             onClick={() => {
                               const audio = new Audio(customIntroMusic);
                               audio.volume = 1.0;
                               audio.play().catch(() => addNotification("Error playing audio"));
                             }}
                             className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg"
                           >
                             <div className="w-4 h-4 rounded-full border-2 border-emerald-600 flex items-center justify-center pl-0.5">
                                 <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[5px] border-l-emerald-600 border-b-[3px] border-b-transparent" />
                             </div>
                           </button>
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
                         </>
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
                         <>
                           <button 
                             onClick={() => {
                               const audio = new Audio(customClickSound);
                               audio.volume = 1.0;
                               audio.play().catch(() => addNotification("Error playing audio"));
                             }}
                             className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg"
                           >
                             <div className="w-4 h-4 rounded-full border-2 border-emerald-600 flex items-center justify-center pl-0.5">
                                 <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[5px] border-l-emerald-600 border-b-[3px] border-b-transparent" />
                             </div>
                           </button>
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
                         </>
                       )}
                      <label className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-orange-700 transition-colors">
                        Upload
                        <input type="file" accept="audio/*" className="hidden" onChange={(e) => handleAudioUpload(e, 'click')} />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600">
                        <ImageIcon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Promo Slider Images</p>
                        <p className="text-[10px] text-gray-500">Add banner images ({sliderImages.length} saved)</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {sliderImages.length > 0 && (
                        <button 
                          onClick={() => {
                            setSliderImages([]);
                            localStorage.removeItem('cctv_slider_images');
                            addNotification("Promo sliders cleared!");
                          }}
                          className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <label className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-purple-700 transition-colors">
                        Add Image
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (sliderImages.length >= 5) {
                              addNotification("Maximum 5 banner images allowed.");
                              return;
                            }
                            
                            const img = new Image();
                            const url = URL.createObjectURL(file);
                            
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              let width = img.width;
                              let height = img.height;
                              
                              // Compress and resize image to fit in Firestore (1MB limit for document)
                              const MAX_WIDTH = 1200;
                              const MAX_HEIGHT = 800;
                              
                              if (width > height) {
                                if (width > MAX_WIDTH) {
                                  height = Math.round((height * MAX_WIDTH) / width);
                                  width = MAX_WIDTH;
                                }
                              } else {
                                if (height > MAX_HEIGHT) {
                                  width = Math.round((width * MAX_HEIGHT) / height);
                                  height = MAX_HEIGHT;
                                }
                              }
                              
                              canvas.width = width;
                              canvas.height = height;
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                ctx.drawImage(img, 0, 0, width, height);
                                // Compress as JPEG at 60% quality -> usually ~50-150KB
                                const base64 = canvas.toDataURL('image/jpeg', 0.6);
                                const newImages = [...sliderImages, base64];
                                setSliderImages(newImages);
                                localStorage.setItem('cctv_slider_images', JSON.stringify(newImages));
                                addNotification("Slider image added and optimized!");
                              }
                              URL.revokeObjectURL(url);
                            };
                            
                            img.src = url;
                          }
                        }} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Regular non-admin visible sections in the right column */}
          <div className="space-y-6">
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
                      <MessageSquare size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">WhatsApp</p>
                      <a href="https://wa.me/8801817681233" className="text-xs text-blue-600 font-medium hover:underline">01817681233</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 text-orange-600 rounded-lg">
                      <Smartphone size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Call</p>
                      <a href="tel:01410381233" className="text-xs text-blue-600 font-medium hover:underline">01410381233</a>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card overflow-hidden h-fit">
              <div className="p-4 border-b dark:border-slate-800 font-bold text-sm flex justify-between items-center">
                Company Rules
                {isAdmin && <button onClick={() => setShowEditRules(true)} className="text-blue-600"><Plus size={16} /></button>}
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

            {isAdmin && showEditRules && (
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

            {isAdmin && (
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
            )}
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
            aria-label="Add new expense"
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
    const [email, setEmail] = useState('');
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
        email,
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

            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Email Address (Optional)</label>
              <input 
                type="email" 
                placeholder="client@example.com" 
                className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
                value={email}
                onChange={e => setEmail(e.target.value)}
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
    <div className="w-full max-w-[450px] md:max-w-none mx-auto min-h-screen relative shadow-2xl overflow-hidden flex flex-col md:flex-row">
      {/* Dynamic Background Layer */}
      <div className={cn("app-bg", isDarkMode ? "app-bg-dark" : "app-bg-light")} />
      
      <AnimatePresence>
        {showSplash && <SplashScreen customLogo={customLogo} onEnter={handleSplashEnter} onPlay={handlePlayIntro} hasMusic={true} />}
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
      <aside className="hidden md:flex flex-col w-72 bg-white/5 dark:bg-slate-900/10 backdrop-blur-3xl border-r border-white/10 dark:border-slate-800/20 h-screen sticky top-0 z-40 shrink-0">
        <div className="p-8 flex items-center gap-4 border-b border-white/5 dark:border-slate-800/20">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-2xl overflow-hidden shrink-0 border border-white/20 bg-gradient-to-br", isDarkMode ? "from-emerald-600 to-green-700" : "from-orange-500 to-red-600")}>
            {customLogo ? (
              <img src={customLogo} alt="Company Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <ShieldCheck size={28} />
            )}
          </div>
          <div>
            <p className="font-black text-xl leading-none tracking-tight">IT Department <span className="text-orange-500 dark:text-emerald-500 transition-colors">Pro</span></p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-8 px-6 space-y-3">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Analytics', adminOnly: true },
            { id: 'shop-view', icon: ShoppingCart, label: 'Shop View', adminOnly: true },
            { id: 'clients', icon: Users, label: 'CRM Clients', adminOnly: true },
            { id: 'categories', icon: LayoutGrid, label: 'Categories', adminOnly: true },
            { id: 'products', icon: ShoppingCart, label: 'Products', adminOnly: true },
            { id: 'expenses', icon: Wallet, label: 'Finance', adminOnly: true },
            { id: 'my-orders', icon: ShoppingBag, label: 'My Orders', adminOnly: false },
            { id: 'bandwidth', icon: Zap, label: 'Network', adminOnly: false },
            { id: 'warranty', icon: ShieldCheck, label: 'Support', adminOnly: true },
            { id: 'me', icon: User, label: 'Account', adminOnly: false },
          ].filter(item => isAdmin || !item.adminOnly).map(item => (
            <motion.button 
              whileHover={{ x: 5, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              animate={activeTab === item.id ? { scale: [1, 1.01, 1] } : { scale: 1 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
              }}
              className={cn(
                "w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-500 group",
                activeTab === item.id 
                  ? "bg-orange-600 dark:bg-emerald-600 text-white font-bold shadow-2xl ring-1 ring-white/20" 
                  : "text-gray-500 hover:text-orange-600 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-slate-800/40 dark:hover:text-emerald-500"
              )}
            >
              <div className="flex items-center gap-4">
                <motion.div
                  animate={activeTab === item.id ? { 
                    y: [0, -3, 0], 
                    opacity: [0.5, 1, 0.5] 
                  } : { y: 0, opacity: 1 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  <item.icon size={22} className={cn("transition-colors", activeTab === item.id ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "group-hover:text-orange-600 dark:group-hover:text-emerald-500")} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                </motion.div>
                <span className="text-sm tracking-tight">{item.label}</span>
              </div>
              {item.id === 'products' && isAdmin && publicOrders.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ring-2 ring-white/10">
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
        <header className="p-4 flex justify-between items-center sticky top-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl z-30 border-b border-white/10 dark:border-slate-800/30 md:px-8 shadow-sm">
          <div className="flex items-center gap-2 md:hidden">
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 text-slate-500">
               <Menu size={24} />
            </button>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden", isDarkMode ? "bg-emerald-600" : "bg-orange-500")}>
              {customLogo ? (
                <img src={customLogo} alt="Company Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <ShieldCheck size={24} />
              )}
            </div>
            <div>
              <p className="font-bold text-sm leading-none">IT Department Pro</p>
            </div>
          </div>
          
          {/* Mobile Menu Dropdown */}
          {showMobileMenu && (
            <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 p-4 z-50 md:hidden shadow-xl">
                {[
                    { id: 'dashboard', icon: LayoutDashboard, label: 'Analytics', adminOnly: true },
                    { id: 'shop-view', icon: ShoppingCart, label: 'Shop View', adminOnly: true },
                    { id: 'clients', icon: Users, label: 'CRM Clients', adminOnly: true },
                    { id: 'categories', icon: LayoutGrid, label: 'Categories', adminOnly: true },
                    { id: 'products', icon: ShoppingCart, label: 'Products', adminOnly: true },
                    { id: 'expenses', icon: Wallet, label: 'Finance', adminOnly: true },
                    { id: 'bandwidth', icon: Zap, label: 'Network', adminOnly: false },
                    { id: 'warranty', icon: ShieldCheck, label: 'Support', adminOnly: true },
                    { id: 'ai-assistant', icon: Bot, label: 'AI Intelligence', adminOnly: false },
                    { id: 'offers', icon: Megaphone, label: 'Marketing', adminOnly: false },
                    { id: 'alerts', icon: Bell, label: 'Alerts', adminOnly: false },
                    { id: 'me', icon: User, label: 'Account', adminOnly: false },
                ].filter(item => isAdmin || !item.adminOnly).map(item => (
                    <button 
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setShowMobileMenu(false); }}
                        className={cn("w-full text-left p-3 text-sm font-medium hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-3 transition-all", activeTab === item.id ? "text-orange-600 dark:text-emerald-500 bg-orange-50 dark:bg-emerald-900/40 shadow-inner" : "")}
                    >
                        <motion.div animate={activeTab === item.id ? { y: [0, -3, 0], opacity: [0.5, 1, 0.5] } : { y: 0, opacity: 1 }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                          <item.icon size={18} className={activeTab === item.id ? "drop-shadow-md" : ""} />
                        </motion.div>
                        {item.label}
                    </button>
                ))}
            </div>
          )}

          
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
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              className="p-2.5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl transition-all duration-300 text-gray-600 dark:text-gray-300 shadow-sm hover:shadow-lg"
            >
              {isDarkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-orange-600" />}
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowCart(true)}
              aria-label="View shopping cart"
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
          {/* Admin Notification Header */}
          {isAdmin && publicOrders.filter(o => o.status === 'pending').length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowPendingOrders(true)}
              className="mb-6 bg-orange-500 text-white p-4 rounded-2xl flex items-center justify-between cursor-pointer shadow-xl shadow-orange-500/20 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <Bell size={20} className="shake-animation" />
                <span className="text-sm font-black uppercase tracking-tight">
                  You have {publicOrders.filter(o => o.status === 'pending').length} new pending orders!
                </span>
              </div>
              <ChevronRight size={20} />
            </motion.div>
          )}

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
                  sliderImages={sliderImages}
                  offers={offers}
                  formatCurrency={formatCurrency}
                  addToCart={addToCart}
                  setActiveTab={setActiveTab}
                  setSelectedProduct={setSelectedProduct}
                  setShowAddProduct={(v) => v ? withPassword(() => setShowAddProduct(v), true) : setShowAddProduct(v)}
                  onEditProduct={(p) => withPassword(() => setShowEditProduct(p), true)}
                  isAdmin={isAdmin}
                  isDarkMode={isDarkMode}
                />
              )}
              {activeTab === 'shop-view' && (
                <PublicStore 
                  products={products} 
                  sliderImages={sliderImages}
                  offers={offers}
                  formatCurrency={formatCurrency} 
                  addToCart={addToCart} 
                  setActiveTab={setActiveTab}
                  setSelectedProduct={setSelectedProduct}
                />
              )}
              {activeTab === 'offers' && (
                <OffersPage 
                  isAdmin={isAdmin}
                  offers={offers}
                  user={user}
                  addNotification={addNotification}
                  withPassword={withPassword}
                />
              )}
              {activeTab === 'my-orders' && (
                <MyOrdersPage user={user} clients={clients} formatCurrency={formatCurrency} />
              )}
              {activeTab === 'clients' && isAdmin && (
                <ClientList 
                  clients={clients}
                  formatCurrency={formatCurrency}
                  setShowClientProfile={setShowClientProfile}
                  withPassword={withPassword}
                  setShowAddClient={setShowAddClient}
                />
              )}
              {activeTab === 'categories' && isAdmin && (
                <CategoryManager 
                  productCategories={productCategories}
                  setProductCategories={setProductCategories}
                  products={products}
                />
              )}
              {activeTab === 'track-order' && (
                <TrackOrderPage formatCurrency={formatCurrency} clients={clients} />
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
              {activeTab === 'expenses' && isAdmin && (
                <ExpensePage />
              )}
              {activeTab === 'bandwidth' && (
                <BandwidthTestPage />
              )}
              {activeTab === 'warranty' && isAdmin && <WarrantyPage clients={clients} />}
              {activeTab === 'support' && (
                <SupportPage />
              )}
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
                  offersMusic={offersMusic}
                  setOffersMusic={setOffersMusic}
                  sliderImages={sliderImages}
                  setSliderImages={setSliderImages}
                  onBackup={generateInventoryPDF}
                  onOpenCalculator={() => setShowCalculator(true)}
                  onLock={lockAdmin}
                  adminPassword={adminPassword}
                  setAdminPassword={setAdminPassword}
                  user={user}
                  onRecordPayment={handleAddPayment}
                  clients={clients}
                  withPassword={withPassword}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Navigation - Mobile Only */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 px-2 py-2 flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Home', adminOnly: false },
            { id: 'categories', icon: LayoutGrid, label: 'Groups', adminOnly: true },
            { id: 'products', icon: Package, label: 'Stock', adminOnly: true },
            { id: 'clients', icon: Users, label: 'Clients', adminOnly: true },
            { id: 'cart', icon: ShoppingCart, label: 'Cart', adminOnly: false },
            { id: 'me', icon: User, label: 'Account', adminOnly: false },
          ].filter(item => isAdmin || !item.adminOnly).map(item => (
            <motion.button 
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (item.id === 'cart') {
                  setShowCart(true);
                } else {
                  setActiveTab(item.id as any);
                }
              }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all duration-300 px-4 py-1 rounded-xl relative",
                activeTab === item.id || (item.id === 'cart' && showCart)
                  ? "text-orange-500 dark:text-emerald-500"
                  : "text-gray-400 dark:text-gray-500"
              )}
            >
              <motion.div
                animate={activeTab === item.id || (item.id === 'cart' && showCart) ? {
                  y: [0, -3, 0],
                  opacity: [0.5, 1, 0.5]
                } : { y: 0, opacity: 1 }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                <item.icon size={20} className={activeTab === item.id || (item.id === 'cart' && showCart) ? "drop-shadow-md" : ""} strokeWidth={activeTab === item.id || (item.id === 'cart' && showCart) ? 3 : 2} />
              </motion.div>
              <span className="text-[10px] font-bold tracking-tighter uppercase">{item.label}</span>
              {(activeTab === item.id || (item.id === 'cart' && showCart)) && (
                <motion.div 
                  layoutId="activeTabDot"
                  className="absolute -top-1 w-1 h-1 rounded-full bg-orange-500 dark:bg-emerald-500"
                />
              )}
              {item.id === 'cart' && cart.length > 0 && (
                <span className="absolute top-0 right-3 bg-orange-500 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
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

const MyOrdersPage = ({ user, clients, formatCurrency }: { user: any | null, clients: Client[], formatCurrency: (amount: number) => string }) => {
  const client = useMemo(() => clients.find(c => c.email === user?.email || c.phone === user?.phoneNumber), [clients, user]);
  
  if (!client) return <div className="p-4 text-center">No orders found. Please log in or contact support.</div>;
  
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-black mb-4">My Orders</h2>
      {client.orders.map(order => (
        <div key={order.id} className="glass-card p-4">
          <div className="flex justify-between items-center mb-2 border-b dark:border-slate-800 pb-2">
            <span className="font-bold text-sm">Order ID: {order.id}</span>
            <span className={cn("px-2 py-1 rounded text-[10px] font-black uppercase", getStatusColor(order.status))}>
              {order.status}
            </span>
          </div>
          <div className="space-y-1">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>{item.name} x {item.quantity}</span>
                <span>{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="text-right mt-2 text-sm font-bold text-blue-600">Total: {formatCurrency(order.total)}</div>
        </div>
      ))}
    </div>
  );
};

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

const EditClientModal = ({ client, onClose, onUpdate }: { client: Client, onClose: () => void, onUpdate: (id: number, details: { name: string, phone: string, email?: string, address: string }) => void }) => {
  const [name, setName] = useState(client.name);
  const [phone, setPhone] = useState(client.phone);
  const [email, setEmail] = useState(client.email || '');
  const [address, setAddress] = useState(client.address);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !address) return;
    onUpdate(client.id, { name, phone, email, address });
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
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Email</label>
            <input 
              type="email" 
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/20"
              value={email}
              onChange={e => setEmail(e.target.value)}
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
                <img src={currentClient.image} alt={currentClient.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                    <select 
                      value={order.status || OrderStatus.PENDING}
                      onChange={(e) => onUpdateOrderStatus(currentClient.id, order.id, e.target.value as OrderStatus)}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-transparent border-none outline-none cursor-pointer",
                        getStatusColor(order.status || OrderStatus.PENDING)
                      )}
                    >
                      {Object.values(OrderStatus).map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-500">{order.date}</span>
                    <button 
                      onClick={() => generateReceiptPDF(order)}
                      className="p-1 text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Download Invoice"
                    >
                      <Download size={14} />
                    </button>
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
