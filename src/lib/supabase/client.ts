import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient()

export type ItemType = 'task' | 'mission' | 'objective' | 'ambition'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      items: {
        Row: {
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
        }
        Insert: {
          id?: string
          created_at?: string
          title: string
          description?: string | null
          parent_id?: string | null
          position?: number
          completed?: boolean
          completed_at?: string | null
          user_id?: string | null
          type?: ItemType | null
          manual_type?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          title?: string
          description?: string | null
          parent_id?: string | null
          position?: number
          completed?: boolean
          completed_at?: string | null
          user_id?: string | null
          type?: ItemType | null
          manual_type?: boolean
        }
      }
      task_dependencies: {
        Row: {
          id: string
          created_at: string
          blocking_task_id: string
          blocked_task_id: string
          user_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          blocking_task_id: string
          blocked_task_id: string
          user_id?: string
        }
        Update: {
          id?: string
          created_at?: string
          blocking_task_id?: string
          blocked_task_id?: string
          user_id?: string
        }
      }
      date_dependencies: {
        Row: {
          id: string
          created_at: string
          task_id: string
          unblock_at: string
          user_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          task_id: string
          unblock_at: string
          user_id?: string
        }
        Update: {
          id?: string
          created_at?: string
          task_id?: string
          unblock_at?: string
          user_id?: string
        }
      }
    }
    Functions: {
      get_descendants: {
        Args: { item_id: string }
        Returns: { id: string; level: number }[]
      }
      get_item_depth: {
        Args: { item_id: string }
        Returns: number
      }
      check_circular_dependency: {
        Args: { blocking_id: string; blocked_id: string }
        Returns: boolean
      }
    }
  }
} 