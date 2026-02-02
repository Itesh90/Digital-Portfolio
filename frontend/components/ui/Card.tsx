/**
 * UI Components - Card
 */

import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hover?: boolean
}

export function Card({ className, hover, children, ...props }: CardProps) {
    return (
        <div
            className={cn(
                'bg-white rounded-xl shadow-sm border border-gray-100 p-6',
                hover && 'transition-all duration-200 hover:shadow-md hover:border-gray-200 cursor-pointer',
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> { }

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
    return (
        <div className={cn('mb-4', className)} {...props}>
            {children}
        </div>
    )
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export function CardTitle({ as: Component = 'h3', className, children, ...props }: CardTitleProps) {
    return (
        <Component className={cn('text-lg font-bold text-gray-900', className)} {...props}>
            {children}
        </Component>
    )
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> { }

export function CardContent({ className, children, ...props }: CardContentProps) {
    return (
        <div className={cn(className)} {...props}>
            {children}
        </div>
    )
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> { }

export function CardFooter({ className, children, ...props }: CardFooterProps) {
    return (
        <div className={cn('mt-4 pt-4 border-t border-gray-100', className)} {...props}>
            {children}
        </div>
    )
}
