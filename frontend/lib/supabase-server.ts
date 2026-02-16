import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    return url?.startsWith('https://') && key?.startsWith('eyJ')
}

// Mock client for dev mode
const createMockServerClient = (): any => {
    return {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            getUser: async () => ({ data: { user: null }, error: null }),
        },
        from: () => ({
            select: () => ({ data: [], error: null, eq: () => ({ data: [], error: null, single: () => ({ data: null, error: null }) }) }),
            insert: () => ({ data: null, error: { message: 'Dev mode' } }),
            update: () => ({ data: null, error: { message: 'Dev mode' }, eq: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }) }),
            delete: () => ({ data: null, error: { message: 'Dev mode' } }),
        }),
    }
}

export async function createServerSupabaseClient() {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️ Server: Supabase not configured - using mock client')
        return createMockServerClient()
    }

    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // Handle cookies in middleware
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // Handle cookies in middleware
                    }
                },
            },
        }
    )
}

