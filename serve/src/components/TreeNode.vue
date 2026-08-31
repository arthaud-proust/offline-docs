<template>
    <div class="node">
        <!-- Directory -->
        <template v-if="entry.isDir">
            <button
                class="node-dir"
                :style="{ '--depth': depth }"
                @click="toggle"
            >
                <span class="icon">{{ open ? "▾" : "▸" }}</span>
                <span class="name">{{ entry.name }}</span>
            </button>
            <div v-if="open" class="node-children">
                <TreeNode
                    v-for="child in children"
                    :key="child.path"
                    :entry="child"
                    :source="source"
                    :depth="depth + 1"
                    @open="$emit('open', $event)"
                />
                <div v-if="loading" class="loading">…</div>
            </div>
        </template>

        <!-- File -->
        <button v-else class="node-file" @click="$emit('open', entry.path)">
            <span class="name">{{ entry.name }}</span>
        </button>
    </div>
</template>

<script setup>
import { onMounted, ref } from "vue";

const props = defineProps({ entry: Object, source: String, depth: Number });
defineEmits(["open"]);

const open = ref(false);
const children = ref([]);
const loading = ref(false);

onMounted(() => {
    // toggle();
});

async function toggle() {
    open.value = !open.value;
    if (open.value && children.value.length === 0) {
        loading.value = true;
        const data = await fetch(
            `/tree?source=${encodeURIComponent(props.source)}&subpath=${encodeURIComponent(props.entry.subpath)}`,
        ).then((r) => r.json());
        children.value = data;
        loading.value = false;
    }
}
</script>

<style scoped>
.node {
    font-size: 14px;
    position: relative;
}

.node-dir,
.node-file {
    --node-height: 30px;
    width: 100%;
    height: var(--node-height);
    border: none;
    background: none;
    padding: 0 8px;

    cursor: pointer;

    color: var(--muted);
    background: var(--bg2);
    border-radius: 4px;
}

.node-dir {
    position: sticky;
    z-index: 1;
    top: calc(var(--node-height) * var(--depth));
    display: flex;
    align-items: center;
    gap: 4px;
}
.node-dir:hover {
    background: var(--bg3);
    color: var(--text);
}
.icon {
    color: var(--muted);
    width: 10px;
    flex-shrink: 0;
    font-style: normal;
}
.node-dir .name {
    font-weight: 600;
}
.node-children {
    position: relative;
    z-index: 0;
    margin-left: 12px;
    padding-left: 4px;
    border-left: 1px solid var(--border);
}

.node-file {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
}
.node-file:hover {
    background: var(--bg3);
    color: var(--text);
}
.loading {
    padding: 3px 8px;
    color: var(--muted);
    font-style: italic;
}
</style>
