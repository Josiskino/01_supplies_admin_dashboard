<script setup>
definePage({ meta: { requiresAuth: true } })

// ─── State ─────────────────────────────────────────────────────────────────

const templates   = ref([])
const isLoading   = ref(false)
const isSaving    = ref(null)
const isResetting = ref(null)
const selected    = ref('driver')

const drafts = ref({
  driver:    '',
  requester: '',
  recipient: '',
})

const snackbarVisible = ref(false)
const snackbarText    = ref('')
const snackbarColor   = ref('success')

const resetDialog = ref(false)
const resetTarget = ref(null)

// ─── Config ────────────────────────────────────────────────────────────────

const actors = ['driver', 'requester', 'recipient']

const actorConfig = {
  driver: {
    label:       'Livreur',
    icon:        'tabler-bike',
    color:       'info',
    description: "Message envoyé au livreur lors de l'assignation d'une livraison.",
  },
  requester: {
    label:       'Expéditeur',
    icon:        'tabler-building-store',
    color:       'warning',
    description: 'Message envoyé au partenaire pour confirmer que sa livraison est prise en charge.',
  },
  recipient: {
    label:       'Destinataire',
    icon:        'tabler-user',
    color:       'success',
    description: "Message envoyé au client pour l'informer qu'une livraison est en route.",
  },
}

const variableDescriptions = {
  '{{order_number}}':     'Numéro de commande',
  '{{requester_name}}':  'Nom du partenaire / expéditeur',
  '{{recipient_name}}':  'Nom du client / destinataire',
  '{{recipient_phone}}': 'Téléphone du destinataire',
  '{{driver_name}}':     'Nom du livreur',
  '{{driver_phone}}':    'Téléphone du livreur',
  '{{pickup_location}}':  'Adresse de ramassage (texte brut)',
  '{{dropoff_location}}': 'Adresse de livraison (texte brut)',
  '{{pickup_maps_url}}':  'Lien Google Maps — lieu de ramassage (cliquable)',
  '{{dropoff_maps_url}}': 'Lien Google Maps — lieu de livraison (cliquable)',
  '{{distance_km}}':      'Distance en km',
  '{{price}}':            'Prix de la livraison (FCFA)',
  '{{start_url}}':        'Lien pour démarrer la course',
}

// ─── Computed ──────────────────────────────────────────────────────────────

const currentTemplate = computed(() =>
  templates.value.find(t => t.actor === selected.value),
)

const currentVariables = computed(() =>
  currentTemplate.value?.variables ?? [],
)

