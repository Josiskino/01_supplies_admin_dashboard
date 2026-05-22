<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ period: 'this_month', date_from: null, date_to: null }),
  },
})

const emit = defineEmits(['update:modelValue', 'apply'])

const period = ref(props.modelValue.period || 'this_month')
const dateFrom = ref(props.modelValue.date_from || null)
const dateTo = ref(props.modelValue.date_to || null)

const presets = [
  { value: 'today',      label: 'Aujourd\'hui' },
  { value: 'this_week',  label: 'Cette semaine' },
  { value: 'this_month', label: 'Ce mois' },
  { value: 'custom',     label: 'Personnalisé' },
]

const isCustom = computed(() => period.value === 'custom')

const buildValue = () => ({
  period: period.value,
  date_from: isCustom.value ? dateFrom.value : null,
  date_to:   isCustom.value ? dateTo.value   : null,
})

watch(period, () => {
  if (!isCustom.value) {
    dateFrom.value = null
    dateTo.value = null
    emit('update:modelValue', buildValue())
    emit('apply', buildValue())
  }
})

const selectPreset = value => {
  period.value = value
}

const applyCustom = () => {
  emit('update:modelValue', buildValue())
  emit('apply', buildValue())
}
</script>

<template>
  <VCard
    class="period-filter"
    variant="outlined"
    rounded="lg"
  >
    <VCardText class="d-flex flex-wrap align-center gap-3 py-3">
      <div class="d-flex align-center gap-2 me-2">
        <VIcon
          icon="tabler-calendar"
          size="20"
          class="text-medium-emphasis"
        />
        <span class="text-body-2 font-weight-medium">Période</span>
      </div>

      <div class="d-flex flex-wrap gap-2">
        <VBtn
          v-for="preset in presets"
          :key="preset.value"
          :variant="period === preset.value ? 'elevated' : 'outlined'"
          :color="period === preset.value ? 'primary' : 'default'"
          size="small"
          @click="selectPreset(preset.value)"
        >
          {{ preset.label }}
        </VBtn>
      </div>

      <template v-if="isCustom">
        <VTextField
          v-model="dateFrom"
          type="date"
          label="Du"
          density="compact"
          variant="outlined"
          hide-details
          style="max-inline-size: 180px;"
        />
        <VTextField
          v-model="dateTo"
          type="date"
          label="Au"
          density="compact"
          variant="outlined"
          hide-details
          style="max-inline-size: 180px;"
        />
        <VBtn
          color="primary"
          size="small"
          prepend-icon="tabler-filter"
          :disabled="!dateFrom || !dateTo"
          @click="applyCustom"
        >
          Appliquer
        </VBtn>
      </template>
    </VCardText>
  </VCard>
</template>
