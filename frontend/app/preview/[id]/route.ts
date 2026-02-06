import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: portfolioId } = await params


        if (!portfolioId) {
            return new NextResponse('Portfolio not found', { status: 404 })
        }

        const supabase = await createServerSupabaseClient()

        // Get portfolio
        const { data: portfolio, error } = await supabase
            .from('portfolios')
            .select('content, name')
            .eq('id', portfolioId)
            .single()

        if (error || !portfolio) {
            return new NextResponse('Portfolio not found', { status: 404 })
        }

        const html = portfolio.content?.html

        if (!html) {
            // Return placeholder HTML
            return new NextResponse(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${portfolio.name || 'Portfolio'}</title>
    <style>
        body {
            font-family: system-ui, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
        }
        .message {
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="message">
        <h1>Portfolio Coming Soon</h1>
        <p>This portfolio is being built...</p>
    </div>
</body>
</html>
            `, {
                headers: {
                    'Content-Type': 'text/html',
                }
            })
        }

        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html',
            }
        })

    } catch (error: any) {
        console.error('Preview error:', error)
        return new NextResponse('Error loading preview', { status: 500 })
    }
}
