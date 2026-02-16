import { create } from 'zustand'

export interface VirtualFile {
    path: string
    content: string
    language: string
}

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

interface Portfolio {
    id: string
    name: string
    status: string
    published_url?: string | null
    resume_id?: string | null
    blueprint?: any
    content?: any
    design_config?: any
}

interface BuilderState {
    // Portfolio
    portfolio: Portfolio | null
    previewHtml: string | null

    // Virtual filesystem (component-based generation)
    files: Record<string, VirtualFile>
    activeFile: string | null

    // Chat
    messages: Message[]

    // UI State
    isLoading: boolean
    isGenerating: boolean
    error: string | null

    // Actions
    setPortfolio: (portfolio: Portfolio | null) => void
    setPreviewHtml: (html: string | null) => void
    updatePreview: (html: string) => void
    addMessage: (message: Message) => void
    clearMessages: () => void
    setLoading: (loading: boolean) => void
    setGenerating: (generating: boolean) => void
    setError: (error: string | null) => void
    setFiles: (files: Record<string, VirtualFile>) => void
    mergeFiles: (files: Record<string, VirtualFile>) => void
    updateFileContent: (path: string, content: string) => void
    setActiveFile: (path: string | null) => void
    reset: () => void
}

const initialState = {
    portfolio: null,
    previewHtml: null,
    files: {} as Record<string, VirtualFile>,
    activeFile: null as string | null,
    messages: [],
    isLoading: false,
    isGenerating: false,
    error: null,
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
    ...initialState,

    setPortfolio: (portfolio) => {
        set({ portfolio })
        // If portfolio has content, set preview and files
        if (portfolio?.content) {
            set({
                previewHtml: portfolio.content.html || null,
                files: portfolio.content.files || {}
            })

            // Auto-select first file if available and none selected
            if (portfolio.content.files && Object.keys(portfolio.content.files).length > 0 && !get().activeFile) {
                set({ activeFile: Object.keys(portfolio.content.files)[0] })
            }
        } else {
            // New/Empty portfolio
            set({ previewHtml: null, files: {} })
        }
    },

    setPreviewHtml: (previewHtml) => set({ previewHtml }),

    updatePreview: (html) => {
        set({ previewHtml: html })
    },

    addMessage: (message) => {
        set((state) => ({
            messages: [...state.messages, message]
        }))
    },

    clearMessages: () => set({ messages: [] }),

    setLoading: (isLoading) => set({ isLoading }),

    setGenerating: (isGenerating) => set({ isGenerating }),

    setError: (error) => set({ error }),

    setFiles: (files) => {
        set({ files })
        // Auto-select first file
        const paths = Object.keys(files)
        if (paths.length > 0) {
            set({ activeFile: paths[0] })
        }
    },

    mergeFiles: (newFiles) => {
        set((state) => ({
            files: { ...state.files, ...newFiles },
            activeFile: state.activeFile || Object.keys(newFiles)[0] || null,
        }))
    },

    updateFileContent: (path, content) => {
        set((state) => ({
            files: {
                ...state.files,
                [path]: { ...state.files[path], content },
            },
        }))
    },

    setActiveFile: (path) => set({ activeFile: path }),

    reset: () => set(initialState),
}))
