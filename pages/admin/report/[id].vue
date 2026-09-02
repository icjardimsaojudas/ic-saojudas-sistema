<template>
  <div class="page page--wide">
    <div class="toolbar">
      <NuxtLink to="/admin" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>
    <div class="list-item" style="border:none;padding:0 0 8px;">
      <h1 style="margin:0;">Relatório da <em>Celebração</em></h1>
      <button class="btn btn--gold" :disabled="!submissions.length" @click="downloadExcel">
        Baixar Excel
      </button>
    </div>
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

async function downloadExcel() {
  const XLSX = await import("xlsx");
  const rows = submissions.value.map((s) => ({
    Ministério: s.ministries?.name || "",
    Respondente: s.respondent_name,
    Contato: s.respondent_contact,
    ...s.data,
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Relatório");
  const fileName = `relatorio-${celebration.value?.label || "celebracao"}-${celebration.value?.date || ""}.xlsx`;
  XLSX.writeFile(book, fileName);
}
</script>
