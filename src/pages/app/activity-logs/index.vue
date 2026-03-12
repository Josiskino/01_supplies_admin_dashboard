<script setup>
import { echo } from '@/plugins/echo'
import { $api } from '@/utils/api'

definePage({ meta: { requiresAuth: true } })

// ─── State ──────────────────────────────────────────────────────────────────

const logs          = ref([])
const totalLogs     = ref(0)
const isLoading     = ref(false)
const isLive        = ref(true)
const newCount      = ref(0)
const latestId      = ref(0)
const lastPollAt    = ref(null)
const pollTimer     = ref(null)
const POLL_INTERVAL = 5000
const expandedRows  = ref(new Set())

// Filtres & pagination
const searchQuery   = ref('')
const actionFilter  = ref('')
const dateFrom      = ref('')
const dateTo        = ref('')
const page          = ref(1)
const perPage       = ref(25)

// Stats
const todayCount    = ref(0)
const hourCount     = ref(0)
const totalCount    = ref(0)
const actionCounts  = ref({})

// ─── Config visuelle ─────────────────────────────────────────────────────────

const actionConfig = {
  create:   { color: 'success',   icon: 'tabler-plus-circle',    label: 'Création'     },
  created:  { color: 'success',   icon: 'tabler-plus-circle',    label: 'Création'     },
  update:   { color: 'info',      icon: 'tabler-edit',           label: 'Modification' },
  updated:  { color: 'info',      icon: 'tabler-edit',           label: 'Modification' },
  delete:   { color: 'error',     icon: 'tabler-trash',          label: 'Suppression'  },
  deleted:  { color: 'error',     icon: 'tabler-trash',          label: 'Suppression'  },
  login:    { color: 'purple',    icon: 'tabler-login',          label: 'Connexion'    },
  logout:   { color: 'warning',   icon: 'tabler-logout',         label: 'Déconnexion'  },
  assign:   { color: 'orange',    icon: 'tabler-user-plus',      label: 'Attribution'  },
  view:     { color: 'secondary', icon: 'tabler-eye',            label: 'Consultation' },
  import:   { color: 'teal',      icon: 'tabler-upload',         label: 'Import'       },
  export:   { color: 'teal',      icon: 'tabler-download',       label: 'Export'       },
  approve:  { color: 'success',   icon: 'tabler-circle-check',   label: 'Approbation'  },
  reject:   { color: 'error',     icon: 'tabler-circle-x',       label: 'Rejet'        },
  status:   { color: 'info',      icon: 'tabler-refresh',        label: 'Statut'       },
  send:     { color: 'teal',      icon: 'tabler-send',           label: 'Envoi'        },
  cancel:   { color: 'warning',   icon: 'tabler-ban',            label: 'Annulation'   },
}

const targetConfig = {
  'App\\Models\\Delivery':              { icon: 'tabler-truck',            label: 'Livraison'         },
  'App\\Models\\Customer':              { icon: 'tabler-user',             label: 'Client'            },
  'App\\Models\\Merchant':              { icon: 'tabler-building-store',   label: 'Partenaire'        },
  'App\\Models\\Driver':                { icon: 'tabler-motorbike',        label: 'Livreur'           },
  'App\\Models\\User':                  { icon: 'tabler-user-circle',      label: 'Utilisateur'       },
  'App\\Models\\Expense':               { icon: 'tabler-receipt',          label: 'Dépense'           },
  'App\\Models\\ActivityLog':           { icon: 'tabler-activity',         label: 'Log activité'      },
  'App\\Models\\DriverPayment':         { icon: 'tabler-cash',             label: 'Paiement livreur'  },
  'App\\Models\\PriceAdjustmentRequest':{ icon: 'tabler-adjustments',      label: 'Ajustement prix'   },
  'App\\Models\\NotificationTemplate':  { icon: 'tabler-template',         label: 'Template notif.'   },
  'App\\Models\\NotificationOptOut':    { icon: 'tabler-bell-off',         label: 'Opt-out notif.'    },
  'App\\Models\\DeliveryCalculationConfig':{ icon: 'tabler-calculator',    label: 'Config tarif'      },
}

const getAction = key => {
  const k = (key || '').toLowerCase().split('_')[0]
  return actionConfig[k] ?? { color: 'secondary', icon: 'tabler-info-circle', label: key || '—' }
}

