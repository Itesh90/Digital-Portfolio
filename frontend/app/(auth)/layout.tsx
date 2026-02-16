import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen flex">
            {/* Left side - Branding with Gradient */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#FDF6F0] via-[#F8C8DC] to-[#E8D5E0] text-[#1a1a1a] p-12 flex-col justify-between relative overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#F5D0A9]/40 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#F8C8DC]/50 rounded-full blur-[100px]" />

                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-heading font-bold text-2xl">Folio.</span>
                    </Link>
                </div>

                <div className="space-y-8 relative z-10">
                    <div className="max-w-md">
                        <h2 className="text-4xl font-heading font-bold mb-4">
                            Transform your resume into a stunning portfolio
                        </h2>
                        <p className="text-gray-600 text-lg">
                            Join thousands of professionals who've elevated their online presence
                            with AI-powered portfolio generation.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/50">
                            <div className="text-3xl font-bold text-[#9B3DDB]">5min</div>
                            <div className="text-gray-600 text-sm">Average build time</div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/50">
                            <div className="text-3xl font-bold text-[#9B3DDB]">10k+</div>
                            <div className="text-gray-600 text-sm">Portfolios created</div>
                        </div>
                    </div>
                </div>

                <div className="text-gray-500 text-sm relative z-10">
                    © 2026 Folio. All rights reserved.
                </div>
            </div>

            {/* Right side - Form with subtle gradient */}
            <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-white via-[#FDF6F0]/30 to-[#F8C8DC]/20">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>
        </div>
    )
}
