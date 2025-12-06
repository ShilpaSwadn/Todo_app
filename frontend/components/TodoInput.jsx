'use client'

import { FiPlus } from 'react-icons/fi'

export default function TodoInput({ 
  inputValue, 
  setInputValue, 
  onAdd 
}) {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onAdd()
    }
  }

  return (
    <div className="flex gap-2 mb-6">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Add a new todo..."
        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-gray-800"
      />
      <button
        onClick={onAdd}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
      >
        <FiPlus className="w-5 h-5" />
        <span>Add</span>
      </button>
    </div>
  )
}

