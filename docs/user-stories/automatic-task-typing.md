# User Story: Automatic Task Typing

As a user, I want items to be automatically labeled with appropriate types based on their position in the hierarchy so I can understand their scope and importance.

## Meta Data
| Section | Value |
| ------- | ----- |
| Completed | ✓ |
| Epic | Task Hierarchy |
| Priority | Medium |

## Acceptance Criteria

1. Items without sub-tasks are automatically labeled as "Tasks"
2. Items with 1 level of sub-tasks are automatically labeled as "Missions"
3. Items with 2 levels of sub-tasks are automatically labeled as "Objectives"
4. Top-level items are automatically labeled as "Ambitions"
5. Item types update automatically when their position in the hierarchy changes
6. Each type has a distinct visual indicator to differentiate it
7. The type label is clearly visible to the user
8. Type classification works consistently across view modes

## Non-Functional Requirements

1. Type determination should happen automatically without user intervention
2. Type changes should be immediate when hierarchy changes
3. Type indicators should be visually clear and distinct
4. Type determination should perform efficiently with large hierarchies

## Dependencies

1. Hierarchical task structure implementation
2. UI components for displaying type indicators
3. Type-specific styling system

## Implementation Notes

### Type Determination Logic
- Implemented a system that analyzes each item's position in the hierarchy
- Types are determined based on depth and presence of children:
  - Items with no children: "Task"
  - Items with children one level deep: "Mission"
  - Items with descendants two or more levels deep: "Objective"
  - Root-level items: "Ambition"
- Type re-calculation occurs whenever hierarchy changes

### Visual Indicators
- Each type has a specific icon:
  - Task: Checkbox icon
  - Mission: Document/checklist icon
  - Objective: Flag icon
  - Ambition: Rocket icon
- Type icons have distinct colors for easy recognition:
  - Task: Blue
  - Mission: Green
  - Objective: Purple
  - Ambition: Red

### Type Updates
- Type is recalculated when:
  - Child items are added or removed
  - Items are moved within the hierarchy
  - Items are deleted
- The UI updates immediately to reflect the new type

### Performance Considerations
- Type calculations are optimized to minimize re-rendering
- Only affected branches of the hierarchy are updated when changes occur
- Type information is stored efficiently to avoid redundant calculations 