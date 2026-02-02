'use client'

/**
 * Build Steps Panel
 * 
 * Shows the task graph progress with status indicators.
 */

import { Check, Loader2, AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBuildStore, type BuildTask } from '@/lib/buildStore'

interface BuildStepsPanelProps {
    className?: string
}

export function BuildStepsPanel({ className }: BuildStepsPanelProps) {
    const { tasks, status, retryTask } = useBuildStore()

    const getStatusIcon = (task: BuildTask) => {
        switch (task.status) {
            case 'completed':
                return <Check className="w-4 h-4 text-green-500" />
            case 'running':
                return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            case 'failed':
                return <AlertCircle className="w-4 h-4 text-red-500" />
            case 'pending':
            default:
                return <Clock className="w-4 h-4 text-gray-300" />
        }
    }

    const getStatusColor = (task: BuildTask) => {
        switch (task.status) {
            case 'completed':
                return 'border-green-500 bg-green-50'
            case 'running':
                return 'border-blue-500 bg-blue-50'
            case 'failed':
                return 'border-red-500 bg-red-50'
            case 'pending':
            default:
                return 'border-gray-200 bg-white'
        }
    }

    const completedCount = tasks.filter(t => t.status === 'completed').length
    const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

    return (
        <div className={cn("flex flex-col h-full bg-white border-r border-gray-200", className)}>
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold text-[#1a1a1a]">Build Progress</h2>
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#9B3DDB] to-[#7B2CBF] transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="text-sm text-gray-500">{progress}%</span>
                </div>
            </div>

            {/* Status indicator */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className={cn(
                    "text-xs font-medium uppercase tracking-wide",
                    status === 'building' && "text-blue-600",
                    status === 'completed' && "text-green-600",
                    status === 'failed' && "text-red-600",
                    status === 'planning' && "text-amber-600",
                )}>
                    {status === 'building' && '⚡ Building...'}
                    {status === 'completed' && '✓ Complete'}
                    {status === 'failed' && '✗ Failed'}
                    {status === 'planning' && '📋 Planning...'}
                    {status === 'idle' && 'Ready'}
                </span>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {tasks.map((task, index) => (
                    <div
                        key={task.id}
                        className={cn(
                            "p-3 rounded-lg border transition-all",
                            getStatusColor(task)
                        )}
                    >
                        <div className="flex items-start gap-3">
                            {/* Status icon */}
                            <div className="mt-0.5">
                                {getStatusIcon(task)}
                            </div>

                            {/* Task info */}
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-[#1a1a1a] truncate">
                                    {task.name}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                    {task.description}
                                </div>

                                {/* Error message */}
                                {task.status === 'failed' && task.error && (
                                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                                        {task.error}
                                    </div>
                                )}

                                {/* Output files */}
                                {task.status === 'completed' && task.output_files?.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {task.output_files.map(file => (
                                            <span
                                                key={file}
                                                className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                                            >
                                                {file.split('/').pop()}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Retry button for failed tasks */}
                            {task.status === 'failed' && (
                                <button
                                    onClick={() => retryTask(task.id)}
                                    className="p-1.5 hover:bg-red-100 rounded transition-colors"
                                    title="Retry"
                                >
                                    <RefreshCw className="w-4 h-4 text-red-500" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {tasks.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                        <Clock className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Waiting for build to start...</p>
                    </div>
                )}
            </div>
        </div>
    )
}
