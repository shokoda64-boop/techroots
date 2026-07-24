import { motion } from "motion/react";
import { TrendingUp, Laptop, ShoppingCart, DollarSign, Wallet, ArrowDownRight, Package } from "lucide-react";
import { Transaction } from "../types";

interface StatsDashboardProps {
  transactions: Transaction[];
}

export default function StatsDashboard({ transactions }: StatsDashboardProps) {
  // 1. Devices Added
  const totalAddedDevices = transactions
    .filter((tx) => tx.type === "add_inventory")
    .reduce((sum, tx) => sum + (tx.quantity || 0), 0);

  // 2. Devices Sold (filter out fee deductions like "عمولة فاليو" for counts)
  const totalSoldDevices = transactions
    .filter((tx) => tx.type === "sale" && tx.model !== "عمولة فاليو")
    .reduce((sum, tx) => sum + (tx.quantity || 0), 0);

  // 3. Devices Remaining
  const remainingDevices = totalAddedDevices - totalSoldDevices;

  // 4. Financial Statistics
  // Total Sales (sum of all sales - which naturally subtracts negative adjustments like عمولة فاليو)
  const totalSales = transactions
    .filter((tx) => tx.type === "sale")
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Total Withdrawals by Mohamed
  const totalWithdrawals = transactions
    .filter((tx) => tx.type === "withdrawal")
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Remaining Balance = Total Sales - Total Withdrawals
  const remainingBalance = totalSales - totalWithdrawals;

  // Formatting Currency
  const formatEGP = (value: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    })
      .format(value)
      .replace("جم", "ج.م")
      .replace("جنيه مصري", "ج.م");
  };

  const cardsData = [
    {
      title: "إجمالي المبيعات",
      value: formatEGP(totalSales),
      subtitle: "إجمالي الإيرادات المحققة من بيع الأجهزة",
      icon: DollarSign,
      color: "from-emerald-500 to-teal-600",
      glow: "rgba(16,185,129,0.15)",
    },
    {
      title: "مسحوبات محمد",
      value: formatEGP(totalWithdrawals),
      subtitle: "المبالغ المسحوبة من صندوق المبيعات بواسطة محمد",
      icon: Wallet,
      color: "from-amber-500 to-orange-600",
      glow: "rgba(245,158,11,0.15)",
    },
    {
      title: "الرصيد الحالي",
      value: formatEGP(remainingBalance),
      subtitle: "الرصيد المتبقي (المبيعات - المسحوبات)",
      icon: TrendingUp,
      color: "from-indigo-500 to-blue-600",
      glow: "rgba(99,102,241,0.15)",
    },
  ];

  const inventoryCards = [
    {
      title: "إجمالي الوارد",
      value: `${totalAddedDevices} جهاز`,
      icon: Package,
      bg: "bg-slate-900",
      borderColor: "border-slate-800",
      iconColor: "text-blue-400",
    },
    {
      title: "الأجهزة المباعة",
      value: `${totalSoldDevices} جهاز`,
      icon: ShoppingCart,
      bg: "bg-slate-900",
      borderColor: "border-slate-800",
      iconColor: "text-emerald-400",
    },
    {
      title: "المتبقي بالمخزن",
      value: `${remainingDevices} جهاز`,
      icon: Laptop,
      bg: remainingDevices <= 3 ? "bg-red-950/20" : "bg-slate-900",
      borderColor: remainingDevices <= 3 ? "border-red-900/30" : "border-slate-800",
      iconColor: remainingDevices <= 3 ? "text-red-400" : "text-blue-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Dynamic Greetings & Rapid Info */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">نظرة عامة على الأعمال</h2>
          <p className="text-slate-400 text-sm mt-1">متابعة دقيقة وفورية لحالة المخزون، التدفق المالي ومسحوبات الشركاء.</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-3 text-xs text-slate-400 font-medium self-start">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>تحديث تلقائي وفوري</span>
        </div>
      </div>

      {/* Financial Section */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 tracking-wider mb-4 uppercase">الملخص المالي (Financial Summary)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Sales */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0 }}
            className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 opacity-20" />
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400">إجمالي المبيعات</span>
                <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-none">
                  {formatEGP(totalSales)}
                </div>
                <p className="text-xs text-slate-500 font-medium">إجمالي الإيرادات المحققة من بيع الأجهزة</p>
              </div>
              <div className="p-3.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </motion.div>

          {/* Card 2: Withdrawals */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-orange-500 opacity-20" />
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400">مسحوبات محمد</span>
                <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-none">
                  {formatEGP(totalWithdrawals)}
                </div>
                <p className="text-xs text-slate-500 font-medium">المبالغ المسحوبة بواسطة محمد</p>
              </div>
              <div className="p-3.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white shadow-lg">
                <Wallet className="w-6 h-6" />
              </div>
            </div>
          </motion.div>

          {/* Card 3: Remaining Balance - Premium design */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-white text-slate-950 rounded-2xl p-6 shadow-2xl flex flex-col justify-between"
          >
            <div>
              <p className="text-slate-600 text-sm mb-1 font-bold">الرصيد المتبقي (الصافي)</p>
              <h3 className="text-3xl font-black tracking-tight text-slate-950 leading-none">
                {formatEGP(remainingBalance)}
              </h3>
            </div>
            <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-200 mt-4">
              <span className="font-bold text-slate-800">جاهز للتوزيع</span>
              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold">محدث تلقائياً</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Inventory Section */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 tracking-wider mb-4 uppercase">حركة الأجهزة والمخزون (Inventory Summary)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {inventoryCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 + i * 0.08 }}
              className={`p-6 ${card.bg} border ${card.borderColor} rounded-2xl flex items-center justify-between shadow-md relative overflow-hidden`}
            >
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400">{card.title}</span>
                <div className="text-xl font-extrabold text-white">{card.value}</div>
              </div>
              <div className={`p-3 bg-slate-950/40 rounded-2xl ${card.iconColor}`}>
                <card.icon className="w-5 h-5" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Dynamic Assistant Insights */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden"
      >
        <div className="absolute -right-20 -top-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shrink-0">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">مؤشر أداء الشراكة والمخزون</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              تمثل مسحوبات محمد حالياً {totalSales > 0 ? ((totalWithdrawals / totalSales) * 100).toFixed(1) : 0}% من إجمالي حجم المبيعات المحققة. المخزون المتبقي يحتوي على {remainingDevices} أجهزة صالحة للبيع والتداول.
            </p>
          </div>
        </div>
        <div className="text-xs text-blue-400 bg-blue-500/10 px-3.5 py-1.5 rounded-full font-bold">
          الرصيد المتاح آمن وصحي للعمليات الحالية
        </div>
      </motion.div>
    </div>
  );
}
