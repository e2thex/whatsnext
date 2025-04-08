# User Story: Manual Type Override

As a user, I want to be able to manually set or change an item's type through an intuitive dropdown menu, regardless of its hierarchy position, so I can properly categorize my tasks as my planning evolves.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task Hierarchy |
| Priority | Medium |

## Acceptance Criteria

1. Each item has an accessible option to manually set its type
2. Users can choose from the same set of types used in automatic typing (Task, Mission, Objective, Ambition)
3. Manually set types persist even when an item's position in the hierarchy changes
4. Manually set types are visually distinguished from automatically determined types
5. Users can reset a manually set type back to automatic determination
6. The type selection interface is intuitive and easy to use
7. Type changes are immediately reflected in the UI
8. Manual type settings persist across sessions and page refreshes

## Non-Functional Requirements

1. Type selection UI should be unobtrusive and accessible
2. Switching between manual and automatic typing should be seamless
3. Visual distinction between manual and auto types should be clear but subtle
4. Type changing operations should be responsive with immediate feedback

## Dependencies

1. Automatic type determination system
2. UI components for type selection
3. Data persistence for manual type settings

## Implementation Notes

### Type Selection Interface
- Implemented a dropdown menu accessible by clicking on an item's type icon
- Menu displays all available type options plus an "Auto" option to revert to automatic determination
- Currently selected type is highlighted in the dropdown
- Menu appears in a contextually appropriate position near the type icon

### Visual Distinction
- Manually set types are indicated with a ring around the type icon
- The icon and color scheme remains consistent with automatic typing for the same type
- A tooltip shows whether the type is "Manual" or "Auto" on hover

### Data Persistence
- A `manual_type` field in the database stores the user-selected type
- When `manual_type` is null, the system falls back to automatic type determination
- When displaying an item, the system first checks for a manual type before calculating the automatic type

### Type Recalculation Logic
- The `effectiveType` is calculated by:
  1. First checking if `manual_type` is set and using that value if present
  2. Otherwise calculating the type based on hierarchy position
- This ensures that manual types take precedence but automatic types are always available

### User Experience Considerations
- Type changes are applied immediately without requiring a save action
- The dropdown closes automatically after selection
- Clicking outside the dropdown cancels the selection operation
- The visual treatment of the type icon updates instantly upon selection 