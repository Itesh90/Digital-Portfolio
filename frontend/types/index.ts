/**
 * TypeScript Types
 * 
 * Type definitions matching the backend schemas.
 */

// =============================================================================
// USER TYPES
// =============================================================================

export interface User {
    id: string
    email: string
    name: string
    username: string | null
    plan: 'free' | 'pro' | 'enterprise'
    created_at: string
    onboarding_completed: boolean
}

export type UserPlan = 'free' | 'pro' | 'enterprise'

// =============================================================================
// ONBOARDING TYPES
// =============================================================================

export type PortfolioPurpose = 'hiring' | 'freelance' | 'academic' | 'creator'
export type SeniorityLevel = 'student' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive'

export interface DesignIntent {
    density: 'compact' | 'balanced' | 'spacious'
    personality: 'minimal' | 'professional' | 'bold'
    color_preference: 'neutral' | 'accent' | 'dark'
}

export interface OnboardingState {
    currentStep: number
    purpose: PortfolioPurpose | null
    resumeId: string | null
    resumeMode: 'upload' | 'scratch' | null
    confirmedRole: string
    confirmedSeniority: SeniorityLevel | null
    parsedData: ParsedResumeData | null
    isTruthConfirmed: boolean
    designIntent: DesignIntent | null
}

// Type alias for API compatibility
export type OnboardingData = OnboardingState

export interface TokenResponse {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
}

// =============================================================================
// RESUME TYPES
// =============================================================================

export interface PersonalInfo {
    name: string
    headline: string
    location: string
    email: string
    links: string[]
}

export interface ExperienceItem {
    role: string
    company: string
    duration: string
    bullets: string[]
}

export interface ProjectItem {
    name: string
    description: string
    tech: string[]
    link: string
}

export interface EducationItem {
    institution: string
    degree: string
    field: string
    duration: string
}

export interface ParsedResumeData {
    personal: PersonalInfo
    summary: string
    experience: ExperienceItem[]
    projects: ProjectItem[]
    skills: string[]
    education: EducationItem[]
    achievements: string[]
}

export interface InferredRole {
    primary_role: string
    seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'executive'
    portfolio_purpose: 'job_search' | 'freelance' | 'consulting' | 'showcase'
}

export interface Resume {
    id: string
    original_filename: string
    status: 'pending' | 'parsing' | 'parsed' | 'validated' | 'failed'
    parsed_data: ParsedResumeData | null
    inferred_role: InferredRole | null
    created_at: string
    error_message: string | null
}

export interface ResumeUploadResponse {
    id: string
    filename: string
    status: string
    message: string
}

// =============================================================================
// PORTFOLIO TYPES
// =============================================================================

export interface PortfolioBlueprint {
    pages: string[]
    section_priority: Record<string, 'high' | 'medium' | 'low'>
    tone: 'professional' | 'creative' | 'technical' | 'executive'
    content_length: 'concise' | 'standard' | 'detailed'
}

export interface PortfolioContent {
    hero: {
        headline: string
        subheadline: string
        cta_text: string
    }
    about: {
        title: string
        content: string
        highlights: string[]
    }
    experience: {
        role: string
        company: string
        duration: string
        description: string
        achievements: string[]
    }[]
    projects: {
        name: string
        description: string
        tech: string[]
        link: string
    }[]
    skills: string[]
    education: {
        institution: string
        degree: string
        field: string
        duration: string
    }[]
    achievements: string[]
    contact: {
        email: string
        location: string
        links: string[]
    }
}

export interface DesignConfig {
    layout: 'single-column' | 'sidebar-left' | 'sidebar-right' | 'grid'
    font_set: 'modern-sans' | 'classic-serif' | 'technical' | 'creative'
    palette: 'neutral-accent' | 'dark-mode' | 'warm-minimal' | 'tech-blue' | 'ocean-breeze' | 'forest-green'
    spacing: 'compact' | 'comfortable' | 'spacious'
    border_radius: 'none' | 'subtle' | 'rounded' | 'pill'
    shadows: 'none' | 'subtle' | 'medium' | 'strong'
}

export interface Portfolio {
    id: string
    name: string
    status: 'draft' | 'published'
    resume_id: string | null
    published_url: string | null
    blueprint: PortfolioBlueprint | null
    content: PortfolioContent | null
    design_config: DesignConfig | null
    created_at: string
    updated_at: string
}

export interface PortfolioVersion {
    id: string
    version_number: number
    created_at: string
}

export interface ATSCheckResult {
    score: number
    keyword_coverage: number
    bullet_clarity: number
    readability_score: number
    section_completeness: Record<string, boolean>
    suggestions: string[]
    passed: boolean
}

export interface SectionEditRequest {
    section_type: string
    current_content: Record<string, unknown>
    instruction: string
}

export interface SectionEditResponse {
    section_type: string
    updated_content: Record<string, unknown>
    changes_made: string[]
}

// =============================================================================
// PUBLISHING TYPES
// =============================================================================

export interface PublishRequest {
    subdomain: string
    custom_domain?: string
}

export interface PublishResponse {
    portfolio_id: string
    subdomain: string
    url: string
    custom_domain: string | null
    published_at: string
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiError {
    detail: string
}

export interface PaginatedResponse<T> {
    items: T[]
    total: number
    page: number
    page_size: number
}
