<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const customerNotifications = computed(() => [
  {
    type: t('New customer sign up'),
    typeKey: 'New customer sign up',
    email: true,
    app: true,
  },
  {
    type: t('Customer account password reset'),
    typeKey: 'Customer account password reset',
    email: true,
    app: true,
  },
  {
    type: t('Customer account invite'),
    typeKey: 'Customer account invite',
    email: false,
    app: false,
  },
])

const shippingNotifications = computed(() => [
  {
    type: t('Picked up'),
    typeKey: 'Picked up',
    email: true,
    app: true,
  },
  {
    type: t('Shipping update'),
    typeKey: 'Shipping update',
    email: true,
    app: false,
  },
  {
    type: t('Delivered'),
    typeKey: 'Delivered',
    email: false,
    app: true,
  },
])

const ordersNotification = computed(() => [
  {
    type: t('Order purchase'),
    typeKey: 'Order purchase',
    email: true,
    app: true,
  },
  {
    type: t('Order cancelled'),
    typeKey: 'Order cancelled',
    email: true,
    app: false,
  },
  {
    type: t('Order refund request'),
    typeKey: 'Order refund request',
    email: false,
    app: true,
  },
  {
    type: t('Order confirmation'),
    typeKey: 'Order confirmation',
    email: true,
    app: false,
  },
  {
    type: t('Payment error'),
    typeKey: 'Payment error',
    email: true,
    app: false,
  },
])
</script>

<template>
  <VCard class="mb-4">
    <VCardText>
      <h5 class="text-h5 mb-2">
        {{ $t('Customer') }}
      </h5>
      <VTable class="text-no-wrap mb-6 border rounded">
        <thead>
          <tr>
            <th scope="col">
              {{ $t('TYPE') }}
            </th>
            <th scope="col">
              {{ $t('EMAIL') }}
            </th>
            <th scope="col">
              {{ $t('APP') }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="notification in customerNotifications"
            :key="notification.typeKey"
          >
            <td
              width="400px"
              class="text-high-emphasis"
            >
              {{ notification.type }}
            </td>
            <td>
              <VCheckbox v-model="notification.email" />
            </td>

            <td>
              <VCheckbox v-model="notification.app" />
            </td>
          </tr>
        </tbody>
      </VTable>

      <h5 class="text-h5 mb-2">
        {{ $t('Orders') }}
      </h5>
      <VTable class="text-no-wrap mb-6 border rounded">
        <thead>
          <tr>
            <th scope="col">
              {{ $t('TYPE') }}
            </th>
            <th scope="col">
              {{ $t('EMAIL') }}
            </th>
            <th scope="col">
              {{ $t('APP') }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="notification in ordersNotification"
            :key="notification.typeKey"
          >
            <td
              width="400px"
              class="text-high-emphasis"
            >
              {{ notification.type }}
            </td>
            <td>
              <VCheckbox v-model="notification.email" />
            </td>

            <td>
              <VCheckbox v-model="notification.app" />
            </td>
          </tr>
        </tbody>
      </VTable>

      <h5 class="text-h5 mb-2">
        {{ $t('Shipping') }}
      </h5>
      <VTable class="text-no-wrap mb-6 border rounded">
        <thead>
          <tr>
            <th scope="col">
              {{ $t('TYPE') }}
            </th>
            <th scope="col">
              {{ $t('EMAIL') }}
            </th>
            <th scope="col">
              {{ $t('APP') }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="notification in shippingNotifications"
            :key="notification.typeKey"
          >
            <td
              width="400px"
              class="text-high-emphasis"
            >
              {{ notification.type }}
            </td>
            <td>
              <VCheckbox v-model="notification.email" />
            </td>

            <td>
              <VCheckbox v-model="notification.app" />
            </td>
          </tr>
        </tbody>
      </VTable>
    </VCardText>
  </VCard>

  <div class="d-flex justify-end gap-x-4">
    <VBtn
      variant="tonal"
      color="secondary"
    >
      {{ $t('Discard') }}
    </VBtn>
    <VBtn>{{ $t('Save Changes') }}</VBtn>
  </div>
</template>
