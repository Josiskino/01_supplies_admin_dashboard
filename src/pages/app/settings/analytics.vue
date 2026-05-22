<script setup>
import { onMounted, ref } from 'vue'
import { useAnalytics } from '@/composables/useAnalytics'

definePage({
  meta: {
    action: 'manage',
    subject: 'analytics-settings',
  },
})

const { fetchSettings, updateSettings, isLoading, error } = useAnalytics()

const form = ref({
  churn_threshold_days: 60,
  lookback_days: 180,
  min_orders_threshold: 3,
  variability_cv_threshold: 0.6,
  min_orders_for_cv: 4,
  cache_ttl_minutes: 60,
})

const updatedAt = ref(null)
const updatedBy = ref(null)
const saving = ref(false)
const successMessage = ref('')

const load = async () => {
  const data = await fetchSettings()
  if (data?.settings) {
    form.value = { ...form.value, ...data.settings }
    updatedAt.value = data.updated_at
    updatedBy.value = data.updated_by
  }
}

const save = async () => {
  saving.value = true
  successMessage.value = ''
  const data = await updateSettings(form.value)
  if (data) {
    successMessage.value = 'Paramètres enregistrés.'
    updatedAt.value = data.updated_at
    updatedBy.value = data.updated_by
    setTimeout(() => { successMessage.value = '' }, 3000)
  }
  saving.value = false
}

const formatDate = v => v ? new Date(v).toLocaleString('fr-FR') : '—'

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-4">
      <h1 class="text-h4 font-weight-bold mb-1">
        Paramètres Analytics
      </h1>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Réglez les seuils utilisés pour détecter les clients/partenaires à risque (churn) et les patterns variables.
      </p>
    </div>

    <VCard
      rounded="lg"
      :loading="isLoading || saving"
    >
      <VCardText>
        <VAlert
          v-if="error"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ error }}
        </VAlert>

        <VAlert
          v-if="successMessage"
          type="success"
          variant="tonal"
          class="mb-4"
        >
          {{ successMessage }}
        </VAlert>

        <VRow>
          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              v-model.number="form.churn_threshold_days"
              type="number"
              label="Seuil de churn (jours)"
              hint="Au-delà de ce nombre de jours sans commande, un client/partenaire ex-régulier est considéré comme churné."
              persistent-hint
              min="1"
              max="3650"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              v-model.number="form.lookback_days"
              type="number"
              label="Fenêtre d'analyse (jours)"
              hint="Durée historique sur laquelle on évalue la régularité d'un client/partenaire."
              persistent-hint
              min="7"
              max="3650"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              v-model.number="form.min_orders_threshold"
              type="number"
              label="Min. commandes pour 'régulier'"
              hint="Nombre minimum de commandes sur la fenêtre d'analyse pour qualifier un client de régulier."
              persistent-hint
              min="1"
              max="1000"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              v-model.number="form.variability_cv_threshold"
              type="number"
              step="0.1"
              label="Seuil CV (variabilité)"
              hint="Coefficient de variation au-dessus duquel un client est considéré comme erratique (0.6 par défaut)."
              persistent-hint
              min="0"
              max="5"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              v-model.number="form.min_orders_for_cv"
              type="number"
              label="Min. commandes pour calcul CV"
              hint="En dessous de ce nombre, le coefficient de variation n'est pas calculé (statistiquement non significatif)."
              persistent-hint
              min="3"
              max="1000"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              v-model.number="form.cache_ttl_minutes"
              type="number"
              label="TTL du cache analytics (minutes)"
              hint="Durée de mise en cache des résultats. 0 = désactivé. 60 par défaut."
              persistent-hint
              min="0"
              max="1440"
            />
          </VCol>
        </VRow>

        <VDivider class="my-4" />

        <div class="d-flex flex-wrap align-center justify-space-between gap-3">
          <div class="text-caption text-medium-emphasis">
            Dernière modification : <strong>{{ formatDate(updatedAt) }}</strong>
            <span v-if="updatedBy"> par <strong>{{ updatedBy.name }}</strong></span>
          </div>

          <VBtn
            color="primary"
            prepend-icon="tabler-device-floppy"
            :loading="saving"
            @click="save"
          >
            Enregistrer
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </div>
</template>
