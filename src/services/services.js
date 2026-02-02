import { supabase } from './supabaseClient'

// Get all services with pagination and filtering
export const getServices = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      is_active = '',
      minPrice = null,
      maxPrice = null,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options

    let query = supabase
      .from('services')
      .select('*', { count: 'exact' })

    // Apply search filter
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply category filter
    if (category) {
      query = query.eq('category', category)
    }

    // Apply active status filter (use is_active, not status)
    if (is_active !== '') {
      query = query.eq('is_active', is_active === 'true')
    }

    // Apply price range filters
    // Normalize possible string inputs (e.g., "" from form fields)
    const minPriceNum = (minPrice === '' || minPrice === null) ? null : Number(minPrice)
    const maxPriceNum = (maxPrice === '' || maxPrice === null) ? null : Number(maxPrice)

    if (Number.isFinite(minPriceNum)) {
      query = query.gte('base_price', minPriceNum)
    }
    if (Number.isFinite(maxPriceNum)) {
      query = query.lte('base_price', maxPriceNum)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination (ensure numeric)
    const pageNum = Number(page) || 1
    const limitNum = Number(limit) || 10
    const from = (pageNum - 1) * limitNum
    const to = from + limitNum - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      // Log full Supabase error details to aid debugging
      console.error('Supabase getServices error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw new Error(error.message || 'Failed to fetch services')
    }

    const total = typeof count === 'number' ? count : 0
    return {
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: limitNum > 0 ? Math.ceil(total / limitNum) : 0
      }
    }
  } catch (error) {
    console.error('Error fetching services:', error)
    throw error
  }
}

// Get a single service by ID
export const getService = async (id) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching service:', error)
    throw error
  }
}

// Get service by key (not slug - your DB has 'key' field)
export const getServiceByKey = async (key) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('key', key)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching service by key:', error)
    throw error
  }
}

// Create a new service
export const createService = async (serviceData) => {
  try {
    // Generate key from title if not provided
    const key = serviceData.key || serviceData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '')

    const insertData = {
      key,
      title: serviceData.title,
      description: serviceData.description || null,
      category: serviceData.category,
      cartype: serviceData.cartype || null,
      base_price: parseFloat(serviceData.base_price),
      duration_minutes: parseInt(serviceData.duration_minutes),
      icon_name: serviceData.icon_name || null,
      is_active: serviceData.is_active !== undefined ? serviceData.is_active : true,
      sedan_multiplier: parseFloat(serviceData.sedan_multiplier) || 1.00,
      suv_multiplier: parseFloat(serviceData.suv_multiplier) || 1.20,
      van_multiplier: parseFloat(serviceData.van_multiplier) || 1.40,
      truck_multiplier: parseFloat(serviceData.truck_multiplier) || 1.60,
      price: serviceData.price ? parseFloat(serviceData.price) : parseFloat(serviceData.base_price),
      image_url: serviceData.image_url || null,
      notes: serviceData.notes || null,
      inclusions: serviceData.inclusions || [],
      exclusions: serviceData.exclusions || []
    }

    console.log('📝 Attempting to create service with data:', insertData)

    const { data, error } = await supabase
      .from('services')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Supabase error:', error)
      console.error('❌ Error properties:', Object.keys(error))
      console.error('❌ Full error object:', JSON.stringify(error, null, 2))
      
      // Create a more informative error message
      const errorMessage = error.message || error.error_description || error.hint || 'Unknown database error'
      const detailedError = new Error(errorMessage)
      detailedError.details = error.details
      detailedError.hint = error.hint
      detailedError.code = error.code
      
      throw detailedError
    }
    
    if (!data) {
      throw new Error('No data returned from insert operation')
    }
    
    console.log('✅ Service created successfully:', data)
    return data
  } catch (error) {
    console.error('🔥 Error creating service:', error)
    console.error('🔥 Error type:', typeof error)
    console.error('🔥 Error constructor:', error.constructor.name)
    throw error
  }
}

// Update an existing service
export const updateService = async (id, updates) => {
  try {
    // If title is being updated, regenerate key
    if (updates.title && !updates.key) {
      updates.key = updates.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '')
    }

    const { data, error } = await supabase
      .from('services')
      .update({ 
        ...updates, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating service:', error)
    throw error
  }
}

// Delete a service (soft delete by setting is_active to false)
export const deleteService = async (id) => {
  try {
    console.log('🗑️ Deleting service with ID:', id)
    
    // Get the service first to check for associated image
    const { data: service, error: fetchError } = await supabase
      .from('services')
      .select('image_url')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching service:', fetchError)
      throw fetchError
    }

    // If there's an image, delete it from storage
    if (service?.image_url) {
      try {
        // Extract file path from the public URL
        const urlParts = service.image_url.split('/storage/v1/object/public/icon-image/')
        if (urlParts.length > 1) {
          const filePath = urlParts[1]
          console.log('🗑️ Deleting image from storage:', filePath)
          
          const { error: storageError } = await supabase
            .storage
            .from('icon-image')
            .remove([filePath])
          
          if (storageError) {
            console.warn('⚠️ Failed to delete image from storage:', storageError)
            // Don't throw here - still delete the service record
          }
        }
      } catch (imgError) {
        console.warn('⚠️ Error processing image deletion:', imgError)
        // Continue with service deletion even if image deletion fails
      }
    }

    // Delete the service record
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ Supabase error:', error)
      throw new Error(error.message || 'Failed to delete service')
    }

    console.log('✅ Service deleted successfully')
    return true
  } catch (error) {
    console.error('🔥 Error deleting service:', error)
    throw error
  }
}

