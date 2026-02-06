'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight, ChevronDown } from 'lucide-react'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { SeniorityLevel } from '@/types'
import { cn, titleCase } from '@/lib/utils'

const SENIORITY_LEVELS: SeniorityLevel[] = ['student', 'junior', 'mid', 'senior', 'lead']
const SUGGESTED_ROLES = [
    'Frontend Engineer', 'Backend Engineer', 'Full-Stack Engineer',
    'Product Designer', 'Data Scientist', 'Product Manager'
]

export default function RolePage() {
    const router = useRouter()
    const {
        confirmedRole,
        confirmedSeniority,
        setRoleInfo,
        setStep,
        completeRoleStep
    } = useOnboardingStore()

    const [role, setRole] = useState(confirmedRole || '')
    const [seniority, setSeniority] = useState<SeniorityLevel | null>(confirmedSeniority)
    const [isCustomRole, setIsCustomRole] = useState(false)

    const handleNext = async () => {
        if (role && seniority) {
            setRoleInfo(role, seniority)

            // Save progress to database
            await completeRoleStep()

            setStep(4)
            router.push('/onboarding/truth')
        }
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-2xl font-heading font-bold text-gray-900 mb-2">
                    Review your role details
                </h1>
                <p className="text-gray-600">
                    This helps us tailor the content and seniority level of your portfolio.
                </p>
            </div>

            {/* Role Selection */}
            <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                    Primary Role
                </label>
                <div className="flex flex-wrap gap-2">
                    {SUGGESTED_ROLES.map((r) => (
                        <button
                            key={r}
                            onClick={() => {
                                setRole(r)
                                setIsCustomRole(false)
                            }}
                            className={cn(
                                'px-4 py-2 rounded-full border text-sm transition-all',
                                role === r
                                    ? 'bg-accent text-white border-accent'
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                            )}
                        >
                            {r}
                        </button>
                    ))}
                    <button
                        onClick={() => setIsCustomRole(true)}
                        className={cn(
                            'px-4 py-2 rounded-full border text-sm transition-all flex items-center gap-1',
                            isCustomRole
                                ? 'bg-accent text-white border-accent'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                        )}
                    >
                        Other <ChevronDown className="w-3 h-3" />
                    </button>
                </div>

                {(isCustomRole || (role && !SUGGESTED_ROLES.includes(role))) && (
                    <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g. AI Research Scientist"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent animate-fade-in"
                        autoFocus
                    />
                )}
            </div>

            {/* Seniority Selection */}
            <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                    Seniority Level
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {SENIORITY_LEVELS.map((level) => (
                        <button
                            key={level}
                            onClick={() => setSeniority(level)}
                            className={cn(
                                'px-4 py-3 rounded-lg border text-sm font-medium transition-all text-center capitalize',
                                seniority === level
                                    ? 'bg-accent/10 border-accent text-accent'
                                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                            )}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-end pt-6">
                <button
                    onClick={handleNext}
                    disabled={!role || !seniority}
                    className="btn-primary px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Confirm Details
                    <ArrowRight className="w-5 h-5 ml-2" />
                </button>
            </div>
        </div>
    )
}
