import { supabase } from './supabaseClient'

// ============================================
// OVERVIEW STATISTICS (For Dashboard Cards)
// ============================================

/**
 * Get overview statistics for dashboard cards
 * @param {Object} options - Filter options (userId, role, dateRange)
 * @returns {Object} Statistics for dashboard cards
 */
export const getDashboardOverview = async (options = {}) => {
  try {
    const { userId, role, dateFrom, dateTo } = options
    const today = new Date().toISOString().split('T')[0]
    const thisMonth = new Date()
    thisMonth.setDate(1)
    const thisMonthStart = thisMonth.toISOString().split('T')[0]

    // Build base query filters
    let filters = {}
    if (role === 'customer') filters.customer_id = userId
    if (role === 'worker') filters.worker_id = userId

    // Get bookings statistics
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, status, total_price, scheduled_date, created_at')
      .match(filters)

    if (bookingsError) throw bookingsError

    // Get payments statistics
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, status, platform_fee, worker_earnings, created_at')
      .match(filters)

    if (paymentsError) throw paymentsError

    // Calculate statistics
    const stats = {
      // Booking counts
      totalBookings: bookings?.length || 0,
      pendingBookings: bookings?.filter(b => b.status === 'pending').length || 0,
      confirmedBookings: bookings?.filter(b => b.status === 'confirmed').length || 0,
      inProgressBookings: bookings?.filter(b => b.status === 'in_progress').length || 0,
      completedBookings: bookings?.filter(b => b.status === 'completed').length || 0,
      cancelledBookings: bookings?.filter(b => b.status === 'cancelled').length || 0,

      // Today's bookings
      todayBookings: bookings?.filter(b => b.scheduled_date === today).length || 0,

      // This month's bookings
      monthlyBookings: bookings?.filter(b => {
        const bookingDate = new Date(b.created_at)
        return bookingDate >= thisMonth
      }).length || 0,

      // Revenue statistics
      totalRevenue: bookings?.reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0) || 0,
      pendingPayments: payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0,
      completedPayments: payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0,

      // Platform fees (for admin)
      totalPlatformFees: payments?.reduce((sum, p) => sum + parseFloat(p.platform_fee || 0), 0) || 0,

      // Worker earnings (for worker role)
      totalEarnings: payments?.reduce((sum, p) => sum + parseFloat(p.worker_earnings || 0), 0) || 0,

      // Growth metrics
      growthRate: calculateGrowthRate(bookings),
      conversionRate: calculateConversionRate(bookings)
    }

    return stats
  } catch (error) {
    console.error('Error fetching dashboard overview:', error)
    throw error
  }
}

// ============================================
// CUSTOMER STATISTICS
// ============================================

/**
 * Get customer-related statistics
 * @returns {Object} Customer statistics
 */
export const getCustomerStats = async () => {
  try {
    // Get all customers
    const { data: customers, error: customersError } = await supabase
      .from('profiles')
      .select('id, created_at, last_seen_at, loyalty_points')
      .eq('role', 'customer')

    if (customersError) throw customersError

    // Get customer bookings for activity metrics
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('customer_id, created_at, total_price')

    if (bookingsError) throw bookingsError

    const now = new Date()
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30))
    const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7))

    const stats = {
      totalCustomers: customers?.length || 0,

      // New customers this month
      newCustomersMonth: customers?.filter(c =>
        new Date(c.created_at) >= thirtyDaysAgo
      ).length || 0,

      // Active customers (seen in last 7 days)
      activeCustomers: customers?.filter(c =>
        c.last_seen_at && new Date(c.last_seen_at) >= sevenDaysAgo
      ).length || 0,

      // Customer lifetime value average
      averageLifetimeValue: calculateAverageLifetimeValue(bookings),

      // Top customers by bookings
      topCustomers: getTopCustomers(bookings, customers),

      // Loyalty points distribution
      loyaltyPointsTotal: customers?.reduce((sum, c) => sum + (c.loyalty_points || 0), 0) || 0,

      // Customer retention rate
      retentionRate: calculateRetentionRate(bookings, customers)
    }

    return stats
  } catch (error) {
    console.error('Error fetching customer stats:', error)
    throw error
  }
}

// ============================================
// WORKER STATISTICS
// ============================================

/**
 * Get worker-related statistics
 * @returns {Object} Worker statistics
 */
