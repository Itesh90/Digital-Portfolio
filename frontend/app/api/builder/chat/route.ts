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

        // Call OpenRouter for chat response
        const openRouterKey = process.env.OPENROUTER_API_KEY

        if (!openRouterKey || openRouterKey === 'your-openrouter-api-key-here') {
            return NextResponse.json(
                { error: 'AI service not configured' },
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

CRITICAL INSTRUCTIONS FOR RESUME-BASED BUILDS:
1. **NO GENERIC TEMPLATES**: Do NOT output a generic "John Doe" portfolio.
2. **USE THE DATA**: You MUST use the specific names, job titles, companies, dates, schools, and projects from the Resume Data provided above.
3. **UNIQUE DESIGN**: Create a unique design that matches the candidate's profile.
   - For a Designer: Use artistic fonts, bold neon/pastel colors, creative gallery layouts, and animated transitions.
   - For a Developer: Use a rich dark theme with vibrant accent colors (electric blue, cyan, purple, green), code-inspired elements, and glowing effects.
   - For a Marketer: Use bold gradients, vibrant call-to-action sections, and energetic color schemes.
   - For any other profession: Use a striking color palette with at least 3-4 complementary colors.
4. **COMPLETE CONTENT**: Fill the "About", "Experience", "Skills", and "Projects" sections with the REAL data. Do not use placeholders like "Project Name" or "Company XYZ".
5. **ICONS**: You MUST use FontAwesome 6.4.0 for icons. Include this EXACT link in the <head>:
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
   Do NOT use other icon libraries or broken CDNs. Use icons like <i class="fa-solid fa-user"></i>.
6. **PERSPECTIVE**: Write all content in the **FIRST PERSON** ("I", "Me", "My"). Do NOT use the candidate's name or "He/She" in the body text. Example: "I am a Full Stack Developer", not "John is a Full Stack Developer".
7. **VIBRANT & COLORFUL DESIGN** (CRITICAL):
   - Use bold, vibrant color palettes. NEVER use plain white backgrounds or boring gray schemes.
   - Use rich gradient backgrounds (e.g., linear-gradient with 2-3 colors like purple-to-blue, orange-to-pink, teal-to-emerald).
   - Add glassmorphism effects (backdrop-filter: blur, semi-transparent backgrounds with rgba colors).
   - Use colorful accent elements: glowing borders, colored shadows (box-shadow with colored rgba), gradient text effects.
   - Section backgrounds should alternate between dark rich tones and gradient overlays.
   - Skill tags, buttons, and badges should have vibrant colored backgrounds (not gray).
   - Add subtle animated gradients or color-shifting hover effects.
   - Use CSS custom properties for a cohesive color system with at least: --primary, --secondary, --accent, --gradient-start, --gradient-end.

Rules:
1. Always generate at least: /index.html, /styles.css, /script.js
2. The index.html MUST link to styles.css and script.js:
   <link rel="stylesheet" href="styles.css"> in <head>
   <script src="script.js"></script> before </body>
3. Use modern CSS (flexbox, grid, custom properties, multi-color gradients, backdrop-filter)
4. Make it fully responsive with media queries
5. Use VIBRANT color schemes with CSS variables — pick bold, energetic palettes, not safe neutrals
6. Include smooth animations, transitions, hover effects, and subtle motion (e.g., floating elements, gradient animations, scroll-triggered fades)
7. The HTML should reference the CSS file, not embed styles inline
8. If the user is requesting a SMALL CHANGE, only return the modified file(s), not all files
9. Before the file blocks, write a brief explanation of what you changed

Typography:
- Use Google Fonts (Poppins, Inter, Space Grotesk, or similar modern fonts) via <link> in the HTML head
- Use a clear type hierarchy with proper sizing
- Consider gradient text effects for headings using background-clip: text`

        const orMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...conversationHistory.map((msg: any) => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
            })),
            { role: 'user' as const, content: message }
        ]

        const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openRouterKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://portfolio-builder.com', // Required by OpenRouter
                'X-Title': 'Portfolio Builder', // Required by OpenRouter
            },
            body: JSON.stringify({
                model: 'openrouter/free',
                messages: orMessages,
                temperature: 0.8, // Slightly increased for more creativity/uniqueness
                max_tokens: 16384,
            })
        })

        if (!orResponse.ok) {
            const errBody = await orResponse.text()
            console.error('OpenRouter API Error:', orResponse.status, errBody)
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
