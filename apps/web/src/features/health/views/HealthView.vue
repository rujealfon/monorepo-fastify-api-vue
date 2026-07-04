<script setup lang="ts">
import { useHealth } from '@/features/health/composables/useHealth'

const { status, error, loading, checkHealth } = useHealth()
</script>

<template>
  <main class="health">
    <h1>Health</h1>

    <p class="status" :class="{ down: status === 'unavailable', checking: status === 'checking' }">
      {{ status }}
    </p>

    <p v-if="error" class="error">
      {{ error }}
    </p>

    <button type="button" :disabled="loading" @click="checkHealth">
      {{ loading ? 'Checking...' : 'Check again' }}
    </button>
  </main>
</template>

<style scoped>
.health {
  display: grid;
  gap: 1rem;
}

h1 {
  font-size: 2rem;
  line-height: 1.1;
}

.status {
  width: fit-content;
  min-width: 6rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: hsla(160, 100%, 37%, 1);
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
}

.status.down,
.error {
  color: #c2410c;
}

.status.checking {
  color: var(--color-text);
}

button {
  width: fit-content;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}

button:disabled {
  cursor: wait;
  opacity: 0.7;
}
</style>
