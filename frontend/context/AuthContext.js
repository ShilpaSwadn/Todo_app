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
      if (firebaseUser) {
        // User is signed in or token changed (e.g. refreshed)
        const token = await firebaseUser.getIdToken()
        
        // Fetch full profile from our DB if we don't have it or if it might have changed
        try {
          const userData = await getCurrentUserAPI()
          setUser(userData)
          saveAuthData(userData, token)
        } catch (error) {
          console.error("Failed to sync user data in AuthProvider:", error)
          // If we can't get the user data, maybe they are deleted from our DB?
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
