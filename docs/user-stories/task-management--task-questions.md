# Task Questions

## User Story
As a user, I want each item to support both sub-tasks and questions so I can track execution and unknowns in one place.

## Acceptance Criteria
- Users can add questions to any task
- Questions are visually distinct from sub-tasks
- Questions can be marked as resolved
- Users can convert questions to tasks and vice versa
- Questions appear in the task hierarchy alongside sub-tasks
- The presence of unresolved questions is indicated on parent tasks
- Questions can have their own descriptions and metadata

## Implementation Details
- A new "Add Question" option will be added to task menus
- Questions will have a distinct visual style:
  - Different icon (question mark instead of checkbox)
  - Different background color or border
  - Clear indication of resolved vs. unresolved state
- Questions will support the same text editing capabilities as tasks
- When a question is resolved, it will be visually marked similar to completed tasks
- A toggle will be added to convert between question and task types
- Parent tasks will display an indicator showing the number of unresolved questions
- Questions will be included in search results
- Questions will not affect task completion percentage calculations

## Technical Approach
- Extend the task data model to include a "question" type flag
- Implement UI components for creating and managing questions
- Add conversion functionality between questions and tasks
- Create distinct styling for questions in both tree and list views
- Implement filtering options to show/hide questions
- Ensure questions are properly handled in all existing task operations
- Add aggregation logic to count unresolved questions at parent levels
- Update search indexing to include question content

## Screenshots
*Screenshots of the task questions interface would typically be included here* 