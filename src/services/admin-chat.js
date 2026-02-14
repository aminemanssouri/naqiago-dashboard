import { supabase } from './supabaseClient'

/**
 * Fetch all conversations for the admin view
 * @param {Object} options - Filtering and pagination options
 */
export const getConversations = async (options = {}) => {
  try {
    const {
      status = '',
      search = '',
      page = 1,
      limit = 20
    } = options

    let query = supabase
      .from('admin_conversations')
      .select(`
        *,
        worker:worker_profiles!admin_conversations_worker_id_fkey (
          id,
          business_name,
          status,
          user:profiles!worker_profiles_user_id_fkey (
            full_name,
            email,
            avatar_url,
            phone
          )
        )
      `, { count: 'exact' })

    // Apply status filter if provided
    if (status) query = query.eq('status', status)

    // Sort by last message (most recent first)
    query = query.order('last_message_at', { ascending: false })

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    // Client-side search (since complex joins make huge search queries difficult)
    let filteredData = data
    if (search) {
      const lowerSearch = search.toLowerCase()
      filteredData = data.filter(conv =>
        conv.worker?.business_name?.toLowerCase().includes(lowerSearch) ||
        conv.worker?.user?.full_name?.toLowerCase().includes(lowerSearch) ||
        conv.subject?.toLowerCase().includes(lowerSearch)
      )
    }

    return {
      data: filteredData,
      count
    }
  } catch (error) {
    console.error('Error fetching conversations:', error)
    throw error
  }
}

/**
 * Get messages for a specific conversation
 * @param {string} conversationId 
 */
export const getMessages = async (conversationId) => {
  try {
    const { data, error } = await supabase
      .from('admin_messages')
      .select(`
        *,
        sender:profiles!admin_messages_sender_id_fkey (
          id,
          full_name,
          avatar_url,
          role
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching messages:', error)
    throw error
  }
}

/**
 * Send a message and update unread counts
 * @param {Object} messageData 
 */
export const sendMessage = async ({ conversationId, senderId, content, senderRole = 'admin' }) => {
  try {
    // 1. Insert the message
    const { data: message, error: messageError } = await supabase
      .from('admin_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        sender_role: senderRole,
        content,
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (messageError) throw messageError

    // 2. Get current conversation to increment unread count
    const { data: currentConv, error: fetchError } = await supabase
      .from('admin_conversations')
      .select('worker_unread_count, admin_unread_count')
      .eq('id', conversationId)
      .single()

    if (fetchError) throw fetchError

    // 3. Update conversation: bump timestamp + increment unread for the OTHER party
    const updateData = {
      last_message_at: new Date().toISOString(),
      last_message_preview: content?.substring(0, 50) || 'Attachment',
      updated_at: new Date().toISOString()
    }

    if (senderRole === 'admin') {
      // Admin sent → increment worker's unread
      updateData.worker_unread_count = (currentConv.worker_unread_count || 0) + 1
    } else {
      // Worker sent → increment admin's unread
      updateData.admin_unread_count = (currentConv.admin_unread_count || 0) + 1
    }

    const { error: convoError } = await supabase
      .from('admin_conversations')
      .update(updateData)
      .eq('id', conversationId)

    if (convoError) throw convoError

    return message
  } catch (error) {
    console.error('Error sending message:', error)
    throw error
  }
}

/**
 * Mark a conversation as read for the admin
 * Resets admin_unread_count to 0 and marks all unread messages as read
 */
export const markConversationAsRead = async (conversationId) => {
  try {
    // 1. Reset admin unread count
    const { error: convoError } = await supabase
      .from('admin_conversations')
      .update({ admin_unread_count: 0 })
      .eq('id', conversationId)

    if (convoError) throw convoError

    // 2. Mark all unread messages from workers as read
    const { error: msgError } = await supabase
      .from('admin_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId)
      .eq('sender_role', 'worker')
      .eq('is_read', false)

    if (msgError) throw msgError
  } catch (error) {
    console.error('Error marking conversation as read:', error)
    // Don't throw — this is a non-critical background update
  }
}

/**
 * Create a new conversation with a worker (via API route to bypass RLS)
 */
export const createConversation = async ({ workerId, adminId, subject, category = 'support' }) => {
  try {
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workerId, adminId, subject, category })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create conversation')
    }

    return data
  } catch (error) {
    console.error('Error creating conversation:', error)
    throw error
  }
}

/**
 * Fetch workers list for the "New Conversation" dialog
 */
export const getWorkersForChat = async () => {
  try {
    const { data, error } = await supabase
      .from('worker_profiles')
      .select(`
        id,
        business_name,
        status,
        user:profiles!worker_profiles_user_id_fkey (
          full_name,
          avatar_url
        )
      `)
      .order('business_name', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching workers for chat:', error)
    throw error
  }
}

/**
 * Subscribe to real-time messages for a conversation
 */
export const subscribeToMessages = (conversationId, callback) => {
  return supabase
    .channel(`chat:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => callback(payload.new)
    )
    .subscribe()
}
