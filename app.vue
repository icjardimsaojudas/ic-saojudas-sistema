<template>
  <div>
    <header class="topbar">
      <NuxtLink to="/" class="topbar__brand">
        <img src="/logo-verde.png" alt="IC. Jardim São Judas" class="topbar__logo" />
        <span>IC. Jardim São Judas</span>
      </NuxtLink>
      <nav class="topbar__nav">
        <NuxtLink to="/">Responder</NuxtLink>
        <NuxtLink to="/organograma">Organograma</NuxtLink>
        <NuxtLink to="/admin">Administrador</NuxtLink>
      </nav>
    </header>
    <NuxtPage />
  </div>
</template>
