import { supabase } from './supabaseClient'

/**
 * Get bookings with location data for the map
 * @param {Object} options - Filter options
 * @returns {Array} Bookings with location info
 */
export const getBookingsWithLocations = async (options = {}) => {
    try {
        const { status, dateFrom, dateTo } = options

        let query = supabase
            .from('bookings')
            .select(`
        id,
        booking_number,
        status,
        scheduled_date,
        scheduled_time,
        service_address_text,
        service_location,
        service_address_id,
        customer_id,
        vehicle_type,
        vehicle_make,
        vehicle_model,
        vehicle_color,
        license_plate,
        total_price,
        customer:profiles!bookings_customer_id_fkey (
          id,
          full_name,
          phone,
          email
        ),
        worker:worker_profiles!bookings_worker_id_fkey (
          id,
          user:profiles!worker_profiles_user_id_fkey (
            full_name
          )
        ),
        service:services!bookings_service_id_fkey (
          id,
          title,
          category
        ),
        address:addresses!bookings_service_address_id_fkey (
          id,
          title,
          address_line_1,
          city,
          latitude,
          longitude
        )
      `)
            .order('scheduled_date', { ascending: false })
            .order('scheduled_time', { ascending: false })

        // Apply status filter
        if (status) {
            query = query.eq('status', status)
        }

        // Apply date range filters
        if (dateFrom) {
            query = query.gte('scheduled_date', dateFrom)
        }
        if (dateTo) {
            query = query.lte('scheduled_date', dateTo)
        }

        const { data, error } = await query

        if (error) throw error

        console.log('📍 Bookings fetched:', data?.length)

        // For bookings without service_address_id, try to get customer's default address
        const bookingsWithLocation = []

        for (const booking of (data || [])) {
            // Check if booking already has location data
            if (booking.address?.latitude && booking.address?.longitude) {
                bookingsWithLocation.push(booking)
                continue
            }

            // Check service_location (PostGIS point)
            if (booking.service_location?.lat && booking.service_location?.lng) {
                bookingsWithLocation.push(booking)
                continue
            }

            // Try to get customer's default address as fallback
            if (booking.customer_id) {
                const { data: customerAddress } = await supabase
                    .from('addresses')
                    .select('id, title, address_line_1, city, latitude, longitude')
                    .eq('user_id', booking.customer_id)
                    .eq('is_default', true)
                    .maybeSingle()

                if (customerAddress?.latitude && customerAddress?.longitude) {
                    booking.address = customerAddress
                    bookingsWithLocation.push(booking)
                    continue
                }

                // If no default, try any address for this customer
                const { data: anyAddress } = await supabase
                    .from('addresses')
                    .select('id, title, address_line_1, city, latitude, longitude')
                    .eq('user_id', booking.customer_id)
                    .limit(1)
                    .maybeSingle()

                if (anyAddress?.latitude && anyAddress?.longitude) {
                    booking.address = anyAddress
                    bookingsWithLocation.push(booking)
                }
            }
        }

        console.log('📍 Bookings with location:', bookingsWithLocation.length)

        return bookingsWithLocation
    } catch (error) {
        console.error('Error fetching bookings with locations:', error)
        throw error
    }
}

/**
 * Get worker locations for the map
 * @returns {Array} Workers with current location
 */
export const getWorkerLocations = async () => {
    try {
        const { data, error } = await supabase
            .from('worker_profiles')
            .select(`
        id,
        status,
        current_location,
        base_location,
        user:profiles!worker_profiles_user_id_fkey (
          id,
          full_name,
          avatar_url,
          phone
        )
      `)
            .in('status', ['available', 'busy'])

        if (error) throw error

        // Filter to only include workers with location
        const workersWithLocation = data?.filter(worker => {
            return worker.current_location || worker.base_location
        })

        return workersWithLocation || []
    } catch (error) {
        console.error('Error fetching worker locations:', error)
        throw error
    }
}

/**
 * Update worker's current location
 * @param {string} workerId - Worker profile ID
 * @param {Object} location - { lat, lng }
 */
export const updateWorkerLocation = async (workerId, location) => {
    try {
        const { data, error } = await supabase
            .from('worker_profiles')
            .update({
                current_location: `POINT(${location.lng} ${location.lat})`,
                updated_at: new Date().toISOString()
            })
            .eq('id', workerId)
            .select()
            .single()

        if (error) throw error
        return data
    } catch (error) {
        console.error('Error updating worker location:', error)
        throw error
    }
}
