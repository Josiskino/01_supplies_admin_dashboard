<script setup>
import { useI18n } from 'vue-i18n'
import RoleCards from '@/views/apps/roles/RoleCards.vue';
import UserList from '@/views/apps/roles/UserList.vue';

const { t } = useI18n()
</script>

<template>
  <VRow>
    <VCol cols="12">
      <h4 class="text-h4 mb-1">
        {{ $t('Roles List') }}
      </h4>
      <p class="text-body-1 mb-0">
        {{ $t('A role provided access to predefined menus and features so that depending on assigned role an administrator can have access to what he need') }}
      </p>
    </VCol>

    <!-- 👉 Roles Cards -->
    <VCol cols="12">
      <RoleCards />
    </VCol>

    <VCol cols="12">
      <h4 class="text-h4 mb-1 mt-6">
        {{ $t('Total users with their roles') }}
      </h4>
      <p class="text-body-1 mb-0">
        {{ $t("Find all of your company's administrator accounts and their associate roles.") }}
      </p>
    </VCol>

    <VCol cols="12">
      <!-- 👉 User List  -->
      <UserList />
    </VCol>
  </VRow>
</template>
