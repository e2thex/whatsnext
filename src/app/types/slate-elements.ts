import { BaseElement, BaseText, BaseEditor } from 'slate'
import { ReactEditor } from 'slate-react'
import { HistoryEditor } from 'slate-history'
import type { Task } from '../services/tasks'

export type CustomText = BaseText & {
  text: string
}

export type CustomElement = BaseElement & {
  type: 'paragraph'
  children: CustomText[]
}

export type MentionElement = BaseElement & {
  type: 'mention'
  task: Task
  children: CustomText[]
}

export type BlockedBySelectorElement = BaseElement & {
  type: 'blocked-by-selector'
  children: CustomText[]
}

export type SubtaskElement = BaseElement & {
  type: 'subtask'
  task: Task
  children: CustomText[]
}

export type ListItemElement = BaseElement & {
  type: 'list-item'
  nodeId: string | null
  children: CustomText[]
}

export type ParentMentionElement = BaseElement & {
  type: 'parent-mention'
  task: Task
  children: CustomText[]
}

export type ParentSelectorElement = BaseElement & {
  type: 'parent-selector'
  children: CustomText[]
}

export type CustomEditor = BaseEditor & ReactEditor & HistoryEditor

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor
    Element: CustomElement | MentionElement | BlockedBySelectorElement | SubtaskElement | ListItemElement | ParentSelectorElement | ParentMentionElement
    Text: CustomText
  }
} 