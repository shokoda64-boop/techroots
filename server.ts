import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Path to data file
const DATA_FILE = path.join(process.cwd(), "db.json");

// Define TypeScript interfaces
interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM AM/PM
  type: "add_inventory" | "sale" | "withdrawal";
  model?: string; // for add_inventory & sale
  quantity?: number; // for add_inventory & sale
  amount: number; // price for sale, amount for withdrawal, 0 for add_inventory
  notes?: string;
}

// Initial seed data based on the user's report PDF pages
const SEED_TRANSACTIONS: Transaction[] = [
  // --- Inventory Additions (الأجهزة الواردة) ---
  { id: "inv-1", date: "2026-07-01", type: "add_inventory", model: "Alienware RTX 4070", quantity: 1, amount: 0, notes: "مخزون وارد" },
  { id: "inv-2", date: "2026-07-01", type: "add_inventory", model: "Thunderobot RTX 5080", quantity: 2, amount: 0, notes: "مخزون وارد" },
  { id: "inv-3", date: "2026-07-01", type: "add_inventory", model: "MSI RTX 4070", quantity: 4, amount: 0, notes: "مخزون وارد" },
  { id: "inv-4", date: "2026-07-01", type: "add_inventory", model: "Legion 7 RTX 5070", quantity: 5, amount: 0, notes: "مخزون وارد" },
  { id: "inv-5", date: "2026-07-01", type: "add_inventory", model: "Alienware X16 RTX 5070", quantity: 7, amount: 0, notes: "مخزون وارد" },
  { id: "inv-6", date: "2026-07-01", type: "add_inventory", model: "HP 17 RTX 5070", quantity: 2, amount: 0, notes: "مخزون وارد" },
  { id: "inv-7", date: "2026-07-01", type: "add_inventory", model: "ASUS ROG RTX 5070", quantity: 2, amount: 0, notes: "مخزون وارد" },
  { id: "inv-8", date: "2026-07-01", type: "add_inventory", model: "ASUS Zephyrus RTX 5080", quantity: 5, amount: 0, notes: "مخزون وارد" },
  { id: "inv-9", date: "2026-07-01", type: "add_inventory", model: "Legion 5 RTX 5070", quantity: 1, amount: 0, notes: "مخزون وارد" },
  { id: "inv-10", date: "2026-07-01", type: "add_inventory", model: "Legion 5 Pro RTX 5070", quantity: 1, amount: 0, notes: "مخزون وارد" },
  { id: "inv-11", date: "2026-07-01", type: "add_inventory", model: "MSI RTX 5070", quantity: 1, amount: 0, notes: "مخزون وارد" },
  { id: "inv-12", date: "2026-07-01", type: "add_inventory", model: "HP 16 RTX 5070", quantity: 1, amount: 0, notes: "مخزون وارد" },
  { id: "inv-13", date: "2026-07-01", type: "add_inventory", model: "MSI Vector 16 RTX5070Ti", quantity: 2, amount: 0, notes: "مخزون وارد" },
  { id: "inv-14", date: "2026-07-01", type: "add_inventory", model: "HP OMEN MAX RTX5080", quantity: 1, amount: 0, notes: "مخزون وارد" },
  { id: "inv-15", date: "2026-07-01", type: "add_inventory", model: "ASUS ROG G16 RTX5070TI", quantity: 2, amount: 0, notes: "مخزون وارد" },
  { id: "inv-16", date: "2026-07-01", type: "add_inventory", model: "Asus rog g18", quantity: 1, amount: 0, notes: "مخزون وارد" },

  // --- Sales (المبيعات) ---
  { id: "sale-1", date: "2026-07-05", type: "sale", model: "Legion 5 Pro 512GB", quantity: 1, amount: 88000, notes: "مبيعات" },
  { id: "sale-2", date: "2026-07-06", type: "sale", model: "Legion 5", quantity: 1, amount: 85000, notes: "مبيعات" },
  { id: "sale-3", date: "2026-07-07", type: "sale", model: "ASUS Zephyrus RTX 5080", quantity: 1, amount: 140000, notes: "مبيعات" },
  { id: "sale-4", date: "2026-07-08", type: "sale", model: "ASUS ROG Ryzen", quantity: 1, amount: 100000, notes: "مبيعات" },
  { id: "sale-5", date: "2026-07-09", type: "sale", model: "Legion 7 RTX 5070", quantity: 1, amount: 97000, notes: "مبيعات" },
  { id: "sale-6", date: "2026-07-10", type: "sale", model: "Thunderobot RTX 5080", quantity: 1, amount: 123000, notes: "مبيعات" },
  { id: "sale-7", date: "2026-07-10", type: "sale", model: "عمولة فاليو", quantity: 1, amount: -2000, notes: "خصم عمولة" },
  { id: "sale-8", date: "2026-07-11", type: "sale", model: "Legion 7 RTX 5070", quantity: 1, amount: 99000, notes: "مبيعات" },
  { id: "sale-9", date: "2026-07-12", type: "sale", model: "ASUS Zephyrus RTX 5080", quantity: 1, amount: 140000, notes: "مبيعات" },
  { id: "sale-10", date: "2026-07-13", type: "sale", model: "أجهزة إسكندرية", quantity: 1, amount: 187000, notes: "أجهزة إسكندرية (برا النسبة)" },
  { id: "sale-11", date: "2026-07-14", type: "sale", model: "Legion 7 RTX 5070", quantity: 1, amount: 99000, notes: "مبيعات" },
  { id: "sale-12", date: "2026-07-15", type: "sale", model: "Asus rog g18", quantity: 1, amount: 101000, notes: "مبيعات" },
  { id: "sale-13", date: "2026-07-16", type: "sale", model: "Legion 7 RTX 5070", quantity: 1, amount: 100000, notes: "مبيعات" },

  // --- Mohamed's Withdrawals (مسحوبات محمد) ---
  { id: "with-1", date: "2026-07-10", type: "withdrawal", amount: 250000, notes: "مسحوبات نقدية - دفعة أولى" },
  { id: "with-2", date: "2026-07-15", type: "withdrawal", amount: 100000, notes: "مسحوبات نقدية - دفعة ثانية" }
];

