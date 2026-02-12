'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// Redirect to new builder at /builder/[id]
export default function OldBuilderRedirect() {
    const params = useParams()
    const router = useRouter()

    useEffect(() => {
        router.replace(`/builder/${params.id}`)
    }, [params.id, router])

    return (
        <div className="h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 text-sm">Redirecting to builder...</p>
            </div>
        </div>
    )
}
