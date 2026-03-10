<script setup lang="ts">
import { useListStylesStylesGet } from "~/lib/api/generated/styles";

interface Props {
  selectedStyles: string[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  next: [styles: string[]];
  cancel: [];
}>();

const { data: styles, isPending } = useListStylesStylesGet();

const picked = ref<string[]>([...props.selectedStyles]);

function toggle(slug: string) {
  const idx = picked.value.indexOf(slug);
  if (idx >= 0) {
    picked.value.splice(idx, 1);
  } else {
    picked.value.push(slug);
  }
}

function previewImages(style: { image_urls: Record<string, string> }) {
  return Object.values(style.image_urls).slice(0, 3);
}
</script>

<template>
  <div>
    <span v-if="isPending" class="loading loading-spinner loading-lg" />

    <div v-else class="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-1">
      <button
        v-for="style in styles"
        :key="style.slug"
        class="card bg-base-200 text-left overflow-hidden border-2 transition-colors hover:border-primary/50"
        :class="picked.includes(style.slug) ? 'border-primary' : 'border-transparent'"
        @click="toggle(style.slug)"
      >
        <!-- Photo strip: 3 thumbnails -->
        <div class="grid grid-cols-3 h-24">
          <img
            v-for="(url, i) in previewImages(style)"
            :key="i"
            :src="url"
            :alt="style.name"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="p-3">
          <p class="font-semibold text-sm">{{ style.name }}</p>
          <p class="text-xs text-base-content/60 mt-0.5 line-clamp-2">{{ style.description }}</p>
        </div>
      </button>
    </div>

    <div class="flex justify-between mt-6 pt-4 border-t border-base-content/10">
      <button class="btn btn-ghost" @click="emit('cancel')">Cancel</button>
      <button
        class="btn btn-primary gap-2"
        :disabled="picked.length === 0"
        @click="emit('next', [...picked])"
      >
        Next
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>