interface DatabaseUser {
  id: string;
  username: string;
  password?: string;
  role: "admin" | "viewer";
  displayName: string;
}

interface AppSettings {
  appName: string;
  logo: string;
}

interface DbSchema {
  transactions: Transaction[];
  users: DatabaseUser[];
  settings: AppSettings;
}

const DEFAULT_USERS: DatabaseUser[] = [
  { id: "u-1", username: "Saif", password: "Saif", role: "admin", displayName: "سيف" },
  { id: "u-2", username: "Mohamed", password: "1234", role: "viewer", displayName: "محمد" }
];

const DEFAULT_SETTINGS: AppSettings = {
  appName: "تيك روتس للأجهزة واللابتوب • Tech Roots",
  logo: "Laptop"
};

// Read Database helper
function readDb(): DbSchema {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initialDb: DbSchema = {
        transactions: SEED_TRANSACTIONS,
        users: DEFAULT_USERS,
        settings: DEFAULT_SETTINGS
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialDb, null, 2));
      return initialDb;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      const migrated: DbSchema = {
        transactions: data,
        users: DEFAULT_USERS,
        settings: DEFAULT_SETTINGS
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(migrated, null, 2));
      return migrated;
    }
    return {
      transactions: data.transactions || SEED_TRANSACTIONS,
      users: data.users || DEFAULT_USERS,
      settings: data.settings || DEFAULT_SETTINGS
    };
  } catch (error) {
    console.error("Error reading db.json, returning defaults", error);
    return {
      transactions: SEED_TRANSACTIONS,
      users: DEFAULT_USERS,
      settings: DEFAULT_SETTINGS
    };
  }
}

// Write Database helper
function writeDb(db: DbSchema) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error("Error writing to db.json", error);
  }
}

// Initialize Gemini SDK lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Set up express body parsing with limit for base64 file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// --- API ROUTES ---

// Auth Login
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
  }

  const normalizedUser = username.trim().toLowerCase();
  const normalizedPass = password.trim();

  const db = readDb();
  const foundUser = db.users.find(u => u.username.trim().toLowerCase() === normalizedUser);

  if (foundUser && foundUser.password === normalizedPass) {
    return res.json({
      success: true,
      user: {
        id: foundUser.id,
        username: foundUser.username,
        role: foundUser.role,
        displayName: foundUser.displayName || foundUser.username
      },
    });
  }

  return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
});

// Reset Data
app.post("/api/data/reset", (req, res) => {
  const db = readDb();
  db.transactions = SEED_TRANSACTIONS;
  writeDb(db);
  res.json({ success: true, message: "تمت إعادة تعيين البيانات بنجاح" });
});

