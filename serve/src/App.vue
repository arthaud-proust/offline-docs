<template>
  <div class="layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <!-- Tabs -->
      <div class="tabs">
        <button :class="{ active: mode === 'search' }" @click="mode = 'search'">Search</button>
        <button :class="{ active: mode === 'browse' }" @click="mode = 'browse'">Browse</button>
      </div>

      <!-- Search mode -->
      <template v-if="mode === 'search'">
        <div class="search-wrap">
          <input v-model="query" type="search" placeholder="Search the docs…" autofocus />
        </div>
        <div class="filters">
          <label class="toggle-row">
            <input type="checkbox" v-model="titlesOnly" />
            Titles only
          </label>
          <div class="chips">
            <button
              v-for="src in allSources" :key="src"
              class="chip" :class="{ active: isActive(src) }"
              @click="toggleSource(src)"
            >{{ src }}</button>
          </div>
        </div>
        <div class="status">{{ status }}</div>
        <div class="results">
          <div v-if="!query || query.length < 2" class="empty">Type to search</div>
          <div v-else-if="results.length === 0 && status !== 'Searching…'" class="empty">No results</div>
          <div
            v-for="r in results" :key="r.path"
            class="result" :class="{ active: activeFile === r.path }"
            @click="openFile(r)"
          >
            <div class="result-meta">
              <span class="result-label">{{ r.label }}</span>
              <span class="result-path">{{ r.rel }}</span>
            </div>
            <div v-if="r.snippets[0]" class="result-snippet">{{ r.snippets[0] }}</div>
          </div>
        </div>
      </template>

      <!-- Browse mode -->
      <template v-else>
        <div class="filters">
          <div class="chips">
            <button
              v-for="src in allSources" :key="src"
              class="chip" :class="{ active: browseSource === src }"
              @click="browseSource = src"
            >{{ src }}</button>
          </div>
        </div>
        <div class="results">
          <FileTree v-if="browseSource" :source="browseSource" @open="openFile" />
          <div v-else class="empty">Select a source</div>
        </div>
      </template>
    </aside>

    <!-- Content -->
    <main class="main">
      <div class="file-bar">{{ activeFile ?? '—' }}</div>
      <div class="content-wrap">
        <div v-if="contentType === 'md'" class="markdown" v-html="renderedContent" />
        <iframe v-else-if="contentType === 'html'" class="html-frame" :src="iframeSrc" />
        <pre v-else-if="contentType === 'raw'" class="raw">{{ rawContent }}</pre>
        <div v-else class="empty" style="padding:40px">Open a file</div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import FileTree from "./components/FileTree.vue";
import { initMarkdown, renderMarkdown } from "./composables/markdown.js";

const mode          = ref("search");
const query         = ref("");
const titlesOnly    = ref(true);
const allSources    = ref([]);
const excluded      = ref([]);
const browseSource  = ref(null);
const results       = ref([]);
const status        = ref("");
const activeFile    = ref(null);
const contentType   = ref("");
const renderedContent = ref("");
const rawContent    = ref("");
const iframeSrc     = ref("");

let debounceTimer = null;
let markdownReady = false;

onMounted(async () => {
  allSources.value = await fetch("/sources").then((r) => r.json());
  await initMarkdown();
  markdownReady = true;
});

watch([query, titlesOnly, excluded], () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(doSearch, 280);
}, { deep: true });

async function doSearch() {
  const q = query.value.trim();
  if (q.length < 2) { results.value = []; status.value = ""; return; }
  status.value = "Searching…";
  const active = allSources.value.filter((s) => !excluded.value.includes(s));
  const params = new URLSearchParams({
    q,
    sources: active.length === allSources.value.length ? "" : active.join(","),
    titlesOnly: titlesOnly.value,
  });
  const data = await fetch("/search?" + params).then((r) => r.json());
  results.value = data;
  status.value = data.length ? `${data.length} result(s)` : "No results";
}

