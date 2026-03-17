# 🕷️ CrawlMind

**AI-powered web crawling and data extraction platform** built with Next.js, Cloudflare Crawl API, and QStash.

Paste a URL or describe what you're looking for — CrawlMind crawls, extracts, and lets you chat with the results using AI.

---

## ✨ Features

- **Smart Input** — Auto-detects URLs vs natural language prompts
- **AI URL Discovery** — Describe what you need, AI finds the right URLs to crawl
- **AI Chat** — Ask questions about your crawl results with full context
- **Cloudflare-powered** — Fast, reliable crawling via Cloudflare's Crawl API
- **QStash Background Sync** — Jobs complete even if you close your browser
- **Soft-delete Library** — Archive and restore past crawls
- **Multi-format Output** — Markdown, HTML, plaintext, readable HTML
- **JS Rendering** — Crawl JavaScript-heavy SPAs
- **Plan-based Limits** — Tiered pricing with Stripe integration
- **Analytics Dashboard** — Track crawl usage and search patterns

## 🏗️ Architecture

```
User → POST /api/crawl → Cloudflare Crawl API (creates job)
                        → Save to Neon PostgreSQL
                        → Schedule QStash delayed webhook

QStash → POST /api/webhooks/crawl-sync (after delay)
       → Check Cloudflare status
       → If done: save results to DB ✅
       → If pending: re-queue with exponential backoff (30s → 5min)
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | Neon PostgreSQL + Prisma |
| Auth | Better Auth (GitHub, Google, email) |
| Crawling | Cloudflare Crawl API |
| Background Jobs | QStash (Upstash) |
| AI | Vercel AI SDK + Groq / NVIDIA NIM |
| Payments | Stripe |
| Styling | Tailwind CSS + shadcn/ui |
| Deployment | Vercel |

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [Neon](https://neon.tech/) PostgreSQL database
- [Cloudflare](https://developers.cloudflare.com/browser-rendering/) account with Crawl API access
- [Stripe](https://stripe.com/) account (for payments)

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/crawlmind.git
cd crawlmind

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env.local

# Push database schema
bunx prisma db push

# Generate Prisma client
bunx prisma generate

# Start dev server
bun run dev
```

### Environment Variables

Create a `.env.local` file with:

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
GROQ_API_KEY=...
NVIDIA_NIM_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...

# QStash (Upstash)
QSTASH_TOKEN=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── crawl/          # Crawl CRUD + status sync
│   │   ├── chat/           # AI chat endpoint
│   │   ├── stripe/         # Payment webhooks
│   │   ├── user/           # User usage & settings
│   │   └── webhooks/       # QStash crawl-sync webhook
│   ├── dashboard/
│   │   ├── page.tsx        # Main dashboard
│   │   ├── jobs/           # Job list + detail pages
│   │   ├── chat/           # AI chat page
│   │   └── library/        # Saved results (archive/restore)
│   ├── pricing/            # Pricing page
│   └── (auth)/             # Sign in/up pages
├── components/
│   ├── dashboard/          # Dashboard components
│   ├── landing/            # Landing page components
│   └── ui/                 # shadcn/ui components
└── lib/
    ├── auth.ts             # Better Auth config
    ├── cloudflare.ts       # Cloudflare API client
    ├── prisma.ts           # Prisma client
    ├── qstash.ts           # QStash client
    ├── ai.ts               # AI model config
    └── stripe.ts           # Stripe client
```

## 💳 Pricing Tiers

| Plan | Price | Crawls/day | Pages/crawl | AI | JS Render |
|------|-------|-----------|-------------|-----|-----------|
| Spark | Free | 2 | 30 | 3 queries | ❌ |
| Pro | $12/mo | 25 | 500 | Unlimited | ✅ |
| Pro+ | $24/mo | 75 | 1,000 | Unlimited | ✅ |
| Scale | $39/mo | 150 | 5,000 | Unlimited | ✅ |

## 🚢 Deploy to Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all environment variables
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel domain
5. Deploy!

> **Important:** QStash requires a publicly reachable URL for webhooks. Make sure `NEXT_PUBLIC_APP_URL` points to your deployed domain, not localhost.

## 📜 License

MIT
