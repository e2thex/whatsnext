# User Story: Task Search

As a user, I want to be able to search for specific tasks by keywords so that I can quickly find relevant tasks without manually browsing through my entire task list.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task Organization |
| Priority | Medium |

## Acceptance Criteria

1. Users can search for tasks using keywords. ✓
2. Search results show tasks that match the keywords in their title or description. ✓
3. The search input is easily accessible and prominently displayed. ✓
4. Search results show the matching items' direct ancestors for context. ✓
5. Search results show all descendants of matching items. ✓
6. Users can clear the search with a single action. ✓
7. The search results update in real-time as the user types. ✓
8. When a search is active, matching text is highlighted in the results. ✓

## Non-Functional Requirements

1. Search should be fast and responsive, even with large numbers of tasks. ✓
2. The search field should be accessible via keyboard shortcut. ✓
3. The search UI should be consistent with the application's design. ✓

## Dependencies

1. Depends on [Tool Bar](tool-bar.md) for UI integration. ✓
2. Depends on the task data model.

## Implementation Notes

- Search functionality has been implemented in the Toolbar component in `app/components/Toolbar.tsx`
- The search input is accessible via the "/" keyboard shortcut
- Search can be cleared by clicking the clear button or pressing Escape
- Search results update in real-time as the user types
- Matching text is highlighted in the search results
- The search is performed on both task titles and descriptions
- Search results include:
  - Tasks that directly match the search terms
  - Parent tasks (ancestors) of matching tasks for context
  - Child tasks (descendants) of matching tasks to maintain task hierarchies
- Breadcrumbs are shown for tasks in list view to provide hierarchical context

## Related Components

- `app/components/Toolbar.tsx` - Contains the search input
- `app/components/ItemList.tsx` - Filters tasks based on search query
- `app/components/Item.tsx` - Highlights matching text in search results
- `app/components/Breadcrumb.tsx` - Shows ancestor tasks for context in search results 