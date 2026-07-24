export type TransactionType = "add_inventory" | "sale" | "withdrawal";

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM AM/PM
  type: TransactionType;
  model?: string; // only for add_inventory and sale
  quantity?: number; // only for add_inventory and sale
  amount: number; // sellingPrice for sale, withdrawalAmount for withdrawal, 0 for add_inventory
  notes?: string;
}

export interface User {
  id: string;
  username: string;
  role: "admin" | "viewer";
  displayName: string;
}

export interface AppSettings {
  appName: string;
  logo: string;
}

export interface BusinessStats {
  totalIncomingDevices: number;
  totalSoldDevices: number;
  totalRemainingDevices: number;
  totalSales: number;
  totalWithdrawals: number;
  remainingBalance: number;
}

export interface InventoryItem {
  model: string;
  totalAdded: number;
  totalSold: number;
  remaining: number;
  notes?: string;
}
