<template>
  <div class="page page--wide">
    <div class="toolbar">
      <NuxtLink to="/admin" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>
    <h1>Celebrações</h1>

    <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert--success">{{ successMsg }}</div>

    <div class="card">
      <h2>{{ editingId ? "Editar celebração" : "Nova celebração" }}</h2>
      <div class="grid-2">
        <div class="field">
          <label>Data</label>
          <input v-model="form.date" type="date" />
        </div>
        <div class="field">
          <label>Horário</label>
          <input v-model="form.time" type="time" />
        </div>
      </div>
      <div class="grid-2">
        <div class="field">
          <label>Nome / rótulo</label>
          <input v-model="form.label" type="text" placeholder="Ex: Culto 10h" />
        </div>
        <div class="field">
          <label>Salão</label>
          <input v-model="form.salon" type="text" placeholder="Ex: Salão Principal" />
        </div>
      </div>
      <div class="field">
        <label><input v-model="form.is_special" type="checkbox" style="width:auto;margin-right:6px;" />Celebração temática/especial</label>
      </div>
      <div class="field">
        <label><input v-model="form.is_recurring" type="checkbox" style="width:auto;margin-right:6px;" />Celebração recorrente (aparece só 1x por semana para os ministérios)</label>
      </div>

      <label style="font-size:0.86rem;font-weight:600;color:var(--green-900);">Ministérios que participam</label>
      <p class="muted" style="margin-top:2px;">Todos vêm marcados por padrão — desmarque os que não se aplicam.</p>
      <div class="grid-2">
        <div v-for="m in allMinistries" :key="m.id" class="field" style="margin-bottom:6px;">
          <label style="display:flex;align-items:center;gap:8px;font-weight:400;">
            <input type="checkbox" style="width:auto;" v-model="selectedMinistryIds" :value="m.id" />
            {{ m.name }}
          </label>
        </div>
      </div>

      <button class="btn btn--primary" :disabled="saving" @click="save">
        {{ saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar celebração" }}
      </button>
      <button v-if="editingId" class="btn btn--ghost" style="margin-left:8px;" @click="cancelEdit">Cancelar</button>
    </div>

    <h2>Celebrações cadastradas</h2>
    <div v-if="loading" class="muted">Carregando...</div>
    <div v-for="c in celebrations" :key="c.id" class="card">
      <div class="list-item" style="border:none;padding:0;">
        <div>
          <strong>{{ c.label }}</strong>
          <span v-if="c.is_recurring" class="badge badge--done" style="margin-left:8px;">Recorrente</span>
          <span v-if="c.archived" class="badge badge--pending" style="margin-left:8px;">Arquivada</span>
          <div class="muted">{{ formatDate(c.date) }} · {{ c.time?.slice(0,5) }} · {{ c.salon }}</div>
        </div>
        <div>
          <button class="btn btn--ghost" @click="startEdit(c)">Editar</button>
          <button class="btn btn--danger" @click="remove(c.id)">Excluir</button>
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
const allMinistries = ref<any[]>([]);
const selectedMinistryIds = ref<string[]>([]);
const loading = ref(true);
const saving = ref(false);
const errorMsg = ref("");
const successMsg = ref("");
const editingId = ref<string | null>(null);

const emptyForm = () => ({
  date: "",
  time: "10:00",
  label: "",
  salon: "",
  campus: "IC. Jardim São Judas",
  is_special: false,
  is_recurring: false,
});

const form = reactive(emptyForm());

function formatDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function load() {
  loading.value = true;
  const token = await getToken();
  const [cels, mins] = await Promise.all([
    call("/celebrations?all=true", { token }),
    call("/ministries?all=true", { token }),
  ]);
  celebrations.value = cels;
  allMinistries.value = mins.filter((m: any) => m.active);
  if (!editingId.value) selectedMinistryIds.value = allMinistries.value.map((m: any) => m.id);
  loading.value = false;
}

async function startEdit(c: any) {
  editingId.value = c.id;
  form.date = c.date;
  form.time = c.time?.slice(0, 5);
  form.label = c.label;
  form.salon = c.salon || "";
  form.campus = c.campus;
  form.is_special = c.is_special;
  form.is_recurring = c.is_recurring;

  const token = await getToken();
  const status = await call(`/celebrations/${c.id}/status`, { token });
  selectedMinistryIds.value = status.map((s: any) => s.ministries?.id).filter(Boolean);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelEdit() {
  editingId.value = null;
  Object.assign(form, emptyForm());
  selectedMinistryIds.value = allMinistries.value.map((m) => m.id);
}

async function save() {
  errorMsg.value = "";
  if (!form.date || !form.time || !form.label) {
    errorMsg.value = "Preencha data, horário e nome.";
    return;
  }
  saving.value = true;
  try {
    const token = await getToken();
    const body = { ...form, ministry_ids: selectedMinistryIds.value };
    if (editingId.value) {
      await call(`/celebrations/${editingId.value}`, { method: "PUT", token, body });
      successMsg.value = "Celebração atualizada!";
    } else {
      await call("/celebrations", { method: "POST", token, body });
      successMsg.value = "Celebração criada!";
    }
    cancelEdit();
    await load();
  } catch (e: any) {
    errorMsg.value = "Erro ao salvar celebração.";
  } finally {
    saving.value = false;
  }
}

async function remove(id: string) {
  if (!confirm("Excluir esta celebração e todos os registros ligados a ela?")) return;
  const token = await getToken();
  await call(`/celebrations/${id}`, { method: "DELETE", token });
  await load();
}

const route = useRoute();
onMounted(async () => {
  await load();
  const editId = route.query.edit as string | undefined;
  if (editId) {
    const match = celebrations.value.find((c: any) => c.id === editId);
    if (match) startEdit(match);
  }
});
</script>
