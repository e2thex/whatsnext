# User Story: Layout Switching

As a user, I want to be able to switch between different task view layouts (Tree and List views) so that I can visualize and interact with my tasks in the most effective way for my current needs.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task Organization |
| Priority | Medium |

## Acceptance Criteria

1. Users can toggle between Tree view and List view for task visualization. ✓
2. Tree view shows the hierarchical structure of tasks with parent-child relationships clearly visible. ✓
3. List view shows a flattened list of tasks, focusing on actionable items. ✓
4. The current view mode is clearly indicated in the UI. ✓
5. The view preference persists during the user's session. ✓

## Non-Functional Requirements

1. Switching between views should be fast and responsive. ✓
2. Both views should be visually consistent with the overall application design. ✓
3. Layout controls should be accessible via keyboard. ✓

## Dependencies

1. Depends on [Tool Bar](tool-bar.md) for UI integration. ✓
2. Depends on the task data model that supports hierarchical relationships.

## Implementation Notes

- Layout switching has been implemented in the Toolbar component in `app/components/Toolbar.tsx`
- The two layouts are:
  - Tree View: Shows tasks in a hierarchical structure with indentation for child tasks
  - List View: Shows tasks in a flattened list, focusing on actionable items
- The current view is visually indicated with a highlighted button
- View state is managed in the main application state and passed to relevant components

## Related Components

- `app/components/Toolbar.tsx` - Contains the layout switching controls
- `app/components/ItemList.tsx` - Implements the different view layouts 