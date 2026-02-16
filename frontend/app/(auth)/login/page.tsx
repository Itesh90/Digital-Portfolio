'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (authError) {
                throw authError
            }

            toast.success('Welcome back!')

            // Check if user came from landing page with pending action
            const pendingPrompt = localStorage.getItem('pending_prompt')
            const pendingUpload = localStorage.getItem('pending_upload')

            if (pendingPrompt || pendingUpload) {
                localStorage.removeItem('pending_prompt')
                localStorage.removeItem('pending_upload')
                router.push('/dashboard/upload')
            } else {
                // Check onboarding status
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('onboarding_completed')
                    .eq('id', data.user?.id)
                    .single()

                if (profile && !profile.onboarding_completed) {
                    router.push('/onboarding')
                } else {
                    router.push('/dashboard')
                }
            }
        } catch (err: any) {
            const message = err.message || 'Failed to log in'
            if (message.includes('Invalid login credentials')) {
                setError('The email or password you entered is incorrect.')
            } else {
                setError(message)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-fade-in">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
                <Link href="/" className="inline-flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-heading font-bold text-2xl">Folio.</span>
                </Link>
            </div>

            <div className="text-center mb-8">
                <h1 className="text-3xl font-heading font-bold text-gray-900">Welcome back</h1>
                <p className="text-gray-600 mt-2">
                    Sign in to continue building your portfolio
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
                    <label htmlFor="email" className="label">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                setError('')
                            }}
                            placeholder="you@example.com"
                            className={cn('input pl-10', error && 'input-error')}
                            required
                        />
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="password" className="label mb-0">Password</label>
                        <Link href="/forgot-password" className="text-sm text-[#9B3DDB] hover:underline">
                            Forgot password?
                        </Link>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                setError('')
                            }}
                            placeholder="••••••••"
                            className={cn('input pl-10', error && 'input-error')}
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 text-base bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded-lg font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        'Sign in'
                    )}
                </button>
            </form>

            <div className="mt-6 text-center text-gray-600">
                Don't have an account?{' '}
                <Link href="/signup" className="text-[#9B3DDB] font-medium hover:underline">
                    Sign up
                </Link>
            </div>
        </div>
    )
}
