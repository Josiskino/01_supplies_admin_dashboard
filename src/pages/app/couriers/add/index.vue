<script setup>
/* eslint-disable camelcase */
import { useI18n } from 'vue-i18n'

const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    default: false,
  },
  driverToEdit: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:isDrawerOpen', 'submit', 'driverAdded', 'resetDriverToEdit'])

const { t } = useI18n()

const localIsOpen = computed({
  get: () => props.isDrawerOpen,
  set: val => emit('update:isDrawerOpen', val),
})

const isSubmitting = ref(false)
const driverStatuses = ref([])
const isLoadingStatuses = ref(false)
const isPasswordVisible = ref(false)

const initialFormData = {
  // User fields
  first_name: '',
  last_name: '',
  user_email: '',
  user_password: '',

  // Driver fields
  phone: '',
  age: null,
  vehicle_type: '',
  plate_number: '',
  neighborhood: '',
  schedule: '',
  working_days: '',
  works_holidays: false,
  weekend_schedule: '',
  has_bags: false,
  has_contract: false,
  current_status_id: null,
}

const form = ref({ ...initialFormData })
const originalFormData = ref({ ...initialFormData })

// Check if form has changes
const hasChanges = computed(() => {
  return JSON.stringify(form.value) !== JSON.stringify(originalFormData.value)
})

// 👉 Fetch Driver Statuses
const fetchDriverStatuses = async () => {
  isLoadingStatuses.value = true
  try {
    const response = await $api('/status/driver-statuses', {
      method: 'GET',
    })
    
    if (response && response.success && response.data && Array.isArray(response.data)) {
      driverStatuses.value = response.data
    } else {
      driverStatuses.value = []
    }
  } catch (error) {
    console.error('Error fetching driver statuses:', error)
    driverStatuses.value = []
  } finally {
    isLoadingStatuses.value = false
  }
}

// Status options from API
const statusOptions = computed(() => {
  return driverStatuses.value.map(status => ({
    title: status.name,
    value: status.id,
  }))
})

// Load driver data for editing
const loadDriverData = () => {
  console.log('=== Loading driver data ===')
  console.log('Drawer open:', props.isDrawerOpen)
  console.log('Driver to edit:', props.driverToEdit)

  if (props.driverToEdit) {
    form.value = {
      // User fields
      first_name: props.driverToEdit.first_name || '',
      last_name: props.driverToEdit.last_name || '',
      user_email: props.driverToEdit.user?.email || '',
      user_password: '', // Don't pre-fill password
      // Driver fields
      phone: props.driverToEdit.phone || props.driverToEdit.user?.phone || '',
      age: props.driverToEdit.age || null,
      vehicle_type: props.driverToEdit.vehicle_type || '',
      plate_number: props.driverToEdit.plate_number || '',
      neighborhood: props.driverToEdit.neighborhood || '',
      schedule: props.driverToEdit.schedule || '',
      working_days: props.driverToEdit.working_days || '',
      works_holidays: props.driverToEdit.works_holidays || false,
      weekend_schedule: props.driverToEdit.weekend_schedule || '',
      has_bags: props.driverToEdit.has_bags || false,
      has_contract: props.driverToEdit.has_contract || false,
      current_status_id: props.driverToEdit.current_status?.id || props.driverToEdit.current_status_id || null,
    }
    originalFormData.value = JSON.parse(JSON.stringify(form.value))
    console.log('Form loaded with data:', form.value)
  } else {
    console.log('No driver to edit, resetting form')
    resetForm()
  }
  console.log('================================')
}

// Watch for drawer visibility and driverToEdit changes
watch([() => props.isDrawerOpen, () => props.driverToEdit], ([isOpen, driver]) => {
  if (isOpen) {
    // Use nextTick to ensure driverToEdit is set before loading
    nextTick(() => {
      loadDriverData()
    })
  }
}, { immediate: false })

// Load statuses on mount
onMounted(() => {
  fetchDriverStatuses()
})

const resetForm = () => {
  form.value = { ...initialFormData }
  originalFormData.value = { ...initialFormData }
}

const onClose = () => {
  localIsOpen.value = false
  resetForm()

  // Reset driverToEdit when closing (emit to parent)
  emit('resetDriverToEdit')
}