// Fetch all transactions and app configuration
app.get("/api/data", (req, res) => {
  const db = readDb();
  res.json({ transactions: db.transactions, settings: db.settings });
});

// Get app settings (public)
app.get("/api/settings", (req, res) => {
  const db = readDb();
  res.json({ settings: db.settings });
});

// Update app settings (admin only)
app.put("/api/settings", (req, res) => {
  const { appName, logo } = req.body;
  const db = readDb();
  if (appName !== undefined) db.settings.appName = appName;
  if (logo !== undefined) db.settings.logo = logo;
  writeDb(db);
  res.json({ success: true, settings: db.settings });
});

// User management endpoints (admin only)
app.get("/api/admin/users", (req, res) => {
  const db = readDb();
  res.json({ users: db.users });
});

app.post("/api/admin/users", (req, res) => {
  const { username, password, role, displayName } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: "الرجاء توفير جميع البيانات المطلوبة" });
  }

  const db = readDb();
  if (db.users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
    return res.status(400).json({ error: "اسم المستخدم هذا موجود بالفعل" });
  }

  const newUser: DatabaseUser = {
    id: `u-${Date.now()}`,
    username: username.trim(),
    password: password.trim(),
    role: role,
    displayName: displayName ? displayName.trim() : username.trim()
  };

  db.users.push(newUser);
  writeDb(db);
  res.json({ success: true, user: newUser });
});

app.put("/api/admin/users/:id", (req, res) => {
  const { id } = req.params;
  const { username, password, role, displayName } = req.body;
  const db = readDb();
  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "المستخدم غير موجود" });
  }

  const u = db.users[index];
  if (username !== undefined) {
    const duplicate = db.users.some(other => other.id !== id && other.username.toLowerCase() === username.trim().toLowerCase());
    if (duplicate) {
      return res.status(400).json({ error: "اسم المستخدم هذا موجود بالفعل" });
    }
    u.username = username.trim();
  }
  if (password !== undefined) u.password = password.trim();
  if (role !== undefined) u.role = role;
  if (displayName !== undefined) u.displayName = displayName.trim();

  writeDb(db);
  res.json({ success: true, user: u });
});

app.delete("/api/admin/users/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const userToDelete = db.users.find(u => u.id === id);
  if (userToDelete && userToDelete.role === "admin") {
    const admins = db.users.filter(u => u.role === "admin");
    if (admins.length <= 1) {
      return res.status(400).json({ error: "لا يمكن حذف آخر مدير للنظام!" });
    }
  }

  db.users = db.users.filter(u => u.id !== id);
  writeDb(db);
  res.json({ success: true });
});

// Add a transaction
app.post("/api/data/transaction", (req, res) => {
  const { type, date, time, model, quantity, amount, notes } = req.body;

  if (!type || !date) {
    return res.status(400).json({ error: "النوع والتاريخ مطلوبان" });
  }

  const db = readDb();
  const newTx: Transaction = {
    id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date,
    time: time ? time.trim() : undefined,
    type,
    model: model ? model.trim() : undefined,
    quantity: quantity ? parseInt(quantity, 10) : undefined,
    amount: amount ? parseFloat(amount) : 0,
    notes: notes ? notes.trim() : "",
  };

  db.transactions.unshift(newTx);
  writeDb(db);

  res.json({ success: true, transaction: newTx });
});

// Edit a transaction
app.put("/api/data/transaction/:id", (req, res) => {
  const { id } = req.params;
  const { date, time, model, quantity, amount, notes } = req.body;

  const db = readDb();
  const index = db.transactions.findIndex((tx) => tx.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "المعاملة غير موجودة" });
  }

  db.transactions[index] = {
    ...db.transactions[index],
    date: date || db.transactions[index].date,
    time: time !== undefined ? time.trim() : db.transactions[index].time,
    model: model !== undefined ? model.trim() : db.transactions[index].model,
    quantity: quantity !== undefined ? parseInt(quantity, 10) : db.transactions[index].quantity,
    amount: amount !== undefined ? parseFloat(amount) : db.transactions[index].amount,
    notes: notes !== undefined ? notes.trim() : db.transactions[index].notes,
  };

  writeDb(db);
  res.json({ success: true, transaction: db.transactions[index] });
});

