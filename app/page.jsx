'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [todos, setTodos] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [editingId, setEditingId] = useState(null)

  // Load todos from localStorage on mount
  useEffect(() => {
    const savedTodos = localStorage.getItem('todos')
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos))
    }
  }, [])

  // Save todos to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }, [todos])

  const addOrUpdateTodo = () => {
    if (inputValue.trim() === '') return

    if (editingId) {
      // Update existing todo
      setTodos(
        todos.map((todo) =>
          todo.id === editingId ? { ...todo, text: inputValue.trim() } : todo
        )
      )
      setEditingId(null)
    } else {
      // Add new todo
      const newTodo = {
        id: Date.now().toString(),
        text: inputValue.trim(),
      }
      setTodos([...todos, newTodo])
    }
    
    setInputValue('')
  }

  const deleteTodo = (id) => {
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  const startEdit = (id, text) => {
    setEditingId(id)
    setInputValue(text)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setInputValue('')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addOrUpdateTodo()
    } else if (e.key === 'Escape' && editingId) {
      cancelEdit()
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8">
          <h1 className="text-4xl font-bold text-center mb-8 text-gray-800 dark:text-white">
             Todo App
          </h1>

          {/* Input Section */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={editingId ? "Edit todo..." : "Add a new todo..."}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-gray-800"
            />
            {editingId ? (
              <>
                <button
                  onClick={addOrUpdateTodo}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  Update
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={addOrUpdateTodo}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Add
              </button>
            )}
          </div>

          {/* Todo List */}
          <div className="space-y-2">
            {todos.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p className="text-lg">No todos yet. Add one above!</p>
              </div>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-200 ${
                    editingId === todo.id ? 'ring-2 ring-indigo-500' : ''
                  }`}
                >
                  <span className="flex-1 text-gray-800 dark:text-white">
                    {todo.text}
                  </span>
                  <button
                    onClick={() => startEdit(todo.id, todo.text)}
                    disabled={editingId !== null && editingId !== todo.id}
                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    disabled={editingId !== null}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