const onSubmit = async () => {
  if (props.driverToEdit && !hasChanges.value) return

  isSubmitting.value = true
  try {
    // Construct payload with all required fields
    const payload = {
      // User fields (only include if creating new or if changed)
      ...(props.driverToEdit ? {} : {
        user_name: `${form.value.first_name} ${form.value.last_name}`.trim(),
        user_email: form.value.user_email,
        user_password: form.value.user_password,
        user_phone: form.value.phone,
      }),

      // Driver fields
      first_name: form.value.first_name,
      last_name: form.value.last_name,
      phone: form.value.phone,
      vehicle_type: form.value.vehicle_type || undefined,
      plate_number: form.value.plate_number || undefined,
      neighborhood: form.value.neighborhood || undefined,
      schedule: form.value.schedule || undefined,
      working_days: form.value.working_days || undefined,
      weekend_schedule: form.value.weekend_schedule || undefined,
      has_bags: form.value.has_bags,
      has_contract: form.value.has_contract,
      works_holidays: form.value.works_holidays,

      // Numbers - convert to number or undefined
      age: form.value.age ? Number(form.value.age) : undefined,
      current_status_id: form.value.current_status_id ? Number(form.value.current_status_id) : undefined,
    }

    // For editing, include user_email if it changed
    if (props.driverToEdit && form.value.user_email !== originalFormData.value.user_email) {
      payload.user_email = form.value.user_email
    }

    // For editing, only include user_password if it's provided
    if (props.driverToEdit && form.value.user_password) {
      payload.user_password = form.value.user_password
    }
    
    // Remove undefined and empty string fields
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined || payload[key] === '') {
        delete payload[key]
      }
    })
    
    if (props.driverToEdit) {
      console.log('=== Updating driver payload ===')
      console.log('Driver ID:', props.driverToEdit.id)
    } else {
      console.log('=== Creating driver payload ===')
    }
    console.log('Payload:', payload)
    console.log('Form values:', form.value)
    console.log('===============================')
    
    if (props.driverToEdit) {
      // Update existing driver - use PUT
      await $api(`/drivers/${props.driverToEdit.id}`, {
        method: 'PUT',
        body: payload,
      })
      emit('driverAdded')
    } else {
      // Create new driver
      emit('submit', payload)
    }

    onClose()
  } catch (error) {
    console.error(`Error ${props.driverToEdit ? 'updating' : 'creating'} driver:`, error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <VNavigationDrawer
    v-model="localIsOpen"
    location="end"
    width="420"
    temporary
    class="d-flex flex-column"
  >
    <VToolbar flat>
      <VToolbarTitle>{{ driverToEdit ? $t('Edit Driver') : $t('Add Driver') }}</VToolbarTitle>
      <VSpacer />
      <VBtn
        icon
        variant="text"
        @click="onClose"
      >
        <VIcon icon="tabler-x" />
      </VBtn>
    </VToolbar>

    <VDivider />

    <div class="drawer-scroll">
      <VForm
        class="pa-4"
        @submit.prevent="onSubmit"
      >
        <VRow>
          <!-- First Name -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="form.first_name"
              :label="$t('First Name')"
              placeholder="Koffi"
              dense
              required
            />
          </VCol>

          <!-- Last Name -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="form.last_name"
              :label="$t('Last Name')"
              placeholder="Mensah"
              dense
              required
            />
          </VCol>

          <!-- User Email -->
          <VCol cols="12">
            <AppTextField
              v-model="form.user_email"
              type="email"
              :label="$t('Email')"
              placeholder="koffi.mensah@example.com"
              dense
              :required="!driverToEdit"
            />
          </VCol>

          <!-- User Password -->
          <VCol cols="12">
            <AppTextField
              v-model="form.user_password"
              :type="isPasswordVisible ? 'text' : 'password'"
              :label="driverToEdit ? $t('New Password (leave blank to keep current)') : $t('Password')"
              placeholder="············"
              :append-inner-icon="isPasswordVisible ? 'tabler-eye-off' : 'tabler-eye'"
              dense
              :required="!driverToEdit"
              @click:append-inner="isPasswordVisible = !isPasswordVisible"
            />
          </VCol>

          <!-- Phone -->
          <VCol cols="12">
            <AppTextField
              v-model="form.phone"
              :label="$t('Phone')"
              placeholder="+228 91 23 45 67"
              dense
              required
            />
          </VCol>

          <!-- Age -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model.number="form.age"
              type="number"
              :label="$t('Age')"
              placeholder="28"
              dense
              min="18"
              max="70"
            />
          </VCol>

          <!-- Vehicle Type -->
          <VCol
            cols="12"
            md="6"
          >
            <AppSelect
              v-model="form.vehicle_type"
              :label="$t('Vehicle type')"
              :items="[
                { title: t('Moto'), value: 'Moto' },
                { title: t('Car'), value: 'Car' },
                { title: t('Bicycle'), value: 'Bicycle' },
              ]"
              dense
              clearable
            />
          </VCol>

          <!-- Plate Number -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="form.plate_number"
              :label="$t('Plate number')"
              placeholder="LOM-1234-AB"
              dense
            />
          </VCol>

          <!-- Neighborhood -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="form.neighborhood"
              :label="$t('Neighborhood')"
              placeholder="Baguida"
              dense
            />
          </VCol>

          <!-- Schedule -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="form.schedule"
              :label="$t('Schedule')"
              placeholder="8h-18h"
              dense
            />
          </VCol>

          <!-- Working Days -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="form.working_days"
              :label="$t('Working Days')"
              placeholder="L-V"
              dense
            />
          </VCol>

          <!-- Weekend Schedule -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="form.weekend_schedule"
              :label="$t('Weekend Schedule')"
              placeholder="S&D"
              dense
            />
          </VCol>

          <!-- Status -->
          <VCol
            cols="12"
            md="6"
          >
            <AppSelect
              v-model="form.current_status_id"
              :items="statusOptions"
              :loading="isLoadingStatuses"
              :label="$t('Status')"
              :placeholder="$t('Select status')"
              dense
              clearable
            />
          </VCol>

          <!-- Checkboxes -->
          <VCol cols="12">
            <VRow class="align-center">
              <VCol
                cols="12"
                sm="6"
              >
                <VCheckbox
                  v-model="form.has_bags"
                  :label="$t('Has bags')"
                />
              </VCol>
              <VCol
                cols="12"
                sm="6"
              >
                <VCheckbox
                  v-model="form.has_contract"
                  :label="$t('Has contract')"
                />
              </VCol>
              <VCol
                cols="12"
                sm="6"
              >
                <VCheckbox
                  v-model="form.works_holidays"
                  :label="$t('Works holidays')"
                />
              </VCol>
            </VRow>
          </VCol>
        </VRow>
      </VForm>
    </div>

    <VDivider />

    <div class="drawer-actions pa-4 d-flex gap-3">
      <VBtn
        :loading="isSubmitting"
        :disabled="driverToEdit ? (!hasChanges || isSubmitting) : (isSubmitting || !form.first_name || !form.last_name || !form.user_email || (!driverToEdit && !form.user_password))"
        color="primary"
        class="flex-1-1"
        @click="onSubmit"
      >
        {{ driverToEdit ? $t('Update Driver') : $t('Save') }}
      </VBtn>
      <VBtn
        :loading="isSubmitting"
        :disabled="isSubmitting"
        color="secondary"
        variant="tonal"
        class="flex-1-1"
        @click="onClose"
      >
        {{ $t('Cancel') }}
      </VBtn>
    </div>
  </VNavigationDrawer>
</template>

<style scoped>
.drawer-actions {
  position: sticky;
  background: rgb(var(--v-theme-surface));
  border-block-start: 1px solid rgba(0, 0, 0, 6%);
  inset-block-end: 0;
}

.drawer-scroll {
  flex: 1 1 auto;
  min-block-size: 0; /* allow flex child to actually scroll */
  overflow-y: auto;
  padding-block-end: 6rem; /* keep last fields above sticky actions */
}

.checkbox-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
}

.checkbox-row > * {
  flex: 0 1 auto;
  min-inline-size: 180px;
}
</style>
