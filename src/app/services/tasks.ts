import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/supabase/client'
import { determineTaskType, shouldTaskBeBlockedByDescendants } from '../utils/taskUtils'

type Item = Database['public']['Tables']['items']['Row']
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
  effectiveType: 'Task' | 'Mission' | 'Objective' | 'Ambition'
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

type TaskDependencyInfo = {
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

// Helper function to fetch task dependencies and construct task objects
async function fetchTaskDependencies(supabase: ReturnType<typeof createClientComponentClient<Database>>, taskIds: string[]): Promise<Map<string, TaskDependencyInfo>> {
  // Get all task dependencies in one query, but only for non-completed blocking tasks
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
    .in('blocking_task_id', taskIds)
    .or(`blocked_task_id.in.(${taskIds.join(',')})`)
    .eq('blocking_task.completed', false)

  if (dependenciesError) {
    throw dependenciesError
  }

  // Create a map of task IDs to their blocking relationships
  const taskMap = new Map<string, TaskDependencyInfo>()
  taskIds.forEach(taskId => {
    taskMap.set(taskId, {
      blockedBy: [],
      blocking: [],
      isBlocked: false
    })
  })
  console.log(dependencies, 'dependencies')

  // Add blocking relationships to the tasks
  const typedDependencies = dependencies as unknown as TaskDependencyWithDetails[]
  typedDependencies?.filter(dep => dep.blocking_task !== null).forEach((dep: TaskDependencyWithDetails) => {
    const blockingTask = taskMap.get(dep.blocking_task_id)
    const blockedTask = taskMap.get(dep.blocked_task_id)

    if (blockingTask && blockedTask) {
      blockingTask.blocking.push(dep.blocked_task)
      blockedTask.blockedBy.push(dep.blocking_task)
      blockedTask.isBlocked = true
    }
  })

  return taskMap
}

export const getTask = async (id: string): Promise<Task | null> => {
  const tasks = await getTasksHelper([id])
  return tasks[0] || null
}

export const getTasks = async (): Promise<Task[]> => {
  const tasks = await getTasksHelper()
  console.log(tasks, 'tasks')
  return tasks
}

export const getTasksHelper = async (taskIds?: string[]): Promise<Task[]> => {
  const supabase = createClientComponentClient<Database>()
  let query = supabase
    .from('items')
    .select('*')
    .order('position', { ascending: true })

  // If taskIds are provided, filter by them
  if (taskIds && taskIds.length > 0) {
    query = query.in('id', taskIds)
  }

  const { data: tasks, error: tasksError } = await query

  if (tasksError) {
    throw tasksError
  }

  if (!tasks) {
    return []
  }

  const idsToFetch = tasks.map(task => task.id)
  const taskMap = await fetchTaskDependencies(supabase, idsToFetch)

  // First pass: Merge the base task data with the dependency data and determine effective type
  const tasksWithDeps = tasks.map(task => {
    const taskWithDeps = {
      ...task,
      ...(taskMap.get(task.id) || { blockedBy: [], blocking: [], isBlocked: false })
    }
    
    return {
      ...taskWithDeps,
      effectiveType: determineTaskType(taskWithDeps, tasks)
    }
  })

  // Second pass: Apply descendant-based blocking
  return tasksWithDeps.map(task => {
    const isBlockedByDescendants = shouldTaskBeBlockedByDescendants(task, tasksWithDeps)
    return {
      ...task,
      isBlocked: task.isBlocked || isBlockedByDescendants
    }
  })
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

export const deleteTask = async (id: string): Promise<void> => {
  const supabase = createClientComponentClient<Database>()
  
  // First delete any task dependencies where this task is either blocking or blocked
  const { error: dependencyError } = await supabase
    .from('task_dependencies')
    .delete()
    .or(`blocking_task_id.eq.${id},blocked_task_id.eq.${id}`)

  if (dependencyError) {
    throw dependencyError
  }

  // Then delete the task itself
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)

  if (error) {
    throw error
  }
}

export const moveChildrenUp = async (taskId: string): Promise<void> => {
  const supabase = createClientComponentClient<Database>()
  
  // First get the parent_id of the task being deleted
  const { data: task, error: taskError } = await supabase
    .from('items')
    .select('parent_id')
    .eq('id', taskId)
    .single()

  if (taskError) {
    throw taskError
  }

  // Then update all children to have that parent_id
  const { error } = await supabase
    .from('items')
    .update({ parent_id: task.parent_id })
    .eq('parent_id', taskId)

  if (error) {
    throw error
  }
} 