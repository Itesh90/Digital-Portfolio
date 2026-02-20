import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse/lib/pdf-parse')

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
        const resume = Array.isArray(portfolio.resumes) ? portfolio.resumes[0] : portfolio.resumes
        const resumeData = resume?.parsed_data || {}
        let resumeTextContent = ''

        // If parsed data is empty or we want to be sure, try to fetch raw text
        if (resume?.file_url) {
            try {
                // Extract storage path
                const urlParts = resume.file_url.split('/storage/v1/object/public/')
                const storagePath = urlParts[1]

                if (storagePath) {
                    const bucketAndPath = storagePath.split('/')
                    const bucket = bucketAndPath[0]
                    const filePath = bucketAndPath.slice(1).join('/')

                    const { data: fileData, error: downloadError } = await supabase
                        .storage
                        .from(bucket)
                        .download(filePath)

                    if (!downloadError && fileData) {
                        const filename = resume.filename || ''
                        if (filename.toLowerCase().endsWith('.pdf')) {
                            // Extract text from PDF using pdf-parse v1
                            const arrayBuffer = await fileData.arrayBuffer()
                            const buffer = Buffer.from(arrayBuffer)
                            const pdfData = await pdfParse(buffer)
                            resumeTextContent = pdfData.text || ''
                        } else {
                            resumeTextContent = await fileData.text()
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to download resume text for chat:', err)
            }
        }

        const currentBlueprint = portfolio.blueprint || {}
        const currentHtml = portfolio.content?.html || ''

        // Build conversation context
        const conversationHistory = history?.slice(-5).map((msg: any) => ({
            role: msg.role,
            content: msg.content
        })) || []

        // Call NVIDIA NIM for chat response
        const nvidiaApiKey = process.env.NVIDIA_NIM_API_KEY
        const nvidiaBaseUrl = process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1'

        if (!nvidiaApiKey) {
            return NextResponse.json(
                { error: 'AI service not configured (NVIDIA_NIM_API_KEY missing)' },
                { status: 500 }
            )
        }

        // Build current files context for surgical edits
        const currentFiles = request.headers.get('x-current-files')
            ? JSON.parse(request.headers.get('x-current-files') || '{}')
            : {}

        const currentFilesContext = Object.keys(currentFiles).length > 0
            ? `\n\nCurrent Files:\n${Object.entries(currentFiles).map(([path, file]: [string, any]) =>
                `--- ${path} ---\n${file.content}\n`
            ).join('\n')}`
            : ''

        const systemPrompt = `You are an expert portfolio designer and web developer. You help users build and modify their portfolio websites.

Current Portfolio State:
- Name: ${portfolio.name}
- Resume Data (Structured): ${JSON.stringify(resumeData, null, 2)}
${resumeTextContent ? `- Resume Text Content (Raw):\n${resumeTextContent.slice(0, 15000)}` : ''}
- Current Blueprint: ${JSON.stringify(currentBlueprint, null, 2)}
${currentFilesContext}

IMPORTANT OUTPUT FORMAT:
You MUST ALWAYS output the actual portfolio code using <file> blocks. NEVER just describe or plan what you will build.
A response without <file> blocks is a FAILED response.

When generating or modifying the portfolio, output SEPARATE FILES using this exact format:

<file path="/index.html">
...full HTML content...
</file>

<file path="/styles.css">
...full CSS content...
</file>

<file path="/script.js">
...full JS content...
</file>

You may include a BRIEF 1-2 sentence summary before the file blocks, but the <file> blocks are MANDATORY.
If this is the first message, you MUST generate all 3 files (index.html, styles.css, script.js) immediately.
Do NOT ask clarifying questions on the first message — just build a great portfolio using the resume data provided.

CRITICAL INSTRUCTIONS FOR RESUME-BASED BUILDS:
1. **NO GENERIC TEMPLATES**: Do NOT output a generic "John Doe" portfolio.
2. **USE THE DATA**: You MUST use the specific names, job titles, companies, dates, schools, and projects from the Resume Data provided above.
3. **UNIQUE DESIGN**: Create a unique design that matches the candidate's profile.
   - For a Designer: Use artistic fonts, bold neon/pastel colors, creative gallery layouts, and animated transitions.
   - For a Developer: Use a rich dark theme with vibrant accent colors (electric blue, cyan, purple, green), code-inspired elements, and glowing effects.
   - For a Marketer: Use bold gradients, vibrant call-to-action sections, and energetic color schemes.
   - For any other profession: Use a striking color palette with at least 3-4 complementary colors.
4. **COMPLETE CONTENT**: Fill the "About", "Experience", "Skills", and "Projects" sections with the REAL data. Do not use placeholders like "Project Name" or "Company XYZ".
5. **ICONS**: You MUST use FontAwesome 6.4.0 for icons. Include this EXACT link in the head:
   link rel stylesheet href https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css
   Do NOT use other icon libraries or broken CDNs. Use icons like i class fa-solid fa-user.
8. **TAILWIND CSS**: You MUST include Tailwind CSS via CDN in the head of index.html:
   script src https://cdn.tailwindcss.com /script
   Use Tailwind utility classes for layout, spacing, typography, colors, and responsive design.
   Use the styles.css file ONLY for custom animations, keyframes, gradients, glassmorphism effects, and things Tailwind cannot do.
   Prefer Tailwind classes like: bg-gray-900, text-white, flex, grid, p-6, rounded-xl, shadow-lg, hover:scale-105, transition-all, etc.
6. **PERSPECTIVE**: Write all content in the **FIRST PERSON** ("I", "Me", "My"). Do NOT use the candidate's name or "He/She" in the body text. Example: "I am a Full Stack Developer", not "John is a Full Stack Developer".
7. **VIBRANT & COLORFUL DESIGN** (CRITICAL):
   - Use bold, vibrant color palettes but prioritizing READABILITY.
   - **CONTRAST RULE**: If background is dark/vibrant, text MUST be white or very light gray. If background is light, text MUST be dark gray/black. NEVER use dark text on dark backgrounds.
   - **CONTAINERS**: Main content (About, Experience, Projects) MUST be inside cards or sections with semi-transparent backgrounds (glassmorphism: background rgba(255,255,255,0.1), backdrop-filter blur(10px), border 1px solid rgba(255,255,255,0.1)). Do NOT place text directly on loud gradients.
   - Use rich gradient backgrounds for the body or section backgrounds (e.g., linear-gradient with 2-3 harmonious colors).
   - Use colorful accent elements: glowing borders, colored shadows, gradient text for headings (background-clip: text).
   - Section backgrounds should alternate to create rhythm.
   - Skill tags, buttons, and badges should have vibrant colored backgrounds.
   - Add subtle animated gradients or color-shifting hover effects.
   - Use CSS custom properties: --primary, --secondary, --accent, --bg-gradient.

Rules:
1. Always generate at least: /index.html, /styles.css, /script.js
2. The index.html MUST include in the head: Tailwind CDN script, FontAwesome CSS link, Google Fonts link, and styles.css link. Include script.js before closing body.
3. Use Tailwind CSS utility classes as the PRIMARY styling method. Use styles.css only for custom animations, keyframes, complex gradients, and effects Tailwind cannot handle.
4. Make it fully responsive using Tailwind breakpoints (sm:, md:, lg:, xl:)
5. Use VIBRANT but READABLE color schemes — ensure high contrast
6. Include smooth animations, transitions, hover effects (use Tailwind transition classes + custom CSS keyframes)
7. If the user is requesting a SMALL CHANGE, only return the modified file(s), not all files
8. Before the file blocks, write a brief explanation of what you changed

Typography:
- Use Google Fonts (Poppins, Inter, Space Grotesk) via link tag in head
- Use Tailwind font-size classes (text-sm, text-lg, text-2xl, text-5xl, etc.) for hierarchy
- Use gradient text for MAIN HEADINGS only, keeping body text solid for readability`

        const orMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...conversationHistory.map((msg: any) => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
            })),
            { role: 'user' as const, content: message }
        ]

        const orResponse = await fetch(`${nvidiaBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${nvidiaApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'mistralai/devstral-2-123b-instruct-2512',
                messages: orMessages,
                temperature: 0.15,
                top_p: 0.95,
                max_tokens: 8192,
                seed: 42,
            })
        })

        if (!orResponse.ok) {
            const errBody = await orResponse.text()
            console.error('NVIDIA NIM API Error:', orResponse.status, errBody)
            let errorMessage = `AI Service Error (${orResponse.status})`

            try {
                const errJson = JSON.parse(errBody)
                errorMessage = errJson.error?.message || errorMessage
            } catch (e) {
                // Use raw body if not JSON
                errorMessage = `${errorMessage}: ${errBody.slice(0, 100)}`
            }

            return NextResponse.json(
                { error: errorMessage },
                { status: orResponse.status }
            )
        }

        const orData = await orResponse.json()
        const responseText = orData.choices?.[0]?.message?.content || ''

        // Parse file blocks from AI response
        const fileRegex = /<file\s+path="([^"]+)">([\s\S]*?)<\/file>/g
        const files: Record<string, { path: string; content: string; language: string }> = {}
        let match

        while ((match = fileRegex.exec(responseText)) !== null) {
            const filePath = match[1]
            const fileContent = match[2].trim()
            const ext = filePath.split('.').pop() || ''
            const langMap: Record<string, string> = {
                'html': 'html', 'css': 'css', 'js': 'javascript',
                'ts': 'typescript', 'jsx': 'javascript', 'tsx': 'typescript'
            }
            files[filePath] = {
                path: filePath,
                content: fileContent,
                language: langMap[ext] || 'plaintext'
            }
        }

        // Extract chat message (everything outside file blocks)
        let chatMessage = responseText.replace(/<file\s+path="[^"]+">[\s\S]*?<\/file>/g, '').trim()

        // Fallback: if no file blocks found, try legacy <portfolio_html> format
        if (Object.keys(files).length === 0) {
            const htmlMatch = responseText.match(/<portfolio_html>([\s\S]*?)<\/portfolio_html>/)
            if (htmlMatch) {
                files['/index.html'] = {
                    path: '/index.html',
                    content: htmlMatch[1].trim(),
                    language: 'html'
                }
                chatMessage = responseText.replace(/<portfolio_html>[\s\S]*?<\/portfolio_html>/, '').trim()
            }
        }

        // Save assembled HTML to database for backward compat
        if (Object.keys(files).length > 0) {
            const indexHtml = files['/index.html']?.content || ''
            const css = files['/styles.css']?.content || ''
            const js = files['/script.js']?.content || ''

            // Assemble full HTML for database storage
            const assembledHtml = indexHtml || `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${portfolio.name}</title>
    <style>${css}</style>
</head>
<body>
    ${Object.values(files).filter(f => f.path.startsWith('/components/')).map(f => f.content).join('\n')}
    <script>${js}</script>
</body>
</html>`

            await supabase
                .from('portfolios')
                .update({
                    content: { html: assembledHtml, files },
                    updated_at: new Date().toISOString()
                })
                .eq('id', portfolioId)
        }

        return NextResponse.json({
            message: chatMessage || "I've updated your portfolio. Check the preview!",
            files: Object.keys(files).length > 0 ? files : undefined,
            // Legacy support
            html: files['/index.html']?.content || null
        })

    } catch (error: any) {
        console.error('Chat error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to process request' },
            { status: 500 }
        )
    }
}
