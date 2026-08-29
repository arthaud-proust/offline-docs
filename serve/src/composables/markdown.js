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

  marked.use({ renderer });
}

export function renderMarkdown(src) {
  return marked.parse(src);
}
