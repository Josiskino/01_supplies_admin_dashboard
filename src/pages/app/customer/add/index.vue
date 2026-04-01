<script setup>
const props = defineProps({
  isDrawerOpen: {
    type: Boolean,
    default: false,
  },
  customerToEdit: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:isDrawerOpen', 'submit', 'customerAdded', 'resetCustomerToEdit'])

const localIsOpen = computed({
  get: () => props.isDrawerOpen,
  set: val => emit('update:isDrawerOpen', val),
})

const isSubmitting = ref(false)

const initialFormData = {
  phone: '',
  first_name: '',
  last_name: '',
  email: '',
  location: '',
  address: '',
  address_label: '',
}

const form = ref({ ...initialFormData })
const originalFormData = ref({ ...initialFormData })

// Check if we're in edit mode
const isEditMode = computed(() => !!props.customerToEdit?.id)

// Check if form has changes
const hasChanges = computed(() => {
  if (!isEditMode.value) {
    // In create mode, check if required fields are filled
    return !!(form.value.phone && form.value.phone.trim())
  }
  
  // In edit mode, compare current form with original data field by field
  const fieldsToCompare = ['phone', 'first_name', 'last_name', 'email', 'location', 'address', 'address_label']
  
  for (const field of fieldsToCompare) {
    const currentValue = (form.value[field] || '').toString().trim()
    const originalValue = (originalFormData.value[field] || '').toString().trim()
    
    if (currentValue !== originalValue) {
      console.log(`Field ${field} changed:`, { current: currentValue, original: originalValue })
      return true
    }
  }
  
  return false
})

// Load customer data for editing
const loadCustomerData = () => {
  console.log('=== Loading customer data ===')
  console.log('Drawer open:', props.isDrawerOpen)
  console.log('Customer to edit:', props.customerToEdit)

  if (props.customerToEdit) {
    // Extract location from default_address or addresses[0]
    // Priority: default_address > addresses[0] (where is_default=true) > addresses[0] > direct location field
    let addressData = props.customerToEdit.default_address
    
    if (!addressData && props.customerToEdit.addresses && props.customerToEdit.addresses.length > 0) {
      // Try to find default address first
      const defaultAddr = props.customerToEdit.addresses.find(addr => addr.is_default === true)
      addressData = defaultAddr || props.customerToEdit.addresses[0]
    }
    
    // Extract name: if name exists, split it; otherwise use first_name and last_name
    let firstName = props.customerToEdit.first_name || ''
    let lastName = props.customerToEdit.last_name || ''
    
    if (props.customerToEdit.name && !firstName && !lastName) {
      // Split name into first and last name
      const nameParts = props.customerToEdit.name.trim().split(/\s+/)
      firstName = nameParts[0] || ''
      lastName = nameParts.slice(1).join(' ') || ''
    }
    
    form.value = {
      phone: props.customerToEdit.phone || '',
      first_name: firstName,
      last_name: lastName,
      email: props.customerToEdit.email || props.customerToEdit.user?.email || '',
      location: addressData?.location || props.customerToEdit.location || '',
      address: addressData?.address || props.customerToEdit.address || '',
      address_label: addressData?.label || props.customerToEdit.address_label || 'Adresse principale',
    }
    
    // Save original data for change detection
    originalFormData.value = JSON.parse(JSON.stringify(form.value))
    
    console.log('Form loaded with data:', form.value)
    console.log('Original form data saved:', originalFormData.value)
    console.log('Address data extracted:', addressData)
    console.log('Full customer data:', props.customerToEdit)
  } else {
    console.log('No customer to edit, resetting form')
    resetForm()
  }
  console.log('================================')
}

const resetForm = () => {
  form.value = { ...initialFormData }
  originalFormData.value = { ...initialFormData }
}

const onClose = () => {
  localIsOpen.value = false
  resetForm()
  // Reset customerToEdit when closing (emit to parent)
  emit('resetCustomerToEdit')
}

// Supprimer automatiquement les espaces du numéro en temps réel
watch(() => form.value.phone, val => {
  const { value, warned } = stripSpaces(val)
  if (warned) form.value.phone = value
})

const onSubmit = async () => {
  console.log('=== onSubmit called ===')
  console.log('isSubmitting:', isSubmitting.value)
  console.log('isEditMode:', isEditMode.value)
  console.log('hasChanges:', hasChanges.value)
  console.log('Form values:', form.value)
  console.log('Original form data:', originalFormData.value)
  
  // Check if button should be disabled
  if (isEditMode.value && !hasChanges.value) {
    console.warn('Button is disabled: isEditMode && !hasChanges')
    console.warn('isEditMode:', isEditMode.value)
    console.warn('hasChanges:', hasChanges.value)
    return
  }
  
  isSubmitting.value = true
  try {
    // Construct payload according to /api/v1/customers endpoint
    // For CREATE: phone (required), first_name, last_name, email, location, address, address_label
    // For UPDATE: phone, first_name, last_name, email (addresses are NOT updated via this endpoint)
    
    const payload = {}
    
    // Phone is required for create, optional for update
    if (form.value.phone && form.value.phone.trim()) {
      const phoneError = phoneRules.map(r => r(form.value.phone)).find(r => r !== true)
      if (phoneError) {
        emit('submit', { error: phoneError })
        isSubmitting.value = false
        return
      }
      payload.phone = normalizePhone(form.value.phone)
    }
    
    // Optional fields - only include if they have a value
    if (form.value.first_name && form.value.first_name.trim()) {
      payload.first_name = form.value.first_name.trim()
    }
    
    if (form.value.last_name && form.value.last_name.trim()) {
      payload.last_name = form.value.last_name.trim()
    }
    
    if (form.value.email && form.value.email.trim()) {
      payload.email = form.value.email.trim()
    }
    
    // Address fields - send for both CREATE and UPDATE
    // According to API docs: "L'adresse est créée automatiquement : Si location est fourni, 
    // une adresse est créée dans la table addresses avec is_default: true"
    // Backend handles address creation/update via atomic transaction
    if (form.value.location && form.value.location.trim()) {
      payload.location = form.value.location.trim()
    }
    
    if (form.value.address && form.value.address.trim()) {
      payload.address = form.value.address.trim()
    }
    
    if (form.value.address_label && form.value.address_label.trim()) {
      payload.address_label = form.value.address_label.trim()
    }
    
    console.log('=== Submitting customer ===')
    console.log('Mode:', isEditMode.value ? 'EDIT' : 'CREATE')
    console.log('Form values (raw):', form.value)
    console.log('Form location value:', form.value.location)
    console.log('Form location type:', typeof form.value.location)
    console.log('Form location length:', form.value.location?.length)
    console.log('Final payload:', payload)
    console.log('Payload JSON:', JSON.stringify(payload, null, 2))
    console.log('=================================')
    
    emit('submit', payload)
    emit('customerAdded')
    onClose()
  } catch (error) {
    console.error('Error in onSubmit:', error)
  } finally {
    isSubmitting.value = false
  }
}

// Watch for drawer visibility and customerToEdit changes
watch([() => props.isDrawerOpen, () => props.customerToEdit], ([isOpen, customer]) => {
  console.log('=== Drawer/watch triggered ===')
  console.log('Drawer open (isOpen):', isOpen)
  console.log('Customer to edit:', customer)
  console.log('props.isDrawerOpen:', props.isDrawerOpen)
  console.log('props.customerToEdit:', props.customerToEdit)
  
  if (isOpen) {
    console.log('Drawer is open, loading customer data...')
    // Use nextTick to ensure customerToEdit is set before loading
    nextTick(() => {
      console.log('Inside nextTick - loading data')
      loadCustomerData()
    })
  } else {
    console.log('Drawer is closed, resetting form')
    // Reset form when drawer closes
    resetForm()
  }
}, { immediate: true })
</script>

<template>
  <VNavigationDrawer
    v-model="localIsOpen"
    location="end"
    width="420"
    temporary
    class="d-flex flex-column"
    @update:model-value="(val) => {
      console.log('=== VNavigationDrawer model-value changed ===')
      console.log('New value:', val)
      console.log('localIsOpen:', localIsOpen.value)
      console.log('props.isDrawerOpen:', props.isDrawerOpen)
      console.log('============================================')
    }"
  >
    <VToolbar flat>
      <VToolbarTitle>{{ isEditMode ? $t('Edit Customer') : $t('Add Customer') }}</VToolbarTitle>
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
          <!-- First Name - Commented out -->
          <!-- <VCol
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
          </VCol> -->

          <!-- Last Name - Now "Nom complet" -->
          <VCol cols="12">
            <AppTextField
              v-model="form.last_name"
              label="Nom complet"
              placeholder="Marie Agbodan"
              dense
              required
            />
          </VCol>

          <!-- Email - Commented out -->
          <!-- <VCol cols="12">
            <AppTextField
              v-model="form.email"
              type="email"
              label="Email"
              placeholder="marie.agbodan@example.com"
              dense
              required
            />
          </VCol> -->

          <!-- Phone -->
          <VCol cols="12">
            <AppTextField
              v-model="form.phone"
              label="Téléphone"
              placeholder="+22890123456"
              :rules="phoneRules"
              hint="Incluez l'indicatif pays : +228 Togo, +229 Bénin, +33 France…"
              persistent-hint
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
              label="Libellé de l'adresse"
              placeholder="Domicile"
              dense
              hint="Ex: Domicile, Bureau, etc."
            />
          </VCol>

          <!-- Location -->
          <VCol
            cols="12"
            md="6"
          >
            <AppTextField
              v-model="form.location"
              label="Coordonnées GPS"
              placeholder="6°10'53.8&quot;N 1°12'35.7&quot;E"
              dense
              hint="Format: 6°10'53.8&quot;N 1°12'35.7&quot;E"
            />
          </VCol>

          <!-- Address - Commented out -->
          <!-- <VCol cols="12">
            <VTextarea
              v-model="form.address"
              label="Address"
              placeholder="456 Rue du Commerce, Quartier Administratif, Lomé"
              dense
              rows="3"
            />
          </VCol> -->
        </VRow>
      </VForm>
    </div>

    <VDivider />

    <div class="drawer-actions pa-4 d-flex gap-3">
      <VBtn
        :loading="isSubmitting"
        :disabled="isSubmitting || (isEditMode && !hasChanges)"
        color="primary"
        class="flex-1-1"
        @click="() => {
          console.log('=== Button clicked ===')
          console.log('isSubmitting:', isSubmitting.value)
          console.log('isEditMode:', isEditMode.value)
          console.log('hasChanges:', hasChanges.value)
          console.log('Button disabled:', isSubmitting.value || (isEditMode.value && !hasChanges.value))
          if (!isSubmitting.value && (!isEditMode.value || hasChanges.value)) {
            onSubmit()
          } else {
            console.warn('Button click ignored - button is disabled')
          }
        }"
      >
        {{ isEditMode ? $t('Update Customer') : $t('Save') }}
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

