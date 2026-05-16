const app = document.getElementById("app");
const tabs = [
  { id: "overview", label: "Сводка" },
  { id: "projects", label: "Проекты" },
  { id: "managers", label: "Руководители" },
  { id: "methodology", label: "Методология" },
  { id: "archive", label: "Архив" }
];

const state = {
  activeTab: "overview",
  fileChecks: [],
  archiveDocs: [],
  archiveLoading: true,
  archiveMessage: "",
  dashboardModel: dashboard,
  githubToken: "",
  githubRememberToken: true,
  githubPublishing: false,
  githubStatus: "",
  snapshotRecords: [],
  snapshotLoading: true,
  snapshotMessages: {},
  openSnapshotProjects: {},
  snapshotTabs: {},
  selectedSnapshotIds: {},
  compareSnapshotIds: {}
};

const ARCHIVE_DB = "operational-projects-b2b-archive-v3";
const ARCHIVE_STORE = "documents";
const SNAPSHOT_STORE = "charterSnapshots";
const REPO_ARCHIVE_FILE = "archive-store.js";
const ARCHIVE_SEED_KEY = "operational-projects-b2b-archive-seed-20260508-v3";
const ARCHIVE_ROLLBACK_KEY = "operational-projects-b2b-archive-rollback-20260508-v3";
const SNAPSHOT_SEED_KEY = "operational-projects-b2b-snapshots-seed-20260508-v3";
const REPO_ARCHIVE_SYNC_KEY = "operational-projects-b2b-repo-archive-sync-20260508-v1";
const REPO_SYNC_SETTINGS_KEY = "operational-projects-b2b-github-sync-20260512-v1";
const REPO_CONFIG = {
  owner: "Aisaka42",
  repo: "Oper.B2B",
  branch: "main"
};
const UPLOAD_CONFIG = readUploadServiceConfig("oper-b2b");
const ARCHIVE_ROLLBACK_IDS = [
  "project_protocol_24.04.2026_S-26-27_Новые продукты B2B.md",
  "checklist_27.04.2026_S-26-41_Рост производительности территориальных менеджеров.md",
  "checklist_27.04.2026_S-26-42_Создание отдела дистанционных продаж.md",
  "project_protocol_27.04.2026_S-26-42_Создание отдела дистанционных продаж.md",
  "project_protocol_27.04.2026_S-26-41_Рост производительности территориальных менеджеров.md",
  "project_protocol_24.04.2026_S-26-19_Новые доходы BIG_B2B.md",
  "checklist_24.04.2026_S-26-27_Новые продукты B2B.md",
  "checklist_24.04.2026_S-26-19_Новые доходы BIG_B2B.md",
  "project_protocol_30.04.2026_S-26-27_Новые продукты B2B.md",
  "project_protocol_04.05.2026_S-26-42_Создание отдела дистанционных продаж.md",
  "project_protocol_04.05.2026_S-26-41_Рост производительности территориальных менеджеров.md",
  "project_protocol_30.04.2026_S-26-19_Новые доходы BIG_B2B.md",
  "checklist_30.04.2026_S-26-19_Новые доходы BIG_B2B.md",
  "checklist_30.04.2026_S-26-27_Новые продукты B2B.md",
  "checklist_04.05.2026_S-26-41_Рост производительности территориальных менеджеров.md",
  "checklist_04.05.2026_S-26-42_Создание отдела дистанционных продаж.md"
];
const SNAPSHOT_MONTH_NAMES = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь"
];
const SNAPSHOT_MONTH_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const SNAPSHOT_METRIC_PRIORITY = [
  {
    key: "количество продуктовых направлений, упакованных на согласованном уровне, шт",
    short: "Упакованные направления"
  },
  {
    key: "количество mvp-карточек, подготовленных и переданных в контур обучения, шт",
    short: "MVP-карточки"
  },
  {
    key: "количество новых продуктовых направлений, выведенных в продажу, шт",
    short: "Новые продукты"
  },
  {
    key: "rgu в mass_b2b, услуг на клиента, ед.",
    short: "RGU MASS_B2B"
  },
  {
    key: "rgu в big_b2b, услуг на клиента, ед.",
    short: "RGU BIG_B2B"
  }
];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value ? String(value) : "—";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatShortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value ? String(value) : "—";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatBytes(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** power;
  return `${value.toFixed(value >= 10 || power === 0 ? 0 : 1)} ${units[power]}`;
}

function tag(status, label) {
  return `<span class="tag ${status}">${escapeHtml(label)}</span>`;
}

function readRepoArchiveData() {
  const source = globalThis.archiveRepoData;
  if (!source || typeof source !== "object") {
    return {
      site: "",
      version: "",
      archiveDocs: [],
      snapshotRecords: []
    };
  }

  return {
    site: typeof source.site === "string" ? source.site : "",
    version: typeof source.version === "string" ? source.version : "",
    archiveDocs: Array.isArray(source.archiveDocs) ? source.archiveDocs : [],
    snapshotRecords: Array.isArray(source.snapshotRecords) ? source.snapshotRecords : []
  };
}

function applyRepoArchiveData(source) {
  const next = {
    site: typeof source?.site === "string" ? source.site : "",
    version: typeof source?.version === "string" ? source.version : "",
    archiveDocs: Array.isArray(source?.archiveDocs) ? source.archiveDocs : [],
    snapshotRecords: Array.isArray(source?.snapshotRecords) ? source.snapshotRecords : []
  };
  globalThis.archiveRepoData = next;
  return next;
}

function repoLabel() {
  return `${REPO_CONFIG.owner}/${REPO_CONFIG.repo}`;
}

function repoRawBaseUrl() {
  return `https://raw.githubusercontent.com/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/${REPO_CONFIG.branch}/`;
}

function repoContentsApiUrl(path = "") {
  const normalized = String(path).replace(/^\/+/u, "");
  const encoded = normalized.split("/").map((part) => encodeURIComponent(part)).join("/");
  return `https://api.github.com/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/contents/${encoded}`;
}

function readUploadServiceConfig(defaultSiteId = "") {
  const source = globalThis.archiveUploadConfig;
  const apiBaseUrl = typeof source?.apiBaseUrl === "string"
    ? source.apiBaseUrl.trim().replace(/\/+$/u, "")
    : "";
  const siteId = typeof source?.siteId === "string" && source.siteId.trim()
    ? source.siteId.trim()
    : defaultSiteId;

  return {
    apiBaseUrl,
    siteId
  };
}

function uploadApiConfigured() {
  return Boolean(UPLOAD_CONFIG.apiBaseUrl);
}

function uploadApiBaseUrl() {
  return UPLOAD_CONFIG.apiBaseUrl;
}

function uploadSiteId() {
  return UPLOAD_CONFIG.siteId;
}

function uploadServiceLabel() {
  return uploadApiBaseUrl() || "ещё не настроен";
}

function parseRepoArchiveScript(text = "") {
  const match = String(text).match(/window\.archiveRepoData\s*=\s*(\{[\s\S]*\})\s*;?\s*$/u);
  if (!match) {
    throw new Error("В raw archive-store.js не найден объект archiveRepoData.");
  }
  return JSON.parse(match[1]);
}

function loadGitHubSyncSettings() {
  try {
    const raw = localStorage.getItem(REPO_SYNC_SETTINGS_KEY);
    if (!raw) {
      return { token: "", remember: true };
    }
    const parsed = JSON.parse(raw);
    return {
      token: typeof parsed.token === "string" ? parsed.token : "",
      remember: parsed.remember !== false
    };
  } catch {
    return { token: "", remember: true };
  }
}

function persistGitHubSyncSettings() {
  if (!state.githubRememberToken) {
    localStorage.removeItem(REPO_SYNC_SETTINGS_KEY);
    return;
  }

  localStorage.setItem(REPO_SYNC_SETTINGS_KEY, JSON.stringify({
    token: state.githubToken.trim(),
    remember: state.githubRememberToken
  }));
}

function hydrateGitHubSyncSettings() {
  const settings = loadGitHubSyncSettings();
  state.githubToken = settings.token;
  state.githubRememberToken = settings.remember;
}

function clearGitHubSyncSettings() {
  state.githubToken = "";
  state.githubRememberToken = true;
  state.githubStatus = "Пароль загрузки очищен на этом устройстве.";
  localStorage.removeItem(REPO_SYNC_SETTINGS_KEY);
}

async function refreshRemoteRepoArchiveData() {
  const url = `${repoRawBaseUrl()}${REPO_ARCHIVE_FILE}?ts=${Date.now()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Не удалось прочитать общий архив из GitHub: ${response.status}`);
  }
  const text = await response.text();
  const parsed = parseRepoArchiveScript(text);
  return applyRepoArchiveData(parsed);
}

async function syncArchiveFromUploadResult(result) {
  if (result?.archiveData) {
    applyRepoArchiveData(result.archiveData);
  } else {
    await refreshRemoteRepoArchiveData();
  }
  await syncRepoArchiveSeed(true, true);
  state.archiveDocs = await archiveGetAll();
  state.snapshotRecords = await snapshotGetAll();
  await rebuildDashboardModel();
}

async function uploadApiResponseError(response) {
  try {
    const data = await response.json();
    if (data && typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {}

  try {
    const text = await response.text();
    if (text.trim()) {
      return text.trim();
    }
  } catch {}

  return `HTTP ${response.status}`;
}

async function callUploadApi(path, { method = "GET", body = null, includePassword = true } = {}) {
  if (!uploadApiConfigured()) {
    throw new Error("Сервис общей загрузки ещё не настроен. Нужно заполнить upload-config.js.");
  }

  const url = new URL(path, `${uploadApiBaseUrl()}/`);
  url.searchParams.set("siteId", uploadSiteId());

  const headers = {
    Accept: "application/json"
  };

  if (includePassword && state.githubToken.trim()) {
    headers["x-upload-password"] = state.githubToken.trim();
  }

  let payload = body;
  if (body && !(body instanceof FormData) && typeof body !== "string") {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: payload
  });

  if (!response.ok) {
    throw new Error(await uploadApiResponseError(response));
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

function githubHeaders(token = "", includeJson = false) {
  const headers = {
    Accept: "application/vnd.github+json"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

async function githubResponseError(response) {
  let details = "";
  try {
    const body = await response.json();
    details = body?.message || "";
  } catch {
    details = await response.text();
  }
  return details ? `${response.status} ${details}` : String(response.status);
}

async function githubGetContentMetadata(path, token) {
  const response = await fetch(`${repoContentsApiUrl(path)}?ref=${encodeURIComponent(REPO_CONFIG.branch)}`, {
    headers: githubHeaders(token)
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await githubResponseError(response));
  }

  return response.json();
}

async function githubPutContent(path, contentBase64, message, token) {
  const existing = await githubGetContentMetadata(path, token);
  const body = {
    message,
    branch: REPO_CONFIG.branch,
    content: contentBase64
  };

  if (existing?.sha) {
    body.sha = existing.sha;
  }

  const response = await fetch(repoContentsApiUrl(path), {
    method: "PUT",
    headers: githubHeaders(token, true),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await githubResponseError(response));
  }

  return response.json();
}

async function githubDeleteContent(path, message, token) {
  const existing = await githubGetContentMetadata(path, token);
  if (!existing?.sha) {
    return false;
  }

  const response = await fetch(repoContentsApiUrl(path), {
    method: "DELETE",
    headers: githubHeaders(token, true),
    body: JSON.stringify({
      message,
      branch: REPO_CONFIG.branch,
      sha: existing.sha
    })
  });

  if (!response.ok) {
    throw new Error(await githubResponseError(response));
  }

  return true;
}

async function verifyGitHubToken(token) {
  const response = await fetch(`https://api.github.com/repos/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}`, {
    headers: githubHeaders(token)
  });

  if (!response.ok) {
    throw new Error(await githubResponseError(response));
  }

  return response.json();
}

function base64ToBlob(base64, mime = "application/octet-stream") {
  if (!base64) {
    return new Blob([], { type: mime });
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

async function blobToBase64(blob) {
  if (!blob) return "";
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function normalizeRepoArchiveDoc(record) {
  const mime = record.mime || "application/octet-stream";
  const contentBase64 = typeof record.contentBase64 === "string" ? record.contentBase64 : "";
  return {
    id: record.id || record.name,
    name: record.name || record.id || "document",
    sourceName: record.sourceName || "",
    type: record.type || "project_protocol",
    projectCode: record.projectCode || "",
    projectName: record.projectName || "",
    periodDate: record.periodDate || "",
    ext: record.ext || "",
    size: Number(record.size) || 0,
    mime,
    savedAt: record.savedAt || new Date().toISOString(),
    filePath: record.filePath || "",
    blob: contentBase64 ? base64ToBlob(contentBase64, mime) : null
  };
}

function normalizeRepoSnapshotRecord(record) {
  const warnings = Array.isArray(record.warnings) ? record.warnings : [];
  const verified = Boolean(record.verifiedAt);

  return {
    ...record,
    warnings,
    errors: Array.isArray(record.errors) ? record.errors : [],
    metrics: Array.isArray(record.metrics) ? record.metrics : [],
    uploadedAt: record.uploadedAt || record.savedAt || new Date().toISOString(),
    uploadedBy: record.uploadedBy || "Не указан",
    status: record.status || (verified ? "verified" : warnings.length ? "needs-review" : "uploaded"),
    sourceText: typeof record.sourceText === "string" ? record.sourceText : "",
    sourceMime: record.sourceMime || "text/markdown",
    sourceFileName: record.sourceFileName || `${record.projectCode || "project"}_${record.snapshotMonth || "snapshot"}.md`,
    sourceFilePath: record.sourceFilePath || ""
  };
}

function openArchiveDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(ARCHIVE_DB, 2);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ARCHIVE_STORE)) {
        const store = db.createObjectStore(ARCHIVE_STORE, { keyPath: "id" });
        store.createIndex("by_savedAt", "savedAt");
      }
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        const store = db.createObjectStore(SNAPSHOT_STORE, { keyPath: "id" });
        store.createIndex("by_projectCode", "projectCode");
        store.createIndex("by_snapshotMonth", "snapshotMonth");
        store.createIndex("by_uploadedAt", "uploadedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function archiveGetAll() {
  const db = await openArchiveDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ARCHIVE_STORE, "readonly");
    const store = tx.objectStore(ARCHIVE_STORE);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const rows = [...request.result].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      resolve(rows);
    };
  });
}

async function archivePut(record) {
  const db = await openArchiveDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ARCHIVE_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(ARCHIVE_STORE).put(record);
  });
}

async function archiveDelete(id) {
  const db = await openArchiveDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ARCHIVE_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(ARCHIVE_STORE).delete(id);
  });
}

async function archiveClearAll() {
  const db = await openArchiveDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ARCHIVE_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(ARCHIVE_STORE).clear();
  });
}

async function snapshotGetAll() {
  const db = await openArchiveDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, "readonly");
    const store = tx.objectStore(SNAPSHOT_STORE);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const rows = [...request.result].sort(compareSnapshotRecords);
      resolve(rows);
    };
  });
}

async function snapshotPut(record) {
  const db = await openArchiveDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(SNAPSHOT_STORE).put(record);
  });
}

async function snapshotDelete(id) {
  const db = await openArchiveDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(SNAPSHOT_STORE).delete(id);
  });
}

async function snapshotClearAll() {
  const db = await openArchiveDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(SNAPSHOT_STORE).clear();
  });
}

async function syncRepoArchiveSeed(force = false, replaceExisting = false) {
  const repoArchive = readRepoArchiveData();
  if (!repoArchive.version) {
    return { version: "", importedDocs: 0, importedSnapshots: 0 };
  }

  if (!force && localStorage.getItem(REPO_ARCHIVE_SYNC_KEY) === repoArchive.version) {
    return { version: repoArchive.version, importedDocs: 0, importedSnapshots: 0 };
  }

  let importedDocs = 0;
  let importedSnapshots = 0;

  if (replaceExisting) {
    await archiveClearAll();
    await snapshotClearAll();
  }

  for (const item of repoArchive.archiveDocs) {
    const record = normalizeRepoArchiveDoc(item);
    if (!record.id) continue;
    await archivePut(record);
    importedDocs += 1;
  }

  for (const item of repoArchive.snapshotRecords) {
    const record = normalizeRepoSnapshotRecord(item);
    if (!record.id) continue;
    await snapshotPut(record);
    importedSnapshots += 1;
  }

  localStorage.setItem(REPO_ARCHIVE_SYNC_KEY, repoArchive.version);
  return { version: repoArchive.version, importedDocs, importedSnapshots };
}

function compareSnapshotRecords(a, b) {
  const monthDiff = (b.snapshotMonth || "").localeCompare(a.snapshotMonth || "");
  if (monthDiff) return monthDiff;
  const uploadedDiff = new Date(b.uploadedAt || b.savedAt || 0) - new Date(a.uploadedAt || a.savedAt || 0);
  if (uploadedDiff) return uploadedDiff;
  return (b.charterVersion || "").localeCompare(a.charterVersion || "", "ru");
}

function normalizeMetricName(value = "") {
  return String(value)
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/\s+/g, " ")
    .replace(/[().]/g, "")
    .trim();
}

async function rollbackSeededArchiveDocs() {
  if (localStorage.getItem(ARCHIVE_ROLLBACK_KEY) === "done") {
    return false;
  }

  if (localStorage.getItem(ARCHIVE_SEED_KEY) !== "done") {
    localStorage.setItem(ARCHIVE_ROLLBACK_KEY, "done");
    return false;
  }

  for (const id of ARCHIVE_ROLLBACK_IDS) {
    await archiveDelete(id);
  }

  localStorage.removeItem(ARCHIVE_SEED_KEY);
  localStorage.setItem(ARCHIVE_ROLLBACK_KEY, "done");
  return true;
}

async function seedCharterSnapshots() {
  if (localStorage.getItem(SNAPSHOT_SEED_KEY) === "done") {
    return false;
  }

  if (!dashboard.charterSnapshotSeeds?.length) {
    localStorage.setItem(SNAPSHOT_SEED_KEY, "done");
    return false;
  }

  const existing = await snapshotGetAll();
  if (existing.length) {
    localStorage.setItem(SNAPSHOT_SEED_KEY, "done");
    return false;
  }

  for (const record of dashboard.charterSnapshotSeeds) {
    await snapshotPut(record);
  }

  localStorage.setItem(SNAPSHOT_SEED_KEY, "done");
  return true;
}

function stripMdCell(value = "") {
  const text = String(value)
    .replaceAll("`", "")
    .replace(/\u00a0/g, " ")
    .trim();
  return text === "-" || text === "—" || text === "" ? null : text;
}

function parseMetricNumber(value) {
  if (value == null) return null;
  const normalized = String(value).replace(/\s+/g, "").replace(",", ".");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatMetricValue(value) {
  if (value == null || value === "") return "—";
  const numeric = parseMetricNumber(value);
  if (numeric == null) return String(value);
  const abs = Math.abs(numeric);
  const precision = Number.isInteger(numeric) ? 0 : abs < 10 ? 2 : 1;
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  }).format(numeric).replace(/,00$/u, "").replace(/(,\d*[1-9])0$/u, "$1");
}

