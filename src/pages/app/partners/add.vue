<script setup>
/* eslint-disable camelcase */
const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['update:isDialogVisible', 'partnerAdded'])

const dialogVisible = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
})

// Form data
const form = ref({
  prospection_date: new Date().toISOString().split('T')[0], // Today's date
  merchant_name: '',
  contact_name: '',
  phone: '',
  activity_sector: '',
  engagement_type: '',
  interest_shown: '',
  other_info: '',
  status_id: null,
  location: '',
  address: '',
  address_label: '',
})

// Loading states
const isSubmitting = ref(false)
const partnerStatuses = ref([])
const isLoadingStatuses = ref(false)

// 👉 Fetch Partner Statuses
const fetchPartnerStatuses = async () => {
  isLoadingStatuses.value = true
  try {
    const response = await $api('/status/partner-statuses', {
      method: 'GET',
    })
    
    if (response && response.success && response.data && Array.isArray(response.data)) {
      partnerStatuses.value = response.data
    } else {
      partnerStatuses.value = []
    }
  } catch (error) {
    console.error('Error fetching partner statuses:', error)
    partnerStatuses.value = []
  } finally {
    isLoadingStatuses.value = false
  }
}

// Status options from API
const statusOptions = computed(() => {
  return partnerStatuses.value.map(status => ({
    title: status.name,
    value: status.id,
  }))
})

// Options
const activitySectorOptions = [
  { title: 'Restauration', value: 'Restauration' },
  { title: 'Commerce', value: 'Commerce' },
  { title: 'E-commerce', value: 'E-commerce' },
  { title: 'Santé', value: 'Santé' },
  { title: 'Éducation', value: 'Éducation' },
  { title: 'Technologie', value: 'Technologie' },
  { title: 'Manufacture', value: 'Manufacture' },
  { title: 'Services', value: 'Services' },
  { title: 'Autre', value: 'Autre' },
]

const engagementTypeOptions = [
  { title: 'Partenaire', value: 'partenaire' },
  { title: 'Client', value: 'client' },
  { title: 'Fournisseur', value: 'fournisseur' },
  { title: 'Autre', value: 'autre' },
]

// Load statuses on mount
onMounted(() => {
  fetchPartnerStatuses()
})

// Submit form
const onSubmit = async () => {
  isSubmitting.value = true
  try {
    const payload = {
      prospection_date: form.value.prospection_date,
      merchant_name: form.value.merchant_name,
      contact_name: form.value.contact_name,
      phone: form.value.phone,
      activity_sector: form.value.activity_sector,
      engagement_type: form.value.engagement_type,
      interest_shown: form.value.interest_shown,
      other_info: form.value.other_info,
      status_id: form.value.status_id,
      location: form.value.location,
      address: form.value.address,
      address_label: form.value.address_label,
    }

    console.log('Creating merchant with payload:', payload)

    await $api('/merchants', {
      method: 'POST',
      body: payload,
    })

    emit('partnerAdded')
    resetForm()
    dialogVisible.value = false
  } catch (error) {
    console.error('Error creating partner:', error)
  } finally {
    isSubmitting.value = false
  }
}

// Reset form
const resetForm = () => {
  form.value = {
    prospection_date: new Date().toISOString().split('T')[0],
    merchant_name: '',
    contact_name: '',
    phone: '',
    activity_sector: '',
    engagement_type: '',
    interest_shown: '',
    other_info: '',
    status_id: null,
    location: '',
    address: '',
    address_label: '',
  }
}

// Close dialog
const onClose = () => {
  resetForm()
  dialogVisible.value = false
}
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 900"
    :model-value="dialogVisible"
    @update:model-value="val => dialogVisible = val"
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="dialogVisible = false" />
    
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>Add New Partner</span>
      </VCardTitle>

      <VDivider />

      <VCardText>
        <VForm @submit.prevent="onSubmit">
          <VRow>
            <!-- Prospection Date -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.prospection_date"
                type="date"
                label="Prospection Date"
                required
              />
            </VCol>

            <!-- Merchant Name -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.merchant_name"
                label="Merchant Name"
                placeholder="Enter merchant name"
                required
              />
            </VCol>

            <!-- Contact Name -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.contact_name"
                label="Contact Name"
                placeholder="Enter contact person name"
              />
            </VCol>

            <!-- Phone -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.phone"
                label="Phone"
                placeholder="+228 90 12 34 56"
              />
            </VCol>

            <!-- Activity Sector -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="form.activity_sector"
                :items="activitySectorOptions"
                label="Activity Sector"
                placeholder="Select activity sector"
                clearable
              />
            </VCol>

            <!-- Engagement Type -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="form.engagement_type"
                :items="engagementTypeOptions"
                label="Engagement Type"
                placeholder="Select engagement type"
                clearable
              />
            </VCol>

            <!-- Interest Shown -->
            <VCol cols="12">
              <VTextarea
                v-model="form.interest_shown"
                label="Interest Shown"
                placeholder="Describe the interest shown by the merchant..."
                rows="3"
              />
            </VCol>

            <!-- Status -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="form.status_id"
                :items="statusOptions"
                :loading="isLoadingStatuses"
                label="Status"
                placeholder="Select status"
                clearable
              />
            </VCol>

            <!-- Location -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.location"
                label="Location (Coordinates)"
                placeholder="6°10'53.8&quot;N 1°12'35.7&quot;E"
                hint="Format: 6°10'53.8&quot;N 1°12'35.7&quot;E"
              />
            </VCol>

            <!-- Address -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.address"
                label="Address"
                placeholder="123 Avenue de la République, Lomé"
              />
            </VCol>

            <!-- Address Label -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.address_label"
                label="Address Label"
                placeholder="Siège social"
                hint="e.g., Siège social, Bureau, etc."
              />
            </VCol>

            <!-- Other Info -->
            <VCol cols="12">
              <VTextarea
                v-model="form.other_info"
                label="Other Information"
                placeholder="Additional information about the merchant..."
                rows="3"
              />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>

      <VDivider />

      <VCardActions class="d-flex justify-end gap-3 pa-4">
        <VBtn
          color="secondary"
          variant="tonal"
          @click="onClose"
        >
          Cancel
        </VBtn>
        <VBtn
          color="primary"
          :loading="isSubmitting"
          :disabled="!form.merchant_name || !form.prospection_date"
          @click="onSubmit"
        >
          Create Partner
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
