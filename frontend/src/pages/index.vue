<script setup lang="ts">
import NewProjectModal from "~/features/properties/NewProjectModal.vue";
import PropertyCard from "~/features/properties/PropertyCard.vue";
import { useListPropertiesPropertiesGet } from "~/lib/api/generated/properties";

definePageMeta({ middleware: "auth" });

const showNewProject = ref(false);
const { data: properties, isPending, error } = useListPropertiesPropertiesGet();
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold">My Projects</h1>
      <button class="btn btn-primary" @click="showNewProject = true">New Project</button>
    </div>

    <span v-if="isPending" class="loading loading-spinner loading-lg" />

    <div v-else-if="error" class="alert alert-error">
      {{ error.message }}
    </div>

    <div v-else-if="properties?.length === 0" class="text-center py-20 text-base-content/50">
      <p class="text-lg">No projects yet.</p>
      <p class="text-sm mt-1">Create your first project to get started.</p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <PropertyCard
        v-for="property in properties"
        :key="property.id"
        :property="property"
      />
    </div>

    <NewProjectModal v-if="showNewProject" @close="showNewProject = false" />
  </div>
</template>
