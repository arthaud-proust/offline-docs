<template>
    <Teleport to="body">
        <div class="backdrop" @mousedown.self="$emit('close')">
            <div class="modal" role="dialog">
                <!-- Search input -->
                <div class="search-bar">
                    <svg
                        class="search-icon"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                            clip-rule="evenodd"
                        />
                    </svg>
                    <input
                        ref="inputEl"
                        v-model="query"
                        type="search"
                        placeholder="Search docs…"
                        autocomplete="off"
                        @keydown.escape="$emit('close')"
                        @keydown.arrow-down.prevent="moveFocus(1)"
                        @keydown.arrow-up.prevent="moveFocus(-1)"
                        @keydown.enter.prevent="selectFocused"
                    />
                    <kbd @click="$emit('close')">esc</kbd>
                </div>

                <!-- Source chips -->
                <div class="modal-filters">
                    <button
                        v-for="src in sources"
                        :key="src"
                        class="chip"
                        :class="{ active: !excluded.includes(src) }"
                        @click="toggleSource(src)"
                    >
                        {{ src }}
                    </button>
                </div>

                <!-- Results -->
                <div class="results-area">
                    <div v-if="loading" class="hint">Searching…</div>
                    <div v-else-if="query.length < 2" class="hint">
                        Type at least 2 characters
                    </div>
                    <div v-else-if="!flat.length" class="hint">
                        No results for "{{ query }}"
                    </div>
                    <template
                        v-else
                        v-for="group in grouped"
                        :key="group.label"
                    >
                        <div class="section-header">{{ group.label }}</div>
                        <button
                            v-for="r in group.items"
                            :key="r.path"
                            class="result-btn"
                            :class="{ focused: focusedPath === r.path }"
                            @click="select(r)"
                            @mouseenter="focusedPath = r.path"
                        >
                            <span
                                class="result-icon"
                                :class="'icon-' + r.matchType"
                            >
                                <template v-if="r.matchType === 'filename'">
                                    <svg
                                        viewBox="0 0 16 16"
                                        fill="currentColor"
                                    >
                                        <path
                                            d="M4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5L9.5 0H4zm0 1h5v3.5A1.5 1.5 0 0 0 10.5 6H14v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"
                                        />
                                    </svg>
                                </template>
                                <template v-else>#</template>
                            </span>
                            <span class="result-body">
                                <span
                                    v-if="r.matchType === 'title'"
                                    class="result-pagename"
                                    >{{ pageName(r) }}</span
                                >
                                <span class="result-title">{{
                                    displayTitle(r)
                                }}</span>
                                <span
                                    v-if="
                                        r.matchType === 'content' &&
                                        r.snippets[0]
                                    "
                                    class="result-sub"
                                    >{{ r.snippets[0] }}</span
                                >
                            </span>
                            <svg
                                class="result-arrow"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"
                                />
                            </svg>
                        </button>
                    </template>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";

const props = defineProps({ sources: Array, excluded: Array });
const emit = defineEmits(["close", "open", "update:excluded"]);

const query = ref("");
const results = ref([]);
const loading = ref(false);
const focusedPath = ref(null);
const inputEl = ref(null);
const localExcluded = ref([...(props.excluded ?? [])]);

watch(
    () => props.excluded,
    (v) => {
        localExcluded.value = [...(v ?? [])];
    },
    { deep: true },
);

const excluded = computed(() => localExcluded.value);

function toggleSource(src) {
    const i = localExcluded.value.indexOf(src);
    if (i >= 0) localExcluded.value.splice(i, 1);
    else localExcluded.value.push(src);
    emit("update:excluded", [...localExcluded.value]);
    if (query.value.length >= 2) doSearch();
}

onMounted(() => nextTick(() => inputEl.value?.focus()));

let timer = null;
watch(query, () => {
    clearTimeout(timer);
    if (query.value.length < 2) {
        results.value = [];
        loading.value = false;
        return;
    }
    loading.value = true;
    timer = setTimeout(doSearch, 250);
});

