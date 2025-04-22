export type ViewMode = 'tree' | 'list'
export type CompletionFilter = 'all' | 'todo' | 'done'
export type BlockingFilter = 'any' | 'actionable' | 'blocked'

export interface FilterState {
  viewMode: ViewMode
  completion: CompletionFilter
  blocking: BlockingFilter
  search: string
} 