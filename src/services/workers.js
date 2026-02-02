import { supabase } from './supabaseClient'

// Get all available workers for booking selection
export const getAvailableWorkers = async (options = {}) => {
  try {
    const {
      search = '',
      status = 'available',
      sortBy = 'business_name',
      sortOrder = 'asc'
    } = options

     
    let query = supabase
      .from('worker_profiles')
      .select(`
        id,
        user_id,
        business_name,
        bio,
        experience_years,
        specialties,
        service_radius_km,
        status,
        hourly_rate,
        commission_rate,
        works_weekends,
        start_time,
        end_time,
        total_jobs_completed,
        total_earnings,
        average_completion_time,
        created_at,
        updated_at,
        user:user_id (
          id,
          full_name,
          email,
          phone,
          avatar_url,
          role,
          status,
          worker_rating,
          worker_review_count,
          is_verified
        )
      `)
      .eq('user.role', 'worker')  // Only users with worker role
      .eq('user.status', 'active') // Only active users

    // Apply status filter (default to 'available')
    if (status) {
      query = query.eq('status', status)
    }

    // Apply search filter
    if (search) {
      query = query.or(
        `business_name.ilike.%${search}%,bio.ilike.%${search}%,specialties.ilike.%${search}%,user.full_name.ilike.%${search}%,user.email.ilike.%${search}%`
      )
    }

    // Apply sorting
    if (sortBy === 'user.full_name') {
      query = query.order('full_name', { ascending: sortOrder === 'asc', foreignTable: 'user' })
    } else if (sortBy === 'user.worker_rating') {
      query = query.order('worker_rating', { ascending: sortOrder === 'asc', foreignTable: 'user' })
    } else {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    }

    const { data, error } = await query

     
    
    if (error) {
      console.error('❌ Supabase error:', error)
      throw error
    }
    
    // ONLY return workers that have proper worker_profiles records
    
    
    // Log the worker_profiles IDs that will be used for bookings
    
    
    return data
  } catch (error) {
    console.error('❌ Error fetching available workers:', error)
    throw error
  }
}

// Get all workers (for admin purposes)
export const getAllWorkers = async () => {
  try {
    const { data, error } = await supabase
      .from('worker_profiles')
      .select(`
        id,
        user_id,
        business_name,
        bio,
        experience_years,
        specialties,
        service_radius_km,
        status,
        hourly_rate,
        commission_rate,
        works_weekends,
        start_time,
        end_time,
        total_jobs_completed,
        total_earnings,
        average_completion_time,
        created_at,
        updated_at,
        user:user_id (
          id,
          full_name,
          email,
          phone,
          avatar_url,
          role,
          status,
          worker_rating,
          worker_review_count,
          is_verified,
          background_check_status
        )
      `)
      .in(
        'user_id',
        supabase
          .from('users')
          .select('id')
          .eq('role', 'worker')
      )
      .order('business_name');

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching workers:', err.message);
    return [];
  }
};


// Get single worker by ID
export const getWorkerById = async (workerId) => {
  try {
    const { data, error } = await supabase
      .from('worker_profiles')
      .select(`
        id,
        user_id,
        business_name,
        bio,
        experience_years,
        specialties,
        service_radius_km,
        status,
        hourly_rate,
        commission_rate,
        works_weekends,
        start_time,
        end_time,
        total_jobs_completed,
        total_earnings,
        average_completion_time,
        created_at,
        updated_at,
        user:user_id (
          id,
          full_name,
          email,
          phone,
          avatar_url,
          role,
          status,
          worker_rating,
          worker_review_count,
          is_verified,
          background_check_status
        )
      `)
      .eq('id', workerId)
      .eq('user.role', 'worker')
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching worker by ID:', error)
    throw error
  }
}

// Get workers by status
export const getWorkersByStatus = async (status) => {
  try {
    const { data, error } = await supabase
      .from('worker_profiles')
      .select(`
        id,
        user_id,
        business_name,
        bio,
        experience_years,
        specialties,
        service_radius_km,
        status,
        hourly_rate,
        commission_rate,
        works_weekends,
        start_time,
        end_time,
        total_jobs_completed,
        total_earnings,
        average_completion_time,
        created_at,
        updated_at,
        user:user_id (
          id,
          full_name,
          email,
          phone,
          avatar_url,
          role,
          status,
          worker_rating,
          worker_review_count,
          is_verified
        )
      `)
      .eq('status', status)
      .eq('user.role', 'worker')
      .eq('user.status', 'active')
      .order('business_name')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching workers by status:', error)
    throw error
  }
}

