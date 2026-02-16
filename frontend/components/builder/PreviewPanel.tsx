'use client'

import { useState, useMemo } from 'react'
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink } from 'lucide-react'
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
    const [refreshKey, setRefreshKey] = useState(0)

    const { portfolio, previewHtml, files, isGenerating } = useBuilderStore()

    // Assemble preview HTML from virtual files
    const assembledHtml = useMemo(() => {
        const fileList = Object.values(files)
        if (fileList.length === 0) return null

        // If we have an index.html, use it as the base
        const indexFile = files['/index.html']
        if (indexFile) {
            let html = indexFile.content

            // Inline CSS: replace <link href="styles.css"> with <style>...</style>
            const cssFile = files['/styles.css']
            if (cssFile) {
                // Replace link tags referencing styles.css
                html = html.replace(
                    /<link[^>]*href=["']\.?\/?styles\.css["'][^>]*\/?>/gi,
                    `<style>${cssFile.content}</style>`
                )
            }

            // Inline JS: replace <script src="script.js"> with <script>...</script>
            const jsFile = files['/script.js']
            if (jsFile) {
                html = html.replace(
                    /<script[^>]*src=["']\.?\/?script\.js["'][^>]*><\/script>/gi,
                    `<script>${jsFile.content}</script>`
                )
            }

            return html
        }

        // Fallback: assemble from parts
        const styles = fileList
            .filter(f => f.path.endsWith('.css'))
            .map(f => f.content)
            .join('\n')

        const components = fileList
            .filter(f => f.path.endsWith('.html') && f.path !== '/index.html')
            .map(f => f.content)
            .join('\n')

        const scripts = fileList
            .filter(f => f.path.endsWith('.js'))
            .map(f => f.content)
            .join('\n')

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio Preview</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; }
        ${styles}
    </style>
</head>
<body>
    ${components}
    <script>${scripts}</script>
</body>
</html>`
    }, [files, refreshKey])

    // Use assembled file content, fall back to legacy previewHtml
    const finalHtml = assembledHtml || previewHtml

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1)
    }

    const openInNewTab = () => {
        if (finalHtml) {
            const blob = new Blob([finalHtml], { type: 'text/html' })
            const url = URL.createObjectURL(blob)
            window.open(url, '_blank')
        } else if (portfolio?.id) {
            window.open(`/preview/${portfolio.id}`, '_blank')
        }
    }

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

                {/* File count indicator */}
                {Object.keys(files).length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        {Object.keys(files).length} files
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                        title="Refresh preview"
                    >
                        <RefreshCw className="w-4 h-4" />
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
                        <div className="h-full flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
                            {/* Animated gradient background */}
                            <div
                                className="absolute inset-0"
                                style={{
                                    background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 15%, #fdba74 30%, #fb923c 45%, #f97316 55%, #ea580c 70%, #9333ea 85%, #7c3aed 100%)',
                                    opacity: 0.15,
                                    animation: 'gradientShift 6s ease infinite'
                                }}
                            />
                            {/* Radial glow */}
                            <div
                                className="absolute"
                                style={{
                                    width: '300px',
                                    height: '300px',
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, rgba(249,115,22,0.05) 50%, transparent 70%)',
                                    animation: 'pulse 3s ease-in-out infinite'
                                }}
                            />

                            {/* Animated icon */}
                            <div className="relative z-10 mb-6">
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                    style={{
                                        background: 'linear-gradient(135deg, #f97316, #ea580c)',
                                        boxShadow: '0 8px 30px rgba(249,115,22,0.3)',
                                        animation: 'floatIcon 3s ease-in-out infinite'
                                    }}
                                >
                                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Main text */}
                            <h2 className="relative z-10 text-xl font-semibold text-gray-800 mb-2">
                                Building your idea.
                            </h2>
                            <p className="relative z-10 text-sm text-gray-500 mb-8">
                                This may take a moment...
                            </p>

                            {/* Did you know section */}
                            <div className="relative z-10 text-center">
                                <p className="text-xs text-purple-500 font-medium mb-1">Did you know?</p>
                                <p className="text-xs text-gray-400 max-w-xs">
                                    💬 You can ask the AI to change colors, layouts, and sections after it builds your portfolio
                                </p>
                            </div>

                            {/* CSS Animations */}
                            <style dangerouslySetInnerHTML={{
                                __html: `
                                @keyframes gradientShift {
                                    0%, 100% { opacity: 0.15; transform: scale(1); }
                                    50% { opacity: 0.25; transform: scale(1.02); }
                                }
                                @keyframes floatIcon {
                                    0%, 100% { transform: translateY(0); }
                                    50% { transform: translateY(-8px); }
                                }
                            `}} />
                        </div>
                    ) : finalHtml ? (
                        <iframe
                            key={refreshKey}
                            srcDoc={finalHtml}
                            className="w-full h-full border-0"
                            style={{ minHeight: '600px' }}
                            title="Portfolio Preview"
                            sandbox="allow-scripts allow-same-origin"
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
