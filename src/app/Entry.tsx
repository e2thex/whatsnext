import { Item, ItemRow, TaskDependencyRow, DateDependencyRow, DB, Dependency, PartialItem } from "@/app/components/types"
import { Database, supabase } from "../lib/supabase/client"
import { whatChanged } from "../utils/objectUtils"
import { useState, useCallback, useEffect } from 'react'
// Assuming the Item component is missing or incorrectly imported, we'll remove it for now.

const populateEntries = async (db:DB, userId: string) => {
    try {
        console.log('Starting to populate entries...');
        const { data: items, error: itemsError } = await supabase
            .from('items')
            .select('*')
            .eq('user_id', userId)
        
        console.log('Fetched items:', items?.length || 0);
        
        if (itemsError) {
            console.error('Error fetching items:', itemsError);
            throw new Error(`Failed to fetch items: ${itemsError.message}`);
        }

        const { data: dependenciesData, error: dependenciesError } = await supabase
            .from('task_dependencies')
            .select('*')
            .eq('user_id', userId)

        console.log('Fetched task dependencies:', dependenciesData?.length || 0);

        if (dependenciesError) {
            console.error('Error fetching task dependencies:', dependenciesError);
            throw new Error(`Failed to fetch task dependencies: ${dependenciesError.message}`);
        }

        const { data: dateDependenciesData, error: dateDependenciesError } = await supabase
            .from('date_dependencies')
            .select('*')
            .eq('user_id', userId)

        console.log('Fetched date dependencies:', dateDependenciesData?.length || 0);

        if (dateDependenciesError) {
            console.error('Error fetching date dependencies:', dateDependenciesError);
            throw new Error(`Failed to fetch date dependencies: ${dateDependenciesError.message}`);
        }

        if (!items) {
            console.log('No items found, setting empty entries array');
            console.log('Setting entries empty:', []);
            db.setEntries([]);
            db.setEntriesTreeMap(new Map());
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
        const entriesTreeMap = new Map<string, Item[]>();
        entries.forEach(item => {
            const parentId = item.core.parent_id || 'null';
            entriesTreeMap.set(parentId, [...(entriesTreeMap.get(parentId) || []), item]);
        })
        console.log('Setting entries:', entries.length);
        db.setEntries(entries);
        db.setEntriesTreeMap(entriesTreeMap);
    } catch (error) {
        console.error('Error in populateEntries:', error);
        throw error;
    }
}

export const useDb = (): DB => {
  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Item[]>([]);
  const [entriesTreeMap, setEntriesTreeMap] = useState<Map<string, Item[]>>(new Map());

  const updateEntriesTreeMap = useCallback((newEntries: Item[]) => {
    const newEntriesTreeMap = new Map<string, Item[]>();
    newEntries.forEach(item => {
      const parentId = item.core.parent_id || 'null';
      newEntriesTreeMap.set(parentId, [...(newEntriesTreeMap.get(parentId) || []), item]);
    });
    setEntriesTreeMap(newEntriesTreeMap);
  }, []);

  // Initialize the database by populating entries
  //useEffect(() => {
    // if (!userId) {
    //   console.log('No userId provided, skipping populateEntries');
    //   //setEntries([]);
    //   //setEntriesTreeMap(new Map());
    //   return;
    // }
    
    //populateEntries(dbInstance as unknown as DB).catch(error => {
    //  console.error('Failed to initialize database:', error);
    //});
  //}, [userId]);

  // if (!userId) {
  //   return null;
  // }

  const dbInstance = {
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
          items: entries.map(e => e.core), 
          taskDependencies: [], 
          dateDependencies: [],
          db: dbInstance as unknown as DB
        });
        console.log('Setting entries:', [...entries, newItem]);
        setEntries([...entries, newItem]);
        updateEntriesTreeMap([...entries, newItem]);
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
          const childItems = entries.filter(i => i.core.parent_id === partial.core?.id);
          
          // Delete all children first
          for (const child of childItems) {
            const { error: childError } = await supabase
              .from('items')
              .delete()
              .eq('id', child.core.id)
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
          .eq('id', partial.core?.id)
          .eq('user_id', userId);
          
        if (error) {
          console.error('Error deleting item:', error);
          return;
        }
        
        const newEntries = entries.filter(i => i.core.id !== partial.core?.id);
        console.log('Setting entries:', newEntries);
        setEntries(newEntries);
        updateEntriesTreeMap(newEntries);
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    },
    setUser: (id: string) => {
      setUserId(id);
    },
    populateEntries: async (userId: string) => {
      setUserId(userId)
      populateEntries(dbInstance as unknown as DB, userId).catch(error => {
        console.error('Failed to initialize database:', error);
      });
    },
    update: async (item: Item, updates: PartialItem) => {
      console.log('Starting update operation');
      console.log('Current entries state:', {
        length: entries.length,
        ids: entries.map(e => e.core.id),
        itemToUpdate: item.core.id,
        entries: item.entries({})
      });
      console.log('Updates to apply:', updates);
      
      try {
        // Handle regular item updates
          // TODO: Refactor into smaller functions:       
          // - handleItemUpdate: Process regular item updates
          // - handleDependencyChanges: Process blockedBy array changes
          // - getAffectedItems: Get all items that need updating
          // - updateLocalState: Update entries array with all changes

        const dbItemChanges = {...item.core, ...updates.core};
        console.log('DB changes to apply Core:', dbItemChanges);
        console.log('DB changes to apply Core for', {id: item.core.id,userId});
         
        if (Object.keys(dbItemChanges).length > 0) {
          const { error: updateError } = await supabase
            .from('items')
            .update(dbItemChanges)
            .eq('id', item.core.id)
            .eq('user_id', userId);
            
          if (updateError) {
            console.error('Error updating item:', updateError);
            return null;
          }
        }

        const updatedBlockedBy = updates.blockedBy !== undefined ? await updateBlockedBy({currentDependencies: item.blockedBy || [], newDependencies: updates.blockedBy , userId}) : item.blockedBy;

        const updatedItem = { ...item, core: { ...item.core, ...updates.core }, blockedBy: updatedBlockedBy };
        console.log('Created updated item:', updatedItem);
        const newEntries = entries.map(i => i.core.id === item.core.id ? updatedItem : i);
        
        // const affectedItemIds = new Set<string>();
        // affectedItemIds.add(item.core.id);
        
        // if (updates.blockedBy) {
        //   updates.blockedBy.forEach(dep => {
        //     if (dep.type === 'Task') {
        //       affectedItemIds.add((dep.data as TaskDependencyRow).blocking_task_id);
        //     }
        //   });
        // }
        
        // const blockingItems = entries.filter(i => 
        //   i.blockedBy?.some(dep => 
        //     dep.type === 'Task' && (dep.data as TaskDependencyRow).blocking_task_id === item.core.id
        //   )
        // );
        // blockingItems.forEach(i => affectedItemIds.add(i.core.id));

        // console.log('Affected item IDs:', Array.from(affectedItemIds));

        // const newEntries = entries.map(i => {
        //   if (i.core.id === item.core.id) {
        //     return updatedItem;
        //   } else if (affectedItemIds.has(i.core.id)) {
        //     return {
        //       ...i,
        //       blockedBy: i.blockedBy?.map(dep => {
        //         if (dep.type === 'Task' && (dep.data as TaskDependencyRow).blocking_task_id === item.core.id) {
        //           return { ...dep, data: { ...dep.data } };
        //         }
        //         return dep;
        //       })
        //     };
        //   }
        //   return i;
        // });

        // console.log('New entries state:', {
        //   length: newEntries.length,
        //   ids: newEntries.map(e => e.core.id)
        // });
        console.log('New entries state:', newEntries);
        setEntries(newEntries);
        updateEntriesTreeMap(newEntries);

        return updatedItem;
      } catch (error) {
        console.error('Error in update operation:', error);
        return null;
      }
    },
    setEntries,
    entriesTreeMap,
    setEntriesTreeMap,
    userId
  }

  return dbInstance;
}