// Toggle service active status
export const toggleServiceStatus = async (id) => {
  try {
    // First get the current status
    const { data: service, error: fetchError } = await supabase
      .from('services')
      .select('is_active')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    // Toggle the status
    const newStatus = !service.is_active

    const { data, error } = await supabase
      .from('services')
      .update({ 
        is_active: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error toggling service status:', error)
    throw error
  }
}

// Get service categories
export const getServiceCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('category')
      .not('category', 'is', null)

    if (error) throw error

    // Extract unique categories
    const categories = [...new Set(data.map(item => item.category))].filter(Boolean)
    
    return categories
  } catch (error) {
    console.error('Error fetching categories:', error)
    throw error
  }
}

// Get service statistics
export const getServiceStats = async () => {
  try {
    // Get total services
    const { count: totalServices, error: totalError } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // Get active services
    const { count: activeServices, error: activeError } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (activeError) throw activeError

    // Get average price
    const { data: priceData, error: priceError } = await supabase
      .from('services')
      .select('base_price')

    if (priceError) throw priceError

    const prices = priceData.map(item => item.base_price).filter(price => price !== null)
    const averagePrice = prices.length > 0 
      ? prices.reduce((sum, price) => sum + price, 0) / prices.length 
      : 0

    // Get categories count
    const categories = await getServiceCategories()

    return {
      totalServices,
      activeServices,
      averagePrice: Math.round(averagePrice),
      categoriesCount: categories.length
    }
  } catch (error) {
    console.error('Error fetching service stats:', error)
    throw error
  }
}

// Get popular services (most booked)
export const getPopularServices = async (limit = 5) => {
  try {
    // First get booking counts per service
    const { data: bookingCounts, error: bookingError } = await supabase
      .from('bookings')
      .select('service_id')
      .not('service_id', 'is', null)

    if (bookingError) throw bookingError

    // Count bookings per service
    const serviceCounts = bookingCounts.reduce((acc, booking) => {
      acc[booking.service_id] = (acc[booking.service_id] || 0) + 1
      return acc
    }, {})

    // Sort by count and get top service IDs
    const topServiceIds = Object.entries(serviceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id)

    if (topServiceIds.length === 0) {
      // If no bookings, return latest active services
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    }

    // Get the popular services
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .in('id', topServiceIds)

    if (error) throw error

    // Sort them by booking count
    const sortedServices = data.sort((a, b) => {
      const countA = serviceCounts[a.id] || 0
      const countB = serviceCounts[b.id] || 0
      return countB - countA
    })

    // Add booking count to each service
    return sortedServices.map(service => ({
      ...service,
      bookingCount: serviceCounts[service.id] || 0
    }))
  } catch (error) {
    console.error('Error fetching popular services:', error)
    throw error
  }
}

// Search services with autocomplete
export const searchServices = async (query, limit = 10) => {
  try {
    if (!query || query.length < 2) {
      return []
    }

    const { data, error } = await supabase
      .from('services')
      .select('id, title, category, base_price')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(limit)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error searching services:', error)
    throw error
  }
}

// Get services by category
export const getServicesByCategory = async (category, options = {}) => {
  try {
    const { 
      page = 1, 
      limit = 12,
      sortBy = 'title',
      sortOrder = 'asc'
    } = options

    let query = supabase
      .from('services')
      .select('*', { count: 'exact' })
      .eq('category', category)
      .eq('is_active', true)

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
    console.error('Error fetching services by category:', error)
    throw error
  }
}

// Update service pricing
export const updateServicePricing = async (id, pricingData) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .update({
        base_price: pricingData.base_price,
        price: pricingData.price || pricingData.base_price,
        sedan_multiplier: pricingData.sedan_multiplier || 1.00,
        suv_multiplier: pricingData.suv_multiplier || 1.20,
        van_multiplier: pricingData.van_multiplier || 1.40,
        truck_multiplier: pricingData.truck_multiplier || 1.60,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating service pricing:', error)
    throw error
  }
}

// Bulk update services status
export const bulkUpdateServicesStatus = async (serviceIds, is_active) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .update({ 
        is_active,
        updated_at: new Date().toISOString()
      })
      .in('id', serviceIds)
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error bulk updating services:', error)
    throw error
  }
}

// Duplicate a service
export const duplicateService = async (id) => {
  try {
    // Get the original service
    const { data: original, error: fetchError } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    // Remove id and timestamps, add "Copy of" to title
    const { id: _, created_at, updated_at, ...serviceData } = original
    serviceData.title = `Copy of ${serviceData.title}`
    serviceData.key = `copy_of_${serviceData.key}_${Date.now()}`
    serviceData.is_active = false // Set as inactive by default

    // Create the duplicate
    return await createService(serviceData)
  } catch (error) {
    console.error('Error duplicating service:', error)
    throw error
  }
}

// Get active services only
export const getActiveServices = async () => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('title', { ascending: true })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching active services:', error)
    throw error
  }
}

// Get service with worker assignments
export const getServiceWithWorkers = async (serviceId) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select(`
        *,
        worker_services(
          id,
          custom_price,
          is_active,
          worker:worker_profiles(
            id,
            business_name,
            user:profiles(full_name, avatar_url)
          )
        )
      `)
      .eq('id', serviceId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching service with workers:', error)
    throw error
  }
}