'use client'

import { useState } from 'react'
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink, Loader2 } from 'lucide-react'
import { useBuilderStore } from '@/lib/stores/builder-store'
import { cn } from '@/lib/utils'

type DeviceSize = 'desktop' | 'tablet' | 'mobile'

const deviceSizes: Record<DeviceSize, { width: string; icon: typeof Monitor }> = {
    desktop: { width: '100%', icon: Monitor },
    tablet: { width: '768px', icon: Tablet },
    mobile: { width: '375px', icon: Smartphone }
}

export function PreviewPanel() {
    const [deviceSize, setDeviceSize] = useState<DeviceSize>('desktop')
    const [isRefreshing, setIsRefreshing] = useState(false)

    const { portfolio, previewHtml, isGenerating } = useBuilderStore()

    const handleRefresh = async () => {
        setIsRefreshing(true)
        // Give iframe time to reload
        await new Promise(resolve => setTimeout(resolve, 500))
        setIsRefreshing(false)
    }

    const openInNewTab = () => {
        if (portfolio?.id) {
            window.open(`/preview/${portfolio.id}`, '_blank')
        }
    }

    // Generate blob URL for preview
    const previewUrl = previewHtml
        ? URL.createObjectURL(new Blob([previewHtml], { type: 'text/html' }))
        : null

    return (
        <div className="h-full flex flex-col p-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
                {/* Device Toggles */}
                <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
                    {(Object.keys(deviceSizes) as DeviceSize[]).map((size) => {
                        const Icon = deviceSizes[size].icon
                        return (
                            <button
                                key={size}
                                onClick={() => setDeviceSize(size)}
                                className={cn(
                                    'p-2 rounded-md transition-colors',
                                    deviceSize === size
                                        ? 'bg-gray-900 text-white'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                )}
                                title={size.charAt(0).toUpperCase() + size.slice(1)}
                            >
                                <Icon className="w-4 h-4" />
                            </button>
                        )
                    })}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                        title="Refresh preview"
                    >
                        <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                    </button>
                    <button
                        onClick={openInNewTab}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                        title="Open in new tab"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Preview Container */}
            <div className="flex-1 flex items-start justify-center overflow-auto">
                <div
                    className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300"
                    style={{
                        width: deviceSizes[deviceSize].width,
                        maxWidth: '100%',
                        height: deviceSize === 'desktop' ? '100%' : 'auto',
                        minHeight: deviceSize !== 'desktop' ? '600px' : undefined
                    }}
                >
                    {isGenerating ? (
                        <div className="h-full flex items-center justify-center bg-gray-50 min-h-[400px]">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
                                <p className="text-gray-600 text-sm">Generating your portfolio...</p>
                            </div>
                        </div>
                    ) : previewUrl ? (
                        <iframe
                            key={previewUrl}
                            src={previewUrl}
                            className="w-full h-full border-0"
                            style={{ minHeight: '600px' }}
                            title="Portfolio Preview"
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center bg-gray-50 min-h-[400px]">
                            <div className="text-center text-gray-500">
                                <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No preview available yet</p>
                                <p className="text-xs mt-1">Chat with AI to start building</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
