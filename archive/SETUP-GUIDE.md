# 🏐 Volleyball Stat Tracker - Quick Setup Guide

## ✅ What's Been Done

Your application is ready to deploy! Here's what's completed:

### Files Created:
1. ✅ **index.html** - Landing page with 3 options (Start Match, Resume, Analyze)
2. ✅ **volleyball-tracker.html** - Updated tracker with database integration
3. ✅ **config.js** - Supabase configuration (credentials already added)
4. ✅ **supabase-setup.sql** - Database creation script
5. ✅ **netlify.toml** - Netlify deployment configuration
6. ✅ **README.md** - Complete documentation
7. ✅ **database-schema-final.json** - Database structure reference

### Features Implemented:
- ✅ Landing page with match creation flow
- ✅ Opponent name input with validation
- ✅ Tournament name input (optional)
- ✅ Database integration (Supabase)
- ✅ Auto-save player stats to database
- ✅ Save set scores to database
- ✅ Finish Match button (marks match complete)
- ✅ Reset and Delete Match button (deletes all data)
- ✅ Team names (Eclipse hardcoded, opponent loaded from DB)
- ✅ Match ID passed via URL parameter
- ✅ Data persistence across devices

---

## 🚀 NEXT STEPS - Setup Instructions

### STEP 1: Set Up Supabase Database (5 minutes)

1. **Go to your Supabase project:**
   - URL: https://supabase.com/dashboard/project/qctyagqmtkjozvpgzinn

2. **Open SQL Editor:**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Run the setup script:**
   - Open file: `supabase-setup.sql`
   - Copy ALL the contents
   - Paste into SQL editor
   - Click "Run" button

4. **Verify tables created:**
   - Click "Table Editor" in left sidebar
   - You should see 3 tables:
     - ✅ matches
     - ✅ set_scores
     - ✅ player_stats

---

### STEP 2: Test Locally (5 minutes)

Choose ONE option:

**Option A - Python (Easiest):**
```bash
# Navigate to your project folder
cd /path/to/volleyball-tracker

# Start server
python -m http.server 8000

# Open browser to:
http://localhost:8000
```

**Option B - Node.js:**
```bash
# Install serve (first time only)
npm install -g serve

# Navigate to project folder
cd /path/to/volleyball-tracker

# Start server
serve

# Open the URL shown
```

**Test the following:**
- [ ] Click "Start a New Match"
- [ ] Enter opponent name (e.g., "Valley High")
- [ ] Enter tournament (e.g., "Spring Invitational") or leave blank
- [ ] Click OK
- [ ] Verify you're taken to volleyball-tracker.html
- [ ] Click some scoring buttons
- [ ] Click a player name and record an outcome
- [ ] Click "Save Set Score"
- [ ] Go to Supabase → Table Editor → Check that data appears in tables

---

### STEP 3: Deploy to Netlify (10 minutes)

#### 3A. Create GitHub Repository

```bash
# Initialize git in project folder
cd /path/to/volleyball-tracker
git init

# Add all files
git add .

# Make first commit
git commit -m "Initial commit - Volleyball Tracker v2.0"

# Create repository on GitHub:
# 1. Go to https://github.com/new
# 2. Name: volleyball-tracker
# 3. Make it Public or Private
# 4. Do NOT initialize with README
# 5. Click "Create repository"

# Connect and push
git remote add origin https://github.com/YOUR_USERNAME/volleyball-tracker.git
git branch -M main
git push -u origin main
```

#### 3B. Deploy on Netlify

1. **Go to Netlify:**
   - Visit: https://app.netlify.com
   - Sign in with GitHub

2. **Import project:**
   - Click "Add new site" → "Import an existing project"
   - Choose "GitHub"
   - Authorize Netlify to access your repositories
   - Select `volleyball-tracker` repository

3. **Configure deployment:**
   - Build command: (leave empty)
   - Publish directory: `.` (just a period/dot)
   - Click "Deploy site"

4. **Wait for deployment:**
   - Takes about 1-2 minutes
   - Green checkmark = success!

5. **Get your URL:**
   - Netlify assigns a random URL like:
     `https://wonderful-name-123456.netlify.app`
   - This is your live app!

6. **Customize URL (Optional):**
   - Site settings → Domain management
   - Click "Options" → "Edit site name"
   - Change to: `desmoines-eclipse-volleyball`
   - New URL: `https://desmoines-eclipse-volleyball.netlify.app`

---

### STEP 4: Test Production Site (5 minutes)

Open your Netlify URL and test:

- [ ] Start a new match
- [ ] Enter opponent and tournament
- [ ] Track some scores
- [ ] Record player attacks
- [ ] Save a set
- [ ] Check Supabase to verify data saved
- [ ] Try on mobile device
- [ ] Try from different device (should see same data)

---

## 📱 Share With Your Team

Once deployed, share the URL with your team:

```
🏐 Des Moines Eclipse Stat Tracker
https://your-site-name.netlify.app

Use this to:
- Track live match stats
- View player statistics
- Access from any device
```

---

## 🎯 What Each File Does

| File | Purpose |
|------|---------|
| index.html | Landing page - start/resume/analyze matches |
| volleyball-tracker.html | Main stat tracking interface |
| config.js | Supabase connection settings (already configured) |
| supabase-setup.sql | Creates database tables (run once in Supabase) |
| netlify.toml | Tells Netlify how to deploy |
| README.md | Full documentation |
| database-schema-final.json | Database structure reference |

---

## ❓ Troubleshooting

### "Error loading match"
- **Fix**: Make sure you ran supabase-setup.sql in SQL Editor
- Check config.js has correct Supabase URL/key

### Data not saving
- **Fix**: Check browser console (F12) for errors
- Verify internet connection
- Check Supabase project is not paused

### Can't test locally
- **Fix**: Must use HTTP server (python/serve), not double-click HTML
- File:// URLs won't work due to CORS

### Netlify deployment failed
- **Fix**: Check all files are in GitHub repo
- Verify netlify.toml is in root folder
- Review deploy logs in Netlify

---

## 🎉 You're Done!

Your volleyball stat tracker is ready to use! 

**Next Steps:**
1. ✅ Set up database (Step 1)
2. ✅ Test locally (Step 2)
3. ✅ Deploy to Netlify (Step 3)
4. ✅ Share with team!

**Future Features (Coming Soon):**
- Resume Match functionality
- Analytics Dashboard
- Multi-team support

---

Questions? Check the full README.md for detailed documentation.

Good luck with your season! 🏐
