"use client"

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getSessionFromStorage, isSessionValid } from '@/services/supabaseClient'
import { Loader2 } from 'lucide-react'

// Maximum time to wait for auth check before showing error
const AUTH_CHECK_TIMEOUT = 10000 // 10 seconds

export function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  redirectTo = '/login',
  requireAuth = true 
}) {
  const { user, profile, loading, isAuthenticated, session } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authCheckComplete, setAuthCheckComplete] = useState(false)
  const [authTimedOut, setAuthTimedOut] = useState(false)
  const timeoutRef = useRef(null)

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!authCheckComplete) {
        console.warn('⚠️ ProtectedRoute: Auth check timed out after', AUTH_CHECK_TIMEOUT, 'ms')
        setAuthTimedOut(true)
        setAuthCheckComplete(true)
      }
    }, AUTH_CHECK_TIMEOUT)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (loading) return

    // Clear timeout once loading completes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Check if user has a valid session (either from context or localStorage)
    const hasValidSession = !!session || !!user || (() => {
      const stored = getSessionFromStorage()
      return stored && isSessionValid(stored, 0)
    })()

    // If authentication is required but no valid session
    if (requireAuth && !hasValidSession) {
      console.log('🔒 No valid session - redirecting to login')
      router.replace(redirectTo)
      setIsAuthorized(false)
      setAuthCheckComplete(true)
      return
    }

    // If user has session but profile is still loading, wait a bit more
    if (requireAuth && hasValidSession && !profile) {
      // Give profile a chance to load (handled by AuthContext profile recovery)
      console.log('⏳ Waiting for profile...')
      // Don't redirect immediately - the profile recovery in AuthContext will handle it
      return
    }

    // If specific roles are required, check if user has allowed role
    if (allowedRoles.length > 0 && profile) {
      if (!allowedRoles.includes(profile.role)) {
        console.log('🚫 Role not allowed:', profile.role)
        // Redirect based on user's actual role
        if (profile.role === 'admin') {
          router.replace('/dashboard')
        } else {
          router.replace('/')
        }
        setIsAuthorized(false)
        setAuthCheckComplete(true)
        return
      }
    }

    // User is authorized
    if (hasValidSession && profile) {
      setIsAuthorized(true)
      setAuthCheckComplete(true)
    }
  }, [
    isAuthenticated, 
    session,
    user,
    profile?.role,
    profile?.id,
    loading, 
    allowedRoles.join(','),
    redirectTo, 
    requireAuth
  ])

  // Handle auth timeout - show error instead of infinite loading
  if (authTimedOut && !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md p-6">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">Connection Issue</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Unable to verify your session. This might be due to network issues.
          </p>
          <div className="flex gap-2 justify-center">
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
            >
              Retry
            </button>
            <button 
              onClick={() => router.push('/login')} 
              className="px-4 py-2 border rounded-md text-sm hover:bg-accent"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show loading spinner while checking authentication
  if (loading || (requireAuth && !authCheckComplete)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }
  
  // Not authorized after auth check complete
  if (requireAuth && !isAuthorized) {
    return null // Will redirect via useEffect
  }

  // If we reach here, user is authorized
  return children
}

// Higher-order component for protecting pages
export function withAuth(Component, options = {}) {
  return function AuthenticatedComponent(props) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Role-specific route protectors
export function AdminRoute({ children }) {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      {children}
    </ProtectedRoute>
  )
}

// Multi-role route protector
export function MultiRoleRoute({ children, roles }) {
  return (
    <ProtectedRoute allowedRoles={roles}>
      {children}
    </ProtectedRoute>
  )
}

// Default export for convenience
export default ProtectedRoute