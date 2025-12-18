import { createClient } from '@supabase/supabase-js'

// Load env variables without top-level await; fall back gracefully if dotenv is missing
function loadEnvSync() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require('dotenv')
    dotenv.config({ path: '.env.local' })
    dotenv.config()
  } catch {
    // ignore if dotenv isn't installed
    console.warn('[test-user-profile] dotenv not installed, relying on process.env')
  }
}
loadEnvSync()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anon || !service) {
  console.error('Missing Supabase env vars. Ensure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const [,, userIdArg] = process.argv
if (!userIdArg) {
  console.error('Usage: npm run test-profile -- <USER_ID_UUID>')
  process.exit(1)
}

async function main() {
  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('Testing user profile queries for user:', userIdArg)

  const { data: profile, error: pErr } = await admin
    .from('user_profiles')
    .select('*')
    .eq('id', userIdArg)
    .single()

  console.log('\nDirect profile query:')
  console.log('error:', pErr || null)
  console.log('data:', profile || null)

  const { data: withOrg, error: jErr } = await admin
    .from('user_profiles')
    .select('id, organization_id, role, organizations(*)')
    .eq('id', userIdArg)
    .single()

  console.log('\nProfile with organization join:')
  console.log('error:', jErr || null)
  console.log('data:', withOrg || null)

  // Simulate what the browser client would see under RLS using anon key
  const browser = createClient(url, anon)
  const { data: rlsProfile, error: rlsErr } = await browser
    .from('user_profiles')
    .select('id, organization_id, role')
    .eq('id', userIdArg)
    .single()

  console.log('\nRLS (anon) profile read (will likely fail unless run with a session):')
  console.log('error:', rlsErr || null)
  console.log('data:', rlsProfile || null)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
