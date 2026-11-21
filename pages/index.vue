<template>
  <div class="page">
    <button v-if="step > 1" class="back-link" @click="goBack">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
      Voltar
    </button>

    <p class="eyebrow">{{ greeting }}</p>
    <h1>Relatório da celebração</h1>

    <div class="steps" aria-hidden="true">
      <div class="step" :class="{ 'is-active': step === 1, 'is-done': step > 1 }" />
      <div class="step" :class="{ 'is-active': step === 2, 'is-done': step > 2 }" />
      <div class="step" :class="{ 'is-active': step === 3 }" />
    </div>

    <div v-if="errorMsg" class="alert alert--error" role="alert">{{ errorMsg }}</div>
    <div v-if="successMsg" class="alert alert--success" role="status">{{ successMsg }}</div>

    <!-- Passo 1: escolher celebração -->
    <section v-if="step === 1">
      <div v-if="loadingCelebrations" class="skeleton-list"><div class="skeleton" /><div class="skeleton" /></div>
      <div v-else-if="!celebrations.length" class="empty">Nenhuma celebração disponível no momento.</div>
      <template v-else>
        <h2 class="section-title">Em aberto</h2>
        <div v-if="!openNow.length" class="empty empty--small">Nenhuma celebração aconteceu nos últimos dias.</div>
        <button
          v-for="(c, i) in openNow"
          :key="c.id"
          class="hero-card"
          :class="{ 'hero-card--secondary': i > 0 }"
          :style="i === 0 && c.color ? { background: c.color } : {}"
          @click="selectCelebration(c)"
        >
          <span class="hero-card__top">
            <span class="hero-card__tag">{{ c.date === today ? 'HOJE' : 'ESTA SEMANA' }}</span>
            <span class="hero-card__cta">Responder ›</span>
          </span>
          <span class="hero-card__title">{{ c.label }}</span>
          <span class="hero-card__meta">
            <span>{{ formatDateLong(c.date) }}</span>
            <span>{{ c.time?.slice(0, 5) }}</span>
            <span v-if="c.salon || c.campus">{{ c.salon || c.campus }}</span>
          </span>
        </button>

        <template v-if="upcoming.length">
          <h2 class="section-title">Próximas</h2>
          <button v-for="c in upcoming" :key="c.id" class="row-card" @click="selectCelebration(c)">
            <span class="row-card__icon" :style="c.color ? { background: c.color, color: '#fff' } : {}">{{ dayNum(c.date) }}</span>
            <span class="row-card__body">
              <span class="row-card__title">{{ c.label }}</span>
              <span class="row-card__sub">{{ formatDateLong(c.date) }} · {{ c.time?.slice(0, 5) }}</span>
            </span>
            <span class="badge badge--muted">Ainda não aconteceu</span>
          </button>
        </template>

        <details v-if="previous.length" class="group group--plain">
          <summary>Celebrações anteriores <span class="count">{{ previous.length }}</span></summary>
          <div class="group__body">
            <button v-for="c in previous" :key="c.id" class="row-card" @click="selectCelebration(c)">
              <span class="row-card__icon">{{ dayNum(c.date) }}</span>
              <span class="row-card__body">
                <span class="row-card__title">{{ c.label }}</span>
                <span class="row-card__sub">{{ formatDateLong(c.date) }} · {{ c.time?.slice(0, 5) }}</span>
              </span>
            </button>
          </div>
        </details>
      </template>
    </section>

    <!-- Passo 2: escolher ministério -->
    <section v-if="step === 2 && selectedCelebration">
      <div class="summary-card">
        <div>
          <div class="summary-card__title">{{ selectedCelebration.label }}</div>
          <div class="summary-card__sub">{{ formatDateLong(selectedCelebration.date) }} · {{ selectedCelebration.time?.slice(0, 5) }}</div>
        </div>
        <div v-if="ministriesWithStatus.length" class="summary-card__progress">
          <div class="summary-card__progress-label"><span>Já responderam</span><strong>{{ doneCount }} de {{ ministriesWithStatus.length }}</strong></div>
          <div class="progress-bar"><div class="progress-bar__fill" :style="{ width: progressPct + '%' }" /></div>
        </div>
      </div>

      <h2 class="section-title">Escolha seu ministério</h2>
      <div v-if="loadingMinistries" class="skeleton-list"><div class="skeleton" /><div class="skeleton" /><div class="skeleton" /></div>
      <div v-else-if="!ministriesWithStatus.length" class="empty empty--small">Nenhum ministério foi adicionado a esta celebração.</div>
      <div v-else class="stack">
        <template v-for="m in ministriesWithStatus" :key="m.id">
          <div v-if="m.status === 'done'" class="row-card row-card--done">
            <span class="row-card__icon row-card__icon--done" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10" /></svg>
            </span>
            <span class="row-card__body">
              <span class="row-card__title">{{ m.name }}</span>
              <span class="row-card__sub">Resposta já enviada</span>
            </span>
            <span class="badge badge--done">Feito</span>
          </div>
          <button v-else class="row-card" @click="selectMinistry(m)">
            <span class="row-card__icon">{{ m.name.charAt(0) }}</span>
            <span class="row-card__body">
              <span class="row-card__title">{{ m.name }}</span>
              <span class="row-card__sub">Toque para responder</span>
            </span>
            <span class="badge badge--pending">Pendente</span>
          </button>
        </template>
      </div>
    </section>

    <!-- Passo 3: preencher formulário -->
    <section v-if="step === 3 && selectedMinistry">
      <div class="summary-card summary-card--light">
        <div class="summary-card__title">{{ selectedMinistry.name }}</div>
        <div class="summary-card__sub">{{ selectedCelebration.label }} · {{ formatDateLong(selectedCelebration.date) }}</div>
      </div>

      <form class="card" @submit.prevent="submit">
        <div class="grid-2" v-if="selectedCelebration.ask_contact !== false">
          <div class="field">
            <label for="f-nome">Seu nome</label>
            <input id="f-nome" v-model="respondentName" type="text" placeholder="Nome completo" autocomplete="name" />
          </div>
          <div class="field">
            <label for="f-contato">Contato (WhatsApp)</label>
            <input
              id="f-contato"
              :value="respondentContact"
              @input="onContactInput"
              type="tel"
              inputmode="numeric"
              placeholder="(00) 00000-0000"
              maxlength="15"
              autocomplete="tel"
            />
          </div>
        </div>

        <div class="grid-2">
          <div class="field" v-for="f in selectedMinistry.fields" :key="f.key">
            <label :for="'f-' + f.key">{{ f.label }}</label>
            <input
              :id="'f-' + f.key"
              v-model.number="formData[f.key]"
              :type="f.type === 'number' ? 'number' : 'text'"
              :inputmode="f.type === 'number' ? 'numeric' : undefined"
              min="0"
            />
          </div>
        </div>

        <button type="submit" class="btn btn--primary btn--block btn--lg" :disabled="submitting">
          {{ submitting ? 'Enviando...' : 'Enviar registro' }}
        </button>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
