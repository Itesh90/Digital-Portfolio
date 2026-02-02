'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function SignupPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const passwordRequirements = [
        { label: 'At least 8 characters', met: password.length >= 8 },
        { label: 'Contains a number', met: /\d/.test(password) },
        { label: 'Contains a letter', met: /[a-zA-Z]/.test(password) },
    ]

    const allRequirementsMet = passwordRequirements.every(req => req.met)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!allRequirementsMet) {
            setError('Please meet all password requirements')
            return
        }

        setLoading(true)

        try {
            await api.register(email, password, name)

            // Auto-login after registration
            const tokens = await api.login(email, password)
            localStorage.setItem('access_token', tokens.access_token)
            localStorage.setItem('refresh_token', tokens.refresh_token)

            toast.success('Account created successfully!')

            // Check if user came from landing page with pending action
            const pendingPrompt = localStorage.getItem('pending_prompt')
            const pendingUpload = localStorage.getItem('pending_upload')

            if (pendingPrompt || pendingUpload) {
                // Clear pending items and redirect to dashboard/upload
                localStorage.removeItem('pending_prompt')
                localStorage.removeItem('pending_upload')
                router.push('/dashboard/upload')
            } else {
                router.push('/dashboard')
            }
        } catch (err: any) {
            const message = err.response?.data?.detail || 'Failed to create account'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-fade-in">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
                <Link href="/" className="inline-flex items-center gap-2">
                    <div className="w-10 h-10 bg-[#1a1a1a] rounded-xl flex items-center justify-center">
                        <Mail className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-heading font-bold text-2xl">Tablo.</span>
                </Link>
            </div>

            <div className="text-center mb-8">
                <h1 className="text-3xl font-heading font-bold text-gray-900">Create your account</h1>
                <p className="text-gray-600 mt-2">
                    Start building your professional portfolio today
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 animate-slide-down">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="name" className="label">Full Name</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            className="input pl-10"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="email" className="label">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="input pl-10"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="label">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="input pl-10"
                            required
                        />
                    </div>

                    {/* Password requirements */}
                    {password.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                            {passwordRequirements.map((req, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        'flex items-center gap-2 text-sm transition-colors',
                                        req.met ? 'text-green-600' : 'text-gray-500'
                                    )}
                                >
                                    <CheckCircle className={cn('w-4 h-4', !req.met && 'opacity-50')} />
                                    {req.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading || !allRequirementsMet}
                    className="w-full py-3 text-base bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded-lg font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        'Create account'
                    )}
                </button>
            </form>

            <p className="mt-4 text-xs text-gray-500 text-center">
                By signing up, you agree to our{' '}
                <Link href="/terms" className="text-[#9B3DDB] hover:underline">Terms</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-[#9B3DDB] hover:underline">Privacy Policy</Link>
            </p>

            <div className="mt-6 text-center text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-[#9B3DDB] font-medium hover:underline">
                    Sign in
                </Link>
            </div>
        </div>
    )
}
