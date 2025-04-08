# Task Type Filtering

## User Story
As a user, I want to be able to filter tasks by type so that I can focus on specific levels of work.

## Acceptance Criteria
- Users can filter to show only Tasks, Missions, Objectives, or Ambitions
- Filter controls are easily accessible in the main UI
- Multiple type filters can be applied simultaneously
- Filter state is preserved during the session
- Filtered views maintain hierarchy relationships where applicable
- The current filters are clearly indicated in the UI
- Users can quickly clear all filters to return to the default view

## Implementation Details
- Filter controls will be added to the top navigation area
- Each task type will have a toggle button with its corresponding icon
- Active filters will be highlighted visually
- When filtering by type, the following rules apply:
  - When viewing only Tasks: Show only bottom-level items with no children
  - When viewing only Missions: Show items with exactly one level of children
  - When viewing only Objectives: Show items with two or more levels of children
  - When viewing only Ambitions: Show only top-level items
- A "Clear filters" button will reset all type filters
- Filter settings will be stored in local state and preserved during navigation
- The count of items for each type will be displayed next to filter controls

## Technical Approach
- Implement filter controls using accessible toggle buttons
- Create filter logic that works with the existing task hierarchy model
- Optimize filtering to maintain performance with large task sets
- Use URL parameters to preserve filter state during navigation
- Implement efficient filtering algorithms that minimize re-renders
- Ensure filtering works consistently in both tree and list views
- Add animation transitions when changing filters to improve UX

## Screenshots
*Screenshots of the type filtering interface would typically be included here* 