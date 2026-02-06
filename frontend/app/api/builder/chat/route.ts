import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
    try {
        const { portfolioId, message, history } = await request.json()

        if (!portfolioId || !message) {
            return NextResponse.json(
                { error: 'Missing portfolioId or message' },
                { status: 400 }
            )
        }

        const supabase = await createServerSupabaseClient()

        // Get current portfolio
        const { data: portfolio, error: fetchError } = await supabase
            .from('portfolios')
            .select('*, resumes(*)')
            .eq('id', portfolioId)
            .single()

        if (fetchError || !portfolio) {
            return NextResponse.json(
                { error: 'Portfolio not found' },
                { status: 404 }
            )
        }

        // Prepare context for AI
        const resumeData = portfolio.resumes?.parsed_data || {}
        const currentBlueprint = portfolio.blueprint || {}
        const currentHtml = portfolio.content?.html || ''

        // Build conversation context
        const conversationHistory = history?.slice(-5).map((msg: any) => ({
            role: msg.role,
            content: msg.content
        })) || []

        // Call Gemini for chat response
        const geminiApiKey = process.env.GEMINI_API_KEY

        if (!geminiApiKey) {
            return NextResponse.json(
                { error: 'AI service not configured' },
                { status: 500 }
            )
        }

        const systemPrompt = `You are an expert portfolio designer and web developer. You help users build and modify their portfolio websites.

Current Portfolio State:
- Name: ${portfolio.name}
- Resume Data: ${JSON.stringify(resumeData, null, 2)}
- Current Blueprint: ${JSON.stringify(currentBlueprint, null, 2)}

Your responses should:
1. Acknowledge the user's request
2. Explain what changes you're making
3. If the request involves visual changes, generate updated HTML

When generating HTML:
- Create complete, valid HTML with embedded CSS
- Use modern CSS (flexbox, grid, custom properties)
- Make it fully responsive
- Use professional color schemes
- Include smooth animations and hover effects

IMPORTANT: If generating HTML, wrap it in <portfolio_html>...</portfolio_html> tags.`

        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        { role: 'user', parts: [{ text: systemPrompt }] },
                        ...conversationHistory.map((msg: any) => ({
                            role: msg.role === 'assistant' ? 'model' : 'user',
                            parts: [{ text: msg.content }]
                        })),
                        { role: 'user', parts: [{ text: message }] }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 16384,
                    }
                })
            }
        )

        const geminiData = await geminiResponse.json()
        const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

        // Extract HTML if present
        let html: string | null = null
        let chatMessage = responseText

        const htmlMatch = responseText.match(/<portfolio_html>([\s\S]*?)<\/portfolio_html>/)
        if (htmlMatch) {
            html = htmlMatch[1].trim()
            chatMessage = responseText.replace(/<portfolio_html>[\s\S]*?<\/portfolio_html>/, '').trim()

            // Update portfolio in database
            await supabase
                .from('portfolios')
                .update({
                    content: { html },
                    updated_at: new Date().toISOString()
                })
                .eq('id', portfolioId)
        }

        return NextResponse.json({
            message: chatMessage || "I've updated your portfolio. Check the preview!",
            html
        })

    } catch (error: any) {
        console.error('Chat error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to process request' },
            { status: 500 }
        )
    }
}
