// supabase/functions/parse-resume/index.ts
// Supabase Edge Function for AI resume parsing using Gemini

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { resumeId } = await req.json()

        // Initialize Supabase client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get resume from database
        const { data: resume, error: fetchError } = await supabaseClient
            .from('resumes')
            .select('*')
            .eq('id', resumeId)
            .single()

        if (fetchError || !resume) {
            throw new Error('Resume not found')
        }

        // Update status to parsing
        await supabaseClient
            .from('resumes')
            .update({ status: 'parsing' })
            .eq('id', resumeId)

        // Get file content from storage
        let fileContent = ''
        if (resume.file_url) {
            const response = await fetch(resume.file_url)
            fileContent = await response.text()
        }

        // Call Gemini API for parsing
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Parse this resume and extract structured data in JSON format with these fields:
              - name: string
              - email: string
              - phone: string
              - location: string
              - summary: string
              - experience: array of { title, company, location, start_date, end_date, description, highlights }
              - education: array of { degree, institution, location, graduation_date, gpa, highlights }
              - skills: array of { category, items }
              - projects: array of { name, description, technologies, url }
              - certifications: array of { name, issuer, date }
              
              Resume content:
              ${fileContent}
              
              Return ONLY valid JSON, no markdown or explanation.`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 4096,
                    }
                })
            }
        )

        const geminiData = await geminiResponse.json()
        let parsedData = {}

        try {
            const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
            // Clean up JSON if wrapped in markdown
            const cleanJson = textContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            parsedData = JSON.parse(cleanJson)
        } catch (parseError) {
            console.error('Failed to parse Gemini response:', parseError)
            parsedData = { raw_text: fileContent }
        }

        // Update resume with parsed data
        const { data: updatedResume, error: updateError } = await supabaseClient
            .from('resumes')
            .update({
                parsed_data: parsedData,
                status: 'validated',
                updated_at: new Date().toISOString(),
            })
            .eq('id', resumeId)
            .select()
            .single()

        if (updateError) throw updateError

        return new Response(
            JSON.stringify({ resume: updatedResume }),
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
