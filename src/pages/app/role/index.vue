<script setup>
import RoleCards from '@/views/apps/roles/RoleCards.vue';
</script>

<template>
  <VRow>
    <VCol cols="12">
      <h4 class="text-h4 mb-1">Rôles</h4>
      <p class="text-body-1 mb-0 text-medium-emphasis">
        Créez et gérez les rôles ainsi que leurs permissions d'accès.
      </p>
    </VCol>

    <VCol cols="12">
      <RoleCards />
    </VCol>
  </VRow>
</template>
