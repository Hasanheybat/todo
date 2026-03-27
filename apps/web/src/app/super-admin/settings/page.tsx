'use client'

import { useState } from 'react'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[24px] font-extrabold text-gray-800">Ayarlar</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Sistem konfiqurasiyası</p>
      </div>

      <div className="space-y-6 max-w-3xl">
        {/* Default Plan Limitləri */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-[15px] font-bold text-gray-800 mb-1">Default Plan Limitləri</h2>
          <p className="text-[11px] text-gray-400 mb-5">Yeni yaradılan tenant-lər üçün default limitlər</p>

          <div className="space-y-5">
            {[
              { plan: 'Free', maxUsers: 20, maxBranches: 2, maxDepts: 5, color: '#6B7280', bg: '#F3F4F6' },
              { plan: 'Pro', maxUsers: 100, maxBranches: 5, maxDepts: 20, color: '#4F46E5', bg: '#EEF2FF' },
              { plan: 'Enterprise', maxUsers: 200, maxBranches: 20, maxDepts: 50, color: '#D97706', bg: '#FFFBEB' },
            ].map(p => (
              <div key={p.plan} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
                <span className="text-[11px] font-bold px-3 py-1 rounded-full w-28 text-center" style={{ backgroundColor: p.bg, color: p.color }}>{p.plan}</span>
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Max İstifadəçi</label>
                    <input type="number" defaultValue={p.maxUsers} className="w-full px-3 py-2 rounded-lg text-[13px] border border-gray-200 bg-white outline-none focus:border-indigo-400" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Max Filial</label>
                    <input type="number" defaultValue={p.maxBranches} className="w-full px-3 py-2 rounded-lg text-[13px] border border-gray-200 bg-white outline-none focus:border-indigo-400" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Max Şöbə</label>
                    <input type="number" defaultValue={p.maxDepts} className="w-full px-3 py-2 rounded-lg text-[13px] border border-gray-200 bg-white outline-none focus:border-indigo-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bildiriş Ayarları */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-[15px] font-bold text-gray-800 mb-1">Bildiriş Ayarları</h2>
          <p className="text-[11px] text-gray-400 mb-5">Sistem bildirişlərinin konfiqurasiyası</p>

          <div className="space-y-3">
            {[
              { label: 'E-poçt bildirişləri', desc: 'Yeni tenant qeydiyyatı zamanı bildiriş', enabled: true },
              { label: 'Push bildirişlər', desc: 'Browser push bildirişləri', enabled: false },
              { label: 'Sistem xəbərdarlıqları', desc: 'Limit aşımı, xəta bildirişləri', enabled: true },
              { label: 'Həftəlik hesabat', desc: 'Hər həftə statistika e-poçtu', enabled: true },
            ].map((n, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-[13px] font-semibold text-gray-700">{n.label}</p>
                  <p className="text-[11px] text-gray-400">{n.desc}</p>
                </div>
                <button className={`w-11 h-6 rounded-full transition-all relative ${n.enabled ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ${n.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sistem */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-[15px] font-bold text-gray-800 mb-1">Sistem Konfiqurasiyası</h2>
          <p className="text-[11px] text-gray-400 mb-5">Ümumi sistem parametrləri</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 mb-1.5 block">Default Tema</label>
              <select className="w-full px-3 py-2.5 rounded-lg text-[13px] border border-gray-200 bg-white outline-none focus:border-indigo-400" defaultValue="sunset">
                <option value="sunset">Sunset</option>
                <option value="forest">Forest</option>
                <option value="slate">Slate</option>
                <option value="ice">Ice</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 mb-1.5 block">Default Dil</label>
              <select className="w-full px-3 py-2.5 rounded-lg text-[13px] border border-gray-200 bg-white outline-none focus:border-indigo-400" defaultValue="az">
                <option value="az">Azərbaycanca</option>
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Saxla butonu */}
        <div className="flex justify-end">
          {saved && <span className="text-[12px] text-green-600 font-semibold mr-4 self-center">Yadda saxlanıldı!</span>}
          <button onClick={handleSave}
            className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-white transition hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
            Yadda saxla
          </button>
        </div>
      </div>
    </div>
  )
}
