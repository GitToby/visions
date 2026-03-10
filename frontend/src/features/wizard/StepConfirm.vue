<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import {
  useListJobsForPropertyGenerationPropertyPropertyIdGetQueryKey,
  useSubmitGenerationJobGenerationPost,
} from "~/lib/api/generated/generation";

// Types will be imported from ~/lib/api/generated/properties after running gen-api.

interface RoomResponse {
  id: string;
  label: string;
}

interface PropertyResponse {
  id: string;
  name: string;
  rooms: RoomResponse[];
}

interface Props {
  property: PropertyResponse;
  selectedStyles: string[];
  selectedRoomIds: string[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  back: [];
  done: [];
}>();

const queryClient = useQueryClient();

const roomIds = ref<string[]>([...props.selectedRoomIds]);

const selectedRooms = computed(() =>
  props.property.rooms.filter((r) => roomIds.value.includes(r.id))
);

const totalVisions = computed(
  () => selectedRooms.value.length * props.selectedStyles.length
);

const error = ref<string | null>(null);
const isGenerating = ref(false);

const { mutateAsync: submitJob } = useSubmitGenerationJobGenerationPost();

async function generate() {
  if (selectedRooms.value.length === 0 || props.selectedStyles.length === 0)
    return;
  isGenerating.value = true;
  error.value = null;

  try {
    const jobs = [];
    for (const room of selectedRooms.value) {
      for (const style of props.selectedStyles) {
        jobs.push(submitJob({ data: { room_id: room.id, style } }));
      }
    }
    await Promise.all(jobs);

    queryClient.invalidateQueries({
      queryKey: useListJobsForPropertyGenerationPropertyPropertyIdGetQueryKey(
        () => props.property.id
      ),
    });
    emit("done");
  } catch (err) {
    error.value = (err as { message?: string }).message ?? "Generation failed";
  } finally {
    isGenerating.value = false;
  }
}

function toggleRoom(id: string) {
  const idx = roomIds.value.indexOf(id);
  if (idx >= 0) {
    roomIds.value.splice(idx, 1);
  } else {
    roomIds.value.push(id);
  }
}
</script>

<template>
  <div>
    <div v-if="error" class="alert alert-error mb-4 text-sm">{{ error }}</div>

    <div class="grid grid-cols-2 gap-6 border border-base-content/10 rounded-lg p-4 mb-4">
      <!-- Rooms -->
      <div>
        <p class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-3">Rooms</p>
        <ul class="flex flex-col gap-2">
          <li
            v-for="room in property.rooms"
            :key="room.id"
            class="flex items-center gap-3"
          >
            <input
              type="checkbox"
              :checked="roomIds.includes(room.id)"
              class="checkbox checkbox-primary checkbox-sm"
              @change="toggleRoom(room.id)"
            />
            <span class="text-sm">{{ room.label }}</span>
          </li>
        </ul>
      </div>

      <!-- Styles -->
      <div>
        <p class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-3">Styles</p>
        <ul class="flex flex-col gap-2">
          <li v-for="style in selectedStyles" :key="style" class="text-sm capitalize">
            {{ style }}
          </li>
        </ul>
      </div>
    </div>

    <!-- Summary -->
    <div class="flex items-center gap-2 text-sm text-base-content/70 mb-6">
      <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
      This will create
      <strong>{{ totalVisions }} {{ totalVisions === 1 ? "vision" : "visions" }}</strong>
      ({{ selectedRooms.length }} {{ selectedRooms.length === 1 ? "room" : "rooms" }} × {{ selectedStyles.length }}
      {{ selectedStyles.length === 1 ? "style" : "styles" }})
    </div>

    <div class="flex justify-between pt-4 border-t border-base-content/10">
      <button class="btn btn-ghost gap-2" @click="emit('back')">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
      <button
        class="btn btn-primary gap-2"
        :disabled="isGenerating || totalVisions === 0"
        @click="generate"
      >
        <span v-if="isGenerating" class="loading loading-spinner loading-sm" />
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        Generate {{ totalVisions }} {{ totalVisions === 1 ? "Vision" : "Visions" }}
      </button>
    </div>
  </div>
</template>
