// ============================================================
// SUPABASE CLIENT - SIMPLIFIED EXPORTS
// ============================================================
// This file re-exports from the new @supabase/ssr based client
// for backward compatibility with existing imports

import { createClient, isConfigured, getSession, getUser } from '@/lib/supabase/client'

// Create the singleton client
const supabase = createClient()

// Re-export for backward compatibility
export { supabase, createClient, isConfigured, getSession, getUser }
export const isClientInitialized = isConfigured
export default supabase