async function doSearch() {
    const q = query.value.trim();
    const active = (props.sources ?? []).filter(
        (s) => !localExcluded.value.includes(s),
    );
    const params = new URLSearchParams({
        q,
        sources:
            active.length === (props.sources ?? []).length
                ? ""
                : active.join(","),
    });
    const data = await fetch("/search?" + params).then((r) => r.json());
    results.value = data;
    loading.value = false;
    focusedPath.value = data[0]?.path ?? null;
}

const flat = computed(() => results.value);

const grouped = computed(() => {
    const map = new Map();
    for (const r of results.value) {
        if (!map.has(r.label)) map.set(r.label, []);
        map.get(r.label).push(r);
    }
    return [...map.entries()].map(([label, items]) => ({ label, items }));
});

function moveFocus(dir) {
    const list = flat.value;
    const idx = list.findIndex((r) => r.path === focusedPath.value);
    const next = Math.max(0, Math.min(list.length - 1, idx + dir));
    focusedPath.value = list[next]?.path ?? null;
}

function selectFocused() {
    const r = flat.value.find((r) => r.path === focusedPath.value);
    if (r) select(r);
}

function select(r) {
    emit("open", r);
    emit("close");
}

function pageName(r) {
    const base = r.rel
        .split("/")
        .pop()
        .replace(/\.\w+$/, "");
    return base.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayTitle(r) {
    if (r.matchType === "title" && r.snippets[0]) {
        return r.snippets[0].replace(/^#+\s*/, "").replace(/^title:\s*/i, "");
    }
    return pageName(r);
}
</script>

<style scoped>
.backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 80px;
}

.modal {
    width: 100%;
    max-width: 640px;
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 160px);
}

/* Search bar */
.search-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}
.search-icon {
    width: 18px;
    height: 18px;
    color: var(--muted);
    flex-shrink: 0;
}
.search-bar input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--text);
    font-size: 17px;
    caret-color: var(--accent);
}
.search-bar input::placeholder {
    color: var(--muted);
}
.search-bar input::-webkit-search-cancel-button {
    display: none;
}
kbd {
    font-size: 12px;
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 2px 6px;
    cursor: pointer;
    flex-shrink: 0;
}
kbd:hover {
    color: var(--text);
}

/* Filters */
.modal-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}
.chip {
    padding: 2px 9px;
    border-radius: 20px;
    border: 1px solid transparent;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    background: var(--bg3);
    color: var(--muted);
    transition: all 0.12s;
}
.chip.active {
    background: var(--accent-dim);
    color: var(--accent);
    border-color: #2a5090;
}

/* Results */
.results-area {
    overflow-y: auto;
    flex: 1;
    padding: 8px 0 12px;
}
.hint {
    padding: 32px;
    text-align: center;
    color: var(--muted);
    font-size: 15px;
}

.section-header {
    padding: 12px 16px 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--accent);
    opacity: 0.8;
}

.result-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    color: var(--text);
    transition: background 0.1s;
}
.result-btn.focused,
.result-btn:hover {
    background: var(--bg3);
}

.result-icon {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    border: 1px solid var(--border);
    background: var(--bg);
    font-size: 14px;
    font-weight: 700;
    color: var(--muted);
}
.result-icon svg {
    width: 14px;
    height: 14px;
}
.result-icon.icon-filename {
    color: var(--muted);
}
.result-icon.icon-title,
.result-icon.icon-content {
    color: var(--accent);
}

.result-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
}
.result-pagename {
    font-size: 11px;
    color: var(--accent);
    font-weight: 600;
    letter-spacing: 0.02em;
}
.result-title {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.result-sub {
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.result-arrow {
    width: 14px;
    height: 14px;
    color: var(--muted);
    flex-shrink: 0;
}
</style>
