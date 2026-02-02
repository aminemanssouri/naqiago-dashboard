"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createClient, isConfigured } from '@/lib/supabase/client'

// ============================================================
// AUTH CONTEXT - CLEAN & ROBUST
// ============================================================

const AuthContext = createContext({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isConfigured: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
  isAuthenticated: false,
  isAdmin: false,
  isManager: false,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Timeout wrapper for async operations
const withTimeout = (promise, ms, operation = 'Operation') => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out`)), ms)
    )
  ])
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [configured] = useState(isConfigured())
  
  const initRef = useRef(false)
  const supabase = createClient()

  // ============================================================
  // PROFILE FETCHING
  // ============================================================

  const fetchProfile = useCallback(async (userId) => {
    if (!supabase || !userId) return null

    try {
      const { data, error } = await withTimeout(
        supabase.from('profiles').select('*').eq('id', userId).single(),
        10000,
        'Profile fetch'
      )

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error.message)
        return null
      }

      return data
    } catch (err) {
      console.error('Profile fetch failed:', err.message)
      return null
    }
  }, [supabase])

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return null
    const profileData = await fetchProfile(user.id)
    if (profileData) {
      setProfile(profileData)
    }
    return profileData
  }, [user?.id, fetchProfile])

  // ============================================================
  // AUTH ACTIONS
  // ============================================================

  const signIn = useCallback(async (email, password) => {
    if (!supabase) {
      throw new Error('Service not available. Please try again later.')
    }

    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        15000,
        'Sign in'
      )

      if (error) throw error
      if (!data.user) throw new Error('Login failed')

      // Fetch profile
      const profileData = await fetchProfile(data.user.id)
      if (!profileData) {
        throw new Error('Profile not found. Please contact support.')
      }

      setUser(data.user)
      setSession(data.session)
      setProfile(profileData)

      return { user: data.user, profile: profileData }
    } catch (err) {
      console.error('Sign in error:', err)
      throw err
    }
  }, [supabase, fetchProfile])

  const signUp = useCallback(async (email, password, userData = {}) => {
    if (!supabase) {
      throw new Error('Service not available. Please try again later.')
    }

    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: userData.full_name,
              role: userData.role || 'customer'
            }
          }
        }),
        15000,
        'Sign up'
      )

      if (error) throw error

      if (data.user) {
        // Create profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            email,
            full_name: userData.full_name || '',
            role: userData.role || 'customer',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (data.session) {
          setUser(data.user)
          setSession(data.session)
          setProfile(profileData)
        }

        return { 
          user: data.user, 
          profile: profileData, 
          needsConfirmation: !data.session 
        }
      }

      throw new Error('Failed to create user')
    } catch (err) {
      console.error('Sign up error:', err)
      throw err
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    if (!supabase) return

    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setUser(null)
      setProfile(null)
      setSession(null)
    }
  }, [supabase])

  // ============================================================
  // INITIALIZATION
  // ============================================================

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    if (!supabase) {
      console.warn('⚠️ Supabase not configured')
      setLoading(false)
      return
    }

    // Safety timeout
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Auth init timed out')
        setLoading(false)
      }
    }, 10000)

    const initialize = async () => {
      try {
        // Get current session
        const { data: { session: currentSession } } = await supabase.auth.getSession()

        if (currentSession?.user) {
          setSession(currentSession)
          setUser(currentSession.user)

          // Fetch profile
          const profileData = await fetchProfile(currentSession.user.id)
          if (profileData) {
            setProfile(profileData)
          }
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        setLoading(false)
        clearTimeout(timeout)
      }
    }

    initialize()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('🔔 Auth event:', event)

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setSession(null)
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (newSession?.user) {
            setSession(newSession)
            setUser(newSession.user)

            // Only fetch profile on SIGNED_IN
            if (event === 'SIGNED_IN') {
              const profileData = await fetchProfile(newSession.user.id)
              if (profileData) {
                setProfile(profileData)
              }
            }
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [supabase, fetchProfile])

  // ============================================================
  // COMPUTED VALUES
  // ============================================================

  const isAuthenticated = !!user && !!profile
  const isAdmin = profile?.role === 'admin'
  const isManager = profile?.role === 'manager'

  const value = {
    user,
    profile,
    session,
    loading,
    isConfigured: configured,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    isAuthenticated,
    isAdmin,
    isManager,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
