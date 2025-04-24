import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/supabase/client'
import { supabase } from '@/lib/supabase/client'

type Item = Database['public']['Tables']['items']['Row']
type TaskDependency = Database['public']['Tables']['task_dependencies']['Row']
type BaseTask = Database['public']['Tables']['items']['Row']
type TaskInsert = Database['public']['Tables']['items']['Insert']

export type Task = BaseTask & {
  blockedBy: {
    id: string
    title: string
    completed: boolean
  }[]
  blocking: {
    id: string
    title: string
    completed: boolean
  }[]
  isBlocked: boolean
}

export const getTask = async (id: string): Promise<Task | null> => {
  const supabase = createClientComponentClient<Database>()
  const { data: task, error: taskError } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .single()

  if (taskError) {
    throw taskError
  }

  if (!task) {
    return null
  }

  // Get tasks that are blocking this task
  const { data: blockedBy, error: blockedByError } = await supabase
    .from('task_dependencies')
    .select(`
      blocking_task_id,
      blocking_task:blocking_task_id (
        id,
        title,
        completed
      )
    `)
    .eq('blocked_task_id', id)

  if (blockedByError) {
    throw blockedByError
  }

  // Get tasks that this task is blocking
  const { data: blocking, error: blockingError } = await supabase
    .from('task_dependencies')
    .select(`
      blocked_task_id,
      blocked_task:blocked_task_id (
        id,
        title,
        completed
      )
    `)
    .eq('blocking_task_id', id)

  if (blockingError) {
    throw blockingError
  }

  return {
    ...task,
    blockedBy: (blockedBy || []).map(dep => dep.blocking_task),
    blocking: (blocking || []).map(dep => dep.blocked_task),
    isBlocked: (blockedBy || []).length > 0
  }
}

type TaskDependencyWithDetails = {
  blocking_task_id: string
  blocked_task_id: string
  blocking_task: {
    id: string
    title: string
    completed: boolean
  }
  blocked_task: {
    id: string
    title: string
    completed: boolean
  }
}

export const getTasks = async (): Promise<Task[]> => {
  const supabase = createClientComponentClient<Database>()
  const { data: tasks, error: tasksError } = await supabase
    .from('items')
    .select('*')
    .order('position', { ascending: true })

  if (tasksError) {
    throw tasksError
  }

  if (!tasks) {
    return []
  }

  // Get all task dependencies in one query
  const { data: dependencies, error: dependenciesError } = await supabase
    .from('task_dependencies')
    .select(`
      blocking_task_id,
      blocked_task_id,
      blocking_task:blocking_task_id (
        id,
        title,
        completed
      ),
      blocked_task:blocked_task_id (
        id,
        title,
        completed
      )
    `)

  if (dependenciesError) {
    throw dependenciesError
  }

  // Create a map of task IDs to their blocking relationships
  const taskMap = new Map<string, Task>()
  tasks.forEach(task => {
    taskMap.set(task.id, {
      ...task,
      blockedBy: [],
      blocking: [],
      isBlocked: false
    })
  })

  // Add blocking relationships to the tasks
  const typedDependencies = dependencies as unknown as TaskDependencyWithDetails[]
  typedDependencies?.forEach((dep: TaskDependencyWithDetails) => {
    const blockingTask = taskMap.get(dep.blocking_task_id)
    const blockedTask = taskMap.get(dep.blocked_task_id)

    if (blockingTask && blockedTask) {
      blockingTask.blocking.push(dep.blocked_task)
      blockedTask.blockedBy.push(dep.blocking_task)
      blockedTask.isBlocked = true
    }
  })

  return Array.from(taskMap.values())
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