import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    return url?.startsWith('https://') && key?.startsWith('eyJ')
}

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Skip auth checks if Supabase is not configured (dev mode)
    if (!isSupabaseConfigured()) {
        console.warn('⚠️ Supabase not configured - running in dev mode without auth')
        return response
    }

    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return request.cookies.get(name)?.value
                    },
                    set(name: string, value: string, options: CookieOptions) {
                        request.cookies.set({ name, value, ...options })
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        })
                        response.cookies.set({ name, value, ...options })
                    },
                    remove(name: string, options: CookieOptions) {
                        request.cookies.set({ name, value: '', ...options })
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        })
                        response.cookies.set({ name, value: '', ...options })
                    },
                },
            }
        )

        // Refresh session if expired
        const { data: { user } } = await supabase.auth.getUser()

        const pathname = request.nextUrl.pathname

        // Protected routes - require authentication
        const protectedPaths = ['/dashboard', '/onboarding']
        const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))

        // Redirect to login if not authenticated
        if (isProtectedPath && !user) {
            const redirectUrl = new URL('/login', request.url)
            redirectUrl.searchParams.set('redirectTo', pathname)
            return NextResponse.redirect(redirectUrl)
        }

        // If authenticated, check onboarding status and redirect appropriately
        if (user) {
            // Auth pages - redirect to appropriate place
            const authPaths = ['/login', '/signup']
            const isAuthPath = authPaths.some(path => pathname.startsWith(path))

            if (isAuthPath || pathname === '/') {
                // Check if user has completed onboarding
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('onboarding_completed, onboarding_data')
                    .eq('id', user.id)
                    .single()

                if (profile?.onboarding_completed) {
                    // Onboarding complete - go to dashboard
                    return NextResponse.redirect(new URL('/dashboard', request.url))
                } else {
                    // Onboarding not complete - determine which step to resume
                    const onboardingData = profile?.onboarding_data as any || {}
                    let resumeStep = '/onboarding' // Default first step (Purpose)

                    if (onboardingData.purpose_completed && !onboardingData.source_completed) {
                        resumeStep = '/onboarding/source'
                    } else if (onboardingData.source_completed && !onboardingData.role_completed) {
                        resumeStep = '/onboarding/role'
                    } else if (onboardingData.role_completed && !onboardingData.truth_completed) {
                        resumeStep = '/onboarding/truth'
                    } else if (onboardingData.truth_completed && !onboardingData.design_completed) {
                        resumeStep = '/onboarding/design'
                    }

                    return NextResponse.redirect(new URL(resumeStep, request.url))
                }
            }

            // If on dashboard but onboarding not complete, redirect to onboarding
            if (pathname.startsWith('/dashboard')) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('onboarding_completed, onboarding_data')
                    .eq('id', user.id)
                    .single()

                if (!profile?.onboarding_completed) {
                    const onboardingData = profile?.onboarding_data as any || {}
                    let resumeStep = '/onboarding'

                    if (onboardingData.purpose_completed && !onboardingData.source_completed) {
                        resumeStep = '/onboarding/source'
                    } else if (onboardingData.source_completed && !onboardingData.role_completed) {
                        resumeStep = '/onboarding/role'
                    } else if (onboardingData.role_completed && !onboardingData.truth_completed) {
                        resumeStep = '/onboarding/truth'
                    } else if (onboardingData.truth_completed && !onboardingData.design_completed) {
                        resumeStep = '/onboarding/design'
                    }

                    return NextResponse.redirect(new URL(resumeStep, request.url))
                }
            }
        }
    } catch (error) {
        console.error('Middleware auth error:', error)
        // Continue without auth in case of errors
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

