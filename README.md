# NAVCOM Operations System — Setup Guide

## What you need (all free)
- A **Supabase** account → supabase.com
- A **Vercel** account → vercel.com
- A **GitHub** account → github.com

---

## STEP 1 — Set up Supabase (5 minutes)

1. Go to **supabase.com** and sign up (free)
2. Click **New Project** → give it the name `navcom-ops`
3. Choose a region closest to your team (e.g. Singapore or Frankfurt)
4. Set a database password — save it somewhere
5. Wait about 2 minutes for the project to be ready

**Run the database schema:**
6. In your Supabase project, go to **SQL Editor** (left sidebar)
7. Click **New query**
8. Open the file `src/schema.sql` from this folder
9. Paste the entire contents into the SQL editor
10. Click **Run** — you should see "Success"

**Get your API keys:**
11. Go to **Project Settings** → **API**
12. Copy:
    - **Project URL** (looks like: https://abc123.supabase.co)
    - **anon/public key** (long string starting with eyJ...)

---

## STEP 2 — Upload to GitHub (3 minutes)

1. Go to **github.com** and create a new repository called `navcom-ops`
2. Make it **Private**
3. Upload all files from this folder to the repository
   (Drag and drop the entire navcom-app folder contents)

---

## STEP 3 — Deploy to Vercel (3 minutes)

1. Go to **vercel.com** and sign up with your GitHub account
2. Click **Add New Project**
3. Import your `navcom-ops` repository
4. Under **Environment Variables**, add these two:
   - Name: `REACT_APP_SUPABASE_URL`  
     Value: your Supabase Project URL
   - Name: `REACT_APP_SUPABASE_ANON_KEY`  
     Value: your Supabase anon key
5. Click **Deploy**
6. Wait about 2 minutes — Vercel will give you a URL like:
   `https://navcom-ops.vercel.app`

**That's your live link. Share it with your team.**

---

## STEP 4 — Share with the team

Send your team the Vercel URL and tell them:
- Open it on phone or desktop browser
- Select their name from the login screen
- No password needed for now (you can add passwords later)

---

## What each person sees

| Person | Access |
|--------|--------|
| Marie | Everything + director toggles |
| Jordan | Everything + Jordan-off toggle + confirm invoices |
| Banseh / Lely | Cases, Rawabi, RFQs, Night Log, Invoices |
| Jose | Cases, Night Log (can post entries), Rawabi |
| Lea | Dashboard, RFQ Tracker, Cases, Team |
| Haslinda / Veronica | Dashboard, Procurement, Cases, Team |
| Ayu / Aimy | Dashboard, Invoices, Cases, Team |

---

## Real-time sync

All changes are **instant across all devices**. When Banseh updates a case stage,
Jordan and Marie see it change in real time without refreshing.

The **Jordan Off** and **Rawabi Quiet** toggles in the top bar are also synced —
if Jordan turns on "Jordan off" on his phone, everyone on their screens sees
the orange banner appear immediately.

---

## Adding passwords later (optional)

If you want each person to have their own password, Supabase has a built-in
Auth system. Reply to the chat and I can add this for you.

---

## Need help?

If you get stuck on any step, take a screenshot and share it — I can troubleshoot.
