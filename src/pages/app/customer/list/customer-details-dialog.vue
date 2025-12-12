<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  customer: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:isDialogVisible'])

const dialogVisible = computed({
  get: () => props.isDialogVisible,
  set: val => emit('update:isDialogVisible', val),
})

// Format date
const formatDate = value => {
  if (!value) return '—'
  
  try {
    const date = new Date(value)
    
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

// Get address display
const getAddress = customer => {
  if (!customer) return '—'
  
  // Try default_address first
  if (customer.default_address) {
    if (typeof customer.default_address === 'object') {
      return customer.default_address.address || customer.default_address.label || '—'
    }
    if (typeof customer.default_address === 'string') {
      return customer.default_address
    }
  }
  
  // Try addresses array
  if (customer.addresses && Array.isArray(customer.addresses) && customer.addresses.length > 0) {
    const defaultAddr = customer.addresses.find(addr => addr.is_default) || customer.addresses[0]
    return defaultAddr.address || defaultAddr.label || '—'
  }
  
  // Try direct address field
  if (customer.address) {
    return customer.address
  }
  
  return '—'
}

// Get location display
const getLocation = customer => {
  if (!customer) return '—'
  
  // Try default_address first
  if (customer.default_address) {
    if (typeof customer.default_address === 'object' && customer.default_address.location) {
      return customer.default_address.location
    }
  }
  
  // Try addresses array
  if (customer.addresses && Array.isArray(customer.addresses) && customer.addresses.length > 0) {
    const defaultAddr = customer.addresses.find(addr => addr.is_default) || customer.addresses[0]
    if (defaultAddr.location) return defaultAddr.location
  }
  
  // Try direct location field
  if (customer.location) {
    return customer.location
  }
  
  return '—'
}

// Get all addresses
const getAllAddresses = customer => {
  if (!customer) return []
  
  if (customer.addresses && Array.isArray(customer.addresses)) {
    return customer.addresses
  }
  
  return []
}
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 900"
    :model-value="dialogVisible"
    @update:model-value="val => dialogVisible = val"
    scrollable
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="dialogVisible = false" />

    <VCard v-if="customer">
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>{{ $t('Customer Details') || 'Détails du client' }}</span>
      </VCardTitle>

      <VDivider />

      <VCardText class="pa-6">
        <!-- Customer Information -->
        <VCard
          variant="outlined"
          class="mb-4"
        >
          <VCardItem class="pb-2">
            <VCardTitle class="text-h6">
              <VIcon
                icon="tabler-user"
                class="me-2"
              />
              {{ $t('Customer Information') || 'Informations client' }}
            </VCardTitle>
          </VCardItem>
          <VDivider />
          <VCardText>
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <div class="d-flex align-center mb-4">
                  <VAvatar
                    size="80"
                    variant="tonal"
                    color="primary"
                    class="me-4"
                  >
                    <VIcon
                      icon="tabler-user"
                      size="40"
                    />
                  </VAvatar>
                  <div>
                    <h5 class="text-h5 mb-1">
                      {{ customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || $t('N/A') }}
                    </h5>
                    <div class="text-body-2 text-medium-emphasis">
                      ID: #{{ customer.id }}
                    </div>
                  </div>
                </div>
              </VCol>
            </VRow>

            <VDivider class="my-4" />

            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <div class="text-sm text-medium-emphasis mb-1">
                    {{ $t('First Name') || 'Prénom' }}
                  </div>
                  <div class="text-body-1 font-weight-medium">
                    {{ customer.first_name || '—' }}
                  </div>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <div class="text-sm text-medium-emphasis mb-1">
                    {{ $t('Last Name') || 'Nom' }}
                  </div>
                  <div class="text-body-1 font-weight-medium">
                    {{ customer.last_name || '—' }}
                  </div>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <div class="text-sm text-medium-emphasis mb-1">
                    <VIcon
                      icon="tabler-phone"
                      size="18"
                      class="me-1"
                    />
                    {{ $t('Phone') || 'Téléphone' }}
                  </div>
                  <div class="text-body-1 font-weight-medium">
                    <a
                      v-if="customer.phone"
                      :href="`tel:${customer.phone}`"
                      class="text-decoration-none"
                    >
                      {{ customer.phone }}
                    </a>
                    <span v-else>—</span>
                  </div>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <div class="text-sm text-medium-emphasis mb-1">
                    <VIcon
                      icon="tabler-mail"
                      size="18"
                      class="me-1"
                    />
                    {{ $t('Email') || 'Email' }}
                  </div>
                  <div class="text-body-1 font-weight-medium">
                    <a
                      v-if="customer.email"
                      :href="`mailto:${customer.email}`"
                      class="text-decoration-none"
                    >
                      {{ customer.email }}
                    </a>
                    <span v-else>—</span>
                  </div>
                </div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- Address Information -->
        <VCard
          variant="outlined"
          class="mb-4"
        >
          <VCardItem class="pb-2">
            <VCardTitle class="text-h6">
              <VIcon
                icon="tabler-map-pin"
                class="me-2"
              />
              {{ $t('Address Information') || 'Informations d\'adresse' }}
            </VCardTitle>
          </VCardItem>
          <VDivider />
          <VCardText>
            <VRow>
              <VCol cols="12">
                <div class="mb-4">
                  <div class="text-sm text-medium-emphasis mb-1">
                    {{ $t('Address') || 'Adresse' }}
                  </div>
                  <div class="text-body-1">
                    {{ getAddress(customer) }}
                  </div>
                </div>
              </VCol>

              <VCol cols="12">
                <div class="mb-4">
                  <div class="text-sm text-medium-emphasis mb-1">
                    {{ $t('Location') || 'Localisation' }}
                  </div>
                  <div class="text-body-1">
                    <a
                      v-if="getLocation(customer) !== '—'"
                      :href="getLocation(customer).startsWith('http') ? getLocation(customer) : `https://www.google.com/maps/search/${getLocation(customer)}`"
                      target="_blank"
                      class="text-decoration-none"
                    >
                      {{ getLocation(customer) }}
                      <VIcon
                        icon="tabler-external-link"
                        size="16"
                        class="ms-1"
                      />
                    </a>
                    <span v-else>—</span>
                  </div>
                </div>
              </VCol>

              <!-- All Addresses -->
              <VCol
                v-if="getAllAddresses(customer).length > 0"
                cols="12"
              >
                <VDivider class="my-2" />
                <div class="text-sm text-medium-emphasis mb-3 mt-4">
                  {{ $t('All Addresses') || 'Toutes les adresses' }}
                </div>
                <VList>
                  <VListItem
                    v-for="(address, index) in getAllAddresses(customer)"
                    :key="index"
                    class="px-0"
                  >
                    <template #prepend>
                      <VIcon
                        :icon="address.is_default ? 'tabler-map-pin-filled' : 'tabler-map-pin'"
                        :color="address.is_default ? 'primary' : 'secondary'"
                      />
                    </template>
                    <VListItemTitle>
                      {{ address.label || `${$t('Address')} ${index + 1}` }}
                      <VChip
                        v-if="address.is_default"
                        size="x-small"
                        color="primary"
                        class="ms-2"
                      >
                        {{ $t('Default') || 'Par défaut' }}
                      </VChip>
                    </VListItemTitle>
                    <VListItemSubtitle>
                      {{ address.address || '—' }}
                    </VListItemSubtitle>
                  </VListItem>
                </VList>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- User Account Information -->
        <VCard
          v-if="customer.user"
          variant="outlined"
          class="mb-4"
        >
          <VCardItem class="pb-2">
            <VCardTitle class="text-h6">
              <VIcon
                icon="tabler-user-circle"
                class="me-2"
              />
              {{ $t('User Account') || 'Compte utilisateur' }}
            </VCardTitle>
          </VCardItem>
          <VDivider />
          <VCardText>
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <div class="text-sm text-medium-emphasis mb-1">
                    {{ $t('Username') || 'Nom d\'utilisateur' }}
                  </div>
                  <div class="text-body-1">
                    {{ customer.user.name || '—' }}
                  </div>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <div class="text-sm text-medium-emphasis mb-1">
                    {{ $t('Email') || 'Email' }}
                  </div>
                  <div class="text-body-1">
                    {{ customer.user.email || '—' }}
                  </div>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <div class="text-sm text-medium-emphasis mb-1">
                    {{ $t('Phone') || 'Téléphone' }}
                  </div>
                  <div class="text-body-1">
                    {{ customer.user.phone || '—' }}
                  </div>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <div class="text-sm text-medium-emphasis mb-1">
                    {{ $t('Role') || 'Rôle' }}
                  </div>
                  <div class="text-body-1">
                    {{ customer.user.role?.name || '—' }}
                  </div>
                </div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- Timestamps -->
        <VCard
          variant="outlined"
          class="mb-4"
        >
          <VCardItem class="pb-2">
            <VCardTitle class="text-h6">
              <VIcon
                icon="tabler-clock"
                class="me-2"
              />
              {{ $t('Timestamps') || 'Horodatage' }}
            </VCardTitle>
          </VCardItem>
          <VDivider />
          <VCardText>
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <div class="text-sm text-medium-emphasis mb-1">
                    {{ $t('Created At') || 'Créé le' }}
                  </div>
                  <div class="text-body-1">
                    {{ formatDate(customer.created_at) }}
                  </div>
                </div>
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <div class="mb-4">
                  <div class="text-sm text-medium-emphasis mb-1">
                    {{ $t('Updated At') || 'Modifié le' }}
                  </div>
                  <div class="text-body-1">
                    {{ formatDate(customer.updated_at) }}
                  </div>
                </div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- Additional Information (if any) -->
        <VCard
          v-if="customer.notes || customer.additional_info"
          variant="outlined"
        >
          <VCardItem class="pb-2">
            <VCardTitle class="text-h6">
              <VIcon
                icon="tabler-info-circle"
                class="me-2"
              />
              {{ $t('Additional Information') || 'Informations supplémentaires' }}
            </VCardTitle>
          </VCardItem>
          <VDivider />
          <VCardText>
            <div v-if="customer.notes">
              <div class="text-sm text-medium-emphasis mb-1">
                {{ $t('Notes') || 'Notes' }}
              </div>
              <div class="text-body-1">
                {{ customer.notes }}
              </div>
            </div>
            <div
              v-if="customer.additional_info"
              class="mt-4"
            >
              <div class="text-sm text-medium-emphasis mb-1">
                {{ $t('Additional Info') || 'Info supplémentaire' }}
              </div>
              <div class="text-body-1">
                {{ customer.additional_info }}
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCardText>

      <VDivider />

      <VCardActions class="d-flex justify-end pa-4">
        <VBtn
          color="secondary"
          variant="tonal"
          @click="dialogVisible = false"
        >
          {{ $t('Close') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

