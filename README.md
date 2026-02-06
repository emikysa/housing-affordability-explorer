# Housing Affordability Framework

A web application for exploring housing cost elements, reduction opportunities, barriers, and the actors who control them.

## Project Structure

```
HousingAffordabilityFramework/
├── database/           # PostgreSQL schema and migrations
│   └── 001_schema.sql  # Full database schema for Supabase
├── loader/             # Python data loader
│   ├── load_data.py    # Script to load Excel data into Supabase
│   ├── requirements.txt
│   └── .env.example
├── frontend/           # React + AG Grid application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Page components
│   │   ├── hooks/      # Data fetching hooks
│   │   ├── types/      # TypeScript type definitions
│   │   └── lib/        # Supabase client
│   └── ...
└── Housing-Affordability-Framework-MASTER*.xlsx  # Source data
```

## Quick Start Guide

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click "New Project" and fill in:
   - **Organization**: Create one or use existing
   - **Name**: `housing-affordability` (or your choice)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you
3. Click "Create new project" and wait for setup (~2 minutes)

### Step 2: Run Database Schema

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy the entire contents of `database/001_schema.sql`
4. Paste into the editor
5. Click **Run** (or Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" - this is correct!

### Step 3: Get Your API Keys

1. Go to **Settings** → **API** (left sidebar)
2. Copy these values (you'll need them):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public** key (under "Project API keys")
   - **service_role** key (keep this secret!)

### Step 4: Load Data from Excel

```bash
cd loader

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials:
#   SUPABASE_URL=https://your-project.supabase.co
#   SUPABASE_SERVICE_KEY=your-service-role-key
#   EXCEL_FILE_PATH=../Housing-Affordability-Framework-MASTER*.xlsx

# Run the loader
python load_data.py
```

### Step 5: Run Frontend Locally

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env:
#   VITE_SUPABASE_URL=https://your-project.supabase.co
#   VITE_SUPABASE_ANON_KEY=your-anon-public-key

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

### Step 6: Deploy Frontend

#### Option A: Vercel (Recommended - Free)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "New Project" → Import your repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Environment Variables**: Add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
5. Click Deploy

#### Option B: Netlify (Also Free)

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com) and sign in
3. Click "Add new site" → "Import an existing project"
4. Connect to GitHub and select your repo
5. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
6. Add environment variables in Site settings → Environment variables
7. Deploy

#### Option C: Self-hosted on IONOS

1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Upload the `dist/` folder to your IONOS hosting
3. Configure your web server (Apache/nginx) to serve the files
4. For SPA routing, add rewrite rules to redirect all routes to index.html

## Features

- **Dashboard**: Overview with charts showing cost distribution and barrier analysis
- **Cost Elements**: Browse all cost components (Build, Operate, Finance)
- **Reduction Opportunities**: Explore ways to reduce costs with estimated savings
- **Barriers & Levers**: Understand what blocks cost reductions and how to address them
- **Actors**: See who controls each cost element and their policy levers
- **Relationships**: Explore connections between all entities

## Data Model

```
Cost Elements (24) ←→ Actors (13)
      ↑
      |
CROs (28) ←→ Barriers (71)
```

- **Cost Elements**: Individual cost line items (land, permits, labor, etc.)
- **CROs**: Cost Reduction Opportunities with estimated savings
- **Barriers**: What prevents cost reductions (rules, practices, political, etc.)
- **Actors**: Who controls costs (local government, utilities, builders, etc.)

## Security

- Row-Level Security (RLS) enabled on all tables
- Public read access for all data (appropriate for public dataset)
- Write operations restricted (require service role key)
- API keys split: public `anon` key for frontend, secret `service_role` for data loading

## Future Enhancements

- [ ] User authentication for scenario creation
- [ ] Custom scenario builder with adjustable parameters
- [ ] Export functionality (CSV, PDF reports)
- [ ] Comparison view between scenarios
- [ ] Admin interface for data management

## Troubleshooting

### "Missing Supabase environment variables"
- Check that `.env` file exists and has correct values
- Make sure variable names match exactly (`VITE_SUPABASE_URL`, etc.)

### Data not loading
- Check browser console for errors
- Verify RLS policies are set up (run schema SQL)
- Check Supabase dashboard → Table Editor to see if data exists

### "relation does not exist"
- Schema wasn't run - go to SQL Editor and run `001_schema.sql`

### CORS errors
- Your Supabase project URL might be wrong
- Check that frontend is using `anon` key, not `service_role` key
