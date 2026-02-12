'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, Pencil } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useBuilderStore } from '@/lib/stores/builder-store'
import { cn } from '@/lib/utils'

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

interface ChatPanelProps {
    initialPrompt?: string
}

export function ChatPanel({ initialPrompt }: ChatPanelProps) {
    const [input, setInput] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const hasInitialized = useRef(false)

    const {
        messages,
        isGenerating,
        files,
        addMessage,
        setGenerating,
        updatePreview,
        setFiles,
        mergeFiles
    } = useBuilderStore()

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        if (initialPrompt && !hasInitialized.current && messages.length === 0) {
            hasInitialized.current = true
            handleSubmit(undefined, initialPrompt)
        }
    }, [initialPrompt, messages.length])

    const handleSubmit = async (e?: React.FormEvent, overridePrompt?: string) => {
        if (e) e.preventDefault()
        const promptText = overridePrompt || input
        if (!promptText.trim() || isGenerating) return

        const userMessage: Message = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: promptText.trim(),
            timestamp: new Date()
        }

        addMessage(userMessage)
        if (!overridePrompt) setInput('')
        setGenerating(true)

        try {
            // Send current files for surgical edit context
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            }
            if (Object.keys(files).length > 0) {
                headers['x-current-files'] = JSON.stringify(files)
            }

            // Call AI chat API
            const response = await fetch('/api/builder/chat', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    portfolioId: useBuilderStore.getState().portfolio?.id,
                    message: userMessage.content,
                    history: messages.slice(-10) // Last 10 messages for context
                })
            })

            const data = await response.json()

            const assistantMessage: Message = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: data.message,
                timestamp: new Date()
            }

            addMessage(assistantMessage)

            // Update files if multi-file response
            if (data.files) {
                if (Object.keys(files).length === 0) {
                    // First generation: set all files
                    setFiles(data.files)
                } else {
                    // Surgical edit: merge only changed files
                    mergeFiles(data.files)
                }
            }

            // Legacy: Update preview if raw HTML was returned
            if (data.html && !data.files) {
                updatePreview(data.html)
            }
        } catch (error) {
            addMessage({
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date()
            })
        } finally {
            setGenerating(false)
        }
    }

    const suggestions = [
        "Make the hero section more vibrant",
        "Add a skills section with icons",
        "Change the color scheme to blue",
        "Add smooth scroll animations"
    ]

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h2 className="font-semibold text-gray-900">AI Assistant</h2>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                    Describe changes to your portfolio
                </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="text-center py-8">
                        <Sparkles className="w-12 h-12 text-purple-200 mx-auto mb-4" />
                        <h3 className="font-medium text-gray-900 mb-2">
                            Let's build your portfolio
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Try one of these suggestions:
                        </p>
                        <div className="space-y-2">
                            {suggestions.map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInput(suggestion)}
                                    className="block w-full text-left px-4 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    "{suggestion}"
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={cn(
                            'flex',
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                    >
                        <div
                            className={cn(
                                'max-w-[85%] rounded-2xl px-4 py-2.5',
                                message.role === 'user'
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-900'
                            )}
                        >
                            {message.role === 'assistant' ? (
                                <div className="text-sm prose prose-sm max-w-none prose-headings:text-purple-600 prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-gray-900 prose-code:bg-gray-200 prose-code:px-1 prose-code:rounded prose-code:text-purple-700 prose-code:text-xs">
                                    <ReactMarkdown>{message.content}</ReactMarkdown>
                                </div>
                            ) : (
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            )}
                        </div>
                    </div>
                ))}

                {isGenerating && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Pencil className="w-4 h-4 text-purple-600 animate-pulse" />
                                <span className="text-sm text-gray-600">Writing</span>
                                <span className="flex gap-0.5">
                                    <span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Describe what you want to change..."
                        className="flex-1 px-4 py-2.5 bg-gray-100 border-0 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                        disabled={isGenerating}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isGenerating}
                        className="px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    )
}
