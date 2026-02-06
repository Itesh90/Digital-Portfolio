'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ChatPanel } from '@/components/builder/ChatPanel'
import { PreviewPanel } from '@/components/builder/PreviewPanel'
import { BuilderToolbar } from '@/components/builder/BuilderToolbar'
import { useBuilderStore } from '@/lib/stores/builder-store'
import { portfolios } from '@/lib/api'

export default function BuilderPage() {
    const params = useParams()
    const router = useRouter()
    const portfolioId = params.id as string

    const {
        portfolio,
        isLoading,
        error,
        setPortfolio,
        setLoading,
        setError
    } = useBuilderStore()

    useEffect(() => {
        async function loadPortfolio() {
            if (!portfolioId) return

            setLoading(true)
            try {
                const data = await portfolios.get(portfolioId)
                setPortfolio(data)
            } catch (err: any) {
                setError(err.message || 'Failed to load portfolio')
            } finally {
                setLoading(false)
            }
        }

        loadPortfolio()
    }, [portfolioId, setPortfolio, setLoading, setError])

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading builder...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* Toolbar */}
            <BuilderToolbar />

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Chat Panel - Left Side */}
                <div className="w-[400px] border-r border-gray-200 bg-white flex flex-col">
                    <ChatPanel />
                </div>

                {/* Preview Panel - Right Side */}
                <div className="flex-1 bg-gray-50">
                    <PreviewPanel />
                </div>
            </div>
        </div>
    )
}
