import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Get Supabase client for server components and API routes
 * Creates a new client for each request (stateless)
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    return null
  }

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // setAll is called from Server Component - ignore
        }
      },
    },
  })
}

/**
 * Get the current session from server
 */
export async function getSession() {
  const client = await createClient()
  if (!client) return null

  try {
    const { data: { session }, error } = await client.auth.getSession()
    if (error) return null
    return session
  } catch {
    return null
  }
}

/**
 * Get the current user from server
 */
export async function getUser() {
  const client = await createClient()
  if (!client) return null

  try {
    const { data: { user }, error } = await client.auth.getUser()
    if (error) return null
    return user
  } catch {
    return null
  }
}
