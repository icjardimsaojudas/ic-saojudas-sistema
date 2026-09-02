<template>
  <div class="page page--wide">
    <div class="toolbar">
      <NuxtLink to="/admin" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>
    <h1>Ministérios</h1>

    <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert--success">{{ successMsg }}</div>

    <div class="card">
      <h2>Novo ministério</h2>
      <div class="field">
        <label>Nome do ministério</label>
        <input v-model="form.name" type="text" placeholder="Ex: Comunicação" />
      </div>

      <label style="font-size:0.86rem;font-weight:600;color:var(--orange-900);">Campos do formulário</label>
      <div v-for="(f, i) in form.fields" :key="i" class="grid-2" style="align-items:end;">
        <div class="field">
          <label>Rótulo (o que o voluntário vê)</label>
          <input v-model="f.label" type="text" placeholder="Ex: Voluntários presentes" />
        </div>
        <div class="field" style="display:flex;gap:8px;">
          <input v-model="f.key" type="text" placeholder="chave_sem_espaco" style="flex:1;" />
          <button class="btn btn--ghost" @click="form.fields.splice(i,1)">Remover</button>
        </div>
      </div>
      <button class="btn btn--ghost" @click="addField">+ Adicionar campo</button>
      <br /><br />
      <button class="btn btn--primary" :disabled="saving" @click="createMinistry">
        {{ saving ? "Salvando..." : "Criar ministério" }}
      </button>
    </div>

    <h2>Ministérios cadastrados</h2>
    <div v-if="loading" class="muted">Carregando...</div>
    <div v-for="m in ministries" :key="m.id" class="card">
      <div class="list-item" style="border:none;padding:0;">
        <div>
          <strong>{{ m.name }}</strong>
          <span class="badge" :class="m.active ? 'badge--done' : 'badge--pending'" style="margin-left:8px;">
            {{ m.active ? "Ativo" : "Inativo" }}
          </span>
          <div class="muted">{{ (m.fields || []).map((f:any) => f.label).join(", ") }}</div>
        </div>
        <div>
          <button v-if="m.active" class="btn btn--ghost" @click="toggleActive(m, false)">Desativar</button>
          <button v-else class="btn btn--ghost" @click="toggleActive(m, true)">Ativar</button>
          <button class="btn btn--danger" style="margin-left:8px;" @click="remove(m.id)">Excluir</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();

const ministries = ref<any[]>([]);
const loading = ref(true);
const saving = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

const form = reactive<{ name: string; fields: { key: string; label: string; type: string; default: number }[] }>({
  name: "",
  fields: [{ key: "presentes", label: "Voluntários presentes", type: "number", default: 0 }],
});

function addField() {
  form.fields.push({ key: "", label: "", type: "number", default: 0 });
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function load() {
  loading.value = true;
  const token = await getToken();
  ministries.value = await call("/ministries?all=true", { token });
  loading.value = false;
}

async function createMinistry() {
  errorMsg.value = "";
  if (!form.name || !form.fields.length || form.fields.some((f) => !f.key || !f.label)) {
    errorMsg.value = "Preencha o nome e todos os campos (chave e rótulo).";
    return;
  }
  saving.value = true;
  try {
    const token = await getToken();
    await call("/ministries", {
      method: "POST",
      token,
      body: { name: form.name, fields: form.fields, sort_order: ministries.value.length + 1 },
    });
    successMsg.value = "Ministério criado!";
    form.name = "";
    form.fields = [{ key: "presentes", label: "Voluntários presentes", type: "number", default: 0 }];
    await load();
  } catch (e: any) {
    errorMsg.value = "Erro ao criar ministério.";
  } finally {
    saving.value = false;
  }
}

async function toggleActive(m: any, active: boolean) {
  const token = await getToken();
  await call(`/ministries/${m.id}`, { method: "PUT", token, body: { active } });
  await load();
}

async function remove(id: string) {
  if (!confirm("Excluir este ministério e todos os registros ligados a ele? Essa ação não pode ser desfeita.")) return;
  const token = await getToken();
  await call(`/ministries/${id}`, { method: "DELETE", token });
  await load();
}

onMounted(load);
</script>
