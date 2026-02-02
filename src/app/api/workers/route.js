import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/services/supabaseAdmin'

export async function POST(request) {
  try {
    console.log('Creating worker...')
    
    const body = await request.json()
    const { 
      // User profile fields
      full_name, 
      email, 
      phone,
      password, // Password provided by admin
      date_of_birth,
      gender,
      language_preference,
      is_verified,
      // Worker profile fields
      business_name,
      bio,
      experience_years,
      specialties,
      service_radius_km,
      hourly_rate,
      commission_rate,
      works_weekends,
      start_time,
      end_time,
      status // This is for worker_profile status (available/busy/offline), NOT user profile status
    } = body

    // Validate required fields
    if (!email || !full_name) {
      return NextResponse.json(
        { error: 'Email and full name are required' },
        { status: 400 }
      )
    }

    // Validate password
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const admin = supabaseAdmin()

    // Check for existing user with this email
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, email, role')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      )
    }

    // Create auth user with admin privileges
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: password, // Use the password provided by admin
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        role: 'worker'
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: `Failed to create user: ${authError.message}` },
        { status: 500 }
      )
    }

    const userId = authData.user.id
    console.log(`Auth user created with ID: ${userId}`)

    // Wait a moment for trigger to potentially create profile
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      // Check if profile was auto-created by trigger
      const { data: existingUserProfile } = await admin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      let workerProfile;

      if (existingUserProfile) {
        // Profile exists (created by trigger) - UPDATE it
        console.log('Profile already exists (from trigger), updating it...')
        const { data, error } = await admin
          .from('profiles')
          .update({
            full_name,
            email,
            phone: phone || null,
            role: 'worker', // Set role to worker
            status: 'active', // User profile status is always 'active' for new users
            is_verified: is_verified || false,
            date_of_birth: date_of_birth || null,
            gender: gender || null,
            language_preference: language_preference || 'en',
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single()

        if (error) {
          console.error('Profile update error:', error)
          throw error
        }
        workerProfile = data
      } else {
        // Profile doesn't exist - CREATE it
        console.log('Creating new profile...')
        const { data, error } = await admin
          .from('profiles')
          .insert({
            id: userId, // Use auth user's ID
            full_name,
            email,
            phone: phone || null,
            role: 'worker', // Set role to worker
            status: 'active', // User profile status is always 'active' for new users
            is_verified: is_verified || false,
            date_of_birth: date_of_birth || null,
            gender: gender || null,
            language_preference: language_preference || 'en',
            timezone: 'Africa/Casablanca',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) {
          console.error('Profile insert error:', error)
          throw error
        }
        workerProfile = data
      }

      // Now create the worker_profile record
      console.log('Creating worker_profile record...')
      const { data: workerProfileData, error: workerProfileError } = await admin
        .from('worker_profiles')
        .insert({
          user_id: userId,
          business_name: business_name || full_name,
          bio: bio || null,
          experience_years: experience_years ? parseInt(experience_years) : null,
          specialties: specialties || null,
          service_radius_km: service_radius_km ? parseInt(service_radius_km) : 10,
          status: status || 'available', // THIS is the worker_profile status (available/busy/offline)
          hourly_rate: hourly_rate ? parseFloat(hourly_rate) : null,
          commission_rate: commission_rate ? parseFloat(commission_rate) : 15.00,
          works_weekends: works_weekends !== undefined ? works_weekends : true,
          start_time: start_time || '08:00:00',
          end_time: end_time || '18:00:00',
          total_jobs_completed: 0,
          total_earnings: 0,
          average_completion_time: null
        })
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
        `)
        .single()

      if (workerProfileError) {
        console.error('Worker profile creation error:', workerProfileError)
        throw workerProfileError
      }

      console.log('Worker profile created successfully:', workerProfileData)

      // Don't send password reset email since admin set the password
      // Worker can log in immediately with the credentials provided by admin

      return NextResponse.json({
        worker: workerProfileData,
        message: 'Worker created successfully. They can now log in with the provided credentials.'
      }, { status: 201 })
      
    } catch (profileError) {
      // Clean up auth user if profile operations fail
      console.error('Profile operation failed, cleaning up auth user...')
      await admin.auth.admin.deleteUser(userId)
      
      return NextResponse.json(
        { error: `Failed to complete worker creation: ${profileError.message}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in workers POST:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch workers
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    
    const admin = supabaseAdmin()
    
    let query = admin
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
    
    // Filter by worker role
    query = query.eq('user.role', 'worker')
    
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,bio.ilike.%${search}%,user.full_name.ilike.%${search}%,user.email.ilike.%${search}%`)
    }
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)
    
    const { data, error, count } = await query
    
    if (error) throw error
    
    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching workers:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE endpoint for soft delete
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Worker ID is required' }, { status: 400 })
    }

    const admin = supabaseAdmin()

    // Soft delete - just mark as unavailable
    const { error } = await admin
      .from('worker_profiles')
      .update({ 
        status: 'unavailable',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ message: 'Worker deactivated successfully' })
  } catch (error) {
    console.error('Error deleting worker:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
