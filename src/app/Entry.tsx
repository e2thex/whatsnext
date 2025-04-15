import { Item } from "@/app/components/types"
import { Database, supabase } from "../lib/supabase/client"
// Assuming the Item component is missing or incorrectly imported, we'll remove it for now.
type DBItem = Database['public']['Tables']['items']['Row']
type TaskDependency = Database['public']['Tables']['task_dependencies']['Row']
type DateDependency = Database['public']['Tables']['date_dependencies']['Row']


/**
 * Updates an item in the database with changed fields
 * @param itemId - The ID of the item to update
 * @param dbItem - The original database item
 * @param updates - The partial item update which may contain both DB and non-DB fields
 * @returns A Promise that resolves when the update completes
 */
const updateItemInDatabase = async (
    dbItem: DBItem, 
    updates: Partial<DBItem>
): Promise<void> => {
    console.log('updateItemInDatabase', dbItem, updates);
    // Extract only database fields that have changed
    // If we have database changes, perform the update
    if (Object.keys(updates).length > 0) {
        try {
            const { error } = await supabase
                .from('items')
                .update(updates)
                .eq('id', dbItem.id);
                
            if (error) {
                console.error('Error updating item:', error);
            }
        } catch (error) {
            console.error('Exception updating item:', error);
        }
    }
};

export interface EntryProps {
  partial: Partial<DBItem>;
  items: DBItem[];
  setItems: React.Dispatch<React.SetStateAction<DBItem[]>>;
  taskDependencies: TaskDependency[];
  setTaskDependencies: React.Dispatch<React.SetStateAction<TaskDependency[]>>;
  dateDependencies: DateDependency[];
  setDateDependencies: React.Dispatch<React.SetStateAction<DateDependency[]>>;
}

export const entry = ({
  partial,
  items,
  setItems,
  taskDependencies,
  setTaskDependencies, 
  dateDependencies,
  setDateDependencies
}: EntryProps): Item | null => {

  // Find the first item in the items.');
  const dbItem = items.find(item => 
    Object.entries(partial).every(([key, value]) => 
      item[key as keyof DBItem] === value
    )
  );
  
  if (!dbItem) {
    console.error('Item not found for partial:', partial);
    return null;
  }
  
  const dependencies = [
    ...taskDependencies.filter(dep => dep.blocked_task_id === dbItem.id).map(dep => ({
      type: 'Task' as const,
      data: dep
    })),
    ...dateDependencies.filter(dep => dep.task_id === dbItem.id).map(dep => ({
      type: 'Date' as const,
      data: dep
    }))
  ];
  const blocking = taskDependencies.filter(dep => dep.blocking_task_id === dbItem.id);
  const item: Item = {
    ...dbItem,
    dependencies,
    blocking,
    subItems: entries({partial: {parent_id: dbItem.id}, items, setItems, taskDependencies, setTaskDependencies, dateDependencies, setDateDependencies}),
    isCollapsed: false,
    isBlocked: false,
    blockedCount: dependencies.length || blocking.length || 0,
    update: (partial: Partial<Item>): Item => {
      // Trigger the database update asynchronously
      const dbItemChanges = whatChanged(item, partial);
      if (Object.keys(dbItemChanges).length > 0) {
        updateItemInDatabase(dbItem, partial);
        setItems(items.map(i => i.id === dbItem.id ? {...i, ...partial} : i))
      }
      // Return the updated item for local state
      return { ...item, ...partial };
    },
    delete: (deleteChildren: boolean) => handleDeleteItem(dbItem, deleteChildren, setItems, items),
    entry: (partial: Partial<DBItem>) => entry({partial, items, setItems, taskDependencies, setTaskDependencies, dateDependencies, setDateDependencies}),
    create: (partial: Partial<DBItem>) => newItem({partial, items, setItems, taskDependencies, setTaskDependencies, dateDependencies, setDateDependencies}),
    entries: (partial: Partial<DBItem>) => entries({partial, items, setItems, taskDependencies, setTaskDependencies, dateDependencies, setDateDependencies})
  }

  return item;
};

// Helper function to maintain backward compatibility with id-based lookups
export const entryById = (
  id: string,
  items: DBItem[],
  setItems: React.Dispatch<React.SetStateAction<DBItem[]>>,
  taskDependencies: TaskDependency[],
  setTaskDependencies: React.Dispatch<React.SetStateAction<TaskDependency[]>>,
  dateDependencies: DateDependency[],
  setDateDependencies: React.Dispatch<React.SetStateAction<DateDependency[]>>
): Item | null => {
  return entry({
    partial: { id },
    items,
    setItems,
    taskDependencies,
    setTaskDependencies,
    dateDependencies,
    setDateDependencies
  });
};

