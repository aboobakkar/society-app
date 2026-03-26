# Masjidul Hidaya — Society Management System

A full-stack web application for managing society members, monthly payments, expenses, and reports.

**Tech Stack:** React 18 + TypeScript + Supabase (PostgreSQL) + Tailwind CSS + Vite

---

## Features

### Admin Panel (`/admin`)
- **Dashboard** — Monthly overview: collection stats, balance, pending members
- **Members** — Add/edit/deactivate members with unique IDs (SCY001...), English + Malayalam names
- **Payments** — Record cash/online/bank payments per member per month; pending list
- **Expenses** — Log salaries, utility bills, maintenance, events by category
- **Reports** — Bar charts, monthly summary table, member-wise payment grid (✓/✗)
- **Settings** — Society name, default amount, language, admin password change

### Member Portal (`/member`)
- View own profile and payment status
- See pending months with **Pay via UPI** button (UPI deep link)
- Payment history list
- Year-at-a-glance payment grid

### Bilingual
- Full **English + Malayalam** support — toggle anytime

---

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project** → name it `masjidul-hidaya`
3. Wait for the project to be ready (~2 minutes)

### 2. Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and click **Run**

### 3. Create the Admin User

In the Supabase SQL Editor, run:

```sql
-- After creating the admin user via Auth, update their role:
-- First, go to Authentication → Users → Invite user
-- Email: admin@masjidhidaya.com (or your email)
-- Then run:
UPDATE public.profiles
SET role = 'superadmin', full_name = 'Admin'
WHERE email = 'admin@masjidhidaya.com';
```

Or use Supabase Auth dashboard:
1. **Authentication → Users → Invite user**
2. Enter admin email, set a password
3. Run the SQL above to make them superadmin

### 4. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Get these from: **Supabase → Settings → API**

### 5. Install and Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

### 6. Deploy (Free)

```bash
npm run build
```

Deploy the `dist/` folder to:
- **Vercel** (recommended): Connect GitHub repo → auto-deploy
- **Netlify**: Drag & drop `dist/` folder

Set environment variables in your hosting dashboard.

---

## Creating Member Accounts

To give a member login access:

1. Go to **Supabase → Authentication → Users → Invite**
2. Enter member's email/mobile as email (e.g. `9876543210@masjidhidaya.com`)
3. In SQL Editor, link them to their member record:

```sql
UPDATE public.profiles
SET member_id = 'SCY001', role = 'member'
WHERE email = '9876543210@masjidhidaya.com';
```

---

## UPI Payment Setup

In `src/pages/member/MemberPortal.tsx`, update the UPI ID:

```typescript
const upiId = 'masjidhidaya@upi'  // ← Replace with your actual UPI ID
```

For production payment confirmation (webhook-based), integrate with:
- **Razorpay** (recommended for India)
- **PayU**
- **Cashfree**

---

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   └── AdminLayout.tsx     # Sidebar + nav
│   └── ui/
│       └── index.tsx           # Button, Input, Modal, Card, Badge...
├── hooks/
│   ├── useAuth.tsx             # Auth context
│   ├── useLang.tsx             # Language context
│   └── useData.ts              # All Supabase queries
├── lib/
│   ├── supabase.ts             # Supabase client
│   └── utils.ts                # Formatting helpers
├── pages/
│   ├── LoginPage.tsx
│   ├── admin/
│   │   ├── Dashboard.tsx
│   │   ├── Members.tsx
│   │   ├── Payments.tsx
│   │   ├── Expenses.tsx
│   │   ├── Reports.tsx
│   │   └── Settings.tsx
│   └── member/
│       └── MemberPortal.tsx
├── types/
│   └── index.ts                # TypeScript types
├── App.tsx                     # Router
└── main.tsx
supabase/
└── migrations/
    └── 001_initial_schema.sql  # Full DB schema + RLS policies
```
# society-app
