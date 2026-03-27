'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [form, setForm] = useState({ fullName: '', companyName: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function getStrength(): { width: string; color: string } {
    const pw = form.password
    if (!pw) return { width: '0%', color: '#eee' }
    if (pw.length < 4) return { width: '20%', color: '#EF4444' }
    if (pw.length < 6) return { width: '40%', color: '#F97316' }
    let score = 60
    if (/[A-Z]/.test(pw)) score += 10
    if (/[0-9]/.test(pw)) score += 10
    if (/[^A-Za-z0-9]/.test(pw)) score += 20
    const pct = Math.min(score, 100)
    return { width: pct + '%', color: pct >= 80 ? '#10B981' : pct >= 60 ? '#FBBF24' : '#F97316' }
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.fullName.trim()) e.fullName = 'Ad və soyad daxil edin'
    if (!form.companyName.trim()) e.companyName = 'Şirkət adı daxil edin'
    if (!form.email) e.email = 'E-poçt daxil edin'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Düzgün e-poçt daxil edin'
    if (!form.password) e.password = 'Şifrə daxil edin'
    else if (form.password.length < 6) e.password = 'Şifrə minimum 6 simvol olmalıdır'
    if (!form.confirmPassword) e.confirmPassword = 'Şifrəni təsdiqləyin'
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Şifrələr uyğun gəlmir'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true); setErrors({})
    try {
      await register({ fullName: form.fullName, email: form.email, password: form.password, companyName: form.companyName })
      router.push('/dashboard')
    } catch (err: any) { setErrors({ general: err.message || 'Qeydiyyat zamanı xəta baş verdi' }) }
    finally { setLoading(false) }
  }

  const strength = getStrength()

  const inputStyle = (field: string) => ({
    borderColor: errors[field] ? '#EF4444' : '#FED7AA',
    backgroundColor: '#fff',
    color: '#431407',
  })

  const focusHandler = (e: React.FocusEvent<HTMLInputElement>, hasError: boolean) => {
    if (!hasError) {
      e.target.style.borderColor = '#F97316'
      e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.12)'
    }
  }
  const blurHandler = (e: React.FocusEvent<HTMLInputElement>, hasError: boolean) => {
    e.target.style.borderColor = hasError ? '#EF4444' : '#FED7AA'
    e.target.style.boxShadow = 'none'
  }

  return (
    <>
      {/* Mobil logo */}
      <div className="lg:hidden text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3" style={{ background: 'linear-gradient(135deg, #F97316, #FBBF24)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#F97316' }}>WorkFlow Pro</h1>
      </div>

      <h2 className="text-[22px] font-bold" style={{ color: '#431407' }}>Qeydiyyat</h2>
      <p className="mt-1 text-[14px]" style={{ color: '#C2956B' }}>Yeni hesab yaradın</p>

      {errors.general && (
        <div className="mt-4 rounded-[10px] px-4 py-3 text-[13px] flex items-center gap-2" style={{ backgroundColor: '#FFF7ED', color: '#F97316' }}>
          <span>⚠️</span> {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
        {/* Ad soyad */}
        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#431407' }}>Ad və Soyad</label>
          <input type="text" value={form.fullName} onChange={e => updateField('fullName', e.target.value)}
            placeholder="Adınız Soyadınız"
            className="w-full rounded-[10px] border-[1.5px] px-4 py-2.5 text-[13px] outline-none transition"
            style={inputStyle('fullName')}
            onFocus={e => focusHandler(e, !!errors.fullName)} onBlur={e => blurHandler(e, !!errors.fullName)} />
          {errors.fullName && <p className="mt-1 text-[10px] text-red-500">{errors.fullName}</p>}
        </div>

        {/* Şirkət */}
        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#431407' }}>Şirkət adı</label>
          <input type="text" value={form.companyName} onChange={e => updateField('companyName', e.target.value)}
            placeholder="Şirkətinizin adı"
            className="w-full rounded-[10px] border-[1.5px] px-4 py-2.5 text-[13px] outline-none transition"
            style={inputStyle('companyName')}
            onFocus={e => focusHandler(e, !!errors.companyName)} onBlur={e => blurHandler(e, !!errors.companyName)} />
          {errors.companyName && <p className="mt-1 text-[10px] text-red-500">{errors.companyName}</p>}
        </div>

        {/* E-poçt */}
        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#431407' }}>E-poçt</label>
          <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)}
            placeholder="sizin@email.com"
            className="w-full rounded-[10px] border-[1.5px] px-4 py-2.5 text-[13px] outline-none transition"
            style={inputStyle('email')}
            onFocus={e => focusHandler(e, !!errors.email)} onBlur={e => blurHandler(e, !!errors.email)} />
          {errors.email && <p className="mt-1 text-[10px] text-red-500">{errors.email}</p>}
        </div>

        {/* Şifrə */}
        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#431407' }}>Şifrə</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={form.password}
              onChange={e => updateField('password', e.target.value)}
              placeholder="Minimum 6 simvol"
              className="w-full rounded-[10px] border-[1.5px] px-4 py-2.5 pr-11 text-[13px] outline-none transition"
              style={inputStyle('password')}
              onFocus={e => focusHandler(e, !!errors.password)} onBlur={e => blurHandler(e, !!errors.password)} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px]" style={{ color: '#DDB895', opacity: 0.5 }}>
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
          {/* Strength bar */}
          <div className="h-1 rounded-sm mt-1.5 overflow-hidden" style={{ backgroundColor: '#FFF0DD' }}>
            <div className="h-full rounded-sm transition-all duration-300" style={{ width: strength.width, backgroundColor: strength.color }} />
          </div>
          {errors.password && <p className="mt-1 text-[10px] text-red-500">{errors.password}</p>}
        </div>

        {/* Şifrə təsdiqi */}
        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#431407' }}>Şifrəni təsdiqləyin</label>
          <input type="password" value={form.confirmPassword}
            onChange={e => updateField('confirmPassword', e.target.value)}
            placeholder="Şifrəni təkrar daxil edin"
            className="w-full rounded-[10px] border-[1.5px] px-4 py-2.5 text-[13px] outline-none transition"
            style={inputStyle('confirmPassword')}
            onFocus={e => focusHandler(e, !!errors.confirmPassword)} onBlur={e => blurHandler(e, !!errors.confirmPassword)} />
          {errors.confirmPassword && <p className="mt-1 text-[10px] text-red-500">{errors.confirmPassword}</p>}
        </div>

        <button type="submit" disabled={loading}
          className="w-full rounded-[10px] py-3 text-[14px] font-bold text-white transition disabled:opacity-50 hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #F97316, #FBBF24)', boxShadow: '0 4px 14px rgba(249,115,22,0.25)' }}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Gözləyin...
            </span>
          ) : 'Qeydiyyatdan keç'}
        </button>
      </form>

      <p className="mt-5 text-center text-[13px]" style={{ color: '#C2956B' }}>
        Artıq hesabınız var?{' '}
        <Link href="/login" className="font-semibold" style={{ color: '#F97316' }}>Daxil olun</Link>
      </p>
    </>
  )
}
