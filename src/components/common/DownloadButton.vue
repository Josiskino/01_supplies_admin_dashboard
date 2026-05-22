<script setup>
import { computed } from 'vue'
import { useExportDownload } from '@/composables/useExportDownload'
import { useAbility } from '@casl/vue'

const props = defineProps({
  endpoint: { type: String, required: true },
  params:   { type: Object, default: () => ({}) },
  filename: { type: String, default: 'export.xlsx' },
  label:    { type: String, default: 'Télécharger Excel' },
  icon:     { type: String, default: 'tabler-file-spreadsheet' },
  color:    { type: String, default: 'success' },
  variant:  { type: String, default: 'tonal' },
  size:     { type: String, default: 'default' },
  density:  { type: String, default: 'default' },
  permission: { type: String, default: 'export-data' },
  method:   { type: String, default: 'GET' },
  body:     { type: Object, default: null },
})

const ability = useAbility()
const { isLoading, download } = useExportDownload()

const canExport = computed(() => {
  if (!props.permission) return true
  const firstDash = props.permission.indexOf('-')
  if (firstDash === -1) return ability.can(props.permission, 'all')
  const action  = props.permission.substring(0, firstDash)
  const subject = props.permission.substring(firstDash + 1)
  return ability.can(action, subject)
})

const buildFilename = () => {
  if (props.filename.includes('.xlsx')) return props.filename
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `${props.filename}-${stamp}.xlsx`
}

const handleClick = () => {
  download({
    endpoint: props.endpoint,
    params:   props.params,
    filename: buildFilename(),
    method:   props.method,
    body:     props.body,
  })
}
</script>

<template>
  <VBtn
    v-if="canExport"
    :color="color"
    :variant="variant"
    :size="size"
    :density="density"
    :loading="isLoading"
    :disabled="isLoading"
    :prepend-icon="icon"
    @click="handleClick"
  >
    {{ label }}
  </VBtn>
</template>
