import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/supabase/client'
import { supabase } from '@/lib/supabase/client'

type Item = Database['public']['Tables']['items']['Row']
type TaskDependency = Database['public']['Tables']['task_dependencies']['Row']
type Task = Database['public']['Tables']['items']['Row']
type TaskInsert = Database['public']['Tables']['items']['Insert']

export const getTask = async (id: string): Promise<Item | null> => {
  const supabase = createClientComponentClient<Database>()
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data
}

export const getTasks = async (): Promise<Item[]> => {
  const supabase = createClientComponentClient<Database>()
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('position', { ascending: true })

  if (error) {
    throw error
  }

  return data || []
}

export const updateTask = async (id: string, updates: Partial<Item>): Promise<Item> => {
  const supabase = createClientComponentClient<Database>()
  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Task not found')
  }

  return data
}

export const getBlockedTasks = async (taskId: string): Promise<string[]> => {
  const supabase = createClientComponentClient<Database>()
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('blocked_task_id')
    .eq('blocking_task_id', taskId)

  if (error) {
    throw error
  }

  return data.map(dep => dep.blocked_task_id)
}

export const getBlockingTasks = async (taskId: string): Promise<string[]> => {
  const supabase = createClientComponentClient<Database>()
  const { data, error } = await supabase
    .from('task_dependencies')
    .select('blocking_task_id')
    .eq('blocked_task_id', taskId)

  if (error) {
    throw error
  }

  return (data || []).map(dep => dep.blocking_task_id)
}

export const createTask = async (task: TaskInsert): Promise<Task> => {
  const supabase = createClientComponentClient<Database>()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User must be authenticated to create tasks')
  }

  const { data, error } = await supabase
    .from('items')
    .insert({
      ...task,
      user_id: user.id
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export const addBlockingRelationship = async (blockingTaskId: string, blockedTaskId: string): Promise<void> => {
  const supabase = createClientComponentClient<Database>()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('User must be authenticated to add blocking relationships')
  }

  const { error } = await supabase
    .from('task_dependencies')
    .insert({
      blocking_task_id: blockingTaskId,
      blocked_task_id: blockedTaskId,
      user_id: user.id
    })

  if (error) {
    throw error
  }
}

export const removeBlockingRelationship = async (blockingTaskId: string, blockedTaskId: string): Promise<void> => {
  const supabase = createClientComponentClient<Database>()
  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('blocking_task_id', blockingTaskId)
    .eq('blocked_task_id', blockedTaskId)

  if (error) {
    throw error
  }
}

type TaskWithDetails = {
  id: string
  title: string
  completed: boolean
}

type TaskDependencyWithDetails = {
  blocked_task_id: string
  blocked_task: {
    id: string
    title: string
    completed: boolean
  }
}

type BlockingTaskDependencyWithDetails = {
  blocking_task_id: string
  blocking_task: {
    id: string
    title: string
    completed: boolean
  }
}

export const getBlockedTasksWithDetails = async (taskId: string): Promise<TaskWithDetails[]> => {
  const supabase = createClientComponentClient<Database>()
  const { data, error } = await supabase
    .from('task_dependencies')
    .select(`
      blocked_task_id,
      blocked_task:blocked_task_id (
        id,
        title,
        completed
      )
    `)
    .eq('blocking_task_id', taskId)

  if (error) {
    throw error
  }

  return (data as unknown as TaskDependencyWithDetails[]).map(dep => dep.blocked_task)
}

export const getBlockingTasksWithDetails = async (taskId: string): Promise<TaskWithDetails[]> => {
  const supabase = createClientComponentClient<Database>()
  const { data, error } = await supabase
    .from('task_dependencies')
    .select(`
      blocking_task_id,
      blocking_task:blocking_task_id (
        id,
        title,
        completed
      )
    `)
    .eq('blocked_task_id', taskId)

  if (error) {
    throw error
  }

  return (data as unknown as BlockingTaskDependencyWithDetails[]).map(dep => dep.blocking_task)
}

export const searchTasks = async (query: string): Promise<TaskWithDetails[]> => {
  const supabase = createClientComponentClient<Database>()
  const { data, error } = await supabase
    .from('items')
    .select('id, title, completed')
    .ilike('title', `%${query}%`)
    .order('title', { ascending: true })
    .limit(10)

  if (error) {
    throw error
  }

  return data
} 