function formatDeltaValue(value) {
  const numeric = parseMetricNumber(value);
  if (numeric == null) return "—";
  if (numeric === 0) return "0";
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${formatMetricValue(numeric)}`;
}

function parseMonthInput(value) {
  if (!value) return "";
  const [year, month] = value.split("-");
  const monthIndex = Number(month) - 1;
  if (!year || monthIndex < 0 || monthIndex > 11) return value;
  const label = SNAPSHOT_MONTH_NAMES[monthIndex];
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${year}`;
}

function monthShortLabel(monthCode) {
  const index = Number(monthCode) - 1;
  return SNAPSHOT_MONTH_SHORT[index] || monthCode;
}

function snapshotMonthCode(snapshotMonth) {
  return snapshotMonth?.split("-")?.[1] || "";
}

function snapshotProjectRecords(projectCode) {
  return state.snapshotRecords
    .filter((record) => record.projectCode === projectCode)
    .sort(compareSnapshotRecords);
}

function snapshotProjectExists(projectCode) {
  return currentDashboard().projects.some((project) => project.code === projectCode);
}

function lookupMetricMeta(name) {
  const normalized = normalizeMetricName(name);
  return SNAPSHOT_METRIC_PRIORITY.find((item) => normalizeMetricName(item.key) === normalized) || null;
}

function metricPriorityIndex(name) {
  const normalized = normalizeMetricName(name);
  return SNAPSHOT_METRIC_PRIORITY.findIndex((item) => normalizeMetricName(item.key) === normalized);
}

function metricDisplayLabel(name) {
  return lookupMetricMeta(name)?.short || name;
}

function orderedMetricNames(names = []) {
  return [...new Set(names.filter(Boolean))].sort((a, b) => {
    const indexA = metricPriorityIndex(a);
    const indexB = metricPriorityIndex(b);
    const safeA = indexA === -1 ? 999 : indexA;
    const safeB = indexB === -1 ? 999 : indexB;
    if (safeA !== safeB) return safeA - safeB;
    return a.localeCompare(b, "ru");
  });
}

function orderedMetrics(metrics = []) {
  return [...metrics].sort((a, b) => {
    const indexA = metricPriorityIndex(a.name);
    const indexB = metricPriorityIndex(b.name);
    const safeA = indexA === -1 ? 999 : indexA;
    const safeB = indexB === -1 ? 999 : indexB;
    if (safeA !== safeB) return safeA - safeB;
    return a.name.localeCompare(b.name, "ru");
  });
}

function findMetricRowForSnapshot(metric, snapshotMonth, exactOnly = false) {
  if (!metric?.rows?.length) return null;
  const targetMonth = snapshotMonthCode(snapshotMonth);
  const exact = metric.rows.find((row) => row.month === targetMonth);
  if (exact || exactOnly) return exact || null;

  const eligible = metric.rows
    .filter((row) => row.month <= targetMonth)
    .sort((a, b) => b.month.localeCompare(a.month));
  return eligible[0] || metric.rows[metric.rows.length - 1] || null;
}

function numericDeviation(row) {
  if (!row) return null;
  const parsedDeviation = parseMetricNumber(row.deviation);
  if (parsedDeviation != null) return parsedDeviation;
  const plan = parseMetricNumber(row.plan);
  const fact = parseMetricNumber(row.fact);
  if (plan == null || fact == null) return null;
  return Number((fact - plan).toFixed(2));
}

function buildSnapshotId(projectCode, snapshotMonth, charterVersion) {
  const version = String(charterVersion || "v0").replace(/[^\p{L}\p{N}-]+/gu, "-");
  return `${projectCode}_${snapshotMonth}_${version}_${Date.now()}`;
}

function snapshotStatusMeta(record) {
  if (record?.verifiedAt) {
    return { tone: "green", label: "Проверен" };
  }

  if (record?.errors?.length) {
    return { tone: "red", label: "Ошибка разбора" };
  }

  const hasMissingFact = orderedMetrics(record?.metrics || []).some((metric) => {
    const row = findMetricRowForSnapshot(metric, record.snapshotMonth, true);
    return row && row.fact == null;
  });
  const hasDeviation = orderedMetrics(record?.metrics || []).some((metric) => {
    const row = findMetricRowForSnapshot(metric, record.snapshotMonth);
    const plan = parseMetricNumber(row?.plan);
    const fact = parseMetricNumber(row?.fact);
    if (plan == null || fact == null) return false;
    return fact !== plan;
  });

  if (hasMissingFact) {
    return { tone: "yellow", label: "Требует проверки" };
  }

  if (hasDeviation) {
    return { tone: "yellow", label: "Есть отклонения" };
  }

  if (record?.status === "uploaded") {
    return { tone: "accent", label: "Загружен" };
  }

  return { tone: "accent", label: "Загружен" };
}

function parseMarkdownTable(blockText) {
  const tableLines = blockText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (tableLines.length < 3) return null;

  const rows = tableLines.map((line) =>
    line
      .replace(/^\|/u, "")
      .replace(/\|$/u, "")
      .split("|")
      .map((cell) => cell.trim())
  );

  const header = rows[0].map((cell) => normalizeMetricName(cell));
  const [monthHeader, planHeader, factHeader, deviationHeader] = header;
  const isExpectedHeader = monthHeader === "месяц"
    && planHeader?.startsWith("план")
    && factHeader?.startsWith("факт")
    && deviationHeader?.startsWith("отклонение");
  if (!isExpectedHeader) return null;

  return rows.slice(2).map((row) => ({
    month: stripMdCell(row[0]) || "",
    plan: stripMdCell(row[1]),
    fact: stripMdCell(row[2]),
    deviation: stripMdCell(row[3])
  })).filter((row) => row.month);
}

function parseCharterSnapshot(text, expectedProjectCode, snapshotMonth) {
  const errors = [];
  const warnings = [];

  const headerText = text.split("\n").slice(0, 40).join("\n");
  const codeMatch = headerText.match(/\*\*Код проекта:\*\*\s*`?([A-ZА-ЯЁ]-\d{2}-\d+)`?/u);
  const fallbackCodeMatch = headerText.match(/\b([A-ZА-ЯЁ]-\d{2}-\d+)\b/u);
  const versionMatch = headerText.match(/\*\*Версия документа:\*\*\s*`?([^\n`]+?)`?\s+от\s+`?(\d{2}\.\d{2}\.\d{4})`?/u);
  const titleMatch = text.match(/^#\s+Устав проекта:\s+(.+)$/mu);
  const nameTableMatch = text.match(/\|\s*\*\*Название проекта\*\*\s*\|\s*([^|]+?)\s*\|/u);
  const sectionMatch = text.match(/##\s*6\.\s*План\/факт([\s\S]*?)(?=\n##\s*\d+\.|$)/u);

  const projectCode = codeMatch?.[1]?.trim() || fallbackCodeMatch?.[1]?.trim() || expectedProjectCode || "";
  const projectName = titleMatch?.[1]?.trim() || nameTableMatch?.[1]?.trim() || "";
  const charterVersion = versionMatch?.[1]?.trim() || "";
  const charterDateRaw = versionMatch?.[2]?.trim() || "";
  const charterDate = charterDateRaw
    ? charterDateRaw.split(".").reverse().join("-")
    : "";

  if (!projectCode) {
    errors.push("В уставе не найден код проекта в шапке документа.");
  } else if (!codeMatch && !fallbackCodeMatch && expectedProjectCode) {
    warnings.push("Код проекта не найден в шапке: использован код карточки проекта.");
  }

  if (!projectName) {
    errors.push("В уставе не найдено название проекта.");
  }

  if (!charterVersion || !charterDate) {
    errors.push("Не удалось определить версию и дату устава из шапки документа.");
  }

  if (!sectionMatch) {
    errors.push("В уставе не найден раздел `## 6. План/факт`.");
  }

  if (projectCode && expectedProjectCode && projectCode !== expectedProjectCode) {
    warnings.push(`Код проекта в уставе (${projectCode}) не совпадает с карточкой (${expectedProjectCode}).`);
  }

  const metrics = [];
  if (sectionMatch) {
    const sectionText = sectionMatch[1];
    const headings = [...sectionText.matchAll(/^#{3,4}\s+(.+)$/gmu)];

    for (const [index, heading] of headings.entries()) {
      const rawName = heading[1];
      const blockStart = heading.index + heading[0].length;
      const blockEnd = index + 1 < headings.length ? headings[index + 1].index : sectionText.length;
      const rawBlock = sectionText.slice(blockStart, blockEnd);
      const rows = parseMarkdownTable(rawBlock);
      if (!rows?.length) continue;
      const commentMatch = rawBlock.match(/\*Комментарий:\s*([\s\S]*?)\*/u);
      metrics.push({
        name: rawName.trim(),
        comment: commentMatch?.[1]?.trim() || "",
        rows
      });
    }
  }

  if (!metrics.length) {
    errors.push("В разделе 6 не найдены таблицы с колонками `Месяц / План / Факт / Отклонение`.");
  }

  const monthWarnings = [];
  for (const metric of metrics) {
    const row = findMetricRowForSnapshot(metric, snapshotMonth, true);
    if (row && row.fact == null) {
      const meta = lookupMetricMeta(metric.name);
      monthWarnings.push(meta?.short || metric.name);
    }
  }
  if (monthWarnings.length) {
    warnings.push(`Для выбранного месяца есть незаполненный факт: ${monthWarnings.join(", ")}.`);
  }

  return {
    projectCode,
    projectName,
    charterVersion,
    charterDate,
    section: "6. План/факт",
    metrics: orderedMetrics(metrics),
    warnings,
    errors
  };
}

function parseFileName(name) {
  const source = String(name || "").trim();
  const extMatch = source.match(/\.([^.]+)$/u);
  if (!extMatch) return null;

  const ext = extMatch[1].toLowerCase();
  if (ext !== "md" && ext !== "xlsx") return null;

  const base = source.slice(0, -extMatch[0].length);
  const lowered = base.toLowerCase();
  const typePrefix = ["project_protocol", "rating", "raiting", "checklist"].find((prefix) => lowered.startsWith(`${prefix}_`));
  if (!typePrefix) return null;

  const rest = base.slice(typePrefix.length + 1);
  const date = extractRuDateToken(rest);
  if (!date || !rest.startsWith(date)) return null;

  const tail = rest.slice(date.length).replace(/^[_\s-]+/u, "");
  const codeMatch = tail.match(/^([A-Za-zА-Яа-яЁё])[-_\s]?(\d{2})[-_\s]?(\d+)(?:[_\s-]+)(.+)$/u);
  if (!codeMatch) return null;

  return {
    type: normalizeWeeklyFileType(typePrefix),
    date,
    projectCode: `${codeMatch[1].toUpperCase()}-${codeMatch[2]}-${codeMatch[3]}`,
    projectName: sanitizeWeeklyProjectName(codeMatch[4]),
    ext
  };
}

function normalizeWeeklyFileType(value = "") {
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "raiting") return "rating";
  if (normalized.includes("project_protocol") || normalized.includes("protocol")) return "project_protocol";
  if (normalized.includes("rating") || normalized.includes("raiting")) return "rating";
  if (normalized.includes("checklist")) return "checklist";
  return normalized;
}

function extractRuDateToken(value = "") {
  const match = String(value).match(/(\d{2}\.\d{2}\.\d{4})/u);
  return match ? match[1] : "";
}

