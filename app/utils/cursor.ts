export interface CursorCoordinates {
  x: number
  y: number
}

export const getCursorCoordinates = (event: React.MouseEvent): CursorCoordinates => {
  return {
    x: event.clientX,
    y: event.clientY
  }
} 