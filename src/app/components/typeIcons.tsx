const typeIcons = {
    Task: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    ),
    Mission: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
      </svg>
    ),
    Objective: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
      </svg>
    ),
    Ambition: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20">
        <path d="M10,2 L7,14 L10,12 L13,14 L10,2 Z" fill="currentColor" />
        <path d="M8,14 L6,17 L7.5,16.5 L9,18 L8,14 Z" fill="currentColor" />
        <path d="M12,14 L14,17 L12.5,16.5 L11,18 L12,14 Z" fill="currentColor" />
      </svg>
    )
  } as const;

export const typeColors = {
  Task: 'bg-blue-100 text-blue-800',
  Mission: 'bg-green-100 text-green-800',
  Objective: 'bg-purple-100 text-purple-800',
  Ambition: 'bg-red-100 text-red-800'
} as const;

export const typeRingColors = {
  Task: 'ring-blue-500',
  Mission: 'ring-green-500',
  Objective: 'ring-purple-500',
  Ambition: 'ring-red-500'
} as const;

export default typeIcons;