function normalizeProjectCode(value = "") {
  const cleaned = cleanInlineMarkdown(value)
    .toUpperCase()
    .replace(/[–—−]/gu, "-");
  const match = cleaned.match(/\b([A-ZА-ЯЁ])[-_\s]?(\d{2})[-_\s]?(\d+)\b/u);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function sanitizeWeeklyProjectName(value = "") {
  return cleanInlineMarkdown(value)
    .replace(/[\\/:*?"<>|]/gu, " ")
    .replace(/\s*[\[(]\d+[\])]\s*$/u, "")
    .replace(/\s+(?:final|исправлено|копия|версия(?:\s*\d+)?)$/iu, "")
    .replace(/\s+/gu, " ")
    .replace(/\.+$/u, "")
    .trim();
}

function lookupProjectNameByCode(projectCode = "") {
  const normalizedCode = normalizeProjectCode(projectCode);
  if (!normalizedCode) return "";
  const sourceProjects = currentDashboard?.()?.projects || dashboard.projects || [];
  const match = sourceProjects.find((project) => normalizeProjectCode(project.code) === normalizedCode);
  return match?.name || "";
}

function typeHintFromFileName(name = "") {
  const lowered = String(name).toLowerCase();
  if (lowered.includes("project_protocol") || lowered.includes("project protocol") || lowered.includes("протокол")) {
    return "project_protocol";
  }
  if (lowered.includes("rating") || lowered.includes("raiting") || lowered.includes("рейтинг")) {
    return "rating";
  }
  if (lowered.includes("checklist") || lowered.includes("чек")) {
    return "checklist";
  }
  return "";
}

function buildWeeklyFileName(meta = {}) {
  const type = normalizeWeeklyFileType(meta.type || "");
  const date = extractRuDateToken(meta.date || meta.periodDate || meta.reportDate || "");
  const projectCode = normalizeProjectCode(meta.projectCode || "");
  const projectName = sanitizeWeeklyProjectName(meta.projectName || lookupProjectNameByCode(projectCode));
  const ext = String(meta.ext || "md").toLowerCase();
  if (!type || !date || !projectCode || !projectName || (ext !== "md" && ext !== "xlsx")) {
    return "";
  }
  return `${type}_${date}_${projectCode}_${projectName}.${ext}`;
}

function buildResolvedWeeklyMeta(type, parsed, fallback = {}, ext = "md") {
  const resolvedType = normalizeWeeklyFileType(type || parsed?.type || fallback.type || "");
  const projectCode = normalizeProjectCode(parsed?.projectCode || fallback.projectCode || "");
  const projectName = sanitizeWeeklyProjectName(
    parsed?.projectName
      || fallback.projectName
      || lookupProjectNameByCode(projectCode)
  );
  const date = extractRuDateToken(parsed?.reportDate || parsed?.date || fallback.date || fallback.periodDate || "");
  const normalizedExt = String(ext || fallback.ext || "md").toLowerCase();

  if (!resolvedType || !projectCode || !projectName || !date || (normalizedExt !== "md" && normalizedExt !== "xlsx")) {
    return null;
  }

  return {
    type: resolvedType,
    date,
    projectCode,
    projectName,
    ext: normalizedExt
  };
}

function weeklyMetaConfidence(type, parsed = {}) {
  let score = 0;
  if (parsed.projectCode) score += 4;
  if (parsed.reportDate) score += 4;
  if (parsed.projectName) score += 2;

  if (type === "project_protocol") {
    if (parsed.manager) score += 2;
    if (parsed.customer) score += 2;
    if (parsed.weekSummary) score += 2;
    if (parsed.nextWeekPlan?.length) score += 2;
    if (parsed.expectedResult) score += 1;
  }

  if (type === "rating") {
    if (parsed.score != null) score += 3;
    if (parsed.progress != null) score += 2;
    if (parsed.status) score += 1;
    if (parsed.risk) score += 1;
  }

  if (type === "checklist") {
    if (parsed.totalChecks != null) score += 3;
    if (parsed.quality != null) score += 2;
    if (parsed.status) score += 1;
    if (parsed.rationale) score += 1;
  }

  return score;
}

function inferWeeklyMetaFromText(file, text, fallback = {}) {
  const parserMap = {
    project_protocol: parseProtocolDocument,
    rating: parseRatingDocument,
    checklist: parseChecklistDocument
  };

  const docStub = {
    projectCode: fallback.projectCode || "",
    projectName: fallback.projectName || lookupProjectNameByCode(fallback.projectCode || "")
  };

  const orderedTypes = [
    fallback.type,
    typeHintFromFileName(file.name),
    "project_protocol",
    "rating",
    "checklist"
  ].filter((value, index, items) => value && items.indexOf(value) === index);

  const candidates = [];

  for (const type of orderedTypes) {
    const parser = parserMap[type];
    if (!parser) continue;
    const parsed = parser(docStub, text);
    const meta = buildResolvedWeeklyMeta(type, parsed, fallback, fallback.ext || "md");
    if (!meta) continue;

    const score = weeklyMetaConfidence(type, parsed);
    if (score < 8) continue;
    candidates.push({ meta, score });
  }

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0]?.meta || null;
}

async function inspectWeeklyFile(file) {
  const originalName = file.name;
  const ext = String(originalName.split(".").pop() || "").toLowerCase();

  if (ext !== "md" && ext !== "xlsx") {
    return {
      name: originalName,
      valid: false,
      message: "Поддерживаются только weekly-файлы .md и .xlsx."
    };
  }

  const parsedName = parseFileName(originalName);
  if (parsedName) {
    const resolvedName = buildWeeklyFileName(parsedName);
    return {
      name: originalName,
      valid: true,
      parsed: parsedName,
      resolvedName,
      sourceName: originalName,
      autoRenamed: resolvedName !== originalName,
      message: resolvedName === originalName
        ? "Имя файла корректно и может быть принято системой."
        : `Имя будет автоматически приведено к ${resolvedName}.`
    };
  }

  const fallback = {
    type: typeHintFromFileName(originalName),
    date: extractRuDateToken(originalName),
    projectCode: normalizeProjectCode(originalName),
    projectName: "",
    ext
  };

  if (ext === "md") {
    const text = await file.text();
    const inferredMeta = inferWeeklyMetaFromText(file, text, fallback);
    if (inferredMeta) {
      const resolvedName = buildWeeklyFileName(inferredMeta);
      return {
        name: originalName,
        valid: true,
        parsed: inferredMeta,
        resolvedName,
        sourceName: originalName,
        autoRenamed: true,
        message: `Имя не по шаблону, но сайт автоматически сохранит файл как ${resolvedName}.`
      };
    }
  }

  const fallbackMeta = buildResolvedWeeklyMeta(fallback.type, fallback, fallback, ext);
  if (fallbackMeta) {
    const resolvedName = buildWeeklyFileName(fallbackMeta);
    return {
      name: originalName,
      valid: true,
      parsed: fallbackMeta,
      resolvedName,
      sourceName: originalName,
      autoRenamed: true,
      message: `Имя будет автоматически приведено к ${resolvedName}.`
    };
  }

  return {
    name: originalName,
    valid: false,
    message: ext === "xlsx"
      ? "Для этого файла не удалось автоматически определить тип, дату или проект. Для .xlsx используйте шаблон имени вручную."
      : "Не удалось автоматически определить тип, дату или проект из имени и содержимого файла."
  };
}

function currentDashboard() {
  return state.dashboardModel || dashboard;
}

function cloneDashboardSeed() {
  return JSON.parse(JSON.stringify(dashboard));
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanInlineMarkdown(value = "") {
  return String(value)
    .replace(/\[(.*?)\]\((.*?)\)/gu, "$1")
    .replace(/\*\*|__/gu, "")
    .replace(/`/gu, "")
    .replace(/<br\s*\/?>/giu, " ")
    .replace(/\u00a0/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizeWeeklyText(text = "") {
  return String(text).replace(/\r\n/gu, "\n");
}

function parseStatusCode(value = "") {
  const normalized = normalizeMetricName(value);
  if (normalized.startsWith("зел")) return "green";
  if (normalized.startsWith("жел") || normalized.startsWith("жол")) return "yellow";
  if (normalized.startsWith("крас")) return "red";
  return "";
}

function statusLabel(status) {
  switch (status) {
    case "green":
      return "Зелёный";
    case "yellow":
      return "Жёлтый";
    case "red":
      return "Красный";
    default:
      return "Требует оценки";
  }
}

function parseBooleanFlag(value = "") {
  const normalized = normalizeMetricName(value);
  if (!normalized) return false;
  return normalized === "да" || normalized === "есть" || normalized.includes("требуется") || normalized.startsWith("нужна");
}

function parsePercentValue(value = "") {
  const match = String(value).match(/(\d+(?:[.,]\d+)?)\s*%/u);
  return match ? Number(match[1].replace(",", ".")) : null;
}

function parseRuDate(value = "") {
  const match = String(value).match(/(\d{2})\.(\d{2})\.(\d{4})/u);
  if (!match) return "";
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function weekTimestamp(value = "") {
  const iso = parseRuDate(value);
  return iso ? new Date(`${iso}T00:00:00`).getTime() : 0;
}

function uniqueCompact(items = []) {
  return [...new Set(items.map((item) => cleanInlineMarkdown(item)).filter(Boolean))];
}

function buildProjectId(projectCode = "", fallback = "") {
  const source = projectCode || fallback || "project";
  return source.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/gu, "");
}

function splitProjectIdentity(value = "", fallbackCode = "", fallbackName = "") {
  const cleaned = cleanInlineMarkdown(value);
  const match = cleaned.match(/\b([A-ZА-ЯЁ]-\d{2}-\d+)\b\s*(.*)$/u);
  return {
    code: match?.[1] || fallbackCode || "",
    name: cleanInlineMarkdown(match?.[2] || fallbackName || cleaned.replace(/\b[A-ZА-ЯЁ]-\d{2}-\d+\b/u, ""))
  };
}

function extractBoldMeta(text, label) {
  const match = text.match(new RegExp(`\\*\\*${escapeRegex(label)}:\\*\\*\\s*([^\\n]+)`, "iu"));
  return cleanInlineMarkdown(match?.[1] || "");
}

function extractNumberedSection(text, sectionNumber) {
  const startMatch = text.match(new RegExp(`^##\\s*${sectionNumber}\\.\\s+[^\\n]+\\n`, "mu"));
  if (!startMatch) return "";
  const start = (startMatch.index || 0) + startMatch[0].length;
  const rest = text.slice(start);
  const nextMatch = rest.match(/^##\s*\d+\.\s+[^\n]+\n/mu);
  const end = nextMatch ? start + (nextMatch.index || 0) : text.length;
  return text.slice(start, end).trim();
}

function parseBulletSection(sectionText = "") {
  const result = {};
  for (const rawLine of sectionText.split("\n")) {
    const line = rawLine.trim();
    const match = line.match(/^-+\s+\*\*([^*]+?)\*\*\s*(.+)$/u);
    if (!match) continue;
    const key = cleanInlineMarkdown(match[1]).replace(/:\s*$/u, "").trim();
    result[key] = cleanInlineMarkdown(match[2]);
  }
  return result;
}

function parseMarkdownGrid(blockText = "") {
  const tableLines = blockText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (tableLines.length < 2) return null;

  const rows = tableLines.map((line) =>
    line
      .replace(/^\|/u, "")
      .replace(/\|$/u, "")
      .split("|")
      .map((cell) => cleanInlineMarkdown(cell))
  );

  const divider = rows[1]?.every((cell) => /^:?-{3,}:?$/u.test(cell.replace(/\s+/gu, "")));
  if (!divider) return null;

  return {
    headers: rows[0],
    rows: rows.slice(2)
  };
}

function tableRowsAsObjects(blockText = "") {
  const table = parseMarkdownGrid(blockText);
  if (!table) return [];

  const headers = table.headers.map((header) => normalizeMetricName(header));
  return table.rows
    .map((cells) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = cleanInlineMarkdown(cells[index] || "");
      });
      return record;
    })
    .filter((row) => Object.values(row).some(Boolean));
}

function rowValue(row, aliases = []) {
  const pairs = Object.entries(row || {});
  for (const alias of aliases) {
    const normalizedAlias = normalizeMetricName(alias);
    const match = pairs.find(([key]) => key === normalizedAlias || key.startsWith(normalizedAlias));
    if (match && match[1]) {
      return cleanInlineMarkdown(match[1]);
    }
  }
  return "";
}

function sectionPlainText(sectionText = "") {
  return cleanInlineMarkdown(
    sectionText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("|") && !line.startsWith("##") && line !== "---")
      .join(" ")
  );
}

function isEmptySectionStatement(text = "") {
  return /не выявлены|не зафиксированы|не выделены|не требуется|не отмечены|не сформированы/iu.test(text);
}

function joinSentenceParts(parts = []) {
  return parts.map((part) => cleanInlineMarkdown(part)).filter(Boolean).join(" — ");
}

function parseProtocolDocument(doc, rawText) {
  const text = normalizeWeeklyText(rawText);
  const identity = splitProjectIdentity(extractBoldMeta(text, "Проект"), doc.projectCode, doc.projectName);
  const overview = parseBulletSection(extractNumberedSection(text, 1));
  const deviationSection = extractNumberedSection(text, 4);
  const riskSection = extractNumberedSection(text, 5);
  const escalationSection = extractNumberedSection(text, 8);
  const nextWeekSection = extractNumberedSection(text, 7);

  const deviationRows = tableRowsAsObjects(deviationSection);
  const riskRows = tableRowsAsObjects(riskSection);
  const escalationRows = tableRowsAsObjects(escalationSection);
  const nextWeekRows = tableRowsAsObjects(nextWeekSection);

  const deviations = deviationRows.length
    ? deviationRows.map((row) => joinSentenceParts([
      rowValue(row, ["обязательство", "что не выполнено"]),
      rowValue(row, ["причина невыполнения", "причина"]),
      rowValue(row, ["влияние на этап / срок / kpi", "влияние"]),
      rowValue(row, ["корректирующее действие"])
    ]))
    : (isEmptySectionStatement(sectionPlainText(deviationSection)) ? [] : uniqueCompact([sectionPlainText(deviationSection)]));

  const nextWeekPlan = nextWeekRows.map((row) => ({
    task: rowValue(row, ["обязательство следующей недели", "обязательство"]),
    owner: rowValue(row, ["ответственный"]),
    result: rowValue(row, ["критерий готовности", "критерий завершения / приемки", "критерий"]),
    due: rowValue(row, ["срок", "плановая дата"])
  })).filter((item) => item.task);

  const escalation = riskRows.some((row) => parseBooleanFlag(rowValue(row, ["требуется эскалация"])))
    || (escalationRows.length > 0)
    || (!isEmptySectionStatement(sectionPlainText(escalationSection)) && Boolean(sectionPlainText(escalationSection)));

  const primaryRisk = riskRows.length
    ? joinSentenceParts([
      rowValue(riskRows[0], ["риск / блокер", "риск", "блокер"]),
      rowValue(riskRows[0], ["влияние"])
    ])
    : "";

  return {
    type: "project_protocol",
    projectCode: identity.code,
    projectName: identity.name || doc.projectName,
    periodText: extractBoldMeta(text, "Период"),
    reportDate: extractBoldMeta(text, "Дата статуса"),
    customer: extractBoldMeta(text, "Заказчик"),
    manager: extractBoldMeta(text, "Руководитель проекта"),
    status: parseStatusCode(overview["Статус проекта"]),
    weekSummary: overview["Ключевой вывод недели"] || "",
    expectedResult: overview["Ближайший ожидаемый результат"] || "",
    expectedDate: overview["Плановая дата результата"] || "",
    probability: overview["Оценка вероятности достижения в срок"] || "",
    deviations,
    risk: primaryRisk,
    escalation,
    nextWeekPlan
  };
}

function parseChecklistDocument(doc, rawText) {
  const text = normalizeWeeklyText(rawText);
  const identity = splitProjectIdentity(extractBoldMeta(text, "Проект"), doc.projectCode, doc.projectName);
  const evaluation = parseBulletSection(extractNumberedSection(text, 1));
  const checklistRows = tableRowsAsObjects(extractNumberedSection(text, 2));
  const summarySection = extractNumberedSection(text, 3);
  const explicitGreen = summarySection.match(/Количество пунктов[^0-9]*✅[^0-9]*(\d+)/u);
  const explicitWarn = summarySection.match(/Количество пунктов[^0-9]*⚠️[^0-9]*(\d+)/u);

  const countedGreen = checklistRows.filter((row) => rowValue(row, ["статус"]).includes("✅")).length;
  const countedWarn = checklistRows.filter((row) => rowValue(row, ["статус"]).includes("⚠️")).length;
  const greenChecks = explicitGreen ? Number(explicitGreen[1]) : countedGreen || null;
  const warningChecks = explicitWarn ? Number(explicitWarn[1]) : countedWarn || null;
  const totalChecks = (greenChecks || warningChecks)
    ? (greenChecks || 0) + (warningChecks || 0)
    : (checklistRows.length || null);
  const quality = totalChecks ? Math.round(((greenChecks || 0) / totalChecks) * 100) : null;

  return {
    type: "checklist",
    projectCode: identity.code,
    projectName: identity.name || doc.projectName,
    periodText: extractBoldMeta(text, "Период оценки"),
    reportDate: extractBoldMeta(text, "Дата оценки"),
    status: parseStatusCode(evaluation["Статус проекта"]),
    progress: parsePercentValue(evaluation["Прогресс к ближайшему ожидаемому результату"]),
    probability: evaluation["Вероятность достижения результата в срок"] || "",
    risk: evaluation["Ключевой риск недели"] || "",
    managementProblem: parseBooleanFlag(evaluation["Признаки управленческой проблемы"]),
    nextCriticalStep: evaluation["Что критично сделать на следующей неделе"] || "",
    escalation: parseBooleanFlag(evaluation["Нужна ли эскалация"]),
    rationale: evaluation["Краткое обоснование оценки"] || sectionPlainText(summarySection),
    greenChecks,
    warningChecks: warningChecks || 0,
    totalChecks,
    quality
  };
}

function parseRatingDocument(doc, rawText) {
  const text = normalizeWeeklyText(rawText);
  const identity = splitProjectIdentity(extractBoldMeta(text, "Проект"), doc.projectCode, doc.projectName);
  const sectionOne = parseBulletSection(extractNumberedSection(text, 1));
  const scoreMatch = text.match(/\*\*(?:Балл недели|Итоговый балл|Weekly-балл проекта):\*\*\s*([0-9]+(?:[.,][0-9]+)?)/u);
  const progressMatch = text.match(/\*\*(?:Прогресс|Прогресс проекта):\*\*\s*([0-9]+(?:[.,][0-9]+)?)%/u);

  return {
    type: "rating",
    projectCode: identity.code,
    projectName: identity.name || doc.projectName,
    periodText: extractBoldMeta(text, "Период оценки") || extractBoldMeta(text, "Период"),
    reportDate: extractBoldMeta(text, "Дата оценки") || extractBoldMeta(text, "Дата статуса"),
    status: parseStatusCode(sectionOne["Статус проекта"] || ""),
    score: scoreMatch ? Number(scoreMatch[1].replace(",", ".")) : null,
    progress: progressMatch ? Number(progressMatch[1].replace(",", ".")) : null,
    risk: sectionOne["Ключевой риск недели"] || "",
    escalation: parseBooleanFlag(sectionOne["Нужна ли эскалация"] || "")
  };
}

function resolveArchiveFileUrl(filePath, cacheKey = "") {
  let url;
  if (/^https?:\/\//iu.test(filePath)) {
    url = new URL(filePath);
  } else if (filePath.startsWith("./")) {
    url = new URL(filePath.slice(2), repoRawBaseUrl());
  } else {
    url = new URL(filePath, window.location.href);
  }
  if (cacheKey) {
    url.searchParams.set("_archive", cacheKey);
  }
  return url.toString();
}

async function readArchiveDocumentText(doc) {
  if (doc.__textCache) {
    return doc.__textCache;
  }

  if (doc.ext !== "md" && !String(doc.name || "").endsWith(".md")) {
    return "";
  }

  if (doc.blob) {
    const text = await doc.blob.text();
    doc.__textCache = text;
    return text;
  }

  if (!doc.filePath) {
    return "";
  }

  const response = await fetch(resolveArchiveFileUrl(doc.filePath, doc.savedAt || doc.id || Date.now()), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Не удалось прочитать ${doc.name}: ${response.status}`);
  }
  const text = await response.text();
  doc.__textCache = text;
  return text;
}

function scoreFromStatus(status, fallbackQuality = null) {
  if (status === "green") return 5;
  if (status === "yellow") return 2;
  if (status === "red") return 1;
  if (fallbackQuality != null) {
    if (fallbackQuality >= 85) return 5;
    if (fallbackQuality >= 70) return 2;
    return 1;
  }
  return 0;
}

function buildWeekEntry(doc, parsed) {
  const periodKey = doc.periodDate || parsed.reportDate || "";
  if (!parsed.projectCode || !periodKey) {
    return null;
  }

  return {
    key: `${parsed.projectCode}__${periodKey}`,
    weekKey: periodKey,
    weekTs: weekTimestamp(periodKey) || weekTimestamp(parsed.reportDate),
    projectCode: parsed.projectCode,
    projectName: parsed.projectName || doc.projectName,
    type: parsed.type,
    savedAt: doc.savedAt || "",
    periodText: parsed.periodText || "",
    reportDate: parsed.reportDate || "",
    payload: parsed
  };
}

function describeWeeklyBundle(entry) {
  const hasProtocol = Boolean(entry.project_protocol);
  const hasChecklist = Boolean(entry.checklist);
  const hasRating = Boolean(entry.rating);
  const documentCount = Number(hasProtocol) + Number(hasChecklist) + Number(hasRating);
  const weeklyComplete = hasProtocol && (hasRating || hasChecklist);

  let packageLabel = "Нет weekly";
  if (hasProtocol && hasRating && hasChecklist) {
    packageLabel = "Protocol + rating + checklist";
  } else if (hasProtocol && hasRating) {
    packageLabel = "Protocol + rating";
  } else if (hasProtocol && hasChecklist) {
    packageLabel = "Protocol + checklist";
  } else if (hasProtocol) {
    packageLabel = "Только protocol";
  } else if (hasRating && hasChecklist) {
    packageLabel = "Rating + checklist";
  } else if (hasRating) {
    packageLabel = "Только rating";
  } else if (hasChecklist) {
    packageLabel = "Только checklist";
  }

  return {
    hasProtocol,
    hasChecklist,
    hasRating,
    documentCount,
    weeklyComplete,
    packageLabel
  };
}

function deriveWeekProjectState(entry) {
  const protocol = entry.project_protocol || null;
  const checklist = entry.checklist || null;
  const rating = entry.rating || null;
  const weeklyBundle = describeWeeklyBundle(entry);
  const status = rating?.status || checklist?.status || protocol?.status || "";
  const protocolStatus = protocol?.status || status;
  const quality = checklist?.quality ?? null;
  const greenChecks = checklist?.greenChecks ?? null;
  const totalChecks = checklist?.totalChecks ?? null;
  const latestPlan = protocol?.nextWeekPlan?.[0] || null;
  const deviations = uniqueCompact([
    ...(protocol?.deviations || []),
    (protocolStatus && status && protocolStatus !== status)
      ? `Протокол и weekly-оценка расходятся: ${statusLabel(protocolStatus)} vs ${statusLabel(status)}.`
      : ""
  ]);

  return {
    id: buildProjectId(entry.projectCode, entry.projectName),
    code: entry.projectCode,
    name: entry.projectName || protocol?.projectName || checklist?.projectName || rating?.projectName || entry.projectCode,
    manager: protocol?.manager || entry.manager || "Требует уточнения",
    customer: protocol?.customer || entry.customer || "Требует уточнения",
    status: status || entry.seedStatus || "yellow",
    statusLabel: statusLabel(status || entry.seedStatus || "yellow"),
    protocolStatus: protocolStatus || status || entry.seedStatus || "yellow",
    score: rating?.score ?? scoreFromStatus(status, quality),
    progress: rating?.progress ?? checklist?.progress ?? null,
    quality,
    greenChecks,
    totalChecks,
    reportSubmitted: true,
    weeklyComplete: weeklyBundle.weeklyComplete,
    weeklyDocumentCount: weeklyBundle.documentCount,
    weeklyPackageLabel: weeklyBundle.packageLabel,
    hasProtocol: weeklyBundle.hasProtocol,
    hasChecklist: weeklyBundle.hasChecklist,
    hasRating: weeklyBundle.hasRating,
    escalation: Boolean(rating?.escalation || checklist?.escalation || protocol?.escalation),
    risk: checklist?.risk || rating?.risk || protocol?.risk || "Требует уточнения",
    nextCriticalStep: checklist?.nextCriticalStep || latestPlan?.task || protocol?.expectedResult || "Требует уточнения",
    weekSummary: protocol?.weekSummary || checklist?.rationale || "Weekly сохранён, но краткий итог недели не найден.",
    deviations,
    nextWeekPlan: protocol?.nextWeekPlan?.length ? protocol.nextWeekPlan : []
  };
}

function buildHistoryFromProjects(projectWeeksMap, weekKeys, totalProjects) {
  return weekKeys.map((weekKey) => {
    const values = [...projectWeeksMap.values()]
      .map((weeks) => weeks.get(weekKey))
      .filter(Boolean);

    const submitted = values.length;
    const complete = values.filter((item) => item.weeklyComplete).length;
    const partial = submitted - complete;
    const pending = Math.max(totalProjects - submitted, 0);
    const green = values.filter((item) => item.status === "green").length;
    const yellow = values.filter((item) => item.status === "yellow").length;
    const red = values.filter((item) => item.status === "red").length;
    const qualities = values.map((item) => item.quality).filter((value) => Number.isFinite(value));
    const avgQuality = qualities.length
      ? Math.round(qualities.reduce((sum, value) => sum + value, 0) / qualities.length)
      : null;

    return {
      date: weekKey,
      projects: totalProjects,
      submitted,
      complete,
      partial,
      pending,
      green,
      yellow,
      red,
      avgQuality
    };
  });
}

function buildAlertsFromProjects(projects, latestWeekKey) {
  const scored = projects.map((project) => {
    if (!project.reportSubmitted) {
      return {
        priority: 300,
        level: "critical",
        project: `${project.code} ${project.name}`,
        text: `За ${latestWeekKey} weekly не загружен. На карточке показан последний доступный контекст.`
      };
    }

    if (!project.weeklyComplete) {
      return {
        priority: 235,
        level: "warning",
        project: `${project.code} ${project.name}`,
        text: `За ${latestWeekKey} weekly собран частично: ${project.weeklyPackageLabel}. Остальные данные можно догрузить позже.`
      };
    }

    if (project.status === "red") {
      return {
        priority: 250,
        level: "critical",
        project: `${project.code} ${project.name}`,
        text: `${project.risk}. Следующий шаг: ${project.nextCriticalStep}.`
      };
    }

    if (project.escalation) {
      return {
        priority: 220,
        level: project.progress != null && project.progress < 50 ? "critical" : "warning",
        project: `${project.code} ${project.name}`,
        text: `Есть эскалация. Прогресс ${project.progress ?? "—"}%. ${project.risk}`
      };
    }

    if (project.status === "yellow" || (project.quality != null && project.quality < 85)) {
      return {
        priority: 180 - (project.progress ?? 0),
        level: "warning",
        project: `${project.code} ${project.name}`,
        text: `Прогресс ${project.progress ?? "—"}%. ${project.risk}`
      };
    }

    return null;
  }).filter(Boolean);

  return scored
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6)
    .map(({ priority, ...alert }) => alert);
}

function buildManagersFromProjects(projects, projectWeeksMap, weekKeys) {
  const groups = new Map();

  for (const project of projects) {
    const managerName = project.manager || "Требует уточнения";
    if (!groups.has(managerName)) {
      groups.set(managerName, {
        name: managerName,
        projects: 0,
        reportCount: 0,
        totalScore: 0,
        averageScore: 0,
        averageQuality: 0,
        escalations: 0,
        green: 0,
        weekProjects: []
      });
    }

    const bucket = groups.get(managerName);
    bucket.projects += 1;

    const projectWeeks = projectWeeksMap.get(project.code) || new Map();
    const firstSeenIndex = weekKeys.findIndex((week) => projectWeeks.has(week));
    const startIndex = firstSeenIndex === -1 ? 0 : firstSeenIndex;
    const qualityValues = [];

    for (let index = startIndex; index < weekKeys.length; index += 1) {
      const weekKey = weekKeys[index];
      const record = projectWeeks.get(weekKey);
      bucket.reportCount += 1;
      if (record) {
        bucket.totalScore += record.score ?? 0;
        bucket.escalations += record.escalation ? 1 : 0;
        bucket.green += record.status === "green" ? 1 : 0;
        if (Number.isFinite(record.quality)) {
          qualityValues.push(record.quality);
        }
      }
    }

    const latestRecord = projectWeeks.get(weekKeys[weekKeys.length - 1]);
    bucket.weekProjects.push({
      name: project.code,
      score: latestRecord?.score ?? 0
    });

    bucket.__qualityValues = (bucket.__qualityValues || []).concat(qualityValues);
  }

  return [...groups.values()].map((manager) => ({
    ...manager,
    averageScore: manager.reportCount ? Number((manager.totalScore / manager.reportCount).toFixed(2)) : 0,
    averageQuality: manager.__qualityValues?.length
      ? Math.round(manager.__qualityValues.reduce((sum, value) => sum + value, 0) / manager.__qualityValues.length)
      : 0
  })).map((manager) => {
    delete manager.__qualityValues;
    return manager;
  });
}

async function rebuildDashboardModel() {
  const base = cloneDashboardSeed();
  const weeklyDocs = state.archiveDocs.filter((item) =>
    item.type === "project_protocol" || item.type === "checklist" || item.type === "rating"
  );

  if (!weeklyDocs.length) {
    state.dashboardModel = base;
    return;
  }

  const parsedWeeks = new Map();
  const parseErrors = [];

  for (const doc of weeklyDocs) {
    try {
      const text = await readArchiveDocumentText(doc);
      if (!text) continue;

      let parsed = null;
      if (doc.type === "project_protocol") {
        parsed = parseProtocolDocument(doc, text);
      } else if (doc.type === "checklist") {
        parsed = parseChecklistDocument(doc, text);
      } else if (doc.type === "rating") {
        parsed = parseRatingDocument(doc, text);
      }

      if (!parsed) continue;

      const weekEntry = buildWeekEntry(doc, parsed);
      if (!weekEntry) continue;

      if (!parsedWeeks.has(weekEntry.key)) {
        parsedWeeks.set(weekEntry.key, {
          weekKey: weekEntry.weekKey,
          weekTs: weekEntry.weekTs,
          projectCode: weekEntry.projectCode,
          projectName: weekEntry.projectName,
          periodText: weekEntry.periodText,
          reportDate: weekEntry.reportDate
        });
      }

      const bucket = parsedWeeks.get(weekEntry.key);
      const currentSavedAt = bucket[`${weekEntry.type}SavedAt`] || "";
      if (!currentSavedAt || new Date(weekEntry.savedAt || 0) >= new Date(currentSavedAt || 0)) {
        bucket[weekEntry.type] = weekEntry.payload;
        bucket[`${weekEntry.type}SavedAt`] = weekEntry.savedAt || "";
      }

      bucket.projectName = bucket.projectName || weekEntry.projectName;
      bucket.periodText = bucket.periodText || weekEntry.periodText;
      bucket.reportDate = bucket.reportDate || weekEntry.reportDate;
    } catch (error) {
      parseErrors.push(`${doc.name}: ${error.message}`);
    }
  }

  if (!parsedWeeks.size) {
    state.dashboardModel = base;
    if (parseErrors.length) {
      state.archiveMessage = `Weekly-файлы найдены, но не разобраны: ${parseErrors[0]}`;
    }
    return;
  }

  const seedProjects = new Map(base.projects.map((project) => [project.code, project]));
  const weekKeys = [...new Set([...parsedWeeks.values()].map((item) => item.weekKey))]
    .sort((a, b) => weekTimestamp(a) - weekTimestamp(b));
  const latestWeekKey = weekKeys[weekKeys.length - 1] || base.summary.newestReportDate || "";
  const projectWeeksMap = new Map();

  for (const weekEntry of parsedWeeks.values()) {
    const seed = seedProjects.get(weekEntry.projectCode);
    const derived = deriveWeekProjectState({
      ...weekEntry,
      manager: seed?.manager || "",
      customer: seed?.customer || "",
      seedStatus: seed?.status || ""
    });

    if (!projectWeeksMap.has(derived.code)) {
      projectWeeksMap.set(derived.code, new Map());
    }
    projectWeeksMap.get(derived.code).set(weekEntry.weekKey, {
      ...derived,
      weekKey: weekEntry.weekKey,
      weekTs: weekEntry.weekTs,
      periodText: weekEntry.periodText,
      reportDate: weekEntry.reportDate
    });
  }

  const extraCodes = [...projectWeeksMap.keys()].filter((code) => !seedProjects.has(code)).sort((a, b) => a.localeCompare(b, "ru"));
  const projectCodes = [...base.projects.map((project) => project.code), ...extraCodes];
  const projects = projectCodes.map((code) => {
    const seed = seedProjects.get(code);
    const weeks = projectWeeksMap.get(code) || new Map();
    const sortedWeeks = [...weeks.values()].sort((a, b) => b.weekTs - a.weekTs);
    const latestRecord = latestWeekKey ? weeks.get(latestWeekKey) : null;
    const displayRecord = latestRecord || sortedWeeks[0] || null;
    const missingMessage = !latestRecord && latestWeekKey
      ? `За ${latestWeekKey} weekly не загружен. Показан последний доступный контекст${displayRecord ? ` за ${displayRecord.weekKey}` : ""}.`
      : "";

    if (!displayRecord && seed) {
      return {
        ...seed,
        score: latestWeekKey ? 0 : seed.score,
        reportSubmitted: !latestWeekKey ? seed.reportSubmitted : false,
        weeklyComplete: false,
        weeklyDocumentCount: 0,
        weeklyPackageLabel: "Нет weekly",
        hasProtocol: false,
        hasChecklist: false,
        hasRating: false,
        deviations: uniqueCompact([missingMessage, ...(seed.deviations || [])]),
        weekSummary: missingMessage || seed.weekSummary || "Weekly за текущую неделю ещё не загружен."
      };
    }

    const status = latestRecord?.status || displayRecord?.status || seed?.status || "yellow";
    const statusLabelValue = latestRecord?.statusLabel || displayRecord?.statusLabel || seed?.statusLabel || statusLabel(status);
    const protocolStatus = latestRecord?.protocolStatus || displayRecord?.protocolStatus || seed?.protocolStatus || status;
    const quality = latestRecord?.quality ?? displayRecord?.quality ?? seed?.quality ?? null;
    const greenChecks = latestRecord?.greenChecks ?? displayRecord?.greenChecks ?? seed?.greenChecks ?? null;
    const totalChecks = latestRecord?.totalChecks ?? displayRecord?.totalChecks ?? null;
    const nextWeekPlan = latestRecord?.nextWeekPlan?.length
      ? latestRecord.nextWeekPlan
      : (displayRecord?.nextWeekPlan?.length ? displayRecord.nextWeekPlan : (seed?.nextWeekPlan || []));

    return {
      id: displayRecord?.id || seed?.id || buildProjectId(code, displayRecord?.name || seed?.name || code),
      code,
      name: displayRecord?.name || seed?.name || code,
      manager: displayRecord?.manager || seed?.manager || "Требует уточнения",
      customer: displayRecord?.customer || seed?.customer || "Требует уточнения",
      status,
      statusLabel: statusLabelValue,
      protocolStatus,
      score: latestRecord ? (latestRecord.score ?? 0) : 0,
      progress: latestRecord?.progress ?? displayRecord?.progress ?? seed?.progress ?? null,
      quality,
      greenChecks,
      totalChecks,
      reportSubmitted: Boolean(latestRecord),
      weeklyComplete: latestRecord ? Boolean(latestRecord.weeklyComplete) : false,
      weeklyDocumentCount: latestRecord?.weeklyDocumentCount ?? 0,
      weeklyPackageLabel: latestRecord?.weeklyPackageLabel || (latestWeekKey ? "Нет weekly" : ""),
      hasProtocol: Boolean(latestRecord?.hasProtocol),
      hasChecklist: Boolean(latestRecord?.hasChecklist),
      hasRating: Boolean(latestRecord?.hasRating),
      escalation: latestRecord ? Boolean(latestRecord.escalation) : false,
      risk: latestRecord?.risk || displayRecord?.risk || seed?.risk || "Требует уточнения",
      nextCriticalStep: latestRecord?.nextCriticalStep || displayRecord?.nextCriticalStep || seed?.nextCriticalStep || "Требует уточнения",
      weekSummary: latestRecord?.weekSummary || displayRecord?.weekSummary || seed?.weekSummary || missingMessage || "Weekly за текущую неделю ещё не загружен.",
      deviations: uniqueCompact([missingMessage, ...(latestRecord?.deviations || displayRecord?.deviations || seed?.deviations || [])]),
      nextWeekPlan
    };
  });

  const latestSubmitted = projects.filter((project) => project.reportSubmitted);
  const latestComplete = latestSubmitted.filter((project) => project.weeklyComplete);
  const latestPartial = latestSubmitted.filter((project) => !project.weeklyComplete);
  const missingProjects = projects.filter((project) => !project.reportSubmitted);
  const qualityValues = latestSubmitted.map((project) => project.quality).filter((value) => Number.isFinite(value));
  const totalGreenChecks = latestSubmitted.reduce((sum, project) => sum + (project.greenChecks || 0), 0);
  const totalPossibleChecks = latestSubmitted.reduce((sum, project) => sum + (project.totalChecks || 0), 0);
  const managers = buildManagersFromProjects(projects, projectWeeksMap, weekKeys);
  const latestPeriodTexts = uniqueCompact(
    latestSubmitted
      .map((project) => projectWeeksMap.get(project.code)?.get(latestWeekKey)?.periodText || "")
  );

  state.dashboardModel = {
    ...base,
    generatedAt: new Date().toISOString(),
    latestPeriod: latestPeriodTexts.length === 1
      ? `${latestPeriodTexts[0]} · загрузка ${latestWeekKey} · сдали ${latestSubmitted.length}/${projects.length}`
      : (latestWeekKey || base.latestPeriod),
    summary: {
      projects: projects.length,
      reportsForNewWeek: latestSubmitted.length,
      completeReports: latestComplete.length,
      partialReports: latestPartial.length,
      missingReports: missingProjects.length,
      missingProjectNames: missingProjects.map((project) => `${project.code} ${project.name}`),
      partialProjectNames: latestPartial.map((project) => `${project.code} ${project.name}`),
      incompleteReports: projects.length - latestComplete.length,
      newestReportDate: latestWeekKey || base.summary.newestReportDate,
      managers: managers.length,
      totalScore: projects.reduce((sum, project) => sum + (project.score || 0), 0),
      green: latestSubmitted.filter((project) => project.status === "green").length,
      yellow: latestSubmitted.filter((project) => project.status === "yellow").length,
      red: latestSubmitted.filter((project) => project.status === "red").length,
      escalations: latestSubmitted.filter((project) => project.escalation).length,
      averageQuality: qualityValues.length
        ? Math.round(qualityValues.reduce((sum, value) => sum + value, 0) / qualityValues.length)
        : null,
      totalGreenChecks,
      totalPossibleChecks
    },
    history: buildHistoryFromProjects(projectWeeksMap, weekKeys, projects.length),
    alerts: buildAlertsFromProjects(projects, latestWeekKey),
    projects,
    managers
  };

  if (parseErrors.length) {
    state.archiveMessage = `${state.archiveMessage ? `${state.archiveMessage} ` : ""}Часть weekly не разобралась: ${parseErrors[0]}`.trim();
  }
}

function documentTypeLabel(type) {
  switch (type) {
    case "rating":
      return "Weekly rating";
    case "project_protocol":
      return "Протокол проекта";
    case "checklist":
      return "Чек-лист";
    default:
      return type;
  }
}

function missingList() {
  const model = currentDashboard();
  if (!model.summary.projects) {
    return "<li>Проекты ещё не добавлены</li>";
  }

  const missingNames = Array.isArray(model.summary.missingProjectNames) ? model.summary.missingProjectNames : [];
  return missingNames.length
    ? missingNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")
    : "<li>Все проекты сдали отчёты</li>";
}

function incompleteList() {
  const model = currentDashboard();
  if (!model.summary.projects) {
    return "<li>Проекты ещё не добавлены</li>";
  }

  const partialNames = Array.isArray(model.summary.partialProjectNames) ? model.summary.partialProjectNames : [];
  const missingNames = Array.isArray(model.summary.missingProjectNames) ? model.summary.missingProjectNames : [];
  const partial = partialNames.map((name) => `<li>${escapeHtml(name)} · weekly частично</li>`);
  const missing = missingNames.map((name) => `<li>${escapeHtml(name)} · ещё нет weekly</li>`);
  const rows = [...partial, ...missing];
  return rows.length
    ? rows.join("")
    : "<li>Полный weekly-комплект есть по всем проектам</li>";
}

function historyMarkup() {
  const model = currentDashboard();
  if (!model.history.length) {
    return `
      <article class="snapshotEmpty subtle">
        <strong>История пока пустая.</strong>
        <span>Когда появятся weekly по новым проектам, здесь будет динамика по статусам и качеству.</span>
      </article>
    `;
  }

  return model.history.map((week) => {
    const total = week.green + week.yellow + week.red || 1;
    const submitted = week.submitted ?? total;
    const projectTotal = week.projects ?? total;
    const complete = week.complete ?? submitted;
    const partial = week.partial ?? 0;
    const pending = week.pending ?? Math.max(projectTotal - submitted, 0);
    return `
      <article class="historyWeek">
        <div class="historyDate">${escapeHtml(week.date)}</div>
        <div class="stack">
          <div class="stackBar"><div class="stackFill" style="width:${(week.green / total) * 100}%;background:var(--green)"></div></div>
        </div>
        <div class="stack">
          <div class="stackBar"><div class="stackFill" style="width:${(week.yellow / total) * 100}%;background:var(--yellow)"></div></div>
        </div>
        <div class="stack">
          <div class="stackBar"><div class="stackFill" style="width:${(week.red / total) * 100}%;background:var(--red)"></div></div>
        </div>
        <div class="historyStats">
          <span>Сдали: ${submitted}/${projectTotal}</span>
          <span>Полный комплект: ${complete}</span>
          <span>Частично: ${partial}</span>
          <span>Без weekly: ${pending}</span>
          <span>Зелёных: ${week.green}</span>
          <span>Жёлтых: ${week.yellow}</span>
          <span>Красных: ${week.red}</span>
          <strong>Среднее качество: ${week.avgQuality != null ? `${week.avgQuality}%` : "—"}</strong>
        </div>
      </article>
    `;
  }).join("");
}

function nextWeekFocusMarkup() {
  const model = currentDashboard();
  const focusCards = model.projects
    .filter((project) => project.nextWeekPlan?.length)
    .slice(0, 4)
    .map((project) => {
      const item = project.nextWeekPlan[0];
      return `
        <article class="focusItem">
          <div class="focusTop">
            <div>
              <div class="focusProject">${escapeHtml(project.code)} · ${escapeHtml(project.name)}</div>
              <div class="focusMeta">${escapeHtml(project.manager)}</div>
            </div>
            ${tag(project.status, project.statusLabel)}
          </div>
          <strong>${escapeHtml(item.task)}</strong>
          <div class="focusMeta">Срок: ${escapeHtml(item.due)} · Ответственный: ${escapeHtml(item.owner)}</div>
          <div class="focusMeta">Ожидаемый результат: ${escapeHtml(item.result)}</div>
        </article>
      `;
    })
    .join("");

  return focusCards || `
    <article class="snapshotEmpty subtle">
      <strong>Фокус недели появится после добавления проектов.</strong>
      <span>Здесь будут самые важные шаги по активным проектам без открытия исходных документов.</span>
    </article>
  `;
}

function projectSnapshotMessage(projectCode) {
  return state.snapshotMessages[projectCode] || "";
}

function snapshotTabOptions(records, latest) {
  return [
    { id: "overview", label: "Обзор", disabled: false },
    { id: "history", label: "История", disabled: !records.length },
    { id: "comparison", label: "Сравнение", disabled: records.length < 2 },
    { id: "graphs", label: "Графики", disabled: !latest }
  ];
}

function activeSnapshotTab(projectCode, records, latest) {
  const options = snapshotTabOptions(records, latest);
  const preferred = state.snapshotTabs[projectCode] || "overview";
  const selected = options.find((item) => item.id === preferred && !item.disabled);
  return selected?.id || "overview";
}

function summaryMetricRows(record) {
  return orderedMetrics(record.metrics).map((metric) => {
    const row = findMetricRowForSnapshot(metric, record.snapshotMonth);
    const deviation = numericDeviation(row);

    let status = "нет строки";
    const plan = parseMetricNumber(row?.plan);
    const fact = parseMetricNumber(row?.fact);
    if (row) {
      if (row.fact == null) {
        status = "нет факта";
      } else if (plan != null && fact != null && fact === plan) {
        status = "в плане";
      } else if (plan != null && fact != null && fact > plan) {
        status = "выше плана";
      } else if (plan != null && fact != null && fact < plan) {
        status = "ниже плана";
      } else {
        status = "требует чтения";
      }
    }

    return {
      label: metricDisplayLabel(metric.name),
      row,
      status,
      deviation
    };
  });
}

function snapshotSummaryMarkup(record) {
  const status = snapshotStatusMeta(record);
  const rows = summaryMetricRows(record).map((item) => `
    <tr>
      <td>${escapeHtml(item.label)}</td>
      <td>${item.row ? escapeHtml(formatMetricValue(item.row.plan)) : "—"}</td>
      <td>${item.row ? escapeHtml(formatMetricValue(item.row.fact)) : "—"}</td>
      <td>${item.row ? escapeHtml(formatDeltaValue(item.deviation)) : "—"}</td>
      <td>${escapeHtml(item.status)}</td>
    </tr>
  `).join("");

  const warnings = record.warnings?.length
    ? `<div class="snapshotCallout">${record.warnings.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`
    : "";

  return `
    <article class="snapshotCard">
      <div class="snapshotCardTop">
        <div>
          <div class="snapshotEyebrow">Актуальный срез</div>
          <h4>${escapeHtml(parseMonthInput(record.snapshotMonth))}</h4>
          <p>Устав ${escapeHtml(record.charterVersion)} от ${escapeHtml(formatShortDate(record.charterDate))} · загружен ${escapeHtml(formatDate(record.uploadedAt))}</p>
        </div>
        ${tag(status.tone, status.label)}
      </div>
      <div class="snapshotMiniMeta">
        <span>${escapeHtml(record.projectCode)}</span>
        <span>${escapeHtml(record.uploadedBy || "Автор не указан")}</span>
        <span>${escapeHtml(record.comment || "Без комментария к версии")}</span>
      </div>
      ${warnings}
      <div class="snapshotTableShell">
        <table class="snapshotTable compact">
          <thead>
            <tr>
              <th>KPI</th>
              <th>План</th>
              <th>Факт</th>
              <th>Отклонение</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </article>
  `;
}

function snapshotHistoryMarkup(projectCode, records) {
  if (!records.length) {
    return `
      <article class="snapshotEmpty">
        <strong>История срезов пока пустая.</strong>
        <span>Загрузите markdown-устав за месяц, и сайт сохранит отдельный срез раздела 6 без перезаписи прошлых версий.</span>
      </article>
    `;
  }

  const rows = records.map((record, index) => {
    const status = snapshotStatusMeta(record);
    const canDownload = Boolean(record.sourceText);
    const previousExists = Boolean(records[index + 1]);

    return `
      <tr>
        <td>${escapeHtml(parseMonthInput(record.snapshotMonth))}</td>
        <td>${escapeHtml(record.charterVersion)}</td>
        <td>${escapeHtml(formatShortDate(record.charterDate))}</td>
        <td>${escapeHtml(formatDate(record.uploadedAt))}</td>
        <td>${tag(status.tone, status.label)}</td>
        <td>
          <div class="tableActions">
            <button class="archiveButton ghost" type="button" data-snapshot-open="${escapeHtml(record.id)}">Открыть</button>
            <button class="archiveButton ghost" type="button" data-snapshot-download="${escapeHtml(record.id)}" ${canDownload ? "" : "disabled"}>Скачать устав</button>
            <button class="archiveButton ghost" type="button" data-snapshot-compare="${escapeHtml(record.id)}" ${previousExists ? "" : "disabled"}>Сравнить</button>
            <button class="archiveButton ghost" type="button" data-snapshot-verify="${escapeHtml(record.id)}">${record.verifiedAt ? "Снять проверку" : "Проверен"}</button>
            <button class="archiveButton ghost" type="button" data-snapshot-delete="${escapeHtml(record.id)}">Удалить</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  return `
    <div class="snapshotTableShell">
      <table class="snapshotTable">
        <thead>
          <tr>
            <th>Месяц среза</th>
            <th>Версия</th>
            <th>Дата устава</th>
            <th>Загружен</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function comparisonConclusion(currentMetric, previousMetric, currentRow, previousRow) {
  if (!currentMetric && !previousMetric) return "Нет данных";
  if (currentMetric && !previousMetric) return "Новый показатель";
  if (!currentMetric && previousMetric) return "Показатель исчез";
  if (currentRow && currentRow.fact == null) return "Факт ещё не заполнен";

  const currentFact = parseMetricNumber(currentRow?.fact);
  const previousFact = parseMetricNumber(previousRow?.fact);
  const currentPlan = parseMetricNumber(currentRow?.plan);
  const previousPlan = parseMetricNumber(previousRow?.plan);

  if (currentFact != null && previousFact != null && currentFact !== previousFact) {
    return currentFact > previousFact ? "Факт вырос" : "Факт снизился";
  }

  if (currentPlan != null && previousPlan != null && currentPlan !== previousPlan) {
    return currentPlan > previousPlan ? "План повышен" : "План снижен";
  }

  return "Без существенных изменений";
}

function snapshotComparisonMarkup(projectCode, records) {
  if (records.length < 2) {
    return `
      <article class="snapshotEmpty subtle">
        <strong>Сравнение появится после второго среза.</strong>
        <span>Когда будет загружен следующий месяц, модуль покажет изменения в плане, факте и отклонениях автоматически.</span>
      </article>
    `;
  }

  const currentId = state.compareSnapshotIds[projectCode] || records[0].id;
  const currentIndex = Math.max(records.findIndex((item) => item.id === currentId), 0);
  const current = records[currentIndex];
  const previous = records[currentIndex + 1];

  if (!current || !previous) {
    return `
      <article class="snapshotEmpty subtle">
        <strong>Для выбранного среза нет предыдущей версии.</strong>
      </article>
    `;
  }

  const metricNames = orderedMetricNames([
    ...current.metrics.map((item) => item.name),
    ...previous.metrics.map((item) => item.name)
  ]);

  const rows = metricNames.map((name) => {
    const normalizedName = normalizeMetricName(name);
    const currentMetric = current.metrics.find((item) => normalizeMetricName(item.name) === normalizedName);
    const previousMetric = previous.metrics.find((item) => normalizeMetricName(item.name) === normalizedName);
    const currentRow = currentMetric ? findMetricRowForSnapshot(currentMetric, current.snapshotMonth) : null;
    const previousRow = previousMetric ? findMetricRowForSnapshot(previousMetric, previous.snapshotMonth) : null;

    return `
      <tr>
        <td>${escapeHtml(metricDisplayLabel(name))}</td>
        <td>${previousRow ? `${escapeHtml(formatMetricValue(previousRow.plan))} → ${escapeHtml(formatMetricValue(currentRow?.plan))}` : `— → ${escapeHtml(formatMetricValue(currentRow?.plan))}`}</td>
        <td>${previousRow ? `${escapeHtml(formatMetricValue(previousRow.fact))} → ${escapeHtml(formatMetricValue(currentRow?.fact))}` : `— → ${escapeHtml(formatMetricValue(currentRow?.fact))}`}</td>
        <td>${escapeHtml(comparisonConclusion(currentMetric, previousMetric, currentRow, previousRow))}</td>
      </tr>
    `;
  }).join("");

  return `
    <article class="snapshotCard">
      <div class="snapshotCardTop">
        <div>
          <div class="snapshotEyebrow">Сравнение месяцев</div>
          <h4>${escapeHtml(parseMonthInput(current.snapshotMonth))} vs ${escapeHtml(parseMonthInput(previous.snapshotMonth))}</h4>
          <p>Сравнение выбранного среза с предыдущим месяцем без открытия исходных markdown-файлов.</p>
        </div>
      </div>
      <div class="snapshotTableShell">
        <table class="snapshotTable compact">
          <thead>
            <tr>
              <th>KPI</th>
              <th>План</th>
              <th>Факт</th>
              <th>Вывод</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </article>
  `;
}

function snapshotTrendMarkup(record) {
  const cards = orderedMetrics(record.metrics).map((metric) => {
    const meta = lookupMetricMeta(metric.name);
    const short = meta?.short || metric.name;
    const values = metric.rows.flatMap((row) => [parseMetricNumber(row.plan), parseMetricNumber(row.fact)]).filter((value) => value != null);
    const max = Math.max(...values, 1);

    const rows = metric.rows.map((row) => {
      const plan = parseMetricNumber(row.plan);
      const fact = parseMetricNumber(row.fact);
      const planWidth = plan == null ? 0 : Math.max((plan / max) * 100, 4);
      const factWidth = fact == null ? 0 : Math.max((fact / max) * 100, 4);
      const deviation = numericDeviation(row);

      return `
        <div class="trendRow">
          <div class="trendMonth">${escapeHtml(monthShortLabel(row.month))}</div>
          <div class="trendSeries">
            <div class="trendLine">
              <span class="trendBar plan" style="width:${planWidth}%"></span>
            </div>
            <div class="trendLine">
              <span class="trendBar fact" style="width:${factWidth}%"></span>
            </div>
          </div>
          <div class="trendValues">
            <span>P ${escapeHtml(formatMetricValue(row.plan))}</span>
            <span>F ${escapeHtml(formatMetricValue(row.fact))}</span>
            <span>Δ ${escapeHtml(formatDeltaValue(deviation))}</span>
          </div>
        </div>
      `;
    }).join("");

    return `
      <article class="trendCard">
        <div class="trendHeader">
          <strong>${escapeHtml(short)}</strong>
          <span>План / факт / отклонение</span>
        </div>
        <div class="trendLegend">
          <span><i class="legendDot plan"></i>План</span>
          <span><i class="legendDot fact"></i>Факт</span>
        </div>
        <div class="trendRows">${rows}</div>
      </article>
    `;
  }).join("");

  return `<div class="trendGrid">${cards}</div>`;
}

function snapshotDetailsMarkup(record) {
  const cards = orderedMetrics(record.metrics).map((metric) => `
    <article class="snapshotMetricCard">
      <div class="snapshotMetricTop">
        <h5>${escapeHtml(metric.name)}</h5>
      </div>
      <div class="snapshotTableShell">
        <table class="snapshotTable compact">
          <thead>
            <tr>
              <th>Месяц</th>
              <th>План</th>
              <th>Факт</th>
              <th>Отклонение</th>
            </tr>
          </thead>
          <tbody>
            ${metric.rows.map((row) => `
              <tr ${row.month === snapshotMonthCode(record.snapshotMonth) ? `class="is-current"` : ""}>
                <td>${escapeHtml(row.month)}</td>
                <td>${escapeHtml(formatMetricValue(row.plan))}</td>
                <td>${escapeHtml(formatMetricValue(row.fact))}</td>
                <td>${escapeHtml(formatDeltaValue(numericDeviation(row)))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      ${metric.comment ? `<p class="snapshotMetricComment">${escapeHtml(metric.comment)}</p>` : ""}
    </article>
  `).join("");

  return `
    <article class="snapshotCard">
      <div class="snapshotCardTop">
        <div>
          <div class="snapshotEyebrow">Детали выбранного среза</div>
          <h4>${escapeHtml(parseMonthInput(record.snapshotMonth))}</h4>
          <p>${escapeHtml(record.projectCode)} · ${escapeHtml(record.charterVersion)} · ${escapeHtml(record.comment || "Без комментария к версии")}</p>
        </div>
      </div>
      <div class="snapshotMetricGrid">${cards}</div>
    </article>
  `;
}

function snapshotArchiveFormMarkup() {
  const defaultAuthor = localStorage.getItem("project-snapshot-author") || "";

  return `
    <form class="snapshotForm" data-archive-snapshot-form>
      <div class="snapshotFormGrid">
        <label class="field">
          <span>Месяц среза</span>
          <input type="month" data-snapshot-month required />
        </label>
        <label class="field">
          <span>Кто загрузил</span>
          <input type="text" data-snapshot-author placeholder="Например, Юрченко Сергей" value="${escapeHtml(defaultAuthor)}" />
        </label>
        <label class="field">
          <span>Код проекта, если нужен</span>
          <input type="text" data-snapshot-expected-code placeholder="Например, S-26-55" />
        </label>
        <label class="field">
          <span>Режим дубля</span>
          <select data-snapshot-strategy>
            <option value="new-version">Сохранить как новую версию</option>
            <option value="replace-month">Заменить существующий месяц</option>
          </select>
        </label>
        <label class="field field-wide">
          <span>Комментарий к версии</span>
          <textarea rows="2" data-snapshot-comment placeholder="Что изменилось в этом месяце"></textarea>
        </label>
        <label class="field field-wide">
          <span>Файл устава</span>
          <input type="file" data-snapshot-file accept=".md" required />
        </label>
      </div>
      <div class="snapshotFormFooter">
        <div class="validatorHint">Код проекта, название, версия устава, дата документа и KPI читаются из markdown автоматически по разделу <code>## 6. План/факт</code>. Поле кода нужно только как страховка, если в уставе он не зашит явно.</div>
        <button class="archiveButton accent" type="submit">+ Загрузить устав за месяц</button>
      </div>
    </form>
  `;
}

function snapshotArchiveListMarkup() {
  if (state.snapshotLoading) {
    return `<article class="archiveEmpty"><span>Читаю месячные срезы уставов…</span></article>`;
  }

  const records = [...state.snapshotRecords].sort(compareSnapshotRecords);
  if (!records.length) {
    return `
      <article class="archiveEmpty">
        <strong>Уставы пока не загружены.</strong>
        <span>Здесь будут храниться все месячные версии уставов. Они загружаются раз в месяц, а проекты потом просто показывают уже сохранённые срезы.</span>
      </article>
    `;
  }

  return records.map((record) => {
    const status = snapshotStatusMeta(record);
    const canDownload = Boolean(record.sourceText);
    const canOpenProject = snapshotProjectExists(record.projectCode);

    return `
      <article class="archiveRow">
        <div class="archiveMain">
          <div class="focusTop">
            <div class="archiveTitle">${escapeHtml(record.projectCode)} · ${escapeHtml(record.projectName)}</div>
            ${tag(status.tone, status.label)}
          </div>
          <div class="archiveMeta">
            <span>${escapeHtml(parseMonthInput(record.snapshotMonth))}</span>
            <span>${escapeHtml(record.charterVersion)}</span>
            <span>Дата устава: ${escapeHtml(formatShortDate(record.charterDate))}</span>
            <span>Загружен: ${escapeHtml(formatDate(record.uploadedAt))}</span>
            <span>${escapeHtml(record.uploadedBy || "Автор не указан")}</span>
          </div>
          <div class="archiveFileName">${escapeHtml(record.sourceFileName || `${record.projectCode}_${record.snapshotMonth}.md`)}</div>
        </div>
        <div class="archiveActions">
          <button class="archiveButton ghost" data-snapshot-open="${escapeHtml(record.id)}" ${canOpenProject ? "" : "disabled"}>Открыть в проекте</button>
          <button class="archiveButton" data-snapshot-download="${escapeHtml(record.id)}" ${canDownload ? "" : "disabled"}>Скачать устав</button>
          <button class="archiveButton ghost" data-snapshot-verify="${escapeHtml(record.id)}">${record.verifiedAt ? "Снять проверку" : "Проверен"}</button>
          <button class="archiveButton ghost" data-snapshot-delete="${escapeHtml(record.id)}">Удалить</button>
        </div>
      </article>
    `;
  }).join("");
}

function projectSnapshotsMarkup(project) {
  if (state.snapshotLoading) {
    return `
      <section class="infoBlock snapshotShell">
        <h3>6. Срезы план/факт</h3>
        <div class="snapshotEmpty subtle">
          <span>Читаю локальные срезы из браузера…</span>
        </div>
      </section>
    `;
  }

  const records = snapshotProjectRecords(project.code);
  const latest = records[0] || null;
  const selectedId = state.selectedSnapshotIds[project.code] || latest?.id;
  const selected = records.find((item) => item.id === selectedId) || latest;
  const status = latest ? snapshotStatusMeta(latest) : { tone: "missing", label: "Нет срезов" };
  const tabOptions = snapshotTabOptions(records, latest);
  const activeTab = activeSnapshotTab(project.code, records, latest);
  const summaryLine = latest
    ? `Актуальный срез: ${parseMonthInput(latest.snapshotMonth)}`
    : "Пока ни одного среза";
  const counterLine = latest
    ? [
        `${records.length} ${records.length === 1 ? "срез" : records.length < 5 ? "среза" : "срезов"}`,
        `${latest.metrics.length} KPI`
      ].join(" · ")
    : "Загрузка уставов теперь в архиве";
  const message = projectSnapshotMessage(project.code);
  const isOpen = Boolean(state.openSnapshotProjects[project.code]);

  const overviewPane = latest ? snapshotSummaryMarkup(latest) : `
    <article class="snapshotEmpty">
      <strong>Срезов по проекту пока нет.</strong>
      <span>Загрузка уставов перенесена во вкладку <code>Архив</code>. После месячной загрузки проект автоматически подтянет сохранённый срез в этот блок.</span>
      <div class="tableActions">
        <button class="archiveButton accent" type="button" data-tab="archive">Перейти в архив</button>
      </div>
    </article>
  `;

  const historyPane = records.length ? `
    <article class="snapshotCard">
      <div class="snapshotCardTop">
        <div>
          <div class="snapshotEyebrow">История версий</div>
          <h4>Все загруженные уставы по проекту</h4>
          <p>Срез хранится отдельно от исходного файла и не перетирает предыдущие месяцы.</p>
        </div>
      </div>
      ${snapshotHistoryMarkup(project.code, records)}
    </article>
    ${selected ? snapshotDetailsMarkup(selected) : ""}
  ` : `
    <article class="snapshotEmpty subtle">
      <strong>История появится после первой загрузки.</strong>
      <span>Когда будет сохранён первый срез, здесь появятся версии уставов и детали по выбранному месяцу.</span>
    </article>
  `;

  const comparisonPane = records.length >= 2
    ? snapshotComparisonMarkup(project.code, records)
    : `
      <article class="snapshotEmpty subtle">
        <strong>Сравнение появится после второго среза.</strong>
        <span>Как только будет загружен следующий месяц, модуль покажет изменения автоматически.</span>
      </article>
    `;

  const graphsPane = latest ? `
    <article class="snapshotCard">
      <div class="snapshotCardTop">
        <div>
          <div class="snapshotEyebrow">Мини-графики</div>
          <h4>План / факт по KPI</h4>
          <p>Графики строятся из таблиц раздела 6 последнего загруженного устава.</p>
        </div>
      </div>
      ${snapshotTrendMarkup(latest)}
    </article>
  ` : `
    <article class="snapshotEmpty subtle">
      <strong>Графики появятся после первой загрузки.</strong>
      <span>Для построения трендов нужен хотя бы один сохранённый срез по проекту.</span>
    </article>
  `;

  return `
    <section class="infoBlock snapshotShell">
      <details class="snapshotDetails" data-snapshot-project="${escapeHtml(project.code)}" ${isOpen ? "open" : ""}>
        <summary class="snapshotSummaryBar">
          <div>
            <div class="snapshotKicker">6. Срезы план/факт</div>
            <strong>${escapeHtml(summaryLine)}</strong>
          </div>
          <div class="snapshotSummaryMeta">
            ${tag(status.tone, status.label)}
            <span>${escapeHtml(counterLine)}</span>
          </div>
        </summary>
        <div class="snapshotBody">
          ${message ? `<div class="archiveNotice">${escapeHtml(message)}</div>` : ""}
          <div class="archiveNotice">Загрузка уставов перенесена в раздел <strong>Архив</strong>. Здесь остаются только просмотр, история, сравнение и графики по уже сохранённым срезам.</div>
          <div class="snapshotTabBar">
            ${tabOptions.map((item) => `
              <button
                class="snapshotTabButton ${activeTab === item.id ? "active" : ""}"
                type="button"
                data-snapshot-tab-project="${escapeHtml(project.code)}"
                data-snapshot-tab="${escapeHtml(item.id)}"
                ${item.disabled ? "disabled" : ""}
              >
                ${escapeHtml(item.label)}
              </button>
            `).join("")}
          </div>
          <div class="snapshotPane" ${activeTab === "overview" ? "" : "hidden"}>
            ${overviewPane}
          </div>
          <div class="snapshotPane" ${activeTab === "history" ? "" : "hidden"}>
            ${historyPane}
          </div>
          <div class="snapshotPane" ${activeTab === "comparison" ? "" : "hidden"}>
            ${comparisonPane}
          </div>
          <div class="snapshotPane" ${activeTab === "graphs" ? "" : "hidden"}>
            ${graphsPane}
          </div>
        </div>
      </details>
    </section>
  `;
}

function projectCardsMarkup() {
  const model = currentDashboard();
  if (!model.projects.length) {
    return `
      <article class="card projectCard">
        <div class="projectTop">
          <div>
            <div class="projectCode">Шаблон</div>
            <h2 class="projectTitle">Операционные проекты пока не добавлены</h2>
            <div class="projectManager">В этот клон можно внести новый состав проектов без данных из предыдущего контура.</div>
          </div>
        </div>
        <div class="projectSummary">
          <section class="infoBlock">
            <h3>Что дальше</h3>
            <p>Добавьте новые проекты в данные сайта, и здесь снова появятся карточки со статусом, планом недели и срезами по уставам.</p>
          </section>
        </div>
      </article>
    `;
  }

  return model.projects.map((project) => {
    const plan = project.nextWeekPlan.map((item) => `
      <li class="nextPlanItem">
        <div class="nextPlanRow">
          <span class="nextPlanTask">${escapeHtml(item.task)}</span>
          <span class="nextPlanDue">${escapeHtml(item.due)}</span>
        </div>
        <div class="projectManager">${escapeHtml(item.owner)}</div>
        <div class="projectManager">${escapeHtml(item.result)}</div>
      </li>
    `).join("");

    const flags = [
      project.reportSubmitted && project.weeklyPackageLabel ? `<span class="chip">${escapeHtml(project.weeklyPackageLabel)}</span>` : "",
      project.reportSubmitted && project.weeklyPackageLabel && !project.weeklyComplete ? `<span class="chip warn">Неполный weekly</span>` : "",
      project.escalation ? `<span class="chip danger">Эскалация</span>` : "",
      project.protocolStatus !== project.status ? `<span class="chip warn">Rating ≠ Protocol</span>` : "",
      !project.reportSubmitted ? `<span class="chip danger">Не сдал weekly</span>` : ""
    ].filter(Boolean).join("");

    return `
      <article class="card projectCard">
        <div class="projectTop">
          <div>
            <div class="projectCode">${escapeHtml(project.code)}</div>
            <h2 class="projectTitle">${escapeHtml(project.name)}</h2>
            <div class="projectManager">РП: ${escapeHtml(project.manager)} · Заказчик: ${escapeHtml(project.customer)}</div>
          </div>
          ${tag(project.status, project.statusLabel)}
        </div>

        <div class="projectMetrics">
          <div class="projectMetric">
            <div class="projectMetricLabel">Балл недели</div>
            <div class="projectMetricValue">${project.score ?? "—"}</div>
          </div>
          <div class="projectMetric">
            <div class="projectMetricLabel">Прогресс</div>
            <div class="projectMetricValue">${project.progress ?? "—"}${project.progress != null ? "%" : ""}</div>
          </div>
          <div class="projectMetric">
            <div class="projectMetricLabel">Качество weekly</div>
            <div class="projectMetricValue">${project.quality ?? "—"}${project.quality != null ? "%" : ""}</div>
          </div>
          <div class="projectMetric">
            <div class="projectMetricLabel">Чек-лист</div>
            <div class="projectMetricValue">${project.greenChecks ?? "—"}${project.greenChecks != null ? "/18" : ""}</div>
          </div>
        </div>

        <div class="projectSummary">
          ${flags ? `<div class="projectFlags">${flags}</div>` : ""}
          <section class="infoBlock">
            <h3>Итог недели</h3>
            <p>${escapeHtml(project.weekSummary)}</p>
          </section>
          <section class="infoBlock">
            <h3>Ключевой риск</h3>
            <p>${escapeHtml(project.risk)}</p>
          </section>
          <section class="infoBlock">
            <h3>Критический следующий шаг</h3>
            <p>${escapeHtml(project.nextCriticalStep)}</p>
          </section>
          <section class="infoBlock">
            <h3>План следующей недели</h3>
            <ul class="nextPlanList">${plan}</ul>
          </section>
          ${project.deviations.length ? `
            <section class="infoBlock">
              <h3>Отклонения</h3>
              <ul class="methodList">${project.deviations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </section>
          ` : ""}
          ${projectSnapshotsMarkup(project)}
        </div>
      </article>
    `;
  }).join("");
}

function managerSort(a, b) {
  const scoreDiff = b.averageScore - a.averageScore;
  if (scoreDiff) return scoreDiff;
  const qualityDiff = b.averageQuality - a.averageQuality;
  if (qualityDiff) return qualityDiff;
  const escalationDiff = a.escalations - b.escalations;
  if (escalationDiff) return escalationDiff;
  const greenShareA = a.reportCount ? a.green / a.reportCount : 0;
  const greenShareB = b.reportCount ? b.green / b.reportCount : 0;
  if (greenShareB !== greenShareA) return greenShareB - greenShareA;
  return a.name.localeCompare(b.name, "ru");
}

function managersMarkup() {
  const model = currentDashboard();
  const sorted = [...model.managers].sort(managerSort);
  if (!sorted.length) {
    return `
      <section class="sectionStack">
        <article class="card methodIntro">
          <div class="panelHeader">
            <div>
              <h2>Накопительный рейтинг РП</h2>
              <p>Раздел готов, но данные руководителей появятся только после загрузки новых проектов и weekly.</p>
            </div>
          </div>
        </article>
      </section>
    `;
  }

  const cards = sorted.map((manager, index) => `
    <article class="card managerCard">
      <div class="managerCardTop">
        <h3 class="managerCardTitle">${escapeHtml(manager.name)}</h3>
        <span class="managerCardBadge">#${String(index + 1).padStart(2, "0")}</span>
      </div>
      <div class="metricValue" style="font-size:42px;margin-top:14px">${manager.averageScore.toFixed(2)}</div>
      <div class="metricSub">Средний балл за период · качество ${manager.averageQuality}% · эскалаций ${manager.escalations}</div>
    </article>
  `).join("");

  const rows = sorted.map((manager, index) => {
    const week = manager.weekProjects.map((item) => `${item.name}: ${item.score}`).join(" · ");
    return `
      <tr>
        <td class="managerRank">${String(index + 1).padStart(2, "0")}</td>
        <td>
          <div class="managerName">${escapeHtml(manager.name)}</div>
          <div class="managerSub">${manager.projects} проект(а) · ${manager.reportCount} weekly в накоплении</div>
        </td>
        <td class="managerScore">${manager.averageScore.toFixed(2)}</td>
        <td class="managerScore">${manager.totalScore}</td>
        <td>${manager.averageQuality}%</td>
        <td>${manager.escalations}</td>
        <td>${week ? escapeHtml(week) : "—"}</td>
      </tr>
    `;
  }).join("");

  return `
    <section class="sectionStack">
      <div class="managerCards">${cards}</div>
      <section class="card panelBody">
        <div class="panelHeader">
          <div>
            <h2>Накопительный рейтинг РП</h2>
            <p>Предлагаемое правило ранжирования встроено в методологию этой версии.</p>
          </div>
        </div>
        <div class="managerFormula">
          <strong>Предлагаемое правило:</strong> накопительный рейтинг РП считается как средний weekly-балл по всем проектам и неделям периода. 
          Если по активному проекту weekly не сдан, балл недели по нему считается как <strong>0</strong>. 
          При равенстве среднего балла места ранжируются по: 1) среднему качеству weekly, 2) меньшему числу эскалаций, 3) большей доле зелёных статусов.
        </div>
        <div class="managerTableShell" style="margin-top:18px">
          <table class="managerTable">
            <thead>
              <tr>
                <th>Место</th>
                <th>Руководитель</th>
                <th>Средний балл</th>
                <th>Итого баллов</th>
                <th>Качество</th>
                <th>Эскалации</th>
                <th>Неделя</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>
    </section>
  `;
}

function methodologyMarkup() {
  const validatorRows = state.fileChecks.length
    ? state.fileChecks.map((item) => `
        <div class="validatorRow ${item.valid ? "ok" : "bad"}">
          <div class="validatorName">${escapeHtml(item.name)}</div>
          <div class="validatorHint">${escapeHtml(item.message)}</div>
        </div>
      `).join("")
    : `<div class="validatorRow"><div class="validatorHint">Выберите файлы и сразу увидите, проходят ли они по правилу имени.</div></div>`;

  return `
    <section class="sectionStack">
      <article class="card methodIntro">
        <div class="panelHeader">
          <div>
            <h2>Как устроена методика в этой версии</h2>
            <p>Операционный статус, weekly-балл и итоговый контур проекта формирует агент на стороне протокола. Поверх weekly в карточки проектов добавлен отдельный месячный контур для срезов раздела 6 из уставов.</p>
          </div>
        </div>
        <p>
          В интерфейс добавлены те части, которых обычно не хватает на weekly: <strong>план следующей недели</strong>, требования к имени файлов,
          явные правила накопительного рейтинга РП, а также <strong>ежемесячные срезы план/факт</strong>, которые хранят исходный устав и его структурированные KPI отдельно.
        </p>
      </article>

      <div class="methodGrid">
        <article class="card methodCard">
          <h3>Обязательная карточка проекта</h3>
          <ul class="methodList">
            <li>Код и название проекта, заказчик и руководитель проекта.</li>
            <li>Итог недели, ключевой риск, критический следующий шаг.</li>
            <li>План следующей недели: действие, ответственный, срок, ожидаемый результат.</li>
            <li>Отклонения и признаки эскалации, если они есть.</li>
          </ul>
        </article>

        <article class="card methodCard">
          <h3>Ежемесячный срез устава</h3>
          <ul class="methodList">
            <li>Раз в месяц обновлённый markdown-устав загружается в раздел <strong>Архив</strong>.</li>
            <li>Система сама ищет раздел <strong>6. План/факт</strong> и забирает только таблицы KPI.</li>
            <li>Парсер понимает KPI-блоки как с заголовками <strong>###</strong>, так и <strong>####</strong>.</li>
            <li>Сохраняются две сущности: исходный файл устава и структурированный срез для интерфейса.</li>
            <li>Новый месяц не перезаписывает старые: история версий остаётся доступной по проекту, а в карточке проекта остаётся только просмотр.</li>
            <li>В штатном режиме weekly и уставы уходят через Cloudflare Worker в GitHub-репозиторий сайта.</li>
            <li>Менеджер вводит только общий пароль загрузки, а GitHub-доступ хранится внутри Worker.</li>
            <li>Кнопка выгрузки <code>archive-store.js</code> остаётся как резервный аварийный экспорт.</li>
          </ul>
        </article>

        <article class="card methodCard">
          <h3>Накопительный рейтинг РП</h3>
          <ul class="methodList">
            <li>Базовая единица расчёта: weekly-балл по проекту за неделю.</li>
            <li>Если weekly по активному проекту не сдан, за эту неделю по проекту ставится 0.</li>
            <li>Накопительный рейтинг РП = средний балл по всем проектам и неделям периода.</li>
            <li>Тай-брейки: качество weekly → меньше эскалаций → выше доля зелёных статусов.</li>
          </ul>
        </article>

        <article class="card methodCard">
          <h3>Что остаётся у агента</h3>
          <ul class="methodList">
            <li>Расчёт зелёного, жёлтого и красного статуса.</li>
            <li>Вес weekly-фактов, рисков, отклонений и эскалаций.</li>
            <li>Расчёт weekly-балла проекта.</li>
            <li>Интерфейс сразу пересчитывает сводку, карточки проектов и рейтинг РП после загрузки weekly в архив.</li>
            <li>Если отдельный <strong>rating</strong> не загружен, сайт временно берёт weekly-балл из статуса и чек-листа, чтобы панель всё равно обновлялась.</li>
          </ul>
        </article>

        <article class="card methodCard">
          <h3>Проверки при загрузке среза</h3>
          <ul class="methodList">
            <li>Проверяем, что в уставе найден раздел <strong>## 6. План/факт</strong>.</li>
            <li>Проверяем таблицы с колонками <strong>Месяц / План / Факт / Отклонение</strong>, в том числе если у <strong>Плана</strong> и <strong>Факта</strong> есть уточнения вроде <strong>(накопленно)</strong>.</li>
            <li>Сверяем код проекта из устава с кодом карточки и просим подтверждение, если он не совпал.</li>
            <li>Версия и дата устава читаются и в полном формате с бэктиками, и в обычной текстовой записи.</li>
            <li>Для дубля месяца пользователь выбирает: сохранить новой версией или заменить текущий месяц.</li>
            <li>Пустой факт не блокирует загрузку, но переводит срез в статус <strong>Требует проверки</strong>.</li>
          </ul>
        </article>

        <article class="card methodCard">
          <h3>Требования к документам</h3>
          <ul class="methodList">
            <li>Все weekly-документы именуются по единому шаблону.</li>
            <li>Обязательные части имени: тип документа, дата сдачи, номер проекта, название проекта.</li>
            <li>Если имя неидеальное, сайт сначала пытается восстановить правильный шаблон по содержимому weekly.</li>
            <li>Ручные приписки вроде <strong>final</strong> или <strong>(1)</strong> в репозиторий не попадают: при возможности сайт очищает их автоматически.</li>
          </ul>
          <ul class="namingExamples">
            <li><span class="codeLine">rating_04.05.2026_S-26-02_Партнер 2.0.md</span></li>
            <li><span class="codeLine">project_protocol_04.05.2026_S-26-02_Партнер 2.0.md</span></li>
            <li><span class="codeLine">checklist_04.05.2026_S-26-02_Партнер 2.0.xlsx</span></li>
          </ul>
        </article>

        <article class="card methodCard">
          <h3>Что видит пользователь</h3>
          <ul class="methodList">
            <li>В архиве: единое место загрузки weekly-документов и месячных уставов.</li>
            <li>В проекте: актуальный срез с краткой таблицей по основным KPI.</li>
            <li>В проекте: историю всех загруженных уставов по месяцам и версиям.</li>
            <li>Автосравнение с предыдущим месяцем без ручного открытия markdown-файлов.</li>
            <li>Мини-графики план/факт и детализацию таблиц по каждому KPI.</li>
          </ul>
        </article>
      </div>

      <article class="card methodCard">
        <div class="panelHeader">
          <div>
            <h2>Проверка имени файла</h2>
            <p>Это уже не просто памятка, а живой валидатор под загрузку людьми.</p>
          </div>
        </div>
        <div class="validator">
          <div class="validatorInput">
            <label class="fileLabel">
              Выбрать файлы
              <input id="validatorInput" type="file" multiple />
            </label>
            <div class="validatorHint">Поддерживаемые маски: rating / project_protocol / checklist. Если имя неидеальное, сайт попробует привести его автоматически.</div>
          </div>
          <div class="validatorResult">${validatorRows}</div>
        </div>
        <div class="footNote">
          Регулярность статусов, план задач, риски, критерии приёмки и эскалации берутся из проектной методологии. При этом weekly-цвет и балл проекта рассчитываются агентом, а месячные срезы раздела 6 сохраняются интерфейсом как отдельный управленческий слой.
        </div>
      </article>
    </section>
  `;
}

function archiveMarkup() {
  const repoArchive = readRepoArchiveData();
  const repoVersionLabel = repoArchive.version ? formatDate(repoArchive.version) : "ещё не сохранён";
  const protocols = state.archiveDocs.filter((item) => item.type === "project_protocol").length;
  const ratings = state.archiveDocs.filter((item) => item.type === "rating").length;
  const checklists = state.archiveDocs.filter((item) => item.type === "checklist").length;
  const snapshotCount = state.snapshotRecords.length;
  const totalDocuments = state.archiveDocs.length + snapshotCount;

  const rows = state.archiveDocs.length
    ? state.archiveDocs.map((item) => `
        <article class="archiveRow">
          <div class="archiveMain">
            <div class="archiveTitle">${escapeHtml(item.projectCode)} · ${escapeHtml(item.projectName)}</div>
            <div class="archiveMeta">
              <span>${escapeHtml(documentTypeLabel(item.type))}</span>
              <span>${escapeHtml(item.periodDate)}</span>
              <span>${escapeHtml(formatBytes(item.size))}</span>
              <span>Сохранён: ${escapeHtml(formatDate(item.savedAt))}</span>
            </div>
            <div class="archiveFileName">${escapeHtml(item.name)}</div>
            ${item.sourceName && item.sourceName !== item.name ? `<div class="archiveMeta"><span>Исходное имя: ${escapeHtml(item.sourceName)}</span></div>` : ""}
          </div>
          <div class="archiveActions">
            <button class="archiveButton" data-archive-download="${escapeHtml(item.id)}">Скачать</button>
            <button class="archiveButton ghost" data-archive-delete="${escapeHtml(item.id)}">Удалить</button>
          </div>
        </article>
      `).join("")
    : `
      <article class="archiveEmpty">
        <strong>Архив пока пуст.</strong>
        <span>${repoArchive.archiveDocs.length ? `В общем архиве уже есть ${repoArchive.archiveDocs.length} weekly-файлов, но локальный слой их сейчас не показал. Нажмите «Пересинхронизировать архив».` : "Загрузите протоколы и rating. Если есть чек-листы, сайт тоже примет их и учтёт в расчётах. Файлы сохранятся локально в браузере этого ноутбука и будут доступны для скачивания позже."}</span>
      </article>
    `;

  return `
    <section class="sectionStack">
      <article class="card methodIntro">
        <div class="panelHeader">
          <div>
            <h2>Архив документов</h2>
            <p>Единое место для weekly-документов и ежемесячных уставов проектов. Weekly загружаются раз в неделю, уставы актуализируются раз в месяц.</p>
          </div>
        </div>
        <p>
          Теперь общий архив публикуется через Cloudflare Worker. После успешной загрузки weekly или устава все вкладки сайта пересчитываются сразу, а остальные участники видят обновления после обычного обновления страницы.
        </p>
        <div class="snapshotFormGrid">
          <label class="field field-wide">
            <span>Пароль загрузки</span>
            <input type="password" data-github-token placeholder="Введите общий пароль" value="${escapeHtml(state.githubToken)}" ${state.githubPublishing ? "disabled" : ""} />
          </label>
          <label class="field">
            <span>Сервис загрузки</span>
            <input type="text" value="${escapeHtml(uploadServiceLabel())}" disabled />
          </label>
          <label class="field">
            <span>Сайт</span>
            <input type="text" value="${escapeHtml(uploadSiteId())}" disabled />
          </label>
        </div>
        <div class="archiveToolbar">
          <div class="validatorHint">
            Менеджер вводит только общий пароль. GitHub-доступ хранится внутри Cloudflare Worker, а сам сайт общается только с сервисом загрузки.
            Репозиторий данных: <code>${escapeHtml(repoLabel())}</code>, текущая версия общего архива: <code>${escapeHtml(repoVersionLabel)}</code>, weekly в общем файле: <code>${repoArchive.archiveDocs.length}</code>, уставов: <code>${repoArchive.snapshotRecords.length}</code>.
          </div>
          <label class="validatorHint"><input type="checkbox" data-github-remember ${state.githubRememberToken ? "checked" : ""} ${state.githubPublishing ? "disabled" : ""} /> Запомнить пароль на этом устройстве</label>
          <button class="archiveButton accent" type="button" data-github-save ${state.githubPublishing ? "disabled" : ""}>Сохранить пароль</button>
          <button class="archiveButton ghost" type="button" data-github-test ${state.githubToken ? "" : "disabled"} ${state.githubPublishing ? "disabled" : ""}>Проверить подключение</button>
          <button class="archiveButton ghost" type="button" data-archive-resync ${state.githubPublishing ? "disabled" : ""}>Пересинхронизировать архив</button>
          <button class="archiveButton ghost" type="button" data-github-clear ${state.githubToken ? "" : "disabled"} ${state.githubPublishing ? "disabled" : ""}>Очистить</button>
          <button class="archiveButton ghost" type="button" data-archive-export-repo ${state.githubPublishing ? "disabled" : ""}>Скачать ${REPO_ARCHIVE_FILE}</button>
        </div>
        ${state.githubStatus ? `<div class="archiveNotice">${escapeHtml(state.githubStatus)}</div>` : ""}
      </article>

      <section class="metricsGrid archiveMetrics">
        <article class="card metricCard tone-accent">
          <div class="metricLabel">Всего документов</div>
          <div class="metricValue">${totalDocuments}</div>
          <div class="metricSub">Weekly-документы и месячные уставы вместе.</div>
        </article>
        <article class="card metricCard tone-accent">
          <div class="metricLabel">Weekly-файлы</div>
          <div class="metricValue">${state.archiveDocs.length}</div>
          <div class="metricSub">Файлы недельного контура: протоколы, rating и при необходимости чек-листы.</div>
        </article>
        <article class="card metricCard tone-green">
          <div class="metricLabel">Уставы</div>
          <div class="metricValue">${snapshotCount}</div>
          <div class="metricSub">Месячные версии уставов и срезов раздела 6.</div>
        </article>
        <article class="card metricCard tone-green">
          <div class="metricLabel">Протоколы</div>
          <div class="metricValue">${protocols}</div>
          <div class="metricSub">Файлы типа <code>project_protocol</code>.</div>
        </article>
        <article class="card metricCard tone-yellow">
          <div class="metricLabel">Rating</div>
          <div class="metricValue">${ratings}</div>
          <div class="metricSub">Файлы типа <code>rating</code>.</div>
        </article>
        <article class="card metricCard tone-red">
          <div class="metricLabel">Чек-листы</div>
          <div class="metricValue">${checklists}</div>
          <div class="metricSub">Файлы типа <code>checklist</code>.</div>
        </article>
      </section>

      ${state.archiveMessage ? `<div class="archiveNotice">${escapeHtml(state.archiveMessage)}</div>` : ""}

      <article class="card methodCard">
        <div class="panelHeader">
          <div>
            <h2>Weekly-документы</h2>
            <p>Протоколы и rating загружаются раз в неделю и хранятся здесь же. Если пароль загрузки введён, сайт сразу отправляет их через сервис в общий репозиторий и обновляет все вкладки.</p>
          </div>
        </div>
        <div class="archiveToolbar">
          <label class="fileLabel">
            Добавить weekly-документы
            <input id="archiveInput" type="file" multiple accept=".md,.xlsx" ${state.githubPublishing ? "disabled" : ""} />
          </label>
          <button class="archiveButton accent" data-archive-download-all ${state.archiveDocs.length ? "" : "disabled"} ${state.githubPublishing ? "disabled" : ""}>Скачать weekly</button>
        </div>
        <div class="archiveList">
          ${state.archiveLoading ? `<article class="archiveEmpty"><span>Читаю локальный архив…</span></article>` : rows}
        </div>
      </article>

      <article class="card methodCard">
        <div class="panelHeader">
          <div>
            <h2>Уставы проектов</h2>
            <p>Уставы загружаются сюда раз в месяц. Сайт сам сохраняет исходный markdown и выделяет структурированный срез раздела 6.</p>
          </div>
        </div>
        ${snapshotArchiveFormMarkup()}
        <div class="archiveList">
          ${snapshotArchiveListMarkup()}
        </div>
      </article>
    </section>
  `;
}

function overviewMarkup() {
  const model = currentDashboard();
  const alertsMarkup = model.alerts.length
    ? model.alerts.map((alert) => `
        <article class="alertItem ${alert.level}">
          <div class="focusTop">
            <strong>${escapeHtml(alert.project)}</strong>
            <span class="alertMeta">${alert.level === "warning" ? "Внимание" : "Контроль"}</span>
          </div>
          <div class="alertMeta">${escapeHtml(alert.text)}</div>
        </article>
      `).join("")
    : `
      <article class="snapshotEmpty subtle">
        <strong>Алертов пока нет.</strong>
        <span>После добавления проектов сюда попадут только сигналы, которые действительно требуют внимания на встрече.</span>
      </article>
    `;

  return `
    <section class="sectionStack">
      <section class="metricsGrid">
        <article class="card metricCard tone-accent">
          <div class="metricLabel">Проекты с weekly</div>
          <div class="metricValue">${model.summary.reportsForNewWeek}</div>
          <div class="metricSub">Из ${model.summary.projects} проектов. Полный комплект: ${model.summary.completeReports ?? 0}, частично: ${model.summary.partialReports ?? 0}.</div>
        </article>
        <article class="card metricCard tone-red">
          <div class="metricLabel">Не закрыт weekly</div>
          <div class="metricValue">${model.summary.incompleteReports ?? model.summary.missingReports}</div>
          <div class="metricSub"><ul class="methodList">${incompleteList()}</ul></div>
        </article>
        <article class="card metricCard tone-green">
          <div class="metricLabel">Качество weekly</div>
          <div class="metricValue">${model.summary.averageQuality != null ? `${model.summary.averageQuality}%` : "—"}</div>
          <div class="metricSub">${model.summary.totalPossibleChecks ? `${model.summary.totalGreenChecks} зелёных пунктов из ${model.summary.totalPossibleChecks} по сданным отчётам недели.` : "Чек-листы и rating за новую неделю ещё не догружены."}</div>
        </article>
        <article class="card metricCard tone-yellow">
          <div class="metricLabel">Светофор недели</div>
          <div class="metricValue">${model.summary.green}/${model.summary.yellow}/${model.summary.red}</div>
          <div class="metricSub">Зелёных: ${model.summary.green}, жёлтых: ${model.summary.yellow}, красных: ${model.summary.red}.</div>
        </article>
        <article class="card metricCard ${model.summary.escalations ? "tone-red" : "tone-accent"}">
          <div class="metricLabel">Эскалации</div>
          <div class="metricValue">${model.summary.escalations}</div>
          <div class="metricSub">Выведены отдельно, чтобы weekly не выглядел зелёным до последнего.</div>
        </article>
      </section>

      <section class="twoCol">
        <article class="card panelBody">
          <div class="panelHeader">
            <div>
              <h2>Фокус следующей недели</h2>
              <p>Самое важное по проектам без открытия исходных markdown-файлов.</p>
            </div>
          </div>
          <div class="focusList">${nextWeekFocusMarkup()}</div>
        </article>

        <article class="card panelBody">
          <div class="panelHeader">
            <div>
              <h2>Алерты weekly</h2>
              <p>Не общий шум, а то, что требует внимания на встрече.</p>
            </div>
          </div>
          <div class="alertsList">
            ${alertsMarkup}
          </div>
        </article>
      </section>

      <section class="card panelBody">
        <div class="panelHeader">
          <div>
            <h2>История статусов по неделям</h2>
            <p>Динамика по цветам и среднему качеству weekly.</p>
          </div>
        </div>
        <div class="historyGrid">${historyMarkup()}</div>
      </section>
    </section>
  `;
}

function activeTabMarkup() {
  switch (state.activeTab) {
    case "projects":
      return `<section class="sectionStack"><div class="projectsGrid">${projectCardsMarkup()}</div></section>`;
    case "managers":
      return managersMarkup();
    case "methodology":
      return methodologyMarkup();
    case "archive":
      return archiveMarkup();
    case "overview":
    default:
      return overviewMarkup();
  }
}

function render() {
  const model = currentDashboard();
  app.innerHTML = `
    <main class="appShell">
      <section class="hero">
        <article class="heroMain">
          <span class="heroEyebrow">Операционный контур B2B</span>
          <h1 class="heroTitle">Операционные проекты B2B</h1>
          <p class="heroLead">
            Единая weekly-панель для проектников: здесь видно текущий статус проекта, ключевые риски,
            план на следующую неделю, эскалации и качество weekly-отчёта без необходимости открывать каждый документ отдельно.
          </p>
          <div class="heroMeta">
            <span class="metaBadge">Период weekly: <code>${escapeHtml(model.latestPeriod)}</code></span>
            <span class="metaBadge">Обновлено: <code>${escapeHtml(formatDate(model.generatedAt))}</code></span>
            <span class="metaBadge">Проектов: <code>${model.summary.projects}</code></span>
          </div>
        </article>

        <aside class="heroAside">
          <div>
            <p class="asideCaption">Смысл интерфейса</p>
            <p class="asideValue">Weekly, который не заставляет открывать документы</p>
          </div>
          <div class="trafficMini">
            <article class="trafficMiniCard">
              <div class="trafficMiniLabel">Зелёный</div>
              <div class="trafficMiniValue" style="color:var(--green)">${model.summary.green}</div>
            </article>
            <article class="trafficMiniCard">
              <div class="trafficMiniLabel">Жёлтый</div>
              <div class="trafficMiniValue" style="color:var(--yellow)">${model.summary.yellow}</div>
            </article>
            <article class="trafficMiniCard">
              <div class="trafficMiniLabel">Нет отчёта</div>
              <div class="trafficMiniValue" style="color:var(--red)">${model.summary.missingReports}</div>
            </article>
          </div>
        </aside>
      </section>

      <nav class="tabs">
        ${tabs.map((tab) => `
          <button class="tabButton ${state.activeTab === tab.id ? "active" : ""}" data-tab="${tab.id}">
            ${escapeHtml(tab.label)}
          </button>
        `).join("")}
      </nav>

      ${activeTabMarkup()}
    </main>
  `;

  app.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      render();
    });
  });

  const validatorInput = document.getElementById("validatorInput");
  if (validatorInput) {
    validatorInput.addEventListener("change", async (event) => {
      const files = [...event.target.files];
      state.fileChecks = await Promise.all(files.map(inspectWeeklyFile));
      render();
    });
  }

  const archiveInput = document.getElementById("archiveInput");
  if (archiveInput) {
    archiveInput.addEventListener("change", async (event) => {
      const files = [...event.target.files];
      await saveArchiveFiles(files);
      event.target.value = "";
    });
  }

  const exportRepoButton = app.querySelector("[data-archive-export-repo]");
  if (exportRepoButton) {
    exportRepoButton.addEventListener("click", async () => {
      await exportRepoArchiveFile();
    });
  }

  const archiveResyncButton = app.querySelector("[data-archive-resync]");
  if (archiveResyncButton) {
    archiveResyncButton.addEventListener("click", async () => {
      await refreshArchiveState();
    });
  }

  const githubTokenInput = app.querySelector("[data-github-token]");
  if (githubTokenInput) {
    githubTokenInput.addEventListener("input", () => {
      state.githubToken = githubTokenInput.value.trim();
    });
  }

  const githubRememberInput = app.querySelector("[data-github-remember]");
  if (githubRememberInput) {
    githubRememberInput.addEventListener("change", () => {
      state.githubRememberToken = githubRememberInput.checked;
    });
  }

  const githubSaveButton = app.querySelector("[data-github-save]");
  if (githubSaveButton) {
    githubSaveButton.addEventListener("click", () => {
      if (!state.githubToken.trim()) {
        state.githubStatus = "Сначала вставьте пароль загрузки.";
      } else {
        persistGitHubSyncSettings();
        state.githubStatus = "Пароль загрузки сохранён на этом устройстве.";
      }
      render();
    });
  }

  const githubTestButton = app.querySelector("[data-github-test]");
  if (githubTestButton) {
    githubTestButton.addEventListener("click", async () => {
      await testGitHubConnection();
    });
  }

  const githubClearButton = app.querySelector("[data-github-clear]");
  if (githubClearButton) {
    githubClearButton.addEventListener("click", () => {
      clearGitHubSyncSettings();
      render();
    });
  }

  app.querySelectorAll("[data-snapshot-project]").forEach((details) => {
    details.addEventListener("toggle", () => {
      state.openSnapshotProjects[details.dataset.snapshotProject] = details.open;
    });
  });

  const archiveSnapshotForm = app.querySelector("[data-archive-snapshot-form]");
  if (archiveSnapshotForm) {
    archiveSnapshotForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveSnapshotFromArchiveForm(archiveSnapshotForm);
    });
  }

  app.querySelectorAll("[data-snapshot-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const projectCode = button.dataset.snapshotTabProject;
      state.snapshotTabs[projectCode] = button.dataset.snapshotTab;
      state.openSnapshotProjects[projectCode] = true;
      render();
    });
  });

  app.querySelectorAll("[data-snapshot-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.snapshotRecords.find((record) => record.id === button.dataset.snapshotOpen);
      if (!item) return;
      state.activeTab = "projects";
      state.selectedSnapshotIds[item.projectCode] = item.id;
      state.snapshotTabs[item.projectCode] = "history";
      state.openSnapshotProjects[item.projectCode] = true;
      render();
    });
  });

  app.querySelectorAll("[data-snapshot-compare]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.snapshotRecords.find((record) => record.id === button.dataset.snapshotCompare);
      if (!item) return;
      state.compareSnapshotIds[item.projectCode] = item.id;
      state.snapshotTabs[item.projectCode] = "comparison";
      state.openSnapshotProjects[item.projectCode] = true;
      render();
    });
  });

  app.querySelectorAll("[data-snapshot-download]").forEach((button) => {
    button.addEventListener("click", async () => {
      await downloadSnapshotDocument(button.dataset.snapshotDownload);
    });
  });

  app.querySelectorAll("[data-snapshot-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      await deleteSnapshotDocument(button.dataset.snapshotDelete);
    });
  });

  app.querySelectorAll("[data-snapshot-verify]").forEach((button) => {
    button.addEventListener("click", async () => {
      await toggleSnapshotVerification(button.dataset.snapshotVerify);
    });
  });

  app.querySelectorAll("[data-archive-download]").forEach((button) => {
    button.addEventListener("click", async () => {
      await downloadArchiveDocument(button.dataset.archiveDownload);
    });
  });

  app.querySelectorAll("[data-archive-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      await deleteArchiveDocument(button.dataset.archiveDelete);
    });
  });

  const downloadAllButton = app.querySelector("[data-archive-download-all]");
  if (downloadAllButton) {
    downloadAllButton.addEventListener("click", async () => {
      await downloadAllArchiveDocuments();
    });
  }
}

