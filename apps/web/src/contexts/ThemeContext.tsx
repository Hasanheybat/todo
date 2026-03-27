'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type ThemeName = 'forest' | 'sunset' | 'slate' | 'ice'

export interface ThemeInfo {
  name: ThemeName
  label: string
  emoji: string
  description: string
  preview: string // gradient preview for selector
}

export const THEMES: ThemeInfo[] = [
  { name: 'forest', label: 'Forest', emoji: '🌿', description: 'Yaşıl, sakit, organik', preview: 'linear-gradient(135deg, #059669, #34D399)' },
  { name: 'sunset', label: 'Sunset', emoji: '🌅', description: 'İsti narıncı-qırmızı', preview: 'linear-gradient(135deg, #F97316, #FBBF24)' },
  { name: 'slate', label: 'Slate', emoji: '📐', description: 'Notion/Linear minimal', preview: 'linear-gradient(135deg, #F6F6F6, #EBEBEB)' },
  { name: 'ice', label: 'Ice', emoji: '❄️', description: 'Soyuq mavi, təmiz', preview: 'linear-gradient(135deg, #1D4ED8, #60A5FA)' },
]

interface ThemeContextType {
  theme: ThemeName
  setTheme: (t: ThemeName) => void
  themeInfo: ThemeInfo
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'sunset',
  setTheme: () => {},
  themeInfo: THEMES[1],
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('sunset')

  useEffect(() => {
    const saved = localStorage.getItem('wfp-theme') as ThemeName
    if (saved && THEMES.find(t => t.name === saved)) {
      setThemeState(saved)
      document.documentElement.setAttribute('data-theme', saved)
    } else {
      // Default sunset
      document.documentElement.setAttribute('data-theme', 'sunset')
      localStorage.setItem('wfp-theme', 'sunset')
    }
  }, [])

  const setTheme = (t: ThemeName) => {
    setThemeState(t)
    localStorage.setItem('wfp-theme', t)
    document.documentElement.setAttribute('data-theme', t)
    // Dark class uyğunluğu — slate light, digərləri özlərinə uyğun
    document.documentElement.classList.remove('dark')
  }

  const themeInfo = THEMES.find(t => t.name === theme) || THEMES[1]

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeInfo }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
