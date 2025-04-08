# User Story: Task Filtering

As a user, I want to be able to filter tasks based on their status (actionable, blocked, completion) so that I can focus on what I can work on right now.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task Filtering |
| Priority | High |

## Acceptance Criteria

1. Users can filter to show only actionable (unblocked) tasks
2. Users can filter to show only blocked tasks
3. Users can filter to show all tasks regardless of blocked status
4. Users can toggle between viewing all tasks, only completed tasks, or only uncompleted tasks
5. Uncompleted tasks are the default view
6. Filters work in both tree view and list view
7. Filters persist across page refreshes
8. Filters are applied consistently across the application
9. Filter controls are clearly visible and easy to use
10. Users can combine filters (e.g., show only actionable and uncompleted tasks)

## Non-Functional Requirements

1. Filter controls should be intuitive and accessible
2. Filtering operations should be fast and responsive
3. The UI should clearly indicate when filters are active
4. Filter state should be efficiently managed to prevent unnecessary re-renders

## Dependencies

1. Task hierarchy implementation
2. Task dependency system
3. Task completion system
4. UI components for filter controls

## Implementation Notes

### Filter Controls
- Implemented filter toggles in the application header for:
  - Actionable/Blocked status (All, Actionable Only, Blocked Only)
  - Completion status (All, Completed Only, Uncompleted Only)
- Controls use a toggle button group design for intuitive interaction
- Active filters are visually highlighted to show current state
- Filter state is stored using React state and persisted to localStorage

### Filtering Logic
- Filters are applied at the item level during the rendering process
- Tree view filtering uses a multi-pass approach:
  1. First filter by search terms if search is active
  2. Then filter by blocked/actionable status
  3. Finally filter by completion status
- List view applies the same filters but only to bottom-level tasks
- Items that don't match the filter criteria are completely removed from the view, not just hidden

### Actionable Task Filtering
- A task is considered "actionable" if it has no blocking dependencies or if all dependencies are satisfied
- The `isItemBlocked` function determines if a task is blocked based on:
  1. Task dependencies (other tasks that must be completed first)
  2. Date dependencies (time-based dependencies)
  3. Whether all of its subtasks are blocked (if a parent has only blocked children, it's also blocked)
- Actionable filter mode hides all blocked tasks to focus on what can be worked on now

### Completion Filtering
- Completion filtering is based on the `completed` property of each task
- The uncompleted filter (default) shows only tasks that haven't been marked as complete
- The completed filter shows only tasks that have been marked as complete
- The "all" option shows both completed and uncompleted tasks

### Combined Filtering
- Users can combine both filter types (e.g., show only actionable and uncompleted tasks)
- Filter combinations are applied with AND logic (items must satisfy all filter criteria)
- The UI clearly indicates when multiple filters are active
- The same filtering logic works consistently across tree and list views 