function validateFileName(file) {
  return inspectWeeklyFile(file);
}

async function refreshSnapshotState() {
  state.snapshotLoading = true;
  render();
  try {
    await seedCharterSnapshots();
    state.snapshotRecords = await snapshotGetAll();
  } catch (error) {
    state.snapshotMessages.__global = `Не удалось прочитать срезы раздела 6: ${error.message}`;
  } finally {
    state.snapshotLoading = false;
    render();
  }
}

async function refreshArchiveState() {
  state.archiveLoading = true;
  render();
  try {
    hydrateGitHubSyncSettings();
    const rollbackDone = await rollbackSeededArchiveDocs();
    try {
      await refreshRemoteRepoArchiveData();
    } catch (error) {
      state.githubStatus = `Работаю по встроенной копии архива: ${error.message}`;
    }
    await syncRepoArchiveSeed(true, true);
    state.archiveDocs = await archiveGetAll();
    state.snapshotRecords = await snapshotGetAll();
    await rebuildDashboardModel();
    if (rollbackDone) {
      state.archiveMessage = "Автозагрузка из папок отменена. Импортированные документы убраны из локального архива.";
    }
  } catch (error) {
    state.archiveMessage = `Не удалось прочитать локальный архив: ${error.message}`;
  } finally {
    state.archiveLoading = false;
    render();
  }
}

