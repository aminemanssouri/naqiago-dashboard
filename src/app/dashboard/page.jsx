"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase, ensureSession } from '@/services/supabaseClient'
import { DashboardPage } from "@/components/dashboard-page"
import { SectionCards } from "@/components/section-cards"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Calendar, Users, DollarSign, TrendingUp, Clock, Activity,
  CheckCircle, XCircle, AlertCircle, Timer, Briefcase, Star,
  ArrowUp, ArrowDown, RefreshCw, Package, UserCheck
} from 'lucide-react'
import {
  getDashboardOverview,
  getBookingAnalytics,
  getRevenueAnalytics,
  getCustomerStats,
  getWorkerStats,
  getServicePerformance,
  getRealTimeStats
} from '@/services/dashboard'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

export default function DashboardOverviewPage() {
  const { profile, loading: authLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const isMounted = useRef(true)
  const lastFetchTime = useRef(0)
  const [fetchKey, setFetchKey] = useState(0) // Force refetch trigger

  // State for dashboard data
  const [overview, setOverview] = useState(null)
  const [bookingAnalytics, setBookingAnalytics] = useState(null)
  const [revenueAnalytics, setRevenueAnalytics] = useState(null)
  const [customerStats, setCustomerStats] = useState(null)
  const [workerStats, setWorkerStats] = useState(null)
  const [servicePerformance, setServicePerformance] = useState(null)
  const [realTimeStats, setRealTimeStats] = useState(null)

  // Helper function to safely fetch data - relies on global timeout in supabaseClient
  const safeFetch = useCallback(async (fetchFn, fallback = null, name = 'unknown') => {
    try {
      const result = await fetchFn()
      console.log(`✅ ${name} loaded successfully`)
      return result
    } catch (error) {
      // Don't warn for abort errors (user navigated away)
      if (error.name !== 'AbortError') {
        console.warn(`⚠️ ${name} failed:`, error.message)
      }
      return fallback
    }
  }, [])

  // Fetch all dashboard data with session refresh
  const fetchDashboardData = useCallback(async (profileData) => {
    if (!isMounted.current) return

    try {
      console.log('📊 Fetching dashboard data...')
      setLoading(true)
      
      // Ensure session is fresh before fetching (critical for navigation back)
      await ensureSession()

      const [
        overviewData,
        bookingData,
        revenueData,
        customerData,
        workerData,
        serviceData,
        realTimeData
      ] = await Promise.all([
        safeFetch(() => getDashboardOverview({
          userId: profileData?.id,
          role: profileData?.role
        }), {}, 'Dashboard Overview'),
        safeFetch(() => getBookingAnalytics({
          userId: profileData?.id,
          role: profileData?.role,
          period: 'month'
        }), {}, 'Booking Analytics'),
        safeFetch(() => getRevenueAnalytics({
          userId: profileData?.id,
          role: profileData?.role
        }), {}, 'Revenue Analytics'),
        profileData?.role === 'admin'
          ? safeFetch(() => getCustomerStats(), null, 'Customer Stats')
          : Promise.resolve(null),
        profileData?.role === 'admin'
          ? safeFetch(() => getWorkerStats(), null, 'Worker Stats')
          : Promise.resolve(null),
        safeFetch(() => getServicePerformance(), { topServices: [], allServices: [] }, 'Service Performance'),
        safeFetch(() => getRealTimeStats(), { todayStats: {}, pendingBookings: [] }, 'Real-Time Stats')
      ])

      if (isMounted.current) {
        setOverview(overviewData)
        setBookingAnalytics(bookingData)
        setRevenueAnalytics(revenueData)
        setCustomerStats(customerData)
        setWorkerStats(workerData)
        setServicePerformance(serviceData)
        setRealTimeStats(realTimeData)
        lastFetchTime.current = Date.now()

        // Debug logs to verify state is being set
        console.log('📊 State updated:', {
          overview: overviewData,
          revenue: revenueData?.totalRevenue,
          customers: customerData?.newCustomersMonth,
          realTime: realTimeData?.todayStats
        })

        console.log('✅ Dashboard data loaded')
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
    } finally {
      if (isMounted.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [safeFetch])

  // Refresh data
  const handleRefresh = useCallback(async () => {
    if (!profile?.id) return
    setRefreshing(true)
    lastFetchTime.current = 0
    await fetchDashboardData(profile)
  }, [profile, fetchDashboardData])

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Detect pathname changes and trigger refetch ONLY when coming TO /dashboard
  const prevPathnameRef = useRef(pathname)

  useEffect(() => {
    const prevPath = prevPathnameRef.current
    const currentPath = pathname

    // Only trigger refetch if we're navigating TO /dashboard FROM a different page
    if (currentPath === '/dashboard' && prevPath !== '/dashboard' && prevPath !== null) {
      console.log(`📍 Navigated to dashboard from ${prevPath}, triggering refetch`)
      setFetchKey(prev => prev + 1)
    }

    // Update the ref for next time
    prevPathnameRef.current = currentPath
  }, [pathname])

  // Fetch data when fetchKey changes (triggered by navigation)
  useEffect(() => {
    if (authLoading) {
      console.log('⏳ Auth loading...')
      return
    }

    if (!profile?.id) {
      console.log('⚠️ No profile')
      setLoading(false)
      return
    }

    // Check if we need to refresh the session first
    const timeSinceLastFetch = Date.now() - lastFetchTime.current
    const needsSessionRefresh = timeSinceLastFetch > 30000 || lastFetchTime.current === 0 // 30 seconds

    const fetchData = async () => {
      if (needsSessionRefresh) {
        console.log('🔄 Refreshing session before fetching data...')
        try {
          // Add timeout to prevent hanging in production
          const refreshPromise = supabase.auth.refreshSession()
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Session refresh timeout')), 5000)
          )
          
          const { data, error } = await Promise.race([refreshPromise, timeoutPromise])
            .catch(err => ({ data: null, error: err }))
          
          if (error) {
            // Check if it's a refresh token error
            const errorMessage = error.message?.toLowerCase() || ''
            if (errorMessage.includes('refresh token not found') || 
                errorMessage.includes('invalid refresh token')) {
              console.error('❌ Invalid refresh token - redirecting to login')
              router.push('/login')
              return
            }
            console.warn('⚠️ Session refresh failed:', error.message)
            // Continue anyway - ensureSession will handle it
          } else if (data?.session) {
            console.log('✅ Session refreshed successfully')
          }
        } catch (err) {
          console.warn('⚠️ Session refresh error:', err.message)
          // Continue anyway - don't block data fetching
        }
      }

      console.log('🚀 Fetching dashboard data for profile:', profile.id)
      await fetchDashboardData(profile)
    }

    fetchData()
  }, [fetchKey, authLoading, profile?.id])

  // Separate effect for real-time stats refresh with proper cleanup
  useEffect(() => {
    // Only set up interval if auth is complete and we have a profile
    if (authLoading || !profile?.id) return

    const intervalId = setInterval(async () => {
      if (!isMounted.current || !profile?.id) return

      try {
        const stats = await getRealTimeStats()
        if (isMounted.current) {
          setRealTimeStats(stats)
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch real-time stats:', error.message)
      }
    }, 30000)

    return () => clearInterval(intervalId)
  }, [authLoading, profile?.id])

  // Debug: Log state changes
  useEffect(() => {
    console.log('🔍 State snapshot:', {
      hasOverview: !!overview,
      hasRevenue: !!revenueAnalytics,
      revenueAmount: revenueAnalytics?.totalRevenue,
      hasCustomers: !!customerStats,
      customersCount: customerStats?.newCustomersMonth
    })
  }, [overview, revenueAnalytics, customerStats])

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Transform booking analytics data for chart
  const chartData = bookingAnalytics?.revenueByPeriod?.slice(-90).map(item => ({
    date: item.date,
    desktop: Math.round(item.amount * 0.6), // 60% desktop
    mobile: Math.round(item.amount * 0.4)   // 40% mobile
  })) || []

  return (
    <DashboardPage
      title="Operations overview"
      description="Monitor live performance across bookings, workforce, and customer satisfaction."
      breadcrumb={[{ label: "Dashboard", href: "/dashboard" }]}
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Stats Cards - Using Real Data */}


        {/* Enhanced Section Cards with Real Data */}
        <SectionCards
          data={{
            totalRevenue: {
              value: formatCurrency(revenueAnalytics?.totalRevenue || 0),
              change: overview?.growthRate || 0,
              trend: overview?.growthRate > 0 ? 'up' : 'down'
            },
            newCustomers: {
              value: customerStats?.newCustomersMonth || 0,
              change: 12.5,
              trend: 'up'
            },
            activeAccounts: {
              value: realTimeStats?.todayStats?.activeWorkers || 0,
              change: 8.2,
              trend: 'up'
            },
            growthRate: {
              value: `${(overview?.conversionRate || 0).toFixed(1)}%`,
              change: overview?.conversionRate > 70 ? 5 : -3,
              trend: overview?.conversionRate > 70 ? 'up' : 'down'
            }
          }}
        />

        {/* Main Content Area with Charts */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Revenue Chart */}
          <ChartAreaInteractive data={chartData} />

          {/* Top Services Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Top Services Performance
              </CardTitle>
              <CardDescription>
                Most popular services by booking count
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {servicePerformance?.topServices?.map((service, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{service.serviceName}</span>
                        <span className="text-sm text-muted-foreground">
                          {service.totalBookings} bookings
                        </span>
                      </div>
                      <Progress
                        value={(service.completionRate || 0)}
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{service.completionRate?.toFixed(1)}% completion rate</span>
                        <span>{formatCurrency(service.totalRevenue || 0)}</span>
                      </div>
                    </div>
                  )) || (
                      <p className="text-sm text-muted-foreground">No service data available</p>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Grid */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          {/* Pending Bookings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{overview?.pendingBookings || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          {/* In Progress */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold">{overview?.inProgressBookings || 0}</p>
                </div>
                <Timer className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          {/* Completed */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{overview?.completedBookings || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          {/* Today's Bookings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold">{overview?.todayBookings || 0}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest bookings requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {realTimeStats?.pendingBookings?.slice(0, 5).map((booking, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={cn(
                      "rounded-full p-2",
                      booking.status === 'pending' && "bg-yellow-100",
                      booking.status === 'confirmed' && "bg-blue-100",
                      booking.status === 'completed' && "bg-green-100"
                    )}>
                      {booking.status === 'pending' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                      {booking.status === 'confirmed' && <CheckCircle className="h-4 w-4 text-blue-600" />}
                      {booking.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {booking.booking_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(booking.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={booking.status === 'completed' ? 'default' : 'secondary'}>
                      {booking.status}
                    </Badge>
                  </div>
                )) || (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent activity
                    </p>
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardPage>
  )
}