import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useMemo } from 'react';

const MAX_RENDER_LENGTH = 15_000;

export function MarkdownViewer({ content }: { content: string }) {
  const { display, truncated } = useMemo(() => {
    if (content.length <= MAX_RENDER_LENGTH) {
      return { display: content, truncated: false };
    }
    return {
      display: content.slice(0, MAX_RENDER_LENGTH),
      truncated: true,
    };
  }, [content]);

  return (
    <div className="prose prose-invert prose-sm md:prose-base lg:prose-lg max-w-none text-muted-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {display}
      </ReactMarkdown>
      {truncated && (
        <div className="mt-4 p-3 rounded-lg bg-secondary/50 border border-border/50 text-sm text-muted-foreground">
          ✂️ Content truncated at {MAX_RENDER_LENGTH.toLocaleString()} chars ({content.length.toLocaleString()} total). Use <strong>Export</strong> for the full data.
        </div>
      )}
    </div>
  );
}

