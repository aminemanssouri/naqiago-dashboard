import { supabase } from './supabaseClient'

// Simple test to check if Supabase is working
export const testSupabaseConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    // Test 1: Simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .limit(1)
    
    if (error) {
      console.error('❌ Supabase connection failed:', error)
      return false
    }
    
    console.log('✅ Supabase connection working:', data)
    return true
    
  } catch (error) {
    console.error('❌ Supabase test error:', error)
    return false
  }
}

// Test booking creation with minimal data
export const testMinimalBooking = async () => {
  try {
    console.log('🧪 Testing minimal booking creation...')
    
    const testData = {
      booking_number: `TEST-${Date.now()}`,
      scheduled_date: new Date().toISOString().split('T')[0], // Today
      scheduled_time: '10:00:00',
      estimated_duration: 60,
      service_address_text: 'Test Address 123',
      vehicle_type: 'sedan',
      base_price: 100,
      total_price: 100
    }
    
    console.log('📝 Test booking data:', testData)
    
    const { data, error } = await supabase
      .from('bookings')
      .insert([testData])
      .select()
      .single()
    
    if (error) {
      console.error('❌ Test booking failed:', error)
      return { success: false, error }
    }
    
    console.log('✅ Test booking created:', data)
    
    // Clean up - delete the test booking
    await supabase.from('bookings').delete().eq('id', data.id)
    console.log('🧹 Test booking cleaned up')
    
    return { success: true, data }
    
  } catch (error) {
    console.error('❌ Test booking error:', error)
    return { success: false, error }
  }
}

// Test that can be called from browser console
export const runAllTests = async () => {
  console.log('🚀 Running all Supabase tests...')
  
  const connectionTest = await testSupabaseConnection()
  const bookingTest = await testMinimalBooking()
  
  console.log('📊 Test Results:')
  console.log('- Connection:', connectionTest ? '✅' : '❌')
  console.log('- Booking:', bookingTest.success ? '✅' : '❌')
  
  return {
    connection: connectionTest,
    booking: bookingTest
  }
}