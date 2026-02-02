import { NextResponse } from 'next/server'

export async function middleware(req) {
  // Debug: Log environment variables (only in development)
  if (process.env.NODE_ENV === 'development' && req.nextUrl.pathname.startsWith('/debug')) {
    console.log('🔧 Middleware Debug - Environment Variables:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set ✅' : 'Missing ❌',
      key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set ✅' : 'Missing ❌',
      nodeEnv: process.env.NODE_ENV
    })
  }

  // Protected routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/admin',
    '/worker',
    '/profile',
    '/settings'
  ]

  // Check if the current path starts with any protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  )

  // If accessing a protected route, let the client-side auth handle it
  // This middleware primarily handles redirects for authenticated users hitting login
  if (req.nextUrl.pathname === '/login') {
    // Check if there's a session token in cookies
    const sessionToken = req.cookies.get('sb-access-token')?.value || 
                        req.cookies.get('supabase-auth-token')?.value

    if (sessionToken) {
      // Validate that the token is not expired before redirecting
      try {
        // Parse JWT payload (base64 decode the middle part)
        const payloadBase64 = sessionToken.split('.')[1]
        if (payloadBase64) {
          const payload = JSON.parse(atob(payloadBase64))
          const expiryTime = payload.exp * 1000 // Convert to milliseconds
          const now = Date.now()
          const bufferTime = 60000 // 1 minute buffer

          // Only redirect if token is still valid (with buffer)
          if (expiryTime > now + bufferTime) {
            return NextResponse.redirect(new URL('/dashboard', req.url))
          } else {
            console.log('🔐 Session token expired, allowing access to login page')
          }
        }
      } catch (error) {
        // If token parsing fails, let user proceed to login
        console.warn('⚠️ Failed to parse session token:', error.message)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}