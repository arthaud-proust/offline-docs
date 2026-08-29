<template>
  <div class="tree-root">
    <TreeNode
      v-for="entry in roots"
      :key="entry.path"
      :entry="entry"
      :source="source"
      @open="$emit('open', $event)"
    />
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import TreeNode from "./TreeNode.vue";

const props = defineProps({ source: String });
defineEmits(["open"]);

const roots = ref([]);

watch(() => props.source, loadRoot, { immediate: true });

async function loadRoot() {
  if (!props.source) { roots.value = []; return; }
  const data = await fetch(`/tree?source=${encodeURIComponent(props.source)}&subpath=`).then(r => r.json());
  roots.value = data;
}
</script>

<style scoped>
.tree-root { padding: 4px 0 }
</style>
