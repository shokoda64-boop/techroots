import React, { useState } from "react";
import { motion } from "motion/react";
import { Package, Plus, Search, Calendar, Clock, Trash2, Edit2, AlertCircle, CheckSquare, Square } from "lucide-react";
import { Transaction, User } from "../types";

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

interface InventoryModuleProps {
  transactions: Transaction[];
  user: User;
  onAddTransaction: (data: any) => Promise<boolean>;
  onEditTransaction: (id: string, data: any) => Promise<boolean>;
  onDeleteTransaction: (id: string) => Promise<boolean>;
  onBulkDelete: (ids: string[]) => Promise<boolean>;
  onClearSection: (type: "add_inventory" | "sale" | "withdrawal" | "all") => Promise<boolean>;
}

export default function InventoryModule({
  transactions,
  user,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onBulkDelete,
  onClearSection,
}: InventoryModuleProps) {
  const isAdmin = user.role === "admin";

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [model, setModel] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(getCurrentTimeStr());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editModel, setEditModel] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Custom Confirmation States
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filter out add_inventory events
  const inventoryEvents = transactions.filter((tx) => tx.type === "add_inventory");

  // Group by model to show stock level summary
  const stockSummaryMap = new Map<string, { added: number; sold: number }>();

  transactions.forEach((tx) => {
    if (tx.model) {
      const modelName = tx.model.trim();
      if (!stockSummaryMap.has(modelName)) {
        stockSummaryMap.set(modelName, { added: 0, sold: 0 });
      }
      const data = stockSummaryMap.get(modelName)!;
      if (tx.type === "add_inventory") {
        data.added += tx.quantity || 0;
      } else if (tx.type === "sale" && tx.model !== "عمولة فاليو") {
        data.sold += tx.quantity || 0;
      }
    }
  });

  const stockSummary = Array.from(stockSummaryMap.entries()).map(([name, data]) => ({
    modelName: name,
    totalAdded: data.added,
    totalSold: data.sold,
    remaining: data.added - data.sold,
  }));

  // Filtered summaries for search
  const filteredSummary = stockSummary.filter((item) =>
    item.modelName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEvents = inventoryEvents.filter((event) =>
    event.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!model.trim() || !quantity || parseInt(quantity, 10) <= 0) {
      setError("الرجاء إدخال اسم الموديل وكمية صالحة.");
      return;
    }

    setSubmitting(true);
    const success = await onAddTransaction({
      type: "add_inventory",
      date,
      time,
      model: model.trim(),
      quantity: parseInt(quantity, 10),
      amount: 0,
      notes,
    });

    if (success) {
      setModel("");
      setQuantity("1");
      setNotes("");
      setDate(new Date().toISOString().split("T")[0]);
      setTime(getCurrentTimeStr());
      setShowAddForm(false);
    } else {
      setError("حدث خطأ أثناء حفظ المعاملة.");
    }
    setSubmitting(false);
  };

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditModel(tx.model || "");
    setEditQuantity(String(tx.quantity || 0));
    setEditDate(tx.date);
    setEditTime(tx.time || getCurrentTimeStr());
    setEditNotes(tx.notes || "");
  };

  const handleEditSubmit = async (id: string) => {
    if (!editModel.trim() || !editQuantity || parseInt(editQuantity, 10) <= 0) {
      setError("الرجاء إدخال اسم الموديل وكمية صالحة لتعديل الجهاز.");
      return;
    }

    setError(null);
    const success = await onEditTransaction(id, {
      model: editModel,
      quantity: parseInt(editQuantity, 10),
      date: editDate,
      time: editTime,
      notes: editNotes,
    });

    if (success) {
      setEditingId(null);
    } else {
      setError("فشل تحديث المعاملة في الخادم.");
    }
  };

  // Selection Checkboxes Handlers
  const handleSelectAllChange = () => {
    if (selectedIds.length === filteredEvents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEvents.map((tx) => tx.id));
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
    } else {
      setError("فشل حذف بعض المعاملات المحددة.");
    }
  };

  const executeClearSection = async () => {
    const success = await onClearSection("add_inventory");
    if (success) {
      setSelectedIds([]);
      setShowClearConfirm(false);
    } else {
      setError("فشل مسح قسم المخزون بالكامل.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">إدارة المخزون (Inventory)</h2>
          <p className="text-slate-400 text-sm mt-1">تتبع الأجهزة الواردة وحساب الكميات الحالية المتاحة للبيع.</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2.5">
            {showClearConfirm ? (
              <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-2 flex items-center gap-2.5 animate-fadeIn">
                <span className="text-xs text-red-400 font-bold">تأكيد مسح قسم المخزون بالكامل؟</span>
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
                <span>مسح قسم المخزون</span>
              </button>
            )}
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 transition-all text-sm cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة أجهزة جديدة</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Device Form Card */}
      {isAdmin && showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden shadow-xl"
        >
          <div className="flex items-center gap-2.5 text-blue-400 mb-6 border-b border-slate-800 pb-3">
            <Package className="w-5 h-5" />
            <h3 className="font-bold text-white">بيانات الأجهزة الجديدة المضافة</h3>
          </div>

          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold text-slate-400">اسم موديل اللابتوب</label>
              <input
                type="text"
                placeholder="مثال: Lenovo Legion 7 Pro"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">الكمية الواردة</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">تاريخ الإضافة</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!isAdmin}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white text-sm text-left disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">وقت الإضافة</label>
              <input
                type="text"
                placeholder="مثال: 02:35 PM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={!isAdmin}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white text-sm text-left disabled:opacity-50"
              />
            </div>
            <div className="md:col-span-4 space-y-2">
              <label className="text-xs font-bold text-slate-400">ملاحظات إضافية (اختياري)</label>
              <input
                type="text"
                placeholder="تفاصيل الشحنة أو المورد أو المواصفات"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 outline-none rounded-xl px-4 py-3 text-white text-sm"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-5 rounded-xl text-sm transition-all shadow-md active:scale-95 cursor-pointer"
              >
                حفظ بالمخزن
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-950/30 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Stock Levels Summary Table (Apple Card Style) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-blue-400">
            <Package className="w-5 h-5" />
            <h3 className="font-bold text-white text-md">مستويات وحالة المخزون الحالي (Stock Status)</h3>
          </div>
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="البحث باسم الجهاز..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500 outline-none rounded-xl pr-9 pl-4 py-2 text-white text-xs text-right"
            />
          </div>
        </div>

        {filteredSummary.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">لا توجد أجهزة مطابقة للبحث أو المخزون فارغ.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold">
                  <th className="pb-3 pr-2">موديل الجهاز</th>
                  <th className="pb-3 text-center">إجمالي الوارد</th>
                  <th className="pb-3 text-center">إجمالي المباع</th>
                  <th className="pb-3 text-left pl-2">المتبقي بالمخزن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredSummary.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-4 pr-2 font-semibold text-white">{item.modelName}</td>
                    <td className="py-4 text-center text-slate-300 font-medium">{item.totalAdded}</td>
                    <td className="py-4 text-center text-slate-400">{item.totalSold}</td>
                    <td className="py-4 text-left pl-2 font-bold">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs ${
                          item.remaining <= 1
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : item.remaining <= 3
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {item.remaining} أجهزة متبقية
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Actions Panel */}
      {isAdmin && selectedIds.length > 0 && (
        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          {showBulkDeleteConfirm ? (
            <>
              <div className="flex items-center gap-2 text-red-400 animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <span className="text-sm font-bold">هل أنت متأكد من حذف {selectedIds.length} معاملة مخزون نهائياً؟</span>
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
                <span className="text-sm font-semibold">تم تحديد {selectedIds.length} معاملة من معاملات الإضافة</span>
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

      {/* History of Additions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-md">سجل الأجهزة المضافة (Addition History)</h3>
          {filteredEvents.length > 0 && isAdmin && (
            <button
              onClick={handleSelectAllChange}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
            >
              {selectedIds.length === filteredEvents.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
            </button>
          )}
        </div>

        {error && (
          <div className="p-3.5 bg-red-950/30 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
            <button 
              onClick={() => setError(null)} 
              className="text-red-400 hover:text-red-300 font-bold underline cursor-pointer"
            >
              إخلاق
            </button>
          </div>
        )}

        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">لا توجد سجلات مضافة للمخزون بعد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold">
                  {isAdmin && (
                    <th className="pb-3 w-8 pr-1">
                      <input
                        type="checkbox"
                        checked={filteredEvents.length > 0 && selectedIds.length === filteredEvents.length}
                        onChange={handleSelectAllChange}
                        className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th className="pb-3">التاريخ والوقت</th>
                  <th className="pb-3">الجهاز</th>
                  <th className="pb-3 text-center">الكمية</th>
                  <th className="pb-3">ملاحظات</th>
                  {isAdmin && <th className="pb-3 text-left pl-2">الإجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredEvents.map((tx) => (
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
                      // Inline edit form
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
                              placeholder="الوقت"
                              className="bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-white text-xs w-28 text-left disabled:opacity-50"
                            />
                          </div>
                        </td>
                        <td className="py-3">
                          <input
                            type="text"
                            value={editModel}
                            onChange={(e) => setEditModel(e.target.value)}
                            className="bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-white text-xs w-full text-right font-semibold"
                          />
                        </td>
                        <td className="py-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            className="bg-slate-950/60 border border-slate-800 rounded px-2 py-1 text-white text-xs w-16 text-center"
                          />
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
                            <div className="flex gap-1.5 justify-end">
                              <button
                                onClick={() => handleEditSubmit(tx.id)}
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
                      // View row
                      <>
                        <td className="py-4 font-medium text-slate-400">
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
                        <td className="py-4 font-semibold text-white">{tx.model}</td>
                        <td className="py-4 text-center text-slate-300 font-bold">{tx.quantity}</td>
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
