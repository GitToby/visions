<script setup lang="ts">
import { useQueryClient } from "@tanstack/vue-query";
import {
  useCreatePropertyPropertiesPost,
  useListPropertiesPropertiesGetQueryKey,
} from "~/lib/api/generated/properties";

const emit = defineEmits<{ close: [] }>();

const queryClient = useQueryClient();

const name = ref("");
const address = ref("");
const description = ref("");
const error = ref<string | null>(null);

const { mutate: createProperty, isPending } = useCreatePropertyPropertiesPost({
  mutation: {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: useListPropertiesPropertiesGetQueryKey(),
      });
      emit("close");
    },
    onError: (err) => {
      error.value =
        (err as { message?: string }).message ?? "Something went wrong";
    },
  },
});

function submit() {
  if (!name.value.trim()) return;
  error.value = null;
  createProperty({
    data: {
      name: name.value.trim(),
      address: address.value.trim() || undefined,
      description: description.value.trim() || undefined,
    },
  });
}
</script>

<template>
  <dialog class="modal modal-open">
    <div class="modal-box max-w-md">
      <h3 class="font-bold text-lg mb-4">New Project</h3>

      <div v-if="error" class="alert alert-error mb-4 text-sm">{{ error }}</div>

      <form class="flex flex-col gap-3" @submit.prevent="submit">
        <label class="form-control">
          <div class="label"><span class="label-text">Project name</span></div>
          <input
            v-model="name"
            type="text"
            placeholder="e.g. Beach Cottage Reno"
            class="input input-bordered"
            autofocus
            required
          />
        </label>

        <label class="form-control">
          <div class="label"><span class="label-text">Address <span class="opacity-50">(optional)</span></span></div>
          <input
            v-model="address"
            type="text"
            placeholder="e.g. 12 Ocean View Road"
            class="input input-bordered"
          />
        </label>

        <label class="form-control">
          <div class="label"><span class="label-text">Description <span class="opacity-50">(optional)</span></span></div>
          <textarea
            v-model="description"
            class="textarea textarea-bordered"
            rows="3"
            placeholder="Notes about the project..."
          />
        </label>

        <div class="modal-action mt-2">
          <button type="button" class="btn btn-ghost" @click="emit('close')">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="isPending || !name.trim()">
            <span v-if="isPending" class="loading loading-spinner loading-sm" />
            Create Project
          </button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="emit('close')" />
  </dialog>
</template>
