# Step-by-Step Setup Guide

This guide walks you through setting up the Housing Affordability Framework from scratch.

---

## Prerequisites

- A web browser
- Python 3.8+ installed
- Node.js 18+ installed
- A GitHub account (for deployment)

---

## Part 1: Supabase Setup (Database & API)

### 1.1 Create Account

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (easiest) or email

### 1.2 Create Project

1. Click "New Project"
2. Fill in the form:
   - **Organization**: Click "New organization" if needed, name it anything
   - **Project name**: `housing-affordability`
   - **Database Password**: Click "Generate a password" and **SAVE THIS SOMEWHERE SAFE**
   - **Region**: Pick the one closest to you (e.g., "East US" for East Coast)
3. Click "Create new project"
4. Wait 1-2 minutes for provisioning

### 1.3 Run Database Schema

1. In left sidebar, click "SQL Editor"
2. Click "New query" (top right)
3. Open the file `database/001_schema.sql` from this project
4. Copy ALL the contents (Cmd/Ctrl+A, Cmd/Ctrl+C)
5. Paste into the Supabase SQL editor
6. Click the green "Run" button (or Cmd/Ctrl+Enter)
7. Wait for "Success. No rows returned" message

### 1.4 Get Your API Keys

1. In left sidebar, click "Settings" (gear icon at bottom)
2. Click "API" in the submenu
3. You'll see:
   ```
   Project URL: https://abcd1234.supabase.co

   Project API Keys:
   - anon public: eyJhbGciOi...
   - service_role: eyJhbGciOi... (click to reveal)
   ```
4. Copy these three values to a text file - you'll need them soon

---

## Part 2: Load Data from Excel

### 2.1 Set Up Python Environment

Open Terminal and run:

```bash
# Navigate to the loader folder
cd /Users/emikysa/Claude/HousingAffordabilityFramework/loader

# Create a virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Install required packages
pip install -r requirements.txt
```

### 2.2 Configure Environment

```bash
# Copy the example file
cp .env.example .env

# Open in your text editor
open .env
# Or: nano .env
# Or: code .env (if you have VS Code)
```

Edit `.env` to look like this (use YOUR values from Step 1.4):

```
SUPABASE_URL=https://abcd1234.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-service-role-key...
EXCEL_FILE_PATH=../Housing-Affordability-Framework-MASTER 2026-01-30-1120T_DBReady.xlsx
```

**Important**: Use the `service_role` key (not `anon`), and keep it secret!

### 2.3 Run the Loader

```bash
# Make sure you're in the loader folder with venv activated
python load_data.py
```

You should see output like:
```
============================================================
Housing Affordability Framework - Data Loader
============================================================

Connecting to Supabase: https://abcd1234.supabase.co
Loading Excel file: ../Housing-Affordability-Framework-MASTER*.xlsx
  Loaded 1) Cost Elements: 24 rows
  Loaded 2) Reduction Opportunities: 28 rows
  ...

Loading controlled vocabularies...
  Loaded stages: 4 records
  Loaded barrier_types: 6 records
  ...

Loading cost elements...
  Loaded cost_elements: 24 records

...

============================================================
Data loading complete!
============================================================
```

### 2.4 Verify Data in Supabase

1. Go back to Supabase dashboard
2. Click "Table Editor" in left sidebar
3. You should see tables listed with data:
   - `cost_elements` (24 rows)
   - `barriers` (71 rows)
   - `cost_reduction_opportunities` (28 rows)
   - etc.

---

## Part 3: Run Frontend Locally

### 3.1 Install Dependencies

```bash
# Navigate to frontend folder
cd /Users/emikysa/Claude/HousingAffordabilityFramework/frontend

# Install npm packages
npm install
```

### 3.2 Configure Environment

```bash
# Copy example file
cp .env.example .env

# Edit it
open .env
```

Edit `.env` to look like this (use YOUR values):

```
VITE_SUPABASE_URL=https://abcd1234.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-anon-key...
```

**Important**: Use the `anon public` key here (not service_role). This key is safe to expose in the browser.

### 3.3 Start Development Server

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

### 3.4 View the App

1. Open http://localhost:3000 in your browser
2. You should see the Dashboard with:
   - Summary stats (24 Cost Elements, 28 CROs, etc.)
   - Charts showing cost distribution
   - Navigation to explore data

---

## Part 4: Deploy to Production

### Option A: Vercel (Recommended)

#### 4A.1 Push to GitHub

```bash
# From project root
cd /Users/emikysa/Claude/HousingAffordabilityFramework

# Initialize git if not already
git init

# Add files
git add .

# Commit
git commit -m "Initial commit: Housing Affordability Framework"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/housing-affordability-explorer.git
git push -u origin main
```

#### 4A.2 Deploy on Vercel

1. Go to https://vercel.com
2. Click "Sign Up" → "Continue with GitHub"
3. Click "Add New..." → "Project"
4. Find and click your repository
5. Configure:
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: Click "Edit" → type `frontend`
   - Expand "Environment Variables"
   - Add:
     - `VITE_SUPABASE_URL` = your Supabase URL
     - `VITE_SUPABASE_ANON_KEY` = your anon key
6. Click "Deploy"
7. Wait 1-2 minutes
8. You'll get a URL like `https://housing-affordability-xxx.vercel.app`

### Option B: Netlify

#### 4B.1 Push to GitHub (same as 4A.1)

#### 4B.2 Deploy on Netlify

1. Go to https://netlify.com
2. Sign up with GitHub
3. Click "Add new site" → "Import an existing project"
4. Click "GitHub" and authorize
5. Select your repository
6. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
7. Click "Deploy site"
8. Go to Site settings → Environment variables
9. Add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
10. Trigger redeploy: Deploys → Trigger deploy → Deploy site

---

## Troubleshooting

### "npm: command not found"
Install Node.js from https://nodejs.org (LTS version)

### "python3: command not found"
Install Python from https://python.org or via Homebrew: `brew install python`

### "Module not found" errors in Python
Make sure you activated the virtual environment:
```bash
cd loader
source venv/bin/activate
```

### Frontend shows "Loading..." forever
1. Check browser console (F12 → Console tab) for errors
2. Verify your `.env` file has correct values
3. Make sure you used `anon` key, not `service_role`

### "Failed to fetch" or CORS errors
1. Check Supabase URL is correct (no trailing slash)
2. Verify the data was loaded (check Table Editor in Supabase)

### Blank charts on Dashboard
Data might not have loaded. Check:
1. Supabase Table Editor shows data
2. Browser console for errors
3. Network tab shows successful API calls

---

## Next Steps

Once deployed, you can:

1. **Share the URL** with anyone - it's publicly readable
2. **Add custom domain** in Vercel/Netlify settings
3. **Update data** by re-running the loader script
4. **Extend features** by modifying the React code

For questions or issues, check the main README.md or open a GitHub issue.
