import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'

export async function POST(request: NextRequest) {
    try {
        const { portfolioId, html } = await request.json()

        if (!html) {
            return NextResponse.json(
                { error: 'No HTML content provided' },
                { status: 400 }
            )
        }

        // Create ZIP file
        const zip = new JSZip()

        // Add main HTML file
        zip.file('index.html', html)

        // Add README
        zip.file('README.md', `# Portfolio

This portfolio was generated with Tablo.

## How to use

1. Open \`index.html\` in your browser
2. Or deploy to any static hosting service (Vercel, Netlify, GitHub Pages)

## Customization

Edit \`index.html\` to make changes to your portfolio.
`)

        // Generate ZIP
        const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        })

        // Convert to buffer for response
        const buffer = await zipBlob.arrayBuffer()

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="portfolio-${portfolioId || 'export'}.zip"`
            }
        })

    } catch (error: any) {
        console.error('Export error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to export' },
            { status: 500 }
        )
    }
}
