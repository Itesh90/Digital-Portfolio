import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from './supabase'
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
    // Database sync functions
    completePurposeStep: () => Promise<void>
    completeSourceStep: () => Promise<void>
    completeRoleStep: () => Promise<void>
    completeTruthStep: () => Promise<void>
    completeDesignStep: () => Promise<void>
    completeOnboarding: () => Promise<void>
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

// Helper to save onboarding data to database
async function syncToDatabase(data: Record<string, any>) {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase
            .from('profiles')
            .update({ onboarding_data: data })
            .eq('id', user.id)

        if (error) console.error('Failed to sync onboarding data:', error)
    } catch (err) {
        console.error('Sync error:', err)
    }
}

// Mark onboarding as complete
async function markComplete() {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase
            .from('profiles')
            .update({ onboarding_completed: true })
            .eq('id', user.id)

        if (error) console.error('Failed to mark onboarding complete:', error)
    } catch (err) {
        console.error('Complete error:', err)
    }
}

export const useOnboardingStore = create<OnboardingStore>()(
    persist(
        (set, get) => ({
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

            // Step completion functions that sync to database
            completePurposeStep: async () => {
                const state = get()
                await syncToDatabase({
                    purpose: state.purpose,
                    purpose_completed: true
                })
            },

            completeSourceStep: async () => {
                const state = get()
                await syncToDatabase({
                    purpose_completed: true,
                    source_completed: true,
                    purpose: state.purpose,
                    resume_id: state.resumeId,
                    resume_mode: state.resumeMode,
                })
            },

            completeRoleStep: async () => {
                const state = get()
                await syncToDatabase({
                    source_completed: true,
                    role_completed: true,
                    resume_id: state.resumeId,
                    resume_mode: state.resumeMode,
                    confirmed_role: state.confirmedRole,
                    confirmed_seniority: state.confirmedSeniority,
                })
            },

            completeTruthStep: async () => {
                const state = get()
                await syncToDatabase({
                    source_completed: true,
                    role_completed: true,
                    truth_completed: true,
                    resume_id: state.resumeId,
                    resume_mode: state.resumeMode,
                    confirmed_role: state.confirmedRole,
                    confirmed_seniority: state.confirmedSeniority,
                    parsed_data: state.parsedData,
                })
            },

            completeDesignStep: async () => {
                const state = get()
                await syncToDatabase({
                    source_completed: true,
                    role_completed: true,
                    truth_completed: true,
                    design_completed: true,
                    resume_id: state.resumeId,
                    resume_mode: state.resumeMode,
                    confirmed_role: state.confirmedRole,
                    confirmed_seniority: state.confirmedSeniority,
                    parsed_data: state.parsedData,
                    design_intent: state.designIntent,
                })
            },

            completeOnboarding: async () => {
                await markComplete()
                set(initialState)
            },
        }),
        {
            name: 'onboarding-storage',
        }
    )
)

