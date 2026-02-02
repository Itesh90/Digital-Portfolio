'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
    Home, PenTool, Settings, LogOut,
    Sparkles, Menu, X, ChevronDown, User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { User as UserType } from '@/types'

// Minimal navigation - only essential items
const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Portfolios', href: '/dashboard/portfolios', icon: PenTool },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const [user, setUser] = useState<UserType | null>(null)
    const [userMenuOpen, setUserMenuOpen] = useState(false)

    useEffect(() => {
        const token = localStorage.getItem('access_token')
        if (!token) {
            router.push('/login')
            return
        }

        api.setAccessToken(token)

        api.getMe()
            .then((u) => {
                setUser(u)
            })
            .catch(() => {
                localStorage.removeItem('access_token')
                localStorage.removeItem('refresh_token')
                router.push('/login')
            })
    }, [router])

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        api.setAccessToken(null)
        router.push('/')
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FDF6F0] via-[#F8C8DC] to-[#E8D5E0]">
                <div className="animate-pulse flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-[#9B3DDB] animate-spin" />
                    <span className="text-gray-600">Loading...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#FDF6F0]/50 via-white to-[#F8C8DC]/30">

            {/* ===== MINIMAL HEADER ===== */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">

                        {/* Logo */}
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-heading font-bold text-lg text-[#1a1a1a]">Tablo.</span>
                        </Link>

                        {/* Center Navigation - Desktop */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navigation.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                            isActive
                                                ? 'bg-[#9B3DDB]/10 text-[#9B3DDB]'
                                                : 'text-gray-600 hover:text-[#1a1a1a] hover:bg-gray-50'
                                        )}
                                    >
                                        {item.name}
                                    </Link>
                                )
                            })}
                        </nav>

                        {/* Right Side - User Menu */}
                        <div className="flex items-center gap-3">

                            {/* Mobile Nav Toggle */}
                            <div className="md:hidden flex items-center gap-2">
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={cn(
                                                'p-2 rounded-lg transition-colors',
                                                isActive
                                                    ? 'bg-[#9B3DDB]/10 text-[#9B3DDB]'
                                                    : 'text-gray-400 hover:text-[#1a1a1a]'
                                            )}
                                        >
                                            <item.icon className="w-5 h-5" />
                                        </Link>
                                    )
                                })}
                            </div>

                            {/* User Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
                                >
                                    <div className="w-7 h-7 bg-[#9B3DDB]/10 text-[#9B3DDB] rounded-full flex items-center justify-center font-medium text-sm">
                                        {user.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <span className="hidden sm:block text-sm font-medium text-[#1a1a1a] max-w-[100px] truncate">
                                        {user.name?.split(' ')[0] || 'User'}
                                    </span>
                                    <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', userMenuOpen && 'rotate-180')} />
                                </button>

                                {userMenuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setUserMenuOpen(false)}
                                        />
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-20 animate-slide-down">
                                            <div className="px-4 py-2 border-b border-gray-100">
                                                <div className="font-medium text-sm text-[#1a1a1a] truncate">{user.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{user.email}</div>
                                            </div>
                                            <Link
                                                href="/dashboard/settings"
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                onClick={() => setUserMenuOpen(false)}
                                            >
                                                <User className="w-4 h-4" />
                                                Profile
                                            </Link>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Log out
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ===== MAIN CONTENT ===== */}
            <main>
                {children}
            </main>
        </div>
    )
}
