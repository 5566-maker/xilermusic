<template>
  <div class="flex gap-6 h-full pb-4 page-padding pt-6 bg-white dark:bg-black">
    <!-- 桌面端：收藏与历史左右并排 -->
    <template v-if="!isMobile">
      <favorite class="flex-item" />
      <history-list class="flex-item" />
    </template>

    <!-- 移动端：收藏与历史是两个独立列表，用切换分开，不再混在一个入口 -->
    <div v-else class="flex flex-col flex-1 min-h-0 gap-3">
      <div
        class="flex items-center bg-gray-100 dark:bg-neutral-800 rounded-full p-1 self-start flex-shrink-0"
      >
        <button
          class="px-4 h-8 rounded-full text-sm font-medium transition-all duration-300"
          :class="
            mobileTab === 'favorite'
              ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          "
          @click="mobileTab = 'favorite'"
        >
          {{ t('comp.homeHero.quickNav.myFavorite') }}
        </button>
        <button
          class="px-4 h-8 rounded-full text-sm font-medium transition-all duration-300"
          :class="
            mobileTab === 'history'
              ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          "
          @click="mobileTab = 'history'"
        >
          {{ t('history.title') }}
        </button>
      </div>
      <!-- v-show 只切可见性、不卸载重挂：来回切换不重新拉数据、不重播入场动画 -->
      <favorite v-show="mobileTab === 'favorite'" class="flex-item min-h-0" />
      <history-list v-show="mobileTab === 'history'" class="flex-item min-h-0" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'History'
});

import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { isMobile } from '@/utils';
import Favorite from '@/views/favorite/index.vue';
import HistoryList from '@/views/history/index.vue';

const { t } = useI18n();

// 移动端默认先显示收藏
const mobileTab = ref<'favorite' | 'history'>('favorite');
</script>

<style scoped>
.flex-item {
  @apply flex-1 bg-gray-50 dark:bg-neutral-900/50 rounded-3xl overflow-hidden border border-gray-100 dark:border-neutral-800 transition-all duration-300;
}
</style>
