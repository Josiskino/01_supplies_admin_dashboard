<script setup>
const pricingSettings = ref({
  range_0_1km: 375,
  range_1_5km: 500,
  range_5_6km: 600,
  additional_per_km: 100,
})

const savePricingSettings = async () => {
  try {
    await $api('/settings/pricing', {
      method: 'POST',
      body: pricingSettings.value,
    })
    // Show success message
    console.log('Pricing settings saved successfully')
  } catch (error) {
    console.error('Error saving pricing settings:', error)
  }
}
</script>

<template>
  <div>
    <VCard
      title="Distance-Based Pricing Configuration"
      class="mb-6"
    >
      <VCardText>
        <VAlert
          type="info"
          variant="tonal"
          class="mb-6"
        >
          <VAlertTitle class="mb-2">
            Pricing Structure
          </VAlertTitle>
          <p class="mb-0">
            Configure delivery prices based on distance ranges. Prices are automatically calculated based on the distance between pickup and delivery locations.
          </p>
        </VAlert>

        <VRow>
          <!-- 0-1km Range -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="pricingSettings.range_0_1km"
              type="number"
              label="0 - 1 km"
              placeholder="375"
              suffix="FCFA"
            >
              <template #prepend-inner>
                <VIcon icon="tabler-map-pin" />
              </template>
            </AppTextField>
            <p class="text-sm text-medium-emphasis mt-1">
              Price for deliveries from 0 to 1 kilometer
            </p>
          </VCol>

          <!-- 1.1-5km Range -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="pricingSettings.range_1_5km"
              type="number"
              label="1.1 - 5 km"
              placeholder="500"
              suffix="FCFA"
            >
              <template #prepend-inner>
                <VIcon icon="tabler-route" />
              </template>
            </AppTextField>
            <p class="text-sm text-medium-emphasis mt-1">
              Price for deliveries from 1.1 to 5 kilometers
            </p>
          </VCol>

          <!-- 5.1-6km Range -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="pricingSettings.range_5_6km"
              type="number"
              label="5.1 - 6 km"
              placeholder="600"
              suffix="FCFA"
            >
              <template #prepend-inner>
                <VIcon icon="tabler-map-2" />
              </template>
            </AppTextField>
            <p class="text-sm text-medium-emphasis mt-1">
              Price for deliveries from 5.1 to 6 kilometers
            </p>
          </VCol>

          <!-- Additional per km -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="pricingSettings.additional_per_km"
              type="number"
              label="Additional per km (6.1+ km)"
              placeholder="100"
              suffix="FCFA"
            >
              <template #prepend-inner>
                <VIcon icon="tabler-plus" />
              </template>
            </AppTextField>
            <p class="text-sm text-medium-emphasis mt-1">
              Additional price per kilometer beyond 6 km
            </p>
          </VCol>
        </VRow>

        <VDivider class="my-6" />

        <!-- Pricing Example -->
        <VCard
          variant="tonal"
          color="primary"
          class="mb-6"
        >
          <VCardText>
            <h6 class="text-h6 mb-3">
              <VIcon icon="tabler-calculator" class="me-2" />
              Pricing Examples
            </h6>
            <VRow>
              <VCol cols="12" sm="6" md="3">
                <div class="text-center">
                  <p class="text-sm text-medium-emphasis mb-1">0.5 km</p>
                  <p class="text-h6 text-primary">{{ pricingSettings.range_0_1km }} FCFA</p>
                </div>
              </VCol>
              <VCol cols="12" sm="6" md="3">
                <div class="text-center">
                  <p class="text-sm text-medium-emphasis mb-1">3 km</p>
                  <p class="text-h6 text-primary">{{ pricingSettings.range_1_5km }} FCFA</p>
                </div>
              </VCol>
              <VCol cols="12" sm="6" md="3">
                <div class="text-center">
                  <p class="text-sm text-medium-emphasis mb-1">5.5 km</p>
                  <p class="text-h6 text-primary">{{ pricingSettings.range_5_6km }} FCFA</p>
                </div>
              </VCol>
              <VCol cols="12" sm="6" md="3">
                <div class="text-center">
                  <p class="text-sm text-medium-emphasis mb-1">8 km</p>
                  <p class="text-h6 text-primary">{{ pricingSettings.range_5_6km + (2 * pricingSettings.additional_per_km) }} FCFA</p>
                </div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- Save Button -->
        <div class="d-flex justify-end">
          <VBtn
            color="primary"
            @click="savePricingSettings"
          >
            <VIcon icon="tabler-device-floppy" class="me-2" />
            Save Pricing Settings
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </div>
</template>