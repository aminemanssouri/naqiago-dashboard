import { supabase } from './supabaseClient'

/**
 * Fetch all conversations for the admin view
 * @param {Object} options - Filtering and pagination options
 */
export const getConversations = async (options = {}) => {
  try {
    const { 
      status = 'open',
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
        ),
        last_message:admin_messages!admin_messages_conversation_id_fkey (
          content,
          created_at,
          is_read
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
 * Send a message
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

    // 2. Update the conversation (last_message_at, unread counts)
    const updateData = {
      last_message_at: new Date().toISOString(),
      last_message_preview: content?.substring(0, 50) || 'Attachment'
    }

    // Increment unread count for the OTHER party
    // Since we don't have atomic increment in simple update, typically we'd use an RPC
    // For now, we'll just update the timestamp to bump it to top of list
    
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
 * Create a new conversation with a worker
 */
export const createConversation = async ({ workerId, adminId, subject, category = 'support' }) => {
  try {
    const { data, error } = await supabase
      .from('admin_conversations')
      .insert({
        worker_id: workerId,
        admin_id: adminId,
        subject,
        category,
        status: 'open',
        last_message_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating conversation:', error)
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
