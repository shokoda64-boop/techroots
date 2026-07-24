import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Laptop,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  History,
  FileBarChart2,
  LogOut,
  RefreshCw,
  Sparkles,
  User as UserIcon,
  AlertCircle,
  Settings as SettingsIcon
} from "lucide-react";

// Components
import Login from "./components/Login";
import StatsDashboard from "./components/StatsDashboard";
import InventoryModule from "./components/InventoryModule";
import SalesModule from "./components/SalesModule";
import WithdrawalsModule from "./components/WithdrawalsModule";
import TransactionsHistory from "./components/TransactionsHistory";
import ImportModule from "./components/ImportModule";
import ReportsModule from "./components/ReportsModule";
import SettingsModule, { LogoRenderer } from "./components/SettingsModule";

// Types
import { Transaction, User, AppSettings } from "./types";

export default function App() {
  // Authentication State
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("tech_roots_user");
    return saved ? JSON.parse(saved) : null;
  });

  // App Settings State
  const [appSettings, setAppSettings] = useState<AppSettings>({
    appName: "تيك روتس للأجهزة واللابتوب • Tech Roots",
    logo: "Laptop"
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Database Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom Confirmation & Toast States
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const triggerToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Syncing / Polling State
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch public settings on mount
  useEffect(() => {
    const fetchPublicSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setAppSettings(data.settings);
          }
        }
      } catch (err) {
        console.error("Error fetching public settings:", err);
      }
    };
    fetchPublicSettings();
  }, []);

  // Load user details
  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem("tech_roots_user", JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("tech_roots_user");
  };

  // Fetch all transactions from the Express server
  const fetchTransactions = async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/data");
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
        if (data.settings) {
          setAppSettings(data.settings);
        }
        setLastSyncTime(new Date());
      } else {
        setError("فشل تحميل البيانات من الخادم.");
      }
    } catch (err) {
      console.error(err);
      setError("تعذر الاتصال بقاعدة بيانات الخادم.");
    } finally {
      if (!silent) setLoading(false);
      setIsSyncing(false);
    }
  };

  // Load transactions when user logs in
  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  // Dynamic automatic syncing every 15 seconds so Mohamed always sees the latest changes made by Saif
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchTransactions(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Add a new transaction
  const handleAddTransaction = async (txData: any): Promise<boolean> => {
    if (!user || user.role !== "admin") {
      triggerToast("خطأ: لا تملك الصلاحية لإضافة معاملات.", "error");
      return false;
    }

    try {
      const response = await fetch("/api/data/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(txData),
      });

      if (response.ok) {
        await fetchTransactions(true);
        return true;
      }
    } catch (err) {
      console.error("Error adding transaction:", err);
    }
    return false;
  };

  // Edit an existing transaction
  const handleEditTransaction = async (id: string, txData: any): Promise<boolean> => {
    if (!user || user.role !== "admin") {
      triggerToast("خطأ: لا تملك الصلاحية لتعديل المعاملات.", "error");
      return false;
    }

    try {
      const response = await fetch(`/api/data/transaction/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(txData),
      });

      if (response.ok) {
        await fetchTransactions(true);
        return true;
      }
    } catch (err) {
      console.error("Error editing transaction:", err);
    }
    return false;
  };

  // Delete a transaction
  const handleDeleteTransaction = async (id: string): Promise<boolean> => {
    if (!user || user.role !== "admin") {
      triggerToast("خطأ: لا تملك الصلاحية لحذف المعاملات.", "error");
      return false;
    }

    try {
      const response = await fetch(`/api/data/transaction/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchTransactions(true);
        return true;
      }
    } catch (err) {
      console.error("Error deleting transaction:", err);
    }
    return false;
  };

  // Bulk delete transactions
  const handleBulkDeleteTransactions = async (ids: string[]): Promise<boolean> => {
    if (!user || user.role !== "admin") {
      triggerToast("خطأ: لا تملك الصلاحية لحذف المعاملات.", "error");
      return false;
    }

    try {
      const response = await fetch("/api/data/transaction/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (response.ok) {
        await fetchTransactions(true);
        return true;
      }
    } catch (err) {
      console.error("Error bulk deleting transactions:", err);
    }
    return false;
  };

  // Clear a specific section's transactions
  const handleClearSection = async (type: "add_inventory" | "sale" | "withdrawal" | "all"): Promise<boolean> => {
    if (!user || user.role !== "admin") {
      triggerToast("خطأ: لا تملك الصلاحية لمسح المعاملات.", "error");
      return false;
    }

    try {
      const response = await fetch("/api/data/transaction/clear-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        await fetchTransactions(true);
        return true;
      }
    } catch (err) {
      console.error("Error clearing section:", err);
    }
    return false;
  };

  // Reset database back to seed defaults (Saif only)
  const handleResetDatabase = async () => {
    if (!user || user.role !== "admin") return;

    try {
      const response = await fetch("/api/data/reset", { method: "POST" });
      if (response.ok) {
        triggerToast("تمت إعادة تعيين البيانات بنجاح!");
        fetchTransactions();
      } else {
        triggerToast("فشل إعادة تعيين البيانات.", "error");
      }
    } catch (err) {
      console.error(err);
      triggerToast("فشل إعادة تعيين البيانات.", "error");
    }
    setShowResetConfirm(false);
  };

  // If not logged in, show login page
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} appSettings={appSettings} />;
  }

  // Navigation Items
  const menuItems = [
    { id: "dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
    { id: "inventory", label: "المخزون", icon: Package },
    { id: "sales", label: "المبيعات", icon: ShoppingCart },
    { id: "withdrawals", label: "مسحوبات محمد", icon: Wallet },
    { id: "history", label: "سجل المعاملات", icon: History },
    ...(user.role === "admin"
      ? [
          { id: "import", label: "المستورد الذكي", icon: Sparkles, isPremium: true },
          { id: "settings", label: "الإعدادات", icon: SettingsIcon }
        ]
      : []),
    { id: "reports", label: "التقارير والطباعة", icon: FileBarChart2 }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col md:flex-row antialiased font-sans">
      {/* Sidebar (No Print) */}
      <aside className="w-full md:w-64 bg-slate-900/60 backdrop-blur-md border-b md:border-b-0 md:border-l border-slate-800/80 p-5 flex flex-col justify-between shrink-0 no-print">
        <div className="space-y-8">
          {/* Business Brand */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800/80">
            <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
              <LogoRenderer logoName={appSettings.logo} className="w-5 h-5" />
            </div>
            <div className="overflow-hidden col-span-1">
              <h1 className="text-xs font-extrabold text-white tracking-wide truncate">{appSettings.appName}</h1>
              <p className="text-[9px] text-slate-500 font-medium">لوحة المراقبة والحسابات</p>
            </div>
          </div>

          {/* User Status Card */}
          <div className="p-3.5 bg-slate-950/40 border border-slate-800/50 rounded-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400 border border-blue-500/20">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-white">{user.displayName}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">
                  {user.role === "admin" ? "مدير مالي كامل الصلاحيات" : "شريك مراقب ومطلع"}
                </div>
              </div>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                user.role === "admin" ? "bg-blue-400 animate-pulse" : "bg-amber-400"
              }`}
            />
          </div>

          {/* Nav Links */}
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.isPremium && (
                    <span className="text-[9px] bg-gradient-to-l from-blue-500 to-cyan-500 text-white px-2 py-0.5 rounded-full font-bold">
                      ذكاء اصطناعي
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="pt-6 border-t border-slate-800/80 space-y-4">
          {/* Sync indicator */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-medium">
            <div className="flex items-center gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-blue-400" : ""}`} />
              <span>آخر تحديث: {lastSyncTime.toLocaleTimeString("ar-EG")}</span>
            </div>
            <button
              onClick={() => fetchTransactions(true)}
              className="hover:text-blue-400 transition-colors cursor-pointer"
              title="تحديث البيانات"
            >
              تحديث
            </button>
          </div>

          {/* Saif Reset DB */}
          {user.role === "admin" && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full text-center text-[10px] text-slate-500 hover:text-red-400 hover:bg-red-950/10 border border-dashed border-slate-800/80 hover:border-red-900/30 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              إعادة تعيين للتطبيق الأصلي
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/10 border border-red-950/50 py-3 rounded-xl active:scale-[0.98] transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full relative">
        {/* Loading Screen */}
        {loading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-slate-400 text-xs">جاري مزامنة وتأمين الاتصال بقاعدة البيانات الموحدة...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-950/20 border border-red-500/30 rounded-2xl flex items-center gap-4 text-red-200">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">عطل في مزامنة قاعدة البيانات</h4>
              <p className="text-xs text-red-300 mt-1">{error}</p>
            </div>
            <button
              onClick={() => fetchTransactions()}
              className="mr-auto bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              إعادة اتصال
            </button>
          </div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Active module selection */}
            {activeTab === "dashboard" && <StatsDashboard transactions={transactions} />}
            {activeTab === "inventory" && (
              <InventoryModule
                transactions={transactions}
                user={user}
                onAddTransaction={handleAddTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onBulkDelete={handleBulkDeleteTransactions}
                onClearSection={handleClearSection}
              />
            )}
            {activeTab === "sales" && (
              <SalesModule
                transactions={transactions}
                user={user}
                onAddTransaction={handleAddTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onBulkDelete={handleBulkDeleteTransactions}
                onClearSection={handleClearSection}
              />
            )}
            {activeTab === "withdrawals" && (
              <WithdrawalsModule
                transactions={transactions}
                user={user}
                onAddTransaction={handleAddTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onBulkDelete={handleBulkDeleteTransactions}
                onClearSection={handleClearSection}
              />
            )}
            {activeTab === "history" && (
              <TransactionsHistory
                transactions={transactions}
                user={user}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onBulkDelete={handleBulkDeleteTransactions}
                onClearSection={handleClearSection}
              />
            )}
            {activeTab === "import" && user.role === "admin" && (
              <ImportModule user={user} onImportComplete={() => fetchTransactions(true)} />
            )}
            {activeTab === "reports" && <ReportsModule transactions={transactions} />}
            {activeTab === "settings" && user.role === "admin" && (
              <SettingsModule
                user={user}
                currentSettings={appSettings}
                onSettingsUpdated={(newSettings) => setAppSettings(newSettings)}
              />
            )}
          </motion.div>
        )}
      </main>

      {/* Floating Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-500 no-print">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 font-bold text-xs ${
            toastMessage.type === "success" 
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200" 
              : "bg-red-950/90 border-red-500/50 text-red-200"
          }`}>
            <AlertCircle className={`w-5 h-5 ${toastMessage.type === "success" ? "text-emerald-400" : "text-red-400"}`} />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Database Reset Custom Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3 text-red-400 border-b border-slate-800 pb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-md font-bold text-white">تأكيد إعادة تعيين قاعدة البيانات</h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed text-right">
              تحذير! هل تريد بالتأكيد إعادة تعيين قاعدة البيانات إلى قيم التقرير الأصلي؟ سيتم مسح أي تعديلات أو معاملات مضافة قمت بها بالكامل.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
              >
                إلغاء التراجع
              </button>
              <button
                onClick={handleResetDatabase}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-red-900/20 transition-all active:scale-95 cursor-pointer"
              >
                تأكيد إعادة التعيين
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
