'use client'

import { useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const {
        currentStep,
        setStep,
        setResumeId,
        setResumeMode,
        setRoleInfo,
        setParsedData,
        setDesignIntent,
        confirmTruth,
        setPurpose
    } = useOnboardingStore()

    const router = useRouter()
    const totalSteps = 5

    // Hydrate store from database on mount (non-blocking)
    useEffect(() => {
        const hydrateStore = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    return // Middleware will handle redirect
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('onboarding_data, onboarding_completed')
                    .eq('id', user.id)
                    .single()

                if (profile?.onboarding_completed) {
                    router.push('/dashboard')
                    return
                }

                if (profile?.onboarding_data) {
                    const data = profile.onboarding_data as any

                    // Restore state
                    if (data.purpose) setPurpose(data.purpose)
                    if (data.resume_id) setResumeId(data.resume_id)
                    if (data.resume_mode) setResumeMode(data.resume_mode)
                    if (data.parsed_data) setParsedData(data.parsed_data)
                    if (data.confirmed_role && data.confirmed_seniority) {
                        setRoleInfo(data.confirmed_role, data.confirmed_seniority)
                    }
                    if (data.truth_completed) confirmTruth()
                    if (data.design_intent) setDesignIntent(data.design_intent)

                    // Determine step
                    let step = 1
                    if (data.purpose_completed) step = 2
                    if (data.source_completed) step = 3
                    if (data.role_completed) step = 4
                    if (data.truth_completed) step = 5

                    setStep(step)
                }
            } catch (error) {
                console.error('Hydration error:', error)
            }
        }

        hydrateStore()
    }, [])

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-heading font-bold text-lg">PortfolioBuilder</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                        <span>Step {currentStep} of {totalSteps}</span>
                        <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-accent transition-all duration-500 ease-out"
                                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 md:py-12">
                <div className="animate-fade-in">
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-sm text-gray-400">
                <p>Press Enter to continue</p>
            </footer>
        </div>
    )
}