export const getWorkerStats = async () => {
  try {
    const { data: workers, error: workersError } = await supabase
      .from('worker_profiles')
      .select(`
        *,
        user:profiles!worker_profiles_user_id_fkey (
          full_name,
          avatar_url,
          worker_rating,
          worker_review_count
        )
      `)

    if (workersError) throw workersError

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('worker_id, status, total_price, completed_at')

    if (bookingsError) throw bookingsError

    const stats = {
      totalWorkers: workers?.length || 0,

      // Active workers (status = available or busy)
      activeWorkers: workers?.filter(w =>
        w.status === 'available' || w.status === 'busy'
      ).length || 0,

      // Average rating
      averageRating: calculateAverageRating(workers),

      // Total jobs completed
      totalJobsCompleted: workers?.reduce((sum, w) =>
        sum + (w.total_jobs_completed || 0), 0
      ) || 0,

      // Total earnings
      totalEarnings: workers?.reduce((sum, w) =>
        sum + parseFloat(w.total_earnings || 0), 0
      ) || 0,

      // Top performers
      topPerformers: getTopPerformers(workers, bookings),

      // Worker utilization rate
      utilizationRate: calculateUtilizationRate(workers, bookings)
    }

    return stats
  } catch (error) {
    console.error('Error fetching worker stats:', error)
    throw error
  }
}

// ============================================
// BOOKING ANALYTICS
// ============================================

/**
 * Get booking analytics for charts
 * @param {Object} options - Filter options (period: 'week', 'month', 'year')
 * @returns {Object} Booking analytics data
 */
export const getBookingAnalytics = async (options = {}) => {
  try {
    const { period = 'month', userId, role } = options

    let filters = {}
    if (role === 'customer') filters.customer_id = userId
    if (role === 'worker') filters.worker_id = userId

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .match(filters)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Group bookings by period
    const groupedData = groupBookingsByPeriod(bookings, period)

    // Calculate trends
    const trends = {
      daily: groupedData.daily || [],
      weekly: groupedData.weekly || [],
      monthly: groupedData.monthly || [],

      // Status distribution
      statusDistribution: calculateStatusDistribution(bookings),

      // Service type distribution
      serviceDistribution: await getServiceDistribution(bookings),

      // Peak hours analysis
      peakHours: calculatePeakHours(bookings),

      // Revenue by period
      revenueByPeriod: calculateRevenueByPeriod(bookings, period),

      // Average booking value
      averageBookingValue: bookings?.reduce((sum, b) =>
        sum + parseFloat(b.total_price || 0), 0
      ) / (bookings?.length || 1) || 0
    }

    return trends
  } catch (error) {
    console.error('Error fetching booking analytics:', error)
    throw error
  }
}

// ============================================
// REVENUE ANALYTICS
// ============================================

/**
 * Get revenue analytics for charts
 * @param {Object} options - Filter options
 * @returns {Object} Revenue analytics data
 */
export const getRevenueAnalytics = async (options = {}) => {
  try {
    const { dateFrom, dateTo, userId, role } = options

    let query = supabase
      .from('payments')
      .select(`
        *,
        booking:bookings!payments_booking_id_fkey (
          scheduled_date,
          service_id,
          vehicle_type
        )
      `)

    if (role === 'customer') query = query.eq('customer_id', userId)
    if (role === 'worker') query = query.eq('worker_id', userId)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    const { data: payments, error } = await query

    if (error) throw error

    const analytics = {
      // Total revenue
      totalRevenue: payments?.reduce((sum, p) =>
        sum + parseFloat(p.amount || 0), 0
      ) || 0,

      // Platform fees collected
      totalPlatformFees: payments?.reduce((sum, p) =>
        sum + parseFloat(p.platform_fee || 0), 0
      ) || 0,

      // Worker earnings
      totalWorkerEarnings: payments?.reduce((sum, p) =>
        sum + parseFloat(p.worker_earnings || 0), 0
      ) || 0,

      // Payment method distribution
      paymentMethodDistribution: calculatePaymentMethodDistribution(payments),

      // Revenue by service type
      revenueByService: await calculateRevenueByService(payments),

      // Revenue by vehicle type
      revenueByVehicleType: calculateRevenueByVehicleType(payments),

      // Monthly recurring revenue trend
      monthlyRevenueTrend: calculateMonthlyRevenueTrend(payments),

      // Payment success rate
      paymentSuccessRate: calculatePaymentSuccessRate(payments),

      // Average transaction value
      averageTransactionValue: (payments?.reduce((sum, p) =>
        sum + parseFloat(p.amount || 0), 0
      ) / (payments?.length || 1)) || 0
    }

    return analytics
  } catch (error) {
    console.error('Error fetching revenue analytics:', error)
    throw error
  }
}

