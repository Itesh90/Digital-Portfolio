// supabase/functions/generate-blueprint/index.ts
// Supabase Edge Function for AI portfolio blueprint generation

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
        const { portfolioId, resumeData, designConfig } = await req.json()

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get portfolio
        const { data: portfolio, error: fetchError } = await supabaseClient
            .from('portfolios')
            .select('*, resumes(*)')
            .eq('id', portfolioId)
            .single()

        if (fetchError || !portfolio) {
            throw new Error('Portfolio not found')
        }

        // Update status
        await supabaseClient
            .from('portfolios')
            .update({ status: 'building' })
            .eq('id', portfolioId)

        // Get resume data
        const parsedData = resumeData || portfolio.resumes?.parsed_data || {}

        // Generate blueprint with Gemini
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a professional portfolio designer. Create a portfolio blueprint based on this data.
              
              Resume Data:
              ${JSON.stringify(parsedData, null, 2)}
              
              Design Preferences:
              ${JSON.stringify(designConfig || {}, null, 2)}
              
              Generate a JSON blueprint with:
              {
                "sections": [
                  {
                    "type": "hero|about|experience|education|skills|projects|contact",
                    "title": "Section Title",
                    "content": { ... section-specific content ... },
                    "order": number
                  }
                ],
                "theme": {
                  "primaryColor": "#hex",
                  "secondaryColor": "#hex",
                  "fontFamily": "font name",
                  "style": "minimal|modern|creative|professional"
                },
                "meta": {
                  "title": "Page title",
                  "description": "Meta description"
                }
              }
              
              Return ONLY valid JSON.`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                    }
                })
            }
        )

        const geminiData = await geminiResponse.json()
        let blueprint = {}

        try {
            const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
            const cleanJson = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            blueprint = JSON.parse(cleanJson)
        } catch (parseError) {
            console.error('Failed to parse blueprint:', parseError)
            // Generate default blueprint
            blueprint = {
                sections: [
                    { type: 'hero', title: parsedData.name || 'Welcome', order: 0 },
                    { type: 'about', title: 'About Me', content: { summary: parsedData.summary }, order: 1 },
                    { type: 'experience', title: 'Experience', content: { items: parsedData.experience }, order: 2 },
                    { type: 'skills', title: 'Skills', content: { items: parsedData.skills }, order: 3 },
                    { type: 'contact', title: 'Contact', order: 4 },
                ],
                theme: { primaryColor: '#6366f1', style: 'modern' }
            }
        }

        // Update portfolio with blueprint
        const { data: updatedPortfolio, error: updateError } = await supabaseClient
            .from('portfolios')
            .update({
                blueprint,
                design_config: designConfig || portfolio.design_config,
                status: 'draft',
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
