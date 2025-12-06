'use client'

import { useState, useEffect, useRef } from 'react'
import { FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi'

export default function TodoItem({ 
  todo, 
  onUpdate, 
  onDelete 
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(todo.text)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(todo.text)
  }

  const handleSave = () => {
    if (editValue.trim() === '') {
      setEditValue(todo.text)
      setIsEditing(false)
      return
    }
    onUpdate(todo.id, editValue.trim())
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(todo.text)
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-200 hover:shadow-md">
      {isEditing ? (
        <>
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="flex-1 px-3 py-2 border-2 border-indigo-500 dark:border-indigo-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-gray-800"
          />
          <button
            onClick={handleSave}
            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors duration-200"
            title="Save"
          >
            <FiCheck className="w-5 h-5" />
          </button>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors duration-200"
            title="Cancel"
          >
            <FiX className="w-5 h-5" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-gray-800 dark:text-white">
            {todo.text}
          </span>
          <button
            onClick={handleEdit}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors duration-200"
            title="Edit"
          >
            <FiEdit2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(todo.id)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors duration-200"
            title="Delete"
          >
            <FiTrash2 className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  )
}
