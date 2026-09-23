# petVetta — AI Pet Health Assistant 🐾

> **Know What's Wrong. Know What to Do.**

petVetta is a full-stack, mobile-first PWA that provides AI-powered pet health triage, vaccination tracking, health records management, food safety checking, and vet location — built on Next.js + Supabase + Claude AI.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 + React 18 + TypeScript + Tailwind CSS |
| Backend | Supabase Edge Functions (Deno) |
| AI Engine | Anthropic Claude API (Sonnet 5 / Opus 5 / Haiku 4.5) |
| Database | PostgreSQL 15 + pgvector (Supabase ap-south-1 Mumbai) |
| Auth | Supabase Auth (JWT + OTP + OAuth) |
| Embeddings | Voyage AI voyage-3 |
| Payments | Razorpay (India) + Stripe (International) |
| Push Notifications | Firebase Cloud Messaging |
| Email | Resend |
| SMS | MSG91 |
| Hosting | Vercel |

---

## Features

### Phase 1 (MVP — Sep–Dec 2026)
- ✅ **AI Symptom Triage** — 4-level assessment (EMERGENCY, VET SOON, MONITOR, HOME CARE)
- ✅ **Food Safety Checker** — Instant AI check with Haiku + toxic food fast-path
- ✅ **Vet Directory** — Google Maps-powered nearby vet search
- ✅ **Health Records** — Vet visits, medications, weight tracking
- ✅ **Vaccination Tracker** — Schedule tracking with reminders
- ✅ **Pet Profiles** — Multi-pet management
- ✅ **User Authentication** — Email/password + OTP + Google OAuth
- ✅ **Subscription System** — Free / Basic / Premium / Family (Razorpay + Stripe)
- ✅ **PWA** — Offline support, install prompt, push notifications
- ✅ **DPDP Compliance** — India data residency (ap-south-1)

---

## Project Structure

```
petVetta/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Dashboard (Home)
│   │   ├── auth/               # Login, Signup, OTP, Forgot Password
│   │   ├── onboarding/         # Onboarding slides
│   │   ├── pets/               # Pet management (list, add, detail)
│   │   ├── triage/             # Symptom triage flow + results
│   │   ├── health/             # Health records, food safety, vets, vaccinations
│   │   ├── profile/            # User profile
│   │   ├── subscribe/          # Subscription & payment
│   │   └── settings/           # Account settings
│   ├── components/
│   │   ├── layout/             # TopHeader, BottomTabBar
│   │   └── ui/                 # Button, Input, Card, Toast, Spinner
│   ├── lib/
│   │   ├── supabase/           # client.ts, server.ts
│   │   └── utils.ts            # Utility functions
│   ├── store/                  # Zustand stores (auth, pets, UI, triage)
│   └── types/                  # TypeScript types + constants
├── supabase/
│   ├── schema.sql              # Full PostgreSQL schema with RLS
│   └── functions/              # Supabase Edge Functions (Deno)
│       ├── triage-query/       # AI symptom triage + RAG pipeline
│       ├── food-safety/        # Food safety AI checker
│       ├── vet-search/         # Google Places proxy
│       ├── create-payment/     # Razorpay + Stripe order creation
│       └── verify-payment/     # HMAC webhook verification
├── public/
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service worker
├── .env.example                # Environment variables template
└── README.md
```

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Supabase account (free tier works)
- Anthropic Claude API key
- Voyage AI API key

### 2. Install Dependencies

```bash
cd petVetta
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env.local
# Fill in your API keys in .env.local
```

### 4. Set up Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push the schema
supabase db push --db-url postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
# OR manually run: supabase/schema.sql in the Supabase SQL editor
```

### 5. Deploy Edge Functions

```bash
# Deploy all Edge Functions
supabase functions deploy triage-query --no-verify-jwt
supabase functions deploy food-safety --no-verify-jwt
supabase functions deploy vet-search --no-verify-jwt
supabase functions deploy create-payment --no-verify-jwt
supabase functions deploy verify-payment --no-verify-jwt

# Set secrets
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set VOYAGE_API_KEY=pa-...
supabase secrets set RAZORPAY_KEY_ID=rzp_...
supabase secrets set RAZORPAY_KEY_SECRET=...
supabase secrets set GOOGLE_MAPS_API_KEY=AIza...
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard
# Project → Settings → Environment Variables
```

---

## Database Schema

The full schema is in `supabase/schema.sql`. Key tables:

| Table | Purpose |
|-------|---------|
| `profiles` | Extended user data |
| `pets` | Pet profiles |
| `triage_sessions` | AI triage history |
| `food_safety_queries` | Food checks |
| `health_records` | Vet visits |
| `medications` | Active medications |
| `weight_entries` | Weight history |
| `vaccinations` | Vaccine schedule |
| `knowledge_base` | RAG knowledge base (pgvector) |
| `subscriptions` | Plan management |
| `payment_transactions` | Payment audit log |

All user tables enforce **Row-Level Security (RLS)** — users can only access their own data.

---

## AI Architecture

```
User Query
   ↓
Input Sanitization (strip HTML/scripts)
   ↓
Emergency Keyword Fast-Path (pre-screening)
   ↓
Model Selection (Haiku / Sonnet / Opus based on complexity)
   ↓
Voyage AI Embeddings (voyage-3, 1024 dimensions)
   ↓
Hybrid Search: pgvector HNSW + BM25 (70/30 RRF merge)
   ↓
Prompt Assembly (system + pet context + KB docs)
   ↓
Claude API Inference
   ↓
Output Validation + Triage Level Parsing
   ↓
Session Logging (audit trail)
   ↓
Response to Client
```

---

## Subscription Plans

| Plan | INR/mo | USD/mo | Queries/day | Pets |
|------|--------|--------|-------------|------|
| Free | ₹0 | $0 | 3 | 1 |
| Basic | ₹199 | $9.99 | 15 | 3 |
| Premium | ₹499 | $19.99 | 50 | 5 |
| Family | ₹799 | $29.99 | 100 | 10 |

---

## Medical Disclaimer

> petVetta provides AI-driven general health information for educational purposes only and is **NOT** a substitute for professional veterinary medical advice, diagnosis, or treatment. Always consult a licensed veterinarian for any health concerns. petVetta does not prescribe medications, diagnose conditions, or replace veterinary care.

---

## Security & Compliance

- **DPDP Act 2023** (India) — data residency in ap-south-1 (Mumbai)
- **GDPR** — EU data portability and deletion rights
- **TLS 1.3** — all traffic encrypted in transit
- **AES-256** — data encrypted at rest
- **RLS** — row-level security on all user tables
- **Rate limiting** — 100 req/min per user
- **Input sanitization** — HTML stripping + regex validation
- **HMAC verification** — payment webhook signature validation
- **JWT RS256** — 1hr access + 7d refresh tokens

---

## Owner

**Tanmoy Chowdhury** | petVetta v1.0 | September 2026
