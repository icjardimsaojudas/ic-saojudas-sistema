<template>
  <div class="page page--wide">
    <AdminTabs />
    <div class="list-item" style="border:none;padding:0 0 8px;">
      <h1 style="margin:0;">Casa <em>Pastoral</em></h1>
      <NuxtLink to="/admin/pastoral/perguntas" class="btn btn--ghost">Editar perguntas</NuxtLink>
    </div>
    <p class="muted">Fichas de atendimento. Quando as duas etapas são vinculadas, elas aparecem como uma única ficha.</p>

    <label style="display:flex;align-items:center;gap:8px;font-size:0.9rem;margin-bottom:16px;">
      <input v-model="onlyUnlinked" type="checkbox" style="width:auto;" /> Mostrar só não vinculadas
    </label>

    <div v-if="loading" class="muted">Carregando...</div>
    <div v-else-if="!filtered.length" class="empty">Nenhuma ficha encontrada.</div>

    <details v-for="(g, idx) in groups" :key="g.label" class="group" :open="idx === 0">
      <summary>{{ g.label }} <span class="count">{{ g.items.length }}</span></summary>
      <div class="group__body">
        <NuxtLink
          v-for="item in g.items"
          :key="item.id"
          :to="'/admin/pastoral/' + item.id"
          class="card card--clickable"
          style="display:block;"
        >
          <div class="list-item" style="border:none;padding:0;">
            <span>
              <strong>{{ item.attended_name || "Sem nome" }}</strong>
              <span v-if="item.merged" class="pastoral-type-tag" style="color:var(--green-700);">Ficha completa</span>
              <template v-else>
                <span class="pastoral-type-tag">Etapa {{ item.stage }}</span>
                <span class="pastoral-type-tag" style="color:#b64444;">Não vinculada</span>
              </template>
              <div class="muted">
                {{ item.attended_by ? "Atendido por " + item.attended_by + " · " : "" }}{{ formatDateTime(item.submitted_at) }}
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

// Junta pares vinculados em um único item de exibição; mantém as não vinculadas separadas.
const displayItems = computed(() => {
  const byId = new Map(submissions.value.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const items: any[] = [];

  for (const s of submissions.value) {
    if (seen.has(s.id)) continue;

    if (s.linked_id && byId.has(s.linked_id)) {
      const other = byId.get(s.linked_id);
      seen.add(s.id);
      seen.add(other.id);
      const stage1 = s.stage === 1 ? s : other;
      const stage2 = s.stage === 2 ? s : other;
      items.push({
        id: stage1.id, // a página [id] detecta o vínculo e monta a exibição completa
        attended_name: stage1.attended_name || stage2.attended_name || "",
        attended_by: stage2.attended_by || "",
        submitted_at: [s.submitted_at, other.submitted_at].sort().pop(),
        merged: true,
      });
    } else {
      seen.add(s.id);
      items.push({ ...s, merged: false });
    }
  }
  return items;
});

const filtered = computed(() =>
  onlyUnlinked.value ? displayItems.value.filter((s) => !s.merged) : displayItems.value
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
