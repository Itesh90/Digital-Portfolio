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

const ALLOWED_TYPES = ['pdf', 'docx', 'doc', 'txt', 'png', 'jpg', 'jpeg']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export default function SourcePage() {
    const router = useRouter()
    const {
        setResumeMode,
        setResumeId,
        setStep,
        setRoleInfo,
        setParsedData,
        completeSourceStep
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

            // Save progress to database and navigate
            await completeSourceStep()
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

            // Save progress and skip to Role Selection
            await completeSourceStep()
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
            <div className="text-center animate-slide-up">
                <h1 className="text-4xl font-heading font-bold text-gray-900 mb-4 tracking-tight">
                    How do you want to start?
                </h1>
                <p className="text-lg text-gray-600 max-w-xl mx-auto">
                    We recommend uploading your resume for the best results.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                {/* Option 1: Upload */}
                <div
                    {...getRootProps()}
                    className={cn(
                        'p-8 rounded-2xl border-2 border-dashed text-center transition-all duration-300 cursor-pointer group bg-white/40 backdrop-blur-sm',
                        isDragActive ? 'border-[#9B3DDB] bg-[#9B3DDB]/5 ring-4 ring-[#9B3DDB]/10' : 'border-gray-300 hover:border-[#9B3DDB]/50 hover:bg-white/60 hover:shadow-xl hover:-translate-y-1',
                        uploadState !== 'idle' && 'pointer-events-none opacity-50'
                    )}
                >
                    <input {...getInputProps()} />

                    <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-300",
                        isDragActive ? "bg-gradient-to-br from-[#9B3DDB] to-[#6b21a8] text-white scale-110 shadow-lg" : "bg-[#9B3DDB]/10 text-[#9B3DDB] group-hover:bg-gradient-to-br group-hover:from-[#9B3DDB] group-hover:to-[#6b21a8] group-hover:text-white group-hover:scale-110 group-hover:shadow-lg"
                    )}>
                        {uploadState === 'uploading' || uploadState === 'parsing' ? (
                            <Loader2 className="w-8 h-8 animate-spin" />
                        ) : (
                            <Upload className="w-8 h-8" />
                        )}
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Resume</h3>

                    {uploadState === 'idle' ? (
                        <>
                            <p className="text-sm text-gray-500 mb-4">
                                PDF, DOCX, TXT, PNG, JPEG supported.<br />
                                We'll extract everything for you.
                            </p>
                            <div className="text-xs font-bold text-[#9B3DDB] bg-[#9B3DDB]/10 py-1.5 px-4 rounded-full inline-block border border-[#9B3DDB]/20">
                                Recommended
                            </div>
                        </>
                    ) : (
                        <div className="text-[#9B3DDB] font-medium flex items-center justify-center gap-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9B3DDB] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#9B3DDB]"></span>
                            </span>
                            {uploadState === 'uploading' ? 'Uploading safely...' : 'Extracting context with AI...'}
                        </div>
                    )}
                </div>

                {/* Option 2: Scratch (Using button for now) */}
                <button
                    onClick={handleBuildFromScratch}
                    disabled={uploadState !== 'idle'}
                    className="p-8 rounded-2xl border-2 border-transparent text-center transition-all duration-300 group disabled:opacity-50 bg-white/40 backdrop-blur-sm shadow-sm hover:bg-white/60 hover:shadow-xl hover:-translate-y-1 hover:border-[#9B3DDB]/30"
                >
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-300 text-gray-500 group-hover:bg-[#9B3DDB]/10 group-hover:text-[#9B3DDB] group-hover:scale-110 group-hover:shadow-lg">
                        <PenTool className="w-8 h-8" />
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
