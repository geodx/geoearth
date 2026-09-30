<template>
  <aside class="demo-sidebar">
    <header class="directory-heading">
      <span>{{ t("directory.title") }}</span>
      <el-tag size="small" type="info">
        {{ demoMap.size }}
      </el-tag>
    </header>

    <div class="directory-search">
      <el-input v-model="query" clearable :placeholder="t('directory.search')" :aria-label="t('directory.search')">
        <template #prefix>
          <el-icon aria-hidden="true"><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <nav class="demo-tree" :aria-label="t('directory.title')">
      <el-tree ref="treeRef" :data="demoTree" :props="treeProps" node-key="id" default-expand-all highlight-current
        :current-node-key="String(route.params.id ?? '')" :filter-node-method="filterNode"
        :empty-text="t('directory.empty')" @node-click="selectDemo">
        <template #default="{ data }">
          <span class="tree-node" :title="data.description ? t(data.description) : undefined">
            <el-icon aria-hidden="true"><Files v-if="data.children" /><EditPen v-else /></el-icon>
            <span>{{ t(data.title) }}</span>
          </span>
        </template>
      </el-tree>
    </nav>
  </aside>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import type {
  FilterNodeMethodFunction,
  TreeInstance,
  TreeOptionProps,
} from "element-plus";
import { demoMap, demoTree, type DemoNode } from "@/demos/registry";
import { Search, Files, EditPen } from "@element-plus/icons-vue";

const emit = defineEmits<{ select: [] }>();

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

const query = ref("");
const treeRef = ref<TreeInstance>();

const treeProps: TreeOptionProps = {
  children: "children",
  label: (data) => t(data.title),
};

const filterNode: FilterNodeMethodFunction = (value, data) => {
  const keyword = String(value).trim().toLowerCase();
  const text = `${t(data.title)} ${data.id}`.toLowerCase();

  return text.includes(keyword);
};

// 切换语言后，搜索也使用新的翻译文本。
watch(
  [query, locale],
  () => treeRef.value?.filter(query.value),
  { flush: "post" },
);

function selectDemo(node: DemoNode) {
  if ("children" in node) return;

  // 再次选择当前示例，只切回代码面板，不清空修改。
  if (node.id !== route.params.id) {
    void router.push({
      name: "playground",
      params: { id: node.id },
    });
  }

  emit("select");
}
</script>

<style scoped>
.demo-sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface);
}
.directory-heading {
  height: 50px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  flex: none;
  font-size: 14px;
  font-weight: 600;
}
.directory-search {
  padding: 8px 18px 20px;
}
.demo-tree {
  overflow: auto;
  flex: 1;
  min-height: 0;
  padding: 0 12px 18px;
}
.demo-tree :deep(.el-tree) {
  background: transparent;
  --el-tree-node-content-height: 40px;
}
.demo-tree :deep(.el-tree-node__content) {
  border-radius: 6px;
}
.tree-node {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  padding-right: 10px;
}
.tree-node > span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
