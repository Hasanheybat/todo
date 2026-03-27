export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Sol — FocusFlow branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center" style={{ background: 'linear-gradient(135deg, #312E81, #4F46E5, #818CF8)' }}>
        <div className="text-center text-white px-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">FocusFlow</h1>
          <p className="mt-3 text-lg" style={{ color: 'rgba(255,255,255,0.8)' }}>İş proseslərinizi vahid platformada idarə edin</p>
          <div className="mt-10 space-y-4 text-left max-w-xs mx-auto" style={{ color: 'rgba(255,255,255,0.9)' }}>
            {['Tapşırıq və todo idarəetməsi', 'Maliyyə və maaş izləmə', 'Çoxlu işletmə dəstəyi', 'Real-time bildirişlər', 'Təkrarlanan görev şablonları'].map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A5B4FC" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <span className="text-[15px]">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sağ — form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="w-full max-w-[380px]">{children}</div>
      </div>
    </div>
  )
}
