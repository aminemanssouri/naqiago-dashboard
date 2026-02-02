// Quick utility to create test workers and check database status
import { supabase } from './supabaseClient'

// Check what workers exist in profiles vs worker_profiles
export const debugWorkerData = async () => {
  try {
    console.log('🔍 === WORKER DEBUG REPORT ===')
    
    // 1. Check profiles with role = 'worker'
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, status')
      .eq('role', 'worker')
    
    console.log('👤 Profiles with role=worker:', profiles?.length || 0, profiles)
    
    // 2. Check worker_profiles table
    const { data: workerProfiles, error: workerError } = await supabase
      .from('worker_profiles')
      .select('id, user_id, business_name, status')
    
    console.log('👷 Worker profiles:', workerProfiles?.length || 0, workerProfiles)
    
    // 3. Check for orphaned records
    if (profiles && workerProfiles) {
      const profileIds = profiles.map(p => p.id)
      const workerUserIds = workerProfiles.map(w => w.user_id)
      
      const missingWorkerProfiles = profileIds.filter(id => !workerUserIds.includes(id))
      console.log('🚨 Profiles missing worker_profiles:', missingWorkerProfiles)
    }
    
    return { profiles, workerProfiles }
  } catch (error) {
    console.error('❌ Debug error:', error)
    return null
  }
}

// Create a test worker profile for existing user
export const createTestWorkerProfile = async (userId, businessName = 'Test Worker') => {
  try {
    const { data, error } = await supabase
      .from('worker_profiles')
      .insert({
        user_id: userId,
        business_name: businessName,
        bio: 'Test worker profile',
        status: 'available',
        hourly_rate: 100,
        works_weekends: true
      })
      .select()
      .single()
    
    if (error) throw error
    console.log('✅ Created worker profile:', data)
    return data
  } catch (error) {
    console.error('❌ Error creating worker profile:', error)
    throw error
  }
}

// Update user role to worker
export const makeUserWorker = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'worker' })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    console.log('✅ Updated user role to worker:', data)
    return data
  } catch (error) {
    console.error('❌ Error updating user role:', error)
    throw error
  }
}

// Auto-fix: Create worker profiles for all users with role='worker' but no worker_profile
export const autoCreateMissingWorkerProfiles = async () => {
  try {
    console.log('🔧 Auto-creating missing worker profiles...')
    
    // Get all users with role='worker'
    const { data: workers, error: workerError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'worker')
    
    if (workerError) throw workerError
    if (!workers || workers.length === 0) {
      console.log('ℹ️ No users with role=worker found')
      return []
    }
    
    console.log(`👤 Found ${workers.length} users with role=worker`)
    
    // Get existing worker profiles
    const { data: existingProfiles, error: profileError } = await supabase
      .from('worker_profiles')
      .select('user_id')
    
    if (profileError) throw profileError
    
    const existingUserIds = new Set(existingProfiles?.map(p => p.user_id) || [])
    const missingWorkers = workers.filter(w => !existingUserIds.has(w.id))
    
    console.log(`🚨 Need to create ${missingWorkers.length} worker profiles`)
    
    if (missingWorkers.length === 0) {
      console.log('✅ All workers already have profiles!')
      return []
    }
    
    // Create missing worker profiles
    const newProfiles = missingWorkers.map(worker => ({
      user_id: worker.id,
      business_name: worker.full_name || 'Professional Service',
      bio: 'Professional service provider',
      status: 'available',
      hourly_rate: 150,
      service_radius_km: 15,
      works_weekends: true,
      start_time: '08:00:00',
      end_time: '18:00:00'
    }))
    
    const { data: created, error: createError } = await supabase
      .from('worker_profiles')
      .insert(newProfiles)
      .select()
    
    if (createError) throw createError
    
    console.log(`✅ Successfully created ${created.length} worker profiles:`, created)
    return created
  } catch (error) {
    console.error('❌ Error auto-creating worker profiles:', error)
    throw error
  }
}