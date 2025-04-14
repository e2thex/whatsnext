import { Database } from "@/src/lib/supabase/client"

type ItemRow = Database['public']['Tables']['items']['Row']
type TaskDependencyRow = Database['public']['Tables']['task_dependencies']['Row']
type DateDependencyRow = Database['public']['Tables']['date_dependencies']['Row']
export type SubItem = {
  id: string,
  title: string
}

export type Dependencies = Array<{
  type: 'Task' | 'Date',
  data: TaskDependencyRow | DateDependencyRow
}>

export type Item = ItemRow & {
    dependencies: Dependencies,
    subItems: Item[],
    isCollapsed: boolean,
    isBlocked: boolean,
    blockedCount: number,
    blocking: TaskDependencyRow[],
    update: (partial: Partial<Item>) => Item,
    delete: (deleteChildren: boolean) => void,
    entry: (partial: Partial<ItemRow>) => Item | null,
    entries: (partial: Partial<ItemRow>) => Item[]
  }