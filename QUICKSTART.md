# Quick Start Guide

Get Lexa DB up and running in 10 minutes!

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier is fine)
- An OpenAI API key

## Step 1: Install Dependencies (2 minutes)

```bash
npm install
```

## Step 2: Set Up Supabase (3 minutes)

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to Settings → API and copy:
   - Project URL
   - `anon` public key
   - `service_role` key (keep secret!)
3. Go to SQL Editor and run the schema from `supabase/schema.sql`

## Step 3: Configure Environment (1 minute)

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

## Step 4: Create Initial Data (2 minutes)

In Supabase dashboard:

### Create Organization
1. Go to Table Editor → `organizations`
2. Insert row: `name = "My Organization"`
3. Copy the generated UUID

### Create Admin User
1. Go to Authentication → Users
2. Add user with your email
3. Go to Table Editor → `user_profiles`
4. Edit your user row:
   - `organization_id` = paste organization UUID
   - `role` = `admin`

## Step 5: Run the App (1 minute)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Step 6: Test It Out (1 minute)

1. Log in with your credentials
2. Go to `/admin` (or click Admin in header if available)
3. Upload a test document:
   - Title: "Test Legislation"
   - Type: Legislation
   - Content: "This is a test law about testing. All tests must pass."
   - Tags: "test, sample"
4. Go back to `/chat`
5. Ask: "What are the laws about testing?"
6. See your document appear as a source!

## What's Next?

- Read [docs/SETUP.md](docs/SETUP.md) for detailed setup instructions
- Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) to understand the system
- Read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production deployment
- Read [docs/API.md](docs/API.md) for API documentation

## Common Issues

**"Failed to fetch"**
- Check your Supabase URL and keys in `.env.local`
- Make sure your Supabase project is active

**"User not associated with an organization"**
- Check that your user profile has an `organization_id` set
- Verify in Supabase Table Editor → `user_profiles`

**No documents showing up**
- Verify the document's `organization_id` matches your user's organization
- Check RLS policies are set up correctly

**AI not responding**
- Verify your OpenAI API key is correct
- Check you have credits in your OpenAI account
- Look at server console for error messages

## Support

Need help? Check the [README.md](README.md) or review the documentation in the `docs/` folder.
