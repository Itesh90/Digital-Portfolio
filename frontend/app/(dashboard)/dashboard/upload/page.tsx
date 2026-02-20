'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import {
    Upload, FileText, CheckCircle, Loader2,
    AlertCircle, ArrowRight, X, Sparkles
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn, formatFileSize, isAllowedFileType } from '@/lib/utils'

const ALLOWED_TYPES = ['pdf', 'docx', 'doc', 'txt', 'png', 'jpg', 'jpeg']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

type BuildStatus = 'idle' | 'uploading' | 'parsing' | 'creating' | 'done'

const STATUS_MESSAGES: Record<BuildStatus, string> = {
    idle: '',
    uploading: 'Uploading your resume...',
    parsing: 'Analyzing your experience...',
    creating: 'Creating your portfolio...',
    done: 'Redirecting to builder...'
}

export default function EntryPage() {
    const router = useRouter()

    // State
    const [file, setFile] = useState<File | null>(null)
    const [prompt, setPrompt] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [buildStatus, setBuildStatus] = useState<BuildStatus>('idle')

    // Auto-process resume on drop - NO user action required
    const processResume = useCallback(async (selectedFile: File) => {
        setIsSubmitting(true)
        setError('')

        try {
            // Step 1: Upload
            setBuildStatus('uploading')
            const uploadRes = await api.uploadResume(selectedFile)

            // Step 2: Parse (AI extraction)
            setBuildStatus('parsing')
            await api.parseResume(uploadRes.id)
            await api.validateResume(uploadRes.id)

            // Step 3: Create Portfolio
            setBuildStatus('creating')
            const portfolio = await api.createPortfolio(uploadRes.id)

            // Step 4: Redirect to Builder
            setBuildStatus('done')
            router.push(`/dashboard/builder/${portfolio.id}`)

        } catch (err: any) {
            console.error('Resume processing failed:', err)
            setError(err.message || 'Failed to process resume. Please try again.')
            setBuildStatus('idle')
            setIsSubmitting(false)
            setFile(null)
        }
    }, [router])

    // Resume Dropzone - triggers auto-processing
    const onDrop = useCallback((acceptedFiles: File[]) => {
        const selectedFile = acceptedFiles[0]
        if (!selectedFile) return

        if (!isAllowedFileType(selectedFile.name, ALLOWED_TYPES)) {
            setError(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`)
            return
        }
        if (selectedFile.size > MAX_SIZE) {
            setError(`File too large. Maximum size: ${formatFileSize(MAX_SIZE)}`)
            return
        }

        setFile(selectedFile)
        setError('')

        // IMMEDIATELY start processing - no send button required
        processResume(selectedFile)
    }, [processResume])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/msword': ['.doc'],
            'text/plain': ['.txt'],
        },
        maxFiles: 1,
        disabled: isSubmitting,
    })

    // Handle text-only prompt submission
    const handlePromptBuild = async () => {
        if (!prompt.trim()) return

        setIsSubmitting(true)
        setError('')
        setBuildStatus('creating')

        try {
            const emptyRes = await api.createEmptyResume()
            const portfolio = await api.createPortfolio(emptyRes.id, prompt.trim().slice(0, 50))
            setBuildStatus('done')
            router.push(`/dashboard/builder/${portfolio.id}?initial_prompt=${encodeURIComponent(prompt)}`)
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Failed to start build')
            setBuildStatus('idle')
            setIsSubmitting(false)
        }
    }

    // ============================================
    // BUILD STATE SCREEN - Shows during processing
    // ============================================
    if (buildStatus !== 'idle') {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center animate-fade-in p-4">
                <div className="text-center max-w-md">
                    {/* Animated Logo/Spinner */}
                    <div className="relative w-24 h-24 mx-auto mb-8">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#9B3DDB] to-[#6366f1] animate-spin opacity-20" />
                        <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
                            <Loader2 className="w-10 h-10 text-[#9B3DDB] animate-spin" />
                        </div>
                    </div>

                    {/* Main Text */}
                    <h1 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-4">
                        Building your portfolio
                    </h1>

                    {/* Status Message */}
                    <p className="text-lg text-gray-500 mb-8">
                        {STATUS_MESSAGES[buildStatus]}
                    </p>

                    {/* Progress Steps */}
                    <div className="flex justify-center gap-2 mb-8">
                        {(['uploading', 'parsing', 'creating', 'done'] as BuildStatus[]).map((step, idx) => {
                            const stepOrder = ['uploading', 'parsing', 'creating', 'done']
                            const currentIdx = stepOrder.indexOf(buildStatus)
                            const stepIdx = stepOrder.indexOf(step)
                            const isActive = stepIdx <= currentIdx

                            return (
                                <div
                                    key={step}
                                    className={cn(
                                        "w-3 h-3 rounded-full transition-all duration-300",
                                        isActive ? "bg-[#9B3DDB] scale-110" : "bg-gray-200"
                                    )}
                                />
                            )
                        })}
                    </div>

                    {/* File Info */}
                    {file && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full text-sm text-gray-600">
                            <FileText className="w-4 h-4" />
                            <span>{file.name}</span>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // ============================================
    // IDLE STATE - Upload/Input Screen
    // ============================================
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center animate-fade-in p-4">

            {/* Header */}
            <div className="text-center mb-10 max-w-2xl">
                <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 mb-4 tracking-tight">
                    What do you want to build?
                </h1>
                <p className="text-lg text-gray-500">
                    Upload your resume to get started instantly.
                </p>
            </div>

            {/* Main Input Surface */}
            <div className="w-full max-w-xl bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md">

                {/* Resume Drop Zone */}
                <div
                    {...getRootProps()}
                    className={cn(
                        "relative p-8 border-b border-gray-100 transition-colors cursor-pointer group",
                        isDragActive ? "bg-[#9B3DDB]/5" : "hover:bg-gray-50"
                    )}
                >
                    <input {...getInputProps()} />

                    <div className="flex items-center gap-6">
                        <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm",
                            "bg-white border border-gray-200 text-gray-400"
                        )}>
                            <Upload className="w-7 h-7" />
                        </div>

                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg">
                                Drop your resume here
                            </h3>
                            <p className="text-gray-500 text-sm mt-1">
                                PDF, DOCX, or TXT — starts building automatically
                            </p>
                        </div>
                    </div>
                </div>

                {/* Text Input Zone (Alternative) */}
                <div className="p-8 bg-white">
                    <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#9B3DDB]" />
                        <span>Or describe your goal</span>
                    </label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. I'm a senior product designer looking for a minimalist portfolio..."
                        className="w-full p-4 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-[#9B3DDB]/20 focus:bg-white transition-all resize-none text-gray-900 placeholder:text-gray-400"
                        rows={3}
                    />
                </div>

                {/* Footer / CTA - Only for text prompt */}
                {prompt.trim() && (
                    <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end">
                        <button
                            onClick={handlePromptBuild}
                            disabled={isSubmitting}
                            className={cn(
                                "py-3 px-8 rounded-xl shadow-lg shadow-[#9B3DDB]/20 transition-all bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white font-medium flex items-center",
                                isSubmitting && "opacity-50 shadow-none cursor-not-allowed"
                            )}
                        >
                            Build my portfolio
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </button>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 animate-slide-down max-w-xl w-full">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                    <button
                        onClick={() => setError('')}
                        className="ml-auto p-1 hover:bg-red-100 rounded-full"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    )
}
