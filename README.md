# Inkognito

**Speak Without a Face.**

Anonymous confessions, random stranger chat, and an AI companion that never judges. No account required. No traces left.

---

## What It Is

Inkognito is a three-pillar anonymous social platform:

1. **Confession Feed** — Users post anonymous confessions (sexual, dark, relationship, work, etc.), react with emoji-style symbols, comment, and share with snippet previews to social media. No sign-up needed.

2. **Stranger Chat** — Omegle-style random chat with text and video. Peer-to-peer video via WebRTC (your server never sees video/audio). Custom signaling via Convex.

3. **AI Companion** — Groq-powered (Llama 3.1-8B-Instant) non-judgmental companion chat. Streaming responses. Session-only — nothing stored.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Familiar, fast, great OG meta support |
| Backend / DB / Realtime | Convex | Real-time subscriptions, no server setup, generous free tier, never pauses |
| AI Companion | Groq (Llama 3.1-8B-Instant) | Free tier, fastest inference available |
| Video Signaling | Custom WebRTC via Convex | Zero cost — video is peer-to-peer |
| Image Moderation | AWS Rekognition | Free 5K images/month |
| Media Storage | Cloudflare R2 | Free 10GB, cheap after |
| Deployment | Vercel | Free tier, integrates with Next.js |
| Ads | Google AdSense | Passive income from traffic |

**Estimated monthly cost at 50K users: ~$0 on free tiers.**

---

## Project Structure

```
inkognito/
├── app/
│   ├── layout.tsx              # Root layout — providers, navbar, age gate
│   ├── page.tsx                # Homepage — hero + feed
│   ├── confess/page.tsx        # Confession writing room
│   ├── chat/page.tsx           # Random stranger chat
│   ├── companion/page.tsx      # AI companion
│   └── c/[id]/page.tsx         # Individual confession (shareable)
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx          # Top navigation, sticky, mobile drawer
│   │   └── Hero.tsx            # Landing hero + scrolling ticker
│   ├── feed/
│   │   ├── FeedPage.tsx        # Feed with filters, sort, infinite scroll, ads
│   │   ├── ConfessionCard.tsx  # Single confession — reactions, share, report
│   │   ├── ConfessForm.tsx     # Write and post a confession
│   │   ├── ConfessionSkeleton.tsx  # Loading skeleton
│   │   └── ConfessionDetail.tsx    # Full single confession + share sheet
│   ├── chat/
│   │   └── ChatRoom.tsx        # Stranger chat — text + WebRTC video
│   ├── companion/
│   │   └── CompanionChat.tsx   # AI companion with streaming
│   ├── ui/
│   │   └── AgeGate.tsx         # 18+ overlay (localStorage-persisted)
│   └── providers/
│       ├── ConvexClientProvider.tsx    # Convex React wrapper
│       └── AnonSessionProvider.tsx     # UUID session + IP geolocation
│
├── convex/
│   ├── schema.ts               # Database schema (all tables)
│   ├── confessions.ts          # Confession queries + mutations
│   ├── chat.ts                 # Chat pairing + messaging + WebRTC signaling
│   ├── users.ts                # Anonymous session management
│   └── http.ts                 # HTTP actions (Groq streaming, moderation)
│
├── hooks/
│   └── useWebRTC.ts            # WebRTC peer connection hook
│
├── lib/
│   └── utils.ts                # Shared utilities (share, format, etc.)
│
├── types/
│   └── index.ts                # TypeScript types
│
├── .env.example                # Environment variables template
└── README.md                   # This file
```

---

## Getting Started

### 1. Clone and install

```bash
cd inkognito
npm install
```

### 2. Set up Convex

```bash
npx convex dev
```

This will:
- Ask you to log in to Convex (free account)
- Create a new project
- Generate `convex/_generated/` folder
- Give you your `NEXT_PUBLIC_CONVEX_URL`

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

