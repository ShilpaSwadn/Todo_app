'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '../lib/auth'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in
    if (isAuthenticated()) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }, [router])

  return null
}

