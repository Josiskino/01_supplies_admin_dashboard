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
  company_name: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  business_sector: '',
  zone: '',
  address: '',
  interest_level: '',
  status: 'prospecting',
  prospection_date: new Date().toISOString().split('T')[0], // Today's date
  notes: '',
})

// Loading states
const isSubmitting = ref(false)

// Options
const businessSectorOptions = [
  { title: 'Restaurant', value: 'restaurant' },
  { title: 'Retail', value: 'retail' },
  { title: 'E-commerce', value: 'ecommerce' },
  { title: 'Healthcare', value: 'healthcare' },
  { title: 'Education', value: 'education' },
  { title: 'Technology', value: 'technology' },
  { title: 'Manufacturing', value: 'manufacturing' },
  { title: 'Services', value: 'services' },
  { title: 'Other', value: 'other' },
]

const interestLevelOptions = [
  { title: 'Very High', value: 'very_high' },
  { title: 'High', value: 'high' },
  { title: 'Medium', value: 'medium' },
  { title: 'Low', value: 'low' },
  { title: 'Very Low', value: 'very_low' },
]

const statusOptions = [
  { title: 'Prospecting', value: 'prospecting' },
  { title: 'Contacted', value: 'contacted' },
  { title: 'Interested', value: 'interested' },
  { title: 'Negotiating', value: 'negotiating' },
  { title: 'Partner', value: 'partner' },
  { title: 'Rejected', value: 'rejected' },
]

const zoneOptions = [
  { title: 'North Zone', value: 'north' },
  { title: 'South Zone', value: 'south' },
  { title: 'East Zone', value: 'east' },
  { title: 'West Zone', value: 'west' },
  { title: 'Central Zone', value: 'central' },
]

// Submit form
const onSubmit = async () => {
  isSubmitting.value = true
  try {
    const payload = {
      company_name: form.value.company_name,
      contact_name: form.value.contact_name,
      contact_phone: form.value.contact_phone,
      contact_email: form.value.contact_email,
      business_sector: form.value.business_sector,
      zone: form.value.zone,
      address: form.value.address,
      interest_level: form.value.interest_level,
      status: form.value.status,
      prospection_date: form.value.prospection_date,
      notes: form.value.notes,
    }

    await $api('/partners', {
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
    company_name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    business_sector: '',
    zone: '',
    address: '',
    interest_level: '',
    status: 'prospecting',
    prospection_date: new Date().toISOString().split('T')[0],
    notes: '',
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
            <!-- Company Name -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.company_name"
                label="Company Name"
                placeholder="Enter company name"
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

            <!-- Contact Phone -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.contact_phone"
                label="Contact Phone"
                placeholder="Enter phone number"
              />
            </VCol>

            <!-- Contact Email -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.contact_email"
                type="email"
                label="Contact Email"
                placeholder="Enter email address"
              />
            </VCol>

            <!-- Business Sector -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="form.business_sector"
                :items="businessSectorOptions"
                label="Business Sector"
                placeholder="Select business sector"
                clearable
              />
            </VCol>

            <!-- Zone -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="form.zone"
                :items="zoneOptions"
                label="Zone"
                placeholder="Select zone"
                clearable
              />
            </VCol>

            <!-- Address -->
            <VCol cols="12">
              <AppTextField
                v-model="form.address"
                label="Address"
                placeholder="Enter company address"
              />
            </VCol>

            <!-- Interest Level -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="form.interest_level"
                :items="interestLevelOptions"
                label="Interest Level"
                placeholder="Select interest level"
                clearable
              />
            </VCol>

            <!-- Status -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="form.status"
                :items="statusOptions"
                label="Status"
                placeholder="Select status"
              />
            </VCol>

            <!-- Prospection Date -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.prospection_date"
                type="date"
                label="Prospection Date"
              />
            </VCol>

            <!-- Notes -->
            <VCol cols="12">
              <VTextarea
                v-model="form.notes"
                label="Notes"
                placeholder="Additional notes about the partner..."
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
          :disabled="!form.company_name"
          @click="onSubmit"
        >
          Create Partner
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>