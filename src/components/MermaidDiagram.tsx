import { useEffect, useRef, useState } from 'react';
import { ErrorDisplay } from './ErrorDisplay';
import { LoadingSpinner } from './LoadingSpinner';

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const renderDiagram = async () => {
      setIsLoading(true);
      setError(null);

      // Cleanup any previous mermaid error elements from DOM before rendering
      const cleanupMermaidErrors = () => {
        // Mermaid creates error divs with IDs like 'd2', 'd3', etc.
        document.querySelectorAll('body > div[id^="d"]').forEach(el => {
          if (el.textContent?.includes('Syntax error in text') ||
              el.textContent?.includes('mermaid version')) {
            el.remove();
          }
        });
      };

      cleanupMermaidErrors();

      try {
        // Dynamically import mermaid to avoid SSR issues
        const mermaid = (await import('mermaid')).default;

        // Initialize mermaid with default configuration
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
        });

        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
        setError(null);

        // Cleanup again after successful render to remove any error divs
        cleanupMermaidErrors();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to render diagram';

        console.error('[MermaidDiagram] Rendering failed:', {
          error: err,
          chartPreview: chart.substring(0, 200) + (chart.length > 200 ? '...' : '')
        });

        setError(errorMessage);

        // Cleanup error divs even when rendering fails
        setTimeout(cleanupMermaidErrors, 100);
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [chart]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64 p-4">
        <LoadingSpinner message="Rendering diagram..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <ErrorDisplay
          title="Diagram Rendering Error"
          message={error}
          details={`Mermaid Chart:\n${chart}`}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-diagram my-4 flex justify-center bg-white rounded-lg p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
