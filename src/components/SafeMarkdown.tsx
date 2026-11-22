import React from 'react';

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  // Safely parse **bold** spans without raw HTML injection
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return segments.map((seg, idx) => {
    if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[#152924]">
          {seg.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{seg}</React.Fragment>;
  });
}

/**
 * Lightweight, XSS-safe markdown renderer for AI Stage 2 deep-dive responses.
 */
export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({
  content,
  className = '',
}) => {
  const lines = content.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];

  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = (keyPrefix: string) => {
    if (listItems.length === 0 || !listType) return;
    if (listType === 'ul') {
      blocks.push(
        <ul key={`${keyPrefix}-ul`} className="my-2 space-y-1.5 pl-4 list-disc marker:text-[#9A7B3E]">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-[13.5px] leading-relaxed text-[#283631]">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      blocks.push(
        <ol key={`${keyPrefix}-ol`} className="my-2 space-y-1.5 pl-4 list-decimal marker:text-[#2B5B4C] marker:font-medium">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-[13.5px] leading-relaxed text-[#283631]">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ol>
      );
    }
    listItems = [];
    listType = null;
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(`empty-${idx}`);
      return;
    }

    if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
      flushList(`h-${idx}`);
      const titleText = line.replace(/^#{1,3}\s+/, '');
      blocks.push(
        <h4
          key={`h-${idx}`}
          className="mt-3.5 mb-1.5 font-serif text-[14.5px] font-semibold text-[#152924]"
        >
          {renderInlineFormatting(titleText)}
        </h4>
      );
      return;
    }

    const ulMatch = line.match(/^[-•*]\s+(.+)$/);
    if (ulMatch) {
      if (listType === 'ol') flushList(`switch-${idx}`);
      listType = 'ul';
      listItems.push(ulMatch[1]);
      return;
    }

    const olMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      if (listType === 'ul') flushList(`switch-${idx}`);
      listType = 'ol';
      listItems.push(olMatch[1]);
      return;
    }

    flushList(`p-${idx}`);
    blocks.push(
      <p key={`p-${idx}`} className="my-1.5 text-[13.5px] leading-relaxed text-[#283631]">
        {renderInlineFormatting(line)}
      </p>
    );
  });

  flushList('end');

  return <div className={className}>{blocks}</div>;
};
