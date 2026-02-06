'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare, Square, Edit2, AlertTriangle, Loader2, X, Save } from 'lucide-react'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function TruthPage() {
    const router = useRouter()
    const {
        parsedData,
        resumeId,
        setParsedData,
        confirmTruth,
        setStep,
        confirmedRole,
        confirmedSeniority,
        completeTruthStep
    } = useOnboardingStore()

    const [agreed, setAgreed] = useState(false)
    const [loading, setLoading] = useState(false)
    const [editingSection, setEditingSection] = useState<string | null>(null)
    const [editData, setEditData] = useState<any>(null)

    if (!parsedData) {
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
        if (!agreed) return

        setLoading(true)
        try {
            // If we have a resumeId, confirm with backend
            if (resumeId) {
                const roleInfo = (confirmedRole && confirmedSeniority) ? {
                    primary_role: confirmedRole,
                    seniority: confirmedSeniority,
                    portfolio_purpose: 'hiring'
                } : undefined;

                try {
                    // @ts-ignore
                    await api.confirmResume(resumeId, parsedData, roleInfo)
                } catch (apiErr) {
                    console.warn('API confirm failed, continuing anyway:', apiErr)
                }
            }

            confirmTruth()
            await completeTruthStep()

            setStep(5)
            router.push('/onboarding/design')
        } catch (err) {
            console.error(err)
            toast.error('Failed to save. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const startEdit = (section: string, content: any) => {
        setEditingSection(section)
        setEditData(JSON.parse(JSON.stringify(content))) // Deep clone
    }

    const saveEdit = () => {
        if (!editingSection || !editData) return

        const newParsedData = { ...parsedData }

        if (editingSection === 'personal') {
            newParsedData.personal = editData
        } else if (editingSection === 'summary') {
            newParsedData.summary = editData
        }

        setParsedData(newParsedData)
        setEditingSection(null)
        setEditData(null)
        toast.success('Changes saved!')
    }

    const cancelEdit = () => {
        setEditingSection(null)
        setEditData(null)
    }

    // Edit modal for personal info
    const renderPersonalEditModal = () => (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h3 className="font-heading font-bold text-lg">Edit Personal Info</h3>
                    <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            value={editData?.name || ''}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={editData?.email || ''}
                            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
                        <input
                            type="text"
                            value={editData?.headline || ''}
                            onChange={(e) => setEditData({ ...editData, headline: e.target.value })}
                            placeholder="e.g. Full-Stack Developer"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input
                            type="text"
                            value={editData?.location || ''}
                            onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                            placeholder="e.g. San Francisco, CA"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={cancelEdit} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button onClick={saveEdit} className="flex-1 btn-primary px-4 py-2">
                        <Save className="w-4 h-4 mr-2" /> Save
                    </button>
                </div>
            </div>
        </div>
    )

    // Edit modal for summary
    const renderSummaryEditModal = () => (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-heading font-bold text-lg">Edit Summary</h3>
                    <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Professional Summary</label>
                    <textarea
                        value={editData || ''}
                        onChange={(e) => setEditData(e.target.value)}
                        rows={6}
                        placeholder="Write a brief summary of your professional background..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button onClick={cancelEdit} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button onClick={saveEdit} className="flex-1 btn-primary px-4 py-2">
                        <Save className="w-4 h-4 mr-2" /> Save
                    </button>
                </div>
            </div>
        </div>
    )

    // Section viewer with working edit button
    const renderSection = (title: string, sectionKey: string, content: any) => (
        <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-heading font-bold text-gray-900">{title}</h3>
                <button
                    onClick={() => startEdit(sectionKey, content)}
                    className="text-xs text-accent font-medium hover:underline flex items-center gap-1"
                >
                    <Edit2 className="w-3 h-3" /> Edit
                </button>
            </div>
            <div className="text-sm text-gray-600">
                {typeof content === 'string' ? (
                    <p className="whitespace-pre-wrap">{content || <span className="italic text-gray-400">Not provided</span>}</p>
                ) : (
                    <div className="space-y-1">
                        {content?.name && <p><strong>Name:</strong> {content.name}</p>}
                        {content?.email && <p><strong>Email:</strong> {content.email}</p>}
                        {content?.headline && <p><strong>Headline:</strong> {content.headline}</p>}
                        {content?.location && <p><strong>Location:</strong> {content.location}</p>}
                        {!content?.name && !content?.email && !content?.headline && !content?.location && (
                            <p className="italic text-gray-400">No information provided</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Edit Modals */}
            {editingSection === 'personal' && renderPersonalEditModal()}
            {editingSection === 'summary' && renderSummaryEditModal()}

            <div className="text-center mb-6">
                <h1 className="text-2xl font-heading font-bold text-gray-900 mb-2">
                    Verify Extracted Data
                </h1>
                <p className="text-gray-600 text-sm">
                    Please confirm that the data we extracted is accurate.
                    AI cannot invent new facts, so this must be correct.
                </p>
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 max-h-[50vh] overflow-y-auto">
                {renderSection('Personal Info', 'personal', parsedData.personal)}
                {renderSection('Summary', 'summary', parsedData.summary)}
                {parsedData.experience?.length > 0 && (
                    <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white">
                        <h3 className="font-heading font-bold text-gray-900 mb-2">Experience</h3>
                        <p className="text-sm text-gray-600">{parsedData.experience.length} position(s) found</p>
                    </div>
                )}
                {parsedData.projects?.length > 0 && (
                    <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white">
                        <h3 className="font-heading font-bold text-gray-900 mb-2">Projects</h3>
                        <p className="text-sm text-gray-600">{parsedData.projects.length} project(s) found</p>
                    </div>
                )}
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

