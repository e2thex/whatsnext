# User Story: Date Dependencies

As a user, I want to add a date as a dependency so that a task is blocked until that date, on that date it will be unblocked automatically so I can delay tasks and then have them come back automatically.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task States |
| Priority | Medium |

## Acceptance Criteria

1. ✓ Users can set a future date and time as a dependency for any task, but the time is optional (will default to 00:00)
2. ✓ Tasks with date dependencies are visually indicated as blocked until the specified date arrives
3. ✓ Date dependencies are shown alongside task dependencies in the dependency interface
4. ✓ Users can easily modify or remove a date dependency
5. ✓ Tasks automatically become unblocked when their date dependency is reached
6. ✓ The date dependency UI is intuitive and easy to use
7. ✓ Users can see the specific date when a task will become unblocked
8. ✓ Date dependencies persist across sessions and page refreshes
9. ✓ Date dependencies can coexist with task dependencies (both must be satisfied for a task to be unblocked)
10. ✓ Date dependency status is updated without requiring page refresh
11. ✓ Date dependency are a blocker and work as such for calculating Parent block status
12. ✓ Users can type natural language dates (e.g., "tomorrow", "next week", "in 3 days")
13. ✓ Users can type date formats (e.g., "12/25", "2024-01-15", "14:30")
14. ✓ Users can type days of the week (e.g., "monday", "next friday")
15. ✓ The interface intelligently parses and suggests dates based on user input
16. ✓ Users can press Enter to quickly add the first date suggestion
17. ✓ Users receive immediate feedback via toast notifications for all operations

## Non-Functional Requirements

1. ✓ Date selection UI should be intuitive with appropriate date and time controls
2. ✓ Date dependency status should update automatically as time passes
3. ✓ Date dependencies should be efficiently checked without excessive server load
4. ✓ The system should handle timezone differences appropriately
5. ✓ Date parsing should be intelligent and support multiple formats
6. ✓ The interface should provide visual feedback for parsed dates
7. ✓ Loading states should provide clear feedback during operations

## Dependencies

1. Task dependency system
2. UI components for date selection
3. Data persistence for date dependencies
4. A mechanism for time-based task status updates
5. Date parsing and validation logic
6. Toast notification system

## Implementation Notes

### Unified Date Dependency UI
- Implemented date dependencies within the unified dependency modal
- Created intelligent date parsing that supports natural language and multiple formats
- Added smart date suggestions based on user input
- Implemented keyboard shortcuts (Enter to add, Escape to close)
- Added loading states and visual feedback for all operations

### Intelligent Date Parsing
- **Natural Language**: "tomorrow", "next week", "next month", "in 3 days/weeks/months"
- **Time-based**: "tonight", "this evening", "this afternoon", "this morning"
- **Day of Week**: "monday", "next friday", "tuesday"
- **Date Formats**: "12/25", "MM/DD", "MM-DD", "YYYY-MM-DD"
- **Time Formats**: "14:30", "HH:MM"
- **Smart Logic**: Automatically adjusts year for past dates, sets appropriate default times

### Enhanced User Experience
- Users can type natural language and see intelligent date suggestions
- Visual feedback shows the detected date in the help text
- Enter key support for quick addition of the first date suggestion
- Custom date picker pre-fills with parsed date when available
- Toast notifications provide immediate feedback for success/error states
- Loading states show "Adding..." text during operations

### Date Dependency Data Model
- Created a `date_dependencies` table with fields for `task_id` and `unblock_at`
- Each task can have at most one date dependency
- Date values are stored in UTC format for consistent timezone handling
- Date dependency data is loaded alongside task dependencies for efficient retrieval

### Visual Indicators
- Tasks with date dependencies show the same blocked visual treatment as task dependencies
- The dependency indicator includes date dependencies in its count
- The dependency menu shows the specific date when the task will be unblocked
- Date dependencies are visually distinguished from task dependencies in the menu
- Calendar icons clearly indicate date dependencies vs task dependencies

### Date Dependency Logic
- A task is considered blocked if the current time is before the `unblock_at` time
- Date dependency status is checked:
  1. On initial page load
  2. Periodically while the page is open
  3. When the user interacts with the task
- If a task has both date and task dependencies, both must be satisfied for the task to be unblocked

### Accessibility Features
- Proper ARIA labels for screen readers
- Keyboard navigation support (Tab, Enter, Escape)
- Focus management for modal interactions
- Semantic HTML structure with appropriate roles

### Performance Optimizations
- Efficient date parsing without external libraries
- Proper error handling with user-friendly messages
- Optimistic updates for better perceived performance
- Timezone-aware date handling 