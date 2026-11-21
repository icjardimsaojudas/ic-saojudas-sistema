<template>
  <div>
    <!-- Área administrativa: menu lateral (computador) / barra rolável (celular) -->
    <div v-if="isAdminArea" class="admin-shell">
      <aside class="sidebar">
        <NuxtLink to="/admin" class="brand brand--light">
          <span class="brand__logo-wrap"><img src="/logo-verde.png" alt="" class="brand__logo" /></span>
          <span class="brand__text"><small>IC. JARDIM</small><strong>São Judas</strong></span>
        </NuxtLink>
        <nav class="sidebar__nav" aria-label="Administração">
          <NuxtLink v-for="item in adminNav" :key="item.to" :to="item.to" class="sidebar__link" :class="{ 'is-active': isActive(item.to) }">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="item.icon" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>
        <div class="sidebar__footer">
          <NuxtLink to="/" class="sidebar__link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
            <span>Voltar ao site</span>
          </NuxtLink>
        </div>
      </aside>
      <main class="admin-main">
        <NuxtPage />
      </main>
    </div>

    <!-- Área pública -->
    <template v-else>
      <header class="topbar">
        <NuxtLink to="/" class="brand">
          <img src="/logo-verde.png" alt="" class="brand__logo" />
          <span class="brand__text"><small>IC. JARDIM</small><strong>São Judas</strong></span>
        </NuxtLink>
        <button class="icon-btn topbar__toggle" :aria-expanded="menuOpen" aria-label="Abrir menu" @click="menuOpen = !menuOpen">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
        </button>
        <nav class="topbar__nav" :class="{ 'is-open': menuOpen }" aria-label="Principal">
          <NuxtLink to="/" @click="menuOpen = false">Responder</NuxtLink>
          <NuxtLink to="/casa-pastoral" @click="menuOpen = false">Casa Pastoral</NuxtLink>
          <NuxtLink to="/organograma" @click="menuOpen = false">Organograma</NuxtLink>
          <NuxtLink to="/admin" class="topbar__admin" @click="menuOpen = false">Administrador</NuxtLink>
        </nav>
      </header>
      <NuxtPage />
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const menuOpen = ref(false);

const isAdminArea = computed(() => route.path.startsWith("/admin") && !route.path.startsWith("/admin/login"));

const adminNav = [
  { to: "/admin", label: "Painel", icon: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>' },
  { to: "/admin/dashboard", label: "Dashboard", icon: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>' },
  { to: "/admin/celebrations", label: "Celebrações", icon: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>' },
  { to: "/admin/ministries", label: "Ministérios", icon: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4a3 3 0 0 1 0 6M18 14c2 .6 3 3 3 6"/>' },
  { to: "/admin/pastoral", label: "Casa Pastoral", icon: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>' },
  { to: "/admin/organograma", label: "Organograma", icon: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>' },
];

function isActive(path: string) {
  if (path === "/admin") return route.path === "/admin" || route.path.startsWith("/admin/status") || route.path.startsWith("/admin/report");
  return route.path.startsWith(path);
}

watch(() => route.path, () => (menuOpen.value = false));
</script>
