'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import {
    Upload, FileText, PenTool, Loader2,
    AlertCircle, CheckCircle, ArrowRight
} from 'lucide-react'
import { useOnboardingStore } from '@/lib/onboarding-store'
import { api } from '@/lib/api'
import { cn, formatFileSize, isAllowedFileType } from '@/lib/utils'
import type { Resume } from '@/types'

const ALLOWED_TYPES = ['pdf', 'docx', 'doc', 'txt']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export default function SourcePage() {
    const router = useRouter()
    const {
        setResumeMode,
        setResumeId,
        setStep,
        setRoleInfo,
        setParsedData
    } = useOnboardingStore()

    const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'parsing' | 'error'>('idle')
    const [error, setError] = useState('')

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        // Validation
        if (!isAllowedFileType(file.name, ALLOWED_TYPES)) {
            setError(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`)
            return
        }
        if (file.size > MAX_SIZE) {
            setError(`File too large. Maximum size: ${formatFileSize(MAX_SIZE)}`)
            return
        }

        // Process Upload
        setUploadState('uploading')
        setError('')

        try {
            const uploadRes = await api.uploadResume(file)
            setResumeId(uploadRes.id)
            setResumeMode('upload')

            setUploadState('parsing')

            // Parse immediately
            const parsedResume = await api.parseResume(uploadRes.id)

            if (parsedResume.parsed_data) {
                setParsedData(parsedResume.parsed_data)
            }

            if (parsedResume.inferred_role) {
                setRoleInfo(
                    parsedResume.inferred_role.primary_role,
                    parsedResume.inferred_role.seniority
                )
            }

            // Navigate to next step
            setStep(3)
            router.push('/onboarding/role')

        } catch (err: any) {
            setUploadState('error')
            setError(err.response?.data?.detail || 'Failed to process resume')
        }
    }, [setResumeId, setResumeMode, setStep, router, setRoleInfo, setParsedData])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/msword': ['.doc'],
            'text/plain': ['.txt'],
        },
        maxFiles: 1,
        disabled: uploadState !== 'idle',
    })

    // Clean empty state handler
    const handleBuildFromScratch = async () => {
        setUploadState('uploading') // reusing state for loading
        try {
            const emptyRes = await api.createEmptyResume()
            setResumeId(emptyRes.id)
            setResumeMode('scratch')

            // Initialize with empty data so we don't crash next steps
            setParsedData({
                personal: { name: '', email: '', headline: '', location: '', links: [] },
                summary: '',
                experience: [],
                education: [],
                skills: [],
                projects: [],
                achievements: []
            })

            // Skip to Role Selection
            setStep(3)
            router.push('/onboarding/role')

        } catch (err: any) {
            console.error(err)
            setUploadState('error')
            setError('Failed to initialize empty profile')
        } finally {
            if (uploadState !== 'error') setUploadState('idle')
        }
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-heading font-bold text-gray-900 mb-2">
                    How do you want to start?
                </h1>
                <p className="text-gray-600">
                    We recommend uploading your resume for the best results.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Option 1: Upload */}
                <div
                    {...getRootProps()}
                    className={cn(
                        'p-8 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer group hover:bg-gray-50',
                        isDragActive ? 'border-accent bg-accent/5' : 'border-gray-200 hover:border-accent/30',
                        uploadState !== 'idle' && 'pointer-events-none opacity-50'
                    )}
                >
                    <input {...getInputProps()} />

                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                        {uploadState === 'uploading' || uploadState === 'parsing' ? (
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        ) : (
                            <Upload className="w-8 h-8 text-blue-600" />
                        )}
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Resume</h3>

                    {uploadState === 'idle' ? (
                        <>
                            <p className="text-sm text-gray-600 mb-4">
                                PDF, DOCX, TXT supported.<br />
                                We'll extract everything for you.
                            </p>
                            <div className="text-xs text-blue-600 font-medium bg-blue-50 py-1 px-3 rounded-full inline-block">
                                Recommended
                            </div>
                        </>
                    ) : (
                        <div className="text-blue-600 font-medium">
                            {uploadState === 'uploading' ? 'Uploading...' : 'Analyzing...'}
                        </div>
                    )}
                </div>

                {/* Option 2: Scratch (Using button for now) */}
                <button
                    onClick={handleBuildFromScratch}
                    disabled={uploadState !== 'idle'}
                    className="p-8 rounded-xl border-2 border-gray-200 text-center transition-all hover:border-gray-300 hover:bg-gray-50 group disabled:opacity-50"
                >
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                        <PenTool className="w-8 h-8 text-gray-500" />
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">Build from Scratch</h3>
                    <p className="text-sm text-gray-600">
                        No resume? No problem.<br />
                        We'll guide you step-by-step.
                    </p>
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 animate-slide-down">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                </div>
            )}
        </div>
    )
}
