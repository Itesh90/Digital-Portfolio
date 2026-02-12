'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import {
    Upload, ArrowRight, ArrowUpRight, Sparkles,
    Clock, PenTool, Loader2, FileText, X, Trash2
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatRelativeTime, cn, isAllowedFileType } from '@/lib/utils'
import type { Portfolio } from '@/types'

export default function DashboardPage() {
    const router = useRouter()
    const [portfolios, setPortfolios] = useState<Portfolio[]>([])
    const [loading, setLoading] = useState(true)
    const [prompt, setPrompt] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [uploadingFile, setUploadingFile] = useState<File | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleDelete = async (e: React.MouseEvent, portfolioId: string, portfolioName: string) => {
        e.preventDefault()
        e.stopPropagation()

        if (!confirm(`Delete "${portfolioName || 'Untitled Portfolio'}"? This cannot be undone.`)) return

        setDeletingId(portfolioId)
        try {
            await api.deletePortfolio(portfolioId)
            setPortfolios(prev => prev.filter(p => p.id !== portfolioId))
            toast.success('Portfolio deleted')
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete portfolio')
        } finally {
            setDeletingId(null)
        }
    }

    useEffect(() => {
        api.getPortfolios()
            .then(setPortfolios)
            .finally(() => setLoading(false))
    }, [])

    const [resumeUploadData, setResumeUploadData] = useState<{ id: string, filename: string } | null>(null)

    // Dropzone for resume upload
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        if (!isAllowedFileType(file.name, ['pdf', 'docx', 'doc', 'txt'])) {
            toast.error('Invalid file type. Please upload a PDF, DOCX, or TXT file.')
            return
        }

        setUploadingFile(file)
        setIsSubmitting(true)

        try {
            const uploadRes = await api.uploadResume(file)
            await api.parseResume(uploadRes.id)
            await api.validateResume(uploadRes.id)

            // Instead of creating portfolio immediately, show the prompt modal
            setResumeUploadData({ id: uploadRes.id, filename: file.name })
            setPrompt('') // Reset prompt for the new input
            setIsSubmitting(false)
            setUploadingFile(null)
            toast.success('Resume uploaded! Add your instructions below.')

        } catch (err: any) {
            console.error('Resume upload error:', err)
            const message = err?.message || 'Failed to upload resume. Please try again.'
            toast.error(message)
            setIsSubmitting(false)
            setUploadingFile(null)
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/msword': ['.doc'],
            'text/plain': ['.txt'],
        },
        maxFiles: 1,
        noClick: false,
    })

    // Handle prompt submission
    const handleSubmit = async () => {
        if (!prompt.trim() && !resumeUploadData) return

        setIsSubmitting(true)
        try {
            let portfolioId: string
            let initialPrompt: string

            if (resumeUploadData) {
                // Creating from resume
                const portfolio = await api.createPortfolio(resumeUploadData.filename.replace(/\.[^/.]+$/, ''), resumeUploadData.id)
                portfolioId = portfolio.id

                const userInstructions = prompt.trim()
                initialPrompt = userInstructions
                    ? userInstructions
                    : 'Build a professional portfolio website based on my resume. Include an About section, Experience, and Skills based on the resume content.'
            } else {
                // Creating from scratch
                const emptyRes = await api.createEmptyResume()
                const portfolio = await api.createPortfolio(prompt.slice(0, 50), emptyRes.id)
                portfolioId = portfolio.id
                initialPrompt = prompt
            }

            router.push(`/builder/${portfolioId}?initial_prompt=${encodeURIComponent(initialPrompt)}`)
        } catch (err: any) {
            console.error('Create portfolio error:', err)
            toast.error(err?.message || 'Failed to create portfolio. Please try again.')
            setIsSubmitting(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    // Cancel resume mode
    const handleCancelResume = () => {
        setResumeUploadData(null)
        setPrompt('')
    }

    return (
        <div className="min-h-[calc(100vh-4rem)]">

            {/* ===== HERO SECTION ===== */}
            <section className="pt-16 pb-8 px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-bold text-[#1a1a1a] mb-4 tracking-tight">
                        What will you build today?
                    </h1>
                    <p className="text-gray-500 text-lg">
                        Describe your portfolio or upload your resume to get started.
                    </p>
                </div>
            </section>

            {/* ===== PRIMARY ACTION AREA ===== */}
            <section className="px-4 pb-16">
                <div className="max-w-2xl mx-auto">

                    {/* Main Input Card */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">

                        {/* Resume Indicator Overlay */}
                        {resumeUploadData && (
                            <div className="bg-[#9B3DDB]/5 border-b border-[#9B3DDB]/10 p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[#9B3DDB]">
                                    <FileText className="w-4 h-4" />
                                    <span className="text-sm font-medium">Using resume: {resumeUploadData.filename}</span>
                                </div>
                                <button
                                    onClick={handleCancelResume}
                                    className="p-1 hover:bg-[#9B3DDB]/10 rounded-full text-[#9B3DDB] transition-colors"
                                    title="Cancel resume"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Text Input */}
                        <div className="relative">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={resumeUploadData
                                    ? "Add specific instructions (e.g., 'Make it a dark theme', 'Focus on my React projects')..."
                                    : "Describe the portfolio you want to create..."
                                }
                                className="w-full p-6 pr-16 text-[#1a1a1a] placeholder:text-gray-400 resize-none focus:outline-none text-lg min-h-[120px]"
                                disabled={isSubmitting}
                                autoFocus={!!resumeUploadData}
                            />

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={(!prompt.trim() && !resumeUploadData) || isSubmitting}
                                className={cn(
                                    "absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                    (prompt.trim() || resumeUploadData) && !isSubmitting
                                        ? "bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                )}
                            >
                                {isSubmitting && !uploadingFile ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <ArrowUpRight className="w-5 h-5" />
                                )}
                            </button>
                        </div>

                        {/* Divider - Only show if NOT in resume mode */}
                        {!resumeUploadData && (
                            <>
                                <div className="border-t border-gray-100" />

                                {/* Action Row */}
                                <div className="p-4 flex items-center justify-between">

                                    {/* Upload Resume Button */}
                                    <div
                                        {...getRootProps()}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all",
                                            isDragActive
                                                ? "bg-[#9B3DDB]/10 text-[#9B3DDB]"
                                                : "hover:bg-gray-50 text-gray-600 hover:text-[#1a1a1a]"
                                        )}
                                    >
                                        <input {...getInputProps()} />
                                        {uploadingFile ? (
                                            <div className="flex items-center gap-3 w-full">
                                                <Loader2 className="w-5 h-5 animate-spin text-[#9B3DDB] flex-shrink-0" />
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <FileText className="w-4 h-4 text-[#9B3DDB] flex-shrink-0" />
                                                    <span className="font-medium text-[#9B3DDB] truncate text-sm">{uploadingFile.name}</span>
                                                    <span className="text-xs text-[#9B3DDB]/60 flex-shrink-0 uppercase">
                                                        {uploadingFile.name.split('.').pop()}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-[#9B3DDB]/80 flex-shrink-0">Processing...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5" />
                                                <span className="font-medium">Upload Resume</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Supported formats hint */}
                                    <span className="text-xs text-gray-400 hidden sm:block">
                                        PDF, DOCX, TXT
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ===== RECENT PORTFOLIOS SECTION ===== */}
            <section className="px-4 pb-16">
                <div className="max-w-4xl mx-auto">

                    {/* Section Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-[#1a1a1a]">Recent Portfolios</h2>
                        {portfolios.length > 0 && (
                            <Link
                                href="/dashboard/portfolios"
                                className="text-sm text-[#9B3DDB] hover:underline flex items-center gap-1"
                            >
                                View all <ArrowRight className="w-4 h-4" />
                            </Link>
                        )}
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="bg-white rounded-xl border border-gray-100 p-12">
                            <div className="flex items-center justify-center gap-3 text-gray-500">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Loading...</span>
                            </div>
                        </div>
                    ) : portfolios.length === 0 ? (
                        /* Empty State */
                        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <PenTool className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-medium text-[#1a1a1a] mb-2">
                                You haven't created any portfolios yet.
                            </h3>
                            <p className="text-gray-500 text-sm">
                                Create your first portfolio using the form above!
                            </p>
                        </div>
                    ) : (
                        /* Portfolios Grid */
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {portfolios.slice(0, 6).map((portfolio) => (
                                <Link
                                    key={portfolio.id}
                                    href={`/builder/${portfolio.id}`}
                                    className="group bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all relative"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-[#9B3DDB]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <PenTool className="w-5 h-5 text-[#9B3DDB]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-[#1a1a1a] truncate group-hover:text-[#9B3DDB] transition-colors">
                                                {portfolio.name || 'Untitled Portfolio'}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                <Clock className="w-3 h-3" />
                                                {formatRelativeTime(portfolio.updated_at)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={(e) => handleDelete(e, portfolio.id, portfolio.name)}
                                                disabled={deletingId === portfolio.id}
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete portfolio"
                                            >
                                                {deletingId === portfolio.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#9B3DDB] transition-colors" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
