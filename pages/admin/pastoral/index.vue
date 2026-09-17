<template>
  <div class="page page--wide">
    <AdminTabs />
    <div class="list-item" style="border:none;padding:0 0 8px;">
      <h1 style="margin:0;">Casa <em>Pastoral</em></h1>
      <NuxtLink to="/admin/pastoral/perguntas" class="btn btn--ghost">Editar perguntas</NuxtLink>
    </div>
    <p class="muted">Fichas de atendimento respondidas. Cada etapa é enviada separadamente — vincule as fichas correspondentes.</p>

    <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;margin-bottom:16px;">
      <input v-model="onlyUnlinked" type="checkbox" style="width:auto;" /> Mostrar só não vinculadas
    </label>

    <div v-if="loading" class="muted">Carregando...</div>
    <div v-else-if="!filtered.length" class="empty">Nenhuma ficha encontrada.</div>

    <details v-for="(g, idx) in groups" :key="g.label" class="group" :open="idx === 0">
      <summary>{{ g.label }} <span class="count">{{ g.items.length }}</span></summary>
      <div class="group__body">
        <NuxtLink
          v-for="s in g.items"
          :key="s.id"
          :to="'/admin/pastoral/' + s.id"
          class="card card--clickable"
          style="display:block;"
        >
          <div class="list-item" style="border:none;padding:0;">
            <span>
              <strong>{{ s.attended_name || "Sem nome" }}</strong>
              <span class="pastoral-type-tag">Etapa {{ s.stage }}</span>
              <span class="pastoral-type-tag" :style="s.linked_id ? 'color:var(--green-700);' : 'color:#b64444;'">
                {{ s.linked_id ? "Vinculada" : "Não vinculada" }}
              </span>
              <div class="muted">
                {{ s.stage === 2 ? "Atendido por " + (s.attended_by || "—") + " · " : "" }}{{ formatDateTime(s.submitted_at) }}
              </div>
            </span>
          </div>
        </NuxtLink>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();

const submissions = ref<any[]>([]);
const loading = ref(true);
const onlyUnlinked = ref(false);

function monthLabel(ts: string) {
  if (!ts) return "Sem data";
  const label = new Date(ts).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDateTime(ts: string) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

const filtered = computed(() =>
  onlyUnlinked.value ? submissions.value.filter((s) => !s.linked_id) : submissions.value
);

const groups = computed(() => {
  const map = new Map<string, any[]>();
  for (const s of filtered.value) {
    const key = monthLabel(s.submitted_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
});

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function load() {
  loading.value = true;
  const token = await getToken();
  submissions.value = await call("/pastoral-submissions", { token });
  loading.value = false;
}

onMounted(load);
</script>
