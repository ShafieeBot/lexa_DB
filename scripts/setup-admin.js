#!/usr/bin/env node

/**
 * Setup Admin User Script
 * 
 * This script helps you create an admin user for the Lexa DB system.
 * Run this after:
 * 1. Creating a Supabase project
 * 2. Running the schema.sql migration
 * 3. Creating a user in Supabase Authentication
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log('\n🚀 Lexa DB Admin Setup\n');
  console.log('This script will help you create an admin user.\n');

  // Get Supabase credentials from env
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase credentials in .env.local');
    console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Step 1: Check if organizations table exists
    console.log('📋 Checking database schema...');
    const { data: tables, error: schemaError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (schemaError) {
      console.error('\n❌ Error: Database schema not found.');
      console.error('   Please run the schema.sql migration in Supabase first.');
      console.error('   Error:', schemaError.message);
      process.exit(1);
    }

    console.log('✅ Database schema found\n');

    // Step 2: Create or get organization
    console.log('📁 Setting up organization...');
    const orgName = await question('Enter organization name (e.g., "My Law Firm"): ');

    let organizationId;
    const { data: existingOrgs } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1);

    if (existingOrgs && existingOrgs.length > 0) {
      console.log(`\nℹ️  Found existing organization: ${existingOrgs[0].name}`);
      const useExisting = await question('Use this organization? (y/n): ');
      
      if (useExisting.toLowerCase() === 'y') {
        organizationId = existingOrgs[0].id;
        console.log(`✅ Using existing organization: ${existingOrgs[0].name}`);
      }
    }

    if (!organizationId) {
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName })
        .select()
        .single();

      if (orgError) {
        console.error('❌ Error creating organization:', orgError.message);
        process.exit(1);
      }

      organizationId = newOrg.id;
      console.log(`✅ Created organization: ${orgName} (${organizationId})`);
    }

    // Step 3: Get user email
    console.log('\n👤 Setting up admin user...');
    const userEmail = await question('Enter admin user email: ');

    // Check if user exists in auth
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error fetching users:', listError.message);
      process.exit(1);
    }

    const authUser = authUsers.users.find(u => u.email === userEmail);

    if (!authUser) {
      console.error(`\n❌ Error: No user found with email ${userEmail}`);
      console.log('\nPlease create the user first:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to Authentication > Users');
      console.log('3. Click "Add user" and create a user with this email');
      console.log('4. Run this script again');
      process.exit(1);
    }

    console.log(`✅ Found auth user: ${authUser.email} (${authUser.id})`);

    // Step 4: Create or update user profile
    const fullName = await question('Enter full name: ');

    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          organization_id: organizationId,
          role: 'admin',
          full_name: fullName
        })
        .eq('id', authUser.id);

      if (updateError) {
        console.error('❌ Error updating user profile:', updateError.message);
        process.exit(1);
      }

      console.log('✅ Updated existing user profile to admin');
    } else {
      // Create new profile
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: authUser.id,
          organization_id: organizationId,
          role: 'admin',
          full_name: fullName
        });

      if (insertError) {
        console.error('❌ Error creating user profile:', insertError.message);
        process.exit(1);
      }

      console.log('✅ Created admin user profile');
    }

    console.log('\n✨ Setup complete!\n');
    console.log('You can now:');
    console.log('1. Start the dev server: npm run dev');
    console.log('2. Navigate to http://localhost:3000');
    console.log(`3. Login with ${userEmail}`);
    console.log('4. Access the admin dashboard at /admin\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
