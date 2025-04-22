import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/supabase/client'

type Item = Database['public']['Tables']['items']['Row']
type TaskDependency = Database['public']['Tables']['task_dependencies']['Row']

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