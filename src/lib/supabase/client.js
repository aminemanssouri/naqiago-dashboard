"use client"

import { createBrowserClient } from '@supabase/ssr'

let browserClient = null

/**
 * Get Supabase client for browser/client components
 * Uses singleton pattern to avoid creating multiple clients
 */
export function createClient() {
  if (browserClient) return browserClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    return null
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseKey)
  return browserClient
}

/**
 * Check if Supabase is properly configured
 */
export function isConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * Get the current session from the browser client
 */
export async function getSession() {
  const client = createClient()
  if (!client) return null

  try {
    const { data: { session }, error } = await client.auth.getSession()
    if (error) {
      console.warn('⚠️ Error getting session:', error.message)
      return null
    }
    return session
  } catch (err) {
    console.warn('⚠️ Failed to get session:', err.message)
    return null
  }
}

/**
 * Get the current user from the browser client
 */
export async function getUser() {
  const client = createClient()
  if (!client) return null

  try {
    const { data: { user }, error } = await client.auth.getUser()
    if (error) {
      console.warn('⚠️ Error getting user:', error.message)
      return null
    }
    return user
  } catch (err) {
    console.warn('⚠️ Failed to get user:', err.message)
    return null
  }
}
