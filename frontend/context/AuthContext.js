'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { onIdTokenChanged } from 'firebase/auth'
import { saveAuthData, clearAuthData } from '@/lib/auth/client'
import { getCurrentUser as getCurrentUserAPI } from '@/lib/services/auth'

const AuthContext = createContext({
  user: null,
  loading: true,
})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setLoading(true)
      if (firebaseUser) {
        // User is signed in or token changed (e.g. refreshed)
        const token = await firebaseUser.getIdToken()
        
        // CRITICAL FIX: Save token before making ANY API calls
        // This ensures the Authorization header is available in lib/api/client.js
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token)
        }

        // Fetch full profile from our DB
        try {
          const userData = await getCurrentUserAPI()
          setUser(userData)
          // Update both user and token in localStorage (ensures user object is correct too)
          saveAuthData(userData, token)
        } catch (error) {
          console.error("Failed to sync user data in AuthProvider:", error)
        }
      } else {
        // User is signed out
        setUser(null)
        clearAuthData()
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
