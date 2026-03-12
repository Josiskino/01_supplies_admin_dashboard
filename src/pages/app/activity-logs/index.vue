<script setup>
import { echo } from '@/plugins/echo'
import { $api } from '@/utils/api'

definePage({ meta: { requiresAuth: true } })

// ─── State ──────────────────────────────────────────────────────────────────

const logs         = ref([])
const totalLogs    = ref(0)
const isLoading    = ref(false)
const isLive       = ref(true)
const newCount     = ref(0)        // Nouvelles entrées depuis la dernière lecture
const latestId     = ref(0)        // Dernier ID vu — base du polling
const lastPollAt   = ref(null)
const pollTimer    = ref(null)
const POLL_INTERVAL = 5000         // 5 secondes

// Filtres
const searchQuery   = ref('')
const actionFilter  = ref('')
const userFilter    = ref('')
const page          = ref(1)
const perPage       = ref(30)

// Stats
const todayCount    = ref(0)
const hourCount     = ref(0)
const actionCounts  = ref({})

// Snackbar
const snackbar      = ref({ visible: false, text: '', color: 'success' })

// ─── Config visuelle ─────────────────────────────────────────────────────────

const actionConfig = {
  create:   { color: 'success',  icon: 'ri-add-circle-line',     label: 'Création'     },
  created:  { color: 'success',  icon: 'ri-add-circle-line',     label: 'Création'     },
  update:   { color: 'info',     icon: 'ri-edit-line',           label: 'Modification' },
  updated:  { color: 'info',     icon: 'ri-edit-line',           label: 'Modification' },
  delete:   { color: 'error',    icon: 'ri-delete-bin-line',     label: 'Suppression'  },
  deleted:  { color: 'error',    icon: 'ri-delete-bin-line',     label: 'Suppression'  },
  login:    { color: 'purple',   icon: 'ri-login-circle-line',   label: 'Connexion'    },
  logout:   { color: 'warning',  icon: 'ri-logout-circle-line',  label: 'Déconnexion'  },
  assign:   { color: 'orange',   icon: 'ri-user-add-line',       label: 'Attribution'  },
  view:     { color: 'secondary',icon: 'ri-eye-line',            label: 'Consultation' },
  import:   { color: 'teal',     icon: 'ri-upload-line',         label: 'Import'       },
  export:   { color: 'teal',     icon: 'ri-download-line',       label: 'Export'       },
  approve:  { color: 'success',  icon: 'ri-checkbox-circle-line',label: 'Approbation'  },
  reject:   { color: 'error',    icon: 'ri-close-circle-line',   label: 'Rejet'        },
}

const targetConfig = {
  'App\\Models\\Delivery':  { icon: 'ri-truck-line',         label: 'Livraison'   },
  'App\\Models\\Customer':  { icon: 'ri-user-line',          label: 'Client'      },
  'App\\Models\\Merchant':  { icon: 'ri-store-2-line',       label: 'Partenaire'  },
  'App\\Models\\Driver':    { icon: 'ri-motorbike-line',     label: 'Livreur'     },
  'App\\Models\\User':      { icon: 'ri-account-circle-line',label: 'Utilisateur' },
  'App\\Models\\Expense':   { icon: 'ri-money-dollar-circle-line', label: 'Dépense' },
}

const getAction = key => {
  const k = (key || '').toLowerCase().split('_')[0]
  return actionConfig[k] ?? { color: 'secondary', icon: 'ri-information-line', label: key }
}

const getTarget = type => targetConfig[type] ?? { icon: 'ri-file-list-line', label: type?.split('\\').at(-1) ?? '—' }

// ─── Chargement initial ──────────────────────────────────────────────────────

const loadLogs = async () => {
  isLoading.value = true
  try {
    const params = new URLSearchParams({ per_page: perPage.value, page: page.value })
    if (searchQuery.value) params.set('search', searchQuery.value)
    if (actionFilter.value) params.set('action', actionFilter.value)
    if (userFilter.value)   params.set('user_id', userFilter.value)

    const res = await $api(`/activity-logs?${params}`)
    const items = res.data ?? []

    logs.value   = items
    totalLogs.value = res.meta?.total ?? items.length

    if (items.length > 0) {
      latestId.value = Math.max(latestId.value, items[0].id)
    }

    await loadStats()
  } finally {
    isLoading.value = false
  }
}

