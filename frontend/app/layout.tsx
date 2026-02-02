import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
})

const outfit = Outfit({
    subsets: ['latin'],
    variable: '--font-outfit',
})

export const metadata: Metadata = {
    title: 'Portfolio Builder | Resume to Portfolio in Minutes',
    description: 'Transform your resume into a stunning, professional portfolio website. AI-powered, ATS-optimized, and ready to publish.',
    keywords: ['portfolio builder', 'resume to portfolio', 'professional website', 'career', 'job search'],
    authors: [{ name: 'Portfolio Builder' }],
    openGraph: {
        title: 'Portfolio Builder | Resume to Portfolio in Minutes',
        description: 'Transform your resume into a stunning, professional portfolio website.',
        type: 'website',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
            <body className="font-sans bg-white text-gray-900">
                {children}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#1a1a2e',
                            color: '#fff',
                            borderRadius: '12px',
                        },
                        success: {
                            iconTheme: {
                                primary: '#4361ee',
                                secondary: '#fff',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#ef4444',
                                secondary: '#fff',
                            },
                        },
                    }}
                />
            </body>
        </html>
    )
}
