import { generateUniqueId } from './treeUtils';

/* ===== 科判樹 → Obsidian Markdown ===== */

export const treeToMarkdown = (nodes, options = {}) => {
  const { startLevel = 1, includeFrontmatter = true, rootTitle } = options;
  if (!nodes?.length) return '';
  let md = '';
  if (includeFrontmatter) {
    md += buildFrontmatter({ title: nodes[0]?.title || rootTitle || '科判筆記' });
  }
  md += nodesToMarkdown(nodes, startLevel);
  return md;
};

const nodesToMarkdown = (nodes, level) => {
  let md = '';
  for (const node of nodes) {
    const heading = '#'.repeat(level);
    md += `\n${heading} ${node.title || '(無標題)'}\n\n`;
    if (node.content?.trim()) md += `${node.content.trim()}\n\n`;
    if (node.note?.trim()) {
      const lines = node.note.trim().split('\n');
      md += `> 📝 ${lines[0]}\n`;
      for (let i = 1; i < lines.length; i++) md += `> ${lines[i]}\n`;
      md += '\n';
    }
    if (node.children?.length) md += nodesToMarkdown(node.children, level + 1);
  }
  return md;
};

/* ===== Obsidian Markdown → 科判樹 ===== */

export const markdownToTree = (mdString) => {
  const { body } = parseFrontmatter(mdString);
  if (!body?.trim()) return [];

  const lines = body.split('\n');
  const rootNodes = [];
  const stack = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (!headingMatch) continue;

    const level = headingMatch[1].length;
    const title = headingMatch[2].trim();
    const newNode = { id: generateUniqueId(), title, content: '', note: '', children: [] };

    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();

    if (!stack.length) {
      rootNodes.push(newNode);
      stack.push({ node: newNode, level });
    } else {
      const parent = stack[stack.length - 1].node;
      if (!parent.children) parent.children = [];
      parent.children.push(newNode);
      stack.push({ node: newNode, level });
    }

    let contentParts = [], noteParts = [], inNote = false;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^#{1,6}\s/.test(lines[j])) { i = j - 1; break; }
      if (j === lines.length - 1) i = j;
      const trimmed = lines[j].trim();
      const bqMatch = trimmed.match(/^>\s*(.*)/);
      if (bqMatch) {
        const text = bqMatch[1].replace(/^📝\s*/, '');
        if (!inNote) inNote = true;
        if (inNote) noteParts.push(text);
      } else {
        if (inNote && trimmed === '') { noteParts.push(''); }
        else { inNote = false; if (trimmed !== '' || contentParts.length > 0) contentParts.push(lines[j]); }
      }
    }
    newNode.content = contentParts.join('\n').trim();
    newNode.note = noteParts.join('\n').trim();
  }
  return rootNodes;
};

/* ===== Frontmatter ===== */

export const parseFrontmatter = (mdString) => {
  const result = { frontmatter: {}, body: mdString };
  const lines = mdString.split('\n');
  if (lines[0]?.trim() !== '---') return result;
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { endIdx = i; break; }
  }
  if (endIdx === -1) return result;

  const yamlLines = lines.slice(1, endIdx);
  const fm = {}; let key = null;
  for (const line of yamlLines) {
    const kv = line.match(/^(\w[\w_-]*):\s*(.*)/);
    if (kv) {
      key = kv[1];
      let val = kv[2].trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        try { val = JSON.parse(val); } catch { val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')); }
      } else if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else val = val.replace(/^["']|["']$/g, '');
      fm[key] = val;
    } else if (key && line.trim().startsWith('- ')) {
      if (!Array.isArray(fm[key])) fm[key] = [];
      fm[key].push(line.trim().slice(2).replace(/^["']|["']$/g, ''));
    }
  }
  result.frontmatter = fm;
  result.body = lines.slice(endIdx + 1).join('\n');
  return result;
};

export const buildFrontmatter = (meta = {}) => {
  const now = new Date().toISOString().split('T')[0];
  let fm = '---\n';
  fm += `title: "${meta.title || '科判筆記'}"\n`;
  fm += `created: ${meta.created || now}\n`;
  fm += 'tags:\n  - 科判\n';
  if (meta.tags) {
    for (const t of meta.tags) fm += `  - ${t}\n`;
  }
  fm += '---\n\n';
  return fm;
};

/* ===== 向後相容：Notion bullet-list ===== */

export const convertToBulletMarkdown = (nodes, level = 0) => {
  let md = '';
  for (const node of nodes) {
    const indent = '  '.repeat(level);
    md += `${indent}- **${node.title || '無標題'}**\n`;
    if (node.content?.trim()) {
      md += `${indent}  > ${node.content.trim().replace(/\n/g, '\n' + indent + '  > ')}\n`;
    }
    if (node.note?.trim()) {
      md += `${indent}  *🌱 札記: ${node.note.trim().replace(/\n/g, ' ')}*\n`;
    }
    if (node.children?.length) md += convertToBulletMarkdown(node.children, level + 1);
  }
  return md;
};
