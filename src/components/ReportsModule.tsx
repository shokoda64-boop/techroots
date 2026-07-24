import { useState } from "react";
import { motion } from "motion/react";
import { FileText, Printer, Calendar, BarChart3, TrendingUp, DollarSign, Wallet, Package, Laptop, Eye } from "lucide-react";
import { Transaction } from "../types";

interface ReportsModuleProps {
  transactions: Transaction[];
}

type ReportType = "inventory" | "sales" | "withdrawals" | "balance";
type ReportPeriod = "daily" | "monthly" | "yearly";

export default function ReportsModule({ transactions }: ReportsModuleProps) {
  const [reportType, setReportType] = useState<ReportType>("balance");
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>("monthly");

  // Helper: Format Date based on Period
  const getPeriodKey = (dateStr: string, period: ReportPeriod) => {
    if (!dateStr) return "غير معروف";
    if (period === "daily") return dateStr; // YYYY-MM-DD
    if (period === "monthly") return dateStr.substring(0, 7); // YYYY-MM
    return dateStr.substring(0, 4); // YYYY
  };

  const getPeriodLabel = (key: string, period: ReportPeriod) => {
    if (period === "daily") {
      const d = new Date(key);
      return isNaN(d.getTime())
        ? key
        : new Intl.DateTimeFormat("ar-EG", { dateStyle: "long" }).format(d);
    }
    if (period === "monthly") {
      const parts = key.split("-");
      if (parts.length < 2) return key;
      const monthNames = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
      ];
      const monthIndex = parseInt(parts[1], 10) - 1;
      return `${monthNames[monthIndex]} ${parts[0]}`;
    }
    return `سنة ${key}`;
  };

  // Process data based on selected report types and periods
  const getReportData = () => {
    const grouped = new Map<string, {
      salesAmount: number;
      salesCount: number;
      withdrawalsAmount: number;
      withdrawalsCount: number;
      addedDevicesCount: number;
    }>();

    transactions.forEach((tx) => {
      const key = getPeriodKey(tx.date, reportPeriod);
      if (!grouped.has(key)) {
        grouped.set(key, {
          salesAmount: 0,
          salesCount: 0,
          withdrawalsAmount: 0,
          withdrawalsCount: 0,
          addedDevicesCount: 0,
        });
      }

      const metrics = grouped.get(key)!;
      if (tx.type === "sale") {
        metrics.salesAmount += tx.amount;
        if (tx.model !== "عمولة فاليو") {
          metrics.salesCount += tx.quantity || 0;
        }
      } else if (tx.type === "withdrawal") {
        metrics.withdrawalsAmount += tx.amount;
        metrics.withdrawalsCount += 1;
      } else if (tx.type === "add_inventory") {
        metrics.addedDevicesCount += tx.quantity || 0;
      }
    });

    // Convert Map to sorted array
    return Array.from(grouped.entries())
      .map(([key, data]) => ({
        key,
        label: getPeriodLabel(key, reportPeriod),
        ...data,
        netBalance: data.salesAmount - data.withdrawalsAmount,
      }))
      .sort((a, b) => b.key.localeCompare(a.key)); // Newest first
  };

  const reportData = getReportData();

  // Grand totals
  const totalSales = transactions
    .filter((tx) => tx.type === "sale")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalWithdrawals = transactions
    .filter((tx) => tx.type === "withdrawal")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalAddedDevices = transactions
    .filter((tx) => tx.type === "add_inventory")
    .reduce((sum, tx) => sum + (tx.quantity || 0), 0);

  const totalSoldDevices = transactions
    .filter((tx) => tx.type === "sale" && tx.model !== "عمولة فاليو")
    .reduce((sum, tx) => sum + (tx.quantity || 0), 0);

  const totalRemainingDevices = totalAddedDevices - totalSoldDevices;

  // Formatting Currency
  const formatEGP = (value: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    })
      .format(value)
      .replace("جم", "ج.م");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Header controls (No Print) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-white">مركز التقارير المتقدم (Report Center)</h2>
          <p className="text-slate-400 text-sm mt-1">توليد وتحليل تقارير تفصيلية للمخزون، المبيعات، ومسحوبات محمد بفترات زمنية مختلفة.</p>
        </div>
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-950/40 transition-all self-start text-xs cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة وتصدير كتقرير PDF</span>
        </button>
      </div>

      {/* Selectors Panel (No Print) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 no-print grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Report Type Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400">تصنيف التقرير الأساسي</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setReportType("balance")}
              className={`px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === "balance"
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:bg-slate-800/40"
              }`}
            >
              تقرير الأرصدة
            </button>
            <button
              onClick={() => setReportType("inventory")}
              className={`px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === "inventory"
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:bg-slate-800/40"
              }`}
            >
              تقرير المخزون
            </button>
            <button
              onClick={() => setReportType("sales")}
              className={`px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === "sales"
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:bg-slate-800/40"
              }`}
            >
              تقرير المبيعات
            </button>
            <button
              onClick={() => setReportType("withdrawals")}
              className={`px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                reportType === "withdrawals"
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:bg-slate-800/40"
              }`}
            >
              تقرير المسحوبات
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400">التقسيم الزمني للتقرير</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setReportPeriod("daily")}
              className={`px-3 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                reportPeriod === "daily"
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 font-extrabold"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:bg-slate-800/40"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>تقرير يومي</span>
            </button>
            <button
              onClick={() => setReportPeriod("monthly")}
              className={`px-3 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                reportPeriod === "monthly"
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 font-extrabold"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:bg-slate-800/40"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>تقرير شهري</span>
            </button>
            <button
              onClick={() => setReportPeriod("yearly")}
              className={`px-3 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                reportPeriod === "yearly"
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 font-extrabold"
                  : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:bg-slate-800/40"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>تقرير سنوي</span>
            </button>
          </div>
        </div>
      </div>

      {/* PRINT CONTAINER (Renders beautifully on Screen and Printer) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-8 print-card">
        {/* Printable Letterhead (Only visible in print mode, hidden on screen) */}
        <div className="hidden print-only border-b-2 border-slate-900 pb-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="text-right">
              <h1 className="text-2xl font-black text-black">تيك روتس للأجهزة واللابتوب • Tech Roots</h1>
              <p className="text-xs text-gray-600 mt-1">تقرير داخلي رسمي وتفصيلي للحسابات والمخازن</p>
            </div>
            <div className="text-left text-xs text-gray-600">
              <p>تاريخ استخراج التقرير: 19 يوليو 2026</p>
              <p>مخصص لـ: سيف ومحمد (شركاء تيك روتس)</p>
            </div>
          </div>
        </div>

        {/* Report Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl print-card">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white print:text-black">
                {reportType === "balance" && "تقرير الميزان والرصيد المالي"}
                {reportType === "inventory" && "تقرير حركة مخزون الأجهزة"}
                {reportType === "sales" && "تقرير المبيعات والعمولات الإجمالية"}
                {reportType === "withdrawals" && "تقرير مسحوبات الشركاء (محمد)"}
              </h3>
              <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
                المنظور الزمني: {reportPeriod === "daily" ? "يومي" : reportPeriod === "monthly" ? "شهري" : "سنوي"} • تم التحديث لغاية اليوم
              </p>
            </div>
          </div>
          <div className="text-left">
            <span className="text-xs text-slate-500 bg-slate-950/40 px-3 py-1.5 rounded-xl print:border print:text-black font-bold border border-slate-800">
              مستند سري للاستخدام الداخلي فقط
            </span>
          </div>
        </div>

        {/* Dynamic Context Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-xl print-card">
            <div className="text-[10px] font-bold text-slate-400 print:text-gray-600">إجمالي الأجهزة الواردة</div>
            <div className="text-lg font-black text-white print:text-black mt-1">{totalAddedDevices} أجهزة</div>
          </div>
          <div className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-xl print-card">
            <div className="text-[10px] font-bold text-slate-400 print:text-gray-600">المخزون المتبقي حالياً</div>
            <div className="text-lg font-black text-blue-400 print:text-black mt-1">{totalRemainingDevices} أجهزة</div>
          </div>
          <div className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-xl print-card">
            <div className="text-[10px] font-bold text-slate-400 print:text-gray-600">إجمالي قيمة المبيعات</div>
            <div className="text-lg font-black text-emerald-400 print:text-black mt-1">{formatEGP(totalSales)}</div>
          </div>
          <div className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-xl print-card">
            <div className="text-[10px] font-bold text-slate-400 print:text-gray-600">الرصيد المالي المتبقي</div>
            <div className="text-lg font-black text-amber-500 print:text-black mt-1">{formatEGP(totalSales - totalWithdrawals)}</div>
          </div>
        </div>

        {/* Report Data Table */}
        <div className="overflow-x-auto pt-4">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-slate-800 print:border-gray-900 text-slate-400 print:text-gray-800 text-xs font-extrabold">
                <th className="pb-3 pr-2">الفترة الزمنية</th>
                {reportType === "inventory" && <th className="pb-3 text-center">أجهزة واردة جديدة</th>}
                {reportType === "sales" && (
                  <>
                    <th className="pb-3 text-center">عدد الأجهزة المباعة</th>
                    <th className="pb-3 text-left pl-4">قيمة المبيعات</th>
                  </>
                )}
                {reportType === "withdrawals" && (
                  <>
                    <th className="pb-3 text-center">عدد مرات السحب</th>
                    <th className="pb-3 text-left pl-4">مجموع السحوبات</th>
                  </>
                )}
                {reportType === "balance" && (
                  <>
                    <th className="pb-3 text-left pl-4">قيمة المبيعات</th>
                    <th className="pb-3 text-left pl-4">مسحوبات محمد</th>
                    <th className="pb-3 text-left pl-4">الرصيد المتبقي بالفترة</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 print:divide-gray-200">
              {reportData.map((row, index) => (
                <tr key={index} className="hover:bg-slate-850/40 transition-colors print:hover:bg-transparent">
                  <td className="py-4 pr-2 font-bold text-white print:text-black">{row.label}</td>
                  
                  {reportType === "inventory" && (
                    <td className="py-4 text-center text-slate-300 print:text-black font-semibold">
                      {row.addedDevicesCount} أجهزة
                    </td>
                  )}

                  {reportType === "sales" && (
                    <>
                      <td className="py-4 text-center text-slate-300 print:text-black font-semibold">
                        {row.salesCount} أجهزة
                      </td>
                      <td className="py-4 text-left pl-4 text-emerald-400 print:text-black font-bold">
                        {formatEGP(row.salesAmount)}
                      </td>
                    </>
                  )}

                  {reportType === "withdrawals" && (
                    <>
                      <td className="py-4 text-center text-slate-300 print:text-black">
                        {row.withdrawalsCount} مرات سحب
                      </td>
                      <td className="py-4 text-left pl-4 text-amber-500 print:text-black font-bold">
                        {formatEGP(row.withdrawalsAmount)}
                      </td>
                    </>
                  )}

                  {reportType === "balance" && (
                    <>
                      <td className="py-4 text-left pl-4 text-emerald-400 print:text-black">
                        {formatEGP(row.salesAmount)}
                      </td>
                      <td className="py-4 text-left pl-4 text-amber-500 print:text-black">
                        {formatEGP(row.withdrawalsAmount)}
                      </td>
                      <td className={`py-4 text-left pl-4 font-black ${row.netBalance >= 0 ? "text-blue-400 print:text-black" : "text-red-400 print:text-black"}`}>
                        {formatEGP(row.netBalance)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Printable Footer Signatures (Only visible in print, hidden on screen) */}
        <div className="hidden print-only pt-16 mt-16 border-t border-gray-400 flex justify-between">
          <div className="text-center w-40">
            <p className="text-xs font-bold text-black">توقيع الشريك المدير</p>
            <p className="text-[10px] text-gray-600 mt-6">(سيف)</p>
          </div>
          <div className="text-center w-40">
            <p className="text-xs font-bold text-black">توقيع الشريك المراقب</p>
            <p className="text-[10px] text-gray-600 mt-6">(محمد)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
