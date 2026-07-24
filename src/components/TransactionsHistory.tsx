import React, { useState } from "react";
import { motion } from "motion/react";
import { ListFilter, Search, Calendar, Clock, Package, ShoppingCart, Wallet, Trash2, Edit2, Download, AlertCircle, CheckSquare } from "lucide-react";
import { Transaction, User, TransactionType } from "../types";

function getCurrentTimeStr(): string {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes < 10 ? "0" + minutes : minutes;
  const hoursStr = hours < 10 ? "0" + hours : hours;
  return `${hoursStr}:${minutesStr} ${ampm}`;
}

interface TransactionsHistoryProps {
  transactions: Transaction[];
  user: User;
  onEditTransaction: (id: string, data: any) => Promise<boolean>;
  onDeleteTransaction: (id: string) => Promise<boolean>;
  onBulkDelete: (ids: string[]) => Promise<boolean>;
  onClearSection: (type: "add_inventory" | "sale" | "withdrawal" | "all") => Promise<boolean>;
}

export default function TransactionsHistory({
  transactions,
  user,
  onEditTransaction,
  onDeleteTransaction,
  onBulkDelete,
  onClearSection,
}: TransactionsHistoryProps) {
  const isAdmin = user.role === "admin";

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Custom Confirmation States
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleTypeFilterChange = (type: "all" | TransactionType) => {
    setTypeFilter(type);
    setSelectedIds([]); // Clear selection when changing filters
  };

  // Filtered list
  const filteredTransactions = transactions.filter((tx) => {
    const matchesType = typeFilter === "all" || tx.type === typeFilter;
    const matchesSearch =
      (tx.model && tx.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.notes && tx.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      String(tx.amount).includes(searchQuery);

    return matchesType && matchesSearch;
  });

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditDate(tx.date);
    setEditTime(tx.time || getCurrentTimeStr());
    setEditModel(tx.model || "");
    setEditQuantity(tx.quantity !== undefined ? String(tx.quantity) : "");
    setEditAmount(String(tx.amount));
    setEditNotes(tx.notes || "");
  };

  const handleEditSubmit = async (tx: Transaction) => {
    const updateData: any = {
      date: editDate,
      time: editTime,
      notes: editNotes,
    };

    if (tx.type !== "withdrawal") {
      updateData.model = editModel;
      updateData.quantity = editQuantity ? parseInt(editQuantity, 10) : undefined;
    }

    if (tx.type !== "add_inventory") {
      updateData.amount = parseFloat(editAmount);
    }

    const success = await onEditTransaction(tx.id, updateData);
    if (success) {
      setEditingId(null);
    }
  };

  // Selection Checkboxes Handlers
  const handleSelectAllChange = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map((tx) => tx.id));
    }
  };

  const handleSelectRowChange = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const executeBulkDelete = async () => {
    const success = await onBulkDelete(selectedIds);
    if (success) {
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
    }
  };

  const executeClearSection = async () => {
    const success = await onClearSection(typeFilter === "all" ? "all" : typeFilter);
    if (success) {
      setSelectedIds([]);
      setShowClearConfirm(false);
    }
  };

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

  // Export to CSV helper
  const exportToCSV = () => {
    const headers = ["ID", "التاريخ والوقت", "النوع", "البيان / الموديل", "الكمية", "المبلغ (ج.م)", "ملاحظات"];
    const rows = filteredTransactions.map((tx) => {
      let typeLabel = "";
      if (tx.type === "add_inventory") typeLabel = "إضافة مخزون";
      else if (tx.type === "sale") typeLabel = "بيع أجهزة";
      else if (tx.type === "withdrawal") typeLabel = "مسحوبات محمد";

      const dateTimeStr = `${tx.date} ${tx.time || "12:00 PM"}`;

      return [
        tx.id,
        dateTimeStr,
        typeLabel,
        tx.type === "withdrawal" ? "مسحوبات نقدية للشريك محمد" : tx.model || "—",
        tx.type === "withdrawal" || tx.model === "عمولة فاليو" ? "—" : tx.quantity !== undefined ? tx.quantity : "—",
        tx.type === "add_inventory" ? "—" : tx.amount,
        tx.notes || "",
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `سجل_معاملات_tech_roots_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">سجل المعاملات الموحد (Transactions History)</h2>
          <p className="text-slate-400 text-sm mt-1">سجل تفصيلي زمني لجميع عمليات الإضافة، البيع، ومسحوبات محمد.</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2.5">
            {showClearConfirm ? (
              <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-2 flex items-center gap-2.5 animate-fadeIn">
                <span className="text-xs text-red-400 font-bold">تأكيد مسح هذا السجل بالكامل؟</span>
                <button
                  onClick={executeClearSection}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all active:scale-95 cursor-pointer"
                >
                  تأكيد المسح
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-lg transition-all active:scale-95 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 font-bold px-4 py-3 rounded-xl flex items-center gap-1.5 transition-all text-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>مسح قسم السجل الحالي</span>
              </button>
            )}
          </div>
        )}
        <button
          onClick={exportToCSV}
          className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold px-4 py-3 rounded-xl flex items-center gap-2 transition-all text-sm cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>تصدير السجل كملف CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handleTypeFilterChange("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              typeFilter === "all"
                ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:bg-slate-800/40"
            }`}
          >
            كل المعاملات ({transactions.length})
          </button>
          <button
            onClick={() => handleTypeFilterChange("add_inventory")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              typeFilter === "add_inventory"
                ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:bg-slate-800/40"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>إضافة مخزون ({transactions.filter(t => t.type === "add_inventory").length})</span>
          </button>
          <button
            onClick={() => handleTypeFilterChange("sale")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              typeFilter === "sale"
                ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:bg-slate-800/40"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>المبيعات والعمولات ({transactions.filter(t => t.type === "sale").length})</span>
          </button>
          <button
            onClick={() => handleTypeFilterChange("withdrawal")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              typeFilter === "withdrawal"
                ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:bg-slate-800/40"
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>مسحوبات محمد ({transactions.filter(t => t.type === "withdrawal").length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="ابحث بالاسم، الملاحظات، المبلغ..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 outline-none rounded-xl pr-9 pl-4 py-2.5 text-white text-xs text-right"
          />
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {isAdmin && selectedIds.length > 0 && (
        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          {showBulkDeleteConfirm ? (
            <>
              <div className="flex items-center gap-2 text-red-400 animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <span className="text-sm font-bold">هل أنت متأكد من حذف {selectedIds.length} معاملة نهائياً؟</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={executeBulkDelete}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  نعم، احذف المحدد
                </button>
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-blue-400">
                <CheckSquare className="w-5 h-5" />
                <span className="text-sm font-semibold">تم تحديد {selectedIds.length} معاملة من السجل الحالي</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف المحدد</span>
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-md">قائمة السجلات ({filteredTransactions.length})</h3>
          {filteredTransactions.length > 0 && isAdmin && (
            <button
              onClick={handleSelectAllChange}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
            >
              {selectedIds.length === filteredTransactions.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
            </button>
          )}
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">لا توجد معاملات مسجلة مطابقة للفلاتر الحالية.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold">
                  {isAdmin && (
                    <th className="pb-3 w-8 pr-1">
                      <input
                        type="checkbox"
                        checked={filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length}
                        onChange={handleSelectAllChange}
                        className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th className="pb-3 pr-2">التاريخ والوقت</th>
                  <th className="pb-3">نوع المعاملة</th>
                  <th className="pb-3">البيان / التفاصيل</th>
                  <th className="pb-3 text-center">الكمية</th>
                  <th className="pb-3 text-left pl-6">المبلغ الإجمالي</th>
                  <th className="pb-3">ملاحظات</th>
                  {isAdmin && <th className="pb-3 text-left pl-2">الإجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className={`hover:bg-slate-850/40 transition-colors ${selectedIds.includes(tx.id) ? "bg-blue-600/5" : ""}`}>
                    {isAdmin && (
                      <td className="py-3 pr-1">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(tx.id)}
                          onChange={() => handleSelectRowChange(tx.id)}
                          className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    {editingId === tx.id ? (
                      // Inline edit row
                      <>
                        <td className="py-3">
                          <div className="flex flex-col gap-1.5">
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              disabled={!isAdmin}
                              className="bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-white text-xs w-28 text-left disabled:opacity-50"
                            />
                            <input
                              type="text"
                              value={editTime}
                              onChange={(e) => setEditTime(e.target.value)}
                              disabled={!isAdmin}
                              className="bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-white text-xs w-28 text-left disabled:opacity-50"
                            />
                          </div>
                        </td>
                        <td className="py-3 text-slate-400 font-bold">
                          {tx.type === "add_inventory" ? "إضافة مخزون" : tx.type === "sale" ? "مبيعات" : "مسحوبات محمد"}
                        </td>
                        <td className="py-3">
                          {tx.type !== "withdrawal" ? (
                            <input
                              type="text"
                              value={editModel}
                              onChange={(e) => setEditModel(e.target.value)}
                              className="bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-white text-xs w-full text-right"
                            />
                          ) : (
                            <span className="text-slate-500">مسحوبات نقدية للشريك محمد</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          {tx.type !== "withdrawal" && tx.model !== "عمولة فاليو" ? (
                            <input
                              type="number"
                              min="1"
                              value={editQuantity}
                              onChange={(e) => setEditQuantity(e.target.value)}
                              className="bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-white text-xs w-16 text-center"
                            />
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 text-left pl-6">
                          {tx.type !== "add_inventory" ? (
                            <input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-white text-xs w-24 text-left font-bold"
                            />
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-white text-xs w-full text-right"
                          />
                        </td>
                        {isAdmin && (
                          <td className="py-3 text-left pl-2">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleEditSubmit(tx)}
                                className="text-emerald-400 hover:text-emerald-300 px-2 py-1 bg-emerald-500/10 rounded font-bold cursor-pointer"
                              >
                                حفظ
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-slate-400 hover:text-slate-300 px-2 py-1 bg-slate-500/10 rounded font-bold cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                          </td>
                        )}
                      </>
                    ) : (
                      // Standard View Row
                      <>
                        <td className="py-4 pr-2 font-medium text-slate-400">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{tx.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              <Clock className="w-3 h-3 text-slate-600 shrink-0" />
                              <span>{tx.time || "12:00 PM"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          {tx.type === "add_inventory" && (
                            <span className="inline-flex items-center gap-1 text-blue-400 font-bold bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                              <Package className="w-3 h-3" />
                              إضافة مخزون
                            </span>
                          )}
                          {tx.type === "sale" && (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                              <ShoppingCart className="w-3 h-3" />
                              بيع أجهزة
                            </span>
                          )}
                          {tx.type === "withdrawal" && (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                              <Wallet className="w-3 h-3" />
                              مسحوبات محمد
                            </span>
                          )}
                        </td>
                        <td className="py-4 font-semibold text-white">
                          {tx.type === "withdrawal" ? "مسحوبات نقدية للشريك محمد" : tx.model}
                        </td>
                        <td className="py-4 text-center text-slate-300 font-medium">
                          {tx.type === "withdrawal" || tx.model === "عمولة فاليو" ? "—" : tx.quantity}
                        </td>
                        <td className="py-4 text-left pl-6 font-bold">
                          {tx.type === "add_inventory" ? (
                            <span className="text-slate-500">—</span>
                          ) : (
                            <span className={tx.type === "sale" ? (tx.amount < 0 ? "text-red-400" : "text-emerald-400") : "text-amber-400"}>
                              {formatEGP(tx.amount)}
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-slate-500 max-w-xs truncate">{tx.notes || "—"}</td>
                        {isAdmin && (
                          <td className="py-4 text-left pl-2">
                            <div className="flex items-center gap-3 justify-end">
                              <button
                                onClick={() => startEdit(tx)}
                                className="text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                                title="تعديل"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {confirmDeleteId === tx.id ? (
                                <div className="flex items-center gap-1.5 animate-fadeIn">
                                  <button
                                    onClick={async () => {
                                      await onDeleteTransaction(tx.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="text-[10px] bg-red-600/20 hover:bg-red-600/35 text-red-400 border border-red-500/30 px-2 py-1 rounded font-bold transition-all cursor-pointer"
                                  >
                                    تأكيد
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded font-semibold transition-all cursor-pointer"
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(tx.id)}
                                  className="text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                                  title="حذف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
