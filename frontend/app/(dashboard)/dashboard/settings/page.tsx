'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    User, Camera, Globe, Lock, Mail, AlertTriangle,
    Loader2, Check, Eye, EyeOff, Trash2, LogOut
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { User as UserType } from '@/types'

export default function SettingsPage() {
    const router = useRouter()
    const [user, setUser] = useState<UserType | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Profile Settings
    const [name, setName] = useState('')
    const [username, setUsername] = useState('')

    // Password Change
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Danger Zone
    const [deleteConfirm, setDeleteConfirm] = useState('')
    const [deletingAccount, setDeletingAccount] = useState(false)

    useEffect(() => {
        api.getMe()
            .then((u) => {
                if (u) {
                    setUser(u)
                    setName(u.name || '')
                    setUsername(u.username || '')
                }
            })
            .finally(() => setLoading(false))
    }, [])

    const handleSaveProfile = async () => {
        setSaving(true)
        try {
            // In a real app, this would call api.updateProfile({name, username})
            toast.success('Profile updated successfully')
        } catch (err) {
            toast.error('Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword) {
            toast.error('Please fill in both password fields')
            return
        }
        if (newPassword.length < 8) {
            toast.error('New password must be at least 8 characters')
            return
        }

        setSaving(true)
        try {
            // In a real app: api.changePassword(currentPassword, newPassword)
            toast.success('Password changed successfully')
            setCurrentPassword('')
            setNewPassword('')
        } catch (err) {
            toast.error('Failed to change password')
        } finally {
            setSaving(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        api.setAccessToken(null)
        toast.success('Logged out successfully')
        router.push('/')
    }

    const handleDeleteAccount = async () => {
        if (deleteConfirm !== 'DELETE') {
            toast.error('Please type DELETE to confirm')
            return
        }

        setDeletingAccount(true)
        try {
            // In a real app: api.deleteAccount()
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            toast.success('Account deleted')
            router.push('/')
        } catch (err) {
            toast.error('Failed to delete account')
            setDeletingAccount(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#9B3DDB] animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold text-[#1a1a1a] mb-8">Settings</h1>

            {/* ===== PROFILE SETTINGS ===== */}
            <section className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-400" />
                    Profile Settings
                </h2>

                <div className="space-y-4">
                    {/* Profile Photo */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-[#9B3DDB]/10 rounded-full flex items-center justify-center text-[#9B3DDB] font-bold text-xl">
                            {name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                            <Camera className="w-4 h-4" />
                            Change Photo
                        </button>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9B3DDB]/20 focus:border-[#9B3DDB]/50 transition"
                            placeholder="Your full name"
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username / Portfolio URL</label>
                        <div className="flex items-center">
                            <span className="px-3 py-2 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-gray-500 text-sm">
                                tablo.io/
                            </span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-r-lg focus:ring-2 focus:ring-[#9B3DDB]/20 focus:border-[#9B3DDB]/50 transition"
                                placeholder="yourname"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </section>

            {/* ===== PORTFOLIO SETTINGS ===== */}
            <section className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-gray-400" />
                    Portfolio Settings
                </h2>

                <div className="space-y-4">
                    {/* Default Visibility */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default Portfolio Visibility</label>
                        <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9B3DDB]/20 focus:border-[#9B3DDB]/50 transition">
                            <option value="public">Public - Visible to everyone</option>
                            <option value="private">Private - Only visible to you</option>
                        </select>
                    </div>

                    {/* SEO Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default SEO Title</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9B3DDB]/20 focus:border-[#9B3DDB]/50 transition"
                            placeholder="e.g., John Doe - Software Engineer"
                        />
                    </div>

                    {/* SEO Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Default SEO Description</label>
                        <textarea
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9B3DDB]/20 focus:border-[#9B3DDB]/50 transition resize-none"
                            rows={2}
                            placeholder="A brief description for search engines..."
                        />
                    </div>
                </div>
            </section>

            {/* ===== ACCOUNT SETTINGS ===== */}
            <section className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
                <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-gray-400" />
                    Account Settings
                </h2>

                <div className="space-y-4">
                    {/* Email (read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
                            />
                            <Mail className="w-5 h-5 text-gray-400" />
                        </div>
                    </div>

                    {/* Change Password */}
                    <div className="border-t border-gray-100 pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Change Password</label>
                        <div className="space-y-3">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9B3DDB]/20 focus:border-[#9B3DDB]/50 transition"
                                placeholder="Current password"
                            />
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#9B3DDB]/20 focus:border-[#9B3DDB]/50 transition"
                                    placeholder="New password (min 8 characters)"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <button
                                onClick={handleChangePassword}
                                disabled={!currentPassword || !newPassword || saving}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition disabled:opacity-50"
                            >
                                Update Password
                            </button>
                        </div>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 pt-4">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg text-sm font-medium transition"
                        >
                            <LogOut className="w-4 h-4" />
                            Log out of this device
                        </button>
                    </div>
                </div>
            </section>

            {/* ===== DANGER ZONE ===== */}
            <section className="bg-red-50 rounded-xl border border-red-200 p-6">
                <h2 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Danger Zone
                </h2>

                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-red-800 mb-3">
                            Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <input
                            type="text"
                            value={deleteConfirm}
                            onChange={(e) => setDeleteConfirm(e.target.value)}
                            className="w-full px-4 py-2 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-300 transition mb-3"
                            placeholder="Type DELETE to confirm"
                        />
                        <button
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirm !== 'DELETE' || deletingAccount}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {deletingAccount ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            Delete Account
                        </button>
                    </div>
                </div>
            </section>
        </div>
    )
}
