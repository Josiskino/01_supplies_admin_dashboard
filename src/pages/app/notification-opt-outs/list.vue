<script setup>
import { echo } from '@/plugins/echo'

definePage({ meta: { requiresAuth: true } })

// ─── State ─────────────────────────────────────────────────────────────────

const optOuts         = ref([])
const totalOptOuts    = ref(0)
const isLoading       = ref(false)
const searchQuery     = ref('')
const channelFilter   = ref('')
const page            = ref(1)
const itemsPerPage    = ref(15)

// Snackbar
const snackbarVisible = ref(false)
const snackbarText    = ref('')
const snackbarColor   = ref('success')

// Dialog: Ajouter
const isAddDialogOpen    = ref(false)
const isAddLoading       = ref(false)
const addForm            = ref({ phone: '', channels: ['whatsapp'], reason: '', notifiable_type: null, notifiable_id: null })

// Autocomplete entités (clients + partenaires)
const entitySearch       = ref('')
const entityItems        = ref([])
const isLoadingEntities  = ref(false)
const selectedEntity     = ref(null)

// Dialog: Modifier
const isEditDialogOpen  = ref(false)
const isEditLoading     = ref(false)
const editTarget        = ref(null)
const editForm          = ref({ channels: [], reason: '' })

// Dialog: Confirmer suppression
const isDeleteDialogOpen = ref(false)
const deleteTarget       = ref(null)
const isDeleteLoading    = ref(false)

const channelOptions = ['whatsapp', 'sms', 'email']

// ─── Table headers ─────────────────────────────────────────────────────────

const headers = [
  { title: 'Téléphone',  key: 'phone',       sortable: false },
  { title: 'Canaux',     key: 'channels',     sortable: false },
  { title: 'Entité',     key: 'notifiable',   sortable: false },
  { title: 'Motif',      key: 'reason',       sortable: false },
  { title: 'Date',       key: 'opted_out_at', sortable: false },
  { title: 'Actions',    key: 'actions',      sortable: false },
]

// ─── Helpers ───────────────────────────────────────────────────────────────

const channelColor = channel => {
  const map = { whatsapp: 'success', sms: 'info', email: 'warning' }
  return map[channel] ?? 'secondary'
}

const channelLabel = channel => {
  const map = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email' }
  return map[channel] ?? channel
}

const notifiableLabel = optOut => {
  if (!optOut.notifiable_type) return '—'
  const type = optOut.notifiable_type.split('\\').at(-1)
  return `${type} #${optOut.notifiable_id}`
}

const formatDate = dateStr =>
  new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const showSnackbar = (text, color = 'success') => {
  snackbarText.value  = text
  snackbarColor.value = color
  snackbarVisible.value = true
}

// ─── Recherche d'entités ───────────────────────────────────────────────────

const fetchEntities = async (search = '') => {
  isLoadingEntities.value = true
  try {
    const qs  = search?.trim().length >= 2 ? `?search=${encodeURIComponent(search.trim())}&limit=20` : '?limit=20'
    const res = await $api(`/delivery-entities${qs}`, { method: 'GET' })

    const partners  = (res?.data?.partners  ?? []).map(p => ({
      title:          p.display_name || p.name,
      subtitle:       p.phone,
      value:          `partner_${p.id}`,
      type:           'partner',
      id:             p.id,
      phone:          p.phone,
    }))
    const customers = (res?.data?.customers ?? []).map(c => ({
      title:          c.display_name || c.full_name,
      subtitle:       c.phone,
      value:          `customer_${c.id}`,
      type:           'customer',
      id:             c.id,
      phone:          c.phone,
    }))

    entityItems.value = [...partners, ...customers]
  } catch (e) {
    entityItems.value = []
  } finally {
    isLoadingEntities.value = false
  }
}

const onEntitySelected = entity => {
  if (!entity) {
    // Réinitialiser si désélection
    addForm.value.phone           = ''
    addForm.value.notifiable_type = null
    addForm.value.notifiable_id   = null
    return
  }
  addForm.value.phone           = entity.phone ?? ''
  addForm.value.notifiable_type = entity.type
  addForm.value.notifiable_id   = entity.id
}

const resetAddForm = () => {
  addForm.value    = { phone: '', channels: ['whatsapp'], reason: '', notifiable_type: null, notifiable_id: null }
  selectedEntity.value = null
  entitySearch.value   = ''
  entityItems.value    = []
}

