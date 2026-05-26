# ⚡ ElectroPro — Complete Setup Guide
*From zero to live in ~20 minutes. All services are FREE.*

---

## What You'll End Up With
- A live website URL (e.g. `https://electropro-yourname.vercel.app`)
- A real cloud database that saves all your data permanently
- Accessible from any phone, tablet, or computer
- Secure — only you can access it

---

## STEP 1 — Create a GitHub Account (stores your code)

1. Go to **github.com**
2. Click **Sign up**
3. Enter email, password, username
4. Verify your email
5. ✅ Done

---

## STEP 2 — Upload Your Code to GitHub

1. After logging in to GitHub, click the **+** button (top right) → **New repository**
2. Name it: `electropro`
3. Set it to **Private** (so only you can see it)
4. Click **Create repository**
5. On the next page, click **uploading an existing file**
6. Upload ALL the files from the `electropro` folder I gave you
   - Make sure to keep the folder structure: `src/App.js`, `src/index.js`, etc.
7. Click **Commit changes**
8. ✅ Your code is now on GitHub

---

## STEP 3 — Create a Supabase Account (your database)

1. Go to **supabase.com**
2. Click **Start your project**
3. Sign up with GitHub (easiest — uses your GitHub account)
4. Click **New Project**
5. Fill in:
   - **Name:** ElectroPro
   - **Database Password:** Choose a strong password — SAVE IT SOMEWHERE SAFE
   - **Region:** Choose the closest to you (e.g. Europe, US East, etc.)
6. Click **Create new project** — wait ~2 minutes for it to set up

---

## STEP 4 — Set Up Your Database Tables

1. In Supabase, click **SQL Editor** (left sidebar, looks like `</>`)
2. Click **New query**
3. Open the file `database.sql` from the files I gave you
4. Copy ALL the text inside it
5. Paste it into the SQL Editor
6. Click **Run** (green button)
7. You should see: *"Success. No rows returned"*
8. ✅ Your database tables are created!

---

## STEP 5 — Get Your Supabase Keys

1. In Supabase, click **Project Settings** (gear icon, bottom left)
2. Click **API**
3. You'll see two important values — copy them somewhere:
   - **Project URL** → looks like `https://abcdefgh.supabase.co`
   - **anon public key** → a long string of letters/numbers

---

## STEP 6 — Deploy to Vercel (makes it a live website)

1. Go to **vercel.com**
2. Click **Sign Up** → **Continue with GitHub**
3. Authorize Vercel to access your GitHub
4. Click **Add New Project**
5. Find your `electropro` repository → click **Import**
6. Before clicking Deploy, click **Environment Variables** and add:

   | Key | Value |
   |-----|-------|
   | `REACT_APP_SUPABASE_URL` | your Project URL from Step 5 |
   | `REACT_APP_SUPABASE_ANON_KEY` | your anon key from Step 5 |

7. Click **Deploy**
8. Wait ~2 minutes
9. ✅ Vercel gives you a live URL like `https://electropro-abc123.vercel.app`

---

## STEP 7 — Open Your App!

1. Click the URL Vercel gives you
2. Your ElectroPro system is LIVE!
3. Bookmark it on your phone and computer
4. Share the URL with your branch managers

---

## 🔒 Is It Safe?

Yes! Here's why:
- **Supabase** uses the same security as banks (PostgreSQL + SSL encryption)
- Your data is backed up automatically every day
- The URL is hard to guess (random characters)
- You can add a **login/password system** later (just ask me and I'll add it)

---

## 📱 Using It on Mobile

- Open the URL in your phone browser (Chrome or Safari)
- Tap the share button → **Add to Home Screen**
- It works like an app on your phone!

---

## ❓ Troubleshooting

**"Cannot connect to database"**
→ Double-check your Supabase URL and key in Vercel Environment Variables

**"Build failed" on Vercel**
→ Make sure all files were uploaded to GitHub correctly

**Data not saving**
→ Make sure you ran the full `database.sql` in Supabase SQL Editor

---

## Need Help?

Come back to Claude and paste the error message — I'll fix it for you!
