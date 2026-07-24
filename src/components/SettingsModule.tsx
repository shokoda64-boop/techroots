import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Laptop,
  Sparkles,
  Shield,
  Coins,
  Cpu,
  Database,
  TrendingUp,
  Monitor,
  Smartphone,
  Store,
  AppWindow,
  Briefcase,
  User as UserIcon,
  Plus,
  Trash2,
  Save,
  Lock,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { User, AppSettings } from "../types";

// Predefined list of beautiful icons available for the logo
export const LOGO_ICONS: Record<string, React.ComponentType<any>> = {
  Laptop,
  Sparkles,
  Shield,
  Coins,
  Cpu,
  Database,
  TrendingUp,
  Monitor,
  Smartphone,
  Store,
  AppWindow,
  Briefcase
};

// Helper component to render the configured logo (built-in or image URL)
export function LogoRenderer({ logoName, className = "w-5 h-5" }: { logoName: string; className?: string }) {
  if (!logoName) {
    return <Laptop className={className} />;
  }
  if (logoName.startsWith("http://") || logoName.startsWith("https://") || logoName.startsWith("data:image")) {
    return <img src={logoName} alt="Logo" className={`${className} object-contain`} referrerPolicy="no-referrer" />;
  }
  const IconComponent = LOGO_ICONS[logoName] || Laptop;
  return <IconComponent className={className} />;
}

interface SettingsModuleProps {
  user: User;
  currentSettings: AppSettings;
  onSettingsUpdated: (newSettings: AppSettings) => void;
}

interface DBUser {
  id: string;
  username: string;
  password?: string;
  role: "admin" | "viewer";
  displayName: string;
}

