<div align="center">

# 🕷️ CrawlMind

### AI-Powered Web Crawling & Research Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Crawl_API-F38020?style=flat-square&logo=cloudflare)](https://developers.cloudflare.com/browser-rendering/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)

**Paste a URL. Describe your research. Let AI do the rest.**

CrawlMind combines Cloudflare's crawl infrastructure with AI-powered URL discovery and multi-hop research synthesis — turning any query into structured, crawled knowledge.

[Getting Started](#-getting-started) · [Features](#-features) · [Architecture](#-architecture) · [Deploy](#-deploy)

</div>

---

## ✨ Features

### Core Crawling
- **Smart Input** — Auto-detects URLs vs. natural language; just paste or type
- **Cloudflare-Powered** — Fast, reliable crawling via Cloudflare's Browser Rendering API
- **Multi-Format Output** — Markdown, HTML, plaintext, or cleaned readable HTML
- **JS Rendering** — Crawl JavaScript-heavy SPAs with headless rendering
- **Advanced Controls** — Depth, page limits, subdomain inclusion, URL patterns, date filters

### 🧠 AI Discovery *(New)*
- **AI URL Discovery** — Describe what you need; Groq finds the best sources to crawl
- **Depth Tiers** — **Quick** (~30s), **Deep Dive** (~2min), or **Multi-hop Research** (~5min)
- **Multi-Hop Research** — Crawl → analyze gaps → discover follow-up sources → repeat (up to 3 rounds)
- **AI Synthesis** — NVIDIA NIM generates a comprehensive research report from all crawled data
- **Parent-Child Jobs** — Research jobs manage multiple sub-crawls independently, no interference with normal crawls

### Platform
- **AI Chat** — Ask questions about crawl results with full context awareness
- **Soft-Delete Library** — Archive, restore, and manage past crawls
- **Analytics Dashboard** — Track crawl usage, search patterns, and AI queries
- **Plan-Based Limits** — Tiered pricing with Stripe integration
- **Auth** — GitHub, Google, and email sign-in via Better Auth

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INPUT                               │
│         URL / Natural Language / AI Discovery Toggle             │
└─────────────┬──────────────────────────┬────────────────────────┘
              │                          │
        URL detected              AI Discovery ON
              │                          │
              ▼                          ▼
    ┌─────────────────┐     ┌──────────────────────────┐
    │  POST /api/crawl │     │   POST /api/research     │
    │  Normal Pipeline │     │   AI Research Pipeline   │
    └────────┬────────┘     └────────────┬─────────────┘
             │                           │
             ▼                           ▼
    ┌─────────────────┐     ┌──────────────────────────┐
    │ Cloudflare Crawl │     │ Groq: Discover URLs      │
    │ Single Job       │     │ (llama-3.3-70b-versatile)│
    └────────┬────────┘     └────────────┬─────────────┘
             │                           │
             │                           ▼
             │              ┌──────────────────────────┐
             │              │ Spawn Parallel Sub-Crawls │
             │              │ via Cloudflare Crawl API  │
             │              └────────────┬─────────────┘
             │                           │
             │              ┌────────────▼─────────────┐
             │              │ RESEARCH tier only:       │
             │              │ NIM Gap Analysis →        │
             │              │ Follow-up Crawls (×3)     │
             │              └────────────┬─────────────┘
             │                           │
             │                           ▼
             │              ┌──────────────────────────┐
             │              │ NIM: Synthesis Report     │
             │              │ (nemotron-super-49b)      │
             ▼              └────────────┬─────────────┘
    ┌─────────────────┐                  │
    │  Neon PostgreSQL │◄────────────────┘
    │  (Prisma ORM)    │
    └─────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 15 (App Router) | Full-stack React with server components |
| **Database** | Neon PostgreSQL + Prisma | Serverless Postgres with type-safe ORM |
| **Auth** | Better Auth | GitHub, Google, email authentication |
| **Crawling** | Cloudflare Crawl API | Browser rendering + web crawling at scale |
| **AI — Fast** | Groq (`llama-3.3-70b`) | URL discovery (~200ms responses) |
| **AI — Deep** | NVIDIA NIM (`nemotron-super-49b`) | Gap analysis + synthesis reports |
| **AI Chat** | Vercel AI SDK | Streaming chat over crawl results |
| **Payments** | Stripe | Subscription billing + webhooks |
| **Styling** | Tailwind CSS + shadcn/ui | Utility-first CSS + accessible components |
| **Deployment** | Vercel | Edge-optimized serverless hosting |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.0+
- [Neon](https://neon.tech/) PostgreSQL database
- [Cloudflare](https://developers.cloudflare.com/browser-rendering/) account with Crawl API access
- [Groq](https://console.groq.com/) API key (for AI URL discovery)
- [NVIDIA NIM](https://build.nvidia.com/) API key (for synthesis)

### Quick Start

```bash
# Clone
git clone https://github.com/pantha704/CrawlMind.git
cd CrawlMind

# Install
bun install

# Configure
cp .env.example .env.local
# Edit .env.local with your keys (see below)

# Database
bunx prisma db push
bunx prisma generate

# Run
bun run dev
```

### Environment Variables

```env
# Database (Neon)
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:3001
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Cloudflare
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...

# AI
GROQ_API_KEY=...          # For URL discovery (Groq)
NVIDIA_NIM_API_KEY=...    # For synthesis (NVIDIA NIM)

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── crawl/              # Crawl CRUD, results proxy, cancel
│   │   ├── research/           # AI Discovery — create, poll, active
│   │   ├── chat/               # AI chat endpoint
│   │   ├── stripe/             # Payment webhooks
│   │   └── user/               # Usage tracking & settings
│   ├── dashboard/
│   │   ├── page.tsx            # Main dashboard
│   │   ├── jobs/               # Crawl job list + detail
│   │   ├── research/           # AI research detail page
│   │   ├── chat/               # AI chat interface
│   │   ├── library/            # Archived results
│   │   └── analytics/          # Usage analytics
│   ├── pricing/                # Pricing page
│   └── (auth)/                 # Sign in / sign up
├── components/
│   ├── dashboard/              # Dashboard UI (crawl-input, active-jobs, etc.)
│   ├── landing/                # Landing page components
│   └── ui/                     # shadcn/ui primitives
└── lib/
    ├── auth.ts                 # Better Auth config
    ├── cloudflare.ts           # Cloudflare Crawl API client
    ├── research.ts             # AI Discovery — Groq + NIM integration
    ├── ai.ts                   # AI model configuration
    ├── prisma.ts               # Prisma client
    └── stripe.ts               # Stripe client
```

---

## 🧠 AI Discovery — How It Works

| Tier | What Happens | Sources | Time |
|------|-------------|---------|------|
| ⚡ **Quick** | AI finds 3-5 relevant sources, crawls them | 3-5 | ~30s |
| 🔍 **Deep Dive** | AI discovers 10-15 categorized sources | 10-15 | ~2min |
| 🧠 **Research** | Multi-hop: crawl → gap analysis → follow-up crawls (×3 rounds) → synthesis | 15-30+ | ~5min |

**Models used:**
- **Groq** (`llama-3.3-70b-versatile`) — Fast URL discovery (~200ms)
- **NVIDIA NIM** (`nemotron-super-49b-v1.5`) — Deep analysis & comprehensive synthesis

---

## 💳 Pricing Tiers

| Plan | Price | Crawls/day | Pages/crawl | AI Chat | JS Render |
|------|-------|-----------|-------------|---------|-----------|
| **Spark** | Free | 2 | 30 | 3 queries | ❌ |
| **Pro** | $12/mo | 25 | 500 | Unlimited | ✅ |
| **Pro+** | $24/mo | 75 | 1,000 | Unlimited | ✅ |
| **Scale** | $39/mo | 150 | 5,000 | Unlimited | ✅ |

---

## 🚢 Deploy

### Vercel (Recommended)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add all environment variables
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel domain
5. Deploy

> **Note:** Ensure `NEXT_PUBLIC_APP_URL` points to your deployed domain (not `localhost`) for webhooks and auth callbacks.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with ☕ and curiosity

</div>
