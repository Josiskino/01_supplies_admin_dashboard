<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  partnerToEdit: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:isDialogVisible', 'partnerAdded', 'resetPartnerToEdit'])

const { t } = useI18n()

const dialogVisible = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
})

// Form data
const initialFormData = {
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
}

const form = ref({ ...initialFormData })
const originalFormData = ref({ ...initialFormData })

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

// Format hint for location field
const locationFormatHint = computed(() => {
  return t("Format: 6°10'53.8\"N 1°12'35.7\"E")
})

// Check if form has changes
const hasChanges = computed(() => {
  return JSON.stringify(form.value) !== JSON.stringify(originalFormData.value)
})

// Load partner data for editing
const loadPartnerData = () => {
  console.log('=== Loading partner data ===')
  console.log('Dialog visible:', props.isDialogVisible)
  console.log('Partner to edit:', props.partnerToEdit)
  
  if (props.partnerToEdit) {
    // Get address data from default_address or addresses[0]
    const addressData = props.partnerToEdit.default_address || 
                       (props.partnerToEdit.addresses && props.partnerToEdit.addresses.length > 0 ? props.partnerToEdit.addresses[0] : null)
    
    form.value = {
      prospection_date: props.partnerToEdit.prospection_date ? new Date(props.partnerToEdit.prospection_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      merchant_name: props.partnerToEdit.merchant_name || '',
      contact_name: props.partnerToEdit.contact_name || '',
      phone: props.partnerToEdit.phone || '',
      activity_sector: props.partnerToEdit.activity_sector || '',
      engagement_type: props.partnerToEdit.engagement_type || '',
      interest_shown: props.partnerToEdit.interest_shown || '',
      other_info: props.partnerToEdit.other_info || '',
      status_id: props.partnerToEdit.status?.id || props.partnerToEdit.status_id || null,

      // Load address data from default_address or addresses[0]
      location: addressData?.location || props.partnerToEdit.location || '',
      address: addressData?.address || props.partnerToEdit.address || '',
      address_label: addressData?.label || props.partnerToEdit.address_label || '',
    }
    originalFormData.value = JSON.parse(JSON.stringify(form.value))
    console.log('Form loaded with data:', form.value)
    console.log('Address data loaded from:', addressData ? 'default_address/addresses[0]' : 'legacy fields')
  } else {
    console.log('No partner to edit, resetting form')
    resetForm()
  }
  console.log('================================')
}

// Watch for dialog visibility
watch(() => props.isDialogVisible, isVisible => {
  if (isVisible) {
    // Use nextTick to ensure partnerToEdit is set before loading
    nextTick(() => {
      loadPartnerData()
    })
  }
})

// Also watch partnerToEdit in case it changes while dialog is open
watch(() => props.partnerToEdit, () => {
  if (props.isDialogVisible) {
    loadPartnerData()
  }
}, { deep: true })

// Load statuses on mount
onMounted(() => {
  fetchPartnerStatuses()
})

// Submit form
const onSubmit = async () => {
  if (!hasChanges.value) return

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

    if (props.partnerToEdit) {
      // Update existing partner
      console.log('Updating merchant with payload:', payload)
      await $api(`/merchants/${props.partnerToEdit.id}`, {
        method: 'PUT',
        body: payload,
      })
    } else {
      // Create new partner
      console.log('Creating merchant with payload:', payload)
      await $api('/merchants', {
        method: 'POST',
        body: payload,
      })
    }

    emit('partnerAdded')
    resetForm()
    dialogVisible.value = false
    emit('resetPartnerToEdit')
  } catch (error) {
    console.error(`Error ${props.partnerToEdit ? 'updating' : 'creating'} partner:`, error)
  } finally {
    isSubmitting.value = false
  }
}

// Reset form
const resetForm = () => {
  form.value = { ...initialFormData }
  originalFormData.value = { ...initialFormData }
}

// Close dialog
const onClose = () => {
  resetForm()
  dialogVisible.value = false

  // Reset partnerToEdit when closing (emit to parent)
  emit('resetPartnerToEdit')
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
        <span>{{ partnerToEdit ? $t('Edit Partner') : $t('Add New Partner') }}</span>
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
                :label="$t('Prospection Date')"
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
                :label="$t('Merchant Name')"
                :placeholder="$t('Enter merchant name')"
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
                :label="$t('Contact Name')"
                :placeholder="$t('Enter contact person name')"
              />
            </VCol>

            <!-- Phone -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.phone"
                :label="$t('Phone')"
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
                :label="$t('Activity Sector')"
                :placeholder="$t('Select activity sector')"
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
                :label="$t('Engagement Type')"
                :placeholder="$t('Select engagement type')"
                clearable
              />
            </VCol>

            <!-- Interest Shown -->
            <VCol cols="12">
              <VTextarea
                v-model="form.interest_shown"
                :label="$t('Interest Shown')"
                :placeholder="$t('Describe the interest shown by the merchant...')"
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
                :label="$t('Status')"
                :placeholder="$t('Select status')"
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
                :label="$t('Location (Coordinates)')"
                placeholder="6°10'53.8&quot;N 1°12'35.7&quot;E"
                :hint="locationFormatHint"
              />
            </VCol>

            <!-- Address -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.address"
                :label="$t('Address')"
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
                :label="$t('Address Label')"
                placeholder="Siège social"
                :hint="$t('e.g., Siège social, Bureau, etc.')"
              />
            </VCol>

            <!-- Other Info -->
            <VCol cols="12">
              <VTextarea
                v-model="form.other_info"
                :label="$t('Other Information')"
                :placeholder="$t('Additional information about the merchant...')"
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
          {{ $t('Cancel') }}
        </VBtn>
        <VBtn
          color="primary"
          :loading="isSubmitting"
          :disabled="partnerToEdit ? !hasChanges : (!form.merchant_name || !form.prospection_date)"
          @click="onSubmit"
        >
          {{ partnerToEdit ? $t('Update Partner') : $t('Create Partner') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
