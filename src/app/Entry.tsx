import { Item } from "@/app/components/types"
import { Database, supabase } from "../lib/supabase/client"
// Assuming the Item component is missing or incorrectly imported, we'll remove it for now.
type DBItem = Database['public']['Tables']['items']['Row']
type TaskDependency = Database['public']['Tables']['task_dependencies']['Row']
type DateDependency = Database['public']['Tables']['date_dependencies']['Row']

type DB = {
  create: (partial: Partial<Item>) => Promise<Item|null>,
  entries: (partial: Partial<Item>) => Item[],
  entry: (partial: Partial<Item>) => Item,
  delete: (partial: Partial<Item>, deleteChildren: boolean) => Promise<void>,
  update: (id: string, updates: Partial<Item>) => Promise<Item|null>,
  setEntries: (entries: Item[]) => void,
}
export const populateEntries = async (db:DB) => {
    const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', userId)
    
    const { data: dependenciesData, error: dependenciesError } = await supabase
      .from('task_dependencies')
      .select('*')
      .eq('user_id', userId)

    const { data: dateDependenciesData, error: dateDependenciesError } = await supabase
      .from('date_dependencies')
      .select('*')
      .eq('user_id', userId)
  const entries = items.map(item => entityFactory({item, items, dependenciesData, dateDependenciesData}))
  db.setEntries(entries);
}
export const db = ({entries, setEntries}: {entries: Item[], setEntries: React.Dispatch<React.SetStateAction<Item[]>>}):DB => {
  const db = {
    create: (partial: Partial<Item>) => Promise.resolve(null),
    entries: (partial: Partial<Item>) => (
      entries
      .filter(i => Object.keys(partial).every(key => i[key as keyof DBItem] === partial[key as keyof DBItem]))
    ),
    entry: (partial: Partial<Item>) => (
      entries
      .find(i => Object.keys(partial).every(key => i[key as keyof DBItem] === partial[key as keyof DBItem]))
  ),
    delete: (partial: Partial<Item>, deleteChildren: boolean) => Promise.resolve(),
    update: (item: Item, updates: Partial<Item>):Promise<Item|null> => {
      return new Promise(async (resolve) => {
        try {
          // TODO: Refactor into smaller functions:
          // - handleItemUpdate: Process regular item updates
          // - handleDependencyChanges: Process blockedBy array changes
          // - getAffectedItems: Get all items that need updating
          // - updateLocalState: Update entries array with all changes

          // Handle regular item updates
          const dbItemChanges = whatChanged(item, updates);
          if (Object.keys(dbItemChanges).length > 0) {
            await updateItemInDatabase(item, dbItemChanges);
          }

          // Handle dependency changes if blockedBy array changed
          if (updates.blockedBy !== undefined) {
            const currentDependencies = item.blockedBy || [];
            const newDependencies = updates.blockedBy || [];
            
            // Find dependencies to add and remove
            const dependenciesToAdd = newDependencies.filter(newDep => 
              !currentDependencies.some(currentDep => 
                currentDep.type === newDep.type && 
                currentDep.data.id === newDep.data.id
              )
            );
            
            const dependenciesToRemove = currentDependencies.filter(currentDep => 
              !newDependencies.some(newDep => 
                newDep.type === currentDep.type && 
                newDep.data.id === currentDep.data.id
              )
            );

            // Process task dependencies
            for (const dep of dependenciesToAdd) {
              if (dep.type === 'Task') {
                await supabase
                  .from('task_dependencies')
                  .insert({
                    blocking_task_id: dep.data.blocking_task_id,
                    blocked_task_id: item.id,
                  });
              } else if (dep.type === 'Date') {
                await supabase
                  .from('date_dependencies')
                  .upsert({
                    task_id: item.id,
                    unblock_at: dep.data.unblock_at,
                  });
              }
            }

            // Remove dependencies
            for (const dep of dependenciesToRemove) {
              if (dep.type === 'Task') {
                await supabase
                  .from('task_dependencies')
                  .delete()
                  .eq('blocking_task_id', dep.data.blocking_task_id)
                  .eq('blocked_task_id', item.id);
              } else if (dep.type === 'Date') {
                await supabase
                  .from('date_dependencies')
                  .delete()
                  .eq('task_id', item.id);
              }
            }
          }

          // Update local state after all database operations are complete
          const updatedItem = { ...item, ...updates };
          
          // Get all affected items (current item and items on both sides of dependencies)
          const affectedItemIds = new Set<string>();
          affectedItemIds.add(item.id);
          
          // Add items that are blocking this item
          if (updates.blockedBy) {
            updates.blockedBy.forEach(dep => {
              if (dep.type === 'Task') {
                affectedItemIds.add(dep.data.blocking_task_id);
              }
            });
          }
          
          // Add items that this item is blocking
          const blockingItems = entries.filter(i => 
            i.blockedBy?.some(dep => 
              dep.type === 'Task' && dep.data.blocking_task_id === item.id
            )
          );
          blockingItems.forEach(i => affectedItemIds.add(i.id));

          // Update all affected items in the entries array
          setEntries(entries.map(i => {
            if (i.id === item.id) {
              return updatedItem;
            } else if (affectedItemIds.has(i.id)) {
              // For other affected items, we need to refresh their blockedBy array
              return {
                ...i,
                blockedBy: i.blockedBy?.map(dep => {
                  if (dep.type === 'Task' && dep.data.blocking_task_id === item.id) {
                    return { ...dep, data: { ...dep.data } };
                  }
                  return dep;
                })
              };
            }
            return i;
          }));

          resolve(updatedItem);
        } catch (error) {
          console.error('Error updating item:', error);
          resolve(null);
        }
      });
    },
    setEntries,
  }
  return db;
}

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

const entityFactory = ({item, items, taskDependencies, dateDependencies, db}: {item: DBItem, items: DBItem[], taskDependencies: TaskDependency[], dateDependencies: DateDependency[], db: DB}):Item => {
  const blockedBy= [
    ...taskDependencies.filter(dep => dep.blocked_task_id === core.id).map(dep => ({
      type: 'Task' as const,
      data: dep
    })),
    ...dateDependencies.filter(dep => dep.task_id === core.id).map(dep => ({
      type: 'Date' as const,
      data: dep
    }))
  ];
  const subItems = items.filter(i => i.parent_id === item.id).sort((a, b) => a.position - b.position);
  const blocking = taskDependencies.filter(dep => dep.blocking_task_id === core.id);
  return {
    ...item,
    blockedBy,
    isBlocked: blockedBy.length > 0,
    blocking,
    subItems,
    blockedCount: blockedBy.length || blocking.length || 0,
    update: (partial: Partial<Item>) => db.update(item, partial),
    delete: (deleteChildren: boolean) => db.delete({id: item.id}, deleteChildren),
    create: (partial: Partial<Item>) => db.create(partial),
    entries: (partial: Partial<Item>) => db.entries(partial),
    entry: (partial: Partial<Item>) => db.entry(partial),
  }
}

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