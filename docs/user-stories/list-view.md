# User Story: List View

As a user, I want to be able to toggle to a list view, which shows only bottom level items, but has their breadcrumbs, so that I can review all of the actionable tasks.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task Organization |
| Priority | Medium |

## Acceptance Criteria

1. Users can toggle between tree view and list view with a clearly visible control
2. List view shows only bottom-level tasks (tasks with no children)
3. Each task in list view displays breadcrumb navigation showing its location in the hierarchy
4. Breadcrumbs are clickable to allow quick navigation to parent items
5. List view tasks are sorted in a logical manner based on their hierarchy
6. List view respects the current filtering settings (actionable, blocked, completion)
7. List view works with search functionality
8. Tasks in list view maintain all their interactive capabilities (completion, editing, dependencies)
9. The list view preference persists across sessions
10. Users can add new tasks from within list view

## Non-Functional Requirements

1. List view should load efficiently even with large numbers of tasks
2. The transition between views should be smooth and responsive
3. The view toggle control should be intuitive and accessible
4. Breadcrumb navigation should be clear and not overly consume screen space

## Dependencies

1. Task hierarchy implementation
2. Breadcrumb component
3. Task filtering system
4. View state management

## Implementation Notes

### View Toggle
- Implemented a view toggle control in the application header
- Toggle switches between "Tree" and "List" views
- The active view is visually highlighted
- View preference is stored in state and persists across sessions

### List View Algorithm
- Developed filtering logic to identify bottom-level tasks (those without children)
- Created a `getBottomLevelTasks` function that efficiently filters the task set
- When focus is active, implemented a `getBottomLevelTasksUnderParent` function to find only bottom-level descendants of the focused item
- Ensures that the focused item itself is shown if it has no children

### Breadcrumb Integration
- Each task in list view shows its full ancestry as breadcrumbs
- Breadcrumb implementation uses the `getItemAncestry` function to build the path
- Each breadcrumb is clickable and navigates to focus on that ancestor
- Breadcrumbs are clipped if too long, focusing on the most relevant parts of the path

### Sorting and Organization
- List view items are sorted based on their position within their hierarchy
- The algorithm first sorts by ancestry path and then by position within siblings
- This ensures that related tasks appear together in the list
- The sort logic handles tasks at different depths appropriately

### Performance Considerations
- List view calculations are optimized to handle large task sets efficiently
- Bottom-level task filtering uses efficient data structures
- Ancestry calculations are optimized to prevent redundant processing
- Rendering of long lists is optimized to maintain responsiveness 