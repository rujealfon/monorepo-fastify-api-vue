<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <main class="auth">
    <RouterView />
  </main>
</template>

<style scoped>
.auth {
  display: grid;
  place-items: center;
  min-height: 100vh;
}
</style>