async function initializeArchiveLayer() {
  hydrateGitHubSyncSettings();
  state.archiveLoading = true;
  state.snapshotLoading = true;
  render();

  try {
    const rollbackDone = await rollbackSeededArchiveDocs();
    await seedCharterSnapshots();
    try {
      await refreshRemoteRepoArchiveData();
    } catch (error) {
      state.githubStatus = `Общий архив из GitHub сейчас не прочитался, использую встроенную копию: ${error.message}`;
    }
    const repoSync = await syncRepoArchiveSeed(true, true);
    state.archiveDocs = await archiveGetAll();
    state.snapshotRecords = await snapshotGetAll();
    await rebuildDashboardModel();

    if (rollbackDone) {
      state.archiveMessage = "Автозагрузка из папок отменена. Импортированные документы убраны из локального архива.";
    } else if (repoSync.importedDocs || repoSync.importedSnapshots) {
      state.archiveMessage = `Из ${REPO_ARCHIVE_FILE} подгружено ${repoSync.importedDocs} weekly-файлов и ${repoSync.importedSnapshots} уставов.`;
    }
  } catch (error) {
    state.archiveMessage = `Не удалось прочитать архив: ${error.message}`;
    state.snapshotMessages.__global = `Не удалось прочитать срезы раздела 6: ${error.message}`;
  } finally {
    state.archiveLoading = false;
    state.snapshotLoading = false;
    render();
  }
}

