/**
 * UI Components - Input
 */

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean
    icon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, icon, ...props }, ref) => {
        return (
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {icon}
                    </div>
                )}
                <input
                    ref={ref}
                    className={cn(
                        'w-full px-4 py-3 border border-gray-300 rounded-lg transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
                        'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
                        error && 'border-red-500 focus:ring-red-500',
                        icon && 'pl-10',
                        className
                    )}
                    {...props}
                />
            </div>
        )
    }
)

Input.displayName = 'Input'

export { Input }
