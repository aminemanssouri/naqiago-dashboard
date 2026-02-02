import { createClient } from '@supabase/supabase-js'

// ============================================================
// SUPABASE CLIENT WITH AFK-RESILIENT SESSION HANDLING
// ============================================================
// 
// PROBLEM: When user goes AFK (switches tabs, locks screen), the browser
// suspends connections. When they return, Supabase calls hang forever.
//
// SOLUTION:
// 1. Always read session from localStorage first (instant, no network)
// 2. All network calls have strict timeouts
// 3. If network fails but localStorage session is valid, use it
// 4. Background refresh - never block user actions
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
}

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  // Network request timeout (prevents infinite hanging)
  REQUEST_TIMEOUT: 15000, // 15 seconds
  
  // Session refresh timeout (shorter, for quick checks)
  REFRESH_TIMEOUT: 8000, // 8 seconds
  
  // How long before expiry to consider "expiring soon"
  EXPIRY_BUFFER: 60, // 60 seconds
  
  // How long before expiry to trigger background refresh
  REFRESH_THRESHOLD: 300, // 5 minutes
  
  // Max consecutive timeouts before recreating client
  MAX_TIMEOUTS: 2,
}

// ============================================================
// STATE
// ============================================================
let currentClient = null
let consecutiveTimeouts = 0

// ============================================================
// UTILITIES
// ============================================================

// Get localStorage key for Supabase session
const getStorageKey = () => {
  if (!supabaseUrl) return null
  try {
    const hostname = new URL(supabaseUrl).hostname.split('.')[0]
    return `sb-${hostname}-auth-token`
  } catch {
    return null
  }
}

// Wrap any promise with a timeout
const withTimeout = (promise, ms, operation = 'Operation') => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms)
    )
  ])
}

// Custom fetch with timeout (used by Supabase client)
const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
    consecutiveTimeouts++
    console.warn(`⚠️ Request timed out: ${url}`)
  }, CONFIG.REQUEST_TIMEOUT)

  return fetch(url, {
    ...options,
    signal: controller.signal
  })
    .then(response => {
      consecutiveTimeouts = 0 // Reset on success
      return response
    })
    .finally(() => clearTimeout(timeoutId))
}

// ============================================================
// CLIENT CREATION
// ============================================================

const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseKey) return null
  
  console.log('🔧 Creating Supabase client...')
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: fetchWithTimeout
    }
  })
}

// Initialize client
currentClient = createSupabaseClient()

// Recreate client (called when connection is dead)
export const recreateClient = () => {
  console.log('🔄 Recreating Supabase client...')
  currentClient = createSupabaseClient()
  consecutiveTimeouts = 0
  return currentClient
}

// ============================================================
// SESSION MANAGEMENT (THE CORE LOGIC)
// ============================================================

/**
 * Read session directly from localStorage (no network call)
 * This is INSTANT and always works, even when network is dead
 */
export const getSessionFromStorage = () => {
  try {
    const key = getStorageKey()
    if (!key) return null
    
    const stored = localStorage.getItem(key)
    if (!stored) return null
    
    return JSON.parse(stored)
  } catch (err) {
    console.warn('⚠️ Failed to read session from localStorage:', err.message)
    return null
  }
}

/**
 * Check if a session is valid (not expired)
 * @param session - The session object from localStorage
 * @param bufferSeconds - Extra seconds to consider as "expiring soon"
 */
export const isSessionValid = (session, bufferSeconds = 0) => {
  if (!session?.expires_at) return false
  
  const nowSeconds = Math.floor(Date.now() / 1000)
  return session.expires_at > nowSeconds + bufferSeconds
}

/**
 * THE MAIN SESSION CHECK
 * 
 * Called before operations that need auth. Returns session info without blocking.
 * 
 * Strategy:
 * 1. Read localStorage first (instant)
 * 2. If valid, return immediately
 * 3. If expiring soon, trigger background refresh (don't wait)
 * 4. If expired/missing, try network refresh with timeout
 */
export const ensureSession = async () => {
  // Guard: If client is not initialized, return early
  if (!currentClient) {
    console.warn('⚠️ Supabase client not initialized')
    return { valid: false, session: null, source: 'no-client' }
  }
  
  // Step 1: Read from localStorage (instant, no network)
  const storedSession = getSessionFromStorage()
  
  // Step 2: Check validity
  if (storedSession) {
    // Session valid for more than the buffer time
    if (isSessionValid(storedSession, CONFIG.EXPIRY_BUFFER)) {
      console.log('✅ Session valid (from localStorage)')
      
      // If expiring in less than REFRESH_THRESHOLD, refresh in background
      if (!isSessionValid(storedSession, CONFIG.REFRESH_THRESHOLD)) {
        console.log('🔄 Session expiring soon, refreshing in background...')
        refreshSessionInBackground()
      }
      
      return {
        valid: true,
        session: storedSession,
        source: 'localStorage'
      }
    }
    
    // Session exists but expired or expiring very soon
    console.log('⚠️ Session expiring soon, attempting refresh...')
  } else {
    console.log('📭 No session in localStorage')
  }
  
  // Step 3: Need to refresh - try with timeout
  try {
    const result = await withTimeout(
      currentClient.auth.refreshSession(),
      CONFIG.REFRESH_TIMEOUT,
      'Session refresh'
    )
    
    if (result.data?.session) {
      console.log('✅ Session refreshed successfully')
      consecutiveTimeouts = 0
      return {
        valid: true,
        session: result.data.session,
        source: 'refresh'
      }
    }
    
    if (result.error) {
      // Handle refresh token errors
      if (isRefreshTokenError(result.error)) {
        console.warn('⚠️ Invalid refresh token - clearing session')
        clearSessionStorage()
        return { valid: false, session: null, source: 'invalid-token' }
      }
      
      // Check for expected errors (user logged out)
      if (result.error.name === 'AuthSessionMissingError' ||
          result.error.message?.includes('session missing')) {
        console.log('📭 No active session (user logged out)')
        return { valid: false, session: null, source: 'logout' }
      }
      
      console.warn('⚠️ Refresh error:', result.error.message)
    }
  } catch (err) {
    console.warn('⚠️ Refresh failed:', err.message)
    consecutiveTimeouts++
    
    // If we had a stored session that's not too old, use it anyway
    if (storedSession && isSessionValid(storedSession, 0)) {
      console.log('📦 Using cached session despite refresh failure')
      return {
        valid: true,
        session: storedSession,
        source: 'cache-fallback'
      }
    }
    
    // Recreate client if too many timeouts
    if (consecutiveTimeouts >= CONFIG.MAX_TIMEOUTS) {
      recreateClient()
    }
  }
  
  // No valid session
  return { valid: false, session: null, source: 'none' }
}

