import { Item } from "@/app/components/types"
import { Database, supabase } from "../lib/supabase/client"
// Assuming the Item component is missing or incorrectly imported, we'll remove it for now.
type DBItem = Database['public']['Tables']['items']['Row']
type TaskDependency = Database['public']['Tables']['task_dependencies']['Row']
type DateDependency = Database['public']['Tables']['date_dependencies']['Row']

type TaskDependencyData = {
  id: string;
  blocking_task_id: string;
  blocked_task_id: string;
  user_id: string;
};

type DateDependencyData = {
  id: string;
  task_id: string;
  unblock_at: string;
  user_id: string;
};

type Dependency = {
  type: 'Task';
  data: TaskDependencyData;
} | {
  type: 'Date';
  data: DateDependencyData;
};

type DB = {
  create: (partial: Partial<Item>) => Promise<Item|null>,
  entries: (partial: Partial<Item>) => Item[],
  entry: (partial: Partial<Item>) => Item | undefined,
  delete: (partial: Partial<Item>, deleteChildren: boolean) => Promise<void>,
  update: (item: Item, updates: Partial<Item>) => Promise<Item|null>,
  setEntries: (entries: Item[]) => void,
  userId: string,
}
export const populateEntries = async (db:DB) => {
    const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', db.userId)
    
    const { data: dependenciesData, error: dependenciesError } = await supabase
      .from('task_dependencies')
      .select('*')
      .eq('user_id', db.userId)

    const { data: dateDependenciesData, error: dateDependenciesError } = await supabase
      .from('date_dependencies')
      .select('*')
      .eq('user_id', db.userId)

    if (itemsError || dependenciesError || dateDependenciesError) {
      console.error('Error populating entries:', { itemsError, dependenciesError, dateDependenciesError });
      return;
    }

    if (!items) {
      console.error('No items found for user:', db.userId);
      return;
    }

    const entries = items.map(item => entityFactory({
      item, 
      items, 
      taskDependencies: dependenciesData as TaskDependency[], 
      dateDependencies: dateDependenciesData as DateDependency[],
      db: db as unknown as DB
    }))
    db.setEntries(entries);
}
export const db = ({entries, setEntries, userId}: {entries: Item[], setEntries: React.Dispatch<React.SetStateAction<Item[]>>, userId: string}):DB => {
  const db = {
    create: async (partial: Partial<Item>) => {
      try {
        const { data, error } = await supabase
          .from('items')
          .insert({ ...partial, user_id: userId })
          .select()
          .single();
        
        if (error) {
          console.error('Error creating item:', error);
          return null;
        }
        // TODO: Decide if we should pass the real taskDependencies and dateDependencies to the entityFactory
        const newItem = entityFactory({
          item: data, 
          items: entries, 
          taskDependencies: [], 
          dateDependencies: [],
          db: db as unknown as DB
        });
        setEntries([...entries, newItem]);
        return newItem;
      } catch (error) {
        console.error('Error creating item:', error);
        return null;
      }
    },
    entries: (partial: Partial<Item>) => (
      entries
      .filter(i => Object.keys(partial).every(key => i[key as keyof DBItem] === partial[key as keyof DBItem]))
    ),
    entry: (partial: Partial<Item>) => (
      entries
      .find(i => Object.keys(partial).every(key => i[key as keyof DBItem] === partial[key as keyof DBItem]))
    ),
    delete: async (partial: Partial<Item>, deleteChildren: boolean) => {
      try {
        const { error } = await supabase
          .from('items')
          .delete()
          .eq('id', partial.id)
          .eq('user_id', userId);
        
        if (error) {
          console.error('Error deleting item:', error);
          return;
        }
        
        setEntries(entries.filter(i => i.id !== partial.id));
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    },
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
            const { error: updateError } = await supabase
              .from('items')
              .update(dbItemChanges)
              .eq('id', item.id)
              .eq('user_id', userId);
              
            if (updateError) {
              console.error('Error updating item:', updateError);
              resolve(null);
              return;
            }
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
                const { error: taskDepError } = await supabase
                  .from('task_dependencies')
                  .insert({
                    blocking_task_id: (dep.data as TaskDependencyData).blocking_task_id,
                    blocked_task_id: item.id,
                    user_id: userId
                  });
                if (taskDepError) {
                  console.error('Error adding task dependency:', taskDepError);
                  resolve(null);
                  return;
                }
              } else if (dep.type === 'Date') {
                const { error: dateDepError } = await supabase
                  .from('date_dependencies')
                  .upsert({
                    task_id: item.id,
                    unblock_at: (dep.data as DateDependencyData).unblock_at,
                    user_id: userId
                  });
                if (dateDepError) {
                  console.error('Error adding date dependency:', dateDepError);
                  resolve(null);
                  return;
                }
              }
            }

            // Remove dependencies
            for (const dep of dependenciesToRemove) {
              if (dep.type === 'Task') {
                const { error: taskDepError } = await supabase
                  .from('task_dependencies')
                  .delete()
                  .eq('blocking_task_id', (dep.data as TaskDependencyData).blocking_task_id)
                  .eq('blocked_task_id', item.id)
                  .eq('user_id', userId);
                if (taskDepError) {
                  console.error('Error removing task dependency:', taskDepError);
                  resolve(null);
                  return;
                }
              } else if (dep.type === 'Date') {
                const { error: dateDepError } = await supabase
                  .from('date_dependencies')
                  .delete()
                  .eq('task_id', item.id)
                  .eq('user_id', userId);
                if (dateDepError) {
                  console.error('Error removing date dependency:', dateDepError);
                  resolve(null);
                  return;
                }
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
                affectedItemIds.add((dep.data as TaskDependencyData).blocking_task_id);
              }
            });
          }
          
          // Add items that this item is blocking
          const blockingItems = entries.filter(i => 
            i.blockedBy?.some(dep => 
              dep.type === 'Task' && (dep.data as TaskDependencyData).blocking_task_id === item.id
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
                  if (dep.type === 'Task' && (dep.data as TaskDependencyData).blocking_task_id === item.id) {
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
    userId
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
  const blockedBy: Dependency[] = [
    ...taskDependencies.filter(dep => dep.blocked_task_id === item.id).map(dep => ({
      type: 'Task' as const,
      data: dep
    })),
    ...dateDependencies.filter(dep => dep.task_id === item.id).map(dep => ({
      type: 'Date' as const,
      data: dep
    }))
  ];
  
  const subItems = items.filter(i => i.parent_id === item.id).sort((a, b) => a.position - b.position);
  const blocking = taskDependencies.filter(dep => dep.blocking_task_id === item.id);
  
  const entity = {
    ...item,
    blockedBy,
    isBlocked: blockedBy.length > 0,
    blocking,
    subItems,
    blockedCount: blockedBy.length || blocking.length || 0,
    update: (partial: Partial<Item>) => db.update(entity, partial),
    delete: (deleteChildren: boolean) => db.delete({id: item.id}, deleteChildren),
    create: (partial: Partial<Item>) => db.create(partial),
    entries: (partial: Partial<Item>) => db.entries(partial),
    entry: (partial: Partial<Item>) => db.entry(partial),
  } as Item;
  return entity;
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

export default db;

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