# Setup Guide for Lexa DB

This guide will walk you through setting up the Lexa DB legal research system from scratch.

## Prerequisites

Before you begin, ensure you have:
- Node.js 18.x or higher installed
- npm or yarn package manager
- A Supabase account (free tier is fine)
- An OpenAI API key (with GPT-4 access)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Supabase

### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in your project details:
   - Name: `lexa-db`
   - Database Password: (choose a strong password)
   - Region: (select closest to you)
5. Wait for the project to be created (takes ~2 minutes)

### 2.2 Get Your Supabase Credentials

1. In your Supabase dashboard, click on "Settings" (gear icon)
2. Click on "API" in the sidebar
3. Copy the following values:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public** key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role** key (`SUPABASE_SERVICE_ROLE_KEY`) - keep this secret!

### 2.3 Run Database Migrations

1. In your Supabase dashboard, click on "SQL Editor"
2. Click "New Query"
3. Copy the entire contents of `/supabase/schema.sql`
4. Paste into the query editor
5. Click "Run" to execute the migration
6. Verify there are no errors

### 2.4 Configure Storage

1. In Supabase dashboard, go to "Storage"
2. Create a new bucket called `documents`
3. Make it private (default)
4. Add the following RLS policy to the bucket:
   - Policy name: `Users can view org documents`
   - Allowed operations: SELECT
   - Policy definition:
     ```sql
     bucket_id = 'documents' AND (storage.foldername(name))[1] IN (
       SELECT organization_id::text FROM user_profiles WHERE id = auth.uid()
     )
     ```

## Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and fill in your values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   OPENAI_API_KEY=sk-your_openai_key_here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

## Step 4: Set Up Initial Organization and Admin User

### 4.1 Create Organization

1. In Supabase dashboard, go to "Table Editor"
2. Select the `organizations` table
3. Click "Insert row"
4. Fill in:
   - `name`: Your organization name (e.g., "My Law Firm")
5. Click "Save"
6. Copy the generated UUID (you'll need this)

### 4.2 Create Admin User

1. In Supabase dashboard, go to "Authentication" > "Users"
2. Click "Add user"
3. Fill in:
   - Email: your admin email
   - Password: choose a strong password
   - Auto Confirm User: Yes
4. Click "Create user"
5. Copy the user's UUID

### 4.3 Link User to Organization

1. Go to "Table Editor" > `user_profiles`
2. Find the row for your admin user (matches the UUID)
3. Click to edit
4. Fill in:
   - `organization_id`: Paste the organization UUID from step 4.1
   - `role`: Change to `admin`
   - `full_name`: Your name
5. Click "Save"

## Step 5: Run the Development Server

```bash
npm run dev
```

The application should now be running at [http://localhost:3000](http://localhost:3000)

## Step 6: First Login and Test

1. Open [http://localhost:3000](http://localhost:3000)
2. You should be redirected to the login page
3. Log in with your admin credentials
4. You should be redirected to the chat interface

## Step 7: Upload Your First Document

1. Navigate to `/admin` or click "Admin" in the header
2. Go to the "Documents" tab
3. Click "Upload Document"
4. Fill in the document details:
   - Title: "Test Legislation"
   - Document Type: "Legislation"
   - Content: Add some sample legal text
   - Tags: "test, sample"
5. Click "Upload"

## Step 8: Test the Chat

1. Navigate back to `/chat`
2. Type a question related to your uploaded document
3. The system should:
   - Show the document as a source on the right
   - Generate an answer based on the document content

## Troubleshooting

### Database Connection Issues

If you see "Failed to fetch" or connection errors:
- Verify your Supabase URL and keys are correct in `.env.local`
- Check that your Supabase project is running (not paused)
- Ensure RLS policies are correctly set up

### Authentication Issues

If login doesn't work:
- Verify the user exists in Supabase Authentication
- Check that the user profile exists in `user_profiles` table
- Ensure `organization_id` is set for the user

### OpenAI API Issues

If queries don't generate answers:
- Verify your OpenAI API key is correct
- Check that you have sufficient credits in your OpenAI account
- Look at the server console for error messages

### No Documents Showing

If uploaded documents don't appear:
- Check that the document's `organization_id` matches your user's organization
- Verify RLS policies allow your user to see documents
- Check the browser console for errors

## Next Steps

### Add More Users

1. Go to Admin > Users
2. Invite new users via email
3. They will receive an invite to create their account
4. New users will automatically be assigned to your organization

### Customize the System

- Modify the document categories in the database
- Adjust the AI prompts in `/src/lib/ai/openai.ts`
- Customize the UI components in `/src/components`

### Deploy to Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.

## Support

For issues or questions:
- Check the [README.md](../README.md) for general information
- Review the [API documentation](./API.md)
- Check Supabase and OpenAI documentation for their respective services
