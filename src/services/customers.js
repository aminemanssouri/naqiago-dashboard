import { supabase } from './supabaseClient'

 export const getCustomers = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      is_verified = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'customer') // Filter for customers only

     if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply verification filter
    if (is_verified !== '') {
      query = query.eq('is_verified', is_verified === 'verified')
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Error fetching customers:', error)
    throw error
  }
}

// Get a single customer by ID
export const getCustomer = async (id) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('role', 'customer')
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching customer:', error)
    throw error
  }
}

 export const createCustomer = async (customerData) => {
  try {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerData)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create customer')
    }

    return data.customer
  } catch (error) {
    console.error('Error creating customer:', error)
    throw error
  }
}

 export const updateCustomer = async (id, updates) => {
  try {
     const { password, ...profileUpdates } = updates

    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        ...profileUpdates, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .eq('role', 'customer')
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating customer:', error)
    throw error
  }
}

 export const deleteCustomer = async (id) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('role', 'customer')

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting customer:', error)
    throw error
  }
}

 export const getCustomerStats = async () => {
  try {
     const { count: totalCustomers, error: totalError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')

    if (totalError) throw totalError

     const { count: activeCustomers, error: activeError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')
      .eq('status', 'active')

    if (activeError) throw activeError

    // Get verified customers
    const { count: verifiedCustomers, error: verifiedError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')
      .eq('is_verified', true)

    if (verifiedError) throw verifiedError

     const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: newThisMonth, error: newError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')
      .gte('created_at', startOfMonth.toISOString())

    if (newError) throw newError

    return {
      totalCustomers,
      activeCustomers,
      verifiedCustomers,
      newThisMonth
    }
  } catch (error) {
    console.error('Error fetching customer stats:', error)
    throw error
  }
}

 export const searchCustomerByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .eq('role', 'customer')
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  } catch (error) {
    console.error('Error searching customer by email:', error)
    throw error
  }
}

 export const updateLoyaltyPoints = async (customerId, points) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        loyalty_points: points,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .eq('role', 'customer')
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating loyalty points:', error)
    throw error
  }
}

 export const getCustomerBookings = async (customerId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options

    let query = supabase
      .from('bookings')
      .select(`
        *,
        service:services(title, category, base_price),
        worker:worker_profiles(business_name, user:profiles(full_name, avatar_url))
      `, { count: 'exact' })
      .eq('customer_id', customerId)

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Error fetching customer bookings:', error)
    throw error
  }
}

// Get customer's payments
export const getCustomerPayments = async (customerId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options

    let query = supabase
      .from('payments')
      .select(`
        *,
        booking:bookings(booking_number, scheduled_date, service:services(title))
      `, { count: 'exact' })
      .eq('customer_id', customerId)

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Error fetching customer payments:', error)
    throw error
  }
}

// Get customer analytics summary
export const getCustomerAnalytics = async (customerId) => {
  try {
    // Fetch customer, bookings, and payments
    const [customer, bookingsResponse, paymentsResponse] = await Promise.all([
      getCustomer(customerId),
      getCustomerBookings(customerId, { limit: 1000 }),
      getCustomerPayments(customerId, { limit: 1000 })
    ])

    const bookings = bookingsResponse.data || []
    const payments = paymentsResponse.data || []

    // Calculate statistics
    const totalBookings = bookings.length
    const completedBookings = bookings.filter(b => b.status === 'completed').length
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length
    const pendingBookings = bookings.filter(b => b.status === 'pending').length

    const totalSpent = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

    const averageBookingValue = completedBookings > 0 ? totalSpent / completedBookings : 0

    // Get last booking
    const sortedBookings = [...bookings].sort((a, b) => 
      new Date(b.scheduled_date) - new Date(a.scheduled_date)
    )
    const lastBooking = sortedBookings[0] || null

    // Get most used service
    const serviceStats = bookings
      .filter(b => b.status === 'completed' && b.service)
      .reduce((acc, booking) => {
        const serviceTitle = booking.service.title
        if (!acc[serviceTitle]) {
          acc[serviceTitle] = { count: 0, total: 0 }
        }
        acc[serviceTitle].count++
        acc[serviceTitle].total += parseFloat(booking.total_price || 0)
        return acc
      }, {})

    const mostUsedService = Object.entries(serviceStats)
      .sort((a, b) => b[1].count - a[1].count)[0]

    return {
      customer,
      bookings,
      payments,
      stats: {
        totalBookings,
        completedBookings,
        cancelledBookings,
        pendingBookings,
        totalSpent,
        averageBookingValue,
        lastBooking,
        mostUsedService: mostUsedService ? {
          name: mostUsedService[0],
          count: mostUsedService[1].count,
          total: mostUsedService[1].total
        } : null
      }
    }
  } catch (error) {
    console.error('Error fetching customer analytics:', error)
    throw error
  }
}