export const entries = ({partial, items, setItems, taskDependencies, setTaskDependencies, dateDependencies, setDateDependencies}: {partial: Partial<DBItem>, items: DBItem[], setItems: React.Dispatch<React.SetStateAction<DBItem[]>>, taskDependencies: TaskDependency[], setTaskDependencies: React.Dispatch<React.SetStateAction<TaskDependency[]>>, dateDependencies: DateDependency[], setDateDependencies: React.Dispatch<React.SetStateAction<DateDependency[]>>}) => (
  items
    .filter(i => Object.keys(partial).every(key => i[key as keyof DBItem] === partial[key as keyof DBItem]))
    .map(i => entryById(i.id, items, setItems, taskDependencies, setTaskDependencies, dateDependencies, setDateDependencies))
    .filter((item): item is Item => item !== null)
)

export const newItem = async ({partial, items, setItems}: {partial: Partial<DBItem>, items: DBItem[], setItems: React.Dispatch<React.SetStateAction<DBItem[]>>, taskDependencies?: TaskDependency[], setTaskDependencies?: React.Dispatch<React.SetStateAction<TaskDependency[]>>, dateDependencies?: DateDependency[], setDateDependencies?: React.Dispatch<React.SetStateAction<DateDependency[]>>}) => {
    const { data: newTask, error } = await supabase
        .from('items')
        .insert(partial)
        .select()
        .single();
        
    if (error) {
        console.error('Error creating item:', error);
        return null;
    }
    
    setItems([...items, newTask]);
    return newTask;
}

/**
 * Checks if any properties in a partial object differ from the original object
 * 
 * This function evaluates whether a partial update contains changes
 * that differ from the original object's values. It helps determine
 * if an update operation is necessary.
 * 
 * @template T - The type of the object being compared
 * @param {T} start - The original complete object
 * @param {Partial<T>} partial - The partial object with potential changes
 * @returns {Record<string, unknown>} An object containing only the properties that have changed
 * 
 * @example
 * const user = { name: "John", age: 30 };
 * const update = { name: "John", age: 31, newProp: "value" };
 * whatChanged(user, update); // Returns { age: 31, newProp: "value" }
 */
export const whatChanged = <T extends Record<string, unknown>>(
    start: T, 
    partial: Partial<T> & Record<string, unknown>
): Partial<T> => {
    return Object.keys(partial)
        .filter(key => key in start)
        .reduce<Partial<T>>((acc, key) => (
            (start[key] !== partial[key]) ? {...acc, [key]: partial[key]} : acc
        ), {} as Partial<T>);
}

export default entryById;

const handleDeleteItem = async (item: DBItem, deleteChildren: boolean, setItems: React.Dispatch<React.SetStateAction<DBItem[]>>, items: DBItem[]) => {
    try {
      if (deleteChildren) {
        // Delete the item and all its descendants
        const descendantIds = new Set<string>()
        const queue = [item.id]

        // Build a set of all descendant IDs using BFS
        while (queue.length > 0) {
          const currentId = queue.shift()!
          descendantIds.add(currentId)
          
          const children = items.filter(i => i.parent_id === currentId)
          queue.push(...children.map(c => c.id))
        }

        // Delete all descendants
        const { error } = await supabase
          .from('items')
          .delete()
          .in('id', Array.from(descendantIds))

        if (error) throw error

        // Update local state
        setItems(prev => prev.filter(i => !descendantIds.has(i.id)))
      } else {
        // Delete the item and promote its children
        const children = items.filter(i => i.parent_id === item.id)
        
        // Update children's parent_id to the deleted item's parent_id
        if (children.length > 0) {
          const { error: updateError } = await supabase
            .from('items')
            .update({ parent_id: item.parent_id })
            .in('id', children.map(c => c.id))

          if (updateError) throw updateError
        }

        // Delete the item
        const { error: deleteError } = await supabase
          .from('items')
          .delete()
          .eq('id', item.id)

        if (deleteError) throw deleteError

        // Update local state
        setItems(prev => prev.map(i => 
          i.parent_id === item.id 
            ? { ...i, parent_id: item.parent_id }
            : i
        ).filter(i => i.id !== item.id))
      }

    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }