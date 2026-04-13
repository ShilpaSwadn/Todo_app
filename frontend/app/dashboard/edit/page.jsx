'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RedirectToProfile() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/dashboard/settings')
  }, [router])

  return (
    <main className="h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto font-black italic shadow-lg shadow-indigo-200"></div>
        <p className="mt-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest animate-pulse">
          Redirecting to Unified Profile...
        </p>
      </div>
    </main>
  )
}
