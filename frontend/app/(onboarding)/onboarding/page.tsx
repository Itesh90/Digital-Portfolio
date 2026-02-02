'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Briefcase, GraduationCap, Laptop, User } from 'lucide-react'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { PortfolioPurpose } from '@/types'
import { cn } from '@/lib/utils'

const PURPOSE_OPTIONS: { id: PortfolioPurpose; label: string; icon: any; description: string }[] = [
    {
        id: 'hiring',
        label: 'Getting Hired',
        icon: Briefcase,
        description: 'Build a standard resume-based portfolio for job applications (full-time roles).',
    },
    {
        id: 'freelance',
        label: 'Freelance / Clients',
        icon: Laptop,
        description: 'Showcase projects and services to attract potential clients.',
    },
    {
        id: 'academic',
        label: 'Academic / Research',
        icon: GraduationCap,
        description: 'Focus on publications, research, and educational background.',
    },
    {
        id: 'creator',
        label: 'Creator / Personal Brand',
        icon: User,
        description: 'Highlight content, audience, and personal projects.',
    },
]

export default function PurposePage() {
    const router = useRouter()
    const { purpose, setPurpose, setStep } = useOnboardingStore()

    const handleSelect = (id: PortfolioPurpose) => {
        setPurpose(id)
    }

    const handleNext = () => {
        if (purpose) {
            setStep(2)
            router.push('/onboarding/source')
        }
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
                    What is this portfolio mainly for?
                </h1>
                <p className="text-gray-600">
                    We'll customize the structure and tone based on your goal.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PURPOSE_OPTIONS.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => handleSelect(option.id)}
                        className={cn(
                            'p-6 rounded-xl border-2 text-left transition-all hover:shadow-md group',
                            purpose === option.id
                                ? 'border-accent bg-accent/5 ring-1 ring-accent'
                                : 'border-gray-200 hover:border-accent/50 hover:bg-gray-50'
                        )}
                    >
                        <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors',
                            purpose === option.id ? 'bg-accent text-white' : 'bg-gray-100 text-gray-500 group-hover:text-accent'
                        )}>
                            <option.icon className="w-5 h-5" />
                        </div>
                        <h3 className={cn(
                            'font-bold text-lg mb-1',
                            purpose === option.id ? 'text-accent' : 'text-gray-900'
                        )}>
                            {option.label}
                        </h3>
                        <p className="text-sm text-gray-600">
                            {option.description}
                        </p>
                    </button>
                ))}
            </div>

            <div className="flex justify-end pt-6">
                <button
                    onClick={handleNext}
                    disabled={!purpose}
                    className="btn-primary px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                </button>
            </div>
        </div>
    )
}
