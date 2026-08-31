<template>
    <div class="layout">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-head">
                <button class="search-trigger" @click="showSearch = true">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                        <path
                            fill-rule="evenodd"
                            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                            clip-rule="evenodd"
                        />
                    </svg>
                    <span>Search</span>
                    <kbd>⌘K</kbd>
                </button>
            </div>
            <div class="filters">
                <div class="chips">
                    <button
                        v-for="src in allSources"
                        :key="src"
                        class="chip"
                        :class="{ active: browseSource === src }"
                        @click="browseSource = src"
                    >
                        {{ src }}
                    </button>
                </div>
            </div>
            <div class="tree-area">
                <FileTree
                    v-if="browseSource"
                    :source="browseSource"
                    @open="openFile"
                />
                <div v-else class="empty">Select a source</div>
            </div>
        </aside>

        <!-- Content -->
        <main class="main">
            <div class="file-bar">{{ activeFile ?? "—" }}</div>
            <div class="content-row">
                <div class="content-wrap">
                    <div
                        v-if="contentType === 'md'"
                        class="markdown"
                        v-html="renderedContent"
                    />
                    <iframe
                        v-else-if="contentType === 'html'"
                        class="html-frame"
                        :src="iframeSrc"
                    />
                    <pre v-else-if="contentType === 'raw'" class="raw">{{
                        rawContent
                    }}</pre>
                    <div v-else class="empty" style="padding: 40px">
                        Open a file
                    </div>
                </div>
                <nav v-if="toc.length" class="toc">
                    <div class="toc-title">On this page</div>
                    <a
                        v-for="h in toc"
                        :key="h.id"
                        class="toc-item"
                        :class="[
                            'toc-h' + h.level,
                            { active: activeHeading === h.id },
                        ]"
                        :href="'#' + h.id"
                        @click.prevent="scrollToHeading(h.id)"
                        >{{ h.text }}</a
                    >
                </nav>
            </div>
        </main>
    </div>

    <!-- Search modal -->
    <SearchModal
        v-if="showSearch"
        :sources="allSources"
        :excluded="excluded"
        @update:excluded="excluded = $event"
        @close="showSearch = false"
        @open="openFile"
    />
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { onKeyStroke } from "@vueuse/core";
import FileTree from "./components/FileTree.vue";
import SearchModal from "./components/SearchModal.vue";
import {
    initMarkdown,
    renderMarkdown,
    extractHeadings,
} from "./composables/markdown.js";

function load(key, fallback) {
    try {
        const v = localStorage.getItem(key);
        return v !== null ? JSON.parse(v) : fallback;
    } catch {
        return fallback;
    }
}
function save(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {}
}

const showSearch = ref(false);
const allSources = ref([]);
const excluded = ref(load("excluded", []));
const browseSource = ref(load("browseSource", null));
const activeFile = ref(null);
const contentType = ref("");
const renderedContent = ref("");
const rawContent = ref("");
const iframeSrc = ref("");
const toc = ref([]);
const activeHeading = ref(null);

let markdownReady = false;

watch(excluded, (v) => save("excluded", v), { deep: true });
watch(browseSource, (v) => save("browseSource", v));

onKeyStroke("k", (e) => {
    if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        showSearch.value = true;
    }
});

onMounted(async () => {
    allSources.value = await fetch("/sources").then((r) => r.json());
    await initMarkdown();
    markdownReady = true;
});

async function openFile(r) {
    activeFile.value = r.path;
    toc.value = [];
    activeHeading.value = null;
    const ext = r.path.split(".").pop().toLowerCase();

    if (ext === "html") {
        contentType.value = "html";
        iframeSrc.value = "/file?path=" + encodeURIComponent(r.path);
        return;
    }

    const text = await fetch("/file?path=" + encodeURIComponent(r.path)).then(
        (r) => r.text(),
    );
    if (ext === "md" || ext === "mdx") {
        contentType.value = "md";
        renderedContent.value = markdownReady ? renderMarkdown(text) : text;
        toc.value = extractHeadings(text);
    } else {
        contentType.value = "raw";
        rawContent.value = text;
    }
}

function scrollToHeading(id) {
    activeHeading.value = id;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<style scoped>
.layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
}

/* Sidebar */
.sidebar {
    width: 300px;
    min-width: 220px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--border);
    background: var(--bg2);
}

.sidebar-head {
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}

.search-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 7px;
    border: 1px solid var(--border);
    background: var(--bg3);
    color: var(--muted);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s;
}
.search-trigger:hover {
    border-color: var(--accent);
    color: var(--text);
}
.search-trigger svg {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
}
.search-trigger span {
    flex: 1;
    text-align: left;
}
.search-trigger kbd {
    font-size: 11px;
    padding: 1px 5px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg2);
    color: var(--muted);
}

.filters {
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}
.chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}
.chip {
    padding: 2px 9px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
    background: var(--bg3);
    color: var(--muted);
    transition: all 0.15s;
    user-select: none;
}
.chip.active {
    background: var(--accent-dim);
    color: var(--accent);
    border-color: #2a5090;
}

.tree-area {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
}
.empty {
    padding: 24px;
    text-align: center;
    color: var(--muted);
    font-size: 15px;
}

/* Main */
.main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
}
.file-bar {
    padding: 6px 14px;
    font-size: 13px;
    font-family: monospace;
    color: var(--muted);
    border-bottom: 1px solid var(--border);
    background: var(--bg2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
}
.content-row {
    flex: 1;
    display: flex;
    overflow: hidden;
    min-height: 0;
}
.content-wrap {
    flex: 1;
    overflow: auto;
}
.html-frame {
    width: 100%;
    height: 100%;
    border: none;
    background: #fff;
}
.raw {
    padding: 20px 24px;
    font-family: "Menlo", monospace;
    font-size: 15px;
    line-height: 1.7;
    color: #cbd5e1;
    white-space: pre-wrap;
    word-break: break-word;
}

/* TOC */
.toc {
    width: 220px;
    min-width: 180px;
    flex-shrink: 0;
    overflow-y: auto;
    padding: 20px 12px 20px 0;
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 1px;
}
.toc-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 0 12px 8px;
    flex: none;
}
.toc-item {
    display: block;
    flex: none;
    padding: 3px 12px;
    font-size: 13px;
    color: var(--muted);
    text-decoration: none;
    border-radius: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition:
        color 0.12s,
        background 0.12s;
    line-height: 1.5;
}
.toc-item:hover {
    color: var(--text);
    background: var(--bg3);
}
.toc-item.active {
    color: var(--accent);
}
.toc-h1 {
    font-weight: 600;
}
.toc-h2 {
    font-weight: 500;
}
.toc-h3 {
    padding-left: 22px;
    font-size: 12px;
}
.toc-h4,
.toc-h5,
.toc-h6 {
    padding-left: 32px;
    font-size: 12px;
    opacity: 0.75;
}
</style>
