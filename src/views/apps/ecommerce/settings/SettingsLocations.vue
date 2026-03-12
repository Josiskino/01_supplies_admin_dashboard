<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const activeTab     = ref(0)
const isLoading     = ref(false)
const saveSuccess   = ref(false)
const saveError     = ref('')

// ─── Commission (localStorage uniquement) ───────────────────────────────────
const commissionRate = ref(
  parseFloat(localStorage.getItem('driver_commission_rate') || '0.306'),
)

const saveCommission = () => {
  localStorage.setItem('driver_commission_rate', commissionRate.value.toString())
  saveSuccess.value = true
}

// ─── Calculation configs ─────────────────────────────────────────────────────
const configs         = ref([])
const selectedConfig  = ref(null)
const editedTiers     = ref([])

const loadConfigs = async () => {
  isLoading.value = true
  try {
    const res = await $api('/calculation-configs')
    configs.value = res.data ?? []
    if (configs.value.length > 0) {
      selectConfig(configs.value.find(c => c.is_default) ?? configs.value[0])
    }
  } catch (e) {
    saveError.value = t('Failed to load pricing configurations')
  } finally {
    isLoading.value = false
  }
}

const selectConfig = config => {
  selectedConfig.value = config
  editedTiers.value    = JSON.parse(JSON.stringify(config.pricing_tiers ?? []))
}

const saveConfig = async () => {
  if (!selectedConfig.value) return
  isLoading.value = true
  saveError.value = ''
  try {
    const res = await $api(`/calculation-configs/${selectedConfig.value.id}`, {
      method: 'PUT',
      body:   { pricing_tiers: editedTiers.value },
    })
    // Mettre à jour la config dans la liste locale
    const idx = configs.value.findIndex(c => c.id === selectedConfig.value.id)
    if (idx !== -1) configs.value[idx] = res.data
    selectedConfig.value = res.data
    saveSuccess.value    = true
  } catch (e) {
    saveError.value = t('Failed to save configuration')
  } finally {
    isLoading.value = false
  }
}

// Simulateur de prix
const simulateKm    = ref(3)
const simulatePrice = computed(() => {
  if (!editedTiers.value.length) return null
  const km = Math.ceil(simulateKm.value)
  for (const tier of editedTiers.value) {
    const max = tier.max_km
    if (max === null || km <= max) {
      if (tier.price_per_km) {
        return tier.price + (km - tier.base_km) * tier.price_per_km
      }
      return tier.price
    }
  }
  return null
})

onMounted(loadConfigs)
</script>

