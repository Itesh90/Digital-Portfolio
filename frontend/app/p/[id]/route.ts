import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public route — no auth required. Serves published portfolio HTML.
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params

        if (!id) {
            return new NextResponse('Portfolio not found', { status: 404 })
        }

        // Use service-role or anon key for public read
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            return new NextResponse('Server configuration error', { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data: portfolio, error } = await supabase
            .from('portfolios')
            .select('name, status, content, published_url')
            .eq('id', id)
            .single()

        if (error || !portfolio) {
            return new NextResponse(
                `<!DOCTYPE html><html><head><title>Not Found</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb"><div style="text-align:center"><h1 style="font-size:48px;color:#9333ea">404</h1><p style="color:#6b7280">Portfolio not found</p></div></body></html>`,
                { status: 404, headers: { 'Content-Type': 'text/html' } }
            )
        }

        if (portfolio.status !== 'published') {
            return new NextResponse(
                `<!DOCTYPE html><html><head><title>Not Published</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb"><div style="text-align:center"><h1 style="font-size:48px;color:#9333ea">🔒</h1><p style="color:#6b7280">This portfolio is not published yet</p></div></body></html>`,
                { status: 403, headers: { 'Content-Type': 'text/html' } }
            )
        }

        const html = portfolio.content?.html
        if (!html) {
            return new NextResponse(
                `<!DOCTYPE html><html><head><title>Empty Portfolio</title></head><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb"><div style="text-align:center"><h1 style="font-size:48px;color:#9333ea">📄</h1><p style="color:#6b7280">This portfolio has no content</p></div></body></html>`,
                { status: 404, headers: { 'Content-Type': 'text/html' } }
            )
        }

        return new NextResponse(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=60, s-maxage=300',
            }
        })
    } catch (error: any) {
        console.error('Public portfolio error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
