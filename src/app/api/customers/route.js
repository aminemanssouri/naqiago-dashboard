import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/services/supabaseAdmin'

export async function POST(request) {
  try {
    console.log('Creating customer...')
    
    const body = await request.json()
    const { full_name, email, phone, status, is_verified, date_of_birth, gender, language_preference } = body

    // Validate required fields
    if (!email || !full_name) {
      return NextResponse.json(
        { error: 'Email and full name are required' },
        { status: 400 }
      )
    }

    const admin = supabaseAdmin()

    // Check for existing user with this email
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'A customer with this email already exists' },
        { status: 400 }
      )
    }

    // Create auth user with admin privileges
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(-10) + 'A1!', // Generate secure random password
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        role: 'customer'
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
      const { data: existingUserProfile, error: checkError } = await admin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      let customerProfile;

      if (existingUserProfile) {
        // Profile exists (created by trigger) - UPDATE it
        console.log('Profile already exists (from trigger), updating it...')
        const { data, error } = await admin
          .from('profiles')
          .update({
            full_name,
            email,
            phone: phone || null,
            role: 'customer',
            status: status || 'active',
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
        customerProfile = data
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
            role: 'customer',
            status: status || 'active',
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
        customerProfile = data
      }

       const { error: resetError } = await admin.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
      })

      if (resetError) {
        console.error('Password reset email error:', resetError)
       }

      return NextResponse.json({
        customer: customerProfile,
        message: 'Customer created successfully. Password reset email sent.'
      }, { status: 201 })
      
    } catch (profileError) {
       console.error('Profile operation failed, cleaning up auth user...')
      await admin.auth.admin.deleteUser(userId)
      
      return NextResponse.json(
        { error: `Failed to complete customer creation: ${profileError.message}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in customers POST:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch customers (optional, for API consistency)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    
    const admin = supabaseAdmin()
    
    let query = admin
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', 'customer')
    
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
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
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}