async function openFile(r) {
  activeFile.value = r.path;
  const ext = r.path.split(".").pop().toLowerCase();

  if (ext === "html") {
    contentType.value = "html";
    iframeSrc.value = "/file?path=" + encodeURIComponent(r.path);
    return;
  }

  const text = await fetch("/file?path=" + encodeURIComponent(r.path)).then((r) => r.text());
  if (ext === "md" || ext === "mdx") {
    contentType.value = "md";
    renderedContent.value = markdownReady ? renderMarkdown(text) : text;
  } else {
    contentType.value = "raw";
    rawContent.value = text;
  }
}

function isActive(src) { return !excluded.value.includes(src) }

function toggleSource(src) {
  const i = excluded.value.indexOf(src);
  if (i >= 0) excluded.value.splice(i, 1);
  else excluded.value.push(src);
}
</script>

<style scoped>
.layout { display: flex; height: 100vh; overflow: hidden }

/* Sidebar */
.sidebar {
  width: 340px; min-width: 240px;
  display: flex; flex-direction: column;
  border-right: 1px solid var(--border);
  background: var(--bg2);
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
}
.tabs button {
  flex: 1; padding: 9px 4px;
  background: none; border: none; border-bottom: 2px solid transparent;
  color: var(--muted); font-size: 15px; cursor: pointer;
  transition: all .15s;
}
.tabs button.active { color: var(--accent); border-bottom-color: var(--accent) }
.tabs button:hover:not(.active) { color: var(--text) }

.search-wrap { padding: 10px 10px 6px; border-bottom: 1px solid var(--border) }
.search-wrap input {
  width: 100%; padding: 7px 10px;
  border-radius: 7px; border: 1px solid var(--border);
  background: var(--bg3); color: var(--text);
  font-size: 15px; outline: none;
}
.search-wrap input:focus { border-color: var(--accent) }

.filters {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 7px;
}
.toggle-row {
  display: flex; align-items: center; gap: 7px;
  font-size: 14px; color: var(--muted); cursor: pointer; user-select: none;
}
.toggle-row input { accent-color: var(--accent); cursor: pointer }

.chips { display: flex; flex-wrap: wrap; gap: 4px }
.chip {
  padding: 2px 9px; border-radius: 20px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  border: 1px solid transparent;
  background: var(--bg3); color: var(--muted);
  transition: all .15s; user-select: none;
}
.chip.active { background: var(--accent-dim); color: var(--accent); border-color: #2a5090 }

.status { font-size: 13px; color: var(--muted); padding: 4px 10px; min-height: 22px; border-bottom: 1px solid var(--border) }

.results { flex: 1; overflow-y: auto; padding: 4px }
.empty { padding: 24px; text-align: center; color: var(--muted); font-size: 15px }

.result { padding: 7px 10px; border-radius: 6px; cursor: pointer; margin-bottom: 1px }
.result:hover { background: #161d2a }
.result.active { background: #1a2a40 }
.result-meta { display: flex; align-items: center; gap: 6px; min-width: 0 }
.result-label {
  font-size: 12px; font-weight: 700; padding: 1px 6px; border-radius: 3px;
  background: var(--bg3); color: var(--accent); flex-shrink: 0;
}
.result-path { font-size: 13px; color: var(--muted); font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
.result-snippet { font-size: 14px; color: #4a5568; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }

/* Main */
.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0 }
.file-bar {
  padding: 6px 14px; font-size: 13px; font-family: monospace;
  color: var(--muted); border-bottom: 1px solid var(--border);
  background: var(--bg2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0;
}
.content-wrap { flex: 1; overflow: auto }
.html-frame { width: 100%; height: 100%; border: none; background: #fff }
.raw {
  padding: 20px 24px; font-family: 'Menlo', monospace; font-size: 15px;
  line-height: 1.7; color: #cbd5e1; white-space: pre-wrap; word-break: break-word;
}
</style>
