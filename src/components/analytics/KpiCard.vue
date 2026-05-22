<script setup>
defineProps({
  label:    { type: String, required: true },
  value:    { type: [String, Number], default: '–' },
  suffix:   { type: String, default: '' },
  icon:     { type: String, default: 'tabler-chart-line' },
  color:    { type: String, default: 'primary' },
  hint:     { type: String, default: '' },
  loading:  { type: Boolean, default: false },
})
</script>

<template>
  <VCard
    rounded="lg"
    variant="flat"
    class="h-100 kpi-card"
  >
    <VCardText class="d-flex align-center gap-4 pa-5">
      <VAvatar
        :color="color"
        variant="tonal"
        rounded="lg"
        size="48"
      >
        <VIcon :icon="icon" />
      </VAvatar>

      <div class="flex-grow-1">
        <div class="text-caption text-medium-emphasis text-uppercase">
          {{ label }}
        </div>

        <div class="d-flex align-baseline gap-1">
          <VSkeletonLoader
            v-if="loading"
            type="text"
            class="kpi-skeleton"
          />
          <template v-else>
            <span class="text-h5 font-weight-bold">{{ value }}</span>
            <span
              v-if="suffix"
              class="text-body-2 text-medium-emphasis"
            >{{ suffix }}</span>
          </template>
        </div>

        <div
          v-if="hint && !loading"
          class="text-caption text-medium-emphasis mt-1"
        >
          {{ hint }}
        </div>
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
.kpi-card {
  transition: box-shadow 200ms;
}

.kpi-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.kpi-skeleton {
  min-inline-size: 80px;
}
</style>
