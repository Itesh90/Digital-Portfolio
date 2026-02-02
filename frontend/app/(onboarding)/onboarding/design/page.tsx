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
    const { resumeId, setDesignIntent, designIntent, reset } = useOnboardingStore()

    const [density, setDensity] = useState<DesignIntent['density']>('balanced')
    const [personality, setPersonality] = useState<DesignIntent['personality']>('professional')
    const [color, setColor] = useState<DesignIntent['color_preference']>('neutral')
    const [loading, setLoading] = useState(false)

    const handleFinish = async () => {
        if (!resumeId) return

        setLoading(true)
        const intent: DesignIntent = { density, personality, color_preference: color }
        setDesignIntent(intent)

        try {
            // 1. Create Portfolio
            const portfolio = await api.createPortfolio(resumeId)

            // 2. Generate Blueprint
            await api.generateBlueprint(portfolio.id)

            // 3. Apply Design Intent (Backend Logic)
            await api.applyDesignIntent(portfolio.id, intent)

            // 4. Update local state if needed via refetch or trust the flow
            // For now, simple transition

            reset() // Clear onboarding state
            toast.success('Portfolio created successfully!')
            router.push(`/dashboard/builder/${portfolio.id}`)

        } catch (err) {
            console.error(err)
            toast.error('Failed to create portfolio')
            setLoading(false)
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
