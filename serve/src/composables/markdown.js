import { marked } from "marked";
import { createHighlighter } from "shiki";

let highlighter = null;

const LANGS = [
  "php", "javascript", "typescript", "css", "html", "bash", "shell",
  "json", "yaml", "sql", "vue", "jsx", "tsx", "markdown", "python",
  "diff", "xml", "http", "nginx", "blade",
];

export async function initMarkdown() {
  highlighter = await createHighlighter({
    themes: ["github-dark"],
    langs: LANGS,
  });

  const renderer = new marked.Renderer();

  renderer.code = ({ text, lang }) => {
    const loaded = highlighter.getLoadedLanguages();
    const useLang = loaded.includes(lang) ? lang : "text";
    return highlighter.codeToHtml(text, { lang: useLang, theme: "github-dark" });
  };

  renderer.heading = ({ text, depth }) => {
    const id = headingId(text);
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  };

  marked.use({ renderer });
}

function headingId(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function extractHeadings(src) {
  const headings = [];
  for (const m of src.matchAll(/^(#{1,6})\s+(.+)$/gm)) {
    const level = m[1].length;
    const text = m[2].replace(/\*\*?|__?|`/g, "").trim();
    headings.push({ level, text, id: headingId(text) });
  }
  return headings;
}

export function renderMarkdown(src) {
  return marked.parse(src);
}
