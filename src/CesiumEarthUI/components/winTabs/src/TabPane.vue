<template>
    <el-tab-pane :label="label" :name="name">
        <slot></slot>
    </el-tab-pane>
</template>

<script lang="ts" setup>
const props = defineProps(["label", "name"])
</script>

<style scoped></style>