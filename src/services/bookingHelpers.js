import { supabase } from './supabaseClient'
import { getAvailableWorkers } from './workers'

// Debug: Get all profiles to check what exists
export const debugGetAllProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, status')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    
 
    
    return data
  } catch (error) {
    console.error('Error fetching all profiles:', error)
    throw error
  }
}

// Debug: Check if customers exist
export const checkCustomersExist = async () => {
  try {
    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')
      .eq('status', 'active')

    if (error) throw error
    
     return count > 0
  } catch (error) {
    console.error('Error checking customers:', error)
    return false
  }
}

// Get all customers for booking form
export const getCustomersForBooking = async (options = {}) => {
  try {
    const {
      search = '',
      sortBy = 'full_name',
      sortOrder = 'asc'
    } = options

     
    // First, let's check if ANY profiles exist
    const { count: totalProfiles } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
     
    // Now check for customers specifically
    const { count: customerCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')
    
     
    // Main query
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, phone, avatar_url, role, status, created_at')
      .eq('role', 'customer')
      .eq('status', 'active')

    // Apply search filter
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data, error } = await query

    if (error) {
      console.error('❌ Supabase error:', error)
      throw error
    }

     
    // If no customers found, check what profiles exist
    

    return data || []
  } catch (error) {
    console.error('Error fetching customers for booking:', error)
    throw error
  }
}

// Get all workers for booking form
export const getWorkersForBooking = async () => {
  try {
     // Use the dedicated workers service function
    const workers = await getAvailableWorkers()
     return workers
  } catch (error) {
    console.error('❌ Error fetching workers for booking:', error)
    throw error
  }
}

// Get all active services for booking form
export const getServicesForBooking = async () => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('title')

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching services for booking:', error)
    throw error
  }
}

// Get user addresses for booking form
export const getAddressesForBooking = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('title')

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching addresses for booking:', error)
    throw error
  }
}

// Get all data needed for booking form
export const getBookingFormData = async (userId = null, userRole = null) => {
  try {
    const [customers, workers, services, addresses] = await Promise.all([
      getCustomersForBooking(),
      getWorkersForBooking(),
      getServicesForBooking(),
      userId ? getAddressesForBooking(userId) : []
    ])

    return {
      customers,
      workers,
      services,
      addresses
    }
  } catch (error) {
    console.error('Error fetching booking form data:', error)
    throw error
  }
}

// Validate booking data before submission
export const validateBookingData = (bookingData) => {
  const errors = {}

  // Required fields validation
  if (!bookingData.customer_id) {
    errors.customer_id = 'Customer is required'
  }

  if (!bookingData.service_id) {
    errors.service_id = 'Service is required'
  }

  if (!bookingData.scheduled_date) {
    errors.scheduled_date = 'Scheduled date is required'
  } else {
    const scheduledDate = new Date(bookingData.scheduled_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (scheduledDate < today) {
      errors.scheduled_date = 'Scheduled date cannot be in the past'
    }
  }

  if (!bookingData.scheduled_time) {
    errors.scheduled_time = 'Scheduled time is required'
  }

  if (!bookingData.service_address_text || bookingData.service_address_text.length < 10) {
    errors.service_address_text = 'Complete service address is required (minimum 10 characters)'
  }

  if (!bookingData.vehicle_type) {
    errors.vehicle_type = 'Vehicle type is required'
  }

  if (!bookingData.base_price || bookingData.base_price <= 0) {
    errors.base_price = 'Base price must be greater than 0'
  }

  // Numeric field validation
  if (bookingData.estimated_duration && (isNaN(bookingData.estimated_duration) || bookingData.estimated_duration < 15)) {
    errors.estimated_duration = 'Estimated duration must be at least 15 minutes'
  }

  if (bookingData.vehicle_year && (isNaN(bookingData.vehicle_year) || bookingData.vehicle_year < 1990 || bookingData.vehicle_year > new Date().getFullYear() + 1)) {
    errors.vehicle_year = 'Please enter a valid vehicle year'
  }

  if (bookingData.additional_charges && (isNaN(bookingData.additional_charges) || bookingData.additional_charges < 0)) {
    errors.additional_charges = 'Additional charges must be a positive number'
  }

  if (bookingData.discount_amount && (isNaN(bookingData.discount_amount) || bookingData.discount_amount < 0)) {
    errors.discount_amount = 'Discount amount must be a positive number'
  }

  // Calculate total and validate
  const basePrice = parseFloat(bookingData.base_price || 0)
  const additionalCharges = parseFloat(bookingData.additional_charges || 0)
  const discountAmount = parseFloat(bookingData.discount_amount || 0)
  const totalPrice = basePrice + additionalCharges - discountAmount

  if (totalPrice < 0) {
    errors.total_price = 'Total price cannot be negative'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Format booking data for API submission
export const formatBookingDataForSubmission = (formData) => {
  return {
    // Convert string values to appropriate types
    customer_id: formData.customer_id,
    worker_id: formData.worker_id || null,
    service_id: formData.service_id,
    status: formData.status || 'pending',
    
    // Date and time
    scheduled_date: formData.scheduled_date,
    scheduled_time: formData.scheduled_time,
    estimated_duration: parseInt(formData.estimated_duration) || 60,
    
    // Address
    service_address_id: formData.service_address_id || null,
    service_address_text: formData.service_address_text,
    
    // Vehicle information
    vehicle_type: formData.vehicle_type,
    vehicle_make: formData.vehicle_make || null,
    vehicle_model: formData.vehicle_model || null,
    vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year) : null,
    vehicle_color: formData.vehicle_color || null,
    license_plate: formData.license_plate || null,
    
    // Pricing
    base_price: parseFloat(formData.base_price),
    additional_charges: parseFloat(formData.additional_charges || 0),
    discount_amount: parseFloat(formData.discount_amount || 0),
    total_price: parseFloat(formData.base_price || 0) + 
                 parseFloat(formData.additional_charges || 0) - 
                 parseFloat(formData.discount_amount || 0),
    
    // Notes
    special_instructions: formData.special_instructions || null,
    customer_notes: formData.customer_notes || null,
    worker_notes: formData.worker_notes || null,
    
    // Booking number (will be generated if not provided)
    booking_number: formData.booking_number || null
  }
}