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
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
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
  return {
    id: record.id || record.name,
    name: record.name || record.id || "document",
    type: record.type || "project_protocol",
    projectCode: record.projectCode || "",
    projectName: record.projectName || "",
    periodDate: record.periodDate || "",
    ext: record.ext || "",
    size: Number(record.size) || 0,
    mime,
    savedAt: record.savedAt || new Date().toISOString(),
    blob: base64ToBlob(record.contentBase64 || "", mime)
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
    sourceFileName: record.sourceFileName || `${record.projectCode || "project"}_${record.snapshotMonth || "snapshot"}.md`
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

async function syncRepoArchiveSeed(force = false) {
  const repoArchive = readRepoArchiveData();
  if (!repoArchive.version) {
    return { version: "", importedDocs: 0, importedSnapshots: 0 };
  }

  if (!force && localStorage.getItem(REPO_ARCHIVE_SYNC_KEY) === repoArchive.version) {
    return { version: repoArchive.version, importedDocs: 0, importedSnapshots: 0 };
  }

  let importedDocs = 0;
  let importedSnapshots = 0;

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
  return dashboard.projects.some((project) => project.code === projectCode);
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
  const match = name.match(/^(rating|project_protocol|checklist)_(\d{2}\.\d{2}\.\d{4})_([A-Za-zА-Яа-я0-9-]+)_(.+)\.(md|xlsx)$/u);
  if (!match) return null;
  return {
    type: match[1],
    date: match[2],
    projectCode: match[3],
    projectName: match[4],
    ext: match[5]
  };
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
  if (!dashboard.summary.projects) {
    return "<li>Проекты ещё не добавлены</li>";
  }

  return dashboard.summary.missingProjectNames.length
    ? dashboard.summary.missingProjectNames.map((name) => `<li>${escapeHtml(name)}</li>`).join("")
    : "<li>Все проекты сдали отчёты</li>";
}

function historyMarkup() {
  if (!dashboard.history.length) {
    return `
      <article class="snapshotEmpty subtle">
        <strong>История пока пустая.</strong>
        <span>Когда появятся weekly по новым проектам, здесь будет динамика по статусам и качеству.</span>
      </article>
    `;
  }

  return dashboard.history.map((week) => {
    const total = week.green + week.yellow + week.red || 1;
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
          <span>Зелёных: ${week.green}</span>
          <span>Жёлтых: ${week.yellow}</span>
          <span>Красных: ${week.red}</span>
          <strong>Среднее качество: ${week.avgQuality}%</strong>
        </div>
      </article>
    `;
  }).join("");
}

function nextWeekFocusMarkup() {
  const focusCards = dashboard.projects
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
  if (!dashboard.projects.length) {
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

  return dashboard.projects.map((project) => {
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
  const sorted = [...dashboard.managers].sort(managerSort);
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
            <li>Чтобы архив попал в репозиторий, после загрузки скачиваем новый <code>archive-store.js</code> и коммитим его вместе с сайтом.</li>
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
            <li>Интерфейс только отображает результат и сохраняет объяснимость.</li>
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
            <li>Ручные приписки вроде <strong>final</strong>, <strong>новый</strong>, <strong>(1)</strong> не допускаются.</li>
            <li>Система должна валидировать имя файла до обработки содержимого.</li>
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
            <div class="validatorHint">Поддерживаемые маски: rating / project_protocol / checklist</div>
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
        <span>Загрузите протоколы, weekly-rating и чек-листы. Они сохранятся локально в браузере этого ноутбука и будут доступны для скачивания позже.</span>
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
          Это рабочий контур хранения без отдельного backend: команда загружает все документы в одном месте, а карточки проектов потом только показывают уже сохранённые данные.
          Для совместного командного архива следующим шагом уже нужен сервер или облачное хранилище.
        </p>
        <div class="archiveToolbar">
          <div class="validatorHint">
            Для репозитория используется файл <code>${REPO_ARCHIVE_FILE}</code>. После weekly-загрузки или месячного устава скачайте обновлённый файл, замените им одноимённый файл в папке сайта и закоммитьте в репозиторий.
            Текущая версия в коде: <code>${escapeHtml(repoVersionLabel)}</code>, weekly в файле: <code>${repoArchive.archiveDocs.length}</code>, уставов в файле: <code>${repoArchive.snapshotRecords.length}</code>.
          </div>
          <button class="archiveButton accent" type="button" data-archive-export-repo>Скачать ${REPO_ARCHIVE_FILE}</button>
        </div>
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
          <div class="metricSub">Протоколы, rating и чек-листы недели.</div>
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
            <p>Протоколы, rating и чек-листы загружаются раз в неделю и хранятся здесь же.</p>
          </div>
        </div>
        <div class="archiveToolbar">
          <label class="fileLabel">
            Добавить weekly-документы
            <input id="archiveInput" type="file" multiple accept=".md,.xlsx" />
          </label>
          <button class="archiveButton accent" data-archive-download-all ${state.archiveDocs.length ? "" : "disabled"}>Скачать weekly</button>
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
  const alertsMarkup = dashboard.alerts.length
    ? dashboard.alerts.map((alert) => `
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
          <div class="metricLabel">Отчётов за новую неделю</div>
          <div class="metricValue">${dashboard.summary.reportsForNewWeek}</div>
          <div class="metricSub">Из ${dashboard.summary.projects} проектов получили свежий weekly.</div>
        </article>
        <article class="card metricCard tone-red">
          <div class="metricLabel">Не сдали отчёты</div>
          <div class="metricValue">${dashboard.summary.missingReports}</div>
          <div class="metricSub"><ul class="methodList">${missingList()}</ul></div>
        </article>
        <article class="card metricCard tone-green">
          <div class="metricLabel">Качество weekly</div>
          <div class="metricValue">${dashboard.summary.averageQuality}%</div>
          <div class="metricSub">${dashboard.summary.totalGreenChecks} зелёных пунктов из ${dashboard.summary.totalPossibleChecks} по сданным отчётам недели.</div>
        </article>
        <article class="card metricCard tone-yellow">
          <div class="metricLabel">Светофор недели</div>
          <div class="metricValue">${dashboard.summary.green}/${dashboard.summary.yellow}/${dashboard.summary.red}</div>
          <div class="metricSub">Зелёных: ${dashboard.summary.green}, жёлтых: ${dashboard.summary.yellow}, красных: ${dashboard.summary.red}.</div>
        </article>
        <article class="card metricCard ${dashboard.summary.escalations ? "tone-red" : "tone-accent"}">
          <div class="metricLabel">Эскалации</div>
          <div class="metricValue">${dashboard.summary.escalations}</div>
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
            <span class="metaBadge">Период weekly: <code>${escapeHtml(dashboard.latestPeriod)}</code></span>
            <span class="metaBadge">Обновлено: <code>${escapeHtml(formatDate(dashboard.generatedAt))}</code></span>
            <span class="metaBadge">Проектов: <code>${dashboard.summary.projects}</code></span>
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
              <div class="trafficMiniValue" style="color:var(--green)">${dashboard.summary.green}</div>
            </article>
            <article class="trafficMiniCard">
              <div class="trafficMiniLabel">Жёлтый</div>
              <div class="trafficMiniValue" style="color:var(--yellow)">${dashboard.summary.yellow}</div>
            </article>
            <article class="trafficMiniCard">
              <div class="trafficMiniLabel">Нет отчёта</div>
              <div class="trafficMiniValue" style="color:var(--red)">${dashboard.summary.missingReports}</div>
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
    validatorInput.addEventListener("change", (event) => {
      const files = [...event.target.files];
      state.fileChecks = files.map(validateFileName);
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
  const name = file.name;
  const parsed = parseFileName(name);

  if (!parsed) {
    return {
      name,
      valid: false,
      message: "Неверное имя файла. Ожидается тип_ДД.ММ.ГГГГ_КодПроекта_НазваниеПроекта.(md|xlsx)"
    };
  }

  const forbidden = /(final|новый|исправлено|версия|копия|\(\d+\))/iu;
  if (forbidden.test(name)) {
    return {
      name,
      valid: false,
      message: "Имя прошло по маске, но содержит личные приписки. Уберите final / версия / (1) и подобные хвосты."
    };
  }

  return {
    name,
    valid: true,
    message: "Имя файла корректно и может быть принято системой.",
    parsed
  };
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
    const rollbackDone = await rollbackSeededArchiveDocs();
    state.archiveDocs = await archiveGetAll();
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
  state.archiveLoading = true;
  state.snapshotLoading = true;
  render();

  try {
    const rollbackDone = await rollbackSeededArchiveDocs();
    await seedCharterSnapshots();
    const repoSync = await syncRepoArchiveSeed();
    state.archiveDocs = await archiveGetAll();
    state.snapshotRecords = await snapshotGetAll();

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
      type: item.type,
      projectCode: item.projectCode,
      projectName: item.projectName,
      periodDate: item.periodDate,
      ext: item.ext,
      size: item.size,
      mime: item.mime,
      savedAt: item.savedAt,
      contentBase64: await blobToBase64(item.blob)
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
    sourceText: item.sourceText || ""
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
    sourceText: text
  };

  await snapshotPut(record);
  state.snapshotRecords = await snapshotGetAll();
  state.selectedSnapshotIds[projectCode] = record.id;
  state.compareSnapshotIds[projectCode] = record.id;
  state.snapshotTabs[projectCode] = "overview";
  state.openSnapshotProjects[projectCode] = true;

  const duplicateText = existingMonth.length && strategy === "new-version"
    ? " Срез сохранён как новая версия того же месяца."
    : "";
  const warningText = parsed.warnings.length
    ? ` Предупреждения: ${parsed.warnings.join(" ")}`
    : "";
  state.archiveMessage = `Устав ${projectCode} за ${parseMonthInput(snapshotMonth)} сохранён.${duplicateText}${warningText}`;
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

  const checks = files.map(validateFileName);
  state.fileChecks = checks;

  const invalid = checks.filter((item) => !item.valid);
  if (invalid.length) {
    state.archiveMessage = "Часть файлов не сохранена: сначала поправьте имена по валидатору.";
    render();
    return;
  }

  for (const file of files) {
    const { parsed } = validateFileName(file);
    const blob = new Blob([await file.arrayBuffer()], {
      type: file.type || "application/octet-stream"
    });
    await archivePut({
      id: file.name,
      name: file.name,
      type: parsed.type,
      projectCode: parsed.projectCode,
      projectName: parsed.projectName,
      periodDate: parsed.date,
      ext: parsed.ext,
      size: file.size,
      mime: file.type || "application/octet-stream",
      savedAt: new Date().toISOString(),
      blob
    });
  }

  state.archiveMessage = `Сохранено файлов: ${files.length}. Теперь их можно скачать из локального архива в любое время.`;
  state.archiveDocs = await archiveGetAll();
  render();
}

async function downloadSnapshotDocument(id) {
  const item = state.snapshotRecords.find((record) => record.id === id);
  if (!item) return;

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
  await archiveDelete(id);
  state.archiveDocs = await archiveGetAll();
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
