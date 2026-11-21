<template>
  <div class="page page--wide">
    <AdminTabs />

    <div class="dash-head">
      <div>
        <p class="eyebrow">Visão geral dos relatórios</p>
        <h1>Dashboard</h1>
      </div>
      <div class="segmented" role="group" aria-label="Período">
        <button v-for="p in PERIODS" :key="p.days" :class="{ 'is-active': days === p.days }" @click="setPeriod(p.days)">
          {{ p.label }}
        </button>
      </div>
    </div>

    <div v-if="errorMsg" class="alert alert--error" role="alert">{{ errorMsg }}</div>

    <div v-if="loading" class="kpis">
      <div class="skeleton" style="height:110px" /><div class="skeleton" style="height:110px" />
      <div class="skeleton" style="height:110px" /><div class="skeleton" style="height:110px" />
    </div>

    <template v-else-if="raw">
      <!-- Filtros -->
      <div class="card" style="padding:16px 18px;">
        <div class="filters">
          <div class="field">
            <label for="d-min">Ministério</label>
            <select id="d-min" v-model="ministryId" @change="onMinistryChange">
              <option v-for="m in ministriesWithNumbers" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
          <div class="field">
            <label for="d-campo">Campo</label>
            <select id="d-campo" v-model="fieldKey">
              <option v-for="f in numericFields" :key="f.key" :value="f.key">{{ f.label }}</option>
            </select>
          </div>
          <div class="field">
            <label for="d-cel">Celebração</label>
            <select id="d-cel" v-model="labelFilter">
              <option value="">Todas</option>
              <option v-for="l in labelOptions" :key="l" :value="l">{{ l }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Cartões de resumo -->
      <div class="kpis">
        <div class="kpi">
          <div class="kpi__label">{{ fieldLabel }} · última celebração</div>
          <div class="kpi__value">{{ lastPoint ? fmt(lastPoint.value) : '—' }}</div>
          <div v-if="lastDelta !== null" class="kpi__delta" :class="lastDelta >= 0 ? 'kpi__delta--up' : 'kpi__delta--down'">
            {{ lastDelta >= 0 ? '▲' : '▼' }} {{ Math.abs(lastDelta) }}% vs. anterior
          </div>
          <div v-else class="kpi__delta muted">{{ lastPoint ? formatShort(lastPoint.date) : 'Sem registros' }}</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Média no período</div>
          <div class="kpi__value">{{ series.length ? fmt(avg) : '—' }}</div>
          <div v-if="avgDelta !== null" class="kpi__delta" :class="avgDelta >= 0 ? 'kpi__delta--up' : 'kpi__delta--down'">
            {{ avgDelta >= 0 ? '▲' : '▼' }} {{ Math.abs(avgDelta) }}% vs. período anterior
          </div>
          <div v-else class="kpi__delta muted">{{ series.length }} registro(s)</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Responderam · {{ latestCelebration ? formatShort(latestCelebration.date) : 'última' }}</div>
          <div class="kpi__value">{{ latestStats.done }}<small>/{{ latestStats.total }}</small></div>
          <div class="progress-bar"><div class="progress-bar__fill" :style="{ width: latestStats.pct + '%' }" /></div>
        </div>
        <div class="kpi kpi--dark">
          <div class="kpi__label">Pendentes da última celebração</div>
          <div class="kpi__value">{{ latestStats.pending.length }}</div>
          <div class="kpi__sub">{{ latestStats.pending.length ? latestStats.pending.join(' · ') : 'Todos responderam' }}</div>
        </div>
      </div>

      <!-- Gráfico -->
      <section class="card">
        <div class="chart-head">
          <div>
            <h2 style="margin:0;">{{ fieldLabel }} por celebração</h2>
            <p class="muted" style="margin:2px 0 0;">{{ ministryName }}{{ labelFilter ? ' · ' + labelFilter : '' }}</p>
          </div>
          <div class="legend" style="margin-top:0;">
            <span><i style="background:var(--green-700);height:3px;" />Valor</span>
            <span><i style="background:none;border-top:2px dashed #b8892e;height:0;" />Média</span>
          </div>
        </div>
        <div v-if="!series.length" class="empty empty--small" style="margin-top:12px;">Sem registros desse campo no período.</div>
        <svg
          v-else
          :viewBox="`0 0 ${W} ${H}`"
          class="chart"
          role="img"
          :aria-label="`Gráfico de ${fieldLabel}: ${series.length} registros, média ${fmt(avg)}`"
          @mouseleave="hover = null"
        >
          <defs>
            <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#146356" stop-opacity="0.22" />
              <stop offset="1" stop-color="#146356" stop-opacity="0" />
            </linearGradient>
          </defs>
          <g v-for="g in grid" :key="g.y">
            <line :x1="PAD_L" :x2="W - PAD_R" :y1="g.y" :y2="g.y" stroke="#eee8dd" />
            <text :x="PAD_L - 8" :y="g.y + 4" text-anchor="end" font-size="11" fill="#6b7672">{{ fmt(g.value) }}</text>
          </g>
          <path :d="areaPath" fill="url(#dashArea)" />
          <line :x1="PAD_L" :x2="W - PAD_R" :y1="avgY" :y2="avgY" stroke="#b8892e" stroke-width="1.5" stroke-dasharray="5 5" />
          <polyline :points="linePoints" fill="none" stroke="#146356" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
          <g v-for="(p, i) in points" :key="i">
            <rect :x="p.x - hitW / 2" :y="PAD_T" :width="hitW" :height="H - PAD_T - PAD_B" fill="transparent" @mouseenter="hover = i" @click="hover = i" />
            <circle :cx="p.x" :cy="p.y" :r="hover === i ? 6 : 3.5" :fill="hover === i ? '#fff' : '#146356'" stroke="#146356" stroke-width="3" pointer-events="none" />
            <text v-if="showLabel(i)" :x="p.x" :y="H - 8" font-size="10" fill="#6b7672" text-anchor="middle">{{ formatShort(p.date) }}</text>
          </g>
          <g v-if="hover !== null && points[hover]" :transform="`translate(${tipX} ${Math.max(points[hover].y - 46, 2)})`" pointer-events="none">
            <rect width="120" height="34" rx="8" fill="#0b3d3a" />
            <text x="60" y="15" text-anchor="middle" font-size="10" fill="#9fd0c3">{{ formatShort(points[hover].date) }} · {{ points[hover].label }}</text>
            <text x="60" y="28" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">{{ fmt(points[hover].value) }}</text>
          </g>
        </svg>
      </section>

      <div class="dash-grid">
        <!-- Pontualidade -->
        <section class="card">
          <h2 style="margin:0 0 2px;">Pontualidade dos ministérios</h2>
          <p class="muted" style="margin:0 0 16px;">Respostas enviadas até o dia seguinte à celebração</p>
          <div v-if="!punctuality.length" class="empty empty--small">Nenhuma celebração no período.</div>
          <div v-for="r in punctuality" :key="r.id" class="bar-row">
            <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" :title="r.name">{{ r.name }}</span>
            <div class="bar-row__track"><div class="bar-row__fill" :class="{ 'bar-row__fill--warn': r.pct < 75 }" :style="{ width: r.pct + '%' }" /></div>
            <span style="text-align:right;font-weight:700;">{{ r.pct }}%</span>
          </div>
        </section>

        <!-- Quem respondeu -->
        <section class="card">
          <h2 style="margin:0 0 2px;">Quem respondeu, celebração a celebração</h2>
          <p class="muted" style="margin:0 0 16px;">Últimas {{ heatCols.length }} celebrações{{ labelFilter ? ' · ' + labelFilter : '' }}</p>
          <div v-if="!heatCols.length" class="empty empty--small">Nenhuma celebração no período.</div>
          <div v-else style="overflow-x:auto;">
            <div class="heat" :style="{ gridTemplateColumns: `minmax(90px,120px) repeat(${heatCols.length}, minmax(34px,1fr))` }">
              <span />
              <span v-for="c in heatCols" :key="c.id" class="muted" style="text-align:center;font-size:0.72rem;">{{ formatShort(c.date) }}</span>
              <template v-for="row in heatRows" :key="row.id">
                <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" :title="row.name">{{ row.name }}</span>
                <span
                  v-for="(cell, j) in row.cells"
                  :key="j"
                  class="heat__cell"
                  :class="{ 'heat__cell--on': cell === 'on', 'heat__cell--late': cell === 'late' }"
                  :style="cell === 'na' ? 'background:transparent;border:1px dashed var(--line);' : ''"
                  :title="cellTitle(cell)"
                />
              </template>
            </div>
          </div>
          <div class="legend">
            <span><i style="background:var(--green-700)" />No prazo</span>
            <span><i style="background:var(--gold)" />Atrasado</span>
            <span><i style="background:var(--line)" />Não respondeu</span>
            <span><i style="border:1px dashed var(--line)" />Não estava na lista</span>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();

const PERIODS = [
  { days: 28, label: "4 semanas" },
  { days: 90, label: "3 meses" },
  { days: 365, label: "Ano" },
];

const days = ref(90);
const raw = ref<any>(null);
const loading = ref(true);
const errorMsg = ref("");
const ministryId = ref("");
const fieldKey = ref("");
const labelFilter = ref("");
const hover = ref<number | null>(null);

async function load() {
  loading.value = true;
  errorMsg.value = "";
  try {
    const { data } = await supabase.auth.getSession();
    raw.value = await call(`/dashboard?days=${days.value}`, { token: data.session?.access_token || "" });
    if (!ministryId.value || !ministriesWithNumbers.value.some((m: any) => m.id === ministryId.value)) {
      ministryId.value = ministriesWithNumbers.value[0]?.id || "";
      onMinistryChange();
    }
  } catch (e: any) {
    errorMsg.value = e?.data?.error || "Não foi possível carregar o dashboard.";
  } finally {
    loading.value = false;
  }
}
function setPeriod(d: number) {
  days.value = d;
  load();
}
onMounted(load);

// ---------- base ----------
const startDate = computed(() => shift(raw.value?.today, -days.value));
const prevStart = computed(() => shift(raw.value?.today, -days.value * 2));

const ministriesWithNumbers = computed(() =>
  (raw.value?.ministries || []).filter((m: any) => (m.fields || []).some((f: any) => f.type === "number"))
);
const currentMinistry = computed(() => (raw.value?.ministries || []).find((m: any) => m.id === ministryId.value));
const numericFields = computed(() => (currentMinistry.value?.fields || []).filter((f: any) => f.type === "number"));
const ministryName = computed(() => currentMinistry.value?.name || "");
const fieldLabel = computed(() => numericFields.value.find((f: any) => f.key === fieldKey.value)?.label || "Valor");
function onMinistryChange() {
  fieldKey.value = numericFields.value[0]?.key || "";
  hover.value = null;
}

const celebById = computed(() => {
  const map: Record<string, any> = {};
  for (const c of raw.value?.celebrations || []) map[c.id] = c;
  return map;
});
const labelOptions = computed(() =>
  Array.from(new Set((raw.value?.celebrations || []).map((c: any) => c.label).filter(Boolean))) as string[]
);
const matchesLabel = (c: any) => !labelFilter.value || c?.label === labelFilter.value;

// ---------- série do gráfico ----------
function seriesBetween(from: string, to: string) {
  return (raw.value?.submissions || [])
    .filter((s: any) => s.ministry_id === ministryId.value)
    .map((s: any) => ({ s, c: celebById.value[s.celebration_id] }))
    .filter(({ c }: any) => c && c.date > from && c.date <= to && matchesLabel(c))
    .map(({ s, c }: any) => ({ date: c.date, time: c.time || "", label: c.label, value: Number(s.data?.[fieldKey.value]) || 0 }))
    .sort((a: any, b: any) => (a.date + a.time > b.date + b.time ? 1 : -1));
}
const series = computed(() => (raw.value && fieldKey.value ? seriesBetween(startDate.value, raw.value.today) : []));
const prevSeries = computed(() => (raw.value && fieldKey.value ? seriesBetween(prevStart.value, startDate.value) : []));
const mean = (arr: any[]) => (arr.length ? arr.reduce((t, p) => t + p.value, 0) / arr.length : 0);
const avg = computed(() => mean(series.value));
const pct = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);
const avgDelta = computed(() => (series.value.length && prevSeries.value.length ? pct(avg.value, mean(prevSeries.value)) : null));
const lastPoint = computed(() => series.value[series.value.length - 1] || null);
const lastDelta = computed(() => {
  const n = series.value.length;
  return n >= 2 ? pct(series.value[n - 1].value, series.value[n - 2].value) : null;
});

