'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Palette, Zap, ArrowRight, Loader2 } from 'lucide-react'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { DesignIntent } from '@/types'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function DesignPage() {
    const router = useRouter()
    const { resumeId, setDesignIntent, designIntent, reset, completeOnboarding } = useOnboardingStore()

    const [density, setDensity] = useState<DesignIntent['density']>('balanced')
    const [personality, setPersonality] = useState<DesignIntent['personality']>('professional')
    const [color, setColor] = useState<DesignIntent['color_preference']>('neutral')
    const [loading, setLoading] = useState(false)

    const handleFinish = async () => {
        setLoading(true)
        const intent: DesignIntent = { density, personality, color_preference: color }
        setDesignIntent(intent)

        try {
            let portfolioId: string | null = null

            // Try to create portfolio if we have a resumeId
            if (resumeId) {
                try {
                    // 1. Create Portfolio with a name
                    const portfolio = await api.createPortfolio({
                        name: 'My Portfolio',
                        resume_id: resumeId
                    })
                    portfolioId = portfolio.id

                    // 2. Generate Blueprint
                    await api.generateBlueprint(portfolio.id)

                    // 3. Apply Design Intent (Backend Logic)
                    await api.applyDesignIntent(portfolio.id, intent)
                } catch (apiErr) {
                    console.warn('Portfolio API calls failed, continuing to dashboard:', apiErr)
                }
            } else {
                // No resume - create empty portfolio
                try {
                    const portfolio = await api.createPortfolio({
                        name: 'My Portfolio'
                    })
                    portfolioId = portfolio.id
                } catch (apiErr) {
                    console.warn('Portfolio creation failed, continuing to dashboard:', apiErr)
                }
            }

            // Mark onboarding as complete in database
            await completeOnboarding()

            reset() // Clear onboarding state
            toast.success('Setup complete! Welcome to your dashboard.')

            // Redirect to builder if we have a portfolio, otherwise dashboard
            if (portfolioId) {
                router.push(`/dashboard/builder/${portfolioId}`)
            } else {
                router.push('/dashboard')
            }

        } catch (err) {
            console.error(err)

            // Even if there's an error, try to complete onboarding and redirect
            try {
                await completeOnboarding()
                reset()
                toast.success('Setup complete!')
                router.push('/dashboard')
            } catch (finalErr) {
                toast.error('Failed to complete setup. Please try again.')
                setLoading(false)
            }
        }
    }

    const OptionGroup = ({
        label,
        options,
        value,
        onChange
    }: {
        label: string,
        options: { id: string, label: string }[],
        value: string,
        onChange: (val: any) => void
    }) => (
        <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <div className="grid grid-cols-3 gap-3">
                {options.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => onChange(opt.id)}
                        className={cn(
                            'px-2 py-3 rounded-lg border text-sm font-medium transition-all text-center',
                            value === opt.id
                                ? 'bg-accent/10 border-accent text-accent'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        )}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        </div>
    )

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-2xl font-heading font-bold text-gray-900 mb-2">
                    Set Design Intent
                </h1>
                <p className="text-gray-600">
                    We'll generate a design system that matches your preference.
                </p>
            </div>

            <div className="space-y-6">
                <OptionGroup
                    label="Visual Density"
                    value={density}
                    onChange={setDensity}
                    options={[
                        { id: 'compact', label: 'Compact' },
                        { id: 'balanced', label: 'Balanced' },
                        { id: 'spacious', label: 'Spacious' },
                    ]}
                />

                <OptionGroup
                    label="Personality"
                    value={personality}
                    onChange={setPersonality}
                    options={[
                        { id: 'minimal', label: 'Minimal' },
                        { id: 'professional', label: 'Professional' },
                        { id: 'bold', label: 'Bold' },
                    ]}
                />

                <OptionGroup
                    label="Color Preference"
                    value={color}
                    onChange={setColor}
                    options={[
                        { id: 'neutral', label: 'Neutral' },
                        { id: 'accent', label: 'With Accent' },
                        { id: 'dark', label: 'Dark Mode' },
                    ]}
                />
            </div>

            <div className="flex justify-end pt-6">
                <button
                    onClick={handleFinish}
                    disabled={loading}
                    className="btn-primary w-full py-4 text-lg shadow-lg shadow-accent/20"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Generating Portfolio...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5 mr-2" />
                            Generate My Portfolio
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
