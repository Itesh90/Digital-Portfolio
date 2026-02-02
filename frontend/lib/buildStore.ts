/**
 * Build State Store (Zustand)
 * 
 * Global state management for the build pipeline.
 */

import { create } from 'zustand'
import type { BuildEvent } from './useWebSocket'

// ============================================================================
// TYPES
// ============================================================================

export interface BuildTask {
    id: string
    type: string
    name: string
    description: string
    depends_on: string[]
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
    output_files: string[]
    error: string | null
}

export interface VirtualFile {
    path: string
    content: string
    language: string
}

export interface BuildState {
    // Build info
    buildId: string | null
    status: 'idle' | 'planning' | 'building' | 'completed' | 'failed'
    error: string | null

    // Task graph
    tasks: BuildTask[]

    // Virtual filesystem
    files: Record<string, VirtualFile>

    // Editor state
    activeFile: string | null

    // Actions
    startBuild: (buildId: string) => void
    processEvent: (event: BuildEvent) => void
    setActiveFile: (path: string) => void
    updateFileContent: (path: string, content: string) => void
    retryTask: (taskId: string) => Promise<void>
    regenerateSection: (sectionId: string, prompt?: string) => Promise<void>
    reset: () => void
}

// ============================================================================
// STORE
// ============================================================================

export const useBuildStore = create<BuildState>((set, get) => ({
    // Initial state
    buildId: null,
    status: 'idle',
    error: null,
    tasks: [],
    files: {},
    activeFile: null,

    // Start a new build
    startBuild: (buildId: string) => {
        set({
            buildId,
            status: 'planning',
            error: null,
            tasks: [],
            files: {},
            activeFile: null,
        })
    },

    // Process incoming WebSocket events
    processEvent: (event: BuildEvent) => {
        const { type, data } = event

        switch (type) {
            case 'planning_completed':
                set({
                    status: 'building',
                    tasks: (data.tasks as BuildTask[]) || [],
                })
                break

            case 'task_started':
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === data.task_id
                            ? { ...task, status: 'running' as const }
                            : task
                    ),
                }))
                break

            case 'file_written':
                const path = data.path as string
                const content = data.content as string
                const language = data.language as string || 'plaintext'

                set((state) => ({
                    files: {
                        ...state.files,
                        [path]: { path, content, language },
                    },
                    // Auto-select first file
                    activeFile: state.activeFile || path,
                }))
                break

            case 'task_completed':
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === data.task_id
                            ? { ...task, status: 'completed' as const }
                            : task
                    ),
                }))
                break

            case 'task_failed':
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === data.task_id
                            ? { ...task, status: 'failed' as const, error: data.error as string }
                            : task
                    ),
                }))
                break

            case 'build_completed':
                set({ status: 'completed' })
                break

            case 'build_failed':
                set({
                    status: 'failed',
                    error: data.error as string,
                })
                break

            case 'current_state':
                // Initial state from server
                if (data.task_graph) {
                    const taskGraph = data.task_graph as { tasks: BuildTask[] }
                    set({ tasks: taskGraph.tasks || [] })
                }
                break
        }
    },

    // Set active file in editor
    setActiveFile: (path: string) => {
        set({ activeFile: path })
    },

    // Update file content (from editor)
    updateFileContent: (path: string, content: string) => {
        set((state) => ({
            files: {
                ...state.files,
                [path]: { ...state.files[path], content },
            },
        }))
    },

    // Retry a failed task
    retryTask: async (taskId: string) => {
        const { buildId } = get()
        if (!buildId) return

        try {
            const token = localStorage.getItem('access_token')
            await fetch(`/api/build/${buildId}/retry`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ task_id: taskId }),
            })
        } catch (e) {
            console.error('Failed to retry task:', e)
        }
    },

    // Regenerate a section
    regenerateSection: async (sectionId: string, prompt?: string) => {
        const { buildId } = get()
        if (!buildId) return

        try {
            const token = localStorage.getItem('access_token')
            await fetch(`/api/build/${buildId}/regenerate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    section_id: sectionId,
                    new_prompt: prompt,
                }),
            })
        } catch (e) {
            console.error('Failed to regenerate section:', e)
        }
    },

    // Reset store
    reset: () => {
        set({
            buildId: null,
            status: 'idle',
            error: null,
            tasks: [],
            files: {},
            activeFile: null,
        })
    },
}))
