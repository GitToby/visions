<script setup lang="ts">
// Types will be imported from ~/lib/api/generated/properties after running gen-api.

interface GenerationJobSummary {
  id: string;
  completed_at?: string | null;
}

interface RoomResponse {
  id: string;
  label: string;
  image_url?: string | null;
  generation_jobs?: GenerationJobSummary[];
}

interface Props {
  room: RoomResponse;
  propertyId: string;
}

defineProps<Props>();

const emit = defineEmits<{
  upload: [roomId: string];
}>();

function jobCount(room: RoomResponse) {
  return room.generation_jobs?.filter((j) => j.completed_at).length ?? 0;
}
</script>

<template>
  <NuxtLink
    :to="`/properties/${propertyId}/rooms/${room.id}`"
    class="card bg-base-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
  >
    <div class="relative aspect-video">
      <img
        v-if="room.image_url"
        :src="room.image_url"
        :alt="room.label"
        class="w-full h-full object-cover"
      />
      <div
        v-else
        class="w-full h-full bg-base-200 flex flex-col items-center justify-center gap-2 text-base-content/30"
        @click.prevent="emit('upload', room.id)"
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span class="text-xs">Drop photo here</span>
      </div>

      <div class="absolute top-2 right-2 flex gap-1">
        <span v-if="jobCount(room) > 0" class="badge badge-success badge-sm">Done</span>
        <span v-if="jobCount(room) > 0" class="badge badge-neutral badge-sm">{{ jobCount(room) }}</span>
      </div>
    </div>

    <div class="px-3 py-2 flex items-center justify-between">
      <span class="text-sm font-medium truncate">{{ room.label }}</span>
      <button
        class="btn btn-ghost btn-xs"
        @click.prevent="emit('upload', room.id)"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </button>
    </div>
  </NuxtLink>
</template>
