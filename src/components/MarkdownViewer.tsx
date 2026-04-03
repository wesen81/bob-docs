import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { useNavigate } from 'react-router-dom';
import { MermaidDiagram } from './MermaidDiagram';
import type { Components } from 'react-markdown';

interface MarkdownViewerProps {
  content: string;
  currentFilePath?: string; // Current file path for resolving relative links
}

export function MarkdownViewer({ content, currentFilePath }: MarkdownViewerProps) {
  const navigate = useNavigate();

  // Helper function to resolve relative paths
  const resolveRelativePath = (href: string, currentPath?: string): string => {
    if (!currentPath) return href;

    // Get the directory of the current file
    const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));

    // Handle different types of relative paths
    if (href.startsWith('./')) {
      // Same directory: ./file.md -> currentDir/file.md
      return `${currentDir}/${href.substring(2)}`;
    } else if (href.startsWith('../')) {
      // Parent directory: ../file.md
      const parts = currentDir.split('/');
      let hrefParts = href.split('/');

      // Count how many levels to go up
      while (hrefParts[0] === '..') {
        parts.pop();
        hrefParts = hrefParts.slice(1);
      }

      return `${parts.join('/')}/${hrefParts.join('/')}`;
    } else if (!href.startsWith('/') && !href.startsWith('http://') && !href.startsWith('https://')) {
      // Relative path without ./ prefix: file.md -> currentDir/file.md
      return `${currentDir}/${href}`;
    }

    return href;
  };

  // Custom components for rendering markdown elements
  const components: Components = {
    // Render code blocks with syntax highlighting and Mermaid support
    code(props) {
      const { inline, className, children, ...rest } = props as {
        inline?: boolean;
        className?: string;
        children?: React.ReactNode;
      };
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const codeString = String(children).replace(/\n$/, '');

      // Render Mermaid diagrams
      if (!inline && language === 'mermaid') {
        return <MermaidDiagram chart={codeString} />;
      }

      // Render inline code
      if (inline) {
        return (
          <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono" {...rest}>
            {children}
          </code>
        );
      }

      // Render code blocks with syntax highlighting
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      );
    },

    // Style headings
    h1({ children, ...props }) {
      return (
        <h1 className="text-4xl font-bold text-gray-900 mt-8 mb-4 pb-2 border-b border-gray-200" {...props}>
          {children}
        </h1>
      );
    },
    h2({ children, ...props }) {
      return (
        <h2 className="text-3xl font-semibold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-200" {...props}>
          {children}
        </h2>
      );
    },
    h3({ children, ...props }) {
      return (
        <h3 className="text-2xl font-semibold text-gray-900 mt-5 mb-2" {...props}>
          {children}
        </h3>
      );
    },
    h4({ children, ...props }) {
      return (
        <h4 className="text-xl font-semibold text-gray-900 mt-4 mb-2" {...props}>
          {children}
        </h4>
      );
    },
    h5({ children, ...props }) {
      return (
        <h5 className="text-lg font-semibold text-gray-900 mt-3 mb-2" {...props}>
          {children}
        </h5>
      );
    },
    h6({ children, ...props }) {
      return (
        <h6 className="text-base font-semibold text-gray-900 mt-3 mb-2" {...props}>
          {children}
        </h6>
      );
    },

    // Style paragraphs
    p({ children, ...props }) {
      return (
        <p className="text-gray-700 leading-7 mb-4" {...props}>
          {children}
        </p>
      );
    },

    // Style links
    a({ children, href, ...props }) {
      if (!href) {
        return <a {...props}>{children}</a>;
      }

      // Check if it's an internal anchor link (starts with #)
      const isInternalAnchor = href.startsWith('#');

      // For internal anchor links, use smooth scroll behavior
      if (isInternalAnchor) {
        return (
          <a
            href={href}
            className="text-blue-600 hover:text-blue-800 underline"
            onClick={(e) => {
              e.preventDefault();
              const targetId = href.slice(1); // Remove the # character
              const targetElement = document.getElementById(targetId);
              if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            {...props}
          >
            {children}
          </a>
        );
      }

      // Check if it's an external link (starts with http:// or https://)
      const isExternalLink = href.startsWith('http://') || href.startsWith('https://');

      // For external links, open in new tab
      if (isExternalLink) {
        return (
          <a
            href={href}
            className="text-blue-600 hover:text-blue-800 underline"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          >
            {children}
          </a>
        );
      }

      // For relative markdown links (./file.md, ../file.md, or file.md)
      // Use React Router navigation
      const resolvedPath = resolveRelativePath(href, currentFilePath);

      return (
        <a
          href={`/${resolvedPath}`}
          className="text-blue-600 hover:text-blue-800 underline"
          onClick={(e) => {
            e.preventDefault();
            navigate(`/${resolvedPath}`);
          }}
          {...props}
        >
          {children}
        </a>
      );
    },

    // Style lists
    ul({ children, ...props }) {
      return (
        <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700" {...props}>
          {children}
        </ul>
      );
    },
    ol({ children, ...props }) {
      return (
        <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-700" {...props}>
          {children}
        </ol>
      );
    },
    li({ children, ...props }) {
      return (
        <li className="ml-4" {...props}>
          {children}
        </li>
      );
    },

    // Style blockquotes
    blockquote({ children, ...props }) {
      return (
        <blockquote className="border-l-4 border-gray-300 pl-4 py-2 my-4 italic text-gray-600" {...props}>
          {children}
        </blockquote>
      );
    },

    // Style tables
    table({ children, ...props }) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border border-gray-300" {...props}>
            {children}
          </table>
        </div>
      );
    },
    thead({ children, ...props }) {
      return (
        <thead className="bg-gray-100" {...props}>
          {children}
        </thead>
      );
    },
    tbody({ children, ...props }) {
      return (
        <tbody {...props}>
          {children}
        </tbody>
      );
    },
    tr({ children, ...props }) {
      return (
        <tr className="border-b border-gray-300" {...props}>
          {children}
        </tr>
      );
    },
    th({ children, ...props }) {
      return (
        <th className="px-4 py-2 text-left font-semibold text-gray-900 border-r border-gray-300 last:border-r-0" {...props}>
          {children}
        </th>
      );
    },
    td({ children, ...props }) {
      return (
        <td className="px-4 py-2 text-gray-700 border-r border-gray-300 last:border-r-0" {...props}>
          {children}
        </td>
      );
    },

    // Style images
    img({ src, alt, ...props }) {
      return (
        <img
          src={src}
          alt={alt}
          className="max-w-full h-auto rounded my-4 shadow-sm"
          {...props}
        />
      );
    },

    // Style horizontal rules
    hr({ ...props }) {
      return (
        <hr className="my-6 border-t border-gray-300" {...props} />
      );
    },

    // Style pre blocks (code block containers)
    pre({ children, ...props }) {
      // Check if children contains a code block with language-mermaid class
      const childrenArray = React.Children.toArray(children);
      const hasMermaidDiagram = childrenArray.some(
        (child) => {
          if (React.isValidElement(child) && child.props) {
            const className = child.props.className;
            // Check for both 'mermaid-diagram' (after rendering) and 'language-mermaid' (before rendering)
            return typeof className === 'string' && (className.includes('mermaid-diagram') || className.includes('language-mermaid'));
          }
          return false;
        }
      );

      // For Mermaid diagrams, use transparent background and no padding
      // The diagram itself will have white background
      if (hasMermaidDiagram) {
        return (
          <pre className="bg-transparent p-0 my-4" {...props}>
            {children}
          </pre>
        );
      }

      // For code blocks, use dark background
      return (
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-4" {...props}>
          {children}
        </pre>
      );
    },
  };

  return (
    <div className="markdown-viewer prose max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight, rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
