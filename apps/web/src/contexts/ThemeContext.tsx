'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Rəng sxemi
export type ColorMode = 'light' | 'dark'

interface ThemeContextType {
  colorMode: ColorMode
  setColorMode: (m: ColorMode) => void
}

const ThemeContext = createContext<ThemeContextType>({
  colorMode: 'light',
  setColorMode: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorMode, setColorModeState] = useState<ColorMode>('light')

  useEffect(() => {
    // Köhnə açarları təmizlə (bir dəfəlik miqrasiya)
    if (localStorage.getItem('wfp-theme')) {
      localStorage.removeItem('wfp-theme')
    }
    // Köhnə dizayn teması açarını da təmizlə
    if (localStorage.getItem('wfp-design-theme')) {
      localStorage.removeItem('wfp-design-theme')
    }
    // data-theme atributunu təmizlə
    document.documentElement.removeAttribute('data-theme')

    // Rəng sxemi
    const savedMode = localStorage.getItem('wfp-color-mode') as ColorMode
    const mode = savedMode === 'dark' ? 'dark' : 'light'
    setColorModeState(mode)
    if (mode === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  const setColorMode = (m: ColorMode) => {
    setColorModeState(m)
    localStorage.setItem('wfp-color-mode', m)
    if (m === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  return (
    <ThemeContext.Provider value={{
      colorMode,
      setColorMode,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
