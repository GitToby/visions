<script setup lang="ts">
import WizardModal from "~/features/wizard/WizardModal.vue";
import { useListJobsForPropertyGenerationPropertyPropertyIdGet } from "~/lib/api/generated/generation";
import { useGetPropertyPropertiesPropertyIdGet } from "~/lib/api/generated/properties";

definePageMeta({ middleware: "auth" });

const route = useRoute();
const propertyId = computed(() => route.params.id as string);
const roomId = computed(() => route.params.roomId as string);

const { data: property } = useGetPropertyPropertiesPropertyIdGet(
  () => propertyId.value
);

const room = computed(() =>
  property.value?.rooms.find((r) => r.id === roomId.value)
);

const { data: jobs } = useListJobsForPropertyGenerationPropertyPropertyIdGet(
  () => propertyId.value,
  {
    query: {
      refetchInterval: (query) => {
        const data = query.state.data;
        if (!data) return false;
        return data.some((j) => !j.completed_at && !j.error_message)
          ? 5000
          : false;
      },
    },
  }
);

const roomJobs = computed(() =>
  (jobs.value ?? []).filter((j) => j.room_id === roomId.value && j.completed_at)
);

const selectedJobId = ref<string | null>(null);
const selectedJob = computed(
  () =>
    roomJobs.value.find((j) => j.id === selectedJobId.value) ??
    roomJobs.value[0] ??
    null
);

const showWizard = ref(false);
</script>

<template>
  <div>
    <div class="text-sm breadcrumbs mb-4">
      <ul>
        <li><NuxtLink to="/">My Projects</NuxtLink></li>
        <li>
          <NuxtLink :to="`/properties/${propertyId}`">{{ property?.name ?? "..." }}</NuxtLink>
        </li>
        <li>{{ room?.label ?? "..." }}</li>
      </ul>
    </div>

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ room?.label }}</h1>
      <button class="btn btn-primary btn-sm gap-2" @click="showWizard = true">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        Reimagine Room
      </button>
    </div>

    <!-- Comparison view -->
    <div class="card bg-base-100 overflow-hidden mb-4">
      <div class="grid grid-cols-2 min-h-64">
        <!-- Original -->
        <div class="relative">
          <img
            v-if="room?.image_url"
            :src="room.image_url"
            :alt="room.label"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-base-200 flex items-center justify-center">
            <span class="text-base-content/30 text-sm">No photo</span>
          </div>
          <span class="absolute bottom-2 left-2 badge badge-neutral text-xs">Original</span>
        </div>

        <!-- Selected generation -->
        <div class="relative border-l border-base-200">
          <img
            v-if="selectedJob?.image_url"
            :src="selectedJob.image_url"
            :alt="selectedJob.style"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-base-200 flex items-center justify-center">
            <span class="text-base-content/30 text-sm">
              {{ roomJobs.length === 0 ? "No generations yet" : "Select a generation below" }}
            </span>
          </div>
          <span v-if="selectedJob" class="absolute bottom-2 left-2 badge badge-primary text-xs capitalize">
            {{ selectedJob.style }}
          </span>
          <button
            v-if="selectedJob"
            class="absolute bottom-2 right-2 text-xs text-primary hover:underline flex items-center gap-1"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Continue from here
          </button>
        </div>
      </div>
    </div>

    <!-- Generation thumbnails -->
    <div v-if="roomJobs.length > 0">
      <h2 class="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">Visions</h2>
      <div class="flex gap-3 overflow-x-auto pb-2">
        <button
          v-for="job in roomJobs"
          :key="job.id"
          class="shrink-0 flex flex-col items-center gap-1"
          @click="selectedJobId = job.id"
        >
          <div
            class="w-28 h-20 rounded-lg overflow-hidden border-2 transition-colors"
            :class="selectedJob?.id === job.id ? 'border-primary' : 'border-transparent'"
          >
            <img
              v-if="job.image_url"
              :src="job.image_url"
              :alt="job.style"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full bg-base-200" />
          </div>
          <span class="text-xs text-base-content/60 capitalize">{{ job.style }}</span>
        </button>
      </div>
    </div>

    <WizardModal
      v-if="showWizard && property"
      :property="property"
      :initial-room-id="roomId"
      @close="showWizard = false"
    />
  </div>
</template>
