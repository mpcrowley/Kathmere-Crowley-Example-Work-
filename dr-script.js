/* Day Recap
   Rule-based reflection logic. Everything is generated locally. No external APIs. */

/* ---------- Input collection ---------- */

function getInputs() {
  const val = (id) => document.getElementById(id).value.trim();
  const num = (id) => parseInt(document.getElementById(id).value, 10);

  const gratitude = [val("gratitude1"), val("gratitude2"), val("gratitude3")]
    .filter((g) => g.length > 0);

  return {
    mood: num("mood"),
    energy: num("energy"),
    focus: num("focus"),
    stress: num("stress"),
    gratitude,
    lesson: val("lesson"),
    success: val("success"),
    unfinished: val("unfinished"),
    notes: val("notes"),
    tomorrow: val("tomorrow"),
  };
}

/* ---------- Rating description ---------- */

function describeRatings(inputs) {
  const { mood, energy, focus, stress } = inputs;
  const high = (n) => n >= 7;
  const low = (n) => n <= 4;

  // One compact read of the day's shape, report-style.
  let shape;
  if (high(mood) && high(energy) && high(focus)) {
    shape = "Strong momentum — mood, energy, and focus all ran high";
  } else if (low(energy) || low(focus)) {
    shape = "A slower day — energy or focus ran low";
  } else {
    shape = "A steady, mixed day";
  }

  if (high(stress)) {
    shape += ", with stress running high";
  } else if (low(stress)) {
    shape += ", and stress stayed low";
  }

  return shape + ".";
}

/* ---------- The Day in a Line ---------- */

function generateOverview(inputs) {
  // Just the one-line read. The substance moves into the takeaways below.
  return describeRatings(inputs);
}

/* ---------- What Mattered (distilled report lines) ---------- */

function generateTakeaways(inputs) {
  const takeaways = [];

  if (inputs.success) {
    takeaways.push(`Win — ${trimDot(inputs.success)}`);
  }
  if (inputs.lesson) {
    takeaways.push(`Lesson — ${trimDot(inputs.lesson)}`);
  }
  if (inputs.gratitude.length > 0) {
    takeaways.push(`Grateful for ${joinList(inputs.gratitude)}`);
  }
  if (inputs.unfinished) {
    takeaways.push(`Loose end — ${trimDot(inputs.unfinished)}`);
  }
  if (inputs.notes) {
    takeaways.push(`Also — ${trimDot(inputs.notes)}`);
  }

  if (takeaways.length === 0) {
    takeaways.push("A quiet one — sometimes showing up is the takeaway.");
  }
  return takeaways.slice(0, 5);
}

/* ---------- Carry Into Tomorrow (one tight line) ---------- */

function generateTomorrowFocus(inputs) {
  if (!inputs.tomorrow && !inputs.unfinished) {
    return "Pick one thing that matters and start there.";
  }

  let line = "";
  if (inputs.tomorrow) {
    line = capitalize(trimDot(inputs.tomorrow));
  }

  if (inputs.unfinished) {
    line = line
      ? `${line}, and close out ${lowerFirst(trimDot(inputs.unfinished))}`
      : `Pick up ${lowerFirst(trimDot(inputs.unfinished))}`;
  }

  return ensurePeriod(line);
}

/* ---------- Closing Line ---------- */

function generateClosingLine(inputs) {
  const { mood, energy, focus, stress } = inputs;

  if (mood >= 7 && energy >= 7 && focus >= 7) {
    return "Momentum is built through days like this.";
  }
  if (stress >= 7) {
    return "Not perfect, but useful.";
  }
  if (inputs.lesson && inputs.tomorrow) {
    return "Clear lesson, clear next step.";
  }
  if (energy <= 4 || focus <= 4) {
    return "Tomorrow has one job: show up clearly.";
  }
  return "Good day to build from.";
}

/* ---------- Helpers ---------- */

function lowerFirst(str) {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function trimDot(str) {
  if (!str) return str;
  return str.trim().replace(/[.\s]+$/, "");
}

function ensurePeriod(str) {
  if (!str) return str;
  return /[.!?]$/.test(str.trim()) ? str.trim() : str.trim() + ".";
}

function joinList(arr) {
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------- Render to page ---------- */

function renderOutput(inputs) {
  const overview = generateOverview(inputs);
  const takeaways = generateTakeaways(inputs);
  const tomorrow = generateTomorrowFocus(inputs);
  const closing = generateClosingLine(inputs);

  const takeawaysHtml = takeaways
    .map((t) => `<li>${escapeHtml(t)}</li>`)
    .join("");

  const html = `
    <h1>Day Insights</h1>

    <h2>The Day in a Line</h2>
    <p>${escapeHtml(overview)}</p>

    <h2>What Mattered</h2>
    <ul>${takeawaysHtml}</ul>

    <h2>Carry Into Tomorrow</h2>
    <p>${escapeHtml(tomorrow)}</p>

    <div class="closing-line">${escapeHtml(closing)}</div>
  `;

  document.getElementById("output").innerHTML = html;
  document.getElementById("output-card").hidden = false;
  document.getElementById("placeholder").hidden = true;
}

/* ---------- Reset ---------- */

function resetForm() {
  document.getElementById("journal-form").reset();
  ["mood", "energy", "focus", "stress"].forEach(syncSliderLabel);

  document.getElementById("output").innerHTML = "";
  document.getElementById("output-card").hidden = true;
  document.getElementById("placeholder").hidden = false;
}

/* ---------- Slider label sync ---------- */

function syncSliderLabel(id) {
  const slider = document.getElementById(id);
  document.getElementById(`${id}-value`).textContent = slider.value;
}

/* ---------- Init ---------- */

function init() {
  ["mood", "energy", "focus", "stress"].forEach((id) => {
    const slider = document.getElementById(id);
    slider.addEventListener("input", () => syncSliderLabel(id));
    syncSliderLabel(id);
  });

  document.getElementById("generate-btn").addEventListener("click", () => {
    renderOutput(getInputs());
    document.getElementById("output-card").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.getElementById("reset-btn").addEventListener("click", resetForm);
}

document.addEventListener("DOMContentLoaded", init);
