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
        <div className="min-h-screen bg-gradient-to-br from-[#f8f9fa] via-[#f3e8ff] to-[#fff0f5] flex flex-col relative overflow-hidden">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/50 backdrop-blur-md border-b border-white/20">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#9B3DDB] to-[#6b21a8] shadow-md shadow-[#9B3DDB]/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-heading font-bold text-lg tracking-tight">Folio</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                        <span>Step {currentStep} of {totalSteps}</span>
                        <div className="w-32 h-2 bg-gray-200/50 backdrop-blur-sm rounded-full overflow-hidden shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-[#9B3DDB] to-[#c084fc] transition-all duration-500 ease-out shadow-[0_0_10px_rgba(155,61,219,0.5)]"
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