/**
 * Check if error is a refresh token error
 */
const isRefreshTokenError = (error) => {
  if (!error) return false
  const message = error.message?.toLowerCase() || ''
  return (
    message.includes('refresh token not found') ||
    message.includes('invalid refresh token') ||
    error.name === 'AuthApiError' && message.includes('refresh')
  )
}

/**
 * Refresh session in background (fire and forget)
 * Used when session is valid but expiring soon
 */
const refreshSessionInBackground = async () => {
  if (!currentClient) return
  
  try {
    const { data, error } = await currentClient.auth.refreshSession()
    
    if (error) {
      // Handle refresh token errors by clearing session
      if (isRefreshTokenError(error)) {
        console.warn('⚠️ Invalid refresh token detected - clearing session')
        clearSessionStorage()
        return
      }
      
      // Ignore expected errors
      if (error.name === 'AuthSessionMissingError') return
      console.warn('⚠️ Background refresh error:', error.message)
      return
    }
    
    if (data?.session) {
      console.log('✅ Background refresh successful')
      consecutiveTimeouts = 0
    }
  } catch (err) {
    // Silently ignore - this is background, don't spam console
  }
}

/**
 * Get session with timeout (for initial load)
 */
export const getSessionWithTimeout = async (timeoutMs = CONFIG.REFRESH_TIMEOUT) => {
  // First try localStorage (instant)
  const stored = getSessionFromStorage()
  if (stored && isSessionValid(stored, CONFIG.EXPIRY_BUFFER)) {
    return stored
  }
  
  // Guard: If client is not initialized, return cached or null
  if (!currentClient) {
    return stored || null
  }
  
  // Try network
  try {
    const result = await withTimeout(
      currentClient.auth.getSession(),
      timeoutMs,
      'getSession'
    )
    return result.data?.session || null
  } catch (err) {
    console.warn('⚠️ getSession timed out:', err.message)
    // Return cached session if available
    if (stored && isSessionValid(stored, 0)) {
      return stored
    }
    return null
  }
}

/**
 * Clear session (for logout)
 */
export const clearSessionStorage = () => {
  try {
    const key = getStorageKey()
    if (key) {
      localStorage.removeItem(key)
      console.log('🗑️ Cleared session from localStorage')
    }
  } catch (err) {
    console.warn('⚠️ Failed to clear session:', err.message)
  }
}

// ============================================================
// PROXY OBJECT (ensures imports always use current client)
// ============================================================

// Safe no-op functions to prevent crashes when client is unavailable
const noopAsync = async () => ({ data: null, error: new Error('Supabase client not initialized') })
const noopSubscription = { unsubscribe: () => {} }
const safeAuthFallback = {
  getSession: noopAsync,
  getUser: noopAsync,
  refreshSession: noopAsync,
  signInWithPassword: noopAsync,
  signUp: noopAsync,
  signOut: noopAsync,
  onAuthStateChange: (callback) => ({ data: { subscription: noopSubscription } }),
  updateUser: noopAsync,
  resetPasswordForEmail: noopAsync,
  setSession: noopAsync,
  signInWithOAuth: noopAsync,
}

// This proxy ensures that after recreateClient(), all existing imports
// still work because they reference this proxy, not the old client
const supabaseProxy = {
  // Property getters - return safe fallbacks when client is null
  get auth() { return currentClient?.auth || safeAuthFallback },
  get storage() { return currentClient?.storage },
  get functions() { return currentClient?.functions },
  get realtime() { return currentClient?.realtime },
  
  // Method proxies
  from(table) { return currentClient?.from(table) },
  rpc(fn, params, options) { return currentClient?.rpc(fn, params, options) },
  channel(name, opts) { return currentClient?.channel(name, opts) },
  removeChannel(channel) { return currentClient?.removeChannel(channel) },
  removeAllChannels() { return currentClient?.removeAllChannels() },
  getChannels() { return currentClient?.getChannels() },
}

// ============================================================
// EXPORTS
// ============================================================

// Main export - always use this
export const supabase = supabaseProxy

// Direct client access (for cases that need it)
export const getSupabase = () => currentClient

// Utility exports
export { CONFIG as SUPABASE_CONFIG }
export default supabase
