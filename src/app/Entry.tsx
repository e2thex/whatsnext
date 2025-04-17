import { Item, ItemRow, TaskDependencyRow, DateDependencyRow, DB, Dependency } from "@/app/components/types"
import { Database, supabase } from "../lib/supabase/client"
import { whatChanged } from "../utils/objectUtils"
// Assuming the Item component is missing or incorrectly imported, we'll remove it for now.

export const populateEntries = async (db:DB) => {
    try {
        console.log('Starting to populate entries...');
        const { data: items, error: itemsError } = await supabase
            .from('items')
            .select('*')
            .eq('user_id', db.userId)
        
        console.log('Fetched items:', items?.length || 0);
        
        if (itemsError) {
            console.error('Error fetching items:', itemsError);
            throw new Error(`Failed to fetch items: ${itemsError.message}`);
        }

        const { data: dependenciesData, error: dependenciesError } = await supabase
            .from('task_dependencies')
            .select('*')
            .eq('user_id', db.userId)

        console.log('Fetched task dependencies:', dependenciesData?.length || 0);

        if (dependenciesError) {
            console.error('Error fetching task dependencies:', dependenciesError);
            throw new Error(`Failed to fetch task dependencies: ${dependenciesError.message}`);
        }

        const { data: dateDependenciesData, error: dateDependenciesError } = await supabase
            .from('date_dependencies')
            .select('*')
            .eq('user_id', db.userId)

        console.log('Fetched date dependencies:', dateDependenciesData?.length || 0);

        if (dateDependenciesError) {
            console.error('Error fetching date dependencies:', dateDependenciesError);
            throw new Error(`Failed to fetch date dependencies: ${dateDependenciesError.message}`);
        }

        if (!items) {
            console.log('No items found, setting empty entries array');
            db.setEntries([]);
            return;
        }

        console.log('Creating entities from fetched data...');
        const entries = items.map((item: ItemRow) => entityFactory({
            item, 
            items, 
            taskDependencies: dependenciesData as TaskDependencyRow[], 
            dateDependencies: dateDependenciesData as DateDependencyRow[],
            db: db as unknown as DB
        }))
        console.log('Setting entries:', entries.length);
        db.setEntries(entries);
    } catch (error) {
        console.error('Error in populateEntries:', error);
        throw error;
    }
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
      .filter(i => Object.keys(partial).every(key => i[key as keyof Item] === partial[key as keyof Item]))
    ),
    entry: (partial: Partial<Item>) => (
      entries
      .find(i => Object.keys(partial).every(key => i[key as keyof Item] === partial[key as keyof Item]))
    ),
    delete: async (partial: Partial<Item>, deleteChildren: boolean) => {
      try {
        // TODO: we need to delete all Desendents
        if (deleteChildren) {
          // Get all child items
          const childItems = entries.filter(i => i.parent_id === partial.id);
          
          // Delete all children first
          for (const child of childItems) {
            const { error: childError } = await supabase
              .from('items')
              .delete()
              .eq('id', child.id)
              .eq('user_id', userId);
              
            if (childError) {
              console.error('Error deleting child item:', childError);
              return;
            }
          }
        }
        
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
    update: async (item: Item, updates: Partial<Item>) => {
      try {
        // Handle regular item updates
          // TODO: Refactor into smaller functions:       
          // - handleItemUpdate: Process regular item updates
          // - handleDependencyChanges: Process blockedBy array changes
          // - getAffectedItems: Get all items that need updating
          // - updateLocalState: Update entries array with all changes

        const dbItemChanges = whatChanged(item, updates);
        if (Object.keys(dbItemChanges).length > 0) {
          const { error: updateError } = await supabase
            .from('items')
            .update(dbItemChanges)
            .eq('id', item.id)
            .eq('user_id', userId);
            
          if (updateError) {
            console.error('Error updating item:', updateError);
            return null;
          }
        }

        if (updates.blockedBy !== undefined) {
          const currentDependencies = item.blockedBy || [];
          const newDependencies = updates.blockedBy || [];
          
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

          for (const dep of dependenciesToAdd) {
            if (dep.type === 'Task') {
              const { error: taskDepError } = await supabase
                .from('task_dependencies')
                .insert({
                  blocking_task_id: (dep.data as TaskDependencyRow).blocking_task_id,
                  blocked_task_id: item.id,
                  user_id: userId
                });
              if (taskDepError) {
                console.error('Error adding task dependency:', taskDepError);
                return null;
              }
            } else if (dep.type === 'Date') {
              const { error: dateDepError } = await supabase
                .from('date_dependencies')
                .upsert({
                  task_id: item.id,
                  unblock_at: (dep.data as DateDependencyRow).unblock_at,
                  user_id: userId
                });
              if (dateDepError) {
                console.error('Error adding date dependency:', dateDepError);
                return null;
              }
            }
          }

          for (const dep of dependenciesToRemove) {
            if (dep.type === 'Task') {
              const { error: taskDepError } = await supabase
                .from('task_dependencies')
                .delete()
                .eq('blocking_task_id', (dep.data as TaskDependencyRow).blocking_task_id)
                .eq('blocked_task_id', item.id)
                .eq('user_id', userId);
              if (taskDepError) {
                console.error('Error removing task dependency:', taskDepError);
                return null;
              }
            } else if (dep.type === 'Date') {
              const { error: dateDepError } = await supabase
                .from('date_dependencies')
                .delete()
                .eq('task_id', item.id)
                .eq('user_id', userId);
              if (dateDepError) {
                console.error('Error removing date dependency:', dateDepError);
                return null;
              }
            }
          }
        }

        const updatedItem = { ...item, ...updates };
        const affectedItemIds = new Set<string>();
        affectedItemIds.add(item.id);
        
        if (updates.blockedBy) {
          updates.blockedBy.forEach(dep => {
            if (dep.type === 'Task') {
              affectedItemIds.add((dep.data as TaskDependencyRow).blocking_task_id);
            }
          });
        }
        
        const blockingItems = entries.filter(i => 
          i.blockedBy?.some(dep => 
            dep.type === 'Task' && (dep.data as TaskDependencyRow).blocking_task_id === item.id
          )
        );
        blockingItems.forEach(i => affectedItemIds.add(i.id));

        setEntries(entries.map(i => {
          if (i.id === item.id) {
            return updatedItem;
          } else if (affectedItemIds.has(i.id)) {
            return {
              ...i,
              blockedBy: i.blockedBy?.map(dep => {
                if (dep.type === 'Task' && (dep.data as TaskDependencyRow).blocking_task_id === item.id) {
                  return { ...dep, data: { ...dep.data } };
                }
                return dep;
              })
            };
          }
          return i;
        }));

        return updatedItem;
      } catch (error) {
        console.error('Error updating item:', error);
        return null;
      }
    },
    setEntries,
    userId
  }
  return db;
}

const entityFactory = ({item, items, taskDependencies, dateDependencies, db}: {item: ItemRow, items: ItemRow[], taskDependencies: TaskDependencyRow[], dateDependencies: DateDependencyRow[], db: DB}):Item => {
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

export default db;