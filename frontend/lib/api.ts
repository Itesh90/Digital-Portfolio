import { supabase } from './supabase'
import type { User, Resume, Portfolio, OnboardingData } from '@/types'

// =============================================================================
// AUTH
// =============================================================================

export const auth = {
    async getCurrentUser(): Promise<User | null> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        if (!profile) return null

        return {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            username: profile.username,
            plan: profile.plan,
            onboarding_completed: profile.onboarding_completed,
            created_at: profile.created_at,
        }
    },

    async signOut() {
        await supabase.auth.signOut()
    },

    async updateProfile(data: Partial<User>) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { error } = await supabase
            .from('profiles')
            .update(data)
            .eq('id', user.id)

        if (error) throw error
    },

    async completeOnboarding(onboardingData: OnboardingData) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { error } = await supabase
            .from('profiles')
            .update({
                onboarding_completed: true,
                onboarding_data: onboardingData,
            })
            .eq('id', user.id)

        if (error) throw error
    },
}

// =============================================================================
// RESUMES
// =============================================================================

export const resumes = {
    async list(): Promise<Resume[]> {
        const { data, error } = await supabase
            .from('resumes')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return data || []
    },

    async get(id: string): Promise<Resume> {
        const { data, error } = await supabase
            .from('resumes')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    },

    async upload(file: File): Promise<Resume> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        // Upload file to storage
        const fileName = `${user.id}/${Date.now()}_${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('resumes')
            .upload(fileName, file)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('resumes')
            .getPublicUrl(fileName)

        // Create resume record
        const { data, error } = await supabase
            .from('resumes')
            .insert({
                user_id: user.id,
                filename: file.name,
                file_url: publicUrl,
                file_type: file.type,
                status: 'pending',
            })
            .select()
            .single()

        if (error) throw error
        return data
    },

    async createEmpty(): Promise<Resume> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data, error } = await supabase
            .from('resumes')
            .insert({
                user_id: user.id,
                filename: 'Prompt-based Resume',
                status: 'validated',
            })
            .select()
            .single()

        if (error) throw error
        return data
    },

    async parse(id: string): Promise<Resume> {
        // Call local API route for AI parsing
        const response = await fetch('/api/resumes/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeId: id })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to parse resume')
        }

        const data = await response.json()
        return data.resume
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('resumes')
            .delete()
            .eq('id', id)

        if (error) throw error
    },
}

// =============================================================================
// PORTFOLIOS
// =============================================================================

export const portfolios = {
    async list(): Promise<Portfolio[]> {
        const { data, error } = await supabase
            .from('portfolios')
            .select('*')
            .order('updated_at', { ascending: false })

        if (error) throw error
        return data || []
    },

    async get(id: string): Promise<Portfolio> {
        const { data, error } = await supabase
            .from('portfolios')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return data
    },

    async create(data: { name: string; resume_id?: string }): Promise<Portfolio> {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        const { data: portfolio, error } = await supabase
            .from('portfolios')
            .insert({
                user_id: user.id,
                name: data.name,
                resume_id: data.resume_id || null,
                status: 'draft',
            })
            .select()
            .single()

        if (error) throw error
        return portfolio
    },

    async update(id: string, data: Partial<Portfolio>): Promise<Portfolio> {
        const { data: portfolio, error } = await supabase
            .from('portfolios')
            .update({
                ...data,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return portfolio
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('portfolios')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    async generateBlueprint(id: string, resumeData?: any, designConfig?: any): Promise<Portfolio> {
        // Call Edge Function for AI blueprint generation
        const { data, error } = await supabase.functions.invoke('generate-blueprint', {
            body: { portfolioId: id, resumeData, designConfig }
        })

        if (error) throw error
        return data.portfolio
    },

    async build(id: string): Promise<Portfolio> {
        // Call Edge Function for portfolio building
        const { data, error } = await supabase.functions.invoke('build-portfolio', {
            body: { portfolioId: id }
        })

        if (error) throw error
        return data.portfolio
    },
}

// =============================================================================
// LEGACY API COMPATIBILITY LAYER
// =============================================================================

export const api = {
    // Legacy auth methods (Supabase handles auth via cookies now)
    setAccessToken: (_token: string | null) => {
        // No-op: Supabase uses cookie-based auth
    },
    getMe: auth.getCurrentUser,
    getCurrentUser: auth.getCurrentUser,
    logout: auth.signOut,
    updateProfile: auth.updateProfile,
    completeOnboarding: auth.completeOnboarding,

    // Resumes
    getResumes: resumes.list,
    getResume: resumes.get,
    uploadResume: resumes.upload,
    createEmptyResume: resumes.createEmpty,
    parseResume: resumes.parse,
    deleteResume: resumes.delete,

    // Legacy resume validation (now handled by parse)
    async validateResume(resumeId: string): Promise<Resume> {
        // Call parse which now validates too
        return resumes.parse(resumeId)
    },

    // Legacy confirm resume method
    async confirmResume(resumeId: string, parsedData: any, roleInfo?: any): Promise<Resume> {
        // Update resume with confirmed data
        const { data, error } = await supabase
            .from('resumes')
            .update({
                parsed_data: parsedData,
                inferred_role: roleInfo || null,
                status: 'validated'
            })
            .eq('id', resumeId)
            .select()
            .single()

        if (error) throw error
        return data
    },

    // Portfolios
    getPortfolios: portfolios.list,
    getPortfolio: portfolios.get,

    // Support both old and new createPortfolio signatures
    async createPortfolio(nameOrData: string | { name: string; resume_id?: string }, resumeId?: string): Promise<Portfolio> {
        if (typeof nameOrData === 'string') {
            return portfolios.create({ name: nameOrData, resume_id: resumeId })
        }
        return portfolios.create(nameOrData)
    },

    updatePortfolio: portfolios.update,
    deletePortfolio: portfolios.delete,
    generateBlueprint: portfolios.generateBlueprint,
    buildPortfolio: portfolios.build,

    // Legacy design intent method
    async applyDesignIntent(portfolioId: string, designConfig: any): Promise<Portfolio> {
        return portfolios.update(portfolioId, { design_config: designConfig })
    },

    // Preview - now uses API route with fallback generation
    async getPreview(portfolioId: string): Promise<{ html: string }> {
        try {
            const response = await fetch(`/api/builder/preview/${portfolioId}`)
            if (response.ok) {
                return await response.json()
            }
        } catch (e) {
            console.warn('Preview API failed, falling back to direct fetch')
        }

        // Fallback to direct portfolio fetch
        const portfolio = await portfolios.get(portfolioId)
        const content = portfolio.content as { html?: string } | null
        return { html: content?.html || '' }
    },
}