async function buildRepoArchivePayload() {
  const archiveDocs = [];
  for (const item of [...state.archiveDocs].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))) {
    archiveDocs.push({
      id: item.id,
      name: item.name,
      sourceName: item.sourceName || "",
      type: item.type,
      projectCode: item.projectCode,
      projectName: item.projectName,
      periodDate: item.periodDate,
      ext: item.ext,
      size: item.size,
      mime: item.mime,
      savedAt: item.savedAt,
      filePath: item.filePath || "",
      contentBase64: item.filePath ? "" : (item.blob ? await blobToBase64(item.blob) : "")
    });
  }

  const snapshotRecords = [...state.snapshotRecords].sort(compareSnapshotRecords).map((item) => ({
    id: item.id,
    projectCode: item.projectCode,
    projectName: item.projectName,
    snapshotMonth: item.snapshotMonth,
    charterVersion: item.charterVersion,
    charterDate: item.charterDate,
    section: item.section,
    metrics: item.metrics,
    warnings: item.warnings,
    errors: item.errors,
    status: item.status,
    uploadedAt: item.uploadedAt,
    uploadedBy: item.uploadedBy,
    comment: item.comment,
    verifiedAt: item.verifiedAt || "",
    sourceFileName: item.sourceFileName,
    sourceMime: item.sourceMime,
    sourceSize: item.sourceSize,
    sourceText: item.sourceFilePath ? "" : (item.sourceText || ""),
    sourceFilePath: item.sourceFilePath || ""
  }));

  return {
    site: ARCHIVE_DB,
    version: new Date().toISOString(),
    archiveDocs,
    snapshotRecords
  };
}

