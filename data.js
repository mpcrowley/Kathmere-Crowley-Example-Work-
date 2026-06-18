/* ============================================================
   data.js
   Mock data for the Advisor Operations Command Center.
   All data is fabricated for demo purposes only.
   ============================================================ */

// The data below was authored relative to this anchor date. All meeting and
// task dates are expressed as if "today" were AUTHORED_TODAY.
const AUTHORED_TODAY = new Date("2026-06-17T00:00:00");

// "Today" is the day the dashboard is actually opened (local midnight). By
// anchoring to the viewer's real date, the relative timing — days until a
// meeting, days a task is overdue, KPI windows — always looks the same no
// matter when the file is opened.
const MOCK_TODAY = (() => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
})();

// Helpers to shift the authored dates onto the viewer's calendar.
const DAY_MS = 24 * 60 * 60 * 1000;
const SHIFT_DAYS = Math.round((MOCK_TODAY - AUTHORED_TODAY) / DAY_MS);

// Format a Date as a local "YYYY-MM-DD" string (timezone-safe).
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Shift an authored "YYYY-MM-DD" string forward by SHIFT_DAYS.
function shiftDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + SHIFT_DAYS);
  return toDateStr(d);
}

// MOCK_TODAY as a local date string, for display use.
const MOCK_TODAY_STR = toDateStr(MOCK_TODAY);

/* ------------------------------------------------------------
   Meetings
   12 upcoming/recent client meetings with prep readiness state.
   ------------------------------------------------------------ */
const meetings = [
  {
    client: "Harrison Vance",
    advisor: "Elaine Brooks",
    meetingDate: "2026-06-18",
    clientType: "Corporate Executive",
    prepStatus: "At Risk",
    missingItems: "RSU vesting schedule",
    planningTopics: ["Executive compensation", "Concentrated stock"],
  },
  {
    client: "Calloway Industries",
    advisor: "Marcus Delgado",
    meetingDate: "2026-06-19",
    clientType: "Business Owner",
    prepStatus: "Needs Review",
    missingItems: "CPA notes",
    planningTopics: ["Business succession", "Tax planning"],
  },
  {
    client: "The Whitfield Family",
    advisor: "Elaine Brooks",
    meetingDate: "2026-06-19",
    clientType: "HNW Family",
    prepStatus: "Ready",
    missingItems: "None",
    planningTopics: ["Estate planning", "Portfolio review"],
  },
  {
    client: "Sterling Dynamics 401(k)",
    advisor: "Priya Natarajan",
    meetingDate: "2026-06-22",
    clientType: "Retirement Plan Sponsor",
    prepStatus: "Needs Review",
    missingItems: "Investment policy statement",
    planningTopics: ["Retirement plan fiduciary review"],
  },
  {
    client: "Devon Mercer",
    advisor: "Marcus Delgado",
    meetingDate: "2026-06-23",
    clientType: "Entrepreneur",
    prepStatus: "At Risk",
    missingItems: "Updated estate documents",
    planningTopics: ["Liquidity planning", "Estate planning"],
  },
  {
    client: "Rosalind Keene",
    advisor: "Priya Natarajan",
    meetingDate: "2026-06-24",
    clientType: "Corporate Executive",
    prepStatus: "Ready",
    missingItems: "None",
    planningTopics: ["Executive compensation", "Tax planning"],
  },
  {
    client: "Ambrose Holdings",
    advisor: "Elaine Brooks",
    meetingDate: "2026-06-25",
    clientType: "Business Owner",
    prepStatus: "Needs Review",
    missingItems: "Recent tax return",
    planningTopics: ["Business succession", "Liquidity planning"],
  },
  {
    client: "The Aldridge Family",
    advisor: "Marcus Delgado",
    meetingDate: "2026-06-26",
    clientType: "HNW Family",
    prepStatus: "Ready",
    missingItems: "None",
    planningTopics: ["Estate planning", "College funding"],
  },
  {
    client: "Nadia Okonkwo",
    advisor: "Priya Natarajan",
    meetingDate: "2026-06-29",
    clientType: "Entrepreneur",
    prepStatus: "At Risk",
    missingItems: "Beneficiary confirmation",
    planningTopics: ["Concentrated stock", "Liquidity planning"],
  },
  {
    client: "Beacon Manufacturing 401(k)",
    advisor: "Elaine Brooks",
    meetingDate: "2026-07-01",
    clientType: "Retirement Plan Sponsor",
    prepStatus: "Ready",
    missingItems: "None",
    planningTopics: ["Retirement plan fiduciary review", "Portfolio review"],
  },
  {
    client: "Theodore Lang",
    advisor: "Marcus Delgado",
    meetingDate: "2026-07-02",
    clientType: "Corporate Executive",
    prepStatus: "Needs Review",
    missingItems: "Prior meeting follow-up",
    planningTopics: ["Executive compensation", "Retirement plan fiduciary review"],
  },
  {
    client: "The Castellano Family",
    advisor: "Priya Natarajan",
    meetingDate: "2026-07-06",
    clientType: "HNW Family",
    prepStatus: "Ready",
    missingItems: "None",
    planningTopics: ["Estate planning", "Tax planning"],
  },
];

