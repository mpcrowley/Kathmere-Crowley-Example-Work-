/* ============================================================
   script.js
   Advisor Operations Command Center
   Rendering + rule-based logic. No frameworks, no build step.
   Depends on: data.js (MOCK_TODAY, meetings, tasks)
   ============================================================ */

"use strict";

// Track current filter selections in one place.
const filterState = {
  advisor: "All",
  clientType: "All",
  prepStatus: "All",
  taskStatus: "All",
  workflowArea: "All",
};

/* ------------------------------------------------------------
   Small utilities
   ------------------------------------------------------------ */

// Parse "YYYY-MM-DD" into a Date at local midnight.
function parseDate(dateStr) {
  return new Date(dateStr + "T00:00:00");
}

// Format a date string like "Jun 18, 2026".
function formatDate(dateStr) {
  const d = parseDate(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Whole days from `fromDate` to `toDate` (positive = future).
function daysBetween(fromDate, toDate) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const a = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const b = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  return Math.round((b - a) / MS_PER_DAY);
}

// A task is overdue if explicitly marked Overdue, or its due date has
// passed and it is not yet Complete.
function isOverdue(task) {
  if (task.status === "Complete") return false;
  if (task.status === "Overdue") return true;
  return daysBetween(parseDate(task.dueDate), MOCK_TODAY) > 0;
}

// Treat these task statuses as "still open work".
function isOpenTask(task) {
  return task.status === "Open" || task.status === "In Progress" || task.status === "Overdue";
}

/* ------------------------------------------------------------
   Filtering
   ------------------------------------------------------------ */

// Return { meetings, tasks } limited by the active filters.
function applyFilters() {
  const filteredMeetings = meetings.filter((m) => {
    if (filterState.advisor !== "All" && m.advisor !== filterState.advisor) return false;
    if (filterState.clientType !== "All" && m.clientType !== filterState.clientType) return false;
    if (filterState.prepStatus !== "All" && m.prepStatus !== filterState.prepStatus) return false;
    return true;
  });

  const filteredTasks = tasks.filter((t) => {
    // Advisor filter maps to the task owner so the two views stay linked.
    if (filterState.advisor !== "All" && t.owner !== filterState.advisor) return false;
    if (filterState.taskStatus !== "All" && t.status !== filterState.taskStatus) return false;
    if (filterState.workflowArea !== "All" && t.workflowArea !== filterState.workflowArea) return false;
    return true;
  });

  return { meetings: filteredMeetings, tasks: filteredTasks };
}

/* ------------------------------------------------------------
   KPIs
   ------------------------------------------------------------ */

function calculateKPIs(scopedMeetings, scopedTasks) {
  const in7Days = scopedMeetings.filter((m) => {
    const days = daysBetween(MOCK_TODAY, parseDate(m.meetingDate));
    return days >= 0 && days <= 7;
  }).length;

  const ready = scopedMeetings.filter((m) => m.prepStatus === "Ready").length;
  const atRisk = scopedMeetings.filter((m) => m.prepStatus === "At Risk").length;
  const open = scopedTasks.filter(isOpenTask).length;
  const overdue = scopedTasks.filter(isOverdue).length;

  return { in7Days, ready, atRisk, open, overdue };
}

function renderKPIs(kpis) {
  const cards = [
    { label: "Meetings Next 7 Days", value: kpis.in7Days, sub: "Scheduled this week" },
    { label: "Ready Meetings", value: kpis.ready, sub: "Prep complete" },
    { label: "At-Risk Meetings", value: kpis.atRisk, sub: "Needs urgent prep", alert: kpis.atRisk > 0 },
    { label: "Open Tasks", value: kpis.open, sub: "Open / In Progress / Overdue" },
    { label: "Overdue Tasks", value: kpis.overdue, sub: "Past due, not complete", alert: kpis.overdue > 0 },
  ];

  const grid = document.getElementById("kpi-grid");
  grid.innerHTML = cards
    .map(
      (c) => `
      <div class="kpi-card${c.alert ? " alert" : ""}">
        <div class="kpi-label">${c.label}</div>
        <div class="kpi-value">${c.value}</div>
        <div class="kpi-sub">${c.sub}</div>
      </div>`
    )
    .join("");
}

/* ------------------------------------------------------------
   Meeting chart + table
   ------------------------------------------------------------ */

// Horizontal CSS bars for Ready / Needs Review / At Risk counts.
function renderMeetingChart(scopedMeetings) {
  const container = document.getElementById("meeting-chart");
  const buckets = [
    { name: "Ready", key: "Ready", cls: "ready" },
    { name: "Needs Review", key: "Needs Review", cls: "review" },
    { name: "At Risk", key: "At Risk", cls: "risk" },
  ];
  const max = scopedMeetings.length || 1;

  if (scopedMeetings.length === 0) {
    container.innerHTML = `<div class="empty-state">No meetings match the current filters.</div>`;
    return;
  }

  container.innerHTML = buckets
    .map((b) => {
      const count = scopedMeetings.filter((m) => m.prepStatus === b.key).length;
      const pct = Math.round((count / max) * 100);
      return `
        <div class="chart-row">
          <span class="chart-name">${b.name}</span>
          <span class="chart-track"><span class="chart-fill ${b.cls}" style="width:${pct}%"></span></span>
          <span class="chart-value">${count}</span>
        </div>`;
    })
    .join("");
}

// Map a prep status to a pill style.
function prepPill(status) {
  if (status === "Ready") return "pill-green";
  if (status === "Needs Review") return "pill-gold";
  return "pill-red"; // At Risk
}

function renderMeetingsTable(scopedMeetings) {
  const body = document.getElementById("meetings-body");

  if (scopedMeetings.length === 0) {
    body.innerHTML = `<tr class="empty-row"><td colspan="8">No meetings match the current filters.</td></tr>`;
    return;
  }

  // Sort by meeting date ascending.
  const sorted = [...scopedMeetings].sort(
    (a, b) => parseDate(a.meetingDate) - parseDate(b.meetingDate)
  );

  body.innerHTML = sorted
    .map((m) => {
      const days = daysBetween(MOCK_TODAY, parseDate(m.meetingDate));
      const daysLabel = days === 0 ? "Today" : days < 0 ? `${Math.abs(days)}d ago` : `${days}d`;
      const topics = m.planningTopics
        .map((t) => `<span class="topic-tag">${t}</span>`)
        .join("");
      const missingCls = m.missingItems === "None" ? "muted" : "";
      return `
        <tr>
          <td class="client-name">${m.client}</td>
          <td>${m.advisor}</td>
          <td>${formatDate(m.meetingDate)}</td>
          <td>${daysLabel}</td>
          <td class="muted">${m.clientType}</td>
          <td><span class="pill ${prepPill(m.prepStatus)}">${m.prepStatus}</span></td>
          <td class="${missingCls}">${m.missingItems}</td>
          <td><div class="topic-tags">${topics}</div></td>
        </tr>`;
    })
    .join("");
}

/* ------------------------------------------------------------
   Task chart + table
   ------------------------------------------------------------ */

// Owner workload chart: count of still-open tasks per owner.
function renderTaskChart(scopedTasks) {
  const container = document.getElementById("task-chart");
  const openTasks = scopedTasks.filter(isOpenTask);

  if (openTasks.length === 0) {
    container.innerHTML = `<div class="empty-state">No open tasks match the current filters.</div>`;
    return;
  }

  // Tally per owner.
  const counts = {};
  openTasks.forEach((t) => {
    counts[t.owner] = (counts[t.owner] || 0) + 1;
  });

  const rows = Object.keys(counts)
    .map((owner) => ({ owner, count: counts[owner] }))
    .sort((a, b) => b.count - a.count);

  const max = rows[0].count || 1;

  container.innerHTML = rows
    .map(
      (r) => `
      <div class="chart-row">
        <span class="chart-name">${r.owner}</span>
        <span class="chart-track"><span class="chart-fill" style="width:${Math.round(
          (r.count / max) * 100
        )}%"></span></span>
        <span class="chart-value">${r.count}</span>
      </div>`
    )
    .join("");
}

// Map a task status to a pill style.
function taskPill(status) {
  if (status === "Complete") return "pill-green";
  if (status === "In Progress") return "pill-blue";
  if (status === "Open") return "pill-gold";
  return "pill-red"; // Overdue
}

function renderTasksTable(scopedTasks) {
  const body = document.getElementById("tasks-body");

  if (scopedTasks.length === 0) {
    body.innerHTML = `<tr class="empty-row"><td colspan="7">No tasks match the current filters.</td></tr>`;
    return;
  }

  // Sort: overdue first, then by due date ascending.
  const sorted = [...scopedTasks].sort((a, b) => {
    const aOver = isOverdue(a);
    const bOver = isOverdue(b);
    if (aOver !== bOver) return aOver ? -1 : 1;
    return parseDate(a.dueDate) - parseDate(b.dueDate);
  });

  body.innerHTML = sorted
    .map((t) => {
      const overdueDays = isOverdue(t) ? daysBetween(parseDate(t.dueDate), MOCK_TODAY) : 0;
      const overdueLabel = overdueDays > 0 ? `${overdueDays}d` : "—";
      return `
        <tr>
          <td>${t.task}</td>
          <td class="muted">${t.client}</td>
          <td>${t.owner}</td>
          <td>${formatDate(t.dueDate)}</td>
          <td class="${overdueDays > 0 ? "" : "muted"}">${overdueLabel}</td>
          <td><span class="pill ${taskPill(t.status)}">${t.status}</span></td>
          <td class="muted">${t.workflowArea}</td>
        </tr>`;
    })
    .join("");
}

/* ------------------------------------------------------------
   Rule-based workflow insights
   Returns 5-8 short strings flagging workflow risks.
   ------------------------------------------------------------ */

const KEY_TOPICS = [
  "Concentrated stock",
  "Executive compensation",
  "Estate planning",
  "Tax planning",
  "Retirement plan fiduciary review",
];

function generateAttentionItems(scopedMeetings, scopedTasks) {
  const items = [];

  // Rule: meetings within 3 days that are not Ready.
  scopedMeetings.forEach((m) => {
    const days = daysBetween(MOCK_TODAY, parseDate(m.meetingDate));
    if (days >= 0 && days <= 3 && m.prepStatus !== "Ready") {
      items.push({
        sev: "high",
        text: `${m.client} meets in ${days === 0 ? "less than a day" : days + " day(s)"} but prep is "${m.prepStatus}".`,
      });
    }
  });

  // Rule: meetings marked At Risk.
  scopedMeetings
    .filter((m) => m.prepStatus === "At Risk")
    .forEach((m) => {
      items.push({
        sev: "high",
        text: `${m.client} (${m.advisor}) is flagged At Risk for the ${formatDate(m.meetingDate)} meeting.`,
      });
    });

  // Rule: overdue tasks.
  const overdueTasks = scopedTasks.filter(isOverdue);
  overdueTasks.forEach((t) => {
    const d = daysBetween(parseDate(t.dueDate), MOCK_TODAY);
    items.push({
      sev: "high",
      text: `Overdue ${d} day(s): "${t.task}" for ${t.client} (owner: ${t.owner}).`,
    });
  });

  // Rule: clients with missing items.
  scopedMeetings
    .filter((m) => m.missingItems && m.missingItems !== "None")
    .forEach((m) => {
      items.push({
        sev: "medium",
        text: `${m.client} is missing: ${m.missingItems}.`,
      });
    });

  // Rule: owners with more than 3 open/overdue tasks.
  const ownerLoad = {};
  scopedTasks.filter(isOpenTask).forEach((t) => {
    ownerLoad[t.owner] = (ownerLoad[t.owner] || 0) + 1;
  });
  Object.keys(ownerLoad).forEach((owner) => {
    if (ownerLoad[owner] > 3) {
      items.push({
        sev: "medium",
        text: `${owner} is carrying ${ownerLoad[owner]} open/overdue tasks — possible bottleneck.`,
      });
    }
  });

  // Rule: Content Review tasks that are overdue.
  scopedTasks
    .filter((t) => t.workflowArea === "Content Review" && isOverdue(t))
    .forEach((t) => {
      items.push({
        sev: "medium",
        text: `Content Review item is overdue: "${t.task}" (${t.owner}).`,
      });
    });

  // Rule: meetings touching high-value planning topics.
  scopedMeetings.forEach((m) => {
    const hits = m.planningTopics.filter((t) => KEY_TOPICS.includes(t));
    if (hits.length > 0) {
      items.push({
        sev: "low",
        text: `${m.client} involves high-value planning: ${hits.join(", ")}.`,
      });
    }
  });

  // De-duplicate, prioritize high severity, and cap at 8 (min target 5).
  const order = { high: 0, medium: 1, low: 2 };
  const unique = [];
  const seen = new Set();
  items
    .sort((a, b) => order[a.sev] - order[b.sev])
    .forEach((it) => {
      if (!seen.has(it.text)) {
        seen.add(it.text);
        unique.push(it);
      }
    });

  return unique.slice(0, 8);
}

function renderAttentionItems(items) {
  const list = document.getElementById("attention-list");

  if (items.length === 0) {
    list.innerHTML = `<li><span class="attention-icon">✓</span><span>No workflow risks detected for the current filters.</span></li>`;
    return;
  }

  list.innerHTML = items
    .map(
      (it) => `
      <li class="sev-${it.sev}">
        <span class="attention-icon">▶</span>
        <span>${it.text}</span>
      </li>`
    )
    .join("");
}

/* ------------------------------------------------------------
   Weekly Operations Brief
   ------------------------------------------------------------ */

// Escape user-facing text before injecting as HTML.
function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

// Render the brief as a polished HTML "document" for on-screen display.
function renderWeeklyBrief(scopedMeetings, scopedTasks) {
  const kpis = calculateKPIs(scopedMeetings, scopedTasks);
  const weekOf = formatDate(MOCK_TODAY_STR);

  const attentionMeetings = [...scopedMeetings]
    .filter((m) => m.prepStatus === "At Risk" || m.prepStatus === "Needs Review")
    .sort((a, b) => parseDate(a.meetingDate) - parseDate(b.meetingDate));

  const overdueTasks = scopedTasks
    .filter(isOverdue)
    .sort((a, b) => parseDate(a.dueDate) - parseDate(b.dueDate));

  const ownerLoad = {};
  scopedTasks.filter(isOpenTask).forEach((t) => {
    ownerLoad[t.owner] = (ownerLoad[t.owner] || 0) + 1;
  });
  const workloadRows = Object.keys(ownerLoad)
    .map((o) => ({ owner: o, count: ownerLoad[o] }))
    .sort((a, b) => b.count - a.count);

  // --- Top stat chips ---
  const stats = [
    { label: "Meetings · 7d", value: kpis.in7Days, tone: "" },
    { label: "Ready", value: kpis.ready, tone: "good" },
    { label: "At Risk", value: kpis.atRisk, tone: kpis.atRisk ? "bad" : "" },
    { label: "Open Tasks", value: kpis.open, tone: "" },
    { label: "Overdue", value: kpis.overdue, tone: kpis.overdue ? "bad" : "" },
  ];
  const statsHtml = stats
    .map(
      (s) => `
      <div class="brief-stat ${s.tone}">
        <span class="brief-stat-value">${s.value}</span>
        <span class="brief-stat-label">${s.label}</span>
      </div>`
    )
    .join("");

  // --- Executive summary ---
  const summary = [
    `<strong>${kpis.in7Days}</strong> meeting(s) scheduled in the next 7 days; <strong>${kpis.ready}</strong> fully prep-ready.`,
    `<strong>${kpis.atRisk}</strong> meeting(s) flagged At Risk and need immediate prep attention.`,
    `<strong>${kpis.open}</strong> open task(s) in flight, including <strong>${kpis.overdue}</strong> overdue.`,
  ];
  if (workloadRows.length > 0) {
    summary.push(
      `Heaviest open workload: <strong>${escapeHtml(workloadRows[0].owner)}</strong> with ${workloadRows[0].count} task(s).`
    );
  }
  summary.push(`<strong>${attentionMeetings.length}</strong> meeting(s) currently require prep review or escalation.`);
  const summaryHtml = `<ul class="brief-list bullets">${summary
    .map((s) => `<li><span>${s}</span></li>`)
    .join("")}</ul>`;

  // --- Meetings requiring attention ---
  let meetingsHtml;
  if (attentionMeetings.length === 0) {
    meetingsHtml = `<p class="brief-empty">No meetings currently flagged At Risk or Needs Review.</p>`;
  } else {
    meetingsHtml =
      `<ul class="brief-list">` +
      attentionMeetings
        .map((m) => {
          const days = daysBetween(MOCK_TODAY, parseDate(m.meetingDate));
          const within = days >= 0 && days <= 7 ? `<span class="brief-chip">within 7d</span>` : "";
          const missing = m.missingItems !== "None" ? ` — missing ${escapeHtml(m.missingItems)}` : "";
          return `<li>
            <span class="pill ${prepPill(m.prepStatus)}">${m.prepStatus}</span>
            <span class="brief-line"><strong>${escapeHtml(m.client)}</strong> · ${escapeHtml(
            m.advisor
          )} · ${formatDate(m.meetingDate)}${missing} ${within}</span>
          </li>`;
        })
        .join("") +
      `</ul>`;
  }

  // --- Follow-up risks ---
  let risksHtml;
  if (overdueTasks.length === 0) {
    risksHtml = `<p class="brief-empty">No overdue follow-up tasks.</p>`;
  } else {
    risksHtml =
      `<ul class="brief-list">` +
      overdueTasks
        .map((t) => {
          const d = daysBetween(parseDate(t.dueDate), MOCK_TODAY);
          return `<li>
            <span class="brief-daybadge">${d}d</span>
            <span class="brief-line"><strong>${escapeHtml(t.task)}</strong> · ${escapeHtml(
            t.client
          )} · owner ${escapeHtml(t.owner)}</span>
          </li>`;
        })
        .join("") +
      `</ul>`;
  }

  // --- Advisor workload (mini bar chart) ---
  let workloadHtml;
  if (workloadRows.length === 0) {
    workloadHtml = `<p class="brief-empty">No open workload for the current view.</p>`;
  } else {
    const maxLoad = workloadRows[0].count || 1;
    workloadHtml =
      `<div class="brief-workload">` +
      workloadRows
        .map((r) => {
          const over = r.count > 3;
          const flag = over ? `<span class="brief-chip warn">bottleneck</span>` : "";
          return `<div class="brief-wl-row">
            <span class="brief-wl-name">${escapeHtml(r.owner)}</span>
            <span class="brief-wl-track"><span class="brief-wl-fill${
              over ? " over" : ""
            }" style="width:${Math.round((r.count / maxLoad) * 100)}%"></span></span>
            <span class="brief-wl-val">${r.count}</span>
            ${flag}
          </div>`;
        })
        .join("") +
      `</div>`;
  }

  // --- Static sections ---
  const priorities = [
    "Close prep gaps on At-Risk meetings within the next 3 days.",
    "Clear overdue follow-up tasks, starting with the longest outstanding.",
    "Collect outstanding client documents flagged as missing items.",
    "Rebalance workload for any owner carrying more than 3 open tasks.",
    "Confirm recaps and CRM notes are logged for completed meetings.",
  ];
  const prioritiesHtml = `<ol class="brief-numbered">${priorities
    .map((p) => `<li>${p}</li>`)
    .join("")}</ol>`;

  const reviewNotes = [
    "This dashboard uses mock data.",
    "The insights are workflow support, not client advice.",
    "In production, data should come from approved CRM and document systems.",
    "Any AI-generated prioritization should remain human-reviewed.",
  ];
  const notesHtml = `<ul class="brief-list bullets muted">${reviewNotes
    .map((n) => `<li><span>${n}</span></li>`)
    .join("")}</ul>`;

  return `
    <article class="brief-doc">
      <header class="brief-masthead">
        <div>
          <h3 class="brief-title">Weekly Advisor Operations Brief</h3>
          <p class="brief-date">Week of ${weekOf} · Mock data</p>
        </div>
        <span class="brief-tag">Operations</span>
      </header>
      <div class="brief-stats">${statsHtml}</div>
      <section class="brief-section"><h4>Executive Summary</h4>${summaryHtml}</section>
      <section class="brief-section"><h4>Meetings Requiring Attention</h4>${meetingsHtml}</section>
      <section class="brief-section"><h4>Follow-Up Risks</h4>${risksHtml}</section>
      <section class="brief-section"><h4>Advisor Workload Notes</h4>${workloadHtml}</section>
      <section class="brief-section"><h4>Suggested Priorities This Week</h4>${prioritiesHtml}</section>
      <section class="brief-section last"><h4>Human Review Notes</h4>${notesHtml}</section>
    </article>`;
}

/* ------------------------------------------------------------
   Filter population + wiring
   ------------------------------------------------------------ */

// Build "All" + sorted unique options for a <select>.
function populateSelect(id, values) {
  const select = document.getElementById(id);
  const options = ["All", ...Array.from(new Set(values)).sort()];
  select.innerHTML = options.map((v) => `<option value="${v}">${v}</option>`).join("");
}

function setupFilters() {
  populateSelect("filter-advisor", meetings.map((m) => m.advisor).concat(tasks.map((t) => t.owner)));
  populateSelect("filter-client-type", meetings.map((m) => m.clientType));
  populateSelect("filter-prep-status", meetings.map((m) => m.prepStatus));
  populateSelect("filter-task-status", tasks.map((t) => t.status));
  populateSelect("filter-workflow-area", tasks.map((t) => t.workflowArea));

  // Map each select to its filterState key, then re-render on change.
  const bindings = [
    ["filter-advisor", "advisor"],
    ["filter-client-type", "clientType"],
    ["filter-prep-status", "prepStatus"],
    ["filter-task-status", "taskStatus"],
    ["filter-workflow-area", "workflowArea"],
  ];
  bindings.forEach(([id, key]) => {
    document.getElementById(id).addEventListener("change", (e) => {
      filterState[key] = e.target.value;
      renderDashboard();
    });
  });

  document.getElementById("reset-filters").addEventListener("click", () => {
    Object.keys(filterState).forEach((k) => (filterState[k] = "All"));
    bindings.forEach(([id]) => (document.getElementById(id).value = "All"));
    renderDashboard();
  });
}

function setupBrief() {
  document.getElementById("generate-brief").addEventListener("click", () => {
    const { meetings: m, tasks: t } = applyFilters();

    const panel = document.getElementById("brief-panel");
    panel.innerHTML = renderWeeklyBrief(m, t); // styled HTML, shown on the page
    panel.hidden = false;
  });
}

/* ------------------------------------------------------------
   Master render + init
   ------------------------------------------------------------ */

function renderDashboard() {
  const { meetings: scopedMeetings, tasks: scopedTasks } = applyFilters();

  renderKPIs(calculateKPIs(scopedMeetings, scopedTasks));
  renderMeetingChart(scopedMeetings);
  renderMeetingsTable(scopedMeetings);
  renderTaskChart(scopedTasks);
  renderTasksTable(scopedTasks);
  renderAttentionItems(generateAttentionItems(scopedMeetings, scopedTasks));
}

function initDashboard() {
  setupFilters();
  setupBrief();
  renderDashboard();
}

document.addEventListener("DOMContentLoaded", initDashboard);
