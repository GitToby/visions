<script setup lang="ts">
// Types will be imported from ~/lib/api/generated/properties after running gen-api.
// Defined inline here to match the backend schema until generation occurs.

interface RoomResponse {
  id: string;
  label: string;
  image_url?: string | null;
  generation_jobs?: GenerationJobSummary[];
}

interface GenerationJobSummary {
  id: string;
  completed_at?: string | null;
}

interface PropertyResponse {
  id: string;
  name: string;
  address?: string | null;
  description?: string | null;
  rooms: RoomResponse[];
}

interface Props {
  property: PropertyResponse;
}

const props = defineProps<Props>();

const previewRooms = computed(() => props.property.rooms.slice(0, 4));
</script>

<template>
  <NuxtLink
    :to="`/properties/${property.id}`"
    class="card bg-base-100 shadow hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
  >
    <!-- Photo collage -->
    <div class="grid grid-cols-2 h-44 bg-base-200">
      <template v-if="previewRooms.length > 0">
        <div
          v-for="room in previewRooms"
          :key="room.id"
          class="overflow-hidden"
          :class="previewRooms.length === 1 ? 'col-span-2' : ''"
        >
          <img
            v-if="room.image_url"
            :src="room.image_url"
            :alt="room.label"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-base-300 flex items-center justify-center">
            <svg class="w-6 h-6 text-base-content/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </template>
      <div v-else class="col-span-2 flex items-center justify-center text-base-content/20">
        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </div>
    </div>

    <div class="card-body p-4 gap-2">
      <h2 class="card-title text-base leading-snug">{{ property.name }}</h2>
      <div class="flex items-center gap-2">
        <span class="badge badge-neutral badge-sm">
          {{ property.rooms.length }} {{ property.rooms.length === 1 ? "room" : "rooms" }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>
