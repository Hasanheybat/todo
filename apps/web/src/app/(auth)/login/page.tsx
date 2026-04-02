'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true); setError('')
    try { await login(email, password); router.push('/dashboard') }
    catch (err: any) { setError(err.message || 'Giriş xətası') }
    finally { setLoading(false) }
  }

  return (
    <>
      {/* Mobil logo */}
      <div className="lg:hidden text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3" style={{ background: 'linear-gradient(135deg, #4F46E5, #818CF8)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#4F46E5' }}>FocusFlow</h1>
      </div>

      <h2 className="text-[22px] font-bold" style={{ color: '#0F172A' }}>Daxil olun</h2>
      <p className="mt-1 text-[14px]" style={{ color: '#94A3B8' }}>Hesabınıza daxil olun</p>

      {error && (
        <div className="mt-4 rounded-[10px] px-4 py-3 text-[13px] flex items-center gap-2" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#0F172A' }}>E-poçt</label>
          <input
            type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder="sizin@email.com"
            className="w-full rounded-[10px] border-[1.5px] px-4 py-3 text-[13px] outline-none transition"
            style={{ borderColor: '#E2E8F0', backgroundColor: '#fff', color: '#0F172A' }}
            onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)' }}
            onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#0F172A' }}>Şifrə</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'} value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Şifrəniz"
              className="w-full rounded-[10px] border-[1.5px] px-4 py-3 pr-11 text-[13px] outline-none transition"
              style={{ borderColor: '#E2E8F0', backgroundColor: '#fff', color: '#0F172A' }}
              onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)' }}
              onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }}
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showPw ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
              </svg>
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" className="text-[11px] font-semibold" style={{ color: '#4F46E5' }}>Şifrəni unutdum?</button>
        </div>

        <button type="submit" disabled={loading}
          className="w-full rounded-[10px] py-3 text-[14px] font-bold text-white transition disabled:opacity-50 hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #818CF8)', boxShadow: '0 4px 14px rgba(79,70,229,0.25)' }}>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Gözləyin...
            </span>
          ) : 'Daxil ol'}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px]" style={{ color: '#94A3B8' }}>
        Hesabınız yoxdur? <Link href="/register" className="font-semibold" style={{ color: '#4F46E5' }}>Qeydiyyat</Link>
      </p>

      {/* ═══ Sürətli giriş — test istifadəçiləri ═══ */}
      {process.env.NODE_ENV === 'development' && <div className="mt-8 pt-6" style={{ borderTop: '1px solid #E2E8F0' }}>
        <p className="text-center text-[11px] font-semibold mb-3" style={{ color: '#94A3B8' }}>Sürətli giriş</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: 'Həsən', email: 'hasan@techflow.az', color: '#4F46E5', role: 'Sahibi' },
            { name: 'Leyla', email: 'leyla@techflow.az', color: '#10B981', role: 'Müdir/Bakı' },
            { name: 'Aynur', email: 'aynur@techflow.az', color: '#F59E0B', role: 'Müdir/Gəncə' },
            { name: 'Tural', email: 'tural@techflow.az', color: '#3B82F6', role: 'Lider/Bakı' },
            { name: 'Kamran', email: 'kamran@techflow.az', color: '#8B5CF6', role: 'Lider/Gəncə' },
            { name: 'Nigar', email: 'nigar@techflow.az', color: '#059669', role: 'İşçi/Bakı' },
            { name: 'Rəşad', email: 'rashad@techflow.az', color: '#D946EF', role: 'İşçi/Bakı' },
            { name: 'Zaur', email: 'zaur@techflow.az', color: '#EF4444', role: 'İşçi/Gəncə' },
            { name: 'Murad', email: 'murad@techflow.az', color: '#0EA5E9', role: 'İşçi/Bakı' },
            { name: 'Nərmin', email: 'nermin@techflow.az', color: '#F97316', role: 'İşçi/Gəncə' },
            { name: 'Admin', email: 'admin@techflow.az', color: '#0F172A', role: 'Admin' },
          ].map(u => (
            <button key={u.email} disabled={loading}
              onClick={async () => {
                setLoading(true); setError('')
                try { await login(u.email, '123456'); router.push('/dashboard') }
                catch { setError('Giriş xətası') }
                finally { setLoading(false) }
              }}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50"
              style={{ backgroundColor: u.color + '08', border: `1.5px solid ${u.color}20` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ backgroundColor: u.color }}>
                {u.name[0]}
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-bold truncate" style={{ color: '#0F172A' }}>{u.name}</p>
                <p className="text-[9px] font-medium" style={{ color: u.color }}>{u.role}</p>
              </div>
            </button>
          ))}
        </div>
      </div>}
    </>
  )
}
