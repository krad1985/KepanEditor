import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

/**
 * Strip ==highlight== and **bold** markdown to plain text + runs
 */
const parseInlineFormatting = (text) => {
  if (!text) return [];
  const runs = [];
  // Split on ==highlight== and **bold** markers
  const regex = /(==.*?==|\*\*.*?\*\*)/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
    }
    const segment = match[0];
    if (segment.startsWith('==') && segment.endsWith('==')) {
      runs.push(new TextRun({ text: segment.slice(2, -2), highlight: 'yellow' }));
    } else if (segment.startsWith('**') && segment.endsWith('**')) {
      runs.push(new TextRun({ text: segment.slice(2, -2), bold: true }));
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }));
  }
  return runs.length ? runs : [new TextRun({ text: text })];
};

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

/**
 * Recursively convert tree nodes to docx paragraphs
 */
const treeToParagraphs = (nodes, depth = 0) => {
  const paragraphs = [];
  for (const node of nodes) {
    // Title line — heading at appropriate level (capped at H6)
    const headingLevel = HEADING_LEVELS[Math.min(depth, HEADING_LEVELS.length - 1)];
    paragraphs.push(
      new Paragraph({
        heading: headingLevel,
        children: parseInlineFormatting(node.title || '(無標題)'),
      })
    );

    // Content body
    if (node.content && node.content.trim()) {
      const lines = node.content.split('\n').filter(l => l.trim());
      for (const line of lines) {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 80 },
            children: parseInlineFormatting(line.trim()),
          })
        );
      }
    }

    // Note (footnote-style, smaller)
    if (node.note && node.note.trim()) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 80, after: 120 },
          children: [new TextRun({ text: `📝 ${node.note}`, italics: true, size: 18, color: '666666' })],
        })
      );
    }

    // Recurse into children
    if (node.children && node.children.length > 0) {
      paragraphs.push(...treeToParagraphs(node.children, depth + 1));
    }
  }
  return paragraphs;
};

/**
 * Generate a Blob for .docx download
 */
export const treeToDocxBlob = async (tree, title = '科判') => {
  const paragraphs = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: title, bold: true })],
    }),
    ...treeToParagraphs(tree),
  ];

  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  });

  return Packer.toBlob(doc);
};