const { call } = useApi();
const { maskPhone, isValidPhone } = usePhoneMask();

const step = ref(1);
const celebrations = ref<any[]>([]);
const loadingCelebrations = ref(true);
const selectedCelebration = ref<any>(null);

const statusList = ref<any[]>([]);
const loadingMinistries = ref(false);
const selectedMinistry = ref<any>(null);

const respondentName = ref("");
const respondentContact = ref("");
const formData = reactive<Record<string, number | string>>({});
const submitting = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

// Só os ministérios selecionados pelo admin para esta celebração aparecem aqui, em ordem alfabética
const ministriesWithStatus = computed(() => {
  return statusList.value
    .filter((s) => s.ministries)
    .map((s) => ({ ...s.ministries, status: s.status }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
});

function onContactInput(e: Event) {
  const el = e.target as HTMLInputElement;
  respondentContact.value = maskPhone(el.value);
}

const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

function shiftDate(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const weekAgo = shiftDate(today, -6);

// "Em aberto" = aconteceu hoje ou nos últimos 6 dias (é quando os ministérios respondem)
const openNow = computed(() =>
  celebrations.value.filter((c) => c.date <= today && c.date >= weekAgo).sort(byDateDesc)
);
const upcoming = computed(() =>
  celebrations.value.filter((c) => c.date > today).sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1))
);
const previous = computed(() => celebrations.value.filter((c) => c.date < weekAgo).sort(byDateDesc));
function byDateDesc(a: any, b: any) {
  return a.date + (a.time || "") < b.date + (b.time || "") ? 1 : -1;
}

const doneCount = computed(() => ministriesWithStatus.value.filter((m) => m.status === "done").length);
const progressPct = computed(() =>
  ministriesWithStatus.value.length ? Math.round((doneCount.value / ministriesWithStatus.value.length) * 100) : 0
);

const greeting = (() => {
  const h = Number(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }));
  return h < 12 ? "Bom dia!" : h < 18 ? "Boa tarde!" : "Boa noite!";
})();

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function formatDateLong(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
  return `${WEEKDAYS[wd]}, ${day} ${MONTHS[m - 1]}`;
}
function dayNum(d: string) {
  return d ? String(Number(d.split("-")[2])) : "";
}

