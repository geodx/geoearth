<template>

    <VideoShedContent v-if="true"></VideoShedContent>

</template>
<script lang="ts" setup>
import { computed } from 'vue';
import VideoShedContent from './videoShedContent.vue';
import { useCesiumEarthStore } from '@/stores/CesiumEarthStore';

const ceStore = useCesiumEarthStore()

const show = computed(() => {
    return ceStore.comStatus('videoShed');
}) 
</script>
