# User Story: Task Search

As a user, I want to be able to search for tasks by title or description so that I can quickly find relevant items, showing only direct ancestors and descendants of matching items.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task Search |
| Priority | High |

## Acceptance Criteria

1. Users can search for tasks by entering text in a search field
2. Search matches task titles and descriptions for the entered text
3. Matching text is highlighted within the search results
4. Search results show the matching items' direct ancestors for context
5. Search results show all descendants of matching items
6. Search results do not show unrelated items or siblings that don't match
7. Search functionality works in both tree and list views
8. Search is case-insensitive
9. Search results update in real-time as the user types
10. The search interface is accessible and easy to use

## Non-Functional Requirements

1. Search should be fast, with results appearing within milliseconds
2. Search functionality should work efficiently with large task hierarchies
3. The UI should clearly indicate when search is active
4. Search should provide clear visual feedback when no matches are found

## Dependencies

1. Task hierarchy implementation
2. Text matching and highlighting functionality
3. UI components for search input and results display

## Implementation Notes

### Search Algorithm
- Implemented a search function that matches entered text against task titles and descriptions
- Created a `searchMatchingItemIds` set that contains:
  1. Items that directly match the search text
  2. All ancestors of matching items (for context)
  3. All descendants of matching items (to maintain hierarchy)
- Search is case-insensitive and trims whitespace from the query
- The algorithm efficiently handles hierarchical relationships during searching

### Search UI
- Added a search input field in the application header
- Search activates as soon as the user starts typing
- Results update in real-time without requiring a form submission
- The UI provides visual feedback when search is active
- Empty search results show an appropriate message

### Results Highlighting
- Modified the rendering to highlight only the matching text within titles and descriptions
- Implemented text highlighting with a yellow background on the exact matching portions
- Non-matching parts of the text maintain their normal styling
- Highlighted text preserves the original case even though the search is case-insensitive

### View Integration
- In tree view: shows matching items, their ancestors, and their descendants in the hierarchical structure
- In list view: shows only bottom-level tasks that either match the search or are descendants of matching items
- Both views maintain appropriate breadcrumb navigation for context
- Filtering options (actionable, blocked, completion) still work in conjunction with search

### Performance Considerations
- Search computation is optimized using memoization to prevent unnecessary recalculations
- Only recomputes search results when the query or task data changes
- Efficiently builds the set of matching IDs to minimize rendering work
- Uses client-side searching for immediate feedback 