<template>
  <div>
    <VSnackbar
      v-model="saveSuccess"
      color="success"
      :timeout="3000"
      location="top end"
    >
      {{ $t('Settings saved successfully') }}
    </VSnackbar>

    <VCard :title="$t('Pricing & Distance')">
      <VCardText>
        <VTabs v-model="activeTab" class="mb-6">
          <VTab>
            <VIcon icon="tabler-currency-dollar" class="me-2" />
            {{ $t('Pricing Configuration') }}
          </VTab>
          <VTab>
            <VIcon icon="tabler-route" class="me-2" />
            {{ $t('Distance Calculation Service') }}
          </VTab>
          <VTab>
            <VIcon icon="tabler-percentage" class="me-2" />
            {{ $t('Driver Commission') }}
          </VTab>
        </VTabs>

        <VWindow v-model="activeTab">

          <!-- ─── Tab 0 : Pricing ─────────────────────────────────────────── -->
          <VWindowItem>
            <VAlert
              v-if="saveError"
              type="error"
              variant="tonal"
              class="mb-4"
              closable
              @click:close="saveError = ''"
            >
              {{ saveError }}
            </VAlert>

            <VProgressLinear v-if="isLoading" indeterminate color="primary" class="mb-4" />

            <!-- Sélecteur de config -->
            <VRow class="mb-4">
              <VCol cols="12">
                <AppSelect
                  :model-value="selectedConfig?.id"
                  :label="$t('Configuration')"
                  :items="configs.map(c => ({ title: c.name + (c.is_default ? ' ★' : ''), value: c.id }))"
                  @update:model-value="id => selectConfig(configs.find(c => c.id === id))"
                />
              </VCol>
            </VRow>

            <template v-if="selectedConfig">
              <!-- Info badges -->
              <div class="d-flex gap-2 flex-wrap mb-6">
                <VChip
                  v-if="selectedConfig.is_default"
                  color="primary"
                  size="small"
                  prepend-icon="tabler-star"
                >
                  {{ $t('Default') }}
                </VChip>
                <VChip size="small" prepend-icon="tabler-circle-check" :color="selectedConfig.is_active ? 'success' : 'error'">
                  {{ selectedConfig.is_active ? $t('Active') : $t('Inactive') }}
                </VChip>
                <VChip size="small" prepend-icon="tabler-arrows-up-down">
                  {{ $t('Rounding') }}: {{ selectedConfig.rounding_mode }}
                </VChip>
              </div>

              <!-- Tableau des tranches tarifaires -->
              <h6 class="text-h6 mb-3">{{ $t('Pricing Tiers') }}</h6>
              <VTable class="mb-6">
                <thead>
                  <tr>
                    <th>{{ $t('Min km') }}</th>
                    <th>{{ $t('Max km') }}</th>
                    <th>{{ $t('Base price (FCFA)') }}</th>
                    <th>{{ $t('+ per km (FCFA)') }}</th>
                    <th>{{ $t('Base km') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(tier, i) in editedTiers" :key="i">
                    <td>{{ tier.min_km }}</td>
                    <td>{{ tier.max_km ?? '∞' }}</td>
                    <td>
                      <AppTextField
                        v-model.number="tier.price"
                        type="number"
                        density="compact"
                        hide-details
                        style="min-width:100px"
                      />
                    </td>
                    <td>
                      <AppTextField
                        v-model.number="tier.price_per_km"
                        type="number"
                        density="compact"
                        hide-details
                        :placeholder="$t('none')"
                        style="min-width:100px"
                      />
                    </td>
                    <td>{{ tier.base_km ?? '—' }}</td>
                  </tr>
                </tbody>
              </VTable>

              <!-- Simulateur -->
              <VCard variant="tonal" color="primary" class="mb-6">
                <VCardText>
                  <h6 class="text-h6 mb-3">
                    <VIcon icon="tabler-calculator" class="me-2" />
                    {{ $t('Price Simulator') }}
                  </h6>
                  <VRow align="center">
                    <VCol cols="12" sm="6">
                      <AppTextField
                        v-model.number="simulateKm"
                        type="number"
                        step="0.1"
                        min="0"
                        :label="$t('Distance (km)')"
                        density="compact"
                        hide-details
                      />
                    </VCol>
                    <VCol cols="12" sm="6" class="text-center">
                      <p class="text-sm text-medium-emphasis mb-1">
                        {{ $t('Estimated price') }} ({{ $t('ceil') }} {{ Math.ceil(simulateKm) }} km)
                      </p>
                      <p class="text-h5 font-weight-bold text-primary">
                        {{ simulatePrice !== null ? `${simulatePrice} FCFA` : '—' }}
                      </p>
                    </VCol>
                  </VRow>
                </VCardText>
              </VCard>

              <!-- Save -->
              <div class="d-flex justify-end">
                <VBtn
                  color="primary"
                  :loading="isLoading"
                  prepend-icon="tabler-device-floppy"
                  @click="saveConfig"
                >
                  {{ $t('Save Pricing Settings') }}
                </VBtn>
              </div>
            </template>
          </VWindowItem>

          <!-- ─── Tab 1 : Distance service ───────────────────────────────── -->
          <VWindowItem>
            <VAlert type="info" variant="tonal" class="mb-4">
              <VAlertTitle class="mb-2">
                {{ $t('Distance Calculation Service') }}
              </VAlertTitle>
              <p class="mb-0">
                {{ $t('The distance calculation service is configured at the server level via environment variables. Contact your system administrator to change the service (OSRM, Google Maps, Haversine).') }}
              </p>
            </VAlert>

            <VCard variant="outlined">
              <VCardText>
                <div class="d-flex align-center gap-3">
                  <VIcon icon="tabler-server" size="32" color="primary" />
                  <div>
                    <p class="text-subtitle-1 font-weight-medium mb-0">
                      {{ $t('Server-side configuration') }}
                    </p>
                    <p class="text-sm text-medium-emphasis mb-0">
                      {{ $t('Variable') }}: <code>DISTANCE_SERVICE</code> (.env)
                    </p>
                  </div>
                </div>
              </VCardText>
            </VCard>
          </VWindowItem>

          <!-- ─── Tab 2 : Commission ─────────────────────────────────────── -->
          <VWindowItem>
            <VAlert type="info" variant="tonal" class="mb-4">
              <p class="mb-0">
                {{ $t('Commission percentage applied to total driver turnover. Stored locally in this browser.') }}
              </p>
            </VAlert>

            <VRow>
              <VCol cols="12" md="6">
                <AppTextField
                  v-model.number="commissionRate"
                  type="number"
                  step="0.001"
                  :label="$t('Commission Rate')"
                  placeholder="0.306"
                  suffix="%"
                >
                  <template #prepend-inner>
                    <VIcon icon="tabler-percentage" />
                  </template>
                </AppTextField>
                <p class="text-sm text-medium-emphasis mt-1">
                  {{ $t('Example: 0.306 for 30.6%') }}
                </p>
              </VCol>
            </VRow>

            <VDivider class="my-6" />

            <div class="d-flex justify-end">
              <VBtn
                color="primary"
                prepend-icon="tabler-device-floppy"
                @click="saveCommission"
              >
                {{ $t('Save Commission Settings') }}
              </VBtn>
            </div>
          </VWindowItem>

        </VWindow>
      </VCardText>
    </VCard>
  </div>
</template>