/* ------------------------------------------------------------
   Tasks
   18 follow-up / workflow tasks across owners and areas.
   ------------------------------------------------------------ */
const tasks = [
  {
    task: "Send meeting recap",
    client: "Harrison Vance",
    owner: "Elaine Brooks",
    dueDate: "2026-06-12",
    status: "Overdue",
    workflowArea: "Meeting Follow-Up",
  },
  {
    task: "Request tax return",
    client: "Ambrose Holdings",
    owner: "Elaine Brooks",
    dueDate: "2026-06-15",
    status: "Overdue",
    workflowArea: "Meeting Follow-Up",
  },
  {
    task: "Review RSU vesting schedule",
    client: "Harrison Vance",
    owner: "Elaine Brooks",
    dueDate: "2026-06-17",
    status: "In Progress",
    workflowArea: "Planning",
  },
  {
    task: "Confirm beneficiary designations",
    client: "Nadia Okonkwo",
    owner: "Priya Natarajan",
    dueDate: "2026-06-18",
    status: "Open",
    workflowArea: "Planning",
  },
  {
    task: "Prepare IPS",
    client: "Sterling Dynamics 401(k)",
    owner: "Priya Natarajan",
    dueDate: "2026-06-19",
    status: "In Progress",
    workflowArea: "Investment Review",
  },
  {
    task: "Coordinate with CPA",
    client: "Calloway Industries",
    owner: "Marcus Delgado",
    dueDate: "2026-06-16",
    status: "Overdue",
    workflowArea: "Planning",
  },
  {
    task: "Draft LinkedIn post for advisor review",
    client: "—",
    owner: "Sophia Reyes",
    dueDate: "2026-06-14",
    status: "Overdue",
    workflowArea: "Content Review",
  },
  {
    task: "Update CRM note",
    client: "The Whitfield Family",
    owner: "Elaine Brooks",
    dueDate: "2026-06-20",
    status: "Open",
    workflowArea: "Meeting Follow-Up",
  },
  {
    task: "Review retirement plan benchmark report",
    client: "Sterling Dynamics 401(k)",
    owner: "Priya Natarajan",
    dueDate: "2026-06-23",
    status: "Open",
    workflowArea: "Investment Review",
  },
  {
    task: "Collect updated estate documents",
    client: "Devon Mercer",
    owner: "Marcus Delgado",
    dueDate: "2026-06-21",
    status: "Open",
    workflowArea: "Planning",
  },
  {
    task: "Schedule onboarding kickoff",
    client: "Theodore Lang",
    owner: "Marcus Delgado",
    dueDate: "2026-06-24",
    status: "Open",
    workflowArea: "Client Onboarding",
  },
  {
    task: "Send welcome packet",
    client: "Theodore Lang",
    owner: "Sophia Reyes",
    dueDate: "2026-06-13",
    status: "Complete",
    workflowArea: "Client Onboarding",
  },
  {
    task: "Rebalance model portfolio",
    client: "Rosalind Keene",
    owner: "Priya Natarajan",
    dueDate: "2026-06-25",
    status: "Open",
    workflowArea: "Investment Review",
  },
  {
    task: "Draft quarterly client newsletter",
    client: "—",
    owner: "Sophia Reyes",
    dueDate: "2026-06-26",
    status: "In Progress",
    workflowArea: "Content Review",
  },
  {
    task: "Prepare estate planning summary",
    client: "The Aldridge Family",
    owner: "Marcus Delgado",
    dueDate: "2026-06-22",
    status: "Open",
    workflowArea: "Planning",
  },
  {
    task: "Confirm meeting agenda",
    client: "Calloway Industries",
    owner: "Marcus Delgado",
    dueDate: "2026-06-18",
    status: "In Progress",
    workflowArea: "Meeting Follow-Up",
  },
  {
    task: "File signed advisory agreement",
    client: "Devon Mercer",
    owner: "Sophia Reyes",
    dueDate: "2026-06-10",
    status: "Complete",
    workflowArea: "Client Onboarding",
  },
  {
    task: "Review concentrated stock plan",
    client: "Nadia Okonkwo",
    owner: "Priya Natarajan",
    dueDate: "2026-06-16",
    status: "Overdue",
    workflowArea: "Investment Review",
  },
];

/* ------------------------------------------------------------
   Re-anchor every authored date onto the viewer's calendar so the
   dashboard's relative timing stays identical whenever it is opened.
   (No effect when SHIFT_DAYS is 0.)
   ------------------------------------------------------------ */
if (SHIFT_DAYS !== 0) {
  meetings.forEach((m) => {
    m.meetingDate = shiftDate(m.meetingDate);
  });
  tasks.forEach((t) => {
    t.dueDate = shiftDate(t.dueDate);
  });
}
