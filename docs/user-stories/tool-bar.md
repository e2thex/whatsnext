# User Story: Tool Bar

As a user, I want to have quick access to features that affect the display of items, including layout, filters, and search functionality, so that I can efficiently manage my tasks.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task Organization |
| Priority | Medium |

## Acceptance Criteria

1. The Tool Bar includes controls for layout adjustments, filtering options, and search functionality.
2. The design of the Tool Bar is clean and modern, ensuring all controls are consistent and visually engaging.
3. The Tool Bar is accessible and can be navigated using a keyboard.
4. The Tool Bar is responsive and functions well on mobile devices.

## Non-Functional Requirements

1. The Tool Bar must be visually appealing and maintain a modern aesthetic.
2. All controls should be consistent in design and behavior.

## Dependencies

1. Future user stories will depend on the implementation of the Tool Bar for specific functionalities.

## Implementation Notes

- The Tool Bar has been implemented as a React component in `app/components/Toolbar.tsx`
- The Toolbar provides:
  - A visual toggle for switching between Tree and List views
  - Segmented controls for filtering by completion status (All/Todo/Done)
  - Segmented controls for filtering by task status (Any/Actionable/Blocked)
  - Search functionality with keyboard shortcuts (/ to focus, Esc to clear)
  - An "Add Task" button
- The component is responsive, with appropriate adaptations for mobile devices
- Keyboard accessibility has been implemented for all features

## Related Components