// ---------- desenho ----------
const W = 760, H = 260, PAD_L = 48, PAD_R = 16, PAD_T = 16, PAD_B = 28;
const maxVal = computed(() => niceMax(Math.max(...series.value.map((p: any) => p.value), 1)));
const yOf = (v: number) => H - PAD_B - (v / maxVal.value) * (H - PAD_T - PAD_B);
const points = computed(() => {
  const n = series.value.length;
  const usable = W - PAD_L - PAD_R - 20;
  return series.value.map((p: any, i: number) => ({
    ...p,
    x: PAD_L + 10 + (n > 1 ? (usable / (n - 1)) * i : usable / 2),
    y: yOf(p.value),
  }));
});
const hitW = computed(() => Math.max((W - PAD_L - PAD_R) / Math.max(points.value.length, 1), 12));
const linePoints = computed(() => points.value.map((p: any) => `${p.x},${p.y}`).join(" "));
const areaPath = computed(() => {
  const pts = points.value;
  if (!pts.length) return "";
  const base = H - PAD_B;
  return `M${pts[0].x},${base} ` + pts.map((p: any) => `L${p.x},${p.y}`).join(" ") + ` L${pts[pts.length - 1].x},${base} Z`;
});
const avgY = computed(() => yOf(avg.value));
const grid = computed(() => [0, 0.5, 1].map((f) => ({ value: maxVal.value * f, y: yOf(maxVal.value * f) })));
const tipX = computed(() => {
  const p = points.value[hover.value ?? 0];
  return p ? Math.min(Math.max(p.x - 60, PAD_L), W - PAD_R - 120) : 0;
});
function showLabel(i: number) {
  const n = points.value.length;
  const step = Math.ceil(n / 8);
  return i % step === 0 || i === n - 1;
}
function niceMax(v: number) {
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
}

