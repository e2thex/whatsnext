# User Story: Task Type Management

As a user, I can see, manipulate, and organize tasks by their type, so that I can better organize complicated tasks.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✗ |
| Epic | Task Organization |
| Priority | High |

## Acceptance Criteria

1. Task types are automatically assigned based on hierarchical position:
   - Top-level items are Ambitions
   - Bottom-level items are Tasks
   - Items with only children are Missions
   - All other items are Objectives

2. Users can override automatic type assignment:
   - Users can manually set any type for any task
   - Users can revert to automatic type assignment
   - Type changes are immediately reflected in the UI

3. Task types are visible in all views:
   - Each task displays an icon representing its type
   - Icons have tooltips showing the type name
   - Types are visible in both List and Tree views

4. Users can filter tasks by type:
   - Filter controls are available in the toolbar
   - Multiple types can be selected for filtering
   - Filter state is preserved across view changes
   - When filter changes, task expansion states reset to their default values

5. Users can control subtask expansion by type:
   - Expansion settings can be configured per type
   - Settings persist across sessions
   - Default expansion state is configurable
   - Local expansion state is preserved until filter changes
   - When filter changes, expansion states reset to type-based defaults

## Non-Functional Requirements

1. Type assignment rules must be consistently applied
2. Type changes must be immediately reflected in the UI
3. Type information must be preserved across sessions
4. The interface must be intuitive and discoverable
5. Expansion state changes must be responsive and smooth

## Dependencies

1. Task List View
2. Task Tree View
3. Toolbar Filtering System

## Implementation Notes

- Task types will be implemented as an enum in the data model
- Type icons will be displayed after the task title
- Type tooltips will show on hover
- Type selection will be available via dropdown on icon click
- Type filtering will be integrated into the existing toolbar filter system
- Automatic type assignment will be recalculated on:
  - Task creation
  - Task movement
  - Task deletion
  - Parent-child relationship changes
- Expansion state management:
  - Each task maintains a local expansion state
  - Local state overrides default type-based expansion
  - Filter changes reset local state to type-based defaults
  - Default expansion is determined by task type and filter settings

## Related Components
- @src/app/components/TaskList.tsx
- @src/app/components/TaskTree.tsx
- @src/app/components/Toolbar.tsx
- @src/app/contexts/FilterContext.tsx 