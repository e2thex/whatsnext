export interface Item {
  id: string
  created_at: string
  title: string
  description: string | null
  parent_id: string | null
  position: number
  completed: boolean
  completed_at: string | null
  user_id: string | null
  type: ItemType | null
  manual_type: boolean
  blockedBy: { id: string }[]
  isCollapsed: boolean
  isBlocked: boolean
  blockedCount: number
  dependencies: Dependency[]
  subItems: Item[]
  update: (partial: Partial<Item>) => Promise<Item | null>
  delete: (deleteChildren: boolean) => Promise<void>
  entries: (partial: Partial<Item>) => Item[]
}

export type ItemType = 'Task' | 'Date'

export interface DnDItem {
  type: string
  id: string
  index: number
}

export interface TaskDependency {
  id: string
  created_at: string
  blocking_task_id: string
  blocked_task_id: string
  user_id: string
}

export interface DateDependency {
  id: string
  created_at: string
  task_id: string
  unblock_at: string
  user_id: string
}

export type Dependency = {
  type: ItemType
  data: TaskDependency | DateDependency
} 