const getTarget = type => {
  if (!type) return null
  if (targetConfig[type]) return targetConfig[type]
  // Fallback : dernier segment du namespace
  const name = type.split('\\').at(-1) ?? type
  return { icon: 'tabler-file', label: name }
}

// ─── Chargement ──────────────────────────────────────────────────────────────

const loadLogs = async () => {
  isLoading.value = true
  try {
    const params = new URLSearchParams({ per_page: perPage.value, page: page.value })
    if (searchQuery.value)  params.set('search', searchQuery.value)
    if (actionFilter.value) params.set('action', actionFilter.value)
    if (dateFrom.value)     params.set('date_from', dateFrom.value)
    if (dateTo.value)       params.set('date_to', dateTo.value)

    const res   = await $api(`/activity-logs?${params}`)
    const items = res.data ?? res ?? []

    logs.value      = Array.isArray(items) ? items : []
    totalLogs.value = res.meta?.total ?? res.total ?? logs.value.length

    if (logs.value.length > 0) {
      latestId.value = Math.max(latestId.value, logs.value[0].id)
    }

    await loadStats()
  } catch (e) {
    console.error('[ActivityLogs] Erreur chargement:', e)
  } finally {
    isLoading.value = false
  }
}

// ─── Polling ─────────────────────────────────────────────────────────────────

const pollNewLogs = async () => {
  if (!isLive.value || latestId.value === 0) return
  try {
    const res      = await $api(`/activity-logs?after_id=${latestId.value}&per_page=50`)
    const newItems = res.data ?? []

    if (newItems.length > 0 && page.value === 1) {
      logs.value      = [...newItems, ...logs.value].slice(0, perPage.value)
      totalLogs.value += newItems.length
      latestId.value  = Math.max(latestId.value, newItems[0].id)
      newCount.value  += newItems.length
      await loadStats()
    }
    lastPollAt.value = new Date()
  } catch { /* silencieux */ }
}

// ─── Stats ───────────────────────────────────────────────────────────────────

const loadStats = async () => {
  try {
    const res          = await $api('/activity-logs/stats')
    const data         = res.data ?? {}
    todayCount.value   = data.today_count  ?? 0
    hourCount.value    = data.hour_count   ?? data.last_hour_count ?? 0
    totalCount.value   = data.total_count  ?? totalLogs.value
    actionCounts.value = data.action_counts ?? {}
  } catch { /* ignoré */ }
}

// ─── Live ─────────────────────────────────────────────────────────────────────

const startPolling = () => {
  if (pollTimer.value) clearInterval(pollTimer.value)
  pollTimer.value = setInterval(pollNewLogs, POLL_INTERVAL)
}

const stopPolling = () => {
  if (pollTimer.value) { clearInterval(pollTimer.value); pollTimer.value = null }
}

const toggleLive = () => {
  isLive.value = !isLive.value
  isLive.value ? startPolling() : stopPolling()
}

// ─── Filtres ──────────────────────────────────────────────────────────────────

const applyFilters = () => {
  page.value     = 1
  newCount.value = 0
  latestId.value = 0
  loadLogs()
}

const clearFilters = () => {
  searchQuery.value  = ''
  actionFilter.value = ''
  dateFrom.value     = ''
  dateTo.value       = ''
  applyFilters()
}

// ─── Expand ───────────────────────────────────────────────────────────────────

const toggleExpand = id => {
  const next = new Set(expandedRows.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expandedRows.value = next
}

const isExpanded = id => expandedRows.value.has(id)

// ─── Formatage ────────────────────────────────────────────────────────────────

const formatFull = iso => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const formatRelative = iso => {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `il y a ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60)  return `il y a ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24)  return `il y a ${h}h`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const getTimestamp = log => log.timestamps?.created_at ?? log.created_at

const hasProperties = log => log.properties && typeof log.properties === 'object' && Object.keys(log.properties).length > 0

// ─── Computed ─────────────────────────────────────────────────────────────────

const topAction = computed(() => {
  const entries = Object.entries(actionCounts.value)
  if (!entries.length) return null
  const [key, count] = entries.sort((a, b) => b[1] - a[1])[0]
  return { key, count }
})

const pageCount = computed(() => Math.ceil(totalLogs.value / perPage.value) || 1)

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadLogs()
  startPolling()
  try {
    echo.channel('activity-logs').listen('.ActivityLogCreated', event => {
      if (page.value === 1) {
        logs.value      = [event, ...logs.value].slice(0, perPage.value)
        totalLogs.value += 1
        latestId.value  = Math.max(latestId.value, event.id)
        newCount.value  += 1
      }
      todayCount.value += 1
      hourCount.value  += 1
    })
  } catch { /* Echo non configuré */ }
})

