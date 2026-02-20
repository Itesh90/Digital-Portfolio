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
    const { purpose, setPurpose, setStep, completePurposeStep } = useOnboardingStore()

    const handleSelect = (id: PortfolioPurpose) => {
        setPurpose(id)
    }

    const handleNext = async () => {
        if (purpose) {
            await completePurposeStep()
            setStep(2)
            router.push('/onboarding/source')
        }
    }

    return (
        <div className="space-y-8">
            <div className="text-center animate-slide-up">
                <h1 className="text-4xl font-heading font-bold text-gray-900 mb-4 tracking-tight">
                    Welcome to Folio. Let's build.
                </h1>
                <p className="text-lg text-gray-600 max-w-xl mx-auto">
                    What is this portfolio mainly for? We'll customize the structure and tone based on your goal.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PURPOSE_OPTIONS.map((option, index) => (
                    <button
                        key={option.id}
                        onClick={() => handleSelect(option.id)}
                        className={cn(
                            'p-6 rounded-2xl border-2 text-left transition-all duration-300 group animate-slide-up',
                            purpose === option.id
                                ? 'border-[#9B3DDB] bg-white ring-4 ring-[#9B3DDB]/10 shadow-[0_8px_30px_rgb(155,61,219,0.12)] -translate-y-1'
                                : 'border-white/50 bg-white/40 backdrop-blur-sm hover:border-[#9B3DDB]/30 hover:bg-white/60 hover:-translate-y-1 hover:shadow-xl shadow-sm'
                        )}
                        style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
                    >
                        <div className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300',
                            purpose === option.id
                                ? 'bg-gradient-to-br from-[#9B3DDB] to-[#6b21a8] text-white shadow-md scale-110'
                                : 'bg-gray-100/80 text-gray-500 group-hover:bg-[#9B3DDB]/10 group-hover:text-[#9B3DDB]'
                        )}>
                            <option.icon className="w-6 h-6" />
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

            <div className="flex justify-end pt-8 animate-slide-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
                <button
                    onClick={handleNext}
                    disabled={!purpose}
                    className="group px-8 py-4 bg-[#1a1a1a] text-white rounded-full font-medium hover:bg-[#2a2a2a] transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                    Continue
                    <ArrowRight className="w-5 h-5 group-hover:animate-pulse-slow transition-transform group-hover:translate-x-1" />
                </button>
            </div>
        </div>
    )
}
