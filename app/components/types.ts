import { Database } from "@/src/lib/supabase/client"

export type ItemRow = Database['public']['Tables']['items']['Row']
export type TaskDependencyRow = Database['public']['Tables']['task_dependencies']['Row']
export type DateDependencyRow = Database['public']['Tables']['date_dependencies']['Row']

export type Dependency = {
  type: 'Task';
  data: TaskDependencyRow;
} | {
  type: 'Date';
  data: DateDependencyRow;
};

export type DB = {
  create: (partial: Partial<Item>) => Promise<Item|null>,
  entries: (partial: Partial<Item>) => Item[],
  entry: (partial: Partial<Item>) => Item | undefined,
  delete: (partial: Partial<Item>, deleteChildren: boolean) => Promise<void>,
  update: (item: Item, updates: Partial<Item>) => Promise<Item|null>,
  setEntries: (entries: Item[]) => void,
  userId: string,
}

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
    blockedBy: Dependency[],
    subItems: ItemRow[],
    isBlocked: boolean,
    blockedCount: number,
    blocking: TaskDependencyRow[],
    isCollapsed: boolean,
    update: (partial: Partial<Item>) => Promise<Item|null>,
    delete: (deleteChildren: boolean) => Promise<void>,
    entry: (partial: Partial<ItemRow>) => Item | null,
    create: (partial: Partial<ItemRow>) => Promise<Item|null>,
    entries: (partial: Partial<ItemRow>) => Item[]
  }

export type ItemType = 'task' | 'mission' | 'objective' | 'ambition'