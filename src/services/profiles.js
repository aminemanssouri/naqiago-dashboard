import { supabase } from './supabaseClient'

/**
 * Get admin profile by ID
 */
export async function getAdminProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('role', 'admin')
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching admin profile:', error)
    throw error
  }
}

/**
 * Update admin profile
 */
export async function updateAdminProfile(userId, updates) {
  try {
    // Validate admin role
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (fetchError) throw fetchError
    if (profile.role !== 'admin') {
      throw new Error('Unauthorized: Only admins can update admin profiles')
    }

    // Allowed fields for admin to update
    const allowedFields = [
      'full_name',
      'phone',
      'gender',
      'date_of_birth',
      'language_preference',
      'timezone',
      'avatar_url'
    ]

    const updateData = {}
    allowedFields.forEach(field => {
      if (field in updates) {
        updateData[field] = updates[field]
      }
    })

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .eq('role', 'admin')
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating admin profile:', error)
    throw error
  }
}

/**
 * Get all admin profiles (for admin management)
 */
export async function getAllAdminProfiles() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching admin profiles:', error)
    throw error
  }
}

/**
 * Get admin statistics
 */
export async function getAdminStats(userId) {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .eq('role', 'admin')
      .single()

    if (profileError) throw profileError

    // Get some platform stats
    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })

    const { count: totalCustomers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')

    const { count: totalWorkers } = await supabase
      .from('worker_profiles')
      .select('*', { count: 'exact', head: true })

    return {
      profile,
      totalBookings,
      totalCustomers,
      totalWorkers
    }
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    throw error
  }
}
