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

const form = ref({
  name: '',
  email: '',
  phone: '',
  vehicle_type: '',
  plate_number: '',
  neighborhood: '',
  has_bags: false,
  has_contract: false,
})

const resetForm = () => {
  form.value = {
    name: '',
    email: '',
    phone: '',
    vehicle_type: '',
    plate_number: '',
    neighborhood: '',
    has_bags: false,
    has_contract: false,
  }
}

const onClose = () => {
  localIsOpen.value = false
  resetForm()
}

const onSubmit = async () => {
  isSubmitting.value = true
  try {
    emit('submit', { ...form.value })
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
        <VCol cols="12">
          <AppTextField v-model="form.name" label="Full name" dense />
        </VCol>
        <VCol cols="12">
          <AppTextField v-model="form.email" type="email" label="Email" dense />
        </VCol>
        <VCol cols="12">
          <AppTextField v-model="form.phone" label="Phone" dense />
        </VCol>
        <VCol cols="12">
          <AppSelect
            v-model="form.vehicle_type"
            label="Vehicle type"
            :items="[
              { title: 'Moto', value: 'moto' },
              { title: 'Car', value: 'car' },
              { title: 'Bike', value: 'bike' },
            ]"
            dense
            clearable
          />
        </VCol>
        <VCol cols="12">
          <AppTextField v-model="form.plate_number" label="Plate number" dense />
        </VCol>
        <VCol cols="12">
          <AppTextField v-model="form.neighborhood" label="Neighborhood" dense />
        </VCol>
        <VCol cols="12">
          <VRow class="align-center">
            <VCol cols="12" sm="6">
              <VCheckbox v-model="form.has_bags" label="Has bags" />
            </VCol>
            <VCol cols="12" sm="6" class="d-flex justify-end">
              <VCheckbox v-model="form.has_contract" label="Has contract" />
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