// Supprimer automatiquement les espaces du numéro en temps réel
watch(() => addForm.value.phone, val => {
  const { value, warned } = stripSpaces(val)
  if (warned) addForm.value.phone = value
})

let entitySearchTimeout
watch(entitySearch, val => {
  clearTimeout(entitySearchTimeout)
  entitySearchTimeout = setTimeout(() => fetchEntities(val), 300)
})

// ─── API ───────────────────────────────────────────────────────────────────

const fetchOptOuts = async () => {
  isLoading.value = true
  try {
    const params = { page: page.value, per_page: itemsPerPage.value }
    if (searchQuery.value)  params.search  = searchQuery.value
    if (channelFilter.value) params.channel = channelFilter.value

    const qs  = new URLSearchParams(params).toString()
    const res = await $api(`/notification-opt-outs${qs ? `?${qs}` : ''}`, { method: 'GET' })

    optOuts.value      = res?.data ?? []
    totalOptOuts.value = res?.meta?.total ?? optOuts.value.length
  } catch (e) {
    console.error('Erreur fetch opt-outs:', e)
    showSnackbar(e._data?.message ?? 'Erreur lors du chargement', 'error')
  } finally {
    isLoading.value = false
  }
}

const addOptOut = async () => {
  if (!addForm.value.phone || !addForm.value.channels.length) return

  const phoneError = phoneRules.map(r => r(addForm.value.phone)).find(r => r !== true)
  if (phoneError) {
    showSnackbar(phoneError, 'error')
    return
  }
  isAddLoading.value = true
  try {
    await $api('/notification-opt-outs', {
      method: 'POST',
      body: {
        phone:           normalizePhone(addForm.value.phone),
        channels:        addForm.value.channels,
        reason:          addForm.value.reason || undefined,
        notifiable_type: addForm.value.notifiable_type || undefined,
        notifiable_id:   addForm.value.notifiable_id   || undefined,
      },
    })
    isAddDialogOpen.value = false
    resetAddForm()
    showSnackbar('Exclusion ajoutée avec succès')
    fetchOptOuts()
  } catch (e) {
    showSnackbar(e._data?.message ?? 'Erreur lors de l\'ajout', 'error')
  } finally {
    isAddLoading.value = false
  }
}

const openEditDialog = optOut => {
  editTarget.value    = optOut
  editForm.value      = { channels: [...optOut.channels], reason: optOut.reason ?? '' }
  isEditDialogOpen.value = true
}

const saveEdit = async () => {
  if (!editTarget.value || !editForm.value.channels.length) return
  isEditLoading.value = true
  try {
    await $api(`/notification-opt-outs/${editTarget.value.id}`, {
      method: 'PATCH',
      body: {
        channels: editForm.value.channels,
        reason:   editForm.value.reason || undefined,
      },
    })
    isEditDialogOpen.value = false
    showSnackbar('Exclusion mise à jour')
    fetchOptOuts()
  } catch (e) {
    showSnackbar(e._data?.message ?? 'Erreur lors de la mise à jour', 'error')
  } finally {
    isEditLoading.value = false
  }
}

const openDeleteDialog = optOut => {
  deleteTarget.value     = optOut
  isDeleteDialogOpen.value = true
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return
  isDeleteLoading.value = true
  try {
    await $api(`/notification-opt-outs/${deleteTarget.value.id}`, { method: 'DELETE' })
    isDeleteDialogOpen.value = false
    showSnackbar(`Le numéro ${deleteTarget.value.phone} a été réintégré`)
    fetchOptOuts()
  } catch (e) {
    showSnackbar(e._data?.message ?? 'Erreur lors de la suppression', 'error')
  } finally {
    isDeleteLoading.value = false
  }
}

// ─── Watchers ──────────────────────────────────────────────────────────────

let searchTimeout
const onSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 1; fetchOptOuts() }, 400)
}

watch([channelFilter, itemsPerPage], () => { page.value = 1; fetchOptOuts() })
watch(page, fetchOptOuts)

onMounted(() => {
  fetchOptOuts()

  // Auto-refresh si un autre utilisateur modifie la liste
  echo.channel('notification-opt-outs')
    .listen('.notification-opt-out-changed', () => fetchOptOuts())
})

onUnmounted(() => {
  echo.leave('notification-opt-outs')
})
</script>

