<template>
  <div class="page page--wide">
    <div class="list-item" style="border:none;padding:0 0 8px;">
      <h1 style="margin:0;">Painel <em>Admin</em></h1>
      <div>
        <NuxtLink to="/admin/ministries" class="btn btn--ghost">Ministérios</NuxtLink>
        <NuxtLink to="/admin/celebrations" class="btn btn--primary" style="margin-left:8px;">
          Celebrações
        </NuxtLink>
      </div>
    </div>
    <p class="muted">Acompanhe quem já registrou as informações de cada celebração.</p>

    <div v-if="loading" class="muted">Carregando...</div>
    <div v-else-if="!celebrations.length" class="empty">
      Nenhuma celebração cadastrada. <NuxtLink to="/admin/celebrations">Criar a primeira.</NuxtLink>
    </div>

    <div v-for="c in celebrations" :key="c.id" class="card">
      <div class="list-item" style="border:none;padding:0;">
        <div>
          <strong>{{ c.label }}</strong>
          <span v-if="c.is_recurring" class="badge badge--done" style="margin-left:8px;">Recorrente</span>
          <div class="muted">{{ formatDate(c.date) }} · {{ c.time?.slice(0,5) }} · {{ c.salon || c.campus }}</div>
        </div>
        <div style="text-align:right;">
          <NuxtLink :to="`/admin/status/${c.id}`" class="btn btn--ghost">Ver status</NuxtLink>
          <NuxtLink :to="`/admin/report/${c.id}`" class="btn btn--ghost" style="margin-left:8px;">Relatório</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();
const celebrations = ref<any[]>([]);
const loading = ref(true);

function formatDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

onMounted(async () => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token || "";
    celebrations.value = await call("/celebrations?all=true", { token });
  } finally {
    loading.value = false;
  }
});
</script>
