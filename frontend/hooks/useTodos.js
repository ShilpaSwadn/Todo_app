'use client'

import { useState, useEffect } from 'react'

export function useTodos(userId) {
  const [todos, setTodos] = useState([])

  // Load user-specific todos
  useEffect(() => {
    if (userId) {
      const userTodos = localStorage.getItem(`todos_${userId}`)
      if (userTodos) {
        setTodos(JSON.parse(userTodos))
      }
    }
  }, [userId])

  // Save todos to localStorage whenever todos change
  useEffect(() => {
    if (userId && todos.length >= 0) {
      localStorage.setItem(`todos_${userId}`, JSON.stringify(todos))
    }
  }, [todos, userId])

  const addTodo = (text) => {
    const newTodo = {
      id: Date.now().toString(),
      text: text.trim(),
    }
    setTodos([...todos, newTodo])
  }

  const updateTodo = (id, text) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, text: text.trim() } : todo
      )
    )
  }

  const deleteTodo = (id) => {
    setTodos(todos.filter((todo) => todo.id !== id))
  }

  return {
    todos,
    addTodo,
    updateTodo,
    deleteTodo,
    setTodos
  }
}