// Get workers with specific services
export const getWorkersForService = async (serviceId) => {
  try {
    const { data, error } = await supabase
      .from('worker_services')
      .select(`
        worker_id,
        custom_price,
        is_active,
        worker:worker_id (
          id,
          user_id,
          business_name,
          bio,
          status,
          hourly_rate,
          total_jobs_completed,
          user:user_id (
            id,
            full_name,
            email,
            phone,
            avatar_url,
            role,
            status,
            worker_rating,
            worker_review_count,
            is_verified
          )
        )
      `)
      .eq('service_id', serviceId)
      .eq('is_active', true)
      .eq('worker.status', 'available')
      .eq('worker.user.role', 'worker')
      .eq('worker.user.status', 'active')
      .order('worker.business_name')

    if (error) throw error
    
    // Transform data to flatten worker info
    return data?.map(item => ({
      ...item.worker,
      custom_service_price: item.custom_price
    })) || []
  } catch (error) {
    console.error('Error fetching workers for service:', error)
    throw error
  }
}

// Update worker status
export const updateWorkerStatus = async (workerId, status) => {
  try {
    const { data, error } = await supabase
      .from('worker_profiles')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', workerId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating worker status:', error)
    throw error
  }
}

// Create a new worker (auth user + profile + worker_profile) - USES API ROUTE
export const createWorker = async (workerData) => {
  try {
     
    const response = await fetch('/api/workers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workerData)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create worker')
    }

     return data.worker
  } catch (error) {
    console.error('Error creating worker:', error)
    throw error
  }
}

// Create a new worker profile (for existing user) - DIRECT DATABASE INSERT
export const createWorkerProfile = async (workerData) => {
  try {
     
    const { data, error } = await supabase
      .from('worker_profiles')
      .insert([{
        user_id: workerData.user_id,
        business_name: workerData.business_name,
        bio: workerData.bio || null,
        experience_years: workerData.experience_years ? parseInt(workerData.experience_years) : null,
        specialties: workerData.specialties || null,
        service_radius_km: workerData.service_radius_km ? parseInt(workerData.service_radius_km) : 10,
        status: workerData.status || 'available',
        hourly_rate: workerData.hourly_rate ? parseFloat(workerData.hourly_rate) : null,
        commission_rate: workerData.commission_rate ? parseFloat(workerData.commission_rate) : 15.00,
        works_weekends: workerData.works_weekends !== undefined ? workerData.works_weekends : true,
        start_time: workerData.start_time || '08:00:00',
        end_time: workerData.end_time || '18:00:00'
      }])
      .select(`
        *,
        user:user_id (
          id,
          full_name,
          email,
          phone,
          avatar_url,
          role,
          status
        )
      `)
      .single()

    if (error) throw error
    
     return data
  } catch (error) {
    console.error('Error creating worker profile:', error)
    throw error
  }
}

