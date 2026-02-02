"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/services/supabaseClient'

// Hook for managing user profile
export function useProfile() {
  const { user, profile, updateProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refreshProfile = useCallback(async () => {
    if (!user) return null

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data
    } catch (err) {
      setError(err.message)
      console.error('Error refreshing profile:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [user])

  const updateUserProfile = useCallback(async (updates) => {
    try {
      setLoading(true)
      setError(null)

      const result = await updateProfile(updates)
      return result
    } catch (err) {
      setError(err.message)
      console.error('Error updating profile:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [updateProfile])

  return {
    profile,
    loading,
    error,
    refreshProfile,
    updateProfile: updateUserProfile,
    isCustomer: profile?.role === 'customer',
    isWorker: profile?.role === 'worker',
    isAdmin: profile?.role === 'admin'
  }
}

// Hook for managing user addresses
export function useAddresses() {
  const { user } = useAuth()
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAddresses = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setAddresses(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching addresses:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const createAddress = useCallback(async (addressData) => {
    if (!user) throw new Error('No user logged in')

    try {
      setLoading(true)
      setError(null)

      // If this is being set as default, update others first
      if (addressData.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
      }

      const { data, error } = await supabase
        .from('addresses')
        .insert([{
          ...addressData,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      // Refresh addresses list
      await fetchAddresses()
      return data
    } catch (err) {
      setError(err.message)
      console.error('Error creating address:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, fetchAddresses])

  const updateAddress = useCallback(async (addressId, updates) => {
    if (!user) throw new Error('No user logged in')

    try {
      setLoading(true)
      setError(null)

      // If this is being set as default, update others first
      if (updates.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('user_id', user.id)
      }

      const { data, error } = await supabase
        .from('addresses')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', addressId)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      // Refresh addresses list
      await fetchAddresses()
      return data
    } catch (err) {
      setError(err.message)
      console.error('Error updating address:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, fetchAddresses])

  const deleteAddress = useCallback(async (addressId) => {
    if (!user) throw new Error('No user logged in')

    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', user.id)

      if (error) throw error

      // Refresh addresses list
      await fetchAddresses()
      return true
    } catch (err) {
      setError(err.message)
      console.error('Error deleting address:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, fetchAddresses])

  const setDefaultAddress = useCallback(async (addressId) => {
    return updateAddress(addressId, { is_default: true })
  }, [updateAddress])

  // Fetch addresses when user changes
  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  return {
    addresses,
    loading,
    error,
    fetchAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    defaultAddress: addresses.find(addr => addr.is_default)
  }
}

// Hook for user activity logs
export function useActivityLogs() {
  const { user } = useAuth()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchActivities = useCallback(async (options = {}) => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const {
        page = 1,
        limit = 20,
        action = '',
        entity_type = ''
      } = options

      let query = supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)

      if (action) {
        query = query.eq('action', action)
      }

      if (entity_type) {
        query = query.eq('entity_type', entity_type)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      setActivities(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching activities:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const logActivity = useCallback(async (activityData) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('activity_logs')
        .insert([{
          ...activityData,
          user_id: user.id,
          created_at: new Date().toISOString()
        }])

      if (error) throw error
    } catch (err) {
      console.error('Error logging activity:', err)
    }
  }, [user])

  return {
    activities,
    loading,
    error,
    fetchActivities,
    logActivity
  }
}

// Hook for user notifications
export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchNotifications = useCallback(async (options = {}) => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const {
        page = 1,
        limit = 20,
        unreadOnly = false
      } = options

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)

      if (unreadOnly) {
        query = query.eq('is_read', false)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      setNotifications(data || [])

      // Get unread count
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      setUnreadCount(count || 0)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  const markAsRead = useCallback(async (notificationId) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error

      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true, read_at: new Date().toISOString() }
            : notif
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }, [user])

  const markAllAsRead = useCallback(async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) throw error

      // Update local state
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          is_read: true, 
          read_at: new Date().toISOString() 
        }))
      )
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }, [user])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead
  }
}