export default function SettingsModule({ user, currentSettings, onSettingsUpdated }: SettingsModuleProps) {
  // Application Settings State
  const [appName, setAppName] = useState(currentSettings.appName || "");
  const [logoOption, setLogoOption] = useState<"preset" | "url">(
    currentSettings.logo && (currentSettings.logo.startsWith("http") || currentSettings.logo.startsWith("data:"))
      ? "url"
      : "preset"
  );
  const [logoPreset, setLogoPreset] = useState(
    currentSettings.logo && !currentSettings.logo.startsWith("http") && !currentSettings.logo.startsWith("data:")
      ? currentSettings.logo
      : "Laptop"
  );
  const [logoUrl, setLogoUrl] = useState(
    currentSettings.logo && (currentSettings.logo.startsWith("http") || currentSettings.logo.startsWith("data:"))
      ? currentSettings.logo
      : ""
  );

  // User Management State
  const [users, setUsers] = useState<DBUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  // Add User Form State
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "viewer">("viewer");

  // Notifications
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [submittingSettings, setSubmittingSettings] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);

  // Sync state with incoming props
  useEffect(() => {
    if (currentSettings) {
      setAppName(currentSettings.appName);
      const isUrl = currentSettings.logo?.startsWith("http") || currentSettings.logo?.startsWith("data:");
      setLogoOption(isUrl ? "url" : "preset");
      if (isUrl) {
        setLogoUrl(currentSettings.logo);
      } else {
        setLogoPreset(currentSettings.logo || "Laptop");
      }
    }
  }, [currentSettings]);

  // Fetch users if administrator
  const fetchUsers = async () => {
    if (user.role !== "admin") return;
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  // Handle Application Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) {
      setSettingsError("اسم التطبيق مطلوب.");
      return;
    }

    setSubmittingSettings(true);
    setSettingsSuccess(null);
    setSettingsError(null);

    const finalLogo = logoOption === "preset" ? logoPreset : logoUrl.trim();

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appName: appName.trim(), logo: finalLogo }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSettingsSuccess("تم حفظ إعدادات التطبيق والمظهر بنجاح!");
        onSettingsUpdated(data.settings);
        setTimeout(() => setSettingsSuccess(null), 4000);
      } else {
        setSettingsError(data.error || "فشل حفظ الإعدادات.");
      }
    } catch (err) {
      console.error(err);
      setSettingsError("تعذر حفظ الإعدادات بسبب خطأ في الاتصال بالخادم.");
    } finally {
      setSubmittingSettings(false);
    }
  };

  // Handle Add New User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newDisplayName.trim()) {
      setUserError("يرجى تعبئة جميع حقول إضافة المستخدم الجديد.");
      return;
    }

    setSubmittingUser(true);
    setUserSuccess(null);
    setUserError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          displayName: newDisplayName.trim(),
          role: newRole,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUserSuccess(`تمت إضافة المستخدم "${newDisplayName}" بنجاح!`);
        setNewUsername("");
        setNewPassword("");
        setNewDisplayName("");
        setNewRole("viewer");
        fetchUsers();
        setTimeout(() => setUserSuccess(null), 4000);
      } else {
        setUserError(data.error || "فشل إضافة المستخدم الجديد.");
      }
    } catch (err) {
      console.error(err);
      setUserError("حدث خطأ أثناء الاتصال بالخادم لإضافة المستخدم.");
    } finally {
      setSubmittingUser(false);
    }
  };

  // Handle Update User
  const handleUpdateUser = async (userId: string, updatedFields: Partial<DBUser>) => {
    setUserSuccess(null);
    setUserError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUserSuccess("تم تحديث بيانات المستخدم بنجاح.");
        fetchUsers();
        setTimeout(() => setUserSuccess(null), 3000);
      } else {
        setUserError(data.error || "فشل تحديث بيانات المستخدم.");
      }
    } catch (err) {
      console.error(err);
      setUserError("خطأ في الاتصال بالخادم لتحديث بيانات المستخدم.");
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (userId: string) => {
    setUserSuccess(null);
    setUserError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setUserSuccess("تم حذف المستخدم بنجاح.");
        fetchUsers();
        setTimeout(() => setUserSuccess(null), 3000);
      } else {
        setUserError(data.error || "فشل حذف المستخدم.");
      }
    } catch (err) {
      console.error(err);
      setUserError("حدث خطأ أثناء محاولة حذف المستخدم من الخادم.");
    }
    setUserToDelete(null);
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  return (
    <div className="space-y-8">
      {/* Module Title */}
      <div>
        <h2 className="text-2xl font-bold text-white">إعدادات النظام والمظهر (System Settings)</h2>
        <p className="text-slate-400 text-sm mt-1">
          إدارة وتخصيص هوية التطبيق (الشعار والاسم)، والتحكم في حسابات المستخدمين وصلاحيات الوصول المعتمدة.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Application Brand Settings (Left / Column-5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-md font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              هوية وهوية الشركة التجارية
            </h3>

            {settingsSuccess && (
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-200 text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{settingsSuccess}</span>
              </div>
            )}

            {settingsError && (
              <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{settingsError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* App Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">اسم التطبيق / الشركة</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="مثال: تيك روتس • Tech Roots"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none rounded-xl px-4 py-3 text-white text-xs text-right"
                />
              </div>

              {/* Logo Choice Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400">نوع الشعار (Logo)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLogoOption("preset")}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      logoOption === "preset"
                        ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                        : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:bg-slate-800/40"
                    }`}
                  >
                    أيقونة نظام جاهزة
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoOption("url")}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      logoOption === "url"
                        ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                        : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:bg-slate-800/40"
                    }`}
                  >
                    رابط صورة شعار مخصص
                  </button>
                </div>
              </div>

              {/* Logo presets block */}
              {logoOption === "preset" ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500">اختر من الأيقونات الأنيقة المتاحة</label>
                  <div className="grid grid-cols-4 gap-2 bg-slate-950/80 p-3 border border-slate-800/60 rounded-xl">
                    {Object.keys(LOGO_ICONS).map((presetName) => {
                      const Icon = LOGO_ICONS[presetName];
                      const isSelected = logoPreset === presetName;
                      return (
                        <button
                          key={presetName}
                          type="button"
                          onClick={() => setLogoPreset(presetName)}
                          className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-600/15 border-blue-500/40 text-blue-400"
                              : "border-slate-850 hover:bg-slate-900 text-slate-500 hover:text-slate-300"
                          }`}
                          title={presetName}
                        >
                          <Icon className="w-5 h-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Custom image URL input */
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">رابط صورة الشعار (URL)</label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 outline-none rounded-xl px-4 py-3 text-white text-xs text-left font-mono"
                  />
                  <p className="text-[10px] text-slate-500">
                    يمكنك إدخال رابط مباشر لشعار شركتك (صيغة PNG أو JPG أو SVG أو كود Base64) لعرضه فوراً.
                  </p>
                </div>
              )}

              {/* Live Preview Display Card */}
              <div className="p-4 bg-slate-950/50 border border-slate-800/50 rounded-xl space-y-2">
                <div className="text-[10px] font-bold text-slate-500">معاينة حية للهوية الجديدة في القائمة الجانبية:</div>
                <div className="flex items-center gap-3 p-2 border border-slate-800/20 bg-slate-900/60 rounded-xl">
                  <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
                    <LogoRenderer logoName={logoOption === "preset" ? logoPreset : logoUrl} className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-extrabold text-white truncate">{appName || "تيك روتس • Tech Roots"}</h4>
                    <p className="text-[9px] text-slate-500 mt-0.5">لوحة المراقبة والحسابات</p>
                  </div>
                </div>
              </div>

              {/* Submit Save Button */}
              <button
                type="submit"
                disabled={submittingSettings}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
              >
                {submittingSettings ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>حفظ هوية التطبيق والشعار</span>
              </button>
            </form>
          </div>
        </div>

        {/* User Accounts Management (Right / Column-7) */}
        <div className="lg:col-span-7 space-y-6">
          {user.role !== "admin" ? (
            /* Viewer Lock State Message */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
              <Lock className="w-12 h-12 text-amber-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">إدارة الحسابات مقفلة للمشرفين فقط</h3>
              <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                لا تمتلك صلاحية إدارة وتغيير حسابات المستخدمين لكونك مسجل دخول بصلاحية <b>مراقب (mohamed)</b>. 
                يرجى تسجيل الدخول بحساب المدير المالي (سيف) للتحكم بالمستخدمين وكلمات المرور.
              </p>
            </div>
          ) : (
            /* Admin Active Panel */
            <div className="space-y-6">
              {/* Users List Block */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                <h3 className="text-md font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-blue-400" />
                  حسابات المستخدمين المسجلة وصلاحياتهم
                </h3>

                {userSuccess && (
                  <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-200 text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{userSuccess}</span>
                  </div>
                )}

                {userError && (
                  <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-200 text-xs">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>{userError}</span>
                  </div>
                )}

                {loadingUsers ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                    <span className="text-xs text-slate-500">جاري تحميل قائمة المستخدمين...</span>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                    {users.map((dbUser) => (
                      <div
                        key={dbUser.id}
                        className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-4"
                      >
                        {/* User Header Details */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400 font-bold text-xs border border-blue-500/20">
                              {dbUser.role === "admin" ? "مدير" : "شريك"}
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-white block">
                                {dbUser.displayName} 
                                {dbUser.id === user.id && <span className="text-[10px] text-blue-400 font-medium mr-1">(أنت حالياً)</span>}
                              </span>
                              <span className="text-[9px] text-slate-500">
                                الصلاحية: {dbUser.role === "admin" ? "مدير نظام مالي كامل الصلاحيات" : "شريك مطلع ومراقب فقط"}
                              </span>
                            </div>
                          </div>
                          
                          {/* Action Delete */}
                          <button
                            type="button"
                            onClick={() => setUserToDelete({ id: dbUser.id, name: dbUser.displayName })}
                            className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/5 cursor-pointer transition-all"
                            title="حذف هذا الحساب"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Edit Inline Row Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-900">
                          {/* Display Name Edit */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">الاسم الظاهر</label>
                            <input
                              type="text"
                              value={dbUser.displayName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setUsers(prev => prev.map(u => u.id === dbUser.id ? { ...u, displayName: val } : u));
                              }}
                              onBlur={() => handleUpdateUser(dbUser.id, { displayName: dbUser.displayName })}
                              className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/40 outline-none rounded-lg px-2.5 py-1.5 text-white text-[11px] text-right font-medium"
                            />
                          </div>

                          {/* Username Edit */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">اسم المستخدم (Login)</label>
                            <input
                              type="text"
                              value={dbUser.username}
                              onChange={(e) => {
                                const val = e.target.value;
                                setUsers(prev => prev.map(u => u.id === dbUser.id ? { ...u, username: val } : u));
                              }}
                              onBlur={() => handleUpdateUser(dbUser.id, { username: dbUser.username })}
                              className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/40 outline-none rounded-lg px-2.5 py-1.5 text-white text-[11px] text-left font-mono"
                            />
                          </div>

                          {/* Password Edit with Toggle Visibility */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500">كلمة المرور الجديدة</label>
                            <div className="relative">
                              <input
                                type={showPasswords[dbUser.id] ? "text" : "password"}
                                value={dbUser.password || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setUsers(prev => prev.map(u => u.id === dbUser.id ? { ...u, password: val } : u));
                                }}
                                onBlur={() => handleUpdateUser(dbUser.id, { password: dbUser.password })}
                                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/40 outline-none rounded-lg pr-2.5 pl-8 py-1.5 text-white text-[11px] text-left font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(dbUser.id)}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                              >
                                {showPasswords[dbUser.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add User Section Form */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                <h3 className="text-md font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-400" />
                  تسجيل وإضافة حساب مستخدم جديد
                </h3>

                <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Display Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">الاسم التعريفي (أو اسم الشريك)</label>
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder="مثال: خالد (شريك ثالث)"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 outline-none rounded-xl px-4 py-2.5 text-white text-xs text-right"
                    />
                  </div>

                  {/* Role selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">صلاحية الحساب في النظام</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as "admin" | "viewer")}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 outline-none rounded-xl px-4 py-2.5 text-white text-xs text-right"
                    >
                      <option value="viewer">شريك مراقب ومطلع فقط (Viewer)</option>
                      <option value="admin">مدير مالي كامل الصلاحيات (Administrator)</option>
                    </select>
                  </div>

                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">اسم المستخدم لتسجيل الدخول</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="مثال: khaled"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 outline-none rounded-xl px-4 py-2.5 text-white text-xs text-left font-mono"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">كلمة المرور للحساب</label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500/50 outline-none rounded-xl px-4 py-2.5 text-white text-xs text-left font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2">
                    <button
                      type="submit"
                      disabled={submittingUser}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة وتفعيل حساب المستخدم الجديد</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Deletion Custom Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3 text-red-400 border-b border-slate-800 pb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-md font-bold text-white">تأكيد حذف الحساب</h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed text-right">
              هل أنت متأكد من رغبتك في حذف حساب المستخدم <span className="font-bold text-white">"{userToDelete.name}"</span>؟ هذا الإجراء غير قابل للتراجع وسيمنع المستخدم من الدخول للنظام بالكامل.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeleteUser(userToDelete.id)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-red-900/20 transition-all active:scale-95 cursor-pointer"
              >
                تأكيد حذف المستخدم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
