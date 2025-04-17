import { ItemType, Dependency } from '@/app/types'

export interface ItemModel {
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
  subItems: ItemModel[]
  update: (partial: Partial<ItemModel>) => Promise<ItemModel | null>
  delete: (deleteChildren: boolean) => Promise<void>
  entries: (partial: Partial<ItemModel>) => ItemModel[]
} 