function goBack() {
  errorMsg.value = "";
  successMsg.value = "";
  step.value = step.value - 1;
}

function formatDate(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

async function loadCelebrations() {
  loadingCelebrations.value = true;
  try {
    celebrations.value = await call("/celebrations");
  } catch (e: any) {
    errorMsg.value = "Não foi possível carregar as celebrações.";
  } finally {
    loadingCelebrations.value = false;
  }
}

async function selectCelebration(c: any) {
  selectedCelebration.value = c;
  step.value = 2;
  successMsg.value = "";
  loadingMinistries.value = true;
  errorMsg.value = "";
  try {
    statusList.value = await call(`/celebrations/${c.id}/status`);
  } catch (e: any) {
    errorMsg.value = "Não foi possível carregar os ministérios.";
  } finally {
    loadingMinistries.value = false;
  }
}

function selectMinistry(m: any) {
  if (m.status === "done") {
    errorMsg.value = "Este ministério já enviou uma resposta para esta celebração.";
    return;
  }
  errorMsg.value = "";
  successMsg.value = "";
  selectedMinistry.value = m;
  Object.keys(formData).forEach((k) => delete formData[k]);
  (m.fields || []).forEach((f: any) => (formData[f.key] = f.default ?? 0));
  step.value = 3;
}

async function submit() {
  errorMsg.value = "";
  const needsContact = selectedCelebration.value.ask_contact !== false;
  if (needsContact) {
    if (!respondentName.value || !respondentContact.value) {
      errorMsg.value = "Informe seu nome e contato.";
      return;
    }
    if (!isValidPhone(respondentContact.value)) {
      errorMsg.value = "Informe um WhatsApp válido com DDD.";
      return;
    }
  }
  submitting.value = true;
  try {
    await call("/submissions", {
      method: "POST",
      body: {
        celebration_id: selectedCelebration.value.id,
        ministry_id: selectedMinistry.value.id,
        respondent_name: respondentName.value,
        respondent_contact: respondentContact.value,
        data: formData,
      },
    });
    successMsg.value = `Obrigado! O registro de ${selectedMinistry.value.name} foi enviado.`;
    step.value = 2;
    statusList.value = await call(`/celebrations/${selectedCelebration.value.id}/status`).catch(() => statusList.value);
    selectedMinistry.value = null;
    respondentName.value = "";
    respondentContact.value = "";
  } catch (e: any) {
    errorMsg.value = e?.data?.error || "Erro ao enviar. Tente novamente.";
    try {
      statusList.value = await call(`/celebrations/${selectedCelebration.value.id}/status`);
    } catch {}
  } finally {
    submitting.value = false;
  }
}

onMounted(loadCelebrations);
</script>
