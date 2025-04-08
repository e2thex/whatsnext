# User Story: Focus on Item

As a user, I want to focus on a single item and its children by clicking on something near it so that I can work without distraction.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task Organization |
| Priority | High |

## Acceptance Criteria

1. Each item has a focus button that, when clicked, shows only that item and its descendants
2. When an item is focused, a breadcrumb navigation appears to show the path to the focused item
3. Users can navigate back up the hierarchy by clicking on any item in the breadcrumb path
4. Focus mode works in both tree view and list view
5. In tree view, only the focused item and its direct children are shown
6. In list view, only bottom-level tasks under the focused item are shown
7. Search functionality still works while in focus mode
8. The current filtering settings (actionable/blocked/completion) are preserved when focusing

## Non-Functional Requirements

1. Focus transition should be smooth and clear to the user
2. Breadcrumb navigation should be intuitive and easy to use
3. Focus button should be easily discoverable
4. Performance should not degrade when focusing on items with many descendants

## Dependencies

1. Item hierarchy implementation
2. Tree and list view implementations
3. Navigation system
4. Breadcrumb component

## Implementation Notes

### Focus Button
- Implemented a magnifying glass icon button in each item's action bar
- When clicked, it calls the `onFocus` function with the item's ID

### Breadcrumb Navigation
- Created a `Breadcrumb` component that displays the ancestry chain of the focused item
- Uses `getItemAncestry` function to retrieve the full path to the focused item
- Each item in the breadcrumb is clickable and calls `onFocus` with that item's ID when clicked
- Breadcrumbs are only displayed when an item is focused and not during search

### Tree View Implementation
- Modified `renderTreeView` function to start rendering from the focused item instead of the root
- When an item is focused, `renderTreeView` is called with the focused item ID as the parent
- This ensures only the focused item and its descendants are rendered

### List View Implementation
- Implemented `getBottomLevelTasksUnderParent` function that finds all bottom-level tasks under a given parent
- When focus is active, list view shows only bottom-level tasks under the focused item
- Uses a breadth-first search algorithm to find all bottom-level descendants efficiently

### Search Integration
- Search functionality still operates while in focus mode
- Search results are still properly filtered to show only matching items and their lineage
- Bottom-level task filtering is maintained during search in list view

### State Management
- Focus state is maintained in the `focusedItemId` state variable
- Clicking the focus button for an item sets this state
- Clicking on a breadcrumb item updates this state
- Setting focus to `null` returns to viewing all items 