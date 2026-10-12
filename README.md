# IprintZone Manager

A production-ready Android app for managing printing jobs, customer collections, SVK supplier payments, delivery tracking, and business profit — fully offline with SQLite storage.

## Features

- **Job Management**: Create, edit, delete print jobs with full customer and SVK supplier accounting
- **Payment Ledger**: Record multiple customer and SVK payments per job with full history
- **Auto Calculations**: C Total, SVK Total, balances, and IPZ profit calculated automatically
- **Dashboard**: Live stats with date filters (Today / Week / Month / All Time)
- **10 Reports**: Daily register, outstanding balances, collections, profit, delivery pending, and more
- **Delivery Tracking**: Track job status (Pending → In Progress → Ready → Delivered)
- **CSV Export**: Export jobs, payments, and expenses to CSV
- **Database Backup/Restore**: Full SQLite backup and restore
- **PIN Protection**: Optional app PIN (stored securely, never in plaintext)
- **Offline First**: No internet required, all data on device

## Tech Stack

- React Native + Expo SDK 57
- Expo Router (file-based navigation)
- expo-sqlite (local database)
- TypeScript (strict mode)
- expo-secure-store (PIN storage)
- expo-file-system + expo-sharing (backup/export)

## Setup

```bash
cd IprintZoneManager
npm install
npx expo start
```

## Run Tests

```bash
npm test
```

## TypeScript Check

```bash
npm run tsc
```

## Build Android APK

### Option 1: EAS Build (recommended)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

The APK will be available for download from the EAS dashboard.

### Option 2: Local Build

```bash
npx expo run:android --variant release
```

Requires Android Studio and a configured Android SDK.

## Accounting Rules

| Formula | Description |
|---------|-------------|
| C Total = (C Rate × Qty) + Design Charge | Customer billing total |
| SVK Total = SVK Rate × Qty | Supplier production cost |
| C Balance = C Total − Σ(Customer Payments) | Customer outstanding |
| SVK Balance = SVK Total − Σ(SVK Payments) | Supplier outstanding |
| IPZ Profit = C Total − SVK Total − Σ(Expenses) | Business profit |

**Key rules:**
- Revenue is counted once (C Total = IPZ Total — same invoice)
- Profit is based on full job totals, not on collected/paid amounts
- All amounts stored as integer paise to avoid floating-point errors

## Database Schema

- `jobs` — all job records
- `payments` — customer (C) and SVK payments with foreign key to jobs
- `expenses` — additional per-job expenses
- `settings` — app configuration (PIN, etc.)

Foreign keys with CASCADE DELETE ensure payments/expenses are removed when a job is deleted (after user confirmation).

## File Structure

```
app/
  (tabs)/         — Bottom tab screens (Dashboard, Jobs, Accounts, Reports, Settings)
  jobs/           — Job detail, new job, edit job screens
src/
  database/       — SQLite schema, migrations, repositories
  calculations/   — billing.ts, balances.ts, profit.ts
  components/     — Reusable UI components
  hooks/          — useJobs, useDashboard
  utils/          — currency, dates, validation, export, theme
__tests__/        — Unit tests for accounting functions
```

## Backup Recommendation

Since all data is stored only on this device, export a full database backup regularly via **Settings → Full Database Backup**. Store the `.db` file in Google Drive or another safe location.
