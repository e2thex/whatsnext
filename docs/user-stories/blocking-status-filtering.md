# User Story: Blocking Status Filtering

As a user, I want to be able to filter tasks based on their blocking status so that I can focus on actionable tasks or identify blocked tasks that need dependency resolution.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task Organization |
| Priority | Medium |

## Acceptance Criteria

1. Users can filter tasks based on blocking status (Any, Actionable, Blocked). ✓
2. The filtering UI is intuitive and provides clear visual feedback about the current filter state. ✓
3. Filters can be easily toggled between Any, Actionable, and Blocked states. ✓
4. The filtered view updates instantly when filters are changed. ✓
5. Blocked tasks are clearly identified with visual indicators. ✓

## Non-Functional Requirements

1. Filter controls should be responsive and work on both desktop and mobile devices. ✓
2. Filter state changes should be visually apparent to users. ✓
3. Filter controls should be accessible via keyboard. ✓
4. The UI should use appropriate colors to indicate different statuses (e.g., green for actionable, red for blocked). ✓

## Dependencies

1. Depends on [Tool Bar](tool-bar.md) for UI integration. ✓
2. Depends on the task dependency system.

## Implementation Notes

- Blocking status filter controls have been implemented in the Toolbar component in `app/components/Toolbar.tsx`
- Filtering is applied in the ItemList component
- Blocking status filters include:
  - Any: Show all tasks regardless of blocked status
  - Actionable: Show only tasks that can be completed now (not blocked by dependencies)
  - Blocked: Show only tasks that are blocked by dependencies or date dependencies
- The filters are implemented as a segmented control with color coding for intuitive use
- The implementation considers both task dependencies and date dependencies when determining blocked status

## Related Components

- `app/components/Toolbar.tsx` - Contains the blocking status filter UI controls
- `app/components/ItemList.tsx` - Applies the filters to the task list
- `app/components/Item.tsx` - Displays visual indicators for blocked/actionable status 