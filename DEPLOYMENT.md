# Personal OS Stage 1 — Deployment Guide

## What This Is

The Stage 1 rebuild of your Personal OS. Replaces the 5 hardcoded areas with the 12-aspect architecture (Career, Health, Spiritual, Fitness, Finance, Personal Development, Travel, Relationships, Reflections & Questions, Compass, Lifestyle, Contribution & Impact).

Existing data is archived (not deleted). The system starts fresh with empty aspects you fill in deliberately.

---

## Deployment Steps

### 1. Run the migration in Supabase

- Open Supabase → SQL Editor → New query
- Paste the entire contents of `migration.sql`
- Click Run

This will:
- Drop the old tables from the previous version (there's no real data to lose)
- Create 15 new tables for the v2 architecture
- Seed the 12 named aspects (empty)

You will see a warning about destructive operations. Click "Run anyway" — this is the clean start you wanted.

### 2. Update files on GitHub

Your existing GitHub repo `AaronBlackSheepAI/personal-os` needs to be updated. You have two choices:

**Option A (safest): Delete and recreate the repo**
1. GitHub → personal-os → Settings → Delete repository
2. Create a fresh repository named `personal-os`
3. Upload all files from this `personal-os-stage1` folder

**Option B: Replace files in-place**
For each file in this folder, replace the corresponding file in your GitHub repo. Delete any files in the repo that don't exist in this folder.

### 3. Verify Vercel connection

- If you used Option A, you'll need to reconnect Vercel:
  - Vercel → Add New Project → Import → select your new `personal-os` repo
  - Add the same environment variables as before (see below)
  - Deploy

- If you used Option B, Vercel will auto-redeploy when you push to GitHub

### 4. Environment variables (no changes from before)

All 7 stay the same:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `YOUR_CHAT_ID`

Plus the cron secret (if you haven't added it):
- `CRON_SECRET` — any long random string

### 5. Verify the Telegram webhook

If your Vercel URL changed, re-set the webhook in your browser (replace TOKEN and URL):

```
https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=https://YOUR_VERCEL_URL/api/telegram
```

If the URL is the same, the existing webhook still works.

### 6. Test

Send `/status` to your bot. You should see all 12 aspects listed under Doing, Inner, and Derived.

Open your dashboard. You should see the 12 aspect cards organised by type.

---

## First Use

The aspects start empty. Begin by:

1. **Open Compass first.** Write what you believe, what your purpose is, what your mission is right now, and your standpoints. This anchors everything.

2. **Define Lifestyle's default.** Write a description of how your time, energy, sleep, work, rest, relationships, body, and creativity ideally flow when nothing is on fire.

3. **Fill in 2-3 doing aspects you're most active in.** Their meaning, achievement goal, current struggle. Add a couple of jobs to each. Set the Vision Board.

4. **Don't try to fill everything at once.** Some aspects will be dormant. That's fine.

The system will start sending you a daily question at 07:00 UTC tomorrow. Sunday at 08:00 UTC you'll get your first Weekly Map. Use `/decide` when a real decision is in front of you.

---

## What Stage 2 Will Add (after 2 weeks of use)

- Per-aspect AI training profiles (tune how the engines treat each aspect)
- The Resonance Reader on entries (the "what I heard underneath" feature)
- Engine adaptation by aspect type
- "You misread me" feedback applied to refine the engines
- Atypical period flagging integrated into all engines
- Custom field intelligence (engines read your custom fields)

Use Stage 1 for two weeks. See what you actually find yourself wanting. Then Stage 2 builds on top.

---

## File Structure

```
personal-os-stage1/
├── migration.sql              ← Run in Supabase first
├── package.json
├── next.config.js
├── vercel.json                ← Cron schedules
├── lib/
│   ├── helpers.js             ← Shared functions
│   └── supabase.js
└── pages/
    ├── index.js               ← Main dashboard (12 aspects)
    ├── jobs.js                ← Cross-aspect Jobs Pool
    ├── diary.js               ← Chronological log
    ├── maps.js                ← Weekly Maps
    ├── decisions.js           ← Decisions ledger
    ├── settings.js            ← Export + suggestions
    ├── aspect/
    │   └── [id].js            ← Single aspect with all surfaces
    └── api/
        ├── telegram.js        ← Webhook + commands
        └── cron/
            ├── daily-question.js
            ├── weekly-map.js
            └── decision-revisits.js
```