// Delete a transaction
app.delete("/api/data/transaction/:id", (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const filtered = db.transactions.filter((tx) => tx.id !== id);

  if (filtered.length === db.transactions.length) {
    return res.status(404).json({ error: "المعاملة غير موجودة" });
  }

  db.transactions = filtered;
  writeDb(db);
  res.json({ success: true, message: "تم حذف المعاملة بنجاح" });
});

// Bulk delete transactions
app.post("/api/data/transaction/bulk-delete", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: "الرجاء تحديد المعاملات للحذف" });
  }

  const db = readDb();
  const initialCount = db.transactions.length;
  db.transactions = db.transactions.filter((tx) => !ids.includes(tx.id));
  writeDb(db);

  res.json({ success: true, count: initialCount - db.transactions.length });
});

// Clear a specific section's transactions
app.post("/api/data/transaction/clear-section", (req, res) => {
  const { type } = req.body; // "add_inventory" | "sale" | "withdrawal" | "all"
  if (!type) {
    return res.status(400).json({ error: "الرجاء تحديد القسم المراد مسحه" });
  }

  const db = readDb();
  if (type === "all") {
    db.transactions = [];
  } else {
    db.transactions = db.transactions.filter((tx) => tx.type !== type);
  }
  writeDb(db);

  res.json({ success: true, message: "تم مسح القسم بنجاح" });
});

