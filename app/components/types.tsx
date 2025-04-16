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
export type EntryFunc = () => Item

export type Item = ItemRow & {
    blockedBy: Dependencies,
    subItems: ItemRow[],
    isBlocked: boolean,
    blockedCount: number,
    blocking: TaskDependencyRow[],
    update: (partial: Partial<Item>) => Promise<Item|null>,
    delete: (deleteChildren: boolean) => Promise<void>,
    entry: (partial: Partial<ItemRow>) => Item | null,
    create: (partial: Partial<ItemRow>) => Promise<Item|null>,
    entries: (partial: Partial<ItemRow>) => Item[]
  }