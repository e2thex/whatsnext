import { type Database } from '../../src/lib/supabase/client'

type ItemRow = Database['public']['Tables']['items']['Row']

interface BreadcrumbProps {
  items: ItemRow[]
  onNavigate: (itemId: string | null) => void
}

export function Breadcrumb({ items, onNavigate }: BreadcrumbProps) {
  return (
    <nav className="mb-4">
      <ol className="flex items-center space-x-2 text-sm">
        <li>
          <button
            onClick={() => onNavigate(null)}
            className="text-gray-600 hover:text-indigo-600"
          >
            All Tasks
          </button>
        </li>
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center">
            <svg
              className="w-4 h-4 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <button
              onClick={() => onNavigate(item.id)}
              className={`${
                index === items.length - 1
                  ? 'text-indigo-600 font-medium'
                  : 'text-gray-600 hover:text-indigo-600'
              }`}
            >
              {item.title}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
} 