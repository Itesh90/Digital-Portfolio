// supabase/functions/build-portfolio/index.ts
// Supabase Edge Function for building portfolio HTML/CSS

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { portfolioId } = await req.json()

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get portfolio with blueprint
        const { data: portfolio, error: fetchError } = await supabaseClient
            .from('portfolios')
            .select('*')
            .eq('id', portfolioId)
            .single()

        if (fetchError || !portfolio) {
            throw new Error('Portfolio not found')
        }

        if (!portfolio.blueprint) {
            throw new Error('Portfolio blueprint not found. Generate blueprint first.')
        }

        // Update status
        await supabaseClient
            .from('portfolios')
            .update({ status: 'building' })
            .eq('id', portfolioId)

        // Generate HTML/CSS with Gemini
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are an expert web developer. Generate a complete, production-ready single-page portfolio website.
              
              Blueprint:
              ${JSON.stringify(portfolio.blueprint, null, 2)}
              
              Design Config:
              ${JSON.stringify(portfolio.design_config || {}, null, 2)}
              
              Requirements:
              - Generate complete, valid HTML with embedded CSS
              - Use modern CSS (flexbox, grid, custom properties)
              - Make it fully responsive
              - Include smooth scroll navigation
              - Add subtle animations and hover effects
              - Use the theme colors from the blueprint
              
              Return a JSON object with:
              {
                "html": "complete HTML document",
                "sections": [
                  { "id": "section-id", "html": "section HTML" }
                ]
              }
              
              Return ONLY valid JSON.`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.5,
                        maxOutputTokens: 16384,
                    }
                })
            }
        )

        const geminiData = await geminiResponse.json()
        let content = {}

        try {
            const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
            const cleanJson = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            content = JSON.parse(cleanJson)
        } catch (parseError) {
            console.error('Failed to parse build output:', parseError)
            content = {
                html: generateFallbackHTML(portfolio.blueprint),
                sections: []
            }
        }

        // Update portfolio with built content
        const { data: updatedPortfolio, error: updateError } = await supabaseClient
            .from('portfolios')
            .update({
                content,
                status: 'published',
                published_url: `https://portfolio.tablo.app/${portfolioId}`,
                updated_at: new Date().toISOString(),
            })
            .eq('id', portfolioId)
            .select()
            .single()

        if (updateError) throw updateError

        return new Response(
            JSON.stringify({ portfolio: updatedPortfolio }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

function generateFallbackHTML(blueprint: any): string {
    const theme = blueprint.theme || { primaryColor: '#6366f1' }
    const sections = blueprint.sections || []

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${blueprint.meta?.title || 'My Portfolio'}</title>
  <style>
    :root { --primary: ${theme.primaryColor}; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; line-height: 1.6; }
    section { padding: 4rem 2rem; max-width: 1200px; margin: 0 auto; }
    h1, h2 { color: var(--primary); }
  </style>
</head>
<body>
  ${sections.map((s: any) => `<section id="${s.type}"><h2>${s.title}</h2></section>`).join('\n')}
</body>
</html>`
}
