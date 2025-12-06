'use client'

import TodoItem from './TodoItem'

export default function TodoList({ 
  todos, 
  onUpdate, 
  onDelete 
}) {
  if (todos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400 h-full flex items-center justify-center">
        <p className="text-lg">No todos yet. Add one above!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 pr-2">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