For Groq (AI companion), go to [console.groq.com](https://console.groq.com), get a free API key, then set it in your **Convex dashboard** under Settings → Environment Variables:

```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
```

> **Why Convex env vars?** The Groq key is used in the Convex HTTP action (server-side). Setting it in Convex keeps it off the client.

### 4. Run locally

```bash
npm run dev
```

This starts both Next.js (port 3000) and Convex dev server simultaneously.

---

## Deployment

### Deploy to Vercel

```bash
npx vercel
```

Add `NEXT_PUBLIC_CONVEX_URL` as an environment variable in Vercel dashboard.

### Deploy Convex

```bash
npx convex deploy
```

Run this after `vercel deploy` — it deploys your Convex functions to production.

---

## Feature Details

### Anonymous Sessions

Every visitor gets a UUID generated client-side and stored in `localStorage`. This is the "identity" — used for posting, reacting, chatting. No email, no name.

Optional accounts (username + password only, no email) are supported via `convex/users.ts → createAccount()`. Passwords must be hashed in a Next.js API route before calling Convex (Convex doesn't run Node.js crypto).

Location is fetched from [ipapi.co](https://ipapi.co) — free, no API key, IP-based (not GPS). Country/city is stored and shown on confessions ("Anon · Lagos, NG").

### Confession Feed

- Real-time via Convex subscriptions — new posts appear instantly
- Heat score algorithm: `engagement / (age_hours + 2)^1.8` — weighted by reactions (3×), comments (5×), views (0.1×)
- Categories with color-coded left border
- NSFW blur overlay (click to reveal)
- Reactions: fire 🔥, heart ♥, shock ⚡, tears 💧, dark ☽, and more (10+ types)
- Comments: Inline replies with support for **Whispers** (private to author) and **Fading Messages** (disappear over time)
- Void Polls: Attach A/B polls to confessions with real-time results
- Shadow Moods: Select a vibe (Guilty, Relieved, Heartbroken, etc.) to show on your post
- Engagement: **Echoes** (reposts) to spread confessions, **Bookmarks** to save them privately
- Void Karma: Earn points for engagement on your confessions (displayed on profile)
- Share: Native share API → fallback to clipboard. OG tags show snippet only.
- Report flow: Stored in `reports` table for manual review

### Content Moderation

Three layers:
1. **Keyword filter** (instant, free) — blocks obvious illegal terms in `confessions.ts → post()`
2. **User reports** — any user can flag content; stored in `reports` table
3. **AWS Rekognition** (5K images/month free) — image moderation scaffolded in `convex/http.ts → /moderation`

You can add more sophisticated text classifiers (e.g., Perspective API by Google — free) as traffic grows.

### Stranger Chat

Pairing algorithm:
1. User A calls `joinQueue()` → creates a `chatSession` with `status: "waiting"`
2. User B calls `joinQueue()` → finds A's waiting session, patches it to `status: "active"`, both get paired
3. Both subscribe to their session via `useQuery(getMyChatSession)` — Convex pushes the active state in real-time
4. Chat messages flow through `chatMessages` table, delivered via Convex subscriptions

### Shadow Frequencies (Direct Messaging)

- **Initiation**: Plus members can start 1-on-1 chats directly with confession authors.
- **Privacy**: Authors remain anonymous; the `initiatorSessionId` is mapped to the `confessionId` on the server to prevent ID leaking.
- **Persistence**: Messages are stored in `dmMessages` and synced across sessions if the user has synced their device.

### WebRTC Video

How the signaling works (Convex as the signaling server):
1. Role A creates an SDP offer → stores in `rtcSignals` table
2. Role B polls `getPendingSignals` → reads offer → creates answer → stores it back
3. Both sides exchange ICE candidates the same way
4. After handshake, video/audio flows directly peer-to-peer — **Convex never sees it**

STUN servers used: Google's free public STUN (`stun.l.google.com:19302`).

For users behind symmetric NAT (rare), you'd need a TURN server. [Metered.ca](https://www.metered.ca/tools/openrelay/) has a free TURN server for testing.

### AI Companion

- Model: `llama-3.1-8b-instant` via Groq
- Streaming via SSE (Server-Sent Events) through Convex HTTP action
- System prompt: warm, therapeutic, non-judgmental, concise
- Context window: last 20 messages
- **Persistent History**: Messages are stored in the `companionHistory` table to persist across page reloads (can be cleared manually).
- Crisis resources link shown below the chat

### Google AdSense Integration

Ad slots are pre-placed in:
- `FeedPage.tsx` — horizontal banner between every 8 confessions
- `FeedSidebar` — 300×250 box ad

To activate:
1. Apply for AdSense at [adsense.google.com](https://adsense.google.com)
2. Add your publisher script in `app/layout.tsx` `<head>`
3. Replace the placeholder `<div>` elements with your `<ins>` AdSense tags
4. See comments in `FeedPage.tsx → AdSlot()` for exact placement

---

## Environment Variables Reference

| Variable | Where Set | Description |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` + Vercel | Your Convex deployment URL |
| `GROQ_API_KEY` | Convex dashboard env vars | Groq API key for AI companion |
| `AWS_ACCESS_KEY_ID` | Convex dashboard env vars | AWS key for Rekognition |
| `AWS_SECRET_ACCESS_KEY` | Convex dashboard env vars | AWS secret |
| `AWS_REGION` | Convex dashboard env vars | e.g., `us-east-1` |
| `CLOUDFLARE_R2_*` | Convex dashboard env vars | R2 media storage credentials |

---

## Scaling Notes

- **Convex free tier**: No user limits, no pausing, 1M function calls/month, 8GB storage. Very generous for early traffic.
- **Convex paid tier**: $25/month → 25M function calls, 32GB storage. Good for 100K+ MAU.
- **Groq free tier**: 6,000 requests/day, 500K tokens/minute. Will be enough for early companion usage.
- **Video chat**: Zero server cost at any scale (peer-to-peer). STUN servers are free. Only add TURN if you see complaints about failed video connections.
- **Images**: Cloudflare R2 free tier covers 10GB. After that, $0.015/GB — virtually nothing.

---

## Roadmap Ideas

- [x] Optional account creation with username
- [x] Shadow Frequencies (Direct Messaging)
- [x] Void Polls & Shadow Moods
- [x] Void Karma & Engagement Metrics
- [ ] Push notifications for confession replies (PWA)
- [ ] Confession "rooms" / topic threads
- [ ] Moderation admin dashboard
- [ ] Mobile app (React Native / Expo)

---

## Legal Notes

- Age gate is client-side only (localStorage). Consider adding server-side checks for legal compliance in your region.
- You are responsible for GDPR/NDPR compliance — IP-based location data counts as personal data under Nigerian NDPR.
- Content moderation is your responsibility as platform operator. The keyword filter is a starting point, not a complete solution.
- Consult a lawyer before launching publicly — anonymous platforms have specific legal obligations in different jurisdictions.

---

Built with Next.js 14 · Convex · Groq · WebRTC · Tailwind CSS
