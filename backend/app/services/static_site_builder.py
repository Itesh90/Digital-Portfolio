"""
Static Site Builder Service

Generates and deploys static portfolio sites.
"""

from typing import Any, Dict
import json

from app.models.portfolio import Portfolio
from app.schemas.design import DesignConfig, DESIGN_PRIMITIVES


class StaticSiteBuilder:
    """
    Service for building and deploying static portfolio sites.
    
    Generates HTML/CSS from portfolio content and design configuration,
    then deploys to static hosting.
    """
    
    async def build_and_deploy(
        self,
        portfolio: Portfolio,
        subdomain: str,
    ) -> str:
        """
        Build and deploy a portfolio as a static site.
        
        Args:
            portfolio: Portfolio with content and design config
            subdomain: Subdomain for the site
            
        Returns:
            URL of the deployed site
        """
        # Generate static files
        html = await self._generate_html(portfolio)
        css = await self._generate_css(portfolio)
        
        # TODO: Deploy to Cloudflare Pages or similar
        # For now, return a placeholder URL
        
        return f"https://{subdomain}.portfoliobuilder.app"
    
    async def render_preview(self, portfolio: Portfolio) -> str:
        """
        Render portfolio as HTML for preview.
        
        Args:
            portfolio: Portfolio to render
            
        Returns:
            Complete HTML string
        """
        html = await self._generate_html(portfolio)
        return html
    
    async def _generate_html(self, portfolio: Portfolio) -> str:
        """Generate complete HTML document for portfolio."""
        content = portfolio.content or {}
        design = DesignConfig.model_validate(portfolio.design_config or {})
        css_vars = design.get_css_variables()
        
        # Build CSS variables string
        css_vars_str = "\n".join(
            f"        {key}: {value};" 
            for key, value in css_vars.items()
        )
        
        # Get font import
        fonts = DESIGN_PRIMITIVES["font_sets"][design.font_set]
        font_import = self._get_font_import(fonts)
        
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{self._escape(content.get('hero', {}).get('headline', 'Portfolio'))}</title>
    <meta name="description" content="{self._escape(content.get('about', {}).get('content', '')[:160])}">
    {font_import}
    <style>
        :root {{
{css_vars_str}
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: var(--font-body), system-ui, sans-serif;
            font-weight: var(--font-weight-body);
            background-color: var(--color-background);
            color: var(--color-text);
            line-height: 1.6;
        }}
        
        h1, h2, h3, h4, h5, h6 {{
            font-family: var(--font-heading), system-ui, sans-serif;
            font-weight: var(--font-weight-heading);
            line-height: 1.2;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 var(--spacing-padding);
        }}
        
        section {{
            padding: var(--spacing-section) 0;
        }}
        
        .hero {{
            min-height: 80vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-background) 100%);
        }}
        
        .hero h1 {{
            font-size: clamp(2.5rem, 5vw, 4rem);
            margin-bottom: 1rem;
            color: var(--color-primary);
        }}
        
        .hero .subheadline {{
            font-size: clamp(1.1rem, 2vw, 1.5rem);
            color: var(--color-text-secondary);
            margin-bottom: 2rem;
            max-width: 600px;
        }}
        
        .cta-button {{
            display: inline-block;
            padding: 1rem 2rem;
            background-color: var(--color-accent);
            color: white;
            text-decoration: none;
            border-radius: var(--border-radius);
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        
        .cta-button:hover {{
            transform: translateY(-2px);
            box-shadow: var(--shadow);
        }}
        
        .section-title {{
            font-size: 2rem;
            margin-bottom: var(--spacing-element);
            color: var(--color-primary);
        }}
        
        .about-content {{
            max-width: 800px;
            font-size: 1.1rem;
        }}
        
        .highlights {{
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            margin-top: var(--spacing-element);
        }}
        
        .highlight {{
            background: var(--color-surface);
            padding: 0.75rem 1.25rem;
            border-radius: var(--border-radius);
            border-left: 3px solid var(--color-accent);
        }}
        
        .experience-item {{
            background: var(--color-surface);
            padding: var(--spacing-padding);
            border-radius: var(--border-radius);
            margin-bottom: var(--spacing-element);
            box-shadow: var(--shadow);
        }}
        
        .experience-header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }}
        
        .experience-role {{
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--color-primary);
        }}
        
        .experience-company {{
            color: var(--color-accent);
        }}
        
        .experience-duration {{
            color: var(--color-text-secondary);
            font-size: 0.9rem;
        }}
        
        .experience-achievements {{
            list-style: none;
            padding: 0;
        }}
        
        .experience-achievements li {{
            padding: 0.5rem 0;
            padding-left: 1.5rem;
            position: relative;
        }}
        
        .experience-achievements li::before {{
            content: "→";
            position: absolute;
            left: 0;
            color: var(--color-accent);
        }}
        
        .projects-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: var(--spacing-element);
        }}
        
        .project-card {{
            background: var(--color-surface);
            padding: var(--spacing-padding);
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
        }}
        
        .project-name {{
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--color-primary);
            margin-bottom: 0.5rem;
        }}
        
        .project-tech {{
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 1rem;
        }}
        
        .tech-tag {{
            background: var(--color-accent);
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.85rem;
        }}
        
        .skills-grid {{
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
        }}
        
        .skill-tag {{
            background: var(--color-surface);
            padding: 0.5rem 1rem;
            border-radius: var(--border-radius);
            border: 1px solid var(--color-accent);
        }}
        
        .contact {{
            background: var(--color-surface);
        }}
        
        .contact-info {{
            display: flex;
            flex-wrap: wrap;
            gap: 2rem;
        }}
        
        .contact-item {{
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}
        
        .contact-item a {{
            color: var(--color-accent);
            text-decoration: none;
        }}
        
        .contact-item a:hover {{
            text-decoration: underline;
        }}
        
        @media (max-width: 768px) {{
            .experience-header {{
                flex-direction: column;
            }}
        }}
    </style>
</head>
<body>
    {self._render_hero(content.get('hero', {}))}
    {self._render_about(content.get('about', {}))}
    {self._render_experience(content.get('experience', []))}
    {self._render_projects(content.get('projects', []))}
    {self._render_skills(content.get('skills', []))}
    {self._render_contact(content.get('contact', {}))}
</body>
</html>"""
        
        return html
    
    def _get_font_import(self, fonts: Dict[str, Any]) -> str:
        """Generate Google Fonts import link."""
        font_families = set([fonts.get("heading", "Inter"), fonts.get("body", "Inter")])
        families_str = "|".join(f.replace(" ", "+") for f in font_families)
        return f'<link href="https://fonts.googleapis.com/css2?family={families_str}:wght@400;600;700&display=swap" rel="stylesheet">'
    
    def _escape(self, text: str) -> str:
        """Escape HTML special characters."""
        if not text:
            return ""
        return (text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&#x27;"))
    
    def _render_hero(self, hero: Dict[str, Any]) -> str:
        """Render hero section."""
        headline = self._escape(hero.get("headline", "Welcome"))
        subheadline = self._escape(hero.get("subheadline", ""))
        cta = self._escape(hero.get("cta_text", "Get in Touch"))
        
        return f"""
    <section class="hero">
        <div class="container">
            <h1>{headline}</h1>
            <p class="subheadline">{subheadline}</p>
            <a href="#contact" class="cta-button">{cta}</a>
        </div>
    </section>"""
    
    def _render_about(self, about: Dict[str, Any]) -> str:
        """Render about section."""
        if not about:
            return ""
        
        title = self._escape(about.get("title", "About Me"))
        content = self._escape(about.get("content", ""))
        highlights = about.get("highlights", [])
        
        highlights_html = ""
        if highlights:
            highlights_html = '<div class="highlights">'
            for h in highlights:
                highlights_html += f'<div class="highlight">{self._escape(h)}</div>'
            highlights_html += '</div>'
        
        return f"""
    <section id="about">
        <div class="container">
            <h2 class="section-title">{title}</h2>
            <div class="about-content">
                <p>{content}</p>
                {highlights_html}
            </div>
        </div>
    </section>"""
    
    def _render_experience(self, experience: list) -> str:
        """Render experience section."""
        if not experience:
            return ""
        
        items_html = ""
        for exp in experience:
            role = self._escape(exp.get("role", ""))
            company = self._escape(exp.get("company", ""))
            duration = self._escape(exp.get("duration", ""))
            achievements = exp.get("achievements", [])
            
            achievements_html = ""
            if achievements:
                achievements_html = '<ul class="experience-achievements">'
                for a in achievements:
                    achievements_html += f'<li>{self._escape(a)}</li>'
                achievements_html += '</ul>'
            
            items_html += f"""
            <div class="experience-item">
                <div class="experience-header">
                    <div>
                        <div class="experience-role">{role}</div>
                        <div class="experience-company">{company}</div>
                    </div>
                    <div class="experience-duration">{duration}</div>
                </div>
                {achievements_html}
            </div>"""
        
        return f"""
    <section id="experience">
        <div class="container">
            <h2 class="section-title">Experience</h2>
            {items_html}
        </div>
    </section>"""
    
    def _render_projects(self, projects: list) -> str:
        """Render projects section."""
        if not projects:
            return ""
        
        cards_html = ""
        for proj in projects:
            name = self._escape(proj.get("name", ""))
            description = self._escape(proj.get("description", ""))
            tech = proj.get("tech", [])
            
            tech_html = ""
            if tech:
                tech_html = '<div class="project-tech">'
                for t in tech:
                    tech_html += f'<span class="tech-tag">{self._escape(t)}</span>'
                tech_html += '</div>'
            
            cards_html += f"""
            <div class="project-card">
                <div class="project-name">{name}</div>
                <p>{description}</p>
                {tech_html}
            </div>"""
        
        return f"""
    <section id="projects">
        <div class="container">
            <h2 class="section-title">Projects</h2>
            <div class="projects-grid">
                {cards_html}
            </div>
        </div>
    </section>"""
    
    def _render_skills(self, skills: list) -> str:
        """Render skills section."""
        if not skills:
            return ""
        
        skills_html = ""
        for skill in skills:
            skills_html += f'<span class="skill-tag">{self._escape(skill)}</span>'
        
        return f"""
    <section id="skills">
        <div class="container">
            <h2 class="section-title">Skills</h2>
            <div class="skills-grid">
                {skills_html}
            </div>
        </div>
    </section>"""
    
    def _render_contact(self, contact: Dict[str, Any]) -> str:
        """Render contact section."""
        email = self._escape(contact.get("email", ""))
        location = self._escape(contact.get("location", ""))
        links = contact.get("links", [])
        
        info_html = ""
        if email:
            info_html += f'<div class="contact-item"><span>📧</span><a href="mailto:{email}">{email}</a></div>'
        if location:
            info_html += f'<div class="contact-item"><span>📍</span><span>{location}</span></div>'
        for link in links:
            escaped_link = self._escape(link)
            info_html += f'<div class="contact-item"><span>🔗</span><a href="{escaped_link}" target="_blank">{escaped_link}</a></div>'
        
        return f"""
    <section id="contact" class="contact">
        <div class="container">
            <h2 class="section-title">Contact</h2>
            <div class="contact-info">
                {info_html}
            </div>
        </div>
    </section>"""
    
    async def _generate_css(self, portfolio: Portfolio) -> str:
        """Generate standalone CSS file (if needed)."""
        # CSS is currently embedded in HTML
        return ""