<template>
  <section>
    <!-- ── En-tête ─────────────────────────────────────────────────────── -->
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>Exclusions de notifications</VCardTitle>
        <VCardSubtitle>
          Numéros qui ne souhaitent pas recevoir de notifications lors des livraisons
        </VCardSubtitle>
      </VCardItem>

      <VDivider />

      <VCardText class="d-flex flex-wrap gap-4 align-center">
        <!-- Items par page -->
        <AppSelect
          :model-value="itemsPerPage"
          :items="[
            { value: 15, title: '15' },
            { value: 25, title: '25' },
            { value: 50, title: '50' },
          ]"
          style="inline-size: 6.25rem;"
          @update:model-value="itemsPerPage = parseInt($event, 10)"
        />

        <!-- Filtre canal -->
        <AppSelect
          v-model="channelFilter"
          :items="[
            { value: '', title: 'Tous les canaux' },
            { value: 'whatsapp', title: 'WhatsApp' },
            { value: 'sms', title: 'SMS' },
            { value: 'email', title: 'Email' },
          ]"
          style="inline-size: 11rem;"
          placeholder="Canal"
        />

        <VSpacer />

        <!-- Recherche -->
        <div style="inline-size: 15.625rem;">
          <AppTextField
            v-model="searchQuery"
            placeholder="Rechercher par numéro ou motif..."
            clearable
            @update:model-value="onSearch"
          />
        </div>

        <!-- Bouton ajouter -->
        <VBtn
          prepend-icon="tabler-plus"
          @click="isAddDialogOpen = true"
        >
          Ajouter une exclusion
        </VBtn>
      </VCardText>

      <VDivider />

      <!-- ── Tableau ──────────────────────────────────────────────────── -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :items="optOuts"
        :items-length="totalOptOuts"
        :loading="isLoading"
        :headers="headers"
        item-value="id"
        class="text-no-wrap"
        @update:options="fetchOptOuts"
      >
        <!-- Téléphone -->
        <template #item.phone="{ item }">
          <span class="font-monospace font-weight-medium">{{ item.phone }}</span>
        </template>

        <!-- Canaux -->
        <template #item.channels="{ item }">
          <div class="d-flex gap-1 flex-wrap">
            <VChip
              v-for="ch in item.channels"
              :key="ch"
              :color="channelColor(ch)"
              size="small"
              label
            >
              {{ channelLabel(ch) }}
            </VChip>
          </div>
        </template>

        <!-- Entité liée -->
        <template #item.notifiable="{ item }">
          <span class="text-medium-emphasis text-sm">{{ notifiableLabel(item) }}</span>
        </template>

        <!-- Motif -->
        <template #item.reason="{ item }">
          <span class="text-medium-emphasis">{{ item.reason || '—' }}</span>
        </template>

        <!-- Date -->
        <template #item.opted_out_at="{ item }">
          <span class="text-sm">{{ formatDate(item.opted_out_at) }}</span>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <div class="d-flex gap-1">
            <VBtn
              icon
              variant="text"
              size="small"
              color="default"
              @click="openEditDialog(item)"
            >
              <VIcon icon="tabler-pencil" size="20" />
              <VTooltip activator="parent">Modifier les canaux</VTooltip>
            </VBtn>
            <VBtn
              icon
              variant="text"
              size="small"
              color="error"
              @click="openDeleteDialog(item)"
            >
              <VIcon icon="tabler-trash" size="20" />
              <VTooltip activator="parent">Réintégrer (supprimer l'exclusion)</VTooltip>
            </VBtn>
          </div>
        </template>

        <!-- Etat vide -->
        <template #no-data>
          <div class="d-flex flex-column align-center justify-center py-8 gap-2">
            <VIcon icon="tabler-bell-check" size="40" color="medium-emphasis" />
            <p class="text-medium-emphasis mb-0">Aucune exclusion enregistrée</p>
          </div>
        </template>
      </VDataTableServer>
    </VCard>

    <!-- ── Dialog: Ajouter ─────────────────────────────────────────────── -->
    <VDialog
      v-model="isAddDialogOpen"
      max-width="500"
      @after-leave="resetAddForm"
    >
      <VCard title="Ajouter une exclusion">
        <VCardText>
          <p class="text-medium-emphasis text-sm mb-4">
            Ce numéro ne recevra plus de notifications pour les canaux sélectionnés.
          </p>

          <VForm class="d-flex flex-column gap-4">

            <!-- Recherche client / partenaire existant -->
            <VAutocomplete
              v-model="selectedEntity"
              v-model:search="entitySearch"
              :items="entityItems"
              :loading="isLoadingEntities"
              item-title="title"
              item-value="value"
              return-object
              label="Rechercher un client ou partenaire"
              placeholder="Tapez un nom ou numéro..."
              prepend-inner-icon="tabler-search"
              clearable
              no-filter
              @update:model-value="onEntitySelected"
            >
              <template #item="{ props, item }">
                <VListItem v-bind="props" :subtitle="item.raw.subtitle">
                  <template #prepend>
                    <VIcon
                      :icon="item.raw.type === 'partner' ? 'tabler-building-store' : 'tabler-user'"
                      size="18"
                      class="me-2"
                    />
                  </template>
                </VListItem>
              </template>
            </VAutocomplete>

            <!-- Téléphone (auto-rempli si entité sélectionnée, sinon saisie manuelle) -->
            <AppTextField
              v-model="addForm.phone"
              label="Numéro de téléphone"
              placeholder="+22890000000"
              prepend-inner-icon="tabler-phone"
              :rules="phoneRules"
              :hint="selectedEntity ? 'Auto-rempli depuis l\'entité sélectionnée' : 'Incluez l\'indicatif pays : +228 Togo, +229 Bénin, +33 France…'"
              persistent-hint
            />

            <div>
              <p class="text-sm font-weight-medium mb-2">Canaux à exclure</p>
              <div class="d-flex gap-4">
                <VCheckbox
                  v-for="channel in channelOptions"
                  :key="channel"
                  v-model="addForm.channels"
                  :label="channelLabel(channel)"
                  :value="channel"
                  hide-details
                />
              </div>
            </div>

            <AppTextField
              v-model="addForm.reason"
              label="Motif (optionnel)"
              placeholder="Ex: Le client a demandé à ne pas être contacté"
            />
          </VForm>
        </VCardText>

        <VCardActions class="justify-end">
          <VBtn
            variant="tonal"
            color="secondary"
            @click="isAddDialogOpen = false"
          >
            Annuler
          </VBtn>
          <VBtn
            :loading="isAddLoading"
            :disabled="!addForm.phone || !addForm.channels.length"
            @click="addOptOut"
          >
            Confirmer
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ── Dialog: Modifier ────────────────────────────────────────────── -->
    <VDialog
      v-model="isEditDialogOpen"
      max-width="480"
    >
      <VCard title="Modifier l'exclusion">
        <VCardText>
          <p class="text-medium-emphasis text-sm mb-4">
            Numéro : <strong class="font-monospace">{{ editTarget?.phone }}</strong>
          </p>

          <VForm class="d-flex flex-column gap-4">
            <div>
              <p class="text-sm font-weight-medium mb-2">Canaux exclus</p>
              <div class="d-flex gap-4">
                <VCheckbox
                  v-for="channel in channelOptions"
                  :key="channel"
                  v-model="editForm.channels"
                  :label="channelLabel(channel)"
                  :value="channel"
                  hide-details
                />
              </div>
            </div>

            <AppTextField
              v-model="editForm.reason"
              label="Motif"
              placeholder="Motif optionnel"
            />
          </VForm>
        </VCardText>

        <VCardActions class="justify-end">
          <VBtn
            variant="tonal"
            color="secondary"
            @click="isEditDialogOpen = false"
          >
            Annuler
          </VBtn>
          <VBtn
            :loading="isEditLoading"
            :disabled="!editForm.channels.length"
            @click="saveEdit"
          >
            Enregistrer
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ── Dialog: Confirmer suppression ──────────────────────────────── -->
    <VDialog
      v-model="isDeleteDialogOpen"
      max-width="440"
    >
      <VCard title="Réintégrer ce numéro ?">
        <VCardText>
          Le numéro
          <strong class="font-monospace">{{ deleteTarget?.phone }}</strong>
          sera de nouveau éligible aux notifications. Cette action est réversible.
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn
            variant="tonal"
            color="secondary"
            @click="isDeleteDialogOpen = false"
          >
            Annuler
          </VBtn>
          <VBtn
            color="error"
            :loading="isDeleteLoading"
            @click="confirmDelete"
          >
            Confirmer
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- ── Snackbar ─────────────────────────────────────────────────────── -->
    <VSnackbar
      v-model="snackbarVisible"
      :color="snackbarColor"
      :timeout="3000"
      location="top end"
    >
      {{ snackbarText }}
    </VSnackbar>
  </section>
</template>
