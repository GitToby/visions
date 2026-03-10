<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import {
  useCreateRoomPropertiesPropertyIdRoomsPost,
  useGetPropertyPropertiesPropertyIdGetQueryKey,
  useUpdateRoomPropertiesPropertyIdRoomsRoomIdPut,
} from "~/lib/api/generated/properties";

interface Props {
  propertyId: string;
  roomId: string | null; // null = create new room
}

const props = defineProps<Props>();
const emit = defineEmits<{ close: [] }>();

const queryClient = useQueryClient();
const label = ref("");
const file = ref<File | null>(null);
const previewUrl = ref<string | null>(null);
const error = ref<string | null>(null);

const isEditing = computed(() => props.roomId !== null);

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const selected = target.files?.[0];
  if (!selected) return;
  file.value = selected;
  previewUrl.value = URL.createObjectURL(selected);
}

function invalidate() {
  queryClient.invalidateQueries({
    queryKey: useGetPropertyPropertiesPropertyIdGetQueryKey(
      () => props.propertyId
    ),
  });
}

const { mutate: createRoom, isPending: isCreating } =
  useCreateRoomPropertiesPropertyIdRoomsPost({
    mutation: {
      onSuccess: () => {
        invalidate();
        emit("close");
      },
      onError: (err) => {
        error.value =
          (err as { message?: string }).message ?? "Failed to create room";
      },
    },
  });

const { mutate: updateRoom, isPending: isUpdating } =
  useUpdateRoomPropertiesPropertyIdRoomsRoomIdPut({
    mutation: {
      onSuccess: () => {
        invalidate();
        emit("close");
      },
      onError: (err) => {
        error.value =
          (err as { message?: string }).message ?? "Failed to update room";
      },
    },
  });

const isPending = computed(() => isCreating.value || isUpdating.value);

function submit() {
  if (!isEditing.value && (!label.value.trim() || !file.value)) return;
  error.value = null;

  if (isEditing.value && props.roomId) {
    const formData = new FormData();
    if (label.value.trim()) formData.append("label", label.value.trim());
    if (file.value) formData.append("image", file.value);
    updateRoom({
      propertyId: props.propertyId,
      roomId: props.roomId,
      data: formData as unknown as { label?: string; image?: Blob },
    });
  } else {
    const formData = new FormData();
    formData.append("label", label.value.trim());
    formData.append("image", file.value!);
    createRoom({
      propertyId: props.propertyId,
      data: formData as unknown as { label: string; image: Blob },
    });
  }
}
</script>

<template>
  <dialog class="modal modal-open">
    <div class="modal-box max-w-md">
      <h3 class="font-bold text-lg mb-4">{{ isEditing ? "Update Room" : "Add Room" }}</h3>

      <div v-if="error" class="alert alert-error mb-4 text-sm">{{ error }}</div>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <label class="form-control">
          <div class="label"><span class="label-text">Room name</span></div>
          <input
            v-model="label"
            type="text"
            placeholder="e.g. Living Room"
            class="input input-bordered"
            autofocus
            :required="!isEditing"
          />
        </label>

        <div>
          <div class="label"><span class="label-text">Photo</span></div>
          <div
            class="border-2 border-dashed border-base-content/20 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors relative"
          >
            <input
              type="file"
              accept="image/*"
              class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              @change="onFileChange"
            />
            <img
              v-if="previewUrl"
              :src="previewUrl"
              alt="Preview"
              class="mx-auto max-h-40 rounded object-cover mb-2"
            />
            <div v-else class="py-4 text-base-content/40">
              <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p class="text-sm">Click or drag to upload</p>
            </div>
          </div>
        </div>

        <div class="modal-action mt-0">
          <button type="button" class="btn btn-ghost" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="isPending">
            <span v-if="isPending" class="loading loading-spinner loading-sm" />
            {{ isEditing ? "Save" : "Add Room" }}
          </button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="emit('close')" />
  </dialog>
</template>