// Update worker profile
export const updateWorkerProfile = async (workerId, updates) => {
  try {
     
    const updateData = {
      business_name: updates.business_name,
      bio: updates.bio || null,
      experience_years: updates.experience_years ? parseInt(updates.experience_years) : null,
      specialties: updates.specialties || null,
      service_radius_km: updates.service_radius_km ? parseInt(updates.service_radius_km) : 10,
      status: updates.status,
      hourly_rate: updates.hourly_rate ? parseFloat(updates.hourly_rate) : null,
      commission_rate: updates.commission_rate ? parseFloat(updates.commission_rate) : 15.00,
      works_weekends: updates.works_weekends !== undefined ? updates.works_weekends : true,
      start_time: updates.start_time || '08:00:00',
      end_time: updates.end_time || '18:00:00',
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('worker_profiles')
      .update(updateData)
      .eq('id', workerId)
      .select(`
        *,
        user:user_id (
          id,
          full_name,
          email,
          phone,
          avatar_url,
          role,
          status
        )
      `)
      .single()

    if (error) throw error
    
     return data
  } catch (error) {
    console.error('Error updating worker profile:', error)
    throw error
  }
}

// Soft delete (deactivate) worker profile
export const deactivateWorkerProfile = async (workerId) => {
  try {
     
    // Update worker status to 'offline' or 'inactive'
    const { data, error } = await supabase
      .from('worker_profiles')
      .update({ 
        status: 'offline',
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', workerId)
      .select()
      .single()

    if (error) {
      console.error('Error deactivating worker profile:', error)
      throw error
    }
    
     return data
  } catch (error) {
    console.error('Error deactivating worker profile:', error)
    throw error
  }
}

// Update the deleteWorkerProfile to check and offer alternatives
export const deleteWorkerProfile = async (workerId, options = {}) => {
  const { force = false, reassignTo = null } = options
  
  try {
     
    // First check if there are any related bookings
    const { data: bookings, error: bookingCheckError, count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: false })
      .eq('worker_id', workerId)
    
    if (bookingCheckError) {
       
      // Don't throw error, just log warning and continue
      console.warn('⚠️ Could not check for related bookings, proceeding with caution')
    }
    
    if (bookings && bookings.length > 0) {
      console.warn(`⚠️ Worker has ${bookings.length} related bookings`)
      
      // If reassignTo is provided, reassign all bookings
      if (reassignTo) {
         const { error: reassignError } = await supabase
          .from('bookings')
          .update({ 
            worker_id: reassignTo,
            updated_at: new Date().toISOString()
          })
          .eq('worker_id', workerId)
        
        if (reassignError) {
          console.error('Error reassigning bookings:', reassignError)
          throw new Error('Failed to reassign bookings')
        }
       } 
      // If force delete is enabled, delete the bookings
      else if (force) {
        console.warn('⚠️ Force deleting related bookings')
        const { error: deleteBookingsError } = await supabase
          .from('bookings')
          .delete()
          .eq('worker_id', workerId)
        
        if (deleteBookingsError) {
          console.error('Error deleting related bookings:', deleteBookingsError)
          throw new Error('Failed to delete related bookings')
        }
       }
      // Otherwise, throw an error
      else {
        throw new Error(`Cannot delete worker profile: This worker has ${bookings.length} associated bookings. Please reassign or delete the bookings first, or consider deactivating the worker instead.`)
      }
    }
    
    // Note: Payments are linked to bookings, not directly to workers
    // So if worker has bookings, they indirectly have payments
    // The booking check above already handles this relationship
    
    // Delete related worker_services
     const { error: servicesDeleteError } = await supabase
      .from('worker_services')
      .delete()
      .eq('worker_id', workerId)
    
    if (servicesDeleteError && servicesDeleteError.code !== 'PGRST116') {
      console.error('Error deleting related services:', servicesDeleteError)
      // Don't throw - worker_services might not exist
      console.warn('⚠️ Could not delete related services, continuing...')
    } else {
     }
    
    // Now delete the worker profile
     const { error: deleteError } = await supabase
      .from('worker_profiles')
      .delete()
      .eq('id', workerId)

    if (deleteError) {
      console.error('Error deleting worker profile:', {
        error: deleteError,
        message: deleteError?.message,
        details: deleteError?.details,
        hint: deleteError?.hint,
        code: deleteError?.code
      })
      
      // Provide more helpful error messages
      if (deleteError.code === '23503') {
        throw new Error('Cannot delete worker profile: It has related records that depend on it. Please check foreign key constraints.')
      }
      
      throw new Error(deleteError.message || 'Failed to delete worker profile')
    }
    
     return true
  } catch (error) {
    console.error('Error deleting worker profile:', error)
    throw error
  }
}

// Get workers with pagination and filtering
export const getWorkersWithPagination = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      sortBy = 'business_name',
      sortOrder = 'asc'
    } = options

    let query = supabase
      .from('worker_profiles')
      .select(`
        *,
        user:user_id (
          id,
          full_name,
          email,
          phone,
          avatar_url,
          role,
          status,
          worker_rating,
          worker_review_count,
          is_verified
        )
      `, { count: 'exact' })

    // Filter by role in the foreign table
    query = query.eq('user.role', 'worker')

    // Apply search filter
    if (search) {
      query = query.or(
        `business_name.ilike.%${search}%,bio.ilike.%${search}%,user.full_name.ilike.%${search}%,user.email.ilike.%${search}%`
      )
    }

    // Apply status filter
    if (status) query = query.eq('status', status)

    // Apply sorting
    if (sortBy === 'user.full_name') {
      query = query.order('full_name', { ascending: sortOrder === 'asc', foreignTable: 'user' })
    } else {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) throw error

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    }
  } catch (error) {
    console.error('Error fetching workers with pagination:', error)
    throw error
  }
}


 export const getAvailableUsersForWorkerProfiles = async () => {
  try {
    // Get all active users (any role)
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role')
      .eq('status', 'active')
      .order('full_name')

    if (usersError) throw usersError

    // Get existing worker profiles
    const { data: existingProfiles, error: profilesError } = await supabase
      .from('worker_profiles')
      .select('user_id')

    if (profilesError) throw profilesError

    // Filter out users who already have worker profiles
    const existingUserIds = new Set(existingProfiles.map(p => p.user_id))
    const availableUsers = allUsers.filter(user => !existingUserIds.has(user.id))

    

    return availableUsers
  } catch (error) {
    console.error('Error fetching available users for worker profiles:', error)
    throw error
  }
}