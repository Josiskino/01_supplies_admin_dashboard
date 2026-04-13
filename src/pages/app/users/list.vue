<script setup>
import UserList from '@/views/apps/roles/UserList.vue';

definePage({
  meta: {
    action: 'view',
    subject: 'user',
  },
})
</script>

<template>
  <UserList />
</template>
