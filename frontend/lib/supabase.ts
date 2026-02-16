import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    return url?.startsWith('https://') && key?.startsWith('eyJ')
}

// Create a mock client for dev mode
const createMockClient = (): any => {
    const mockHandler = {
        get: (_: any, prop: string) => {
            // Return mock methods that don't throw
            if (prop === 'auth') {
                return {
                    getSession: async () => ({ data: { session: null }, error: null }),
                    getUser: async () => ({ data: { user: null }, error: null }),
                    signInWithPassword: async () => ({ data: null, error: { message: 'Dev mode - auth disabled' } }),
                    signUp: async () => ({ data: null, error: { message: 'Dev mode - auth disabled' } }),
                    signOut: async () => ({ error: null }),
                    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
                }
            }
            // For database queries, return empty results
            return () => ({
                select: () => ({ data: [], error: null, eq: () => ({ data: [], error: null, single: () => ({ data: null, error: null }) }) }),
                insert: () => ({ data: null, error: { message: 'Dev mode - database disabled' } }),
                update: () => ({ data: null, error: { message: 'Dev mode - database disabled' } }),
                delete: () => ({ data: null, error: { message: 'Dev mode - database disabled' } }),
                eq: () => ({ data: [], error: null }),
                single: () => ({ data: null, error: null }),
            })
        }
    }
    return new Proxy({}, mockHandler)
}

export function createClient(): SupabaseClient | any {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️ Supabase not configured - using mock client')
        return createMockClient()
    }
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

// Export singleton - will be mock in dev mode
export const supabase = createClient()

// Export flag to check if we're in dev mode
export const isDevMode = !isSupabaseConfigured()

