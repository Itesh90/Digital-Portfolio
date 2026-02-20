import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse/lib/pdf-parse')

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

        // Check if NVIDIA NIM API key is configured
        const nvidiaApiKey = process.env.NVIDIA_NIM_API_KEY
        const nvidiaBaseUrl = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1'
        if (!nvidiaApiKey) {
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
                        technologies: ['Next.js', 'Supabase', 'AI'],
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
                message: 'Using demo data (NVIDIA_NIM_API_KEY not configured)'
            })
        }

        // Download file content from Supabase Storage
        let fileContent = ''
        if (resume.file_url) {
            try {
                // Extract the storage path from the file_url
                const urlParts = resume.file_url.split('/storage/v1/object/public/')
                const storagePath = urlParts[1] // e.g., "resumes/user_id/filename.pdf"

                if (storagePath) {
                    const bucketAndPath = storagePath.split('/')
                    const bucket = bucketAndPath[0]
                    const filePath = bucketAndPath.slice(1).join('/')

                    const { data: fileData, error: downloadError } = await supabase
                        .storage
                        .from(bucket)
                        .download(filePath)

                    if (!downloadError && fileData) {
                        const filename = (resume.filename || '').toLowerCase()
                        if (filename.endsWith('.pdf')) {
                            // Extract text from PDF using pdf-parse v1
                            const arrayBuffer = await fileData.arrayBuffer()
                            const buffer = Buffer.from(arrayBuffer)
                            const pdfData = await pdfParse(buffer)
                            fileContent = pdfData.text || ''
                        } else if (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
                            // Extract text from image using NVIDIA NeMo Retriever OCR
                            const ocrApiKey = process.env.NVIDIA_OCR_API_KEY
                            if (ocrApiKey) {
                                try {
                                    const arrayBuffer = await fileData.arrayBuffer()
                                    const base64Image = Buffer.from(arrayBuffer).toString('base64')
                                    const imageFormat = filename.endsWith('.png') ? 'png' : 'jpeg'

                                    const ocrResponse = await fetch('https://integrate.api.nvidia.com/v1/infer', {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${ocrApiKey}`,
                                            'Content-Type': 'application/json',
                                            'Accept': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            input: [{
                                                type: 'image_url',
                                                url: `data:image/${imageFormat};base64,${base64Image}`
                                            }],
                                            merge_levels: ['paragraph']
                                        })
                                    })

                                    if (ocrResponse.ok) {
                                        const ocrData = await ocrResponse.json()
                                        // Extract all text detections and concatenate
                                        const textParts: string[] = []
                                        for (const item of ocrData.data || []) {
                                            for (const detection of item.text_detections || []) {
                                                const text = detection.text_prediction?.text
                                                if (text) textParts.push(text)
                                            }
                                        }
                                        fileContent = textParts.join('\n')
                                    } else {
                                        console.error('NeMo OCR API error:', ocrResponse.status, await ocrResponse.text())
                                    }
                                } catch (ocrErr) {
                                    console.error('NeMo OCR extraction failed:', ocrErr)
                                }
                            } else {
                                console.warn('NVIDIA_OCR_API_KEY not set, skipping image OCR')
                            }
                        } else {
                            // For text files (.txt, .docx fallback)
                            fileContent = await fileData.text()
                        }
                    }
                }
            } catch (downloadErr) {
                console.error('File download error:', downloadErr)
            }
        }

        // Parse resume with NVIDIA NIM Devstral
        const prompt = `Parse this resume and extract structured data in JSON format:

${fileContent ? `Resume Content:\n${fileContent.slice(0, 8000)}` : `File: ${resume.filename}\nNote: Could not read file content. Generate a placeholder structure based on the filename.`}

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

        const orResponse = await fetch(`${nvidiaBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${nvidiaApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'mistralai/devstral-2-123b-instruct-2512',
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.15,
                top_p: 0.95,
                max_tokens: 4096,
                seed: 42,
            })
        })

        if (!orResponse.ok) {
            const errBody = await orResponse.text()
            throw new Error(`NVIDIA NIM failed: ${orResponse.status} ${errBody}`)
        }

        const orData = await orResponse.json()
        const responseText = orData.choices?.[0]?.message?.content || ''

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
