<script setup lang="ts">
import RoomCard from "~/features/rooms/RoomCard.vue";
import RoomUploadModal from "~/features/rooms/RoomUploadModal.vue";
import WizardModal from "~/features/wizard/WizardModal.vue";
import { useGetPropertyPropertiesPropertyIdGet } from "~/lib/api/generated/properties";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const propertyId = computed(() => route.params.id as string);

const {
  data: property,
  isPending,
  error,
} = useGetPropertyPropertiesPropertyIdGet(() => propertyId.value);

const showWizard = ref(false);
const showUpload = ref(false);
const uploadRoomId = ref<string | null>(null);

function openUpload(roomId?: string) {
  uploadRoomId.value = roomId ?? null;
  showUpload.value = true;
}
</script>

<template>
  <div>
    <div class="text-sm breadcrumbs mb-4">
      <ul>
        <li><NuxtLink to="/">My Projects</NuxtLink></li>
        <li>{{ property?.name ?? "..." }}</li>
      </ul>
    </div>

    <span v-if="isPending" class="loading loading-spinner loading-lg" />
    <div v-else-if="error" class="alert alert-error">{{ error.message }}</div>

    <template v-else-if="property">
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">{{ property.name }}</h1>
          <p v-if="property.address" class="text-base-content/60 text-sm flex items-center gap-1 mt-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ property.address }}
          </p>
          <p v-if="property.description" class="text-base-content/70 text-sm mt-2 max-w-lg whitespace-pre-line">
            {{ property.description }}
          </p>
        </div>
        <button class="btn btn-primary btn-sm gap-2 shrink-0" @click="showWizard = true">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          Reimagine Property
        </button>
      </div>

      <h2 class="text-base font-semibold text-base-content/70 uppercase tracking-wider mb-4">Rooms</h2>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <RoomCard
          v-for="room in property.rooms"
          :key="room.id"
          :room="room"
          :property-id="property.id"
          @upload="openUpload(room.id)"
        />

        <!-- Add room card -->
        <button
          class="card bg-base-100 border-2 border-dashed border-base-content/20 hover:border-primary/50 transition-colors min-h-32 flex flex-col items-center justify-center gap-2 text-base-content/40 hover:text-primary/70"
          @click="openUpload()"
        >
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
          </svg>
          <span class="text-sm">Add room</span>
        </button>
      </div>
    </template>

    <WizardModal
      v-if="showWizard && property"
      :property="property"
      @close="showWizard = false"
    />

    <RoomUploadModal
      v-if="showUpload && property"
      :property-id="property.id"
      :room-id="uploadRoomId"
      @close="showUpload = false"
    />
  </div>
</template>