function downloadTextFile(filename, text, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportRepoArchiveFile() {
  const payload = await buildRepoArchivePayload();
  const fileBody = `window.archiveRepoData = ${JSON.stringify(payload, null, 2)};\n`;
  downloadTextFile(REPO_ARCHIVE_FILE, fileBody, "text/javascript;charset=utf-8");
  state.archiveMessage = `Файл ${REPO_ARCHIVE_FILE} скачан. Замените им одноимённый файл в папке сайта и закоммитьте в репозиторий.`;
  render();
}

function activeGitHubToken() {
  return state.githubToken.trim();
}

async function publishRepoArchiveStateToGitHub(token, message) {
  const payload = await buildRepoArchivePayload();
  const fileBody = `window.archiveRepoData = ${JSON.stringify(payload, null, 2)};\n`;
  const contentBase64 = await blobToBase64(new Blob([fileBody], { type: "text/javascript;charset=utf-8" }));
  await githubPutContent(REPO_ARCHIVE_FILE, contentBase64, message, token);
  globalThis.archiveRepoData = payload;
  localStorage.setItem(REPO_ARCHIVE_SYNC_KEY, payload.version);
  return payload;
}

async function publishWeeklyFilesToGitHub(files, token) {
  for (const file of files) {
    const blob = new Blob([await file.arrayBuffer()], {
      type: file.type || "application/octet-stream"
    });
    const contentBase64 = await blobToBase64(blob);
    await githubPutContent(
      `archive/weekly/${file.name}`,
      contentBase64,
      `Upload weekly ${file.name}`,
      token
    );

    const existing = state.archiveDocs.find((item) => item.id === file.name);
    if (existing) {
      await archivePut({
        ...existing,
        filePath: `./archive/weekly/${file.name}`
      });
    }
  }
}

async function publishSnapshotSourceToGitHub(file, token) {
  const blob = new Blob([await file.arrayBuffer()], {
    type: file.type || "text/markdown"
  });
  const contentBase64 = await blobToBase64(blob);
  const repoPath = `archive/charters/${file.name}`;
  await githubPutContent(repoPath, contentBase64, `Upload charter ${file.name}`, token);
  return `./${repoPath}`;
}

async function testGitHubConnection() {
  if (!uploadApiConfigured()) {
    state.githubStatus = "Сервис общей загрузки пока не настроен. Сначала заполните upload-config.js.";
    render();
    return;
  }

  const password = activeGitHubToken();
  if (!password) {
    state.githubStatus = "Сначала вставьте пароль загрузки.";
    render();
    return;
  }

  state.githubPublishing = true;
  state.githubStatus = "Проверяю сервис общей загрузки…";
  render();

  try {
    const result = await callUploadApi("/health");
    state.githubStatus = `Сервис подключён: можно публиковать в ${result.repo}.`;
    persistGitHubSyncSettings();
  } catch (error) {
    state.githubStatus = `Не удалось проверить пароль или сервис загрузки: ${error.message}`;
  } finally {
    state.githubPublishing = false;
    render();
  }
}

async function saveSnapshotFromArchiveForm(form) {
  const file = form.querySelector("[data-snapshot-file]")?.files?.[0];
  const snapshotMonth = form.querySelector("[data-snapshot-month]")?.value;
  const uploadedBy = form.querySelector("[data-snapshot-author]")?.value?.trim() || "";
  const expectedProjectCode = form.querySelector("[data-snapshot-expected-code]")?.value?.trim()?.toUpperCase() || "";
  const comment = form.querySelector("[data-snapshot-comment]")?.value?.trim() || "";
  const strategy = form.querySelector("[data-snapshot-strategy]")?.value || "new-version";

  if (!file) {
    state.archiveMessage = "Файл устава не выбран.";
    render();
    return;
  }

  if (!snapshotMonth) {
    state.archiveMessage = "Укажите месяц среза перед загрузкой.";
    render();
    return;
  }

  const text = await file.text();
  const parsed = parseCharterSnapshot(text, expectedProjectCode, snapshotMonth);
  const projectCode = parsed.projectCode || expectedProjectCode;

  if (parsed.errors.length) {
    state.archiveMessage = parsed.errors.join(" ");
    render();
    return;
  }

  if (parsed.projectCode && expectedProjectCode && parsed.projectCode !== expectedProjectCode) {
    const confirmed = window.confirm(
      `В уставе найден код ${parsed.projectCode}, а в форме указан ${expectedProjectCode}. Сохранить срез всё равно?`
    );
    if (!confirmed) {
      state.archiveMessage = "Загрузка отменена: код проекта в файле не подтверждён.";
      render();
      return;
    }
  }

  const existingMonth = state.snapshotRecords.filter(
    (record) => record.projectCode === projectCode && record.snapshotMonth === snapshotMonth
  );
  const replaceSnapshotIds = existingMonth.length && strategy === "replace-month"
    ? existingMonth.map((record) => record.id)
    : [];

  if (existingMonth.length && strategy === "replace-month") {
    const confirmed = window.confirm(
      `За ${parseMonthInput(snapshotMonth)} уже есть ${existingMonth.length} срез(а). Заменить их новой загрузкой?`
    );
    if (!confirmed) {
      state.archiveMessage = "Замена месяца отменена.";
      render();
      return;
    }

    for (const record of existingMonth) {
      await snapshotDelete(record.id);
    }
  }

  if (uploadedBy) {
    localStorage.setItem("project-snapshot-author", uploadedBy);
  }

  const status = parsed.warnings.length ? "needs-review" : "uploaded";
  const uploadedAt = new Date().toISOString();
  const record = {
    id: buildSnapshotId(projectCode, snapshotMonth, parsed.charterVersion),
    projectCode,
    projectName: parsed.projectName,
    snapshotMonth,
    charterVersion: parsed.charterVersion,
    charterDate: parsed.charterDate,
    section: parsed.section,
    metrics: parsed.metrics,
    warnings: parsed.warnings,
    errors: parsed.errors,
    status,
    uploadedAt,
    uploadedBy: uploadedBy || "Не указан",
    comment,
    sourceFileName: file.name,
    sourceMime: file.type || "text/markdown",
    sourceSize: file.size,
    sourceText: text,
    sourceFilePath: ""
  };

  const token = activeGitHubToken();
  let sharedPublished = false;
  let publishedResult = null;

  if (uploadApiConfigured() && token) {
    state.githubPublishing = true;
    state.githubStatus = `Отправляю устав ${projectCode} в общий архив…`;
    render();
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      formData.append("record", JSON.stringify({
        ...record,
        sourceText: "",
        sourceFilePath: ""
      }));
      formData.append("replaceSnapshotIds", JSON.stringify(replaceSnapshotIds));
      const result = await callUploadApi("/charter/upload", {
        method: "POST",
        body: formData
      });
      publishedResult = result;
      record.sourceFilePath = result.record?.sourceFilePath || `./archive/charters/${file.name}`;
      record.sourceText = "";
      sharedPublished = true;
      persistGitHubSyncSettings();
      state.githubStatus = `Устав ${file.name} отправлен в общий архив.`;
    } catch (error) {
      state.githubStatus = `Устав пока сохранён только локально: ${error.message}`;
    } finally {
      state.githubPublishing = false;
      render();
    }
  }

  await snapshotPut(record);
  state.snapshotRecords = await snapshotGetAll();
  state.selectedSnapshotIds[projectCode] = record.id;
  state.compareSnapshotIds[projectCode] = record.id;
  state.snapshotTabs[projectCode] = "overview";
  state.openSnapshotProjects[projectCode] = true;

  if (sharedPublished) {
    state.githubPublishing = true;
    state.githubStatus = "Обновляю общий архив уставов на сайте…";
    render();
    try {
      await syncArchiveFromUploadResult(publishedResult);
      state.githubStatus = `Устав ${projectCode} опубликован в общий архив ${repoLabel()}.`;
    } catch (error) {
      state.githubStatus = `Устав загружен локально, но общий архив не обновился: ${error.message}`;
    } finally {
      state.githubPublishing = false;
      render();
    }
  }

  const duplicateText = existingMonth.length && strategy === "new-version"
    ? " Срез сохранён как новая версия того же месяца."
    : "";
  const warningText = parsed.warnings.length
    ? ` Предупреждения: ${parsed.warnings.join(" ")}`
    : "";
  const localReason = !uploadApiConfigured()
    ? " Сервис общей загрузки ещё не настроен."
    : token
      ? ""
      : " Чтобы его увидели все, введите пароль загрузки.";
  state.archiveMessage = sharedPublished
    ? `Устав ${projectCode} за ${parseMonthInput(snapshotMonth)} сохранён и опубликован.${duplicateText}${warningText}`
    : `Устав ${projectCode} за ${parseMonthInput(snapshotMonth)} сохранён локально.${duplicateText}${warningText}${localReason}`;
  state.snapshotMessages[projectCode] = state.archiveMessage;

  form.reset();
  const authorField = form.querySelector("[data-snapshot-author]");
  if (authorField) {
    authorField.value = localStorage.getItem("project-snapshot-author") || "";
  }
  render();
}