// ─── Polling — récupère uniquement les nouveaux logs ─────────────────────────

const pollNewLogs = async () => {
  if (!isLive.value || latestId.value === 0) return

  try {
    const params = new URLSearchParams({ after_id: latestId.value, per_page: 50 })
    if (actionFilter.value) params.set('action', actionFilter.value)

    const res = await $api(`/activity-logs?${params}`)
    const newItems = res.data ?? []

    if (newItems.length > 0) {
      // Prépend les nouvelles entrées en haut
      logs.value = [...newItems, ...logs.value].slice(0, 200) // Limiter à 200 en mémoire
      totalLogs.value += newItems.length
      latestId.value = Math.max(latestId.value, newItems[0].id)

      // Incrémenter le badge de nouveautés
      newCount.value += newItems.length

      // Rafraîchir les stats
      await loadStats()
    }

    lastPollAt.value = new Date()
  } catch {
    // Silencieux — on réessaiera au prochain tick
  }
}

// ─── Stats ───────────────────────────────────────────────────────────────────

const loadStats = async () => {
  try {
    const res = await $api('/activity-logs/stats')
    const data = res.data ?? {}
    todayCount.value  = data.today_count  ?? 0
    hourCount.value   = data.hour_count   ?? data.last_hour_count ?? 0
    actionCounts.value = data.action_counts ?? {}
  } catch { /* ignoré */ }
}

// ─── Live toggle ─────────────────────────────────────────────────────────────

const startPolling = () => {
  if (pollTimer.value) clearInterval(pollTimer.value)
  pollTimer.value = setInterval(pollNewLogs, POLL_INTERVAL)
}

const stopPolling = () => {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

const toggleLive = () => {
  isLive.value = !isLive.value
  if (isLive.value) startPolling()
  else stopPolling()
}

const markAllRead = () => {
  newCount.value = 0
}

// ─── Filtres — relancer le chargement ────────────────────────────────────────

const applyFilters = () => {
  page.value     = 1
  newCount.value = 0
  latestId.value = 0
  loadLogs()
}

const clearFilters = () => {
  searchQuery.value  = ''
  actionFilter.value = ''
  userFilter.value   = ''
  applyFilters()
}

// ─── Formatage dates ─────────────────────────────────────────────────────────

const formatRelative = iso => {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `il y a ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60)  return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24)  return `il y a ${h}h`
  return new Date(iso).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
}

const formatFull = iso => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const formatUser = log => log.user?.name ?? `#${log.user?.id ?? '?'}`

// ─── Lifecycle ───────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadLogs()
  startPolling()

  // Écoute Echo (Pusher) si disponible — mise à jour instantanée
  try {
    echo.channel('activity-logs').listen('.ActivityLogCreated', event => {
      const item = event
      logs.value   = [item, ...logs.value].slice(0, 200)
      latestId.value = Math.max(latestId.value, item.id)
      totalLogs.value += 1
      newCount.value  += 1
      todayCount.value += 1
      hourCount.value  += 1
    })
  } catch { /* Echo non configuré — le polling prend le relais */ }
})

onUnmounted(() => {
  stopPolling()
  try { echo.leave('activity-logs') } catch { /* ignoré */ }
})

// ─── Computed ────────────────────────────────────────────────────────────────

const topAction = computed(() => {
  const entries = Object.entries(actionCounts.value)
  if (!entries.length) return null
  const [key, count] = entries.sort((a, b) => b[1] - a[1])[0]
  return { key, count }
})
</script>

