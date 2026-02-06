import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
    try {
        const { portfolioId } = await request.json()

        if (!portfolioId) {
            return NextResponse.json(
                { error: 'Missing portfolioId' },
                { status: 400 }
            )
        }

        const supabase = await createServerSupabaseClient()

        // Get portfolio
        const { data: portfolio, error } = await supabase
            .from('portfolios')
            .select('*')
            .eq('id', portfolioId)
            .single()

        if (error || !portfolio) {
            return NextResponse.json(
                { error: 'Portfolio not found' },
                { status: 404 }
            )
        }

        if (!portfolio.content?.html) {
            return NextResponse.json(
                { error: 'No content to publish' },
                { status: 400 }
            )
        }

        // Update portfolio status to published
        const { data: updated, error: updateError } = await supabase
            .from('portfolios')
            .update({
                status: 'published',
                published_url: `https://portfolio.tablo.app/${portfolioId}`,
                updated_at: new Date().toISOString()
            })
            .eq('id', portfolioId)
            .select()
            .single()

        if (updateError) {
            throw updateError
        }

        return NextResponse.json({
            success: true,
            url: updated.published_url
        })

    } catch (error: any) {
        console.error('Publish error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to publish' },
            { status: 500 }
        )
    }
}
