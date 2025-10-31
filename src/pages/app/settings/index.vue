<script setup>
import SettingsLocations from '@/views/apps/ecommerce/settings/SettingsLocations.vue'
import SettingsNotifications from '@/views/apps/ecommerce/settings/SettingsNotifications.vue'
import SettingsStatuses from '@/views/apps/ecommerce/settings/SettingsStatuses.vue'

const tabsData = [
  {
    icon: 'tabler-map-pin',
    title: 'Pricing & Distance',
  },
  {
    icon: 'tabler-bell-ringing',
    title: 'Notifications',
  },
  {
    icon: 'tabler-tags',
    title: 'Status Management',
  },
]

const activeTab = ref(null)
</script>

<template>
  <VRow>
    <VCol
      cols="12"
      md="4"
    >
      <h5 class="text-h5 mb-4">
        Getting Started
      </h5>

      <VTabs
        v-model="activeTab"
        direction="vertical"
        class="v-tabs-pill disable-tab-transition"
      >
        <VTab
          v-for="(tabItem, index) in tabsData"
          :key="index"
          :prepend-icon="tabItem.icon"
        >
          {{ tabItem.title }}
        </VTab>
      </VTabs>
    </VCol>

    <VCol
      cols="12"
      md="8"
    >
      <VWindow
        v-model="activeTab"
        class="disable-tab-transition"
        :touch="false"
      >
        <VWindowItem>
          <SettingsLocations />
        </VWindowItem>

        <VWindowItem>
          <SettingsNotifications />
        </VWindowItem>

        <VWindowItem>
          <SettingsStatuses />
        </VWindowItem>
      </VWindow>
    </VCol>
  </VRow>
</template>

<style lang="scss">
.my-class {
  padding: 1.25rem;
  border-radius: 0.375rem;
  background-color: rgba(var(--v-theme-on-surface), var(--v-hover-opacity));
}
</style>
