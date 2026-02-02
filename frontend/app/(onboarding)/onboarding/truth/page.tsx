'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckSquare, Square, Edit2, AlertTriangle, Loader2 } from 'lucide-react'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function TruthPage() {
    const router = useRouter()
    const {
        parsedData,
        resumeId,
        setParsedData,
        confirmTruth,
        setStep,
        confirmedRole,
        confirmedSeniority
    } = useOnboardingStore()

    const [agreed, setAgreed] = useState(false)
    const [loading, setLoading] = useState(false)

    if (!parsedData) {
        // Handling edge case if reloading page without data
        // Ideally we would fetch from backend using resumeId if present
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">No resume data found. Please restart onboarding.</p>
                <button onClick={() => router.push('/onboarding')} className="btn-primary mt-4">
                    Start Over
                </button>
            </div>
        )
    }

    const handleConfirm = async () => {
        if (!agreed || !resumeId) return

        setLoading(true)
        try {
            // Confirm data with backend
            // Note: We need to also send role update potentially. 
            // Current API might need update to accept role/seniority or we do it separately.

            const roleInfo = (confirmedRole && confirmedSeniority) ? {
                primary_role: confirmedRole,
                seniority: confirmedSeniority,
                portfolio_purpose: 'hiring' // Default or grab from store if needed
            } : undefined;

            // @ts-ignore
            await api.confirmResume(resumeId, parsedData, roleInfo)
            confirmTruth()

            setStep(5)
            router.push('/onboarding/design')
        } catch (err) {
            console.error(err)
            // toast.error('Failed to confirm data')
        } finally {
            setLoading(false)
        }
    }

    // Minimal section viewer
    const renderSection = (title: string, content: any) => (
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading font-bold text-gray-900">{title}</h3>
                <button className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Edit
                </button>
            </div>
            <div className="text-sm text-gray-600 line-clamp-3">
                {JSON.stringify(content, null, 2)}
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-heading font-bold text-gray-900 mb-2">
                    Verify Extracted Data
                </h1>
                <p className="text-gray-600 text-sm">
                    Please confirm that the data we extracted is accurate.
                    AI cannot invent new facts, so this must be correct.
                </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 max-h-[50vh] overflow-y-auto shadow-inner bg-gray-50/50">
                {renderSection('Personal Info', parsedData.personal)}
                {renderSection('Summary', parsedData.summary)}
                {parsedData.experience?.length > 0 && renderSection('Experience', parsedData.experience[0])}
                {parsedData.projects?.length > 0 && renderSection('Projects', parsedData.projects[0])}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3 text-yellow-800 text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p>
                    By checking the box below, you lock this data as the "Source of Truth".
                    The AI will <strong>not</strong> be allowed to deviate from these facts.
                </p>
            </div>

            <div
                onClick={() => setAgreed(!agreed)}
                className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
                {agreed ? (
                    <CheckSquare className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                ) : (
                    <Square className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                )}
                <span className="text-sm text-gray-900 font-medium select-none">
                    I confirm this information is accurate and represents my real experience.
                </span>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleConfirm}
                    disabled={!agreed || loading}
                    className="btn-primary px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Continue'}
                </button>
            </div>
        </div>
    )
}
