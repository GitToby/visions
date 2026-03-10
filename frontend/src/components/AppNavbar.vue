<script setup lang="ts">
const { user, signOut } = useAuth();
</script>

<template>
  <div class="navbar bg-base-300 px-4 shadow-md">
    <div class="flex-1">
      <NuxtLink to="/" class="text-lg font-bold tracking-tight text-base-content">
        Visions
      </NuxtLink>
    </div>
    <div class="flex-none gap-2">
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar placeholder">
          <div class="bg-primary text-primary-content w-9 rounded-full">
            <span class="text-sm">{{ user?.email?.[0]?.toUpperCase() ?? "?" }}</span>
          </div>
        </div>
        <ul
          tabindex="0"
          class="menu menu-sm dropdown-content bg-base-200 rounded-box z-10 mt-3 w-52 p-2 shadow"
        >
          <li class="menu-title text-xs opacity-60 truncate px-4 py-1">{{ user?.email }}</li>
          <li><button @click="signOut">Sign out</button></li>
        </ul>
      </div>
    </div>
  </div>
</template>
