'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
    Globe, Clock, ExternalLink, PenTool,
    Loader2, Eye, MoreHorizontal, Trash2
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatRelativeTime, cn } from '@/lib/utils'
import type { Portfolio } from '@/types'

export default function PortfoliosPage() {
    const [portfolios, setPortfolios] = useState<Portfolio[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.getPortfolios()
            .then((data) => {
                // Filter to show ONLY published portfolios
                const publishedOnly = data.filter(p => p.status === 'published')
                setPortfolios(publishedOnly)
            })
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#9B3DDB] animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-12">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#1a1a1a]">Published Portfolios</h1>
                <p className="text-gray-500 mt-2">
                    Your live, public portfolios visible to the world.
                </p>
            </div>

            {/* Content */}
            {portfolios.length === 0 ? (
                /* Empty State */
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-100 p-16 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse-slow">
                        <Globe className="w-10 h-10 text-[#9B3DDB]/50" />
                    </div>
                    <h2 className="text-xl font-semibold text-[#1a1a1a] mb-2 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
                        You haven't published any portfolios yet.
                    </h2>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
                        Publish a portfolio to make it visible here. Once published, your portfolio will be accessible via a public URL.
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center px-6 py-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded-lg font-medium transition-transform hover:scale-105 animate-slide-up"
                        style={{ animationDelay: '300ms', animationFillMode: 'both' }}
                    >
                        <PenTool className="w-4 h-4 mr-2" />
                        Create Portfolio
                    </Link>
                </div>
            ) : (
                /* Published Portfolios Grid */
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {portfolios.map((portfolio) => (
                        <div
                            key={portfolio.id}
                            className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all"
                        >
                            {/* Preview Thumbnail */}
                            <div className="aspect-video bg-gradient-to-br from-[#FDF6F0] to-[#F8C8DC] relative">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Globe className="w-12 h-12 text-white/50" />
                                </div>

                                {/* Hover Actions */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <a
                                        href={portfolio.published_url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-3 bg-white rounded-full hover:scale-110 transition-transform"
                                    >
                                        <ExternalLink className="w-5 h-5 text-[#1a1a1a]" />
                                    </a>
                                    <Link
                                        href={`/dashboard/builder/${portfolio.id}`}
                                        className="p-3 bg-white rounded-full hover:scale-110 transition-transform"
                                    >
                                        <PenTool className="w-5 h-5 text-[#1a1a1a]" />
                                    </Link>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-[#1a1a1a] truncate">
                                            {portfolio.name || 'Untitled Portfolio'}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                            <Clock className="w-3.5 h-3.5" />
                                            {formatRelativeTime(portfolio.updated_at)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 text-xs font-medium rounded-full">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                            Live
                                        </span>
                                    </div>
                                </div>

                                {/* URL */}
                                {portfolio.published_url && (
                                    <a
                                        href={portfolio.published_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 text-sm text-[#9B3DDB] hover:underline truncate block"
                                    >
                                        {portfolio.published_url}
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
