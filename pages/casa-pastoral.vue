<template>
  <div class="page">
    <div class="toolbar" v-if="stage && !submitted">
      <button class="btn btn--ghost" @click="stage = null">← Voltar</button>
    </div>
    <h1>Casa <em>Pastoral</em></h1>

    <div v-if="loading" class="muted">Carregando...</div>

    <template v-else>
      <section v-if="!stage">
        <p>Qual formulário você vai preencher?</p>
        <div class="card card--clickable" style="margin-bottom:12px;" @click="chooseStage(1)">
          <strong>1 · Pessoa atendida</strong>
          <div class="muted">Preenchido por quem vai ser atendido.</div>
        </div>
        <div class="card card--clickable" @click="chooseStage(2)">
          <strong>2 · Atendimento</strong>
          <div class="muted">Preenchido por quem realizou o atendimento.</div>
        </div>
      </section>

      <section v-else-if="!submitted">
        <h2>{{ stage === 1 ? "1. Pessoa atendida" : "2. Atendimento" }}</h2>
        <div v-if="errorMsg" class="alert alert--error">{{ errorMsg }}</div>
        <div class="card">
          <PastoralField v-for="f in currentFields" :key="f.id" :field="f" v-model="formData[f.key]" />
        </div>
        <button class="btn btn--primary" :disabled="submitting" @click="submit">
          {{ submitting ? "Enviando..." : "Enviar ficha" }}
        </button>
      </section>

      <section v-else>
        <div class="alert alert--success">Ficha enviada com sucesso!</div>
        <button class="btn btn--ghost" @click="reset">Enviar outra ficha</button>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
const { call } = useApi();

const loading = ref(true);
const stage = ref<1 | 2 | null>(null);
const submitted = ref(false);
const fields = ref<any[]>([]);
const formData = reactive<Record<string, any>>({});
const submitting = ref(false);
const errorMsg = ref("");

const currentFields = computed(() =>
  fields.value.filter((f) => f.stage === stage.value).sort((a, b) => a.sort_order - b.sort_order)
);

function defaultValue(type: string) {
  return type === "multi_select" ? [] : "";
}

function isEmpty(value: any) {
  if (Array.isArray(value)) return value.length === 0;
  return !value || !String(value).trim();
}

async function load() {
  loading.value = true;
  try {
    fields.value = await call("/pastoral-fields");
  } catch (e: any) {
    errorMsg.value = "Não foi possível carregar o formulário.";
  } finally {
    loading.value = false;
  }
}

function chooseStage(s: 1 | 2) {
  errorMsg.value = "";
  for (const key of Object.keys(formData)) delete formData[key];
  for (const f of fields.value.filter((f) => f.stage === s)) {
    formData[f.key] = defaultValue(f.type);
  }
  stage.value = s;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function submit() {
  errorMsg.value = "";
  for (const f of currentFields.value) {
    if (f.required && isEmpty(formData[f.key])) {
      errorMsg.value = `Preencha: ${f.label}`;
      return;
    }
  }
  submitting.value = true;
  try {
    const data = currentFields.value.map((f) => ({ key: f.key, label: f.label, type: f.type, value: formData[f.key] }));
    await call("/pastoral-submissions", {
      method: "POST",
      body: {
        stage: stage.value,
        attended_name: stage.value === 1 ? formData.nome_completo || "" : formData.pessoa_atendida_nome || "",
        attended_by: stage.value === 2 ? formData.atendente_nome || "" : "",
        data,
      },
    });
    submitted.value = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (e: any) {
    errorMsg.value = e?.data?.error || "Erro ao enviar. Tente novamente.";
  } finally {
    submitting.value = false;
  }
}

function reset() {
  submitted.value = false;
  stage.value = null;
}

onMounted(load);
</script>
