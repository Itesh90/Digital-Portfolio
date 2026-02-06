import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Generate mock portfolio HTML based on resume data
function generateMockHtml(portfolio: any, resumeData: any): string {
    const name = resumeData?.personal?.name || 'Your Name'
    const headline = resumeData?.personal?.headline || 'Professional'
    const email = resumeData?.personal?.email || 'email@example.com'
    const summary = resumeData?.summary || 'A passionate professional with experience in building great things.'
    const experience = resumeData?.experience || []
    const skills = resumeData?.skills || []
    const projects = resumeData?.projects || []

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} - Portfolio</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #1a1a1a;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 24px;
        }
        
        /* Hero Section */
        .hero {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: white;
            padding: 40px 20px;
        }
        .hero-content {
            max-width: 700px;
        }
        .hero h1 {
            font-size: clamp(2.5rem, 5vw, 4rem);
            font-weight: 700;
            margin-bottom: 16px;
            text-shadow: 0 2px 20px rgba(0,0,0,0.2);
        }
        .hero .headline {
            font-size: 1.25rem;
            opacity: 0.9;
            margin-bottom: 24px;
        }
        .hero .summary {
            font-size: 1rem;
            line-height: 1.7;
            opacity: 0.85;
            margin-bottom: 32px;
        }
        .hero-cta {
            display: inline-flex;
            gap: 16px;
            flex-wrap: wrap;
            justify-content: center;
        }
        .btn {
            padding: 14px 32px;
            border-radius: 50px;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        .btn-primary {
            background: white;
            color: #667eea;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .btn-secondary {
            background: transparent;
            color: white;
            border: 2px solid rgba(255,255,255,0.5);
        }
        .btn-secondary:hover {
            background: rgba(255,255,255,0.1);
        }
        
        /* Sections */
        section {
            padding: 80px 20px;
            background: white;
        }
        section:nth-child(even) {
            background: #f8fafc;
        }
        .section-title {
            font-size: 2rem;
            font-weight: 700;
            text-align: center;
            margin-bottom: 48px;
            color: #1a1a1a;
        }
        
        /* Skills */
        .skills-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            justify-content: center;
            max-width: 800px;
            margin: 0 auto;
        }
        .skill-tag {
            padding: 10px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        /* Experience */
        .experience-list {
            max-width: 800px;
            margin: 0 auto;
        }
        .experience-item {
            padding: 24px;
            background: white;
            border-radius: 16px;
            margin-bottom: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            border-left: 4px solid #667eea;
        }
        .experience-item h3 {
            font-size: 1.25rem;
            color: #1a1a1a;
            margin-bottom: 4px;
        }
        .experience-item .company {
            color: #667eea;
            font-weight: 500;
            margin-bottom: 8px;
        }
        .experience-item .dates {
            font-size: 0.85rem;
            color: #666;
            margin-bottom: 12px;
        }
        .experience-item p {
            color: #444;
            line-height: 1.6;
        }
        
        /* Projects */
        .projects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
            max-width: 1000px;
            margin: 0 auto;
        }
        .project-card {
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            transition: transform 0.3s ease;
        }
        .project-card:hover {
            transform: translateY(-4px);
        }
        .project-card .image {
            height: 180px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 3rem;
        }
        .project-card .content {
            padding: 20px;
        }
        .project-card h3 {
            margin-bottom: 8px;
            color: #1a1a1a;
        }
        .project-card p {
            color: #666;
            font-size: 0.9rem;
            line-height: 1.6;
        }
        
        /* Contact */
        .contact-section {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
        }
        .contact-section .section-title {
            color: white;
        }
        .contact-email {
            font-size: 1.5rem;
            margin-bottom: 32px;
        }
        .contact-email a {
            color: white;
            text-decoration: none;
            border-bottom: 2px solid rgba(255,255,255,0.5);
            padding-bottom: 4px;
        }
        
        /* Footer */
        footer {
            background: #1a1a1a;
            color: white;
            text-align: center;
            padding: 24px;
            font-size: 0.9rem;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <!-- Hero -->
    <section class="hero">
        <div class="hero-content">
            <h1>${name}</h1>
            <p class="headline">${headline}</p>
            <p class="summary">${summary}</p>
            <div class="hero-cta">
                <a href="#contact" class="btn btn-primary">Get in Touch</a>
                <a href="#projects" class="btn btn-secondary">View Work</a>
            </div>
        </div>
    </section>
    
    ${skills.length > 0 ? `
    <!-- Skills -->
    <section id="skills">
        <div class="container">
            <h2 class="section-title">Skills & Expertise</h2>
            <div class="skills-grid">
                ${skills.map((skill: any) => `<span class="skill-tag">${typeof skill === 'string' ? skill : skill.name}</span>`).join('\n                ')}
            </div>
        </div>
    </section>
    ` : ''}
    
    ${experience.length > 0 ? `
    <!-- Experience -->
    <section id="experience">
        <div class="container">
            <h2 class="section-title">Experience</h2>
            <div class="experience-list">
                ${experience.slice(0, 3).map((exp: any) => `
                <div class="experience-item">
                    <h3>${exp.title || exp.position || 'Position'}</h3>
                    <p class="company">${exp.company || 'Company'}</p>
                    <p class="dates">${exp.dates || exp.duration || ''}</p>
                    <p>${exp.description || ''}</p>
                </div>
                `).join('\n')}
            </div>
        </div>
    </section>
    ` : ''}
    
    ${projects.length > 0 ? `
    <!-- Projects -->
    <section id="projects">
        <div class="container">
            <h2 class="section-title">Featured Projects</h2>
            <div class="projects-grid">
                ${projects.slice(0, 3).map((proj: any, i: number) => `
                <div class="project-card">
                    <div class="image">🚀</div>
                    <div class="content">
                        <h3>${proj.name || proj.title || `Project ${i + 1}`}</h3>
                        <p>${proj.description || 'A great project showcasing my skills.'}</p>
                    </div>
                </div>
                `).join('\n')}
            </div>
        </div>
    </section>
    ` : ''}
    
    <!-- Contact -->
    <section id="contact" class="contact-section">
        <div class="container">
            <h2 class="section-title">Let's Connect</h2>
            <p class="contact-email">
                <a href="mailto:${email}">${email}</a>
            </p>
            <a href="mailto:${email}" class="btn btn-primary">Send Message</a>
        </div>
    </section>
    
    <!-- Footer -->
    <footer>
        <p>© ${new Date().getFullYear()} ${name}. Built with PortfolioBuilder.</p>
    </footer>
</body>
</html>`
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const portfolioId = params.id

        if (!portfolioId) {
            return NextResponse.json(
                { error: 'Missing portfolioId' },
                { status: 400 }
            )
        }

        const supabase = await createServerSupabaseClient()

        // Get portfolio with resume data
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

        // Check if portfolio has existing HTML content
        let html = (portfolio.content as any)?.html

        // If no HTML, generate mock based on resume data
        if (!html) {
            const resumeData = portfolio.resumes?.parsed_data || {}
            html = generateMockHtml(portfolio, resumeData)

            // Optionally save generated HTML back to portfolio
            await supabase
                .from('portfolios')
                .update({
                    content: { html },
                    updated_at: new Date().toISOString()
                })
                .eq('id', portfolioId)
        }

        return NextResponse.json({ html })

    } catch (error: any) {
        console.error('Preview error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to get preview' },
            { status: 500 }
        )
    }
}
