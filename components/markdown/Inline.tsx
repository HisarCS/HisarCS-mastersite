'use client';

import ReactMarkdown from 'react-markdown';
import { safeUrl } from '@/lib/util/html';

/** One line of inline markdown — **bold**, *italic*, `code`, [links](…) — for
 *  text inside fences (card and finding bodies). No blocks, no raw HTML. */
export function Inline({ children }: { children: string }) {
  return (
    <ReactMarkdown
      allowedElements={['p', 'strong', 'em', 'code', 'a', 'del']}
      unwrapDisallowed
      components={{
        p: ({ children: c }) => <>{c}</>,
        a: ({ href, children: c }) => (
          <a href={safeUrl(href ?? '')} target="_blank" rel="noopener noreferrer">
            {c}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
