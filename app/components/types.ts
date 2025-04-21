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

export type PartialDependency = {
  type: 'Task' | 'Date';
  data: Partial<TaskDependencyRow> | Partial<DateDependencyRow>;
}

export type DB = {
  create: (partial: PartialItem ) => Promise<Item|null>,
  entries: (partial: Partial<ItemRow>) => Item[],
  entriesTreeMap: Map<string, Item[]>,
  entry: (partial: Partial<ItemRow>) => Item | undefined,
  delete: (partial: Partial<ItemRow>, deleteChildren: boolean) => Promise<void>,
  update: (item: Item, updates: PartialItem) => Promise<Item|null>,
  setEntries: (entries: Item[]) => void,
  setEntriesTreeMap: (entriesTreeMap: Map<string, Item[]>) => void,
  setUser: (id: string) => void,
  populateEntries: (userId: string) => Promise<void>,
  userId: string,
}

export type SubItem = {
  id: string,
  title: string
}

export type Dependencies = Dependency[] | PartialDependency[]

export type EntryFunc = () => Item

export type Item =  {
    core: ItemRow,
    blockedBy: Dependency[],
    subItems: ItemRow[],
    isBlocked: boolean,
    blockedCount: number,
    blocking: TaskDependencyRow[],
    isCollapsed: boolean,
    update: (partial: PartialItem) => Promise<Item|null>,
    delete: (deleteChildren: boolean) => Promise<void>,
    entry: (partial: Partial<ItemRow>) => Item | null,
    create: (partial: PartialItem) => Promise<Item|null>,
    entries: (partial: Partial<ItemRow>) => Item[]
  }
  export type PartialItem = {
    core?: Partial<ItemRow>;
    subItems?: Partial<ItemRow>[];
    blockedBy?: PartialDependency[];
    isCollapsed?: boolean;
  }

export type ItemType = 'task' | 'mission' | 'objective' | 'ambition'