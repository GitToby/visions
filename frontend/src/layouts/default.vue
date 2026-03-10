<script setup lang="ts">
const { session } = useAuth();
</script>

<template>
  <div class="min-h-screen bg-base-200">
    <AppNavbar v-if="session" />
    <main class="container mx-auto px-4 py-8 max-w-6xl">
      <slot />
    </main>
  </div>
</template>
