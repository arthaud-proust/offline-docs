<template>
    <div class="node">
        <!-- Directory -->
        <template v-if="entry.isDir">
            <div class="node-dir" @click="toggle">
                <span class="icon">{{ open ? "▾" : "▸" }}</span>
                <span class="name">{{ entry.name }}</span>
            </div>
            <div v-if="open" class="node-children">
                <TreeNode
                    v-for="child in children"
                    :key="child.path"
                    :entry="child"
                    :source="source"
                    @open="$emit('open', $event)"
                />
                <div v-if="loading" class="loading">…</div>
            </div>
        </template>

        <!-- File -->
        <div v-else class="node-file" @click="$emit('open', entry)">
            <span class="name">{{ entry.name }}</span>
        </div>
    </div>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({ entry: Object, source: String });
defineEmits(["open"]);

const open = ref(false);
const children = ref([]);
const loading = ref(false);

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
}
.node-dir {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    cursor: pointer;
    color: var(--muted);
    border-radius: 4px;
}
.node-dir:hover {
    background: #161d2a;
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
    margin-left: 14px;
    border-left: 1px solid var(--border);
}
.node-file {
    padding: 3px 8px;
    cursor: pointer;
    color: #7b8fa3;
    border-radius: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.node-file:hover {
    background: #161d2a;
    color: var(--text);
}
.loading {
    padding: 3px 8px;
    color: var(--muted);
    font-style: italic;
}
</style>