// ============================================
// SERVICE PERFORMANCE
// ============================================

/**
 * Get service performance metrics
 * @returns {Object} Service performance data
 */
export const getServicePerformance = async () => {
  try {
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)

    if (servicesError) throw servicesError

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('service_id, status, total_price, created_at')

    if (bookingsError) throw bookingsError

    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('booking_id, overall_rating, service_quality_rating')

    if (reviewsError) throw reviewsError

    // Calculate performance metrics for each service
    const serviceMetrics = services?.map(service => {
      const serviceBookings = bookings?.filter(b => b.service_id === service.id) || []
      const completedBookings = serviceBookings.filter(b => b.status === 'completed')

      return {
        serviceId: service.id,
        serviceName: service.title,
        category: service.category,

        // Booking metrics
        totalBookings: serviceBookings.length,
        completedBookings: completedBookings.length,
        completionRate: (completedBookings.length / (serviceBookings.length || 1)) * 100,

        // Revenue metrics
        totalRevenue: serviceBookings.reduce((sum, b) =>
          sum + parseFloat(b.total_price || 0), 0
        ),
        averagePrice: service.base_price,

        // Popularity score (based on booking frequency)
        popularityScore: calculatePopularityScore(serviceBookings),

        // Average rating for this service
        averageRating: calculateServiceRating(serviceBookings, reviews)
      }
    })

    // Sort by popularity
    serviceMetrics?.sort((a, b) => b.popularityScore - a.popularityScore)

    return {
      topServices: serviceMetrics?.slice(0, 5) || [],
      allServices: serviceMetrics || [],
      categoryBreakdown: groupServicesByCategory(serviceMetrics)
    }
  } catch (error) {
    console.error('Error fetching service performance:', error)
    throw error
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const calculateGrowthRate = (bookings) => {
  if (!bookings || bookings.length === 0) return 0

  const now = new Date()
  const thisMonth = bookings.filter(b => {
    const date = new Date(b.created_at)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }).length

  const lastMonth = bookings.filter(b => {
    const date = new Date(b.created_at)
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1)
    return date.getMonth() === lastMonthDate.getMonth() &&
      date.getFullYear() === lastMonthDate.getFullYear()
  }).length

  if (lastMonth === 0) return thisMonth > 0 ? 100 : 0
  return ((thisMonth - lastMonth) / lastMonth) * 100
}

const calculateConversionRate = (bookings) => {
  if (!bookings || bookings.length === 0) return 0
  const completed = bookings.filter(b => b.status === 'completed').length
  return (completed / bookings.length) * 100
}

const calculateAverageLifetimeValue = (bookings) => {
  if (!bookings || bookings.length === 0) return 0

  const customerTotals = {}
  bookings.forEach(b => {
    if (b.customer_id) {
      customerTotals[b.customer_id] = (customerTotals[b.customer_id] || 0) + parseFloat(b.total_price || 0)
    }
  })

  const values = Object.values(customerTotals)
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

const getTopCustomers = (bookings, customers) => {
  const customerBookings = {}

  bookings?.forEach(b => {
    if (b.customer_id) {
      if (!customerBookings[b.customer_id]) {
        customerBookings[b.customer_id] = {
          count: 0,
          totalSpent: 0
        }
      }
      customerBookings[b.customer_id].count++
      customerBookings[b.customer_id].totalSpent += parseFloat(b.total_price || 0)
    }
  })

  return Object.entries(customerBookings)
    .map(([customerId, data]) => {
      const customer = customers?.find(c => c.id === customerId)
      return {
        customerId,
        customerName: customer?.full_name || 'Unknown',
        bookingCount: data.count,
        totalSpent: data.totalSpent
      }
    })
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)
}

const calculateRetentionRate = (bookings, customers) => {
  if (!customers || customers.length === 0) return 0

  const returningCustomers = new Set()
  const customerBookingCounts = {}

  bookings?.forEach(b => {
    if (b.customer_id) {
      customerBookingCounts[b.customer_id] = (customerBookingCounts[b.customer_id] || 0) + 1
      if (customerBookingCounts[b.customer_id] > 1) {
        returningCustomers.add(b.customer_id)
      }
    }
  })

  return (returningCustomers.size / customers.length) * 100
}

