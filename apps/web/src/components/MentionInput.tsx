'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  users: { id: string; fullName: string }[]
  selectedIds: string[]
  onToggleUser: (userId: string) => void
  placeholder?: string
  multiline?: boolean
}

export default function MentionInput({ value, onChange, users, selectedIds, onToggleUser, placeholder = 'Görev adı...', multiline = false }: MentionInputProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownIdx, setDropdownIdx] = useState(0)
  const editorRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isComposing = useRef(false)
  const lastValueRef = useRef(value)

  const filtered = users.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase())
  )

  // Extract plain text from contentEditable (mentions become @Name)
  function getPlainText(): string {
    const el = editorRef.current
    if (!el) return ''
    let text = ''
    el.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || ''
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement
        if (elem.dataset.mentionId) {
          text += elem.textContent || ''
        } else {
          text += elem.textContent || ''
        }
      }
    })
    return text
  }

  // Build HTML from value string — @Name parts become green spans
  function buildHTML(val: string): string {
    if (!val) return ''
    // Find all @Name mentions that match selected users
    let html = escapeHtml(val)
    selectedIds.forEach(id => {
      const user = users.find(u => u.id === id)
      if (user) {
        const mention = '@' + user.fullName
        const escapedMention = escapeHtml(mention)
        const span = `<span contenteditable="false" data-mention-id="${id}" style="color:#058527;font-weight:600;background:#E6F4EA;border-radius:3px;padding:0 2px;">${escapedMention}</span>`
        // Replace all occurrences
        html = html.split(escapedMention).join(span)
      }
    })
    return html
  }

  function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  // Sync external value → contentEditable (rebuild HTML when value or selectedIds changes)
  const selectedKey = selectedIds.join(',')
  const prevSelectedKey = useRef(selectedKey)

  useEffect(() => {
    if (!editorRef.current) return
    const currentText = getPlainText()
    const selectedChanged = prevSelectedKey.current !== selectedKey
    prevSelectedKey.current = selectedKey

    if (currentText !== value || selectedChanged) {
      const cursorPos = saveCursor()
      const html = buildHTML(value)
      editorRef.current.innerHTML = html || ''
      lastValueRef.current = value
      if (currentText === value && selectedChanged) {
        restoreCursor(cursorPos)
      }
    }
  }, [value, selectedKey])

  // Save cursor position helper
  function saveCursor(): number {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return 0
    const range = sel.getRangeAt(0)
    const preRange = document.createRange()
    preRange.selectNodeContents(editorRef.current)
    preRange.setEnd(range.startContainer, range.startOffset)
    return preRange.toString().length
  }

  // Restore cursor position helper
  function restoreCursor(pos: number) {
    const el = editorRef.current
    if (!el) return
    const sel = window.getSelection()
    if (!sel) return

    let charCount = 0
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(true)

    function walk(node: Node): boolean {
      if (node.nodeType === Node.TEXT_NODE) {
        const len = (node.textContent || '').length
        if (charCount + len >= pos) {
          range.setStart(node, pos - charCount)
          range.collapse(true)
          return true
        }
        charCount += len
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // For mention spans, treat as atomic
        const elem = node as HTMLElement
        if (elem.dataset.mentionId) {
          const len = (elem.textContent || '').length
          if (charCount + len >= pos) {
            // Place cursor after this mention
            range.setStartAfter(node)
            range.collapse(true)
            return true
          }
          charCount += len
        } else {
          for (const child of Array.from(node.childNodes)) {
            if (walk(child)) return true
          }
        }
      }
      return false
    }

    walk(el)
    sel.removeAllRanges()
    sel.addRange(range)
  }

  function handleInput() {
    if (isComposing.current) return
    const text = getPlainText()
    lastValueRef.current = text
    onChange(text)
    checkMention(text)
  }

  function checkMention(val: string) {
    // Get cursor position to find @ before cursor
    const cursorPos = saveCursor()
    const textBeforeCursor = val.slice(0, cursorPos)
    const atIdx = textBeforeCursor.lastIndexOf('@')
    if (atIdx !== -1) {
      // @ yalnız sətir başında və ya boşluqdan sonra işləsin (yazi@ olmasın)
      const charBefore = atIdx > 0 ? textBeforeCursor[atIdx - 1] : ' '
      if (charBefore !== ' ' && charBefore !== '\n' && atIdx !== 0) {
        setShowDropdown(false)
        return
      }
      const afterAt = textBeforeCursor.slice(atIdx + 1)
      if (!afterAt.includes(' ') && afterAt.length < 20) {
        setSearch(afterAt)
        setShowDropdown(true)
        setDropdownIdx(0)
        return
      }
    }
    setShowDropdown(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showDropdown && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setDropdownIdx(prev => Math.min(prev + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setDropdownIdx(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[dropdownIdx]) selectUser(filtered[dropdownIdx])
      } else if (e.key === 'Escape') {
        setShowDropdown(false)
      }
      return
    }

    // Handle backspace on mention spans
    if (e.key === 'Backspace') {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        if (range.collapsed) {
          const node = range.startContainer
          // Check if cursor is right after a mention span
          if (node.nodeType === Node.TEXT_NODE && range.startOffset === 0) {
            const prev = node.previousSibling as HTMLElement
            if (prev && prev.dataset?.mentionId) {
              e.preventDefault()
              const userId = prev.dataset.mentionId
              prev.remove()
              const text = getPlainText()
              onChange(text)
              if (userId) onToggleUser(userId)
              return
            }
          }
          // Check if cursor is at element level
          if (node === editorRef.current && range.startOffset > 0) {
            const prevChild = node.childNodes[range.startOffset - 1] as HTMLElement
            if (prevChild?.dataset?.mentionId) {
              e.preventDefault()
              const userId = prevChild.dataset.mentionId
              prevChild.remove()
              const text = getPlainText()
              onChange(text)
              if (userId) onToggleUser(userId)
              return
            }
          }
        }
      }
    }

    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
    }
  }

  function selectUser(user: { id: string; fullName: string }) {
    const el = editorRef.current
    if (!el) return

    const text = getPlainText()
    const cursorPos = saveCursor()
    const textBeforeCursor = text.slice(0, cursorPos)
    const atIdx = textBeforeCursor.lastIndexOf('@')

    if (atIdx === -1) return

    const fullName = user.fullName
    const beforeAt = text.slice(0, atIdx)
    const afterMention = text.slice(cursorPos)
    const newValue = beforeAt + '@' + fullName + ' ' + afterMention

    // Always add (not toggle) — allow same user multiple times
    if (!selectedIds.includes(user.id)) {
      onToggleUser(user.id)
    }

    // Update the value — the useEffect will rebuild HTML
    onChange(newValue)
    setShowDropdown(false)
    setSearch('')

    // Focus and place cursor after mention
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus()
        const newCursorPos = beforeAt.length + fullName.length + 2 // @name + space
        restoreCursor(newCursorPos)
      }
    }, 20)
  }

  function removeUser(userId: string) {
    const user = users.find(u => u.id === userId)
    if (user) {
      const mention = '@' + user.fullName
      const regex = new RegExp(mention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s?')
      const newVal = value.replace(regex, '').trim()
      onChange(newVal)
    }
    onToggleUser(userId)
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Show placeholder
  const isEmpty = !value

  return (
    <div className="relative flex-1">
      {/* ContentEditable editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => { isComposing.current = true }}
        onCompositionEnd={() => { isComposing.current = false; handleInput() }}
        className="w-full text-[11px] outline-none bg-transparent whitespace-pre-wrap break-words min-h-[18px]"
        style={{ lineHeight: '18px', color: '#1F1F1F' }}
        data-placeholder={placeholder}
      />

      {/* Placeholder */}
      {isEmpty && (
        <div
          className="absolute top-0 left-0 text-[11px] pointer-events-none"
          style={{ color: '#B3B3B3', lineHeight: '18px' }}
        >
          {placeholder}
        </div>
      )}

      {/* @ Dropdown */}
      {showDropdown && filtered.length > 0 && (
        <div ref={dropdownRef}
          className="absolute left-0 top-full mt-1 w-52 rounded-lg shadow-lg overflow-hidden z-10"
          style={{ backgroundColor: '#fff', border: '1px solid #EBEBEB' }}>
          <div className="px-2 py-1" style={{ backgroundColor: '#F5F3F0' }}>
            <span className="text-[9px] font-bold" style={{ color: '#808080' }}>@ Kişi seç</span>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {filtered.map((u, idx) => {
              const alreadySelected = selectedIds.includes(u.id)
              return (
                <button key={u.id} type="button"
                  onClick={() => selectUser(u)}
                  className="w-full flex items-center gap-2 px-2.5 py-1 text-left transition"
                  style={{ backgroundColor: idx === dropdownIdx ? '#F5F3F0' : '#fff' }}>
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold shrink-0"
                    style={{ backgroundColor: alreadySelected ? '#E6F4EA' : '#E8F0FE', color: alreadySelected ? '#058527' : '#246FE0' }}>
                    {alreadySelected ? '✓' : u.fullName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-[10px]" style={{ color: '#1F1F1F' }}>{u.fullName}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