<template>
  <VRow>
    <!-- ── En-tête ──────────────────────────────────────────────────────── -->
    <VCol cols="12">
      <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-4">
        <div class="d-flex align-center gap-3">
          <h4 class="text-h4">Journal d'activité</h4>

          <!-- Indicateur LIVE -->
          <VChip
            :color="isLive ? 'success' : 'secondary'"
            size="small"
            class="font-weight-bold"
          >
            <span
              v-if="isLive"
              class="live-dot mr-1"
            />
            {{ isLive ? 'EN DIRECT' : 'EN PAUSE' }}
          </VChip>

          <!-- Badge nouvelles entrées -->
          <VBadge
            v-if="newCount > 0"
            :content="newCount > 99 ? '99+' : newCount"
            color="error"
            inline
          >
            <VBtn
              size="small"
              variant="tonal"
              color="error"
              @click="markAllRead"
            >
              {{ newCount }} nouvelle{{ newCount > 1 ? 's' : '' }}
            </VBtn>
          </VBadge>
        </div>

        <div class="d-flex align-center gap-2">
          <!-- Dernière mise à jour -->
          <span
            v-if="lastPollAt"
            class="text-caption text-disabled"
          >
            Actualisé {{ formatRelative(lastPollAt.toISOString()) }}
          </span>

          <!-- Bouton pause / lecture -->
          <VBtn
            :color="isLive ? 'warning' : 'success'"
            :prepend-icon="isLive ? 'ri-pause-circle-line' : 'ri-play-circle-line'"
            size="small"
            variant="tonal"
            @click="toggleLive"
          >
            {{ isLive ? 'Pause' : 'Reprendre' }}
          </VBtn>

          <!-- Bouton refresh manuel -->
          <VBtn
            icon="ri-refresh-line"
            size="small"
            variant="text"
            :loading="isLoading"
            @click="loadLogs"
          />
        </div>
      </div>
    </VCol>

    <!-- ── Stats ────────────────────────────────────────────────────────── -->
    <VCol
      cols="12"
      sm="4"
    >
      <VCard variant="tonal" color="primary">
        <VCardText class="d-flex align-center gap-3 py-3">
          <VAvatar color="primary" variant="tonal" size="40">
            <VIcon icon="ri-calendar-check-line" />
          </VAvatar>
          <div>
            <div class="text-h5 font-weight-bold">{{ todayCount }}</div>
            <div class="text-caption text-disabled">Actions aujourd'hui</div>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <VCol
      cols="12"
      sm="4"
    >
      <VCard variant="tonal" color="info">
        <VCardText class="d-flex align-center gap-3 py-3">
          <VAvatar color="info" variant="tonal" size="40">
            <VIcon icon="ri-time-line" />
          </VAvatar>
          <div>
            <div class="text-h5 font-weight-bold">{{ hourCount }}</div>
            <div class="text-caption text-disabled">Cette dernière heure</div>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <VCol
      cols="12"
      sm="4"
    >
      <VCard variant="tonal" color="warning">
        <VCardText class="d-flex align-center gap-3 py-3">
          <VAvatar color="warning" variant="tonal" size="40">
            <VIcon icon="ri-bar-chart-line" />
          </VAvatar>
          <div>
            <div class="text-h5 font-weight-bold text-capitalize">
              {{ topAction ? getAction(topAction.key).label : '—' }}
            </div>
            <div class="text-caption text-disabled">
              Action la plus fréquente{{ topAction ? ` (${topAction.count}×)` : '' }}
            </div>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- ── Filtres ───────────────────────────────────────────────────────── -->
    <VCol cols="12">
      <VCard>
        <VCardText>
          <VRow dense>
            <VCol
              cols="12"
              sm="5"
            >
              <VTextField
                v-model="searchQuery"
                placeholder="Rechercher (action, description, utilisateur…)"
                prepend-inner-icon="ri-search-line"
                density="compact"
                hide-details
                clearable
                @update:model-value="applyFilters"
              />
            </VCol>

            <VCol
              cols="12"
              sm="4"
            >
              <VTextField
                v-model="actionFilter"
                placeholder="Filtrer par action (ex: create)"
                prepend-inner-icon="ri-filter-line"
                density="compact"
                hide-details
                clearable
                @update:model-value="applyFilters"
              />
            </VCol>

            <VCol
              cols="12"
              sm="3"
              class="d-flex align-center"
            >
              <VBtn
                variant="tonal"
                color="secondary"
                prepend-icon="ri-close-line"
                size="small"
                @click="clearFilters"
              >
                Effacer
              </VBtn>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>

    <!-- ── Feed temps réel ──────────────────────────────────────────────── -->
    <VCol cols="12">
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between px-4 pt-4">
          <span>
            <VIcon icon="ri-pulse-line" class="mr-1" />
            Flux en temps réel
          </span>
          <span class="text-caption text-disabled">
            {{ totalLogs }} entrée{{ totalLogs > 1 ? 's' : '' }} au total
          </span>
        </VCardTitle>

        <!-- Loader initial -->
        <div
          v-if="isLoading && logs.length === 0"
          class="d-flex justify-center py-12"
        >
          <VProgressCircular indeterminate color="primary" />
        </div>

        <!-- Feed vide -->
        <VCardText
          v-else-if="!isLoading && logs.length === 0"
          class="text-center py-12"
        >
          <VIcon icon="ri-inbox-line" size="48" class="text-disabled mb-3" />
          <p class="text-body-1 text-disabled">Aucune activité enregistrée</p>
        </VCardText>

        <!-- Timeline -->
        <VList
          v-else
          lines="two"
          class="activity-feed pa-0"
        >
          <template
            v-for="(log, index) in logs"
            :key="log.id"
          >
            <VListItem
              :class="['activity-item', index === 0 && newCount > 0 ? 'activity-item--new' : '']"
            >
              <template #prepend>
                <VAvatar
                  :color="getAction(log.action).color"
                  variant="tonal"
                  size="36"
                  class="mr-3"
                >
                  <VIcon
                    :icon="getAction(log.action).icon"
                    size="18"
                  />
                </VAvatar>
              </template>

              <VListItemTitle class="d-flex align-center flex-wrap gap-2 mb-1">
                <!-- Badge action -->
                <VChip
                  :color="getAction(log.action).color"
                  size="x-small"
                  label
                  class="font-weight-bold"
                >
                  {{ getAction(log.action).label }}
                </VChip>

                <!-- Cible -->
                <template v-if="log.target?.type || log.target_type">
                  <VIcon
                    :icon="getTarget(log.target?.type ?? log.target_type).icon"
                    size="14"
                    class="text-disabled"
                  />
                  <span class="text-caption text-disabled">
                    {{ getTarget(log.target?.type ?? log.target_type).label }}
                    <span v-if="log.target?.id ?? log.target_id"> #{{ log.target?.id ?? log.target_id }}</span>
                  </span>
                </template>

                <!-- IP -->
                <VChip
                  v-if="log.ip_address"
                  size="x-small"
                  variant="outlined"
                  class="text-disabled"
                >
                  <VIcon icon="ri-global-line" size="10" class="mr-1" />
                  {{ log.ip_address }}
                </VChip>
              </VListItemTitle>

              <VListItemSubtitle class="text-body-2">
                {{ log.description || log.action }}
              </VListItemSubtitle>

              <template #append>
                <div class="d-flex flex-column align-end gap-1">
                  <!-- Utilisateur -->
                  <span class="text-caption font-weight-medium">
                    <VIcon icon="ri-user-line" size="12" class="mr-1" />
                    {{ formatUser(log) }}
                  </span>

                  <!-- Horodatage -->
                  <VTooltip :text="formatFull(log.timestamps?.created_at)">
                    <template #activator="{ props }">
                      <span
                        v-bind="props"
                        class="text-caption text-disabled cursor-pointer"
                      >
                        {{ formatRelative(log.timestamps?.created_at) }}
                      </span>
                    </template>
                  </VTooltip>
                </div>
              </template>
            </VListItem>

            <VDivider v-if="index < logs.length - 1" />
          </template>
        </VList>

        <!-- Pagination -->
        <VCardText
          v-if="totalLogs > perPage"
          class="d-flex justify-center pt-0"
        >
          <VPagination
            v-model="page"
            :length="Math.ceil(totalLogs / perPage)"
            :total-visible="5"
            density="compact"
            @update:model-value="loadLogs"
          />
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <!-- Snackbar -->
  <VSnackbar
    v-model="snackbar.visible"
    :color="snackbar.color"
    :timeout="3000"
    location="bottom end"
  >
    {{ snackbar.text }}
  </VSnackbar>
</template>

<style scoped>
/* Point pulsant pour indicateur LIVE */
.live-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse-dot 1.4s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.8); }
}

/* Animation entrée pour les nouvelles lignes */
.activity-item--new {
  animation: slide-in 0.35s ease-out;
  background: rgba(var(--v-theme-success), 0.05);
}

@keyframes slide-in {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.activity-feed {
  max-block-size: 70vh;
  overflow-y: auto;
  scroll-behavior: smooth;
}
</style>
