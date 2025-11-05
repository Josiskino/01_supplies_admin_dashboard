<script setup>
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
  phone: '',
  first_name: '',
  last_name: '',
  email: '',
  location: '',
  address: '',
  address_label: '',
})

const resetForm = () => {
  form.value = {
    phone: '',
    first_name: '',
    last_name: '',
    email: '',
    location: '',
    address: '',
    address_label: '',
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
      phone: form.value.phone,
      first_name: form.value.first_name,
      last_name: form.value.last_name,
      email: form.value.email,
      location: form.value.location || undefined,
      address: form.value.address || undefined,
      address_label: form.value.address_label || undefined,
    }
    
    // Remove undefined fields to avoid sending them
    Object.keys(payload).forEach(key => {
      if (payload[key] === undefined || payload[key] === '') {
        delete payload[key]
      }
    })
    
    console.log('=== Creating customer payload ===')
    console.log('Payload:', payload)
    console.log('Form values:', form.value)
    console.log('=================================')
    
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
      <VToolbarTitle>Add Customer</VToolbarTitle>
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
              label="First Name"
              placeholder="Marie"
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
              label="Last Name"
              placeholder="Agbodan"
              dense
              required
            />
          </VCol>

          <!-- Email -->
          <VCol cols="12">
            <AppTextField
              v-model="form.email"
              type="email"
              label="Email"
              placeholder="marie.agbodan@example.com"
              dense
              required
            />
          </VCol>

          <!-- Phone -->
          <VCol cols="12">
            <AppTextField
              v-model="form.phone"
              label="Phone"
              placeholder="+228 92 34 56 78"
              dense
              required
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
              placeholder="Domicile"
              dense
              hint="e.g., Domicile, Bureau, etc."
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
              dense
              hint="Format: 6°10'53.8&quot;N 1°12'35.7&quot;E"
            />
          </VCol>

          <!-- Address -->
          <VCol cols="12">
            <VTextarea
              v-model="form.address"
              label="Address"
              placeholder="456 Rue du Commerce, Quartier Administratif, Lomé"
              dense
              rows="3"
            />
          </VCol>
        </VRow>
      </VForm>
    </div>

    <VDivider />

    <div class="drawer-actions pa-4 d-flex gap-3">
      <VBtn
        :loading="isSubmitting"
        :disabled="isSubmitting"
        color="primary"
        class="flex-1-1"
        @click="onSubmit"
      >
        Save
      </VBtn>
      <VBtn
        :loading="isSubmitting"
        :disabled="isSubmitting"
        color="secondary"
        variant="tonal"
        class="flex-1-1"
        @click="onClose"
      >
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
</style>

