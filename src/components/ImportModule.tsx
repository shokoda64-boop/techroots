import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { FileUp, Clipboard, Loader2, CheckCircle, AlertTriangle, Play, RefreshCw, FileText, Plus, Trash2 } from "lucide-react";
import { User } from "../types";

interface ImportModuleProps {
  user: User;
  onImportComplete: () => void;
}

export default function ImportModule({ user, onImportComplete }: ImportModuleProps) {
  const isAdmin = user.role === "admin";

  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Parsed Preview Data
  const [previewData, setPreviewData] = useState<{
    inventory?: any[];
    sales?: any[];
    withdrawals?: any[];
  } | null>(null);

  const updatePreviewItem = (section: "inventory" | "sales" | "withdrawals", index: number, field: string, value: any) => {
    if (!previewData) return;
    const updatedSection = [...(previewData[section] || [])];
    updatedSection[index] = { ...updatedSection[index], [field]: value };
    setPreviewData({
      ...previewData,
      [section]: updatedSection,
    });
  };

  const deletePreviewItem = (section: "inventory" | "sales" | "withdrawals", index: number) => {
    if (!previewData) return;
    const updatedSection = (previewData[section] || []).filter((_, i) => i !== index);
    setPreviewData({
      ...previewData,
      [section]: updatedSection,
    });
  };

  const addPreviewItem = (section: "inventory" | "sales" | "withdrawals") => {
    if (!previewData) return;
    const newItem = 
      section === "inventory"
        ? { model: "جهاز جديد", quantity: 1, date: new Date().toISOString().split("T")[0], notes: "" }
        : section === "sales"
        ? { model: "جهاز مباع", quantity: 1, sellingPrice: 0, date: new Date().toISOString().split("T")[0], notes: "" }
        : { amount: 0, date: new Date().toISOString().split("T")[0], notes: "" };

    setPreviewData({
      ...previewData,
      [section]: [...(previewData[section] || []), newItem],
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setPreviewData(null);
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setPreviewData(null);
      setError(null);
    }
  };

  const readAndUploadFile = () => {
    if (!selectedFile) return;

    setLoading(true);
    setLoadingMessage("جاري قراءة الملف وتشفيره للذكاء الاصطناعي...");
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = reader.result as string;
        const base64Data = result.split(",")[1]; // Get rid of metadata prefix

        setLoadingMessage("الذكاء الاصطناعي يقوم بتحليل وتصنيف البيانات واستخراج الجداول والتواريخ...");

        const response = await fetch("/api/data/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileData: base64Data,
            fileName: selectedFile.name,
            mimeType: selectedFile.type || "application/octet-stream",
          }),
        });

        const resData = await response.json();
        if (response.ok && resData.success) {
          setPreviewData(resData.data);
        } else {
          setError(resData.error || "فشل الذكاء الاصطناعي في تحليل الملف. يرجى مراجعة التنسيق.");
        }
      } catch (err: any) {
        console.error(err);
        setError("حدث خطأ ما أثناء تحليل الملف: " + (err.message || err));
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError("فشلت قراءة الملف المحلي.");
      setLoading(false);
    };

    reader.readAsDataURL(selectedFile);
  };

  const handleTextImport = async () => {
    if (!pastedText.trim()) {
      setError("الرجاء لصق نص التقرير أولاً.");
      return;
    }

    setLoading(true);
    setLoadingMessage("جاري إرسال النص لنموذج Gemini-3.5-Flash لتحليله وهيكلته...");
    setError(null);

    try {
      const response = await fetch("/api/data/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText }),
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        setPreviewData(resData.data);
      } else {
        setError(resData.error || "فشل تحليل النص. يرجى التأكد من احتواء النص على جداول أو تفاصيل واضحة.");
      }
    } catch (err: any) {
      console.error(err);
      setError("حدث خطأ أثناء معالجة النص: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;

    setLoading(true);
    setLoadingMessage("جاري إدخال وتوثيق المعاملات الجديدة في قاعدة بيانات Tech Roots...");

    try {
      const response = await fetch("/api/data/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previewData),
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        setSuccessMessage("تم بنجاح دمج وحفظ البيانات المستوردة وتحديث قاعدة البيانات الموحدة!");
        setPreviewData(null);
        setSelectedFile(null);
        setPastedText("");
        onImportComplete();
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError(resData.error || "فشل حفظ البيانات المعتمدة.");
      }
    } catch (err: any) {
      console.error(err);
      setError("حدث خطأ أثناء حفظ البيانات: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const formatEGP = (value: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    })
      .format(value)
      .replace("جم", "ج.م");
  };

  if (!isAdmin) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-xl font-bold text-white">غير مسموح لك بالوصول</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          المستورد الذكي للبيانات متاح فقط لمدير النظام (سيف). يمكنك كمراقب مراجعة وتصفح البيانات الحالية فقط.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">المستورد الذكي بالذكاء الاصطناعي (AI Data Importer)</h2>
        <p className="text-slate-400 text-sm mt-1">
          قم برفع ملفات Excel أو صور أو تقارير PDF مهيكلة، أو الصق نصوصاً غير منظمة مباشرة. سيتولى الذكاء الاصطناعي (Gemini) معالجتها، ترتيبها، وتوزيعها تلقائياً على الأقسام المناسبة مع عرض معاينة للتأكيد قبل المزامنة.
        </p>
      </div>

      {!previewData && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* File Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="bg-slate-900 border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 transition-all cursor-pointer relative group"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.csv,.xlsx,.xls,.txt,image/*"
              className="hidden"
            />
            <div className="w-16 h-16 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <FileUp className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-white">اسحب وأفلت ملف التقرير هنا</h3>
              <p className="text-slate-500 text-xs mt-1">يدعم ملفات PDF، Excel، CSV، الصور أو النصوص الطويلة</p>
            </div>
            {selectedFile ? (
              <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 font-bold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <button className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer">
                أو تصفح جهازك
              </button>
            )}

            {selectedFile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  readAndUploadFile();
                }}
                className="w-full max-w-xs bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>معالجة الملف المرفق</span>
              </button>
            )}
          </div>

          {/* Pasted Text Area */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col space-y-4">
            <div className="flex items-center gap-2 text-blue-400 border-b border-slate-800 pb-3">
              <Clipboard className="w-5 h-5" />
              <h3 className="font-bold text-white">أو الصق نص التقرير مباشرة</h3>
            </div>
            <textarea
              placeholder="الصق نصوص الجداول أو البيانات غير المنظمة هنا...
مثال:
الأجهزة الواردة:
MSI RTX 4070 عدد 4
Legion 7 RTX 5070 عدد 5

المبيعات:
Legion 5 Pro بقيمة 88,000 ج.م
Mohamed withdrew 30,000 EGP"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="w-full h-44 bg-slate-950/60 border border-slate-800 focus:border-blue-500 outline-none rounded-2xl p-4 text-white text-xs text-right leading-relaxed resize-none"
            />
            <button
              onClick={handleTextImport}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95 mt-auto cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>تحليل النص المنسوخ بالـ AI</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-6 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
          <div className="space-y-2">
            <h4 className="text-white font-bold">ذكاء Gemini الاصطناعي يعمل الآن...</h4>
            <p className="text-slate-400 text-xs max-w-md leading-relaxed">{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-5 bg-red-950/30 border border-red-500/30 rounded-2xl flex items-center gap-4 text-red-200 text-sm">
          <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
          <div className="space-y-1">
            <h4 className="font-bold">فشل استيراد البيانات</h4>
            <p className="text-xs text-red-300">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="mr-auto bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="p-5 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-center gap-4 text-emerald-200 text-sm animate-fadeIn">
          <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="space-y-1">
            <h4 className="font-bold">نجاح عملية الاستيراد</h4>
            <p className="text-xs text-emerald-300">{successMessage}</p>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="mr-auto bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Preview Screen */}
      {previewData && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header & Controls */}
          <div className="bg-blue-950/20 border border-blue-900/30 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-white text-md flex items-center gap-2 text-blue-400">
                <CheckCircle className="w-5 h-5" />
                معاينة مسودة البيانات المستخرجة بواسطة الذكاء الاصطناعي
              </h3>
              <p className="text-xs text-slate-400">
                يرجى مراجعة الجداول المستخرجة أدناه للتأكد من صحتها قبل تأكيد الدمج والحفظ النهائي.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => setPreviewData(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة رفع</span>
              </button>
              <button
                onClick={handleConfirmImport}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-6 py-2.5 rounded-xl text-xs shadow-lg hover:shadow-emerald-500/20 transition-all cursor-pointer"
              >
                تأكيد واستيراد الجداول للعمل
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Parsed Inventory Column */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-full min-h-[400px]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <h4 className="font-bold text-white text-sm text-blue-400">
                  الأجهزة المكتشفة للمخزون ({previewData.inventory?.length || 0})
                </h4>
                <button
                  onClick={() => addPreviewItem("inventory")}
                  className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 p-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer font-bold"
                  title="إضافة جهاز يدوياً"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </button>
              </div>

              {(!previewData.inventory || previewData.inventory.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-xs text-slate-500">لم يتم العثور على أجهزة جديدة لإضافتها للمخزون.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1 flex-1">
                  {previewData.inventory.map((item, i) => (
                    <div key={i} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/40 text-xs space-y-2 relative group">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={item.model || ""}
                          onChange={(e) => updatePreviewItem("inventory", i, "model", e.target.value)}
                          className="bg-slate-900 border border-slate-800 focus:border-blue-500 rounded px-2.5 py-1 text-white font-semibold w-full outline-none text-right"
                          placeholder="اسم الجهاز والموديل"
                        />
                        <button
                          onClick={() => deletePreviewItem("inventory", i)}
                          className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 cursor-pointer shrink-0"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5 text-right">الكمية</label>
                          <input
                            type="number"
                            value={item.quantity ?? 1}
                            onChange={(e) => updatePreviewItem("inventory", i, "quantity", parseInt(e.target.value, 10) || 0)}
                            className="bg-slate-900 border border-slate-800 focus:border-blue-500 rounded px-2 py-1 text-white font-bold w-full outline-none text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5 text-right">التاريخ</label>
                          <input
                            type="date"
                            value={item.date || ""}
                            onChange={(e) => updatePreviewItem("inventory", i, "date", e.target.value)}
                            className="bg-slate-900 border border-slate-800 focus:border-blue-500 rounded px-1 py-1 text-white text-[10px] w-full outline-none text-center"
                          />
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={item.notes || ""}
                          onChange={(e) => updatePreviewItem("inventory", i, "notes", e.target.value)}
                          className="bg-slate-900 border border-slate-800 focus:border-blue-500 rounded px-2.5 py-1 text-slate-400 text-[10px] w-full outline-none text-right"
                          placeholder="ملاحظات إضافية"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Parsed Sales Column */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-full min-h-[400px]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <h4 className="font-bold text-white text-sm text-emerald-400">
                  عمليات المبيعات المكتشفة ({previewData.sales?.length || 0})
                </h4>
                <button
                  onClick={() => addPreviewItem("sales")}
                  className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 p-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer font-bold"
                  title="إضافة عملية بيع يدوياً"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </button>
              </div>

              {(!previewData.sales || previewData.sales.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-xs text-slate-500">لم يتم العثور على عمليات بيع أو عمولات مخصومة.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1 flex-1">
                  {previewData.sales.map((item, i) => (
                    <div key={i} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/40 text-xs space-y-2 relative group">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={item.model || ""}
                          onChange={(e) => updatePreviewItem("sales", i, "model", e.target.value)}
                          className="bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded px-2.5 py-1 text-white font-semibold w-full outline-none text-right"
                          placeholder="اسم الجهاز المباع أو الملاحظة"
                        />
                        <button
                          onClick={() => deletePreviewItem("sales", i)}
                          className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 cursor-pointer shrink-0"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5 text-right">الكمية</label>
                          <input
                            type="number"
                            value={item.quantity ?? 1}
                            onChange={(e) => updatePreviewItem("sales", i, "quantity", parseInt(e.target.value, 10) || 0)}
                            className="bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded px-2 py-1 text-white font-bold w-full outline-none text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5 text-right">التاريخ</label>
                          <input
                            type="date"
                            value={item.date || ""}
                            onChange={(e) => updatePreviewItem("sales", i, "date", e.target.value)}
                            className="bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded px-1 py-1 text-white text-[10px] w-full outline-none text-center"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-500 block mb-0.5 text-right">سعر البيع الإجمالي (سالب للعمولة مثل -2000)</label>
                        <input
                          type="number"
                          value={item.sellingPrice ?? 0}
                          onChange={(e) => updatePreviewItem("sales", i, "sellingPrice", parseFloat(e.target.value) || 0)}
                          className="bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded px-2.5 py-1 text-emerald-400 font-bold w-full outline-none text-center"
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          value={item.notes || ""}
                          onChange={(e) => updatePreviewItem("sales", i, "notes", e.target.value)}
                          className="bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded px-2.5 py-1 text-slate-400 text-[10px] w-full outline-none text-right"
                          placeholder="مثال: بيع كاش، عمولة فاليو..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Parsed Withdrawals Column */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-full min-h-[400px]">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <h4 className="font-bold text-white text-sm text-amber-400">
                  مسحوبات محمد المكتشفة ({previewData.withdrawals?.length || 0})
                </h4>
                <button
                  onClick={() => addPreviewItem("withdrawals")}
                  className="bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 p-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer font-bold"
                  title="إضافة مسحوبات يدوياً"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </button>
              </div>

              {(!previewData.withdrawals || previewData.withdrawals.length === 0) ? (
                <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-xs text-slate-500">لم يتم العثور على سحوبات نقدية أو مصروفات شخصية.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1 flex-1">
                  {previewData.withdrawals.map((item, i) => (
                    <div key={i} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/40 text-xs space-y-2 relative group">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-300">سحب نقدي لمحمد</span>
                        <button
                          onClick={() => deletePreviewItem("withdrawals", i)}
                          className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 cursor-pointer shrink-0"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5 text-right">المبلغ</label>
                          <input
                            type="number"
                            value={item.amount ?? 0}
                            onChange={(e) => updatePreviewItem("withdrawals", i, "amount", parseFloat(e.target.value) || 0)}
                            className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-2.5 py-1 text-amber-400 font-bold w-full outline-none text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5 text-right">التاريخ</label>
                          <input
                            type="date"
                            value={item.date || ""}
                            onChange={(e) => updatePreviewItem("withdrawals", i, "date", e.target.value)}
                            className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-1 py-1 text-white text-[10px] w-full outline-none text-center"
                          />
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={item.notes || ""}
                          onChange={(e) => updatePreviewItem("withdrawals", i, "notes", e.target.value)}
                          className="bg-slate-900 border border-slate-800 focus:border-amber-500 rounded px-2.5 py-1 text-slate-400 text-[10px] w-full outline-none text-right"
                          placeholder="ملاحظات المسحوبات"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
