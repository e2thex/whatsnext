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
3. The Tool Bar should adapt gracefully across different screen sizes.

## Dependencies

1. Future user stories will depend on the implementation of the Tool Bar for specific functionalities.

## Implementation Notes

- The Tool Bar has been implemented as a React component in `app/components/Toolbar.tsx`
- The Toolbar provides:
  - A visual toggle for switching between Tree and List views
  - Segmented controls for filtering by completion status (All/Todo/Done)
  - Segmented controls for filtering by task status (Any/Actionable/Blocked/Blocking)
  - Search functionality with keyboard shortcuts (/ to focus, Esc to clear)
- The component is responsive with four distinct breakpoint behaviors:
  - SM (< 768px): Single filter menu with all options organized in sections
  - MD (768px - 1024px): Individual dropdowns for each filter group, showing only icons
  - LG (1024px - 1280px): Individual dropdowns with both icons and text
  - XL (≥ 1280px): All buttons visible with concise labels and icons, no dropdowns
- Each view maintains consistent functionality while adapting to screen size:
  - Icons are always visible for quick recognition
  - Text labels are progressively added as screen size increases
  - Dropdown menus are replaced with direct buttons at XL breakpoint
  - Color coding is maintained across all views (green for actionable, red for blocked, yellow for blocking)
- Keyboard accessibility has been implemented for all features
- Tooltips are provided for all buttons to ensure clarity of function

## Related Components
- @src/app/components/Toolbar.tsx