async function saveArchiveFiles(files) {
  if (!files.length) {
    state.archiveMessage = "Файлы не выбраны.";
    render();
    return;
  }

  const existingIds = new Set(state.archiveDocs.map((item) => item.id));
  const previousLatestWeek = currentDashboard()?.summary?.newestReportDate || "";
  const checks = await Promise.all(files.map(inspectWeeklyFile));
  state.fileChecks = checks;

  const invalid = checks.filter((item) => !item.valid);
  if (invalid.length) {
    state.archiveMessage = "Часть файлов не сохранена: для них не удалось автоматически определить тип, дату или проект.";
    render();
    return;
  }

  const uploadedDocs = [];
  let renamedCount = 0;
  let replacedCount = 0;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const check = checks[index];
    const { parsed, resolvedName } = check;
    if (resolvedName !== file.name) {
      renamedCount += 1;
    }
    if (existingIds.has(resolvedName)) {
      replacedCount += 1;
    }
    const blob = new Blob([await file.arrayBuffer()], {
      type: file.type || "application/octet-stream"
    });
    const savedAt = new Date().toISOString();
    await archivePut({
      id: resolvedName,
      name: resolvedName,
      sourceName: file.name,
      type: parsed.type,
      projectCode: parsed.projectCode,
      projectName: parsed.projectName,
      periodDate: parsed.date,
      ext: parsed.ext,
      size: file.size,
      mime: file.type || "application/octet-stream",
      savedAt,
      filePath: "",
      blob
    });
    uploadedDocs.push({
      id: resolvedName,
      name: resolvedName,
      sourceName: file.name,
      targetName: resolvedName,
      type: parsed.type,
      projectCode: parsed.projectCode,
      projectName: parsed.projectName,
      periodDate: parsed.date,
      ext: parsed.ext,
      size: file.size,
      mime: file.type || "application/octet-stream",
      savedAt,
      filePath: `./archive/weekly/${resolvedName}`
    });
  }

  state.archiveDocs = await archiveGetAll();
  await rebuildDashboardModel();
  const latestWeekAfterSave = currentDashboard()?.summary?.newestReportDate || "";
  const uploadedWeeks = [...new Set(uploadedDocs.map((item) => item.periodDate).filter(Boolean))];
  const uploadedOnlyPastWeeks = uploadedWeeks.length
    && latestWeekAfterSave
    && uploadedWeeks.every((week) => week !== latestWeekAfterSave)
    && (previousLatestWeek ? previousLatestWeek === latestWeekAfterSave : true);
  const token = activeGitHubToken();

  if (!uploadApiConfigured()) {
    state.archiveMessage = `Сохранено файлов: ${files.length}.${renamedCount ? ` Автопереименовано: ${renamedCount}.` : ""}${replacedCount ? ` Обновлено существующих weekly: ${replacedCount}.` : ""}${uploadedOnlyPastWeeks ? ` Файлы относятся к более ранней неделе (${uploadedWeeks.join(", ")}), поэтому верхняя сводка текущей недели не изменилась.` : ""} Сейчас они видны только локально в этом браузере, потому что сервис общей загрузки ещё не настроен.`;
    render();
    return;
  }

  if (!token) {
    state.archiveMessage = `Сохранено файлов: ${files.length}.${renamedCount ? ` Автопереименовано: ${renamedCount}.` : ""}${replacedCount ? ` Обновлено существующих weekly: ${replacedCount}.` : ""}${uploadedOnlyPastWeeks ? ` Файлы относятся к более ранней неделе (${uploadedWeeks.join(", ")}), поэтому верхняя сводка текущей недели не изменилась.` : ""} Сейчас они видны только локально в этом браузере. Чтобы weekly увидели все, введите пароль загрузки.`;
    render();
    return;
  }

  state.githubPublishing = true;
  state.githubStatus = "Отправляю weekly в общий архив…";
  render();

  try {
    const formData = new FormData();
    formData.append("documents", JSON.stringify(uploadedDocs));
    for (let index = 0; index < files.length; index += 1) {
      formData.append("files", files[index], checks[index].resolvedName);
    }
    const result = await callUploadApi("/weekly/upload", {
      method: "POST",
      body: formData
    });
    await syncArchiveFromUploadResult(result);
    persistGitHubSyncSettings();
    state.archiveMessage = `Сохранено и опубликовано файлов: ${files.length}.${renamedCount ? ` Автопереименовано: ${renamedCount}.` : ""}${replacedCount ? ` Обновлено существующих weekly: ${replacedCount}.` : ""}${uploadedOnlyPastWeeks ? ` Файлы относятся к более ранней неделе (${uploadedWeeks.join(", ")}), поэтому верхняя сводка текущей недели не изменилась, а история и динамика пересчитаны.` : " Все вкладки сайта обновлены по общему архиву."}`;
    state.githubStatus = `Weekly опубликованы в общий архив ${repoLabel()}.`;
  } catch (error) {
    state.archiveMessage = `Файлы сохранены локально, но не опубликованы в общий архив: ${error.message}`;
    state.githubStatus = `Не удалось отправить weekly через сервис загрузки: ${error.message}`;
  } finally {
    state.githubPublishing = false;
  }
  render();
}

async function downloadSnapshotDocument(id) {
  const item = state.snapshotRecords.find((record) => record.id === id);
  if (!item) return;

  if (item.sourceFilePath) {
    const link = document.createElement("a");
    link.href = resolveArchiveFileUrl(item.sourceFilePath, item.uploadedAt || item.id || Date.now());
    link.download = item.sourceFileName || `${item.projectCode}_${item.snapshotMonth}.md`;
    document.body.append(link);
    link.click();
    link.remove();
    return;
  }

  if (!item.sourceText) {
    state.snapshotMessages[item.projectCode] = "Для этого demo-среза исходный markdown не вложен. Загрузите реальный устав, и скачивание появится.";
    state.archiveMessage = state.snapshotMessages[item.projectCode];
    state.openSnapshotProjects[item.projectCode] = true;
    render();
    return;
  }

  const blob = new Blob([item.sourceText], { type: item.sourceMime || "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = item.sourceFileName || `${item.projectCode}_${item.snapshotMonth}.md`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadArchiveDocument(id) {
  const item = state.archiveDocs.find((doc) => doc.id === id);
  if (!item) return;
  if (item.filePath && !item.blob) {
    const link = document.createElement("a");
    link.href = resolveArchiveFileUrl(item.filePath, item.savedAt || item.id || Date.now());
    link.download = item.name;
    document.body.append(link);
    link.click();
    link.remove();
    return;
  }
  if (!item.blob) return;
  const url = URL.createObjectURL(item.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = item.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function deleteArchiveDocument(id) {
  const item = state.archiveDocs.find((doc) => doc.id === id);
  await archiveDelete(id);
  state.archiveDocs = await archiveGetAll();
  await rebuildDashboardModel();
  const token = activeGitHubToken();

  if (item && uploadApiConfigured() && token) {
    state.githubPublishing = true;
    state.githubStatus = `Удаляю ${item.name} из общего архива…`;
    render();
    try {
      const result = await callUploadApi("/weekly/delete", {
        method: "POST",
        body: {
          documentId: item.id,
          fileName: item.name
        }
      });
      await syncArchiveFromUploadResult(result);
      state.archiveMessage = "Документ удалён из локального и общего архива.";
      state.githubStatus = `Документ ${item.name} удалён из ${repoLabel()}.`;
    } catch (error) {
      state.archiveMessage = `Документ удалён локально, но не удалён из общего архива: ${error.message}`;
      state.githubStatus = `Не удалось удалить weekly через сервис загрузки: ${error.message}`;
    } finally {
      state.githubPublishing = false;
      render();
    }
    return;
  }

  state.archiveMessage = "Документ удалён из локального архива.";
  render();
}

async function deleteSnapshotDocument(id) {
  const item = state.snapshotRecords.find((record) => record.id === id);
  if (!item) return;

  const confirmed = window.confirm(`Удалить срез ${parseMonthInput(item.snapshotMonth)} (${item.charterVersion})?`);
  if (!confirmed) return;

  await snapshotDelete(id);
  state.snapshotRecords = await snapshotGetAll();
  state.snapshotMessages[item.projectCode] = "Срез удалён из локального архива.";
  state.archiveMessage = `Срез ${item.projectCode} за ${parseMonthInput(item.snapshotMonth)} удалён из локального архива.`;
  state.openSnapshotProjects[item.projectCode] = true;

  if (state.selectedSnapshotIds[item.projectCode] === id) {
    delete state.selectedSnapshotIds[item.projectCode];
  }
  if (state.compareSnapshotIds[item.projectCode] === id) {
    delete state.compareSnapshotIds[item.projectCode];
  }

  const token = activeGitHubToken();
  if (uploadApiConfigured() && token) {
    state.githubPublishing = true;
    state.githubStatus = `Обновляю общий архив уставов после удаления ${item.projectCode}…`;
    render();
    try {
      const result = await callUploadApi("/charter/delete", {
        method: "POST",
        body: {
          snapshotId: item.id,
          sourceFilePath: item.sourceFilePath || ""
        }
      });
      await syncArchiveFromUploadResult(result);
      state.githubStatus = `Срез ${item.projectCode} удалён из общего архива ${repoLabel()}.`;
    } catch (error) {
      state.githubStatus = `Срез удалён локально, но общий архив не обновился: ${error.message}`;
    } finally {
      state.githubPublishing = false;
      render();
    }
    return;
  }

  render();
}

async function toggleSnapshotVerification(id) {
  const item = state.snapshotRecords.find((record) => record.id === id);
  if (!item) return;

  const updated = {
    ...item,
    verifiedAt: item.verifiedAt ? "" : new Date().toISOString(),
    status: item.verifiedAt ? "uploaded" : "verified"
  };
  await snapshotPut(updated);
  state.snapshotRecords = await snapshotGetAll();
  state.snapshotMessages[item.projectCode] = item.verifiedAt
    ? "Проверка снята: срез снова в рабочем статусе."
    : "Срез отмечен как проверенный.";
  state.archiveMessage = state.snapshotMessages[item.projectCode];
  state.openSnapshotProjects[item.projectCode] = true;

  const token = activeGitHubToken();
  if (uploadApiConfigured() && token) {
    state.githubPublishing = true;
    state.githubStatus = "Публикую обновлённый статус проверки в общий архив…";
    render();
    try {
      const result = await callUploadApi("/charter/verify", {
        method: "POST",
        body: {
          snapshotRecord: updated
        }
      });
      await syncArchiveFromUploadResult(result);
      state.githubStatus = `Статус проверки среза опубликован в ${repoLabel()}.`;
    } catch (error) {
      state.githubStatus = `Статус проверки изменён только локально: ${error.message}`;
    } finally {
      state.githubPublishing = false;
      render();
    }
    return;
  }

  render();
}

async function downloadAllArchiveDocuments() {
  for (const item of state.archiveDocs) {
    await downloadArchiveDocument(item.id);
  }
  state.archiveMessage = `Запущено скачивание ${state.archiveDocs.length} файлов из архива.`;
  render();
}

initializeArchiveLayer();
