import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

/**
 * Create Supabase client for middleware
 * Handles session refresh automatically via cookies
 */
export async function updateSession(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env vars are missing, just continue without auth
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase not configured - skipping auth middleware')
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh session if expired - this updates cookies automatically
  const { data: { user } } = await supabase.auth.getUser()

  return { supabaseResponse, user, supabase }
}
