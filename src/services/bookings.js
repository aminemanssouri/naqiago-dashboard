import { supabase } from './supabaseClient'

// Generate unique booking number
const generateBookingNumber = () => {
  const prefix = 'BK'
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

// Get all bookings with pagination and filtering
export const getBookings = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      customerId = '',
      workerId = '',
      serviceId = '',
      dateFrom = '',
      dateTo = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options

    // Fixed query with proper foreign key references
    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:profiles!bookings_customer_id_fkey (
          id,
          full_name,
          email,
          phone,
          avatar_url
        ),
        worker:worker_profiles!bookings_worker_id_fkey (
          id,
          business_name,
          user:profiles!worker_profiles_user_id_fkey (
            full_name,
            email,
            phone,
            avatar_url
          )
        ),
        service:services!bookings_service_id_fkey (
          id,
          title,
          description,
          category,
          base_price,
          duration_minutes
        ),
        service_address:addresses!bookings_service_address_id_fkey (
          id,
          title,
          address_line_1,
          address_line_2,
          city,
          state,
          country
        ),
        payment:payments!payments_booking_id_fkey (
          id,
          payment_method,
          status,
          amount,
          platform_fee,
          worker_earnings,
          processed_at
        )
      `, { count: 'exact' })

    // Apply search filter
    if (search) {
      query = query.or(`booking_number.ilike.%${search}%,service_address_text.ilike.%${search}%,special_instructions.ilike.%${search}%,vehicle_make.ilike.%${search}%,vehicle_model.ilike.%${search}%,license_plate.ilike.%${search}%`)
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    // Apply customer filter
    if (customerId) {
      query = query.eq('customer_id', customerId)
    }

    // Apply worker filter
    if (workerId) {
      query = query.eq('worker_id', workerId)
    }

    // Apply service filter
    if (serviceId) {
      query = query.eq('service_id', serviceId)
    }

    // Apply date range filter
    if (dateFrom) {
      query = query.gte('scheduled_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('scheduled_date', dateTo)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('❌ Error fetching bookings:', error)
      console.error('Details:', error.details)
      console.error('Hint:', error.hint)
      throw error
    }

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
    console.error('Error fetching bookings:', error)
    throw error
  }
}

// Get a single booking by ID
export const getBooking = async (id) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customer_id (
          id,
          full_name,
          email,
          phone,
          avatar_url
        ),
        worker:worker_id (
          id,
          user_id,
          business_name,
          user:user_id (
            full_name,
            email,
            phone,
            avatar_url
          )
        ),
        service:service_id (
          id,
          title,
          description,
          category,
          base_price,
          duration_minutes
        ),
        service_address:service_address_id (
          id,
          title,
          address_line_1,
          address_line_2,
          city,
          state,
          country
        ),
        reviews (
          id,
          overall_rating,
          review_text,
          created_at
        ),
        payment:payments!payments_booking_id_fkey (
          id,
          payment_method,
          status,
          amount,
          platform_fee,
          worker_earnings,
          processed_at,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Error fetching booking:', error)
    throw error
  }
}

// Create a new booking
export const createBooking = async (bookingData) => {
  try {
    // Generate booking number if not provided
    const bookingNumber = bookingData.booking_number || generateBookingNumber()
    
    // Clean and prepare the data to match EXACT database schema
    const insertData = {
      booking_number: bookingNumber,
      customer_id: bookingData.customer_id || null,
      worker_id: bookingData.worker_id || null,
      service_id: bookingData.service_id || null,
      status: 'pending', // Make sure this matches your enum exactly
      scheduled_date: bookingData.scheduled_date,
      scheduled_time: bookingData.scheduled_time,
      estimated_duration: parseInt(bookingData.estimated_duration) || 60,
      service_address_id: bookingData.service_address_id || null,
      // service_location is USER-DEFINED (PostGIS) - skip it for now
      service_address_text: bookingData.service_address_text,
      vehicle_type: bookingData.vehicle_type, // Make sure this matches your enum
      vehicle_make: bookingData.vehicle_make || null,
      vehicle_model: bookingData.vehicle_model || null,
      vehicle_year: bookingData.vehicle_year ? parseInt(bookingData.vehicle_year) : null,
      vehicle_color: bookingData.vehicle_color || null,
      license_plate: bookingData.license_plate || null,
      base_price: parseFloat(bookingData.base_price) || 0,
      additional_charges: parseFloat(bookingData.additional_charges) || 0,
      discount_amount: parseFloat(bookingData.discount_amount) || 0,
      total_price: parseFloat(bookingData.total_price) || parseFloat(bookingData.base_price) || 0,
      special_instructions: bookingData.special_instructions || null,
      customer_notes: bookingData.customer_notes || null,
      worker_notes: bookingData.worker_notes || null,
      can_cancel: true,
      can_reschedule: true,
      can_rate: false
    }
    
    // Clean up UUID fields - ensure empty strings become null
    const uuidFields = ['customer_id', 'worker_id', 'service_id', 'service_address_id']
    uuidFields.forEach(field => {
      if (insertData[field] === '') {
        insertData[field] = null
      }
    })
    
    // Remove null/undefined fields that might cause issues
    Object.keys(insertData).forEach(key => {
      if (insertData[key] === undefined) {
        delete insertData[key]
      }
    })
    
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert([insertData]) // Wrap in array
      .select()
      .single()

    if (error) {
      // Better error messages
      if (error.code === '23503') {
        if (error.message.includes('customer_id')) {
          throw new Error('Invalid customer selected. Customer does not exist.')
        }
        if (error.message.includes('worker_id')) {
          throw new Error('Invalid worker selected. Worker profile does not exist.')
        }
        if (error.message.includes('service_id')) {
          throw new Error('Invalid service selected. Service does not exist.')
        }
        if (error.message.includes('service_address_id')) {
          throw new Error('Invalid address selected. Address does not exist.')
        }
      }
      
      if (error.code === '22P02') {
        throw new Error('Invalid enum value. Check vehicle_type or status values.')
      }
      
      if (error.code === '23514') {
        if (error.message.includes('scheduled_date')) {
          throw new Error('Scheduled date cannot be in the past.')
        }
        if (error.message.includes('total_price')) {
          throw new Error('Total price must be 0 or greater.')
        }
      }
      
      throw new Error(error.message || 'Failed to create booking')
    }
    
    // Create payment record if payment information is provided
    if (bookingData.payment_method) {
      try {
        const platformFee = parseFloat(bookingData.platform_fee) || 
                           (parseFloat(bookingData.total_price) * parseFloat(bookingData.platform_fee_percentage || 15)) / 100
        const workerEarnings = parseFloat(bookingData.total_price) - platformFee
        
        const paymentData = {
          booking_id: booking.id,
          customer_id: bookingData.customer_id,
          worker_id: bookingData.worker_id,
          amount: parseFloat(bookingData.total_price),
          currency: 'MAD',
          payment_method: bookingData.payment_method,
          status: bookingData.payment_status || 'pending',
          platform_fee: platformFee,
          worker_earnings: workerEarnings
        }
        
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert([paymentData])
          .select()
          .single()
        
      } catch (paymentError) {
        console.error('⚠️ Payment creation error:', paymentError)
        // Don't fail the entire booking creation
      }
    }
    
    return booking
  } catch (error) {
    console.error('Error creating booking:', error)
    throw error
  }
}

// Update an existing booking
export const updateBooking = async (id, updates) => {
  try {
    // Extract payment fields - these DON'T belong in bookings table!
    const { 
      payment_method, 
      payment_status, 
      platform_fee_percentage,
      platform_fee,
      worker_earnings,
      ...bookingUpdates 
    } = updates
    
    // Clean up empty strings - convert to null for UUID fields
    const cleanedUpdates = { ...bookingUpdates }
    const uuidFields = ['customer_id', 'worker_id', 'service_id', 'service_address_id']
    
    uuidFields.forEach(field => {
      if (cleanedUpdates[field] === '' || cleanedUpdates[field] === undefined) {
        cleanedUpdates[field] = null
      }
    })
    
    // Remove undefined values
    Object.keys(cleanedUpdates).forEach(key => {
      if (cleanedUpdates[key] === undefined) {
        delete cleanedUpdates[key]
      }
    })
    
    // Update booking record (without payment fields)
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        ...cleanedUpdates, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select(`
        *,
        customer:customer_id (
          id,
          full_name,
          email,
          phone,
          avatar_url
        ),
        worker:worker_id (
          id,
          user_id,
          business_name,
          user:user_id (
            full_name,
            email,
            phone,
            avatar_url
          )
        ),
        service:service_id (
          id,
          title,
          description,
          category,
          base_price,
          duration_minutes
        ),
        payment:payments!payments_booking_id_fkey (
          id,
          payment_method,
          status,
          amount,
          platform_fee,
          worker_earnings,
          processed_at,
          created_at
        )
      `)
      .single()

    if (error) throw error
    
    // If payment fields were provided, update the related payment record
    if (payment_method || payment_status || platform_fee_percentage) {
      // Check if payment record exists
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('booking_id', id)
        .single()
      
      if (existingPayment) {
        // Build payment update object
        const paymentUpdates = {}
        
        if (payment_method) paymentUpdates.payment_method = payment_method
        if (payment_status) paymentUpdates.status = payment_status
        
        // Calculate platform fee if percentage or total price changed
        if (platform_fee_percentage !== undefined || bookingUpdates.total_price !== undefined) {
          const totalPrice = bookingUpdates.total_price || data.total_price
          const feePercentage = parseFloat(platform_fee_percentage) || 15
          const calculatedPlatformFee = (totalPrice * feePercentage) / 100
          const calculatedWorkerEarnings = totalPrice - calculatedPlatformFee
          
          paymentUpdates.amount = totalPrice
          paymentUpdates.platform_fee = calculatedPlatformFee
          paymentUpdates.worker_earnings = calculatedWorkerEarnings
        }
        
        if (Object.keys(paymentUpdates).length > 0) {
          const { error: paymentError } = await supabase
            .from('payments')
            .update({
              ...paymentUpdates,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPayment.id)
          
          if (paymentError) {
            console.error('⚠️ Failed to update payment record:', paymentError)
            // Don't throw - booking was updated successfully
          }
        }
      } else {
        // No payment record found - could create one here if needed
      }
    }
    
    return data
  } catch (error) {
    console.error('Error updating booking:', error)
    throw error
  }
}

// Delete a booking
export const deleteBooking = async (id) => {
  try {
    // First, check if there are any related payments
    const { data: payments, error: paymentCheckError } = await supabase
      .from('payments')
      .select('id')
      .eq('booking_id', id)
    
    if (paymentCheckError) {
      console.error('Error checking for related payments:', paymentCheckError)
      throw new Error('Failed to check for related payments')
    }
    
    // If there are related payments, delete them first
    if (payments && payments.length > 0) {
      const { error: paymentDeleteError } = await supabase
        .from('payments')
        .delete()
        .eq('booking_id', id)
      
      if (paymentDeleteError) {
        console.error('Error deleting related payments:', paymentDeleteError)
        throw new Error('Failed to delete related payments. Cannot delete booking.')
      }
    }
    
    // Check for related reviews
    const { data: reviews, error: reviewCheckError } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', id)
    
    if (reviewCheckError) {
      console.error('Error checking for related reviews:', reviewCheckError)
      throw new Error('Failed to check for related reviews')
    }
    
    // If there are related reviews, delete them first
    if (reviews && reviews.length > 0) {
      const { error: reviewDeleteError } = await supabase
        .from('reviews')
        .delete()
        .eq('booking_id', id)
      
      if (reviewDeleteError) {
        console.error('Error deleting related reviews:', reviewDeleteError)
        throw new Error('Failed to delete related reviews. Cannot delete booking.')
      }
    }
    
    // Now delete the booking
    const { error: bookingError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)

    if (bookingError) {
      console.error('Error deleting booking:', bookingError)
      console.error('Error details:', {
        message: bookingError.message,
        details: bookingError.details,
        hint: bookingError.hint,
        code: bookingError.code
      })
      
      // Provide more helpful error messages
      if (bookingError.code === '23503') {
        throw new Error('Cannot delete booking: It has related records that depend on it.')
      }
      
      throw bookingError
    }
    
    return true
  } catch (error) {
    console.error('Error deleting booking:', error)
    throw error
  }
}

// Cancel a booking
export const cancelBooking = async (id, cancelledBy, cancellationReason) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy,
        cancellation_reason: cancellationReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error cancelling booking:', error)
    throw error
  }
}

// Update booking status
export const updateBookingStatus = async (id, status, additionalData = {}) => {
  try {
    const updateData = {
      status,
      updated_at: new Date().toISOString(),
      ...additionalData
    }

    // Add timestamp fields based on status
    if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString()
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
      updateData.can_rate = true
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating booking status:', error)
    throw error
  }
}

// Get booking statistics
export const getBookingStats = async (userId = null, userRole = null) => {
  try {
    let baseQuery = supabase.from('bookings')

    // Filter by user if not admin
    if (userId && userRole !== 'admin') {
      if (userRole === 'customer') {
        baseQuery = baseQuery.eq('customer_id', userId)
      } else if (userRole === 'worker') {
        baseQuery = baseQuery.eq('worker_id', userId)
      }
    }

    // Get total bookings
    const { count: totalBookings, error: totalError } = await baseQuery
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // Get pending bookings
    const { count: pendingBookings, error: pendingError } = await baseQuery
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (pendingError) throw pendingError

    // Get confirmed bookings
    const { count: confirmedBookings, error: confirmedError } = await baseQuery
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')

    if (confirmedError) throw confirmedError

    // Get in progress bookings
    const { count: inProgressBookings, error: inProgressError } = await baseQuery
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress')

    if (inProgressError) throw inProgressError

    // Get completed bookings
    const { count: completedBookings, error: completedError } = await baseQuery
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')

    if (completedError) throw completedError

    // Get cancelled bookings
    const { count: cancelledBookings, error: cancelledError } = await baseQuery
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')

    if (cancelledError) throw cancelledError

    // Get today's bookings
    const today = new Date().toISOString().split('T')[0]
    const { count: todayBookings, error: todayError } = await baseQuery
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', today)

    if (todayError) throw todayError

    // Get revenue for completed bookings this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: revenueData, error: revenueError } = await supabase
      .from('bookings')
      .select('total_amount')
      .eq('status', 'completed')
      .gte('created_at', startOfMonth.toISOString())

    if (revenueError) throw revenueError

    const monthlyRevenue = revenueData.reduce((total, booking) => 
      total + (parseFloat(booking.total_amount) || 0), 0
    )

    return {
      totalBookings,
      confirmedBookings,
      completedBookings,
      todayBookings,
      monthlyRevenue
    }
  } catch (error) {
    console.error('Error fetching booking stats:', error)
    throw error
  }
}

// Get bookings for a specific customer
export const getCustomerBookings = async (customerId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = '',
      sortBy = 'booking_date',
      sortOrder = 'desc'
    } = options

    let query = supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .eq('customer_id', customerId)

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
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
    console.error('Error fetching customer bookings:', error)
    throw error
  }
}

// Get upcoming bookings
export const getUpcomingBookings = async (days = 7) => {
  try {
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + days)

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customers:customer_id (
          id,
          full_name,
          email,
          phone
        )
      `)
      .gte('booking_date', today.toISOString().split('T')[0])
      .lte('booking_date', futureDate.toISOString().split('T')[0])
      .in('status', ['pending', 'confirmed'])
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching upcoming bookings:', error)
    throw error
  }
}

// Confirm a booking
export const confirmBooking = async (id) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error confirming booking:', error)
    throw error
  }
}

// Complete a booking
export const completeBooking = async (id) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        can_rate: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error completing booking:', error)
    throw error
  }
}