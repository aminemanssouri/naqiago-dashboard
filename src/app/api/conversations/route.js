import { supabaseAdmin } from '@/services/supabaseAdmin'
import { NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const body = await request.json()
        const { workerId, adminId, subject, category = 'support' } = body

        if (!workerId || !adminId || !subject) {
            return NextResponse.json(
                { error: 'Missing required fields: workerId, adminId, subject' },
                { status: 400 }
            )
        }

        const admin = supabaseAdmin()

        const { data, error } = await admin
            .from('admin_conversations')
            .insert({
                worker_id: workerId,
                admin_id: adminId,
                subject,
                category,
                status: 'open',
                last_message_at: new Date().toISOString()
            })
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
      `)
            .single()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error creating conversation:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to create conversation' },
            { status: 500 }
        )
    }
}
