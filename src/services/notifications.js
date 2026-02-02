import { supabase } from './supabaseClient'

 export const getNotifications = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      type = null,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)

    // Filter by read status
    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    // Filter by type
    if (type) {
      query = query.eq('type', type)
    }

    // Filter out expired notifications
    query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

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
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    }
  } catch (error) {
    console.error('Error fetching notifications:', error)
    throw error
  }
}

// Get unread notification count
export const getUnreadCount = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!user) return 0

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error getting unread count:', error)
    return 0
  }
}

// Mark notification as read
export const markAsRead = async (notificationId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

// Mark multiple notifications as read
export const markMultipleAsRead = async (notificationIds) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .in('id', notificationIds)
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error marking multiple notifications as read:', error)
    throw error
  }
}

// Mark all notifications as read for current user
export const markAllAsRead = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .select()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    throw error
  }
}

// Delete a notification
export const deleteNotification = async (notificationId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting notification:', error)
    throw error
  }
}

// Delete multiple notifications
export const deleteMultipleNotifications = async (notificationIds) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', notificationIds)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting multiple notifications:', error)
    throw error
  }
}

// Delete all read notifications
export const deleteAllRead = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('is_read', true)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting all read notifications:', error)
    throw error
  }
}

// Create a new notification (admin/system only)
export const createNotification = async (notificationData) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: notificationData.user_id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        booking_id: notificationData.booking_id || null,
        conversation_id: notificationData.conversation_id || null,
        data: notificationData.data || null,
        action_url: notificationData.action_url || null,
        expires_at: notificationData.expires_at || null,
        is_read: false,
        is_sent: false
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

// Subscribe to real-time notifications
export const subscribeToNotifications = (userId, callback) => {
  try {
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new)
        }
      )
      .subscribe()

    return subscription
  } catch (error) {
    console.error('Error subscribing to notifications:', error)
    throw error
  }
}

// Unsubscribe from notifications
export const unsubscribeFromNotifications = (subscription) => {
  try {
    if (subscription) {
      supabase.removeChannel(subscription)
    }
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error)
  }
}

// Get notification by ID
export const getNotificationById = async (notificationId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching notification:', error)
    throw error
  }
}

// Get notifications by type
export const getNotificationsByType = async (type, limit = 10) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching notifications by type:', error)
    throw error
  }
}

// Get notifications for a specific booking
export const getBookingNotifications = async (bookingId) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching booking notifications:', error)
    throw error
  }
}