// THis function will review all of the newDependeincs, if they update a currentDependancy it will make a call to supabase to update the dependency
// If it is a new dependency it will make a call to supabase to create the dependency,
// If it is a removed dependency it will make a call to supabase to delete the dependency
// It will return the updated dependencies including any new dependencies ids that were created but the query to supabase has not yet returned.
const updateBlockedBy = async ({currentDependencies, newDependencies, userId}: {currentDependencies: Dependency[], newDependencies: Dependency[], userId: string}): Promise<Dependency[]> => {
  // First, identify which dependencies need to be updated, created, or deleted
  const dependenciesToUpdate = newDependencies.filter(newDep => 
    currentDependencies.some(currentDep => 
      currentDep.type === newDep.type && 
      currentDep.data.id === newDep.data.id
    )
  );

  const dependenciesToCreate = newDependencies.filter(newDep => 
    !currentDependencies.some(currentDep => 
      currentDep.type === currentDep.type && 
      currentDep.data.id === newDep.data.id
    )
  );

  const dependenciesToDelete = currentDependencies.filter(currentDep => 
    !newDependencies.some(newDep => 
      newDep.type === currentDep.type && 
      newDep.data.id === currentDep.data.id
    )
  );

  // Update existing dependencies and collect the updated ones
  const updatedDependencies: Dependency[] = [];
  for (const dep of dependenciesToUpdate) {
    if (dep.type === 'Task') {
      const { data, error } = await supabase
        .from('task_dependencies')
        .update({
          blocking_task_id: (dep.data as TaskDependencyRow).blocking_task_id,
          blocked_task_id: (dep.data as TaskDependencyRow).blocked_task_id,
          user_id: userId
        })
        .eq('id', dep.data.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating task dependency:', error);
        throw error;
      }

      updatedDependencies.push({
        type: 'Task',
        data: data as TaskDependencyRow
      });
    } else if (dep.type === 'Date') {
      const { data, error } = await supabase
        .from('date_dependencies')
        .update({
          task_id: (dep.data as DateDependencyRow).task_id,
          unblock_at: (dep.data as DateDependencyRow).unblock_at,
          user_id: userId
        })
        .eq('id', dep.data.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating date dependency:', error);
        throw error;
      }

      updatedDependencies.push({
        type: 'Date',
        data: data as DateDependencyRow
      });
    }
  }

  // Create new dependencies
  const createdDependencies: Dependency[] = [];
  for (const dep of dependenciesToCreate) {
    if (dep.type === 'Task') {
      const { data, error } = await supabase
        .from('task_dependencies')
        .insert({
          blocking_task_id: (dep.data as TaskDependencyRow).blocking_task_id,
          blocked_task_id: (dep.data as TaskDependencyRow).blocked_task_id,
          user_id: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating task dependency:', error);
        throw error;
      }

      createdDependencies.push({
        type: 'Task',
        data: data as TaskDependencyRow
      });
    } else if (dep.type === 'Date') {
      const { data, error } = await supabase
        .from('date_dependencies')
        .insert({
          task_id: (dep.data as DateDependencyRow).task_id,
          unblock_at: (dep.data as DateDependencyRow).unblock_at,
          user_id: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating date dependency:', error);
        throw error;
      }

      createdDependencies.push({
        type: 'Date',
        data: data as DateDependencyRow
      });
    }
  }

  // Delete removed dependencies
  for (const dep of dependenciesToDelete) {
    if (dep.type === 'Task') {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('id', dep.data.id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting task dependency:', error);
        throw error;
      }
    } else if (dep.type === 'Date') {
      const { error } = await supabase
        .from('date_dependencies')
        .delete()
        .eq('id', dep.data.id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting date dependency:', error);
        throw error;
      }
    }
  }

  // Return the updated dependencies
  // First, get all current dependencies that weren't updated or deleted
  const unchangedDependencies = currentDependencies.filter(dep => 
    !dependenciesToUpdate.some(toUpdate => 
      toUpdate.type === dep.type && 
      toUpdate.data.id === dep.data.id
    ) && 
    !dependenciesToDelete.some(toDelete => 
      toDelete.type === dep.type && 
      toDelete.data.id === dep.data.id
    )
  );

  // Combine unchanged, updated, and newly created dependencies
  return [
    ...unchangedDependencies,
    ...updatedDependencies,
    ...createdDependencies
  ];
};

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
    core: item,
    blockedBy,
    isBlocked: blockedBy.length > 0,
    blocking,
    subItems,
    blockedCount: blockedBy.length || blocking.length || 0,
    update: (partial: PartialItem) => db.update(entity, partial),
    delete: (deleteChildren: boolean) => db.delete({core: {id: item.id}}, deleteChildren),
    create: (partial: PartialItem) => db.create(partial),
    entries: (partial: Partial<ItemRow>) => db.entries(partial),
    entry: (partial: Partial<ItemRow>) => db.entry(partial),
  } as Item;
  return entity;
}

export default useDb;