// ---------- quem respondeu / pontualidade ----------
const pastCelebrations = computed(() =>
  (raw.value?.celebrations || [])
    .filter((c: any) => c.date > startDate.value && c.date <= raw.value.today && matchesLabel(c))
    .sort((a: any, b: any) => (a.date + (a.time || "") > b.date + (b.time || "") ? 1 : -1))
);
const checklistBy = computed(() => {
  const map: Record<string, any> = {};
  for (const r of raw.value?.checklist || []) map[`${r.celebration_id}|${r.ministry_id}`] = r;
  return map;
});
const submissionBy = computed(() => {
  const map: Record<string, any> = {};
  for (const s of raw.value?.submissions || []) map[`${s.celebration_id}|${s.ministry_id}`] = s;
  return map;
});
function cellState(c: any, ministry: string): "on" | "late" | "off" | "na" {
  const key = `${c.id}|${ministry}`;
  if (!checklistBy.value[key]) return "na";
  const sub = submissionBy.value[key];
  if (!sub) return "off";
  const sentDay = new Date(sub.submitted_at).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return sentDay <= shift(c.date, 1) ? "on" : "late";
}
function cellTitle(s: string) {
  return { on: "No prazo", late: "Atrasado", off: "Não respondeu", na: "Não estava na lista" }[s] || "";
}