const calculateAverageRating = (workers) => {
  const ratings = workers?.map(w => w.user?.worker_rating || 0).filter(r => r > 0) || []
  return ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0
}

const getTopPerformers = (workers, bookings) => {
  return workers?.map(worker => {
    const workerBookings = bookings?.filter(b => b.worker_id === worker.id) || []
    const completedBookings = workerBookings.filter(b => b.status === 'completed')

    return {
      workerId: worker.id,
      workerName: worker.user?.full_name || worker.business_name || 'Unknown',
      rating: worker.user?.worker_rating || 0,
      jobsCompleted: worker.total_jobs_completed || 0,
      earnings: worker.total_earnings || 0,
      completionRate: workerBookings.length > 0
        ? (completedBookings.length / workerBookings.length) * 100
        : 0
    }
  })
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 5)
}

const calculateUtilizationRate = (workers, bookings) => {
  const activeWorkers = workers?.filter(w => w.status === 'busy').length || 0
  const totalWorkers = workers?.length || 1
  return (activeWorkers / totalWorkers) * 100
}

const groupBookingsByPeriod = (bookings, period) => {
  const grouped = {
    daily: [],
    weekly: [],
    monthly: []
  }

  if (!bookings) return grouped

  const bookingsByDate = {}

  bookings.forEach(booking => {
    const date = new Date(booking.created_at)
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

    if (!bookingsByDate[key]) {
      bookingsByDate[key] = {
        date: date.toISOString().split('T')[0],
        count: 0,
        revenue: 0
      }
    }

    bookingsByDate[key].count++
    bookingsByDate[key].revenue += parseFloat(booking.total_price || 0)
  })

  grouped.daily = Object.values(bookingsByDate).slice(-30) // Last 30 days

  return grouped
}

const calculateStatusDistribution = (bookings) => {
  const distribution = {
    pending: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0
  }

  bookings?.forEach(b => {
    if (distribution.hasOwnProperty(b.status)) {
      distribution[b.status]++
    }
  })

  return Object.entries(distribution).map(([status, count]) => ({
    status,
    count,
    percentage: bookings?.length > 0 ? (count / bookings.length) * 100 : 0
  }))
}

const getServiceDistribution = async (bookings) => {
  const { data: services } = await supabase
    .from('services')
    .select('id, title')

  const serviceCount = {}

  bookings?.forEach(b => {
    serviceCount[b.service_id] = (serviceCount[b.service_id] || 0) + 1
  })

  return Object.entries(serviceCount).map(([serviceId, count]) => {
    const service = services?.find(s => s.id === serviceId)
    return {
      serviceId,
      serviceName: service?.title || 'Unknown',
      count,
      percentage: bookings?.length > 0 ? (count / bookings.length) * 100 : 0
    }
  }).sort((a, b) => b.count - a.count)
}

const calculatePeakHours = (bookings) => {
  const hourCounts = {}

  bookings?.forEach(b => {
    if (b.scheduled_time) {
      const hour = parseInt(b.scheduled_time.split(':')[0])
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    }
  })

  return Object.entries(hourCounts)
    .map(([hour, count]) => ({
      hour: `${hour}:00`,
      count,
      percentage: bookings?.length > 0 ? (count / bookings.length) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count)
}

const calculateRevenueByPeriod = (bookings, period) => {
  const revenue = []
  const now = new Date()

  if (period === 'week') {
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dayBookings = bookings?.filter(b => {
        const bookingDate = new Date(b.created_at)
        return bookingDate.toDateString() === date.toDateString()
      }) || []

      revenue.push({
        date: date.toISOString().split('T')[0],
        amount: dayBookings.reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0)
      })
    }
  } else if (period === 'month') {
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dayBookings = bookings?.filter(b => {
        const bookingDate = new Date(b.created_at)
        return bookingDate.toDateString() === date.toDateString()
      }) || []

      revenue.push({
        date: date.toISOString().split('T')[0],
        amount: dayBookings.reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0)
      })
    }
  }

  return revenue
}

