import { supabase } from './supabaseClient'

// Check all users and their roles
export const debugCheckAllUsers = async () => {
  try {
    console.log('🔍 Checking all profiles in database...')
    
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    console.log('📊 Total profiles:', profiles?.length || 0)
    
    // Group by role
    const byRole = profiles?.reduce((acc, profile) => {
      const role = profile.role || 'unknown'
      if (!acc[role]) acc[role] = []
      acc[role].push({
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        status: profile.status
      })
      return acc
    }, {})
    
    console.log('👥 Profiles by role:', byRole)
    console.log('📋 Customers:', byRole?.customer || [])
    console.log('👷 Workers:', byRole?.worker || [])
    console.log('👨‍💼 Admins:', byRole?.admin || [])
    console.log('👨‍💼 Managers:', byRole?.manager || [])
    
    return { profiles, byRole }
  } catch (error) {
    console.error('Error checking users:', error)
    throw error
  }
}

// Update existing users to customer role
export const convertUsersToCustomers = async (userIds) => {
  try {
    console.log('🔄 Converting users to customers...')
    
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        role: 'customer',
        status: 'active'
      })
      .in('id', userIds)
      .select()
    
    if (error) throw error
    
    console.log('✅ Converted to customers:', data)
    return data
  } catch (error) {
    console.error('Error converting users:', error)
    throw error
  }
}

// Create a test customer (requires email/password)
export const createTestCustomer = async (email, password, fullName) => {
  try {
    console.log('🆕 Creating test customer...')
    
    // First check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()
    
    if (existingProfile) {
      console.log('⚠️ User already exists with this email')
      
      // Update role to customer if needed
      if (existingProfile.role !== 'customer') {
        const { data: updated, error: updateError } = await supabase
          .from('profiles')
          .update({ 
            role: 'customer', 
            status: 'active',
            full_name: fullName || existingProfile.full_name
          })
          .eq('id', existingProfile.id)
          .select()
          .single()
        
        if (updateError) throw updateError
        
        console.log('✅ Existing user updated to customer:', updated)
        return updated
      }
      
      console.log('✅ User is already a customer:', existingProfile)
      return existingProfile
    }
    
    // Step 1: Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'customer'
        }
      }
    })
    
    if (authError) {
      // Check if error is because email exists
      if (authError.message?.includes('already registered') || 
          authError.message?.includes('already exists') ||
          authError.message?.includes('invalid')) {
        console.warn('⚠️ Email might already be registered, checking profiles...')
        
        // Try to find and update existing profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email)
          .single()
        
        if (profile) {
          const { data: updated } = await supabase
            .from('profiles')
            .update({ role: 'customer', status: 'active' })
            .eq('id', profile.id)
            .select()
            .single()
          
          console.log('✅ Found and updated existing profile to customer')
          return updated
        }
      }
      
      throw authError
    }
    
    console.log('✅ Auth user created:', authData.user?.id)
    
    // Step 2: Check if profile was auto-created
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()
    
    if (profileError) {
      console.log('⚠️ Profile not auto-created, creating manually...')
      
      // Create profile manually
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: email,
          full_name: fullName,
          role: 'customer',
          status: 'active'
        })
        .select()
        .single()
      
      if (createError) throw createError
      
      console.log('✅ Profile created:', newProfile)
      return newProfile
    }
    
    // Step 3: Update role to customer if needed
    if (profile.role !== 'customer') {
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'customer', status: 'active' })
        .eq('id', profile.id)
        .select()
        .single()
      
      if (updateError) throw updateError
      
      console.log('✅ Profile updated to customer:', updated)
      return updated
    }
    
    console.log('✅ Customer profile ready:', profile)
    return profile
  } catch (error) {
    console.error('Error creating test customer:', error)
    throw error
  }
}

// Create multiple test customers
export const createMultipleTestCustomers = async () => {
  try {
    console.log('🆕 Creating multiple test customers...')
    
    const testCustomers = [
      { email: 'john.doe@test.com', password: 'Test123!', name: 'John Doe' },
      { email: 'jane.smith@test.com', password: 'Test123!', name: 'Jane Smith' },
      { email: 'mike.wilson@test.com', password: 'Test123!', name: 'Mike Wilson' },
      { email: 'sarah.jones@test.com', password: 'Test123!', name: 'Sarah Jones' },
      { email: 'test.customer@test.com', password: 'Test123!', name: 'Test Customer' }
    ]
    
    const results = []
    
    for (const customer of testCustomers) {
      try {
        const result = await createTestCustomer(customer.email, customer.password, customer.name)
        results.push(result)
        console.log(`✅ Created/Updated: ${customer.name}`)
      } catch (error) {
        console.error(`❌ Failed to create ${customer.name}:`, error.message)
      }
    }
    
    console.log(`✅ Successfully created/updated ${results.length} customers`)
    return results
  } catch (error) {
    console.error('Error creating test customers:', error)
    throw error
  }
}

// Fix all existing users without proper roles
export const fixAllUserRoles = async () => {
  try {
    console.log('🔧 Fixing user roles...')
    
    // Get all profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, role, status')
    
    if (error) throw error
    
    const toFix = profiles?.filter(p => !p.role || p.role === '')
    
    if (toFix?.length > 0) {
      console.log(`📝 Found ${toFix.length} profiles without roles`)
      
      // Set them all to customer by default
      const { data: fixed, error: fixError } = await supabase
        .from('profiles')
        .update({ 
          role: 'customer',
          status: 'active'
        })
        .in('id', toFix.map(p => p.id))
        .select()
      
      if (fixError) throw fixError
      
      console.log('✅ Fixed profiles:', fixed)
      return fixed
    } else {
      console.log('✅ All profiles have roles')
      return []
    }
  } catch (error) {
    console.error('Error fixing roles:', error)
    throw error
  }
}