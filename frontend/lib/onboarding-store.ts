import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
    OnboardingState,
    PortfolioPurpose,
    SeniorityLevel,
    ParsedResumeData,
    DesignIntent
} from '@/types'

interface OnboardingStore extends OnboardingState {
    setStep: (step: number) => void
    setPurpose: (purpose: PortfolioPurpose) => void
    setResumeMode: (mode: 'upload' | 'scratch') => void
    setResumeId: (id: string) => void
    setRoleInfo: (role: string, seniority: SeniorityLevel) => void
    setParsedData: (data: ParsedResumeData) => void
    confirmTruth: () => void
    setDesignIntent: (intent: DesignIntent) => void
    reset: () => void
}

const initialState: OnboardingState = {
    currentStep: 1,
    purpose: null,
    resumeId: null,
    resumeMode: null,
    confirmedRole: '',
    confirmedSeniority: null,
    parsedData: null,
    isTruthConfirmed: false,
    designIntent: null,
}

export const useOnboardingStore = create<OnboardingStore>()(
    persist(
        (set) => ({
            ...initialState,
            setStep: (step) => set({ currentStep: step }),
            setPurpose: (purpose) => set({ purpose }),
            setResumeMode: (resumeMode) => set({ resumeMode }),
            setResumeId: (resumeId) => set({ resumeId }),
            setRoleInfo: (confirmedRole, confirmedSeniority) => set({ confirmedRole, confirmedSeniority }),
            setParsedData: (parsedData) => set({ parsedData }),
            confirmTruth: () => set({ isTruthConfirmed: true }),
            setDesignIntent: (designIntent) => set({ designIntent }),
            reset: () => set(initialState),
        }),
        {
            name: 'onboarding-storage',
        }
    )
)
