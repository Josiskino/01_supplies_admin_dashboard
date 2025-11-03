<script setup>
/* eslint-disable camelcase */
const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:isDrawerOpen', 'submit'])

const localIsOpen = computed({
  get: () => props.isDrawerOpen,
  set: val => emit('update:isDrawerOpen', val),
})

const isSubmitting = ref(false)
const driverStatuses = ref([])
const isLoadingStatuses = ref(false)

const form = ref({
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

// Load statuses on mount
onMounted(() => {
  fetchDriverStatuses()
})

const resetForm = () => {
  form.value = {
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
}

const onClose = () => {
  localIsOpen.value = false
  resetForm()
}

const onSubmit = async () => {
  isSubmitting.value = true
  try {
    // Construct payload with all required fields
    const payload = {
      // User fields
      user_name: `${form.value.first_name} ${form.value.last_name}`.trim(),
      user_email: form.value.user_email,
      user_password: form.value.user_password,
      user_phone: form.value.phone,
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
    
    // Remove undefined fields to avoid sending them
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined) {
        delete payload[key]
      }
    })
    
    console.log('=== Creating driver payload ===')
    console.log('Payload:', payload)
    console.log('Form values:', form.value)
    console.log('===============================')
    
    emit('submit', payload)
    onClose()
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
      <VToolbarTitle>Add Driver</VToolbarTitle>
      <VSpacer />
      <VBtn icon variant="text" @click="onClose">
        <VIcon icon="tabler-x" />
      </VBtn>
    </VToolbar>

    <VDivider />

    <div class="drawer-scroll">
      <VForm class="pa-4" @submit.prevent="onSubmit">
        <VRow>
          <!-- First Name -->
          <VCol cols="12" md="6">
            <AppTextField
              v-model="form.first_name"
              label="First Name"
              placeholder="Koffi"
              dense
              required
            />
          </VCol>

          <!-- Last Name -->
          <VCol cols="12" md="6">
            <AppTextField
              v-model="form.last_name"
              label="Last Name"
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
              label="Email"
              placeholder="koffi.mensah@example.com"
              dense
              required
            />
          </VCol>

          <!-- User Password -->
          <VCol cols="12">
            <AppTextField
              v-model="form.user_password"
              type="password"
              label="Password"
              placeholder="Enter password"
              dense
              required
            />
          </VCol>

          <!-- Phone -->
          <VCol cols="12">
            <AppTextField
              v-model="form.phone"
              label="Phone"
              placeholder="+228 91 23 45 67"
              dense
              required
            />
          </VCol>

          <!-- Age -->
          <VCol cols="12" md="6">
            <AppTextField
              v-model.number="form.age"
              type="number"
              label="Age"
              placeholder="28"
              dense
              min="18"
              max="70"
            />
          </VCol>

          <!-- Vehicle Type -->
          <VCol cols="12" md="6">
            <AppSelect
              v-model="form.vehicle_type"
              label="Vehicle type"
              :items="[
                { title: 'Moto', value: 'Moto' },
                { title: 'Car', value: 'Car' },
                { title: 'Bicycle', value: 'Bicycle' },
              ]"
              dense
              clearable
            />
          </VCol>

          <!-- Plate Number -->
          <VCol cols="12" md="6">
            <AppTextField
              v-model="form.plate_number"
              label="Plate number"
              placeholder="LOM-1234-AB"
              dense
            />
          </VCol>

          <!-- Neighborhood -->
          <VCol cols="12" md="6">
            <AppTextField
              v-model="form.neighborhood"
              label="Neighborhood"
              placeholder="Baguida"
              dense
            />
          </VCol>

          <!-- Schedule -->
          <VCol cols="12" md="6">
            <AppTextField
              v-model="form.schedule"
              label="Schedule"
              placeholder="8h-18h"
              dense
            />
          </VCol>

          <!-- Working Days -->
          <VCol cols="12" md="6">
            <AppTextField
              v-model="form.working_days"
              label="Working Days"
              placeholder="L-V"
              dense
            />
          </VCol>

          <!-- Weekend Schedule -->
          <VCol cols="12" md="6">
            <AppTextField
              v-model="form.weekend_schedule"
              label="Weekend Schedule"
              placeholder="S&D"
              dense
            />
          </VCol>

          <!-- Status -->
          <VCol cols="12" md="6">
            <AppSelect
              v-model="form.current_status_id"
              :items="statusOptions"
              :loading="isLoadingStatuses"
              label="Status"
              placeholder="Select status"
              dense
              clearable
            />
          </VCol>

          <!-- Checkboxes -->
          <VCol cols="12">
            <VRow class="align-center">
              <VCol cols="12" sm="6">
                <VCheckbox
                  v-model="form.has_bags"
                  label="Has bags"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VCheckbox
                  v-model="form.has_contract"
                  label="Has contract"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VCheckbox
                  v-model="form.works_holidays"
                  label="Works holidays"
                />
              </VCol>
            </VRow>
          </VCol>

        </VRow>
      </VForm>
    </div>

    <VDivider />

    <div class="drawer-actions pa-4 d-flex gap-3">
      <VBtn :loading="isSubmitting" :disabled="isSubmitting" color="primary" class="flex-1-1" @click="onSubmit">
        Save
      </VBtn>
      <VBtn :loading="isSubmitting" :disabled="isSubmitting" color="secondary" variant="tonal" class="flex-1-1" @click="onClose">
        Cancel
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
