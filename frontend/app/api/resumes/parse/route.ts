import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
    try {
        const { resumeId } = await request.json()

        if (!resumeId) {
            return NextResponse.json({ error: 'Resume ID required' }, { status: 400 })
        }

        const supabase = await createServerSupabaseClient()

        // Get resume record
        const { data: resume, error: fetchError } = await supabase
            .from('resumes')
            .select('*')
            .eq('id', resumeId)
            .single()

        if (fetchError || !resume) {
            return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
        }

        // Update status to parsing
        await supabase
            .from('resumes')
            .update({ status: 'parsing' })
            .eq('id', resumeId)

        // Check if Gemini API key is configured
        const geminiKey = process.env.GEMINI_API_KEY
        if (!geminiKey || geminiKey === 'your-gemini-api-key-here') {
            // Return mock data for development
            const mockParsedData = {
                personal: {
                    name: 'Demo User',
                    email: 'demo@example.com',
                    phone: '+1 (555) 123-4567',
                    location: 'San Francisco, CA',
                    linkedin: 'linkedin.com/in/demo',
                    github: 'github.com/demo',
                },
                summary: 'Experienced software engineer with expertise in full-stack development.',
                experience: [
                    {
                        company: 'Tech Company',
                        title: 'Senior Software Engineer',
                        startDate: '2020-01',
                        endDate: 'Present',
                        description: 'Led development of key features and mentored junior developers.',
                    }
                ],
                education: [
                    {
                        school: 'University of Technology',
                        degree: 'BS Computer Science',
                        graduationDate: '2018',
                    }
                ],
                skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python'],
                projects: [
                    {
                        name: 'Portfolio Builder',
                        description: 'AI-powered portfolio website generator',
                        technologies: ['Next.js', 'Supabase', 'Gemini AI'],
                    }
                ],
            }

            const { data: updated, error: updateError } = await supabase
                .from('resumes')
                .update({
                    parsed_data: mockParsedData,
                    status: 'validated'
                })
                .eq('id', resumeId)
                .select()
                .single()

            if (updateError) throw updateError

            return NextResponse.json({
                resume: updated,
                message: 'Using demo data (Gemini API key not configured)'
            })
        }

        // Real Gemini parsing
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

        // If there's a file URL, we'd fetch and parse it
        // For now, use a simpler approach with placeholder
        const prompt = `Parse this resume and extract structured data in JSON format:

File: ${resume.filename}
URL: ${resume.file_url || 'No file uploaded'}

Return a JSON object with these fields:
{
  "personal": { "name": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "" },
  "summary": "",
  "experience": [{ "company": "", "title": "", "startDate": "", "endDate": "", "description": "" }],
  "education": [{ "school": "", "degree": "", "graduationDate": "" }],
  "skills": [],
  "projects": [{ "name": "", "description": "", "technologies": [] }]
}

Return ONLY valid JSON, no markdown.`

        const result = await model.generateContent(prompt)
        const responseText = result.response.text()

        let parsedData
        try {
            // Try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/)
            parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
        } catch {
            parsedData = { error: 'Failed to parse AI response', raw: responseText }
        }

        // Update resume with parsed data
        const { data: updated, error: updateError } = await supabase
            .from('resumes')
            .update({
                parsed_data: parsedData,
                status: 'validated'
            })
            .eq('id', resumeId)
            .select()
            .single()

        if (updateError) throw updateError

        return NextResponse.json({ resume: updated })

    } catch (error) {
        console.error('Resume parsing error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to parse resume' },
            { status: 500 }
        )
    }
}
