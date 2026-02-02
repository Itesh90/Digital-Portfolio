/**
 * API Client
 * 
 * Centralized API communication with the backend.
 */

import axios, { AxiosInstance, AxiosError } from 'axios'
import type {
    User,
    TokenResponse,
    Resume,
    ResumeUploadResponse,
    Portfolio,
    PortfolioBlueprint,
    DesignConfig,
    ATSCheckResult,
    SectionEditRequest,
    SectionEditResponse,
    PublishRequest,
    PublishResponse,
    PortfolioVersion,
    ApiError,
    DesignIntent,
} from '@/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

class ApiClient {
    private client: AxiosInstance
    private accessToken: string | null = null

    constructor() {
        this.client = axios.create({
            baseURL: `${API_BASE_URL}/api`,
            headers: {
                'Content-Type': 'application/json',
            },
        })

        // Request interceptor for auth
        this.client.interceptors.request.use((config) => {
            if (this.accessToken) {
                config.headers.Authorization = `Bearer ${this.accessToken}`
            }
            return config
        })

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            this.handleError.bind(this)
        )
    }

    setAccessToken(token: string | null) {
        this.accessToken = token
    }

    private async handleError(error: AxiosError<ApiError>) {
        if (error.response?.status === 401) {
            // Token expired, try to refresh
            // TODO: Implement token refresh logic
            this.accessToken = null
        }
        throw error
    }

    // =========================================================================
    // AUTH
    // =========================================================================

    async register(email: string, password: string, name: string): Promise<User> {
        const { data } = await this.client.post<User>('/auth/register', {
            email,
            password,
            name,
        })
        return data
    }

    async login(email: string, password: string): Promise<TokenResponse> {
        const formData = new FormData()
        formData.append('username', email)
        formData.append('password', password)

        const { data } = await this.client.post<TokenResponse>('/auth/login', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        this.setAccessToken(data.access_token)
        return data
    }

    async refreshToken(refreshToken: string): Promise<TokenResponse> {
        const { data } = await this.client.post<TokenResponse>('/auth/refresh', null, {
            params: { refresh_token: refreshToken },
        })
        this.setAccessToken(data.access_token)
        return data
    }

    async getMe(): Promise<User> {
        const { data } = await this.client.get<User>('/auth/me')
        return data
    }

    // =========================================================================
    // RESUMES
    // =========================================================================

    async uploadResume(file: File): Promise<ResumeUploadResponse> {
        const formData = new FormData()
        formData.append('file', file)

        const { data } = await this.client.post<ResumeUploadResponse>('/resumes/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data
    }

    async createEmptyResume(): Promise<ResumeUploadResponse> {
        const { data } = await this.client.post<ResumeUploadResponse>('/resumes/empty')
        return data
    }

    async getResumes(): Promise<Resume[]> {
        const { data } = await this.client.get<Resume[]>('/resumes')
        return data
    }

    async getResume(id: string): Promise<Resume> {
        const { data } = await this.client.get<Resume>(`/resumes/${id}`)
        return data
    }

    async parseResume(id: string): Promise<Resume> {
        const { data } = await this.client.post<Resume>(`/resumes/${id}/parse`)
        return data
    }

    async validateResume(id: string): Promise<Resume> {
        const { data } = await this.client.post<Resume>(`/resumes/${id}/validate`)
        return data
    }

    async confirmResume(
        id: string,
        parsedData: Record<string, unknown>,
        roleInfo?: { primary_role: string, seniority: string, portfolio_purpose: string }
    ): Promise<Resume> {
        const payload: any = { parsed_data: parsedData }
        if (roleInfo) {
            payload.inferred_role = roleInfo
        }

        const { data } = await this.client.post<Resume>(`/resumes/${id}/confirm`, payload)
        return data
    }

    async deleteResume(id: string): Promise<void> {
        await this.client.delete(`/resumes/${id}`)
    }

    // =========================================================================
    // PORTFOLIOS
    // =========================================================================

    async createPortfolio(resumeId: string, name?: string): Promise<Portfolio> {
        const { data } = await this.client.post<Portfolio>('/portfolios', {
            resume_id: resumeId,
            name,
        })
        return data
    }

    async getPortfolios(): Promise<Portfolio[]> {
        const { data } = await this.client.get<Portfolio[]>('/portfolios')
        return data
    }

    async getPortfolio(id: string): Promise<Portfolio> {
        const { data } = await this.client.get<Portfolio>(`/portfolios/${id}`)
        return data
    }

    async generateBlueprint(id: string): Promise<Portfolio> {
        const { data } = await this.client.post<Portfolio>(`/portfolios/${id}/blueprint`)
        return data
    }

    async updateDesign(id: string, config: DesignConfig): Promise<Portfolio> {
        const { data } = await this.client.patch<Portfolio>(`/portfolios/${id}/design`, config)
        return data
    }

    async applyDesignIntent(id: string, intent: DesignIntent): Promise<Portfolio> {
        const { data } = await this.client.post<Portfolio>(`/portfolios/${id}/design/intent`, intent)
        return data
    }

    async suggestDesign(id: string): Promise<DesignConfig> {
        const { data } = await this.client.post<DesignConfig>(`/portfolios/${id}/design/suggest`)
        return data
    }

    async editSection(id: string, sectionType: string, request: SectionEditRequest): Promise<SectionEditResponse> {
        const { data } = await this.client.patch<SectionEditResponse>(
            `/portfolios/${id}/sections/${sectionType}`,
            request
        )
        return data
    }

    async checkATS(id: string): Promise<ATSCheckResult> {
        const { data } = await this.client.post<ATSCheckResult>(`/portfolios/${id}/ats-check`)
        return data
    }

    async getVersions(id: string): Promise<PortfolioVersion[]> {
        const { data } = await this.client.get<PortfolioVersion[]>(`/portfolios/${id}/versions`)
        return data
    }

    async restoreVersion(portfolioId: string, versionId: string): Promise<Portfolio> {
        const { data } = await this.client.post<Portfolio>(
            `/portfolios/${portfolioId}/restore/${versionId}`
        )
        return data
    }

    async deletePortfolio(id: string): Promise<void> {
        await this.client.delete(`/portfolios/${id}`)
    }

    // =========================================================================
    // PUBLISHING
    // =========================================================================

    async publishPortfolio(id: string, request: PublishRequest): Promise<PublishResponse> {
        const { data } = await this.client.post<PublishResponse>(`/publish/${id}`, request)
        return data
    }

    async unpublishPortfolio(id: string): Promise<void> {
        await this.client.post(`/publish/${id}/unpublish`)
    }

    async getPreview(id: string): Promise<{ html: string }> {
        const { data } = await this.client.get<{ html: string }>(`/publish/${id}/preview`)
        return data
    }
}

export const api = new ApiClient()
export default api
