export interface ParsedContent {
  content: string
  parent: string | null
}

export const parseContentAndParent = (content: string): ParsedContent => {
  const parts = content.split('>')
  if (parts.length > 1) {
    return {
      content: parts[1].trim(),
      parent: parts[0].trim()
    }
  }
  return {
    content: content.trim(),
    parent: null
  }
} 