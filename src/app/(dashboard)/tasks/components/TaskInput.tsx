'use client'

// ===========================================
// Floating Task Input Component
// ===========================================

import React, { useRef, useEffect } from 'react'
import { Plus, Send } from 'lucide-react'

interface TaskInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isCreating: boolean
}

export function TaskInput({ value, onChange, onSubmit, isCreating }: TaskInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreating])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 z-50">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-lime-300 to-emerald-300 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
        <div className="relative flex items-center bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[2rem] shadow-xl shadow-slate-200/50 p-2 pr-2.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-lime-100 text-lime-600 ml-1">
            <Plus className="w-5 h-5" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && onSubmit()}
            placeholder="새 작업을 입력하세요..."
            className="flex-1 px-4 py-3 bg-transparent text-slate-700 placeholder:text-slate-400 focus:outline-none text-sm"
            disabled={isCreating}
          />
          <button
            onClick={onSubmit}
            disabled={!value.trim() || isCreating}
            className="flex items-center gap-2 px-5 py-2.5 bg-lime-400 text-black font-medium rounded-full hover:bg-lime-500 shadow-lg shadow-lime-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm"
          >
            <Send className="w-4 h-4" />
            추가
          </button>
        </div>
      </div>
    </div>
  )
}
