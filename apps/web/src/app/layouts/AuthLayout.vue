<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <main class="auth-layout">
    <div class="auth-card">
      <RouterLink to="/" class="auth-logo">
        <img alt="Vue logo" src="@/assets/images/logo.svg" width="64" height="64">
      </RouterLink>

      <RouterView />
    </div>
  </main>
</template>

<style scoped>
.auth-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem 1rem;
}

.auth-card {
  width: 100%;
  max-width: 24rem;
  padding: 2rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-background-soft);
}

.auth-logo {
  display: block;
  margin: 0 auto 1.5rem;
  width: fit-content;
}
</style>
