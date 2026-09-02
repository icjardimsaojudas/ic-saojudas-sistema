<template>
  <div class="page page--wide">
    <div class="toolbar">
      <NuxtLink to="/admin" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>
    <h1>Organograma</h1>
    <p class="muted">Clique num card para editar. Arraste um card branco para mudar de categoria.</p>

    <div class="org-leadership">Liderança da Igreja</div>

    <button class="btn btn--primary" style="margin-bottom:20px;" @click="addBlue">+ Nova categoria</button>

    <div v-if="loading" class="muted">Carregando...</div>

    <div v-for="blue in blueNodes" :key="blue.id" class="org-category">
      <div class="org-category__head">
        <span>{{ blue.title }}</span>
        <div>
          <button class="btn btn--ghost" style="padding:4px 10px;" @click="addWhite(blue.id)">+ Ministério</button>
          <button class="btn btn--ghost" style="padding:4px 10px;margin-left:6px;" @click="toggleEdit(blue)">
            {{ editingId === blue.id ? "Fechar" : "Editar" }}
          </button>
        </div>
      </div>

      <div v-if="editingId === blue.id" class="card">
        <div class="grid-2">
          <div class="field"><label>Título</label><input v-model="editForm.title" /></div>
          <div class="field"><label>Líder do ministério</label><input v-model="editForm.leader_name" /></div>
        </div>
        <button class="btn btn--primary" @click="saveEdit(blue.id)">Salvar</button>
        <button class="btn btn--danger" style="margin-left:8px;" @click="remove(blue.id)">Excluir categoria</button>
      </div>

      <div
        class="org-grid"
        @dragover.prevent
        @drop="onDrop(blue.id)"
      >
        <div
          v-for="w in childrenOf(blue.id)"
          :key="w.id"
          class="org-card"
          draggable="true"
          @dragstart="dragId = w.id"
          @click="toggleEdit(w)"
        >
          <template v-if="editingId === w.id">
            <input v-model="editForm.title" class="org-inline-input" placeholder="Título" @click.stop />
            <input v-model="editForm.subtitle" class="org-inline-input" placeholder="Subtítulo" @click.stop />
            <input v-model="editForm.leader_name" class="org-inline-input" placeholder="Líder do ministério" @click.stop />
            <input v-model="editForm.base_leader_name" class="org-inline-input" placeholder="Líder de base" @click.stop />
            <input v-model.number="editForm.volunteer_count" type="number" class="org-inline-input" placeholder="Voluntários" @click.stop />
            <div @click.stop>
              <button class="btn btn--primary" style="padding:4px 8px;font-size:0.75rem;" @click="saveEdit(w.id)">Salvar</button>
              <button class="btn btn--danger" style="padding:4px 8px;font-size:0.75rem;margin-left:4px;" @click="remove(w.id)">Excluir</button>
            </div>
          </template>
          <template v-else>
            <div class="org-card__title">{{ w.title }}</div>
            <div class="org-card__sub">{{ w.subtitle }}</div>
            <div class="org-card__meta">
              <div v-if="w.leader_name">Líder: {{ w.leader_name }}</div>
              <div v-if="w.base_leader_name">Base: {{ w.base_leader_name }}</div>
              <div>Vol: {{ w.volunteer_count || 0 }}</div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div v-if="orphans.length" class="org-category">
      <div class="org-category__head"><span>Sem categoria</span></div>
      <div class="org-grid" @dragover.prevent @drop="onDrop(null)">
        <div
          v-for="w in orphans"
          :key="w.id"
          class="org-card"
          draggable="true"
          @dragstart="dragId = w.id"
          @click="toggleEdit(w)"
        >
          <div class="org-card__title">{{ w.title }}</div>
          <div class="org-card__meta">Vol: {{ w.volunteer_count || 0 }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();

const nodes = ref<any[]>([]);
const loading = ref(true);
const dragId = ref<string | null>(null);
const editingId = ref<string | null>(null);
const editForm = reactive<any>({});

const blueNodes = computed(() => nodes.value.filter((n) => n.color === "blue").sort((a, b) => a.sort_order - b.sort_order));
const orphans = computed(() => nodes.value.filter((n) => n.color === "white" && !n.parent_id));

function childrenOf(parentId: string) {
  return nodes.value
    .filter((n) => n.color === "white" && n.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function load() {
  loading.value = true;
  const token = await getToken();
  nodes.value = await call("/org-nodes", { token });
  loading.value = false;
}

function toggleEdit(node: any) {
  if (editingId.value === node.id) {
    editingId.value = null;
    return;
  }
  editingId.value = node.id;
  editForm.title = node.title;
  editForm.subtitle = node.subtitle;
  editForm.leader_name = node.leader_name;
  editForm.base_leader_name = node.base_leader_name;
  editForm.volunteer_count = node.volunteer_count;
}

async function saveEdit(id: string) {
  const token = await getToken();
  await call(`/org-nodes/${id}`, { method: "PUT", token, body: { ...editForm } });
  editingId.value = null;
  await load();
}

async function remove(id: string) {
  if (!confirm("Excluir este item do organograma?")) return;
  const token = await getToken();
  await call(`/org-nodes/${id}`, { method: "DELETE", token });
  editingId.value = null;
  await load();
}

async function addBlue() {
  const title = prompt("Nome da nova categoria:");
  if (!title) return;
  const token = await getToken();
  await call("/org-nodes", {
    method: "POST",
    token,
    body: { title, color: "blue", sort_order: blueNodes.value.length + 1 },
  });
  await load();
}

async function addWhite(parentId: string) {
  const title = prompt("Nome do novo ministério/base:");
  if (!title) return;
  const token = await getToken();
  await call("/org-nodes", {
    method: "POST",
    token,
    body: { title, color: "white", parent_id: parentId, sort_order: childrenOf(parentId).length + 1 },
  });
  await load();
}

async function onDrop(parentId: string | null) {
  if (!dragId.value) return;
  const token = await getToken();
  await call(`/org-nodes/${dragId.value}`, { method: "PUT", token, body: { parent_id: parentId } });
  dragId.value = null;
  await load();
}

onMounted(load);
</script>