const isDirty = actor => {
  const original = templates.value.find(t => t.actor === actor)
  if (!original) return drafts.value[actor]?.trim().length > 0
  return drafts.value[actor] !== original.content
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const formatDate = dateStr => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const showSnackbar = (text, color = 'success') => {
  snackbarText.value    = text
  snackbarColor.value   = color
  snackbarVisible.value = true
}

// ─── Insertion variable au curseur ─────────────────────────────────────────

const textareaRef = ref(null)

const insertVariable = variable => {
  const textarea = textareaRef.value?.$el?.querySelector('textarea')
  const actor    = selected.value

  if (!textarea) {
    drafts.value[actor] += variable
    return
  }

  const start = textarea.selectionStart ?? drafts.value[actor].length
  const end   = textarea.selectionEnd   ?? drafts.value[actor].length
  const text  = drafts.value[actor]

  drafts.value[actor] = text.slice(0, start) + variable + text.slice(end)

  nextTick(() => {
    const newPos = start + variable.length
    textarea.setSelectionRange(newPos, newPos)
    textarea.focus()
  })
}

// ─── Prévisualisation ───────────────────────────────────────────────────────

const exampleValues = {
  '{{order_number}}':     'LIV-202603-1234567',
  '{{requester_name}}':  'Boutique Centrale',
  '{{recipient_name}}':  'Konan Yao',
  '{{recipient_phone}}': '2250759000001',
  '{{driver_name}}':     'Koffi Mensah',
  '{{driver_phone}}':    '2280123456',
  '{{pickup_location}}':  'Cocody Riviera 3, Abidjan',
  '{{dropoff_location}}': 'Plateau, Abidjan',
  '{{pickup_maps_url}}':  'https://maps.google.com/?q=5.3600,-3.9800',
  '{{dropoff_maps_url}}': 'https://maps.google.com/?q=5.3544,-3.9990',
  '{{distance_km}}':      '12.5',
  '{{price}}':            '2 500',
  '{{start_url}}':        'https://app.example.com/start/abc123',
}

const previewText = computed(() => {
  let text = drafts.value[selected.value] ?? ''
  for (const [variable, value] of Object.entries(exampleValues)) {
    text = text.replaceAll(variable, value)
  }
  return text
})

// ─── API ───────────────────────────────────────────────────────────────────

const fetchTemplates = async () => {
  isLoading.value = true
  try {
    const res = await $api('/notification-templates', { method: 'GET' })
    templates.value = res?.data ?? []
    for (const t of templates.value) {
      drafts.value[t.actor] = t.content
    }
  } catch (e) {
    showSnackbar(e._data?.message ?? 'Erreur lors du chargement', 'error')
  } finally {
    isLoading.value = false
  }
}

const saveTemplate = async () => {
  const actor     = selected.value
  isSaving.value  = actor
  try {
    const res = await $api(`/notification-templates/${actor}`, {
      method: 'PUT',
      body:   { content: drafts.value[actor] },
    })
    const idx = templates.value.findIndex(t => t.actor === actor)
    if (idx !== -1) templates.value[idx] = res.data
    else templates.value.push(res.data)
    drafts.value[actor] = res.data.content
    showSnackbar('Template enregistré avec succès')
  } catch (e) {
    showSnackbar(e._data?.message ?? 'Erreur lors de la sauvegarde', 'error')
  } finally {
    isSaving.value = null
  }
}

const confirmReset = () => {
  resetTarget.value = selected.value
  resetDialog.value = true
}

const doReset = async () => {
  const actor        = resetTarget.value
  isResetting.value  = actor
  try {
    const res = await $api(`/notification-templates/${actor}/reset`, { method: 'POST' })
    drafts.value[actor] = res.data.content
    const idx = templates.value.findIndex(t => t.actor === actor)
    if (idx !== -1) templates.value[idx] = res.data
    resetDialog.value = false
    showSnackbar('Template réinitialisé aux valeurs par défaut')
  } catch (e) {
    showSnackbar(e._data?.message ?? 'Erreur lors de la réinitialisation', 'error')
  } finally {
    isResetting.value = null
    resetTarget.value = null
  }
}

onMounted(fetchTemplates)
</script>

<template>
  <section>
    <VCard :loading="isLoading">
      <VCardItem class="pb-4">
        <VCardTitle>Templates de messages WhatsApp</VCardTitle>
        <VCardSubtitle>
          Personnalisez les messages envoyés lors de l'assignation d'une livraison.
          Cliquez sur une variable pour l'insérer dans le message.
        </VCardSubtitle>
      </VCardItem>

      <VDivider />

      <VRow no-gutters style="min-height: 600px;">

        <!-- ── Sidebar : liste des acteurs ──────────────────────────────── -->
        <VCol
          cols="12"
          sm="3"
          style="border-inline-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));"
        >
          <VList
            nav
            density="compact"
            class="py-3"
          >
            <VListItem
              v-for="actor in actors"
              :key="actor"
              :value="actor"
              :active="selected === actor"
              :color="actorConfig[actor].color"
              rounded="lg"
              class="mb-1"
              @click="selected = actor"
            >
              <template #prepend>
                <VAvatar
                  :color="actorConfig[actor].color"
                  variant="tonal"
                  size="36"
                  class="me-3"
                >
                  <VIcon
                    :icon="actorConfig[actor].icon"
                    size="18"
                  />
                </VAvatar>
              </template>

              <VListItemTitle class="font-weight-medium">
                {{ actorConfig[actor].label }}
              </VListItemTitle>

              <VListItemSubtitle class="text-xs mt-1">
                {{ templates.find(t => t.actor === actor)?.updated_at ? formatDate(templates.find(t => t.actor === actor).updated_at) : 'Non enregistré' }}
              </VListItemSubtitle>

              <template #append>
                <VIcon
                  v-if="isDirty(actor)"
                  icon="tabler-circle-filled"
                  size="10"
                  color="warning"
                />
              </template>
            </VListItem>
          </VList>
        </VCol>

        <!-- ── Contenu : éditeur + prévisualisation ─────────────────────── -->
        <VCol
          cols="12"
          sm="9"
        >
          <div
            v-if="!isLoading"
            class="pa-5"
          >
            <!-- En-tête acteur sélectionné -->
            <div class="d-flex align-center justify-space-between mb-4">
              <div class="d-flex align-center gap-3">
                <VAvatar
                  :color="actorConfig[selected].color"
                  variant="tonal"
                  size="42"
                >
                  <VIcon :icon="actorConfig[selected].icon" />
                </VAvatar>
                <div>
                  <div class="font-weight-semibold text-base d-flex align-center gap-2">
                    {{ actorConfig[selected].label }}
                    <VChip
                      v-if="isDirty(selected)"
                      size="x-small"
                      color="warning"
                      label
                    >
                      Modifié
                    </VChip>
                  </div>
                  <div class="text-sm text-medium-emphasis">
                    {{ actorConfig[selected].description }}
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="d-flex gap-2">
                <VBtn
                  variant="tonal"
                  color="secondary"
                  size="small"
                  prepend-icon="tabler-restore"
                  @click="confirmReset"
                >
                  Réinitialiser
                </VBtn>
                <VBtn
                  size="small"
                  prepend-icon="tabler-device-floppy"
                  :loading="isSaving === selected"
                  :disabled="!isDirty(selected)"
                  @click="saveTemplate"
                >
                  Enregistrer
                </VBtn>
              </div>
            </div>

            <VDivider class="mb-5" />

            <!-- Variables disponibles -->
            <p class="text-xs font-weight-medium text-uppercase text-medium-emphasis mb-2 letter-spacing-wide">
              Variables disponibles — cliquez pour insérer
            </p>
            <div class="d-flex flex-wrap gap-1 mb-5">
              <VChip
                v-for="variable in currentVariables"
                :key="variable"
                size="small"
                label
                :color="actorConfig[selected].color"
                variant="tonal"
                class="cursor-pointer"
                @click="insertVariable(variable)"
              >
                <VTooltip
                  activator="parent"
                  location="top"
                >
                  {{ variableDescriptions[variable] ?? variable }}
                </VTooltip>
                {{ variable }}
              </VChip>
            </div>

            <!-- Éditeur + Prévisualisation côte à côte -->
            <VRow>
              <VCol
                cols="12"
                md="6"
              >
                <p class="text-sm font-weight-medium mb-2">
                  Message
                </p>
                <VTextarea
                  ref="textareaRef"
                  v-model="drafts[selected]"
                  :rows="16"
                  variant="outlined"
                  placeholder="Contenu du message..."
                  hide-details
                  style="font-family: monospace; font-size: 0.82rem;"
                />
              </VCol>

              <VCol
                cols="12"
                md="6"
              >
                <p class="text-sm font-weight-medium mb-2">
                  Prévisualisation
                  <span class="text-xs font-weight-regular text-medium-emphasis ms-1">(données fictives)</span>
                </p>
                <VSheet
                  rounded="lg"
                  class="pa-4"
                  color="grey-lighten-4"
                  style="
                    min-height: 390px;
                    white-space: pre-wrap;
                    font-size: 0.83rem;
                    line-height: 1.6;
                    font-family: inherit;
                    word-break: break-word;
                  "
                >
                  {{ previewText }}
                </VSheet>
              </VCol>
            </VRow>
          </div>

          <!-- Skeleton chargement -->
          <div
            v-else-if="isLoading"
            class="pa-5"
          >
            <VSkeleton-loader type="article" />
          </div>
        </VCol>
      </VRow>
    </VCard>

    <!-- ── Dialog : Confirmer réinitialisation ─────────────────────────── -->
    <VDialog
      v-model="resetDialog"
      max-width="440"
    >
      <VCard title="Réinitialiser le template ?">
        <VCardText>
          Le message pour <strong>{{ actorConfig[resetTarget ?? 'driver']?.label }}</strong>
          sera remplacé par le contenu par défaut. Vos modifications seront perdues.
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn
            variant="tonal"
            color="secondary"
            @click="resetDialog = false"
          >
            Annuler
          </VBtn>
          <VBtn
            color="error"
            :loading="isResetting === resetTarget"
            @click="doReset"
          >
            Réinitialiser
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
