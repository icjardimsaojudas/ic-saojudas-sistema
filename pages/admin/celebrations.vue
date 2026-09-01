<template>
  <div class="page page--wide">
    <h1>Celebrações</h1>

    <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert--success">{{ successMsg }}</div>

    <div class="card">
      <h2>Nova celebração</h2>
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
      <button class="btn btn--primary" :disabled="saving" @click="createCelebration">
        {{ saving ? "Salvando..." : "Criar celebração" }}
      </button>
    </div>

    <h2>Celebrações cadastradas</h2>
    <div v-if="loading" class="muted">Carregando...</div>
    <div v-for="c in celebrations" :key="c.id" class="card">
      <div class="list-item" style="border:none;padding:0;">
        <div>
          <strong>{{ c.label }}</strong>
          <div class="muted">{{ formatDate(c.date) }} · {{ c.time?.slice(0,5) }} · {{ c.salon }}</div>
        </div>
        <button class="btn btn--danger" @click="remove(c.id)">Excluir</button>
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
const saving = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

const form = reactive({
  date: "",
  time: "10:00",
  label: "",
  salon: "",
  campus: "IC. São Judas",
  is_special: false,
});

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
  celebrations.value = await call("/celebrations");
  loading.value = false;
}

async function createCelebration() {
  errorMsg.value = "";
  if (!form.date || !form.time || !form.label) {
    errorMsg.value = "Preencha data, horário e nome.";
    return;
  }
  saving.value = true;
  try {
    const token = await getToken();
    await call("/celebrations", { method: "POST", token, body: { ...form } });
    successMsg.value = "Celebração criada!";
    form.label = "";
    form.salon = "";
    form.is_special = false;
    await load();
  } catch (e: any) {
    errorMsg.value = "Erro ao criar celebração.";
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

onMounted(load);
</script>
