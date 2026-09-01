<template>
  <div class="page page--wide">
    <h1>Dossiê da <em>Celebração</em></h1>
    <p v-if="celebration" class="muted">{{ celebration.label }} · {{ formatDate(celebration.date) }} · {{ celebration.salon }}</p>

    <div v-if="loading" class="muted">Carregando...</div>
    <div v-else-if="!submissions.length" class="empty">Nenhum registro enviado ainda.</div>

    <div v-for="s in submissions" :key="s.id" class="card">
      <div class="list-item" style="border:none;padding:0 0 8px;">
        <strong>{{ s.ministries?.name }}</strong>
        <span class="muted">{{ s.respondent_name }} · {{ s.respondent_contact }}</span>
      </div>
      <div class="grid-2">
        <div v-for="(value, key) in s.data" :key="key">
          <span class="muted">{{ key }}:</span> <strong>{{ value }}</strong>
        </div>
      </div>
    </div>

    <NuxtLink to="/admin" class="btn btn--ghost">Voltar</NuxtLink>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();
const route = useRoute();

const celebration = ref<any>(null);
const submissions = ref<any[]>([]);
const loading = ref(true);

function formatDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

onMounted(async () => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || "";
  const id = route.params.id as string;
  const res = await call<{ celebration: any; submissions: any[] }>(`/celebrations/${id}/report`, { token });
  celebration.value = res.celebration;
  submissions.value = res.submissions;
  loading.value = false;
});
</script>
