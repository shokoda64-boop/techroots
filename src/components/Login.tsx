import React, { useState } from "react";
import { motion } from "motion/react";
import { Lock, User as UserIcon, AlertCircle, Loader2 } from "lucide-react";
import { User, AppSettings } from "../types";
import { LogoRenderer } from "./SettingsModule";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  appSettings: AppSettings;
}

export default function Login({ onLoginSuccess, appSettings }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("الرجاء إدخال اسم المستخدم وكلمة المرور.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || "خطأ في تسجيل الدخول. يرجى التحقق من البيانات.");
      }
    } catch (err) {
      console.error(err);
      setError("تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.05),transparent_50%)] pointer-events-none" />
      
      <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.6, ease: "easeOut" }}
         className="w-full max-w-md bg-slate-900/85 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500" />
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-4 text-blue-400 shrink-0">
            <LogoRenderer logoName={appSettings.logo} className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-wide text-center">{appSettings.appName}</h1>
          <p className="text-xs text-slate-400 mt-2 font-medium text-center">لوحة التحكم والمراقبة الداخلية للأجهزة والمبيعات</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-200 text-sm"
            >
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 tracking-wider">اسم المستخدم</label>
            <div className="relative">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                <UserIcon className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: Saif أو Mohamed"
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 outline-none rounded-xl py-4 pr-12 pl-4 text-white placeholder-slate-600 transition-all font-medium text-right text-sm"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 tracking-wider">كلمة المرور</label>
            <div className="relative">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 outline-none rounded-xl py-4 pr-12 pl-4 text-white placeholder-slate-600 transition-all font-medium text-left text-sm"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري التحقق...</span>
              </>
            ) : (
              <span>تسجيل الدخول</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-col items-center space-y-2">
          <p className="text-xs text-slate-500 font-medium">سيف: مدير النظام (حساب: Saif / Saif)</p>
          <p className="text-xs text-slate-500 font-medium">محمد: الشريك والمراقب (حساب: Mohamed / 1234)</p>
        </div>
      </motion.div>
    </div>
  );
}