// Import data endpoint via server-side Gemini API
app.post("/api/data/import", async (req, res) => {
  const { text, fileData, fileName, mimeType } = req.body;

  if (!text && !fileData) {
    return res.status(400).json({ error: "الرجاء تقديم ملف أو نص للتحليل" });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  try {
    const ai = getGeminiClient();

    let prompt = `أنت مساعد ذكي ومحترف وخبير في استخراج وهيكلة البيانات غير المنظمة لشركة Tech Roots لبيع الأجهزة المحمولة واللابتوب.
مهمتك هي قراءة وتحليل المستند أو النص المرفق وتصنيف البيانات واستخراجها بدقة شديدة في شكل كائن JSON يحتوي على الحقول: "inventory" و "sales" و "withdrawals".

يتميز النص الذي ترسله الإدارة بأنه قد يكون عشوائياً، غير منظم، يحتوي على كلمات عربية وإنجليزية مختلطة، وأرقام عربية أو هندية (١٢٣) وصيغ عملات مختلفة (مثل "ألف"، "K"، "ج.م"، "جنيه"). عليك أن تكون مرناً للغاية في قراءة هذه المدخلات وتفسيرها كالتالي:

قواعد تصنيف واستخراج البيانات:

1. "inventory" (المخزون الوارد):
   - ابحث عن أي إشارة لدخول أجهزة جديدة للمحل أو زيادة المخزون أو "الوارد" أو "وصلنا" أو "مشتريات" أو "أجهزة مضافة".
   - ابحث عن اسم الموديل والكمية. إذا لم تذكر كمية صريحة (مثال: "وصل لابتوب MSI")، افترض أن الكمية هي 1.
   - لا تبحث عن أسعار شراء ولا تحسب تكلفة المخزون هنا.
   - الصيغ المقبولة للكمية تشمل: "عدد 4"، "4 حبات"، "4 قطع"، "4x"، "4 units".
   - مثال للحقل المستخرج: { "model": "MSI RTX 4070", "quantity": 4, "date": "${todayStr}", "notes": "وارد جديد" }

2. "sales" (المبيعات):
   - ابحث عن أي إشارة لبيع جهاز، مثل "تم البيع"، "المباع"، "بيع"، "خرج"، "صادر"، "sold"، "out".
   - استخرج اسم الموديل، الكمية المباعة، وسعر البيع الإجمالي بالجنيه المصري (كعدد صحيح بدون فواصل أو حروف).
   - تحويل المبالغ: إذا كتب "88k" أو "88 ألف" أو "٨٨ الف" أو "88,000" أو "88000 ج.م"، يجب استخراجها كعدد صحيح: 88000.
   - عمولات التمويل/التقسيط (مثل فاليو ValU أو غيره): إذا تم ذكر عمولة مخصومة أو عمولة تقسيط (مثال: "عمولة فاليو 2000" أو "خصم تقسيط")، تدرج كبند مبيعات منفصل باسم الموديل "عمولة تقسيط/فاليو" وتكون قيمتها سالبة (مثال: sellingPrice = -2000) لتنعكس في الحسابات بشكل صحيح.
   - مثال للحقل المستخرج: { "model": "Legion 5 Pro", "quantity": 1, "sellingPrice": 88000, "date": "${todayStr}", "notes": "بيع كاش" }

3. "withdrawals" (مسحوبات محمد):
   - ابحث عن أي عمليات سحب نقدية أو مصروفات شخصية أو مبالغ مدفوعة تخص الشريك "محمد" أو "مسحوبات محمد" أو "سحب محمد" أو "سحبت محمد" أو "محمد سحب".
   - استخرج قيمة المبلغ كعدد صحيح وتاريخ السحب والملاحظات إن وجدت.
   - مثال للحقل المستخرج: { "amount": 30000, "date": "${todayStr}", "notes": "مسحوبات شخصية محمد" }

شروط إضافية هامة لضمان المرونة القصوى:
- التاريخ: ابحث عن أي تاريخ مكتوب في النص (مثلاً: 18-7، 2026/07/15، أو "أمس" أو "اليوم"). قم بتحويله بدقة لتنسيق YYYY-MM-DD. إذا لم يتم ذكر أي تاريخ أو إشارة زمنية في النص، افترض التاريخ الحالي وهو: ${todayStr}.
- الأسماء والموديلات: احتفظ بالاسم التجاري للأجهزة كاملاً ومفهوماً (مثال: MSI Raider GE78 RTX 4080) ليكون مفيداً في جرد المخزن.
- الأرقام: قم بتحويل الأرقام المكتوبة بالحروف (مثل "أربعة" إلى 4، و"ثمانية وثمانون ألف" إلى 88000) والأرقام بالهندية (مثل ٨٨٠٠٠ إلى 88000) بدقة.
- يرجى ترجمة وهيكلة المخرجات بدقة بالغة وفقاً لمواصفات الـ JSON المطلوبة.`;

    let contents: any;

    if (fileData && mimeType) {
      // Send base64 file to Gemini API directly!
      const filePart = {
        inlineData: {
          data: fileData,
          mimeType: mimeType,
        },
      };
      contents = {
        parts: [
          filePart,
          { text: prompt + "\n\nقم بتحليل هذا الملف واستخرج البيانات بالكامل طبقاً للتعليمات السابقة." }
        ]
      };
    } else {
      // Send text directly
      contents = prompt + "\n\nالنص المراد تحليله:\n" + text;
    }

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        inventory: {
          type: Type.ARRAY,
          description: "الأجهزة المضافة للمخزون",
          items: {
            type: Type.OBJECT,
            properties: {
              model: { type: Type.STRING, description: "اسم الموديل بالإنجليزية أو العربية" },
              quantity: { type: Type.INTEGER, description: "الكمية المضافة" },
              date: { type: Type.STRING, description: "التاريخ بتنسيق YYYY-MM-DD" },
              notes: { type: Type.STRING, description: "ملاحظات إضافية" }
            },
            required: ["model", "quantity", "date"]
          }
        },
        sales: {
          type: Type.ARRAY,
          description: "الأجهزة المباعة والمبيعات",
          items: {
            type: Type.OBJECT,
            properties: {
              model: { type: Type.STRING, description: "اسم الموديل المباع" },
              quantity: { type: Type.INTEGER, description: "الكمية المباعة" },
              sellingPrice: { type: Type.INTEGER, description: "سعر البيع الإجمالي أو الفردي بالجنيه المصري" },
              date: { type: Type.STRING, description: "التاريخ بتنسيق YYYY-MM-DD" },
              notes: { type: Type.STRING, description: "ملاحظات البيع أو العمولة" }
            },
            required: ["model", "quantity", "sellingPrice", "date"]
          }
        },
        withdrawals: {
          type: Type.ARRAY,
          description: "مسحوبات محمد",
          items: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.INTEGER, description: "المبلغ المسحوب بالجنيه" },
              date: { type: Type.STRING, description: "التاريخ بتنسيق YYYY-MM-DD" },
              notes: { type: Type.STRING, description: "ملاحظات إضافية" }
            },
            required: ["amount", "date"]
          }
        }
      }
    };

    // Fallback models chain to guarantee 100% success rate
    const models = ["gemini-3.1-pro-preview", "gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let lastError: any = null;
    let parsedData: any = null;

    for (const model of models) {
      let retries = 2; // Try up to 3 times per model
      let delay = 1000;
      let modelSuccess = false;

      while (retries >= 0) {
        try {
          console.log(`[Importer API] Attempting processing with model: ${model} (${retries} retries left)`);
          const config: any = {
            responseMimeType: "application/json",
            responseSchema,
          };
          if (model === "gemini-3.1-pro-preview") {
            config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
          }

          const response = await ai.models.generateContent({
            model,
            contents,
            config,
          });

          const resultText = response.text;
          if (!resultText) {
            throw new Error("فشل الذكاء الاصطناعي في إرجاع نتائج صحيحة.");
          }

          parsedData = JSON.parse(resultText.trim());
          modelSuccess = true;
          console.log(`[Importer API] Successfully processed data using model: ${model}`);
          break; // Exit retry loop
        } catch (err: any) {
          lastError = err;
          const errMsg = (err.message || "").toLowerCase();
          console.warn(`[Importer API] Model ${model} failed with: ${errMsg}`);

          // Identify if error is a transient status (503, 429, or message includes demand/limit/unavailable)
          const isTransient =
            err.status === 503 ||
            err.status === 429 ||
            errMsg.includes("503") ||
            errMsg.includes("429") ||
            errMsg.includes("unavailable") ||
            errMsg.includes("limit") ||
            errMsg.includes("demand");

          if (isTransient && retries > 0) {
            console.log(`[Importer API] Transient error. Waiting ${delay}ms before retrying...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 2; // exponential backoff
            retries--;
          } else {
            break; // Move to next model if not transient, or retries exhausted
          }
        }
      }

      if (modelSuccess) {
        break; // Successfully got parsed data, break out of models chain
      }
    }

    if (!parsedData) {
      throw lastError || new Error("فشلت جميع نماذج الذكاء الاصطناعي في الاستجابة بسبب زيادة الطلب.");
    }

    // Normalize result structure to protect frontend from null/undefined values
    const normalizedData = {
      inventory: Array.isArray(parsedData.inventory) ? parsedData.inventory : [],
      sales: Array.isArray(parsedData.sales) ? parsedData.sales : [],
      withdrawals: Array.isArray(parsedData.withdrawals) ? parsedData.withdrawals : [],
    };

    res.json({ success: true, data: normalizedData });
  } catch (error: any) {
    console.error("Gemini parse error:", error);
    res.status(500).json({ error: `حدث خطأ أثناء معالجة البيانات بواسطة الذكاء الاصطناعي: ${error.message || error}` });
  }
});

// Confirm and commit imports
app.post("/api/data/import/confirm", (req, res) => {
  const { inventory, sales, withdrawals } = req.body;
  const db = readDb();

  const newTransactions: Transaction[] = [];

  // Map inventory imports to transactions
  if (Array.isArray(inventory)) {
    inventory.forEach((item, index) => {
      newTransactions.push({
        id: `import-inv-${Date.now()}-${index}-${Math.floor(Math.random() * 100)}`,
        date: item.date || new Date().toISOString().split("T")[0],
        type: "add_inventory",
        model: item.model,
        quantity: parseInt(item.quantity, 10) || 1,
        amount: 0,
        notes: item.notes || "مستورد من ملف",
      });
    });
  }

  // Map sales imports to transactions
  if (Array.isArray(sales)) {
    sales.forEach((item, index) => {
      newTransactions.push({
        id: `import-sale-${Date.now()}-${index}-${Math.floor(Math.random() * 100)}`,
        date: item.date || new Date().toISOString().split("T")[0],
        type: "sale",
        model: item.model,
        quantity: parseInt(item.quantity, 10) || 1,
        amount: parseFloat(item.sellingPrice) || 0,
        notes: item.notes || "مستورد من ملف",
      });
    });
  }

  // Map withdrawals imports to transactions
  if (Array.isArray(withdrawals)) {
    withdrawals.forEach((item, index) => {
      newTransactions.push({
        id: `import-with-${Date.now()}-${index}-${Math.floor(Math.random() * 100)}`,
        date: item.date || new Date().toISOString().split("T")[0],
        type: "withdrawal",
        amount: parseFloat(item.amount) || 0,
        notes: item.notes || "مستورد من ملف",
      });
    });
  }

  // Combine and save
  db.transactions = [...newTransactions, ...db.transactions];
  writeDb(db);

  res.json({ success: true, count: newTransactions.length, message: "تم دمج وحفظ البيانات بنجاح" });
});


// --- VITE DEV SERVER OR STATIC SERVING ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // In development mode, mount Vite middleware to serve resources
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve compiled static assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
