'use client'

import { ImSpinner2 } from 'react-icons/im'

export default function LoadingSpinner({ size = 'h-8 w-8', color = 'text-indigo-600', label = '' }) {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <ImSpinner2 className={`${size} ${color} animate-spin`} />
      {label && <p className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>}
    </div>
  )
}

export function LoadingOverlay({ active, label = 'Processing...' }) {
  if (!active) return null;
  
  return (
    <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-[2px] rounded-[inherit] transition-all duration-300">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-4 animate-in zoom-in-95">
        <ImSpinner2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">{label}</span>
      </div>
    </div>
  )
}
