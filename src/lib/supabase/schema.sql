-- Drop existing objects
drop trigger if exists update_item_type_trigger on items;
drop function if exists update_item_type();
drop function if exists get_item_depth();
drop function if exists get_descendants();
drop table if exists task_dependencies;
drop table if exists date_dependencies;
drop table if exists items;
drop type if exists item_type;

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Create enum for item types
create type item_type as enum ('Task', 'Mission', 'Objective', 'Ambition');

-- Create items table
create table items (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  description text,
  parent_id uuid references items(id) on delete cascade,
  position integer not null default 0,
  completed boolean not null default false,
  completed_at timestamp with time zone,
  user_id uuid references auth.users(id),
  type item_type,
  manual_type boolean not null default false
);

-- Create task dependencies table
create table task_dependencies (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  blocking_task_id uuid references items(id) on delete cascade not null,
  blocked_task_id uuid references items(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  constraint task_dependencies_unique unique (blocking_task_id, blocked_task_id),
  constraint no_self_blocking check (blocking_task_id != blocked_task_id)
);

-- Create table for date-based dependencies
create table date_dependencies (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  task_id uuid references items(id) on delete cascade not null,
  unblock_at timestamp with time zone not null,
  user_id uuid references auth.users(id) not null,
  constraint date_dependencies_unique unique (task_id)
);

-- Create indexes for task dependencies
create index task_dependencies_blocking_task_id_idx on task_dependencies(blocking_task_id);
create index task_dependencies_blocked_task_id_idx on task_dependencies(blocked_task_id);
create index task_dependencies_user_id_idx on task_dependencies(user_id);

-- Create indexes for date dependencies
create index date_dependencies_task_id_idx on date_dependencies(task_id);
create index date_dependencies_user_id_idx on date_dependencies(user_id);
create index date_dependencies_unblock_at_idx on date_dependencies(unblock_at);

-- Add RLS policies for task dependencies
alter table task_dependencies enable row level security;

create policy "Users can view their own task dependencies"
  on task_dependencies for select
  using (auth.uid() = user_id);

create policy "Users can insert their own task dependencies"
  on task_dependencies for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own task dependencies"
  on task_dependencies for update
  using (auth.uid() = user_id);

create policy "Users can delete their own task dependencies"
  on task_dependencies for delete
  using (auth.uid() = user_id);

-- Add RLS policies for date dependencies
alter table date_dependencies enable row level security;

create policy "Users can view their own date dependencies"
  on date_dependencies for select
  using (auth.uid() = user_id);

create policy "Users can insert their own date dependencies"
  on date_dependencies for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own date dependencies"
  on date_dependencies for update
  using (auth.uid() = user_id);

create policy "Users can delete their own date dependencies"
  on date_dependencies for delete
  using (auth.uid() = user_id);

-- Function to check for circular dependencies
create or replace function check_circular_dependency(blocking_id uuid, blocked_id uuid)
returns boolean
language plpgsql
as $$
declare
  is_circular boolean;
begin
  with recursive dependency_chain as (
    -- Base case: direct dependencies
    select td.blocking_task_id, td.blocked_task_id, 1 as depth
    from task_dependencies td
    where td.blocked_task_id = blocking_id
    
    union all
    
    -- Recursive case: dependencies of dependencies
    select td.blocking_task_id, td.blocked_task_id, dc.depth + 1
    from task_dependencies td
    inner join dependency_chain dc on td.blocked_task_id = dc.blocking_task_id
    where depth < 100 -- Prevent infinite recursion
  )
  select exists(
    select 1 from dependency_chain where blocking_task_id = blocked_id
  ) into is_circular;
  
  return is_circular;
end;
$$;

-- Trigger to prevent circular dependencies
create or replace function prevent_circular_dependency()
returns trigger
language plpgsql
as $$
begin
  if check_circular_dependency(NEW.blocking_task_id, NEW.blocked_task_id) then
    raise exception 'Circular dependency detected';
  end if;
  return NEW;
end;
$$;

create trigger prevent_circular_dependency_trigger
before insert or update on task_dependencies
for each row
execute function prevent_circular_dependency();

-- Create index for faster hierarchical queries
create index items_parent_id_idx on items(parent_id);

-- Create index for user's items
create index items_user_id_idx on items(user_id);

-- Add index for efficient ordering queries
create index items_parent_position_idx on items(parent_id, position);

-- Add RLS policies for items
alter table items enable row level security;

create policy "Users can view their own items"
  on items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own items"
  on items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own items"
  on items for update
  using (auth.uid() = user_id);

create policy "Users can delete their own items"
  on items for delete
  using (auth.uid() = user_id);

-- Function to calculate the depth of an item's subtree
create or replace function get_item_depth(item_id uuid)
returns integer
language plpgsql
as $$
declare
  max_depth integer;
begin
  with recursive item_tree as (
    -- Base case: direct children (depth 1)
    select id, 1 as depth
    from items
    where parent_id = item_id
    
    union all
    
    -- Recursive case: children of children
    select i.id, t.depth + 1
    from items i
    inner join item_tree t on i.parent_id = t.id
  )
  select coalesce(max(depth), 0) into max_depth from item_tree;
  
  return max_depth;
end;
$$;

-- Function to update item type based on its position in the hierarchy
create or replace function update_item_type()
returns trigger
language plpgsql
as $$
declare
  depth integer;
  is_root boolean;
begin
  -- Skip if type is manually set
  if NEW.manual_type then
    return NEW;
  end if;

  -- Check if item is a root item (no parent)
  select NEW.parent_id is null into is_root;
  
  -- Get the depth of the item's subtree
  select get_item_depth(NEW.id) into depth;
  
  -- Set type based on depth and root status
  NEW.type := case
    when is_root then 'Ambition'
    when depth = 0 then 'Task'
    when depth = 1 then 'Mission'
    when depth >= 2 then 'Objective'
  end;
  
  return NEW;
end;
$$;

-- Trigger to automatically update item types
create trigger update_item_type_trigger
before insert or update of parent_id
on items
for each row
execute function update_item_type();

-- Function to get all descendants of an item
create or replace function get_descendants(item_id uuid)
returns table (id uuid, level int)
language plpgsql
as $$
begin
  return query
  with recursive descendants as (
    -- base case: direct children
    select i.id, 1 as level
    from items i
    where i.parent_id = item_id
    
    union all
    
    -- recursive case: children of children
    select i.id, d.level + 1
    from items i
    inner join descendants d on i.parent_id = d.id
  )
  select * from descendants;
end;
$$; 