"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { 
  supabase, 
  getSupabase, 
  getSessionFromStorage, 
  isSessionValid, 
  ensureSession,
  clearSessionStorage,
  SUPABASE_CONFIG 
} from '@/services/supabaseClient'

// ============================================================
// AUTH CONTEXT - CLEAN ARCHITECTURE
// ============================================================
//
// This context provides authentication state to the entire app.
// 
// KEY PRINCIPLES:
// 1. Read localStorage first (instant, no network)
// 2. Never block on network calls
// 3. Background refresh only
// 4. Graceful degradation when network fails
// ============================================================

const AuthContext = createContext({
  user: null,
  profile: null,
  session: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  refreshProfile: async () => {},
  isAuthenticated: false,
  isCustomer: false,
  isWorker: false,
  isAdmin: false,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }) {
  // ============================================================
  // STATE
  // ============================================================
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Refs to prevent duplicate operations
  const isInitializing = useRef(false)
  const lastProcessedUserId = useRef(null)
  const lastVisibilityCheck = useRef(0)

  // ============================================================
  // PROFILE FETCHING
  // ============================================================
  
  const fetchUserProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }, [])

  const createUserProfile = useCallback(async (userId, userData) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          email: userData.email,
          full_name: userData.full_name || '',
          role: userData.role || 'customer',
          phone: userData.phone || null,
          language_preference: userData.language_preference || 'en',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          return await fetchUserProfile(userId)
        }
        throw error
      }

      lastProcessedUserId.current = userId
      return data
    } catch (error) {
      console.error('Error creating user profile:', error)
      throw error
    }
  }, [fetchUserProfile])

  // ============================================================
  // AUTH ACTIONS
  // ============================================================

  const signIn = useCallback(async (email, password) => {
    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Sign in error:', error)
        throw error
      }

      const userProfile = await fetchUserProfile(data.user.id)
      if (!userProfile) {
        throw new Error('User profile not found. Please contact support.')
      }

      setUser(data.user)
      setSession(data.session)
      setProfile(userProfile)

      return { user: data.user, profile: userProfile }
    } catch (error) {
      console.error('Sign in failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [fetchUserProfile])

  const signUp = useCallback(async (email, password, userData) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.full_name,
            role: userData.role || 'customer'
          }
        }
      })

      if (error) throw error

      if (data.user) {
        const profile = await createUserProfile(data.user.id, {
          email,
          ...userData
        })

        if (data.session) {
          setUser(data.user)
          setSession(data.session)
          setProfile(profile)
        }

        return { user: data.user, profile, needsConfirmation: !data.session }
      }

      throw new Error('Failed to create user')
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [createUserProfile])

  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Clear localStorage
      clearSessionStorage()
      
      // Clear state
      setUser(null)
      setProfile(null)
      setSession(null)
      lastProcessedUserId.current = null
      
      console.log('✅ Signed out successfully')
    } catch (error) {
      console.error('Sign out error:', error)
      // Clear state anyway
      setUser(null)
      setProfile(null)
      setSession(null)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (updates) => {
    try {
      if (!user) throw new Error('No user logged in')

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      setProfile(data)
      return data
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  }, [user])

  const refreshProfile = useCallback(async () => {
    try {
      if (!user) return null
      
      const userProfile = await fetchUserProfile(user.id)
      if (userProfile) {
        setProfile(userProfile)
        return userProfile
      }
      return null
    } catch (error) {
      console.error('Error refreshing profile:', error)
      throw error
    }
  }, [user, fetchUserProfile])

  // ============================================================
  // VISIBILITY CHANGE HANDLER (THE KEY TO AFK RESILIENCE)
  // ============================================================
  
  const handleVisibilityChange = useCallback(async () => {
    // Only handle when tab becomes visible
    if (document.visibilityState !== 'visible') return
    
    // Debounce - don't run more than once per 2 seconds
    const now = Date.now()
    if (now - lastVisibilityCheck.current < 2000) return
    lastVisibilityCheck.current = now
    
    console.log('👁️ Tab visible - checking session...')
    
    // Use the ensureSession function (reads localStorage first, no blocking)
    const result = await ensureSession()
    
    if (result.valid) {
      // Session is valid - update state if needed
      const currentSession = result.session
      
      if (!session || session.access_token !== currentSession.access_token) {
        console.log('📦 Updating session from', result.source)
        setSession(currentSession)
        if (currentSession.user) {
          setUser(currentSession.user)
        }
      }
    } else if (result.source === 'logout' || result.source === 'none' || result.source === 'invalid-token' || result.source === 'no-client') {
      // No valid session, invalid token, or client not initialized - clear state if we had one
      if (user || session) {
        console.log('📭 Session lost - clearing state (source:', result.source, ')')
        setUser(null)
        setProfile(null)
        setSession(null)
        lastProcessedUserId.current = null
      }
    }
  }, [session, user])

  // ============================================================
  // INITIALIZATION
  // ============================================================
  
  useEffect(() => {
    if (isInitializing.current) return
    isInitializing.current = true

    // Global timeout to prevent infinite loading
    const INIT_TIMEOUT = 8000
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('⚠️ Auth init timed out - forcing completion')
        setLoading(false)
      }
    }, INIT_TIMEOUT)

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth...')
        
        // STEP 1: Read localStorage first (instant)
        const storedSession = getSessionFromStorage()
        
        if (storedSession && isSessionValid(storedSession, SUPABASE_CONFIG.EXPIRY_BUFFER)) {
          console.log('✅ Found valid session in localStorage')
          
          // Set session immediately
          setSession(storedSession)
          if (storedSession.user) {
            setUser(storedSession.user)
          }
          
          // Fetch profile (with timeout)
          if (storedSession.user) {
            try {
              const profilePromise = fetchUserProfile(storedSession.user.id)
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Profile timeout')), 5000)
              )
              
              const userProfile = await Promise.race([profilePromise, timeoutPromise])
              if (userProfile) {
                setProfile(userProfile)
              }
            } catch (err) {
              console.warn('⚠️ Profile fetch failed:', err.message)
            }
          }
          
          setLoading(false)
          clearTimeout(timeoutId)
          return
        }
        
        // STEP 2: No valid localStorage session - try network
        console.log('📡 No valid localStorage session - trying network...')
        
        try {
          const getSessionPromise = supabase.auth.getSession()
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('getSession timeout')), 5000)
          )
          
          const { data } = await Promise.race([getSessionPromise, timeoutPromise])
          const networkSession = data?.session
          
          if (networkSession?.user) {
            console.log('✅ Got session from network')
            setSession(networkSession)
            setUser(networkSession.user)
            
            // Fetch profile
            try {
              const userProfile = await fetchUserProfile(networkSession.user.id)
              if (userProfile) {
                setProfile(userProfile)
              }
            } catch (err) {
              console.warn('⚠️ Profile fetch failed:', err.message)
            }
          } else {
            console.log('📭 No session found')
          }
        } catch (err) {
          console.warn('⚠️ Network session check failed:', err.message)
          
          // If localStorage had a session (even expired), use it as fallback
          if (storedSession?.user && isSessionValid(storedSession, 0)) {
            console.log('📦 Using cached session as fallback')
            setSession(storedSession)
            setUser(storedSession.user)
          }
        }
        
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
      } finally {
        setLoading(false)
        clearTimeout(timeoutId)
        isInitializing.current = false
      }
    }

    initializeAuth()

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('🔔 Auth state change:', event)
        
        // Skip initial session (we handle it manually)
        if (event === 'INITIAL_SESSION') return

        // Handle token refresh
        if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession)
          if (newSession.user) {
            setUser(newSession.user)
          }
          return
        }

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setSession(null)
          lastProcessedUserId.current = null
          setLoading(false)
          return
        }

        // Handle sign in
        if (event === 'SIGNED_IN' && newSession?.user) {
          setUser(newSession.user)
          setSession(newSession)

          // Fetch profile
          const { data: userProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .single()

          if (!error && userProfile) {
            setProfile(userProfile)
          } else if (error?.code === 'PGRST116') {
            // Create profile for OAuth users
            if (newSession.user.email && lastProcessedUserId.current !== newSession.user.id) {
              try {
                const { data: newProfile, error: createError } = await supabase
                  .from('profiles')
                  .insert([{
                    id: newSession.user.id,
                    email: newSession.user.email,
                    full_name: newSession.user.user_metadata?.full_name || newSession.user.email.split('@')[0],
                    role: 'customer',
                    language_preference: 'en',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }])
                  .select()
                  .single()

                if (!createError && newProfile) {
                  setProfile(newProfile)
                  lastProcessedUserId.current = newSession.user.id
                }
              } catch (err) {
                console.error('Error creating profile for OAuth user:', err)
              }
            }
          }
          
          setLoading(false)
        }
      }
    )

    // Set up visibility listener
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)

    // Periodic session refresh (every 4 minutes)
    const refreshInterval = setInterval(async () => {
      if (session) {
        console.log('🔄 Periodic session refresh...')
        try {
          const { data, error } = await supabase.auth.refreshSession()
          if (error) {
            // Check if it's a refresh token error
            const errorMessage = error.message?.toLowerCase() || ''
            if (errorMessage.includes('refresh token not found') || 
                errorMessage.includes('invalid refresh token')) {
              console.warn('⚠️ Invalid refresh token - signing out')
              await signOut()
              return
            }
            console.warn('⚠️ Periodic refresh error:', error.message)
          } else if (data?.session) {
            console.log('✅ Periodic refresh successful')
            setSession(data.session)
            setUser(data.session.user)
          }
        } catch (err) {
          console.warn('⚠️ Periodic refresh failed:', err.message)
        }
      }
    }, 240000) // 4 minutes

    // Cleanup
    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
      clearTimeout(timeoutId)
      clearInterval(refreshInterval)
    }
  }, []) // Empty dependency array - only run once

  // ============================================================
  // PROFILE RECOVERY (self-healing)
  // ============================================================
  
  const profileRecoveryAttempts = useRef(0)
  const MAX_RECOVERY_ATTEMPTS = 3

  useEffect(() => {
    let isMounted = true

    const ensureProfile = async () => {
      if (user && !profile && !loading) {
        if (profileRecoveryAttempts.current >= MAX_RECOVERY_ATTEMPTS) {
          console.warn('⚠️ Max profile recovery attempts reached')
          return
        }

        profileRecoveryAttempts.current++
        console.log(`👤 Profile recovery attempt ${profileRecoveryAttempts.current}/${MAX_RECOVERY_ATTEMPTS}`)
        
        try {
          const userProfile = await fetchUserProfile(user.id)
          if (isMounted && userProfile) {
            console.log('✅ Profile recovered')
            setProfile(userProfile)
            profileRecoveryAttempts.current = 0
          }
        } catch (error) {
          console.error('Profile recovery failed:', error)
        }
      } else if (profile) {
        profileRecoveryAttempts.current = 0
      }
    }

    ensureProfile()

    return () => { isMounted = false }
  }, [user, profile, loading, fetchUserProfile])

  // ============================================================
  // COMPUTED VALUES & CONTEXT
  // ============================================================

  const isAuthenticated = !!user && !!profile
  const isCustomer = profile?.role === 'customer'
  const isWorker = profile?.role === 'worker'
  const isAdmin = profile?.role === 'admin'

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
    isAuthenticated,
    isCustomer,
    isWorker,
    isAdmin,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
