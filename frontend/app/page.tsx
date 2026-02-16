'use client'

import React, { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import {
    Sparkles, ArrowRight, Upload, Globe, Menu, X,
    Zap, Shield, Clock, CheckCircle, Smartphone, Monitor,
    Users, BookOpen, Code, Palette, Layers, Share2,
    Star, MessageCircle, TrendingUp, FileText
} from 'lucide-react'
import { api } from '@/lib/api'
import { cn, isAllowedFileType } from '@/lib/utils'

// ----- Logo Component -----
const Logo = () => (
    <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="font-heading font-bold text-xl text-[#1a1a1a]">Folio.</span>
    </div>
)

// ----- Navigation Items -----
const navItems = [
    { name: 'Product', href: '#product' },
    { name: 'Resources', href: '#resources' },
    { name: 'Features', href: '#features' },
    { name: 'Community', href: '#community' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Blogs', href: '#resources' },
]

// ----- Interactive Hero Box -----
const HeroInteractionBox = () => {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'prompt' | 'upload'>('prompt')
    const [prompt, setPrompt] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const f = acceptedFiles[0]
        if (!f) return
        if (!isAllowedFileType(f.name, ['pdf', 'docx', 'doc', 'txt'])) {
            setError('Invalid file type')
            return
        }
        if (f.size > 10 * 1024 * 1024) {
            setError('File too large (>10MB)')
            return
        }
        setFile(f)
        setError('')
        setActiveTab('upload')
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/msword': ['.doc'],
            'text/plain': ['.txt'],
        },
        maxFiles: 1,
        noClick: activeTab === 'prompt',
    })

    const handleGenerate = async () => {
        if ((activeTab === 'prompt' && !prompt.trim()) || (activeTab === 'upload' && !file)) return
        setIsSubmitting(true)
        setError('')

        // Check if user is authenticated
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

        if (!token) {
            // Store intent and redirect to signup
            if (activeTab === 'prompt' && prompt.trim()) {
                localStorage.setItem('pending_prompt', prompt)
            }
            if (activeTab === 'upload' && file) {
                localStorage.setItem('pending_upload', 'true')
            }
            router.push('/signup?from=landing')
            return
        }

        // Set token for API calls
        api.setAccessToken(token)

        try {
            let userResumeId: string | null = null
            if (activeTab === 'upload' && file) {
                const uploadRes = await api.uploadResume(file)
                userResumeId = uploadRes.id
                await api.parseResume(userResumeId)
                await api.validateResume(userResumeId)
            } else {
                const emptyRes = await api.createEmptyResume()
                userResumeId = emptyRes.id
            }
            const finalPrompt = activeTab === 'prompt' ? prompt : `Based on ${file?.name}`
            const portfolio = await api.createPortfolio(userResumeId, finalPrompt.slice(0, 50))
            router.push(`/dashboard/builder/${portfolio.id}?initial_prompt=${encodeURIComponent(finalPrompt)}`)
        } catch (err: any) {
            console.error(err)
            // If 401, redirect to login
            if (err?.response?.status === 401) {
                localStorage.removeItem('access_token')
                if (activeTab === 'prompt' && prompt.trim()) {
                    localStorage.setItem('pending_prompt', prompt)
                }
                router.push('/login?from=landing')
                return
            }
            setError('Something went wrong. Please try again.')
            setIsSubmitting(false)
        }
    }


    return (
        <div className="w-full max-w-2xl mx-auto mt-12 relative z-20">
            <div className="bg-white/70 backdrop-blur-xl border border-gray-200 rounded-2xl p-2 md:p-4 shadow-2xl relative overflow-hidden group">
                <div className="absolute -top-20 -left-20 w-40 h-40 bg-[#F5D0A9]/30 rounded-full blur-3xl pointer-events-none group-hover:bg-[#F5D0A9]/40 transition-all duration-500" />
                <div className="relative z-10 space-y-4">
                    <div
                        {...getRootProps()}
                        className={cn(
                            "relative min-h-[120px] rounded-xl border border-gray-200 bg-white/80 transition-colors",
                            isDragActive && "border-[#9B3DDB]/50 bg-[#9B3DDB]/10"
                        )}
                    >
                        <input {...getInputProps()} className="hidden" />
                        {activeTab === 'prompt' ? (
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="A modern portfolio website with dark theme and contact form..."
                                className="w-full h-full bg-transparent p-4 text-[#1a1a1a] placeholder:text-gray-400 resize-none focus:outline-none text-lg min-h-[120px]"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full p-4 text-center cursor-pointer min-h-[120px]" onClick={() => (document.querySelector('input[type=file]') as HTMLInputElement)?.click()}>
                                {file ? (
                                    <>
                                        <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                                        <div className="text-[#1a1a1a] font-medium">{file.name}</div>
                                        <div className="text-gray-500 text-sm">Ready to analyze</div>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-[#9B3DDB] mb-2" />
                                        <div className="text-[#1a1a1a]">Drop your resume here</div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('prompt')}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-sm flex items-center gap-2 border transition-all",
                                    activeTab === 'prompt' ? "bg-[#9B3DDB]/10 border-[#9B3DDB]/50 text-[#9B3DDB]" : "border-gray-200 text-gray-500 hover:border-gray-300"
                                )}
                            >
                                <Monitor className="w-4 h-4" />
                                Describe
                            </button>
                            <button
                                onClick={() => setActiveTab('upload')}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-sm flex items-center gap-2 border transition-all",
                                    activeTab === 'upload' ? "bg-[#9B3DDB]/10 border-[#9B3DDB]/50 text-[#9B3DDB]" : "border-gray-200 text-gray-500 hover:border-gray-300"
                                )}
                            >
                                <Upload className="w-4 h-4" />
                                Upload CV
                            </button>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto px-6 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded-full font-medium flex items-center justify-center gap-2 shadow-lg shadow-black/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Generate
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm text-center animate-fade-in">{error}</div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ----- Main Landing Page -----
export default function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const features = [
        { icon: Zap, title: 'Lightning Fast', description: 'Generate a complete portfolio in under 5 minutes with AI assistance.' },
        { icon: Shield, title: 'ATS-Optimized', description: 'Content structured for both humans and applicant tracking systems.' },
        { icon: Palette, title: 'Beautiful Designs', description: 'Professional templates that make you stand out from the crowd.' },
        { icon: Code, title: 'Clean Code', description: 'Export production-ready code or host directly with us.' },
        { icon: Layers, title: 'Version Control', description: 'Track changes and restore previous versions anytime.' },
        { icon: Share2, title: 'Easy Sharing', description: 'Get a professional subdomain or connect your custom domain.' },
    ]

    const testimonials = [
        { name: 'Sarah Chen', role: 'Product Designer', quote: 'Built my portfolio in 10 minutes. Got 3 interviews the same week.', avatar: 'SC' },
        { name: 'Marcus Johnson', role: 'Software Engineer', quote: 'The AI understood my experience perfectly. Saved me hours of work.', avatar: 'MJ' },
        { name: 'Emily Rodriguez', role: 'UX Researcher', quote: 'Professional, clean, and exactly what I needed. Highly recommend!', avatar: 'ER' },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#FDF6F0] via-[#F8C8DC] to-[#E8D5E0] text-[#1a1a1a] selection:bg-[#9B3DDB]/30 font-sans">

            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-[#F5D0A9]/40 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-[#F8C8DC]/50 rounded-full blur-[150px]" />
            </div>

            {/* ===== 1. HEADER / NAVIGATION ===== */}
            <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
                <Logo />

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
                    {navItems.map((item) => (
                        <Link key={item.name} href={item.href} className="hover:text-[#1a1a1a] transition">
                            {item.name}
                        </Link>
                    ))}
                </div>

                {/* Auth Buttons */}
                <div className="hidden md:flex items-center gap-4">
                    <Link href="/login" className="text-sm font-medium text-[#1a1a1a] hover:text-gray-700 transition">
                        Login
                    </Link>
                    <Link href="/signup" className="px-4 py-2 rounded-full bg-[#1a1a1a] text-white text-sm font-medium hover:bg-[#2a2a2a] transition">
                        Get started
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden p-2 hover:bg-white/50 rounded-lg transition"
                >
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </nav>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-x-0 top-20 z-40 bg-white/95 backdrop-blur-lg border-b border-gray-200 animate-slide-down">
                    <div className="px-6 py-4 space-y-4">
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="block text-gray-600 hover:text-[#1a1a1a] font-medium"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {item.name}
                            </Link>
                        ))}
                        <div className="pt-4 border-t border-gray-200 space-y-3">
                            <Link href="/login" className="block text-[#1a1a1a] font-medium">Login</Link>
                            <Link href="/signup" className="block px-4 py-2 bg-[#1a1a1a] text-white text-center rounded-full font-medium">
                                Get started
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== 2. HERO SECTION ===== */}
            <section className="relative z-10 pt-16 pb-24 px-4">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-300 bg-white/60 text-gray-600 text-xs font-medium mb-8 animate-fade-in backdrop-blur-sm">
                        THE FULL-STACK NO-CODE APP BUILDER
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-[#1a1a1a]">
                        Turn your resume into a portfolio with AI.
                    </h1>

                    <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
                        Build a professional product, launch to customers, and grow without limits.
                    </p>

                    <HeroInteractionBox />

                    {/* Trust Badges */}
                    <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            No credit card required
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Free tier available
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            Cancel anytime
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== 3. PRODUCT OVERVIEW ===== */}
            <section id="product" className="relative z-10 py-24 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            From resume to portfolio in minutes
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Simply upload your resume or describe what you need. Our AI translates your experience into a stunning, professional portfolio.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/50 text-center">
                            <div className="w-16 h-16 bg-[#9B3DDB]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Upload className="w-8 h-8 text-[#9B3DDB]" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">1. Upload or Describe</h3>
                            <p className="text-gray-600">Drop your resume or tell us about your goals. AI extracts and understands your experience.</p>
                        </div>

                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/50 text-center">
                            <div className="w-16 h-16 bg-[#9B3DDB]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Sparkles className="w-8 h-8 text-[#9B3DDB]" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">2. AI Transforms</h3>
                            <p className="text-gray-600">Watch as AI structures your content, suggests layouts, and creates compelling copy.</p>
                        </div>

                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/50 text-center">
                            <div className="w-16 h-16 bg-[#9B3DDB]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Globe className="w-8 h-8 text-[#9B3DDB]" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">3. Publish & Share</h3>
                            <p className="text-gray-600">Review, customize, and publish with one click. Get a shareable link instantly.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== 4. FEATURES SECTION ===== */}
            <section id="features" className="relative z-10 py-24 px-4 bg-white/30">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            Everything you need to succeed
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Built for job seekers who want to stand out without the hassle.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, index) => (
                            <div key={index} className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50 hover:shadow-lg transition-shadow">
                                <div className="w-12 h-12 bg-[#9B3DDB]/10 rounded-xl flex items-center justify-center mb-4">
                                    <feature.icon className="w-6 h-6 text-[#9B3DDB]" />
                                </div>
                                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                                <p className="text-gray-600 text-sm">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== 5. COMMUNITY / SOCIAL PROOF ===== */}
            <section id="community" className="relative z-10 py-24 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            Loved by thousands
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Join a growing community of professionals who've transformed their careers.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 mb-16">
                        {testimonials.map((testimonial, index) => (
                            <div key={index} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
                                <div className="flex items-center gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    ))}
                                </div>
                                <p className="text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#9B3DDB]/10 rounded-full flex items-center justify-center text-[#9B3DDB] font-bold text-sm">
                                        {testimonial.avatar}
                                    </div>
                                    <div>
                                        <div className="font-medium">{testimonial.name}</div>
                                        <div className="text-sm text-gray-500">{testimonial.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { value: '10,000+', label: 'Portfolios Created' },
                            { value: '5 min', label: 'Average Build Time' },
                            { value: '98%', label: 'Satisfaction Rate' },
                            { value: '24/7', label: 'AI Support' },
                        ].map((stat, index) => (
                            <div key={index} className="text-center">
                                <div className="text-3xl md:text-4xl font-bold text-[#9B3DDB]">{stat.value}</div>
                                <div className="text-gray-600 text-sm mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== 6. RESOURCES HIGHLIGHT ===== */}
            <section id="resources" className="relative z-10 py-24 px-4 bg-white/30">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            Resources to help you grow
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Guides, templates, and insights to take your career to the next level.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <Link href="#" className="group bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50 hover:shadow-lg transition-all">
                            <BookOpen className="w-8 h-8 text-[#9B3DDB] mb-4" />
                            <h3 className="text-lg font-bold mb-2 group-hover:text-[#9B3DDB] transition">Documentation</h3>
                            <p className="text-gray-600 text-sm">Learn how to get the most out of Folio with our comprehensive guides.</p>
                        </Link>

                        <Link href="#" className="group bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50 hover:shadow-lg transition-all">
                            <FileText className="w-8 h-8 text-[#9B3DDB] mb-4" />
                            <h3 className="text-lg font-bold mb-2 group-hover:text-[#9B3DDB] transition">Blog</h3>
                            <p className="text-gray-600 text-sm">Tips, trends, and insights for building a standout portfolio.</p>
                        </Link>

                        <Link href="#" className="group bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50 hover:shadow-lg transition-all">
                            <MessageCircle className="w-8 h-8 text-[#9B3DDB] mb-4" />
                            <h3 className="text-lg font-bold mb-2 group-hover:text-[#9B3DDB] transition">Community</h3>
                            <p className="text-gray-600 text-sm">Connect with other builders, share ideas, and get feedback.</p>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ===== 7. PRICING PREVIEW ===== */}
            <section id="pricing" className="relative z-10 py-24 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            Simple, transparent pricing
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Start for free, upgrade when you're ready.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Free Plan */}
                        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-white/50">
                            <h3 className="text-xl font-bold mb-2">Free</h3>
                            <div className="text-4xl font-bold mb-4">$0<span className="text-lg font-normal text-gray-500">/month</span></div>
                            <p className="text-gray-600 mb-6">Perfect for getting started</p>
                            <ul className="space-y-3 mb-8">
                                {['1 portfolio', 'Basic templates', 'Folio subdomain', 'Community support'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/signup" className="block w-full py-3 text-center border-2 border-[#1a1a1a] text-[#1a1a1a] rounded-full font-medium hover:bg-[#1a1a1a] hover:text-white transition">
                                Get started free
                            </Link>
                        </div>

                        {/* Pro Plan */}
                        <div className="bg-[#1a1a1a] text-white rounded-2xl p-8 relative overflow-hidden">
                            <div className="absolute top-4 right-4 px-3 py-1 bg-[#9B3DDB] text-xs font-medium rounded-full">
                                Popular
                            </div>
                            <h3 className="text-xl font-bold mb-2">Pro</h3>
                            <div className="text-4xl font-bold mb-4">$19<span className="text-lg font-normal text-gray-400">/month</span></div>
                            <p className="text-gray-400 mb-6">For professionals who want more</p>
                            <ul className="space-y-3 mb-8">
                                {['Unlimited portfolios', 'Premium templates', 'Custom domain', 'Priority support', 'Analytics dashboard', 'Export to code'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm">
                                        <CheckCircle className="w-4 h-4 text-[#9B3DDB]" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/signup" className="block w-full py-3 text-center bg-white text-[#1a1a1a] rounded-full font-medium hover:bg-gray-100 transition">
                                Start free trial
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== 8. CALL-TO-ACTION ===== */}
            <section className="relative z-10 py-24 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="bg-[#1a1a1a] rounded-3xl p-12 md:p-16 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#9B3DDB]/20 rounded-full blur-[100px]" />
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-5xl font-bold mb-4">
                                Ready to build your portfolio?
                            </h2>
                            <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
                                Join thousands of professionals who've transformed their online presence. Start building for free today.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href="/signup" className="px-8 py-4 bg-white text-[#1a1a1a] rounded-full font-medium hover:bg-gray-100 transition flex items-center gap-2">
                                    Get started for free
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                                <Link href="#product" className="px-8 py-4 border border-white/30 text-white rounded-full font-medium hover:bg-white/10 transition">
                                    Learn more
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== 9. FOOTER ===== */}
            <footer className="relative z-10 py-16 px-4 border-t border-gray-200/50">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-5 gap-8 mb-12">
                        {/* Brand */}
                        <div className="md:col-span-2">
                            <Logo />
                            <p className="text-gray-600 mt-4 max-w-xs">
                                Transform your resume into a stunning portfolio website with AI-powered generation.
                            </p>
                        </div>

                        {/* Links */}
                        <div>
                            <h4 className="font-bold mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li><Link href="#features" className="hover:text-[#1a1a1a] transition">Features</Link></li>
                                <li><Link href="#pricing" className="hover:text-[#1a1a1a] transition">Pricing</Link></li>
                                <li><Link href="#" className="hover:text-[#1a1a1a] transition">Templates</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold mb-4">Resources</h4>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li><Link href="#" className="hover:text-[#1a1a1a] transition">Documentation</Link></li>
                                <li><Link href="#" className="hover:text-[#1a1a1a] transition">Blog</Link></li>
                                <li><Link href="#community" className="hover:text-[#1a1a1a] transition">Community</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold mb-4">Company</h4>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li><Link href="#" className="hover:text-[#1a1a1a] transition">About</Link></li>
                                <li><Link href="#" className="hover:text-[#1a1a1a] transition">Privacy</Link></li>
                                <li><Link href="#" className="hover:text-[#1a1a1a] transition">Terms</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-200/50 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-gray-500">
                            © 2026 Folio. All rights reserved.
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                            <Link href="#" className="hover:text-[#1a1a1a] transition">Twitter</Link>
                            <Link href="#" className="hover:text-[#1a1a1a] transition">LinkedIn</Link>
                            <Link href="#" className="hover:text-[#1a1a1a] transition">GitHub</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}
