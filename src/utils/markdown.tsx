import ReactMarkdown from 'react-markdown';

/**
 * Renders Markdown content to React components
 * @param {string} content - The markdown content to render
 * @returns {JSX.Element | null} Rendered React component with markdown
 */
export const renderMarkdown = (content?: string) => {
  if (!content) return null;
  return (
    <ReactMarkdown>
      {content}
    </ReactMarkdown>
  );
}; 