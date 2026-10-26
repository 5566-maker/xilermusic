<template>
  <setting-section :title="t('settings.sections.about')">
    <setting-item :title="t('settings.about.version')">
      <template #description>
        <div class="flex items-center gap-2">
          <span class="font-medium">XilerMusic</span>
          <span class="text-neutral-400">v{{ version }}</span>
        </div>
      </template>
    </setting-item>
  </setting-section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import config from '../../../../../package.json';
import SettingItem from '../SettingItem.vue';
import SettingSection from '../SettingSection.vue';

const { t } = useI18n();
const version = config.version;
</script>