onUnmounted(() => {
  stopPolling()
  try { echo.leave('activity-logs') } catch { /* ignoré */ }
})
</script>

<template>
  <VRow>
    <!-- ── En-tête ─────────────────────────────────────────────────────── -->
    <VCol cols="12">
      <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-2">
        <div class="d-flex align-center gap-3">
          <h4 class="text-h4">Journal d'activité</h4>

          <VChip :color="isLive ? 'success' : 'secondary'" size="small" class="font-weight-bold">
            <span v-if="isLive" class="live-dot me-1" />
            {{ isLive ? 'EN DIRECT' : 'EN PAUSE' }}
          </VChip>

          <!-- FIX: badge seul, pas de texte en double -->
          <VChip
            v-if="newCount > 0"
            color="error"
            size="small"
            prepend-icon="tabler-bell"
            closable
            @click:close="newCount = 0"
          >
            {{ newCount }} nouvelle{{ newCount > 1 ? 's' : '' }}
          </VChip>
        </div>

        <div class="d-flex align-center gap-2">
          <span v-if="lastPollAt" class="text-caption text-disabled">
            Actualisé {{ formatRelative(lastPollAt.toISOString()) }}
          </span>
          <VBtn
            :color="isLive ? 'warning' : 'success'"
            :prepend-icon="isLive ? 'tabler-player-pause' : 'tabler-player-play'"
            size="small"
            variant="tonal"
            @click="toggleLive"
          >
            {{ isLive ? 'Pause' : 'Reprendre' }}
          </VBtn>
          <VBtn icon="tabler-refresh" size="small" variant="text" :loading="isLoading" @click="loadLogs" />
        </div>
      </div>
    </VCol>

    <!-- ── Stats ────────────────────────────────────────────────────────── -->
    <VCol cols="6" sm="3" class="d-flex">
      <VCard variant="tonal" color="primary" class="flex-grow-1">
        <VCardText class="d-flex align-center gap-3 py-4">
          <VAvatar color="primary" variant="tonal" size="38">
            <VIcon icon="tabler-database" size="20" />
          </VAvatar>
          <div>
            <div class="text-h5 font-weight-bold">{{ (totalCount || totalLogs).toLocaleString('fr-FR') }}</div>
            <div class="text-caption">Total des logs</div>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="6" sm="3" class="d-flex">
      <VCard variant="tonal" color="success" class="flex-grow-1">
        <VCardText class="d-flex align-center gap-3 py-4">
          <VAvatar color="success" variant="tonal" size="38">
            <VIcon icon="tabler-calendar-check" size="20" />
          </VAvatar>
          <div>
            <div class="text-h5 font-weight-bold">{{ todayCount }}</div>
            <div class="text-caption">Aujourd'hui</div>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="6" sm="3" class="d-flex">
      <VCard variant="tonal" color="info" class="flex-grow-1">
        <VCardText class="d-flex align-center gap-3 py-4">
          <VAvatar color="info" variant="tonal" size="38">
            <VIcon icon="tabler-clock" size="20" />
          </VAvatar>
          <div>
            <div class="text-h5 font-weight-bold">{{ hourCount }}</div>
            <div class="text-caption">Cette heure</div>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <VCol cols="6" sm="3" class="d-flex">
      <VCard variant="tonal" color="warning" class="flex-grow-1">
        <VCardText class="d-flex align-center gap-3 py-4">
          <VAvatar color="warning" variant="tonal" size="38">
            <VIcon icon="tabler-chart-bar" size="20" />
          </VAvatar>
          <div>
            <div class="text-h5 font-weight-bold text-capitalize" style="font-size:0.9rem!important">
              {{ topAction ? getAction(topAction.key).label : '—' }}
            </div>
            <div class="text-caption">
              Action principale{{ topAction ? ` (${topAction.count}×)` : '' }}
            </div>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- ── Filtres ───────────────────────────────────────────────────────── -->
    <VCol cols="12">
      <VCard>
        <VCardText class="pb-2">
          <VRow dense>
            <VCol cols="12" sm="4">
              <VTextField
                v-model="searchQuery"
                placeholder="Rechercher (action, description, utilisateur…)"
                prepend-inner-icon="tabler-search"
                density="compact"
                hide-details
                clearable
                @keyup.enter="applyFilters"
                @click:clear="clearFilters"
              />
            </VCol>

            <VCol cols="12" sm="2">
              <VTextField
                v-model="actionFilter"
                placeholder="Action (ex: create)"
                prepend-inner-icon="tabler-filter"
                density="compact"
                hide-details
                clearable
                @keyup.enter="applyFilters"
              />
            </VCol>

            <VCol cols="6" sm="2">
              <VTextField v-model="dateFrom" type="date" label="Du" density="compact" hide-details />
            </VCol>

            <VCol cols="6" sm="2">
              <VTextField v-model="dateTo" type="date" label="Au" density="compact" hide-details />
            </VCol>

            <VCol cols="12" sm="2" class="d-flex gap-2 align-center">
              <VBtn color="primary" size="small" prepend-icon="tabler-search" @click="applyFilters">
                Filtrer
              </VBtn>
              <VBtn variant="tonal" color="secondary" size="small" icon="tabler-x" @click="clearFilters" />
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </VCol>

    <!-- ── Tableau ───────────────────────────────────────────────────────── -->
    <VCol cols="12">
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between px-4 pt-4 pb-2">
          <span>
            <VIcon icon="tabler-list-details" class="me-2" />
            Historique complet
          </span>
          <span class="text-caption text-disabled">
            {{ totalLogs.toLocaleString('fr-FR') }} entrée{{ totalLogs > 1 ? 's' : '' }}
          </span>
        </VCardTitle>

        <VProgressLinear v-if="isLoading" indeterminate color="primary" height="2" />

        <VCardText v-if="!isLoading && logs.length === 0" class="text-center py-12">
          <VIcon icon="tabler-inbox" size="48" class="text-disabled mb-3" />
          <p class="text-body-1 text-disabled">Aucune activité enregistrée</p>
        </VCardText>

        <VTable v-else fixed-header height="600px" class="activity-table">
          <thead>
            <tr>
              <th style="width:70px">#</th>
              <th style="width:160px">Date</th>
              <th style="width:170px">Utilisateur</th>
              <th style="width:140px">Action</th>
              <th style="width:150px">Cible</th>
              <th>Description</th>
              <th style="width:120px">IP</th>
              <th style="width:56px"></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="log in logs" :key="log.id">
              <tr :class="{ 'row--new': newCount > 0 && log.id === logs[0]?.id }">

                <!-- ID -->
                <td class="text-caption text-disabled">#{{ log.id }}</td>

                <!-- Date -->
                <td>
                  <span class="text-caption text-no-wrap">
                    {{ formatFull(getTimestamp(log)) }}
                  </span>
                </td>

                <!-- Utilisateur -->
                <td>
                  <div v-if="log.user" class="d-flex flex-column">
                    <span class="text-body-2 font-weight-medium text-no-wrap">{{ log.user.name }}</span>
                    <span class="text-caption text-disabled">{{ log.user.email }}</span>
                  </div>
                  <span v-else class="text-caption text-disabled">—</span>
                </td>

                <!-- Action -->
                <td>
                  <VChip :color="getAction(log.action).color" size="small" label class="font-weight-bold">
                    <VIcon :icon="getAction(log.action).icon" size="12" class="me-1" />
                    {{ getAction(log.action).label }}
                  </VChip>
                  <div class="text-caption text-disabled mt-1">{{ log.action }}</div>
                </td>

                <!-- Cible — FIX: getTarget retourne null si vide -->
                <td>
                  <template v-if="getTarget(log.target_type)">
                    <div class="d-flex align-center gap-1">
                      <VIcon :icon="getTarget(log.target_type).icon" size="14" color="primary" />
                      <div class="d-flex flex-column">
                        <span class="text-caption font-weight-medium">{{ getTarget(log.target_type).label }}</span>
                        <span v-if="log.target_id" class="text-caption text-disabled">#{{ log.target_id }}</span>
                      </div>
                    </div>
                  </template>
                  <span v-else class="text-caption text-disabled">—</span>
                </td>

                <!-- Description -->
                <td>
                  <span class="text-body-2 description-cell">{{ log.description || '—' }}</span>
                </td>

                <!-- IP -->
                <td>
                  <VChip v-if="log.ip_address" size="x-small" variant="outlined" class="font-mono">
                    {{ log.ip_address }}
                  </VChip>
                  <span v-else class="text-caption text-disabled">—</span>
                </td>

                <!-- Expand — FIX: toujours visible, disabled si pas de données -->
                <td class="text-center">
                  <VBtn
                    :icon="isExpanded(log.id) ? 'tabler-chevron-up' : 'tabler-chevron-down'"
                    size="x-small"
                    :variant="isExpanded(log.id) ? 'tonal' : 'text'"
                    :color="isExpanded(log.id) ? 'primary' : 'default'"
                    @click="toggleExpand(log.id)"
                  />
                </td>
              </tr>

              <!-- Ligne détails — FIX: v-show au lieu de v-if + pas de VExpandTransition dans tr -->
              <tr v-show="isExpanded(log.id)" class="expand-row">
                <td colspan="8" class="pa-0">
                  <div class="expand-content pa-4">
                    <VRow dense>
                      <!-- Description complète -->
                      <VCol cols="12" sm="6">
                        <p class="text-caption text-uppercase text-disabled font-weight-bold mb-1">Description</p>
                        <p class="text-body-2 mb-0">{{ log.description || '—' }}</p>
                      </VCol>

                      <!-- Cible complète -->
                      <VCol cols="12" sm="6">
                        <p class="text-caption text-uppercase text-disabled font-weight-bold mb-1">Modèle cible</p>
                        <p class="text-body-2 font-mono mb-0">{{ log.target_type || '—' }}</p>
                        <p v-if="log.target_id" class="text-caption text-disabled mb-0">ID : {{ log.target_id }}</p>
                      </VCol>

                      <!-- Properties -->
                      <VCol v-if="hasProperties(log)" cols="12" class="mt-2">
                        <p class="text-caption text-uppercase text-disabled font-weight-bold mb-2">
                          <VIcon icon="tabler-code" size="13" class="me-1" />
                          Données (properties)
                        </p>
                        <VTable density="compact" class="properties-table">
                          <thead>
                            <tr>
                              <th style="width:30%">Champ</th>
                              <th style="width:35%">Avant</th>
                              <th style="width:35%">Après</th>
                            </tr>
                          </thead>
                          <tbody>
                            <template v-if="log.properties?.old || log.properties?.new">
                              <tr
                                v-for="field in [...new Set([...Object.keys(log.properties?.old ?? {}), ...Object.keys(log.properties?.new ?? {})])]"
                                :key="field"
                              >
                                <td class="text-caption font-mono">{{ field }}</td>
                                <td class="text-caption text-error">{{ log.properties?.old?.[field] ?? '—' }}</td>
                                <td class="text-caption text-success">{{ log.properties?.new?.[field] ?? '—' }}</td>
                              </tr>
                            </template>
                            <template v-else>
                              <tr v-for="(val, key) in log.properties" :key="key">
                                <td class="text-caption font-mono">{{ key }}</td>
                                <td colspan="2" class="text-caption">
                                  {{ typeof val === 'object' ? JSON.stringify(val) : val }}
                                </td>
                              </tr>
                            </template>
                          </tbody>
                        </VTable>
                      </VCol>

                      <VCol v-else cols="12" class="mt-2">
                        <span class="text-caption text-disabled">Aucune donnée supplémentaire</span>
                      </VCol>
                    </VRow>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </VTable>

        <!-- FIX pagination — toujours affichée quand il y a des données -->
        <VCardText v-if="logs.length > 0" class="d-flex align-center justify-space-between flex-wrap gap-2 pt-2">
          <span class="text-caption text-disabled">
            Page {{ page }} / {{ pageCount }} · {{ totalLogs.toLocaleString('fr-FR') }} entrées
          </span>
          <VPagination
            v-model="page"
            :length="pageCount"
            :total-visible="7"
            density="compact"
            @update:model-value="loadLogs"
          />
          <VSelect
            v-model="perPage"
            :items="[10, 25, 50, 100]"
            density="compact"
            hide-details
            style="max-width:90px"
            @update:model-value="applyFilters"
          />
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>

<style scoped>
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

.row--new {
  animation: slide-in 0.4s ease-out;
  background: rgba(var(--v-theme-success), 0.06);
}

@keyframes slide-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.activity-table thead th {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.description-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 260px;
}

.expand-row > td {
  padding: 0 !important;
  border-bottom: 2px solid rgba(var(--v-theme-primary), 0.15) !important;
}

.expand-content {
  background: rgba(var(--v-theme-surface-variant), 0.5);
}

.properties-table {
  background: transparent !important;
}

.font-mono {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
}
</style>