const latestCelebration = computed(() => pastCelebrations.value[pastCelebrations.value.length - 1] || null);
const latestStats = computed(() => {
  const c = latestCelebration.value;
  if (!c) return { done: 0, total: 0, pct: 0, pending: [] as string[] };
  const rows = (raw.value?.checklist || []).filter((r: any) => r.celebration_id === c.id);
  const done = rows.filter((r: any) => r.status === "done").length;
  const names = (id: string) => (raw.value?.ministries || []).find((m: any) => m.id === id)?.name || "";
  const pending = rows.filter((r: any) => r.status !== "done").map((r: any) => names(r.ministry_id)).filter(Boolean);
  return { done, total: rows.length, pct: rows.length ? Math.round((done / rows.length) * 100) : 0, pending };
});

const punctuality = computed(() => {
  const out: any[] = [];
  for (const m of raw.value?.ministries || []) {
    let expected = 0, onTime = 0;
    for (const c of pastCelebrations.value) {
      const st = cellState(c, m.id);
      if (st === "na") continue;
      expected++;
      if (st === "on") onTime++;
    }
    if (expected) out.push({ id: m.id, name: m.name, pct: Math.round((onTime / expected) * 100) });
  }
  return out.sort((a, b) => b.pct - a.pct);
});

const heatCols = computed(() => pastCelebrations.value.slice(-8));
const heatRows = computed(() =>
  (raw.value?.ministries || [])
    .map((m: any) => ({ id: m.id, name: m.name, cells: heatCols.value.map((c: any) => cellState(c, m.id)) }))
    .filter((r: any) => r.cells.some((x: string) => x !== "na"))
);

// ---------- utilidades ----------
function shift(dateStr: string, n: number) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function formatShort(d: string) {
  if (!d) return "";
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}
function fmt(v: number) {
  return Number.isInteger(v) ? String(v) : v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}
</script>

<style scoped>
.filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.filters .field { margin-bottom: 0; }
.chart-head { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
.chart { width: 100%; height: auto; margin-top: 12px; display: block; }
</style>
