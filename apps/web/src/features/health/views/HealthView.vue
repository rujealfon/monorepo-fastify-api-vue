<script setup lang="ts">
import { useHealthQuery } from '../health.queries'

const { state, asyncStatus, refetch } = useHealthQuery()
</script>

<template>
  <main class="health">
    <h1>Health</h1>

    <p v-if="state.status === 'pending'" class="status">
      checking
    </p>
    <p v-else-if="state.status === 'error'" class="status down">
      unavailable
    </p>
    <p v-else class="status" :class="{ down: state.data !== 'ok' }">
      {{ state.data }}
    </p>

    <p v-if="state.status === 'error'" class="error">
      Health check failed
    </p>

    <button type="button" :disabled="asyncStatus === 'loading'" @click="refetch()">
      {{ asyncStatus === 'loading' ? 'Checking...' : 'Check again' }}
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
