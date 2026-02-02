import { supabase } from './supabaseClient'

// Get all payments with pagination and filtering
export const getPayments = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      paymentMethod = '',
      bookingId = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options

    let query = supabase
      .from('payments')
      .select(`
        *,
        customer:customer_id (
          id,
          full_name,
          email,
          phone,
          avatar_url
        ),
        booking:booking_id (
          id,
          booking_number,
          service_id,
          scheduled_date,
          scheduled_time,
          status
        ),
        worker:worker_id (
          id,
          user_id,
          business_name
        )
      `, { count: 'exact' })

    // Apply search filter (by transaction ID or customer name/email)
    if (search) {
      query = query.or(`gateway_transaction_id.ilike.%${search}%,gateway_reference.ilike.%${search}%`)
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply payment method filter
    if (paymentMethod) {
      query = query.eq('payment_method', paymentMethod)
    }

    // Apply booking filter
    if (bookingId) {
      query = query.eq('booking_id', bookingId)
    }

    // Apply date range filter
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    console.log('Fetching payments with customer data...')
    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    console.log('Payments fetched:', data?.length, 'records')
    console.log('Sample payment:', data?.[0])

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  } catch (error) {
    console.error('Error fetching payments:', error)
    throw error
  }
}

// Get a single payment by ID
export const getPayment = async (id) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        customer:customer_id (
          id,
          full_name,
          email,
          phone,
          avatar_url,
          loyalty_points,
          status
        ),
        booking:booking_id (
          id,
          booking_number,
          service_id,
          scheduled_date,
          scheduled_time,
          status,
          vehicle_type,
          vehicle_make,
          vehicle_model,
          service_address_text,
          total_price
        ),
        worker:worker_id (
          id,
          user_id,
          business_name,
          hourly_rate,
          commission_rate
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }
    
    console.log('Payment fetched:', data)
    return data
  } catch (error) {
    console.error('Error fetching payment:', error)
    throw error
  }
}

// Create a new payment
export const createPayment = async (paymentData) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select(`
        *,
        customer:customer_id (
          id,
          full_name,
          email,
          phone
        ),
        booking:booking_id (
          id,
          booking_number,
          service_id,
          scheduled_date,
          scheduled_time
        )
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating payment:', error)
    throw error
  }
}

// Update an existing payment
export const updatePayment = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        customer:customer_id (
          id,
          full_name,
          email,
          phone
        ),
        booking:booking_id (
          id,
          booking_number,
          service_id,
          scheduled_date,
          scheduled_time
        )
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating payment:', error)
    throw error
  }
}

// Delete a payment
export const deletePayment = async (id) => {
  try {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting payment:', error)
    throw error
  }
}

// Process a payment (mark as completed)
export const processPayment = async (id, transactionId) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .update({ 
        status: 'completed',
        gateway_transaction_id: transactionId,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error processing payment:', error)
    throw error
  }
}

// Refund a payment
export const refundPayment = async (id, reason = '') => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .update({ 
        status: 'refunded',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error refunding payment:', error)
    throw error
  }
}

// Get payment statistics
export const getPaymentStats = async () => {
  try {
    // Get total payments
    const { count: totalPayments, error: totalError } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // Get completed payments
    const { count: completedPayments, error: completedError } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')

    if (completedError) throw completedError

    // Get pending payments
    const { count: pendingPayments, error: pendingError } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (pendingError) throw pendingError

    // Get total revenue (completed payments)
    const { data: revenueData, error: revenueError } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')

    if (revenueError) throw revenueError

    const totalRevenue = revenueData?.reduce((total, payment) => 
      total + (parseFloat(payment.amount) || 0), 0
    ) || 0

    // Get this month's revenue
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: monthlyRevenueData, error: monthlyError } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('processed_at', startOfMonth.toISOString())

    if (monthlyError) throw monthlyError

    const monthlyRevenue = monthlyRevenueData?.reduce((total, payment) => 
      total + (parseFloat(payment.amount) || 0), 0
    ) || 0

    return {
      totalPayments: totalPayments || 0,
      completedPayments: completedPayments || 0,
      pendingPayments: pendingPayments || 0,
      totalRevenue,
      monthlyRevenue
    }
  } catch (error) {
    console.error('Error fetching payment stats:', error)
    throw error
  }
}

// Get payments for a specific booking
export const getBookingPayments = async (bookingId) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        customer:customer_id (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching booking payments:', error)
    throw error
  }
}

// Get pending payments
export const getPendingPayments = async () => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        customer:customer_id (
          id,
          full_name,
          email,
          phone
        ),
        booking:booking_id (
          id,
          booking_number,
          scheduled_date,
          scheduled_time
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching pending payments:', error)
    throw error
  }
}

// Get payment methods summary
export const getPaymentMethodsSummary = async () => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('payment_method, amount')
      .eq('status', 'completed')

    if (error) throw error

    // Group by payment method and sum amounts
    const summary = data?.reduce((acc, payment) => {
      const method = payment.payment_method
      if (!acc[method]) {
        acc[method] = { method, total: 0, count: 0 }
      }
      acc[method].total += parseFloat(payment.amount) || 0
      acc[method].count += 1
      return acc
    }, {}) || {}

    return Object.values(summary)
  } catch (error) {
    console.error('Error fetching payment methods summary:', error)
    throw error
  }
}

// Get daily revenue for a date range
export const getDailyRevenue = async (dateFrom, dateTo) => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('amount, processed_at')
      .eq('status', 'completed')
      .gte('processed_at', dateFrom)
      .lte('processed_at', dateTo)
      .order('processed_at', { ascending: true })

    if (error) throw error

    // Group by date and sum amounts
    const dailyRevenue = data?.reduce((acc, payment) => {
      const date = payment.processed_at.split('T')[0]
      if (!acc[date]) {
        acc[date] = 0
      }
      acc[date] += parseFloat(payment.amount) || 0
      return acc
    }, {}) || {}

    return Object.entries(dailyRevenue).map(([date, amount]) => ({
      date,
      amount
    }))
  } catch (error) {
    console.error('Error fetching daily revenue:', error)
    throw error
  }
}