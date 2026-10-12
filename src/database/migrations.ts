import type { SQLiteDatabase } from 'expo-sqlite';

const CURRENT_VERSION = 1;

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const version = result?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_date TEXT NOT NULL,
        phone_number TEXT NOT NULL DEFAULT '',
        client_name TEXT NOT NULL,
        job_description TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        c_rate_paise INTEGER NOT NULL DEFAULT 0,
        c_design_charge_paise INTEGER NOT NULL DEFAULT 0,
        c_total_paise INTEGER NOT NULL DEFAULT 0,
        svk_rate_paise INTEGER NOT NULL DEFAULT 0,
        svk_total_paise INTEGER NOT NULL DEFAULT 0,
        ipz_total_paise INTEGER NOT NULL DEFAULT 0,
        remarks TEXT NOT NULL DEFAULT '',
        expected_delivery_date TEXT NOT NULL DEFAULT '',
        actual_delivery_date TEXT NOT NULL DEFAULT '',
        delivery_status TEXT NOT NULL DEFAULT 'Pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        account_type TEXT NOT NULL CHECK(account_type IN ('C','SVK')),
        amount_paise INTEGER NOT NULL CHECK(amount_paise > 0),
        payment_date TEXT NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'Cash',
        reference_number TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        amount_paise INTEGER NOT NULL CHECK(amount_paise >= 0),
        expense_date TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(job_date);
      CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_name);
      CREATE INDEX IF NOT EXISTS idx_jobs_phone ON jobs(phone_number);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(delivery_status);
      CREATE INDEX IF NOT EXISTS idx_payments_job ON payments(job_id);
      CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
      CREATE INDEX IF NOT EXISTS idx_expenses_job ON expenses(job_id);

      PRAGMA user_version = 1;
    `);
  }
}