const calculatePaymentMethodDistribution = (payments) => {
  const methods = {}

  payments?.forEach(p => {
    methods[p.payment_method] = (methods[p.payment_method] || 0) + 1
  })

  return Object.entries(methods).map(([method, count]) => ({
    method,
    count,
    percentage: payments?.length > 0 ? (count / payments.length) * 100 : 0
  }))
}

const calculateRevenueByService = async (payments) => {
  const serviceRevenue = {}

  for (const payment of payments || []) {
    if (payment.booking?.service_id) {
      serviceRevenue[payment.booking.service_id] =
        (serviceRevenue[payment.booking.service_id] || 0) + parseFloat(payment.amount || 0)
    }
  }

  const { data: services } = await supabase
    .from('services')
    .select('id, title')

  return Object.entries(serviceRevenue).map(([serviceId, amount]) => {
    const service = services?.find(s => s.id === serviceId)
    return {
      serviceId,
      serviceName: service?.title || 'Unknown',
      amount
    }
  }).sort((a, b) => b.amount - a.amount)
}

const calculateRevenueByVehicleType = (payments) => {
  const vehicleRevenue = {}

  payments?.forEach(p => {
    if (p.booking?.vehicle_type) {
      vehicleRevenue[p.booking.vehicle_type] =
        (vehicleRevenue[p.booking.vehicle_type] || 0) + parseFloat(p.amount || 0)
    }
  })

  return Object.entries(vehicleRevenue).map(([type, amount]) => ({
    vehicleType: type,
    amount
  })).sort((a, b) => b.amount - a.amount)
}

const calculateMonthlyRevenueTrend = (payments) => {
  const monthlyRevenue = {}

  payments?.forEach(p => {
    const date = new Date(p.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthlyRevenue[key] = (monthlyRevenue[key] || 0) + parseFloat(p.amount || 0)
  })

  return Object.entries(monthlyRevenue)
    .map(([month, amount]) => ({
      month,
      amount
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12) // Last 12 months
}

const calculatePaymentSuccessRate = (payments) => {
  if (!payments || payments.length === 0) return 0
  const successful = payments.filter(p => p.status === 'paid').length
  return (successful / payments.length) * 100
}

const calculatePopularityScore = (bookings) => {
  if (!bookings || bookings.length === 0) return 0

  const now = new Date()
  const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30))

  const recentBookings = bookings.filter(b =>
    new Date(b.created_at) >= thirtyDaysAgo
  ).length

  return recentBookings
}

const calculateServiceRating = (serviceBookings, reviews) => {
  const bookingIds = serviceBookings?.map(b => b.id) || []
  const serviceReviews = reviews?.filter(r => bookingIds.includes(r.booking_id)) || []

  if (serviceReviews.length === 0) return 0

  const totalRating = serviceReviews.reduce((sum, r) => sum + r.overall_rating, 0)
  return totalRating / serviceReviews.length
}

const groupServicesByCategory = (services) => {
  const categories = {}

  services?.forEach(service => {
    if (!categories[service.category]) {
      categories[service.category] = {
        category: service.category,
        services: [],
        totalBookings: 0,
        totalRevenue: 0
      }
    }

    categories[service.category].services.push(service)
    categories[service.category].totalBookings += service.totalBookings
    categories[service.category].totalRevenue += service.totalRevenue
  })

  return Object.values(categories)
}

// ============================================
// REAL-TIME STATISTICS (For Live Updates)
// ============================================

/**
 * Get real-time statistics for dashboard
 * @returns {Object} Real-time stats
 */
export const getRealTimeStats = async () => {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Today's bookings
    const { data: todayBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .gte('created_at', todayStart.toISOString())

    if (bookingsError) throw bookingsError

    // Active workers
    const { data: activeWorkers, error: workersError } = await supabase
      .from('worker_profiles')
      .select('id, status')
      .in('status', ['available', 'busy'])

    if (workersError) throw workersError

    // Pending bookings needing attention
    const { data: pendingBookings, error: pendingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (pendingError) throw pendingError

    return {
      timestamp: now.toISOString(),
      todayStats: {
        newBookings: todayBookings?.length || 0,
        revenue: todayBookings?.reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0) || 0,
        activeWorkers: activeWorkers?.length || 0,
        pendingActions: pendingBookings?.length || 0
      },
      pendingBookings: pendingBookings || [],
      activeWorkersList: activeWorkers || []
    }
  } catch (error) {
    console.error('Error fetching real-time stats:', error)
    throw error
  }
}