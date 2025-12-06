'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTodos } from '../../hooks/useTodos'
import { getCurrentUser, clearAuthData, isAuthenticated } from '../../lib/auth'
import { getCurrentUser as getCurrentUserAPI } from '../../services/authService'
import Navbar from '../../components/Navbar'
import TodoInput from '../../components/TodoInput'
import TodoList from '../../components/TodoList'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [inputValue, setInputValue] = useState('')
  
  const { todos, addTodo, updateTodo, deleteTodo } = useTodos(user?.id)

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Check if user is authenticated
      if (!isAuthenticated()) {
        router.push('/login')
        return
      }

      // Try to get user from localStorage first
      const localUser = getCurrentUser()
      if (localUser) {
        setUser(localUser)
        
        // Optionally verify token with backend
        try {
          const userData = await getCurrentUserAPI()
          setUser(userData)
        } catch (error) {
          // Token invalid, clear auth and redirect
          clearAuthData()
          router.push('/login')
          return
        }
      } else {
        // Try to fetch from API
        try {
          const userData = await getCurrentUserAPI()
          setUser(userData)
        } catch (error) {
          clearAuthData()
      router.push('/login')
      return
    }
      }
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleLogout = () => {
    clearAuthData()
    router.push('/login')
  }
  
  const handleAddTodo = () => {
    if (inputValue.trim() === '') return
    addTodo(inputValue)
    setInputValue('')
  }

  const handleUpdateTodo = (id, text) => {
    updateTodo(id, text)
  }

  const handleDeleteTodo = (id) => {
    deleteTodo(id)
  }

  // Show loading state while checking auth
  if (loading || !user) {
    return (
      <main className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </main>
    )
  }

  const totalCount = todos.length

  return (
    <main className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Navbar */}
      <Navbar 
        user={user} 
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Tasks</h2>
              <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {totalCount} {totalCount === 1 ? 'task' : 'tasks'}
                </span>
              </div>
            </div>

            {/* Input Section - Fixed */}
            <div className="flex-shrink-0 mb-6">
              <TodoInput
                inputValue={inputValue}
                setInputValue={setInputValue}
                onAdd={handleAddTodo}
              />
            </div>

            {/* Todo List - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-2">
              <TodoList
                todos={todos}
                onUpdate={handleUpdateTodo}
                onDelete={handleDeleteTodo}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

