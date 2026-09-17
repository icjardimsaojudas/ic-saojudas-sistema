<template>
  <div class="page page--wide">
    <div class="toolbar">
      <NuxtLink to="/admin/pastoral" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>

    <div v-if="loading" class="muted">Carregando...</div>

    <template v-else-if="submission">
      <div class="list-item" style="border:none;padding:0 0 8px;">
        <h1 style="margin:0;">
          {{ submission.attended_name || "Sem nome" }}
          <span class="pastoral-type-tag">Etapa {{ submission.stage }}</span>
        </h1>
        <div>
          <button v-if="!editing" class="btn btn--ghost" @click="startEdit">Editar</button>
          <button class="btn btn--danger" @click="remove">Excluir</button>
        </div>
      </div>
      <p class="muted">
        {{ submission.stage === 2 ? "Atendido por " + (submission.attended_by || "—") + " · " : "" }}{{ formatDateTime(submission.submitted_at) }}
      </p>

      <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
      <div v-if="successMsg" class="alert alert--success">{{ successMsg }}</div>

      <!-- Vínculo -->
      <div class="card">
        <h2>Vínculo com a outra etapa</h2>
        <template v-if="linked">
          <p>Vinculada com:
            <NuxtLink :to="'/admin/pastoral/' + linked.id">
              <strong>{{ linked.attended_name || "Sem nome" }}</strong> (Etapa {{ linked.stage }})
            </NuxtLink>
          </p>
          <button class="btn btn--ghost" @click="unlink">Desvincular</button>
        </template>
        <template v-else>
          <p class="muted">Ainda não vinculada. Selecione a ficha correspondente da outra etapa.</p>
          <div v-if="!candidates.length" class="muted">Nenhuma ficha não vinculada da outra etapa disponível.</div>
          <template v-else>
            <select v-model="selectedCandidate">
              <option value="">Selecione...</option>
              <option v-for="c in candidates" :key="c.id" :value="c.id">
                {{ c.attended_name || "Sem nome" }} · {{ formatDateTime(c.submitted_at) }}
              </option>
            </select>
            <button class="btn btn--primary" style="margin-top:8px;" :disabled="!selectedCandidate" @click="link">Vincular</button>
          </template>
        </template>
      </div>

      <div class="card">
        <h2>Respostas</h2>
        <template v-for="(item, i) in (editing ? editData : submission.data)" :key="'d-' + i">
          <div v-if="!editing" class="pastoral-answer">
            <div class="pastoral-answer__label">{{ item.label }}</div>
            <div class="pastoral-answer__value">{{ displayValue(item.value) }}</div>
          </div>
          <div v-else class="field">
            <label>{{ item.label }}</label>
            <textarea v-if="Array.isArray(item.value) || item.type === 'textarea'" v-model="editableValue(item).value" rows="2" />
            <input v-else v-model="editableValue(item).value" type="text" />
          </div>
        </template>
      </div>

      <template v-if="editing">
        <button class="btn btn--primary" :disabled="saving" @click="save">{{ saving ? "Salvando..." : "Salvar" }}</button>
        <button class="btn btn--ghost" style="margin-left:8px;" @click="editing = false">Cancelar</button>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();
const route = useRoute();
const router = useRouter();

const submission = ref<any>(null);
const linked = ref<any>(null);
const candidates = ref<any[]>([]);
const selectedCandidate = ref("");
const loading = ref(true);
const editing = ref(false);
const saving = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

const editData = ref<any[]>([]);

function displayValue(value: any) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return value || "—";
}

function editableValue(item: any) {
  return {
    get value() {
      return Array.isArray(item.value) ? item.value.join(", ") : item.value;
    },
    set value(v: string) {
      item.value = item._wasArray ? v.split(",").map((s: string) => s.trim()).filter(Boolean) : v;
    },
  };
}

function formatDateTime(ts: string) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function load() {
  loading.value = true;
  errorMsg.value = "";
  successMsg.value = "";
  const token = await getToken();
  submission.value = await call("/pastoral-submissions/" + route.params.id, { token });

  if (submission.value.linked_id) {
    linked.value = await call("/pastoral-submissions/" + submission.value.linked_id, { token });
    candidates.value = [];
  } else {
    linked.value = null;
    const unlinked = await call("/pastoral-submissions?unlinked=true", { token });
    const otherStage = submission.value.stage === 1 ? 2 : 1;
    candidates.value = unlinked.filter((s: any) => s.stage === otherStage && s.id !== submission.value.id);
  }
  selectedCandidate.value = "";
  loading.value = false;
}

function startEdit() {
  errorMsg.value = "";
  editData.value = (submission.value.data || []).map((f: any) => ({ ...f, _wasArray: Array.isArray(f.value) }));
  editing.value = true;
}

async function save() {
  saving.value = true;
  errorMsg.value = "";
  try {
    const token = await getToken();
    const clean = editData.value.map(({ _wasArray, ...rest }) => rest);
    await call("/pastoral-submissions/" + route.params.id, {
      method: "PUT",
      token,
      body: { data: clean },
    });
    editing.value = false;
    await load();
  } catch (e: any) {
    errorMsg.value = "Erro ao salvar.";
  } finally {
    saving.value = false;
  }
}

async function link() {
  errorMsg.value = "";
  successMsg.value = "";
  try {
    const token = await getToken();
    await call("/pastoral-submissions/" + route.params.id + "/link", {
      method: "POST",
      token,
      body: { target_id: selectedCandidate.value },
    });
    successMsg.value = "Fichas vinculadas!";
    await load();
  } catch (e: any) {
    errorMsg.value = "Erro ao vincular.";
  }
}

async function unlink() {
  if (!confirm("Desvincular estas fichas?")) return;
  errorMsg.value = "";
  successMsg.value = "";
  try {
    const token = await getToken();
    await call("/pastoral-submissions/" + route.params.id + "/unlink", { method: "POST", token });
    successMsg.value = "Fichas desvinculadas.";
    await load();
  } catch (e: any) {
    errorMsg.value = "Erro ao desvincular.";
  }
}

async function remove() {
  if (!confirm("Excluir esta ficha de atendimento? Essa ação não pode ser desfeita.")) return;
  const token = await getToken();
  await call("/pastoral-submissions/" + route.params.id, { method: "DELETE", token });
  router.push("/admin/pastoral");
}

onMounted(load);
</script>
