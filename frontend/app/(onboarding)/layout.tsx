'use client'

import { Sparkles } from 'lucide-react'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { cn } from '@/lib/utils'

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const currentStep = useOnboardingStore((state) => state.currentStep)
    const totalSteps = 5

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
