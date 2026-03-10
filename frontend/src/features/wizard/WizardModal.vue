<script setup lang="ts">
import StepConfirm from "./StepConfirm.vue";
import StepStyles from "./StepStyles.vue";

// Types will be imported from ~/lib/api/generated/properties after running gen-api.

interface RoomResponse {
  id: string;
  label: string;
  image_url?: string | null;
  generation_jobs?: { id: string; completed_at?: string | null }[];
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
  initialRoomId?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

const step = ref<1 | 2>(1);
const selectedStyles = ref<string[]>([]);

// Pre-check all rooms; if initialRoomId is set, only that room
const selectedRoomIds = ref<string[]>(
  props.initialRoomId
    ? [props.initialRoomId]
    : props.property.rooms.map((r) => r.id)
);

function onStylesNext(styles: string[]) {
  selectedStyles.value = styles;
  step.value = 2;
}

const stepTitle = computed(() =>
  step.value === 1 ? "Choose styles" : "Confirm & generate"
);
</script>

<template>
  <dialog class="modal modal-open">
    <div class="modal-box max-w-2xl w-full">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h3 class="font-bold text-lg flex items-center gap-2">
          <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
          {{ stepTitle }}
        </h3>
        <button class="btn btn-ghost btn-sm btn-circle" @click="emit('close')">✕</button>
      </div>

      <!-- Step indicator -->
      <ul class="steps w-full mb-8">
        <li class="step" :class="step >= 1 ? 'step-primary' : ''">Choose styles</li>
        <li class="step" :class="step >= 2 ? 'step-primary' : ''">Confirm</li>
      </ul>

      <!-- Step content -->
      <StepStyles
        v-if="step === 1"
        :selected-styles="selectedStyles"
        @next="onStylesNext"
        @cancel="emit('close')"
      />

      <StepConfirm
        v-else
        :property="property"
        :selected-styles="selectedStyles"
        :selected-room-ids="selectedRoomIds"
        @back="step = 1"
        @done="emit('close')"
      />
    </div>
    <div class="modal-backdrop" @click="emit('close')" />
  </dialog>
</template>
