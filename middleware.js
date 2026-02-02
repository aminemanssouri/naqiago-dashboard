import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse } from 'next/server'

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/admin', '/profile', '/settings']
const authRoutes = ['/login', '/signup', '/forgot-password']

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Update session (refreshes tokens via cookies)
  const { supabaseResponse, user } = await updateSession(request)

  // Check if accessing protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname === route)

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users from auth routes to dashboard
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}