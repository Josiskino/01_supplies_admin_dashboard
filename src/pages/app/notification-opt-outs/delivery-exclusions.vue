<script setup>
definePage({ meta: { requiresAuth: true } })

// ─── State ─────────────────────────────────────────────────────────────────

const exclusions   = ref([])
const totalItems   = ref(0)
const isLoading    = ref(false)
const page         = ref(1)
const itemsPerPage = ref(20)
const dateFrom     = ref('')
const dateTo       = ref('')

// Snackbar
const snackbarVisible = ref(false)
const snackbarText    = ref('')
const snackbarColor   = ref('success')

// ─── Table headers ─────────────────────────────────────────────────────────

const headers = [
  { title: 'N° Commande',       key: 'order_number',  sortable: false },
  { title: 'Date de livraison', key: 'delivery_date',  sortable: false },
  { title: 'Personnes exclues', key: 'excluded_persons', sortable: false },
]

// ─── Helpers ───────────────────────────────────────────────────────────────

const roleLabel = role => {
  const map = { driver: 'Livreur', requester: 'Expéditeur', recipient: 'Destinataire' }
  return map[role] ?? role
}

const roleColor = role => {
  const map = { driver: 'info', requester: 'warning', recipient: 'success' }
  return map[role] ?? 'secondary'
}

const roleIcon = role => {
  const map = { driver: 'tabler-bike', requester: 'tabler-building-store', recipient: 'tabler-user' }
  return map[role] ?? 'tabler-user'
}

const formatDate = dateStr => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const showSnackbar = (text, color = 'success') => {
  snackbarText.value    = text
  snackbarColor.value   = color
  snackbarVisible.value = true
}

// ─── API ───────────────────────────────────────────────────────────────────

const fetchExclusions = async () => {
  isLoading.value = true
  try {
    const params = { page: page.value, per_page: itemsPerPage.value }
    if (dateFrom.value) params.date_from = dateFrom.value
    if (dateTo.value)   params.date_to   = dateTo.value

    const qs  = new URLSearchParams(params).toString()
    const res = await $api(`/notification-opt-outs/delivery-exclusions${qs ? `?${qs}` : ''}`, { method: 'GET' })

    exclusions.value = res?.data ?? []
    totalItems.value = res?.meta?.total ?? exclusions.value.length
  } catch (e) {
    console.error('Erreur fetch delivery-exclusions:', e)
    showSnackbar(e._data?.message ?? 'Erreur lors du chargement', 'error')
  } finally {
    isLoading.value = false
  }
}

const resetFilters = () => {
  dateFrom.value = ''
  dateTo.value   = ''
  page.value     = 1
  fetchExclusions()
}

// ─── Watchers ──────────────────────────────────────────────────────────────

watch([dateFrom, dateTo, itemsPerPage], () => { page.value = 1; fetchExclusions() })
watch(page, fetchExclusions)

onMounted(fetchExclusions)
</script>

<template>
  <section>
    <!-- ── En-tête ─────────────────────────────────────────────────────── -->
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>Exclusions ponctuelles par livraison</VCardTitle>
        <VCardSubtitle>
          Personnes qui n'ont pas reçu de notification pour une livraison spécifique
        </VCardSubtitle>
      </VCardItem>

      <VDivider />

      <!-- ── Filtres ──────────────────────────────────────────────────── -->
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

        <!-- Date de début -->
        <AppTextField
          v-model="dateFrom"
          type="date"
          label="Du"
          style="inline-size: 11rem;"
          clearable
          @click:clear="dateFrom = ''"
        />

        <!-- Date de fin -->
        <AppTextField
          v-model="dateTo"
          type="date"
          label="Au"
          style="inline-size: 11rem;"
          clearable
          @click:clear="dateTo = ''"
        />

        <!-- Bouton reset -->
        <VBtn
          v-if="dateFrom || dateTo"
          variant="tonal"
          color="secondary"
          prepend-icon="tabler-x"
          @click="resetFilters"
        >
          Réinitialiser
        </VBtn>

        <VSpacer />

        <!-- Compteur résultats -->
        <span
          v-if="!isLoading"
          class="text-medium-emphasis text-sm"
        >
          {{ totalItems }} livraison{{ totalItems > 1 ? 's' : '' }} concernée{{ totalItems > 1 ? 's' : '' }}
        </span>
      </VCardText>

      <VDivider />

      <!-- ── Tableau ──────────────────────────────────────────────────── -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :items="exclusions"
        :items-length="totalItems"
        :loading="isLoading"
        :headers="headers"
        item-value="order_number"
        class="text-no-wrap"
      >
        <!-- N° Commande -->
        <template #item.order_number="{ item }">
          <span class="font-weight-medium font-monospace">{{ item.order_number }}</span>
        </template>

        <!-- Date livraison -->
        <template #item.delivery_date="{ item }">
          <span class="text-sm">{{ formatDate(item.delivery_date) }}</span>
        </template>

        <!-- Personnes exclues -->
        <template #item.excluded_persons="{ item }">
          <div class="d-flex flex-column gap-2 py-2">
            <div
              v-for="(person, idx) in item.excluded_persons"
              :key="idx"
              class="d-flex align-center gap-2"
            >
              <!-- Badge rôle -->
              <VChip
                :color="roleColor(person.role)"
                size="small"
                label
                class="flex-shrink-0"
              >
                <VIcon
                  :icon="roleIcon(person.role)"
                  size="13"
                  class="me-1"
                />
                {{ roleLabel(person.role) }}
              </VChip>

              <!-- Nom -->
              <span class="text-sm font-weight-medium">
                {{ person.name || '—' }}
              </span>

              <!-- Téléphone -->
              <span
                v-if="person.phone"
                class="text-sm text-medium-emphasis font-monospace"
              >
                {{ person.phone }}
              </span>
            </div>
          </div>
        </template>

        <!-- Etat vide -->
        <template #no-data>
          <div class="d-flex flex-column align-center justify-center py-8 gap-2">
            <VIcon
              icon="tabler-bell-check"
              size="40"
              color="medium-emphasis"
            />
            <p class="text-medium-emphasis mb-0">
              Aucune exclusion ponctuelle trouvée
            </p>
          </div>
        </template>
      </VDataTableServer>
    </VCard>

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
