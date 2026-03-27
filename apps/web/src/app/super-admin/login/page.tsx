'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function SuperAdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.superAdminLogin(email, password)
      api.setToken(res.accessToken)
      localStorage.setItem('refreshToken', res.refreshToken)
      localStorage.setItem('superAdmin', JSON.stringify(res.user))
      router.push('/super-admin')
    } catch (err: any) {
      setError(err?.message || 'E-poçt və ya şifrə yanlışdır')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 50%, #C7D2FE 100%)' }}>
      {/* Sol — form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h1 className="text-[22px] font-extrabold" style={{ color: '#1E1B4B' }}>WorkFlow Pro</h1>
            <p className="text-[12px] font-medium mt-0.5" style={{ color: '#6366F1' }}>Super Admin Panel</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8" style={{ border: '1px solid rgba(99,102,241,0.1)' }}>
            <h2 className="text-[20px] font-bold text-gray-800 mb-1">Daxil olun</h2>
            <p className="text-[13px] text-gray-400 mb-6">Admin hesabınıza daxil olun</p>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[12px] font-medium">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[12px] font-semibold text-gray-600 mb-1.5 block">E-poçt</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@workflowpro.az" required
                  className="w-full px-4 py-3 rounded-xl text-[13px] border transition outline-none"
                  style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}
                  onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }} />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-gray-600 mb-1.5 block">Şifrə</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Şifrəniz" required
                    className="w-full px-4 py-3 rounded-xl text-[13px] border transition outline-none pr-10"
                    style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}
                    onFocus={e => { e.target.style.borderColor = '#6366F1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)' }}
                    onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-[13px] font-bold text-white transition-all hover:shadow-lg disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}>
                {loading ? 'Yüklənir...' : 'Daxil ol'}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-6">WorkFlow Pro SaaS Platform v1.0</p>
        </div>
      </div>

      {/* Sağ — dekorativ */}
      <div className="hidden lg:flex flex-1 items-center justify-center" style={{ background: 'linear-gradient(135deg, #312E81, #1E1B4B)' }}>
        <div className="text-center px-12">
          <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-6" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
          </div>
          <h2 className="text-[28px] font-extrabold text-white mb-3">Sistem İdarəetməsi</h2>
          <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(165,180,252,0.7)' }}>Bütün işletmələri, planları və sistem konfiqurasiyasını tək paneldən idarə edin.</p>
          <div className="flex justify-center gap-4 mt-8">
            {['12 İşletmə', '156 İstifadəçi', '1.2K Tapşırıq'].map(s => (
              <div key={s} className="px-4 py-2 rounded-xl text-[11px] font-bold" style={{ background: 'rgba(255,255,255,0.08)', color: '#A5B4FC' }}>{s}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
