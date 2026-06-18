/* ===========================================================
   Mindful Golf — app.js
   Local-first golf journal + rules-based mental coach.
   No backend, no build tools. Pure vanilla JS + localStorage.
   =========================================================== */
(function () {
  'use strict';

  /* -----------------------------------------------------------
     Storage keys + helpers
  ----------------------------------------------------------- */
  const KEYS = {
    entries: 'mindfulGolf.entries',
    swingNotes: 'mindfulGolf.swingNotes',
    drillResults: 'mindfulGolf.drillResults',
    settings: 'mindfulGolf.settings',
  };

  const load = (k, fallback) => {
    try {
      const raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('Failed to read', k, e);
      return fallback;
    }
  };
  const save = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) { console.warn('Failed to write', k, e); toast('Storage error — data may not be saved'); }
  };

  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* -----------------------------------------------------------
     App state
  ----------------------------------------------------------- */
  const state = {
    entries: load(KEYS.entries, []),
    swingNotes: load(KEYS.swingNotes, []),
    drillResults: load(KEYS.drillResults, []),
    settings: load(KEYS.settings, { name: 'Golfer', onboarded: false }),
    view: 'landing',
    params: {},
    // transient draft for the new-entry flow
    draft: null,
    filters: { feed: 'All', swing: 'All', drillCat: 'All' },
    search: '',
  };

  const persistAll = () => {
    save(KEYS.entries, state.entries);
    save(KEYS.swingNotes, state.swingNotes);
    save(KEYS.drillResults, state.drillResults);
    save(KEYS.settings, state.settings);
  };

  /* -----------------------------------------------------------
     Tiny DOM helpers
  ----------------------------------------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const els = {
    header: $('#appHeader'),
    main: $('#app'),
    nav: $('#bottomNav'),
    toast: $('#toast'),
    modal: $('#modalHost'),
    shell: $('#appShell'),
  };

  let toastTimer;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2400);
  }

  /* -----------------------------------------------------------
     Date helpers
  ----------------------------------------------------------- */
  const todayISO = () => new Date().toISOString().slice(0, 10);
  function fmtDate(iso, opts) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtDateShort(iso) { return fmtDate(iso, { month: 'short', day: 'numeric' }); }
  function relativeDay(iso) {
    const d = new Date(iso + 'T00:00:00');
    const now = new Date(todayISO() + 'T00:00:00');
    const diff = Math.round((now - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff > 1 && diff < 7) return diff + ' days ago';
    return fmtDateShort(iso);
  }
  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  /* -----------------------------------------------------------
     Icons (inline SVG)
  ----------------------------------------------------------- */
  const I = {
    journal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2z"/><path d="M8 7h6M8 11h6M8 15h4"/></svg>',
    swing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/></svg>',
    drills: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v13"/><circle cx="12" cy="18.5" r="3.2"/><path d="M12 4l5 2-5 2"/></svg>',
    stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5M4 19h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    star: (on) => '<svg viewBox="0 0 24 24" fill="' + (on ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9z"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L16.2 3h-4l-.4 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5.4 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1c.6.5 1.3.9 2 1.2l.4 2.5h4l.4-2.5c.7-.3 1.4-.7 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>',
  };

  /* -----------------------------------------------------------
     Activity + rating metadata
  ----------------------------------------------------------- */
  const ACTIVITIES = [
    { key: 'Practiced', cls: 'practice', emoji: '🎯' },
    { key: 'Played', cls: 'played', emoji: '⛳' },
    { key: 'Tournament', cls: 'tournament', emoji: '🏆' },
    { key: 'Lesson', cls: 'lesson', emoji: '📘' },
    { key: 'Mental Training', cls: 'mental', emoji: '🧠' },
    { key: 'Workout/Recovery', cls: 'workout', emoji: '💪' },
  ];
  const activityMeta = (k) => ACTIVITIES.find((a) => a.key === k) || { cls: '', emoji: '•' };

  const RATING_FIELDS = [
    { key: 'putting', label: 'Putting', hint: 'Speed & roll' },
    { key: 'shortGame', label: 'Short Game', hint: 'Around the green' },
    { key: 'approach', label: 'Approach', hint: 'Into greens' },
    { key: 'teeShots', label: 'Tee Shots', hint: 'Off the tee' },
    { key: 'mental', label: 'Mental', hint: 'Composure' },
    { key: 'commitment', label: 'Commitment', hint: 'Decisiveness' },
    { key: 'patience', label: 'Patience', hint: 'Staying steady' },
    { key: 'courseManagement', label: 'Course Mgmt', hint: 'Decisions' },
  ];

  const REFLECTION_FIELDS = [
    { key: 'learned', q: 'What did I learn today?', ph: 'A read, a tendency, a feel…' },
    { key: 'struggled', q: 'What did I struggle with?', ph: 'Be specific and honest.' },
    { key: 'proud', q: "2 things I'm proud of", ph: 'Process wins count.' },
    { key: 'bestMentalMoment', q: 'My best mental moment', ph: 'When were you most present?' },
    { key: 'lostFocus', q: 'Where did I lose focus?', ph: 'The hole, the trigger…' },
    { key: 'adjustment', q: 'One adjustment for next time', ph: 'Keep it process-based.' },
    { key: 'affirmation', q: 'An affirmation or cue to carry forward', ph: '"Smallest target. Commit."' },
  ];

  /* -----------------------------------------------------------
     Built-in drills library
  ----------------------------------------------------------- */
  const DRILL_CATEGORIES = [
    { key: 'Putting', emoji: '🥅' },
    { key: 'Short Game', emoji: '⛳' },
    { key: 'Ball Striking', emoji: '🎯' },
    { key: 'Tee Shots', emoji: '🚀' },
    { key: 'Mental', emoji: '🧠' },
  ];

  const DRILLS = [
    // Putting
    { id: 'spider', name: 'Spider Drill', category: 'Putting',
      purpose: 'Build confidence on short putts and groove a repeatable stroke under pressure.',
      instructions: ['Place 4 balls around a hole at 3 feet, like the legs of a spider.', 'Make all 4 in a row.', 'Move to 4 feet, then 5 feet, repeating the make-all-4 requirement.', 'If you miss, restart that distance.'],
      scoring: 'Record the longest distance where you made all 4 in a row.', mental: 'Commit to your line and accept the result. Each putt is its own event.' },
    { id: '369', name: '3-6-9 Ladder', category: 'Putting',
      purpose: 'Dial in distance control and speed across a range of lengths.',
      instructions: ['Putt 3 balls from 3 feet, 3 from 6 feet, 3 from 9 feet.', 'Score 2 points for a make, 1 point for finishing within a club-length, 0 for short.', 'Track your total out of 18.'],
      scoring: 'Total points out of 18.', mental: 'Focus only on speed. Let the line take care of itself.' },
    { id: 'gate', name: 'Gate Start Line', category: 'Putting',
      purpose: 'Train a square face and pure start line.',
      instructions: ['Set two tees just wider than your putter head, ~6 inches in front of the ball.', 'Roll putts through the gate without touching either tee.', 'Count consecutive clean rolls.'],
      scoring: 'Most consecutive putts through the gate.', mental: 'Quiet eyes on a spot. Trust the start line, then look up.' },
    { id: '30putt', name: '30-Putt Challenge', category: 'Putting',
      purpose: 'Simulate a round of putting and benchmark your green-reading.',
      instructions: ['Drop balls at 15 random spots on the green.', 'Putt out each (count strokes to hole).', 'Add total putts across all spots.'],
      scoring: 'Total putts to hole out 15 locations (lower is better).', mental: 'Treat each as a fresh putt on the course. Routine every time.' },
    // Short Game
    { id: 'updown', name: 'Up-and-Down Challenge', category: 'Short Game',
      purpose: 'Sharpen scrambling and the recovery mindset.',
      instructions: ['Drop 10 balls in varied lies around the green.', 'Chip/pitch then putt out.', 'Count how many you get up-and-down in 2 strokes.'],
      scoring: 'Up-and-downs made out of 10.', mental: 'Pick a precise landing spot. See it, then commit fully.' },
    { id: 'landing', name: 'Landing Spot Ladder', category: 'Short Game',
      purpose: 'Train trajectory and landing-spot control.',
      instructions: ['Place towels/markers at 3 distances.', 'Land 3 chips on each marker in order.', 'Advance only when you land 2 of 3 on a marker.'],
      scoring: 'Furthest ladder rung reached.', mental: 'Land it, don’t hole it. Process over outcome.' },
    { id: '9ball', name: '9-Ball Wedge Matrix', category: 'Short Game',
      purpose: 'Build feel for partial wedge distances.',
      instructions: ['Choose 3 wedges and 3 swing lengths (short, medium, full).', 'Hit one ball with each combination — 9 total.', 'Note carry distance for each.'],
      scoring: 'Number of shots within 10 ft of your target out of 9.', mental: 'Clear number, clear length, no in-between swings.' },
    // Ball Striking
    { id: '9window', name: '9-Shot Window', category: 'Ball Striking',
      purpose: 'Develop control of trajectory and shape.',
      instructions: ['Hit low, medium, high with a draw, straight, and fade — 9 shots.', 'Call each shot before you hit it.', 'Score 1 point for each shot that matches the call.'],
      scoring: 'Matched shots out of 9.', mental: 'Decide the shot fully before stepping in. No hedging.' },
    { id: 'contact', name: 'Contact Ladder', category: 'Ball Striking',
      purpose: 'Improve strike quality and center contact.',
      instructions: ['Apply foot spray or face tape.', 'Hit 10 balls with a mid-iron.', 'Count strikes within a dime-size area of center.'],
      scoring: 'Center strikes out of 10.', mental: 'Soft hands, smooth tempo. Strike is a byproduct of balance.' },
    { id: 'fairway', name: 'Fairway Finder', category: 'Ball Striking',
      purpose: 'Build a reliable stock shot under pressure.',
      instructions: ['Pick a target corridor ~30 yards wide.', 'Hit 10 balls with your stock club.', 'Count how many finish inside the corridor.'],
      scoring: 'Shots in the corridor out of 10.', mental: 'Commit to the corridor, not perfection. Center of the fairway.' },
    // Tee Shots
    { id: 'onecommit', name: 'One-Shot Commitment', category: 'Tee Shots',
      purpose: 'Train full commitment to a single target off the tee.',
      instructions: ['Hit 10 drivers.', 'Before each, complete a full routine and name your target out loud.', 'Score yourself only on commitment (1-5), not result.'],
      scoring: 'Average commitment score across 10 swings.', mental: 'The swing is a vote of confidence in the decision. No steering.' },
    { id: 'corridor', name: 'Target Corridor', category: 'Tee Shots',
      purpose: 'Widen your accuracy under a tee-shot mindset.',
      instructions: ['Define a generous corridor with two reference points.', 'Hit 10 tee shots aiming at the center line.', 'Count fairways found.'],
      scoring: 'Tee shots in the corridor out of 10.', mental: 'Aim small, swing free. Tension is the enemy of the tee shot.' },
    { id: 'driverdecision', name: 'Driver Decision Drill', category: 'Tee Shots',
      purpose: 'Practice the decision of when to hit driver vs. a safer club.',
      instructions: ['Imagine 9 different tee shots (tight, wide, water left, etc.).', 'Decide the club and shot shape for each, then hit it.', 'Score the quality of your decision and execution.'],
      scoring: 'Good decision + committed swing out of 9.', mental: 'Strategy first, ego last. The smart play is the brave play.' },
    // Mental
    { id: '10commit', name: '10-Shot Commitment Challenge', category: 'Mental',
      purpose: 'Build a habit of total commitment to every shot.',
      instructions: ['Play or hit 10 shots.', 'Rate your pre-shot commitment 1-5 each time.', 'Goal: average 4.0+ regardless of outcome.'],
      scoring: 'Average commitment rating across 10 shots.', mental: 'Decide, commit, accept. Your job ends at the swing.' },
    { id: 'reset', name: 'Reset Routine Drill', category: 'Mental',
      purpose: 'Train a reliable physical and mental reset between shots.',
      instructions: ['Hit a deliberately bad or pressured shot.', 'Practice your reset: breath, trigger word, eyes to the horizon.', 'Walk and re-engage for the next shot.', 'Repeat 10 times.'],
      scoring: 'How many resets felt fully complete out of 10.', mental: 'You can’t control the last shot. You can always control the next breath.' },
    { id: 'acceptance', name: 'Post-Shot Acceptance Drill', category: 'Mental',
      purpose: 'Separate self-worth from shot outcome.',
      instructions: ['After each shot, say one neutral observation, then let it go.', 'No judgment words ("terrible", "amazing").', 'Track how often you stay neutral over 18 shots.'],
      scoring: 'Neutral, accepting responses out of 18.', mental: 'The score is information, not identity. Observe, accept, advance.' },
    { id: 'tournsim', name: 'Tournament Simulation', category: 'Mental',
      purpose: 'Rehearse competing with consequences before it counts.',
      instructions: ['Set a meaningful challenge (e.g., 9 up-and-downs in a row or restart).', 'Add a real consequence for failure.', 'Play with your full routine, as if it’s the final hole.'],
      scoring: 'Pass / fail, and note how you handled the pressure.', mental: 'Compete to express, not to prove. Pressure is a privilege.' },
  ];
  const drillById = (id) => DRILLS.find((d) => d.id === id);

  /* ===========================================================
     AI COACH RULES ENGINE
  =========================================================== */
  const NEG_WORDS = ['frustrat', 'anxious', 'anxiety', 'rushed', 'rush', 'angry', 'anger', 'scared', 'fear', 'doubt', 'distract', 'tired', 'tense', 'nervous', 'sloppy', 'panic'];
  const POS_WORDS = ['committed', 'commit', 'calm', 'patient', 'patience', 'confident', 'confidence', 'focused', 'focus', 'proud', 'resilient', 'resilience', 'present', 'composed', 'free', 'trust'];

  function collectReflectionText(entry) {
    const r = entry.reflection || {};
    return Object.values(r).filter(Boolean).join(' ').toLowerCase();
  }
  function findWords(text, list) {
    const hits = new Set();
    list.forEach((w) => { if (text.includes(w)) hits.add(w); });
    return Array.from(hits);
  }
  const avgRating = (entry) => {
    const r = entry.ratings || {};
    const vals = Object.values(r).filter((v) => typeof v === 'number' && v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  function generateCoachFeedback(entry, allEntries) {
    const r = entry.ratings || {};
    const get = (k) => (typeof r[k] === 'number' ? r[k] : 0);
    const mental = get('mental'), commitment = get('commitment'), patience = get('patience');
    const teeShots = get('teeShots'), putting = get('putting');
    const isTourn = !!entry.isTournament || (entry.activityTypes || []).includes('Tournament');
    const score = typeof entry.score === 'number' ? entry.score : (entry.score ? Number(entry.score) : null);
    const text = collectReflectionText(entry);

    const focusTags = [];
    const riskFlags = [];
    const positiveSignals = [];
    const takes = [];
    let actionStep = '';
    let affirmation = entry.reflection && entry.reflection.affirmation
      ? entry.reflection.affirmation
      : 'Commit to the target. Accept the result.';
    let headline = 'Focus on one clear process for next time.';
    let mainPattern = '';

    // ---- word detection ----
    const negs = findWords(text, NEG_WORDS);
    const poss = findWords(text, POS_WORDS);
    if (negs.length) riskFlags.push('Emotional load: ' + negs.slice(0, 3).join(', '));
    poss.forEach((w) => positiveSignals.push(w));

    // ---- rating-based rules (priority order) ----
    if (mental && mental <= 2) {
      focusTags.push('Attention control', 'Post-shot routine');
      riskFlags.push('Low composure');
      takes.push('Attention scattered when results turned. At your level the swing isn’t the variable — where the mind goes between shots is. The skill is narrowing attention to one external target and letting outcome thoughts pass without engaging them.');
      actionStep = 'Define a post-shot routine: a fixed window to react, a physical trigger to release it, then full attention back on the next target. Train it until it runs without thought.';
      headline = 'Focus on attention control between shots.';
      mainPattern = 'Composure, not ball-striking, was the limiting factor.';
    }
    if (commitment && commitment <= 2) {
      focusTags.push('Decision commitment', 'Pre-shot routine');
      riskFlags.push('Indecision before shots');
      takes.push('Tentative contact traces back to an unresolved decision. Execution at this level requires the decision to be complete before the club moves — club, shape, start line, target. Once it’s settled, the swing is only delivery.');
      if (!actionStep) actionStep = 'Separate the think box from the play box. Resolve every decision behind the ball; step in only when there is nothing left to decide.';
      if (!mainPattern) { mainPattern = 'Indecision, not mechanics, produced the misses.'; headline = 'Focus on the decision, not the swing.'; }
    }
    if (patience && patience <= 2) {
      focusTags.push('Emotional control', 'Strategic discipline');
      riskFlags.push('Pressing after mistakes');
      takes.push('Pressing turned one mistake into several. The discipline is accepting variance — even good shots find trouble — and refusing to force the recovery. Play the percentages on the next shot regardless of the last one.');
      if (!actionStep) actionStep = 'After any bogey or worse, take the highest-percentage option on the following shot. No recoveries that require a perfect strike while emotion is elevated.';
      if (!mainPattern) { mainPattern = 'Urgency after dropped shots compounded the damage.'; headline = 'Focus on staying neutral after mistakes.'; }
    }
    if (teeShots && teeShots <= 2) {
      focusTags.push('Target focus off the tee');
      takes.push('Steering shows up when the target is vague. Commit to a specific point rather than a fairway — a defined intermediate target lets the body deliver the club freely instead of guiding it.');
      if (!actionStep) actionStep = 'On every tee shot, pick a precise aim point and a single intermediate target, then commit to a full release toward it. Width over guidance.';
      if (!mainPattern) mainPattern = 'Vague targets, not the swing, produced the tentative tee shots.';
    }
    if (putting && putting <= 2) {
      focusTags.push('Speed control', 'Outcome acceptance');
      takes.push('Demanding makes raises tension and shortens the stroke. Prioritise speed and a committed start line, then accept the result. Putting rewards a clear process and a quiet reaction, not a demand for makes.');
      if (!actionStep) actionStep = 'On the greens, set speed first, roll it on your read, and let the result be what it is before you look up.';
      if (!mainPattern) mainPattern = 'The putting frustration was about outcome, not the stroke.';
    }

    // ---- score vs. mindset relationships ----
    const highMindset = (mental >= 4 || commitment >= 4);
    const lowMindset = (mental && mental <= 2);
    if (score != null && !isNaN(score)) {
      const high = entry.holes === 9 ? score >= 40 : score >= 76;
      const low = entry.holes === 9 ? score <= 35 : score <= 70;
      if (high && highMindset) {
        positiveSignals.push('composure under a tough scorecard');
        takes.push('The number was high but your process and composure held. That is the rep that transfers — controlling the controllables when the score isn’t cooperating. Keep the standard tied to execution, not the result.');
        if (!mainPattern) { mainPattern = 'You managed the round well despite the scoring.'; headline = 'Focus on execution, not the scoreboard.'; }
      }
      if (low && lowMindset) {
        riskFlags.push('Confidence tied to outcome');
        takes.push('You scored well without your best attention, which makes today’s confidence outcome-dependent. Confidence built only on results disappears when results do. Anchor it to your process so it holds on the days the ball doesn’t cooperate.');
        if (!mainPattern) { mainPattern = 'Good score, but the process underneath wasn’t there.'; headline = 'Focus on process over result.'; }
      }
    }

    // ---- tournament context ----
    if (isTourn) {
      focusTags.push('Competitive focus');
      takes.push('In competition the trap is playing not to lose — protecting a position instead of executing each shot. Give full attention to the shot in front of you and let the score be a by-product of the process, not its object.');
      if (!mainPattern) { mainPattern = 'Competitive pressure is information about what matters, not a problem to solve.'; }
      if (headline === 'Focus on one clear process for next time.') headline = 'Focus on the shot in front of you.';
    }

    // ---- pattern recognition across recent entries ----
    const recent = (allEntries || [])
      .filter((e) => e.id !== entry.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 5);
    const struggleBank = {};
    [entry].concat(recent).forEach((e) => {
      const s = (e.reflection && e.reflection.struggled || '').toLowerCase();
      ['putt', 'driver', 'tee', 'focus', 'patien', 'short game', 'wedge', 'commit', 'tempo', 'three putt', '3 putt', 'speed', 'tension', 'rush'].forEach((term) => {
        if (s.includes(term)) struggleBank[term] = (struggleBank[term] || 0) + 1;
      });
    });
    const repeated = Object.entries(struggleBank).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
    if (repeated.length) {
      const term = repeated[0][0];
      takes.push('"' + term + '" has appeared across several recent sessions. That is a defined pattern, not noise — make it the focus of isolated, deliberate practice this week rather than addressing it on the course.');
      focusTags.push('Recurring theme: ' + term);
      if (mainPattern === '') mainPattern = 'A recurring theme is showing up in your reflections.';
    }

    // ---- average-rating fallbacks ----
    const avg = avgRating(entry);
    if (!takes.length) {
      if (avg >= 4) {
        takes.push('Controlled across every area, with composure and commitment present. There is nothing to fix here — the task is repeatability. Identify what made the process work today and make it the standard, not the ceiling.');
        headline = 'Focus on repeating today’s process.';
        mainPattern = 'Balanced, controlled performance across the board.';
        positiveSignals.push('balanced performance');
      } else if (avg > 0) {
        takes.push('A controlled, average session with no clear gap. Progress now comes from isolating one variable and improving it deliberately rather than working on everything at once.');
        headline = 'Focus on one area at a time.';
        mainPattern = 'No clear weakness — pick a single area to develop.';
      } else {
        takes.push('Reflection is most useful when it is specific. Record where your attention went, what you committed to, and how you reacted to results — that is the data that reveals what to work on.');
        headline = 'Focus on logging the details that matter.';
        mainPattern = 'Limited data — keep recording to surface patterns.';
      }
    }

    // ---- positive reinforcement from high ratings ----
    if (commitment >= 4) positiveSignals.push('strong commitment');
    if (patience >= 4) positiveSignals.push('real patience');
    if (mental >= 4) positiveSignals.push('composure under pressure');

    // ---- defaults ----
    if (!actionStep) actionStep = 'Choose one process focus for your next session and evaluate yourself on execution of it, independent of the score.';
    if (!mainPattern) mainPattern = 'Consistent process — keep refining one area at a time.';

    // de-dup tags
    const dedupe = (arr) => Array.from(new Set(arr));

    const coachTake = takes.slice(0, 3).join(' ');

    return {
      headline,
      mainPattern,
      coachTake,
      actionStep,
      affirmation,
      focusTags: dedupe(focusTags).slice(0, 5),
      riskFlags: dedupe(riskFlags).slice(0, 4),
      positiveSignals: dedupe(positiveSignals).slice(0, 5),
    };
  }

  // expose for debugging/console use
  window.MindfulGolf = { generateCoachFeedback, state };

  /* ===========================================================
     RENDER ORCHESTRATION
  =========================================================== */
  const VIEWS_WITH_NAV = new Set(['overview', 'swing', 'drills', 'stats']);
  const NAV_TAB_FOR = { overview: 'journal', swing: 'swing', drills: 'drills', stats: 'stats' };

  function go(view, params) {
    state.view = view;
    state.params = params || {};
    els.main.scrollTop = 0;
    render();
  }

  function render() {
    const v = state.view;
    els.shell.classList.toggle('wide', v === 'stats');

    // header
    els.header.innerHTML = headerFor(v);
    // main
    els.main.classList.toggle('no-nav', !VIEWS_WITH_NAV.has(v) && v !== 'landing');
    els.main.innerHTML = '<div class="view">' + viewFor(v) + '</div>';
    // nav
    els.nav.innerHTML = (VIEWS_WITH_NAV.has(v)) ? navHTML(NAV_TAB_FOR[v]) : '';

    bindCommon();
    if (viewBinders[v]) viewBinders[v]();
  }

  function headerFor(v) {
    switch (v) {
      case 'landing': return '';
      case 'overview': {
        const name = esc(state.settings.name || 'Golfer');
        return `<div class="header-row">
          <div class="header-titles">
            <p class="header-eyebrow">${greeting()}</p>
            <h1 class="header-title">Hi ${name} 👋</h1>
            <p class="header-sub">${fmtDate(todayISO(), { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <button class="icon-btn" data-go="settings" aria-label="Settings">${I.settings}</button>
        </div>`;
      }
      case 'swing': return simpleHeader('Library', 'Swing Notes & Video', true);
      case 'drills': return simpleHeader('Train', 'Drills Library', true);
      case 'stats': return simpleHeader('Insights', 'Performance Stats', true);
      case 'settings': return simpleHeader('Manage', 'Settings & Data', false, true);
      case 'newEntry': return '';
      case 'entry': return '';
      case 'drillDetail': return '';
      default: return '';
    }
  }
  function simpleHeader(eyebrow, title, showSettings, back) {
    return `<div class="header-row">
      <div class="header-titles">
        ${back ? `<button class="back-btn" data-go="overview">${I.back} Journal</button>` : ''}
        <p class="header-eyebrow">${esc(eyebrow)}</p>
        <h1 class="header-title">${esc(title)}</h1>
      </div>
      ${showSettings ? `<button class="icon-btn" data-go="settings" aria-label="Settings">${I.settings}</button>` : ''}
    </div>`;
  }

  function viewFor(v) {
    switch (v) {
      case 'landing': return renderLanding();
      case 'overview': return renderOverview();
      case 'newEntry': return renderNewEntry();
      case 'entry': return renderEntryDetail();
      case 'drills': return renderDrills();
      case 'drillDetail': return renderDrillDetail();
      case 'swing': return renderSwing();
      case 'stats': return renderStats();
      case 'settings': return renderSettings();
      default: return '<div class="empty"><h3>Not found</h3></div>';
    }
  }

  const viewBinders = {};

  /* -----------------------------------------------------------
     Bottom nav
  ----------------------------------------------------------- */
  function navHTML(active) {
    const item = (tab, view, label, icon) =>
      `<button class="nav-item ${active === tab ? 'active' : ''} ${tab === 'journal' ? 'j' : ''}" data-go="${view}">${icon}<span>${label}</span></button>`;
    return (
      item('journal', 'overview', 'Journal', I.journal) +
      item('swing', 'swing', 'Swing', I.swing) +
      `<button class="nav-fab" data-action="new-entry" aria-label="New entry">${I.plus}</button>` +
      item('drills', 'drills', 'Drills', I.drills) +
      item('stats', 'stats', 'Stats', I.stats)
    );
  }

  function bindCommon() {
    $$('[data-go]').forEach((el) => {
      el.addEventListener('click', () => go(el.getAttribute('data-go')));
    });
    $$('[data-action="new-entry"]').forEach((el) => {
      el.addEventListener('click', () => startNewEntry());
    });
  }

  /* ===========================================================
     LANDING
  =========================================================== */
  function renderLanding() {
    return `<div class="landing view">
      <div class="mark">⛳</div>
      <h1>Mindful Golf</h1>
      <p class="tagline">Journal. Reflect. Compete with a clearer mind.</p>
      <button class="btn btn-primary btn-lg" data-action="start">Start Journaling</button>
      <button class="btn btn-ghost btn-lg" data-action="demo">Load Demo Data</button>
      <div class="feat-row">
        <div class="feat"><span class="fi">📝</span>Reflect</div>
        <div class="feat"><span class="fi">🧠</span>AI Coach</div>
        <div class="feat"><span class="fi">📈</span>Track</div>
      </div>
      <p class="footnote">Your private golf journal with a built-in mental performance coach. Everything stays on this device — no account, no cloud.</p>
    </div>`;
  }
  viewBinders.landing = function () {
    $('[data-action="start"]').addEventListener('click', () => {
      state.settings.onboarded = true; save(KEYS.settings, state.settings);
      go('overview');
    });
    $('[data-action="demo"]').addEventListener('click', () => {
      loadDemoData(); go('overview'); toast('Demo data loaded — explore away! ⛳');
    });
  };

  /* ===========================================================
     OVERVIEW / FEED
  =========================================================== */
  function avgOf(entries, path) {
    const vals = entries.map((e) => {
      const v = path(e);
      return typeof v === 'number' && v > 0 ? v : null;
    }).filter((x) => x != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  function renderOverview() {
    const entries = sortedEntries();
    const total = entries.length;
    const avgMental = avgOf(entries, (e) => e.ratings && e.ratings.mental);
    const avgCommit = avgOf(entries, (e) => e.ratings && e.ratings.commitment);
    const lastScored = entries.find((e) => e.score != null && e.score !== '' && !isNaN(Number(e.score)));

    const stats = `<div class="stat-grid">
      ${statCard(total, 'Total entries')}
      ${statCard(avgMental ? avgMental.toFixed(1) : '—', 'Avg mental')}
      ${statCard(avgCommit ? avgCommit.toFixed(1) : '—', 'Avg commitment')}
      ${statCard(lastScored ? lastScored.score : '—', 'Last score')}
    </div>`;

    const filters = ['All', 'Starred', 'Tournament', 'Practice', 'Rounds'];
    const pills = `<div class="pill-row" id="feedFilters">
      ${filters.map((f) => `<button class="pill ${state.filters.feed === f ? 'active' : ''}" data-filter="${f}">${f}</button>`).join('')}
    </div>`;

    const searchBox = `<div class="search-wrap" style="margin:12px 0 4px;">
      ${I.search}
      <input class="input" id="feedSearch" type="search" placeholder="Search entries, courses, notes…" value="${esc(state.search)}" />
    </div>`;

    const list = filteredEntries();
    let listHTML;
    if (!total) {
      listHTML = `<div class="empty">
        <div class="emoji">🌱</div>
        <h3>Your journal is empty</h3>
        <p>Log your first round or practice session and get instant feedback from your mental coach.</p>
        <button class="btn btn-primary btn-lg" data-action="new-entry">Create your first entry</button>
        <div style="height:10px"></div>
        <button class="btn btn-ghost btn-sm" data-action="demo-feed">Or load demo data</button>
      </div>`;
    } else if (!list.length) {
      listHTML = `<div class="empty"><div class="emoji">🔍</div><h3>No matches</h3><p>Try a different filter or search.</p></div>`;
    } else {
      listHTML = list.map(entryCardHTML).join('');
    }

    return stats + pills + searchBox +
      `<div class="section-label">${total ? 'Recent entries' : ''}</div>` +
      `<div id="feedList">${listHTML}</div>`;
  }

  function statCard(value, label, spark) {
    return `<div class="stat-card"><div class="stat-value">${esc(value)}</div><div class="stat-label">${esc(label)}</div>${spark || ''}</div>`;
  }

  function entryCardHTML(e) {
    const acts = (e.activityTypes || []).slice(0, 3).map((a) => {
      const m = activityMeta(a);
      return `<span class="tag ${m.cls}">${m.emoji} ${esc(a)}</span>`;
    }).join('');
    const scoreTag = (e.score != null && e.score !== '') ? `<span class="tag score">${esc(e.score)}${e.holes ? ' · ' + e.holes : ''}</span>` : '';
    const mental = e.ratings && e.ratings.mental;
    const commit = e.ratings && e.ratings.commitment;
    const preview = firstReflection(e);
    const coachLine = e.coachFeedback && e.coachFeedback.headline ? e.coachFeedback.headline : null;

    return `<div class="entry-card" data-entry="${e.id}">
      <div class="entry-top">
        <div>
          <div class="entry-date">${relativeDay(e.date)}</div>
          <div class="entry-title">${esc(e.title || 'Untitled session')}</div>
          ${e.course ? `<div class="entry-course">📍 ${esc(e.course)}</div>` : ''}
        </div>
        <button class="star-btn ${e.isStarred ? 'on' : ''}" data-star="${e.id}" aria-label="Star">${I.star(e.isStarred)}</button>
      </div>
      <div class="tag-row">${acts}${scoreTag}</div>
      ${(mental || commit) ? `<div class="entry-metrics">
        ${mental ? metricHTML('Mental', mental) : ''}
        ${commit ? metricHTML('Commit', commit, true) : ''}
      </div>` : ''}
      ${preview ? `<p class="entry-preview">${esc(preview)}</p>` : ''}
      ${coachLine ? `<div class="coach-take"><span class="ico">🧠</span><span><b>Coach:</b> ${esc(coachLine)}</span></div>` : ''}
    </div>`;
  }

  function metricHTML(label, val, green) {
    let dots = '';
    for (let i = 1; i <= 5; i++) dots += `<span class="mini-dot ${i <= val ? 'on' : ''} ${green ? 'green' : ''}"></span>`;
    return `<span class="metric"><span class="mlabel">${label}</span><span class="mini-dots">${dots}</span></span>`;
  }

  function firstReflection(e) {
    const r = e.reflection || {};
    return r.learned || r.proud || r.struggled || r.adjustment || r.bestMentalMoment || '';
  }

  function sortedEntries() {
    return state.entries.slice().sort((a, b) => {
      const d = (b.date || '').localeCompare(a.date || '');
      return d !== 0 ? d : (b.createdAt || 0) - (a.createdAt || 0);
    });
  }
  function filteredEntries() {
    let list = sortedEntries();
    const f = state.filters.feed;
    if (f === 'Starred') list = list.filter((e) => e.isStarred);
    else if (f === 'Tournament') list = list.filter((e) => e.isTournament || (e.activityTypes || []).includes('Tournament'));
    else if (f === 'Practice') list = list.filter((e) => (e.activityTypes || []).includes('Practiced') || (e.activityTypes || []).includes('Mental Training'));
    else if (f === 'Rounds') list = list.filter((e) => (e.activityTypes || []).includes('Played') || (e.activityTypes || []).includes('Tournament'));
    const q = state.search.trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        const hay = [e.title, e.course, e.conditions, firstReflection(e), (e.activityTypes || []).join(' '),
          e.coachFeedback && e.coachFeedback.headline].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }

  viewBinders.overview = function () {
    $$('#feedFilters .pill').forEach((p) => p.addEventListener('click', () => {
      state.filters.feed = p.getAttribute('data-filter'); render();
    }));
    const search = $('#feedSearch');
    if (search) {
      search.addEventListener('input', () => {
        state.search = search.value;
        $('#feedList').innerHTML = renderFeedListOnly();
        bindFeedList();
      });
    }
    bindFeedList();
    const demoBtn = $('[data-action="demo-feed"]');
    if (demoBtn) demoBtn.addEventListener('click', () => { loadDemoData(); go('overview'); toast('Demo data loaded ⛳'); });
  };

  function renderFeedListOnly() {
    const list = filteredEntries();
    if (!list.length) return `<div class="empty"><div class="emoji">🔍</div><h3>No matches</h3><p>Try a different filter or search.</p></div>`;
    return list.map(entryCardHTML).join('');
  }
  function bindFeedList() {
    $$('.entry-card[data-entry]').forEach((c) => {
      c.addEventListener('click', (ev) => {
        if (ev.target.closest('[data-star]')) return;
        go('entry', { id: c.getAttribute('data-entry') });
      });
    });
    $$('[data-star]').forEach((b) => b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleStar(b.getAttribute('data-star'));
    }));
    $$('[data-action="new-entry"]').forEach((el) => el.addEventListener('click', () => startNewEntry()));
  }

  function toggleStar(id) {
    const e = state.entries.find((x) => x.id === id);
    if (!e) return;
    e.isStarred = !e.isStarred; e.updatedAt = Date.now();
    save(KEYS.entries, state.entries);
    render();
  }

  /* ===========================================================
     NEW ENTRY FLOW
  =========================================================== */
  function blankDraft() {
    return {
      id: uid(),
      date: todayISO(),
      title: '',
      activityTypes: [],
      course: '',
      holes: 18,
      score: '',
      isTournament: false,
      isStarred: false,
      conditions: '',
      energyLevel: 0,
      focusLevel: 0,
      ratings: { putting: 0, shortGame: 0, approach: 0, teeShots: 0, mental: 0, commitment: 0, patience: 0, courseManagement: 0 },
      reflection: { learned: '', struggled: '', proud: '', bestMentalMoment: '', lostFocus: '', adjustment: '', affirmation: '' },
      drillResults: [],
      swingNotes: [],
      coachFeedback: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      _step: 1,
      _editing: false,
      _pendingDrills: [],
      _pendingSwings: [],
    };
  }

  function startNewEntry() {
    state.draft = blankDraft();
    go('newEntry');
  }
  function startEditEntry(id) {
    const e = state.entries.find((x) => x.id === id);
    if (!e) return;
    const d = JSON.parse(JSON.stringify(e));
    d._step = 1; d._editing = true; d._pendingDrills = []; d._pendingSwings = [];
    // keep existing linked items visible in step 5 summary
    d._existingDrills = state.drillResults.filter((r) => r.linkedEntryId === id).map((r) => r.id);
    d._existingSwings = state.swingNotes.filter((s) => s.linkedEntryId === id).map((s) => s.id);
    state.draft = d;
    go('newEntry');
  }

  const STEP_TITLES = [
    { t: 'When & what', d: 'Set the date, name the session, and tag what you did.' },
    { t: 'Round details', d: 'Where you played and how the conditions felt.' },
    { t: 'Rate your game', d: 'Quick gut-check on each part of your game, 1 to 5.' },
    { t: 'Reflect', d: 'A few honest prompts. Skip any that don’t apply.' },
    { t: 'Add-ons', d: 'Optionally log a drill result or a swing note.' },
    { t: 'Review & save', d: 'Looks good? Generate your coach feedback and save.' },
  ];

  function renderNewEntry() {
    const d = state.draft;
    if (!d) { startNewEntry(); return ''; }
    const step = d._step;
    const segs = STEP_TITLES.map((_, i) => {
      const n = i + 1;
      const cls = n < step ? 'done' : (n === step ? 'current' : '');
      return `<div class="step-seg ${cls}"><div class="fill"></div></div>`;
    }).join('');

    const meta = STEP_TITLES[step - 1];
    let body = '';
    if (step === 1) body = stepActivity(d);
    else if (step === 2) body = stepDetails(d);
    else if (step === 3) body = stepRatings(d);
    else if (step === 4) body = stepReflection(d);
    else if (step === 5) body = stepAddons(d);
    else if (step === 6) body = stepReview(d);

    const nextLabel = step === 6 ? 'Generate Coach Feedback & Save' : 'Continue';
    return `<div class="view">
      <button class="back-btn" data-action="exit-flow">${I.back} ${d._editing ? 'Cancel edit' : 'Cancel'}</button>
      <div class="stepper">${segs}</div>
      <div class="step-count">Step ${step} of 6</div>
      <h2 class="form-title">${meta.t}</h2>
      <p class="form-desc">${meta.d}</p>
      ${body}
      <div class="step-actions">
        ${step > 1 ? `<button class="btn btn-ghost" data-action="prev">Back</button>` : ''}
        <button class="btn btn-primary" data-action="next">${nextLabel}</button>
      </div>
    </div>`;
  }

  function stepActivity(d) {
    return `<div class="field">
        <label class="field-label">Date</label>
        <input class="input" type="date" id="f-date" value="${esc(d.date)}" max="${todayISO()}">
      </div>
      <div class="field">
        <label class="field-label">Session name <span class="muted">(required)</span></label>
        <input class="input" id="f-title" placeholder="e.g. Saturday round at Pine Hill" value="${esc(d.title)}">
      </div>
      <div class="field">
        <label class="field-label">What did you do?</label>
        <div class="chip-grid" id="f-acts">
          ${ACTIVITIES.map((a) => `<button type="button" class="chip ${d.activityTypes.includes(a.key) ? 'checked' : ''}" data-act="${a.key}"><span class="dot">${a.emoji}</span>${a.key}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <div class="row-between">
          <div><label class="field-label" style="margin:0">Favorite this entry</label><div class="field-hint" style="margin-top:2px">Star it for quick access later.</div></div>
          <button type="button" class="star-btn ${d.isStarred ? 'on' : ''}" id="f-star" style="width:40px;height:40px">${I.star(d.isStarred)}</button>
        </div>
      </div>`;
  }

  function stepDetails(d) {
    return `<div class="field">
        <label class="field-label">Course / location</label>
        <input class="input" id="f-course" placeholder="Course or facility" value="${esc(d.course)}">
      </div>
      <div class="field">
        <label class="field-label">Holes</label>
        <div class="segmented" id="f-holes">
          <button type="button" data-h="9" class="${d.holes === 9 ? 'active' : ''}">9 holes</button>
          <button type="button" data-h="18" class="${d.holes === 18 ? 'active' : ''}">18 holes</button>
        </div>
      </div>
      <div class="field">
        <label class="field-label">Score</label>
        <input class="input" id="f-score" type="number" inputmode="numeric" placeholder="Optional" value="${esc(d.score)}">
      </div>
      <div class="field">
        <label class="field-label">Conditions</label>
        <input class="input" id="f-conditions" placeholder="e.g. Windy, firm greens" value="${esc(d.conditions)}">
      </div>
      ${ratingPicker('Energy level', 'energyLevel', d.energyLevel, ['Drained', 'Fresh'])}
      ${ratingPicker('Focus level', 'focusLevel', d.focusLevel, ['Scattered', 'Locked in'])}
      <div class="field" style="margin-top:18px">
        <div class="row-between">
          <div><label class="field-label" style="margin:0">Tournament round</label><div class="field-hint" style="margin-top:2px">Tracked separately in your stats.</div></div>
          <label class="switch"><input type="checkbox" id="f-tourn" ${d.isTournament ? 'checked' : ''}><span class="track"></span><span class="knob"></span></label>
        </div>
      </div>`;
  }

  // single inline rating picker used for energy/focus
  function ratingPicker(label, key, val, ends) {
    let dots = '';
    for (let i = 1; i <= 5; i++) {
      const cls = i <= val ? (i <= 2 ? 'on low' : i >= 4 ? 'on high' : 'on') : '';
      dots += `<button type="button" class="rating-dot ${cls}" data-rk="${key}" data-rv="${i}">${i}</button>`;
    }
    return `<div class="field">
      <label class="field-label">${label}</label>
      <div class="rating-row" style="padding-top:4px">
        <span class="muted" style="font-size:12px">${ends[0]}</span>
        <div class="rating-dots">${dots}</div>
        <span class="muted" style="font-size:12px">${ends[1]}</span>
      </div>
    </div>`;
  }

  function stepRatings(d) {
    return `<div class="card">
      ${RATING_FIELDS.map((f) => {
        const val = d.ratings[f.key] || 0;
        let dots = '';
        for (let i = 1; i <= 5; i++) {
          const cls = i <= val ? (i <= 2 ? 'on low' : i >= 4 ? 'on high' : 'on') : '';
          dots += `<button type="button" class="rating-dot ${cls}" data-rk="ratings.${f.key}" data-rv="${i}">${i}</button>`;
        }
        return `<div class="rating-row">
          <div class="rating-name">${f.label}<small>${f.hint}</small></div>
          <div class="rating-dots">${dots}</div>
        </div>`;
      }).join('')}
    </div>
    <p class="field-hint center" style="margin-top:14px">Tap a number to rate. Leave any blank — your coach works with whatever you give it.</p>`;
  }

  function stepReflection(d) {
    return REFLECTION_FIELDS.map((f) => `<div class="field">
      <label class="field-label">${f.q}</label>
      <textarea class="textarea" data-rf="${f.key}" placeholder="${esc(f.ph)}">${esc(d.reflection[f.key] || '')}</textarea>
    </div>`).join('');
  }

  function stepAddons(d) {
    const drillList = d._pendingDrills.map((r, i) => `<div class="addon-item">
      <span class="ai-ico">🎯</span>
      <div class="ai-text"><b>${esc(r.drillName)}</b> · <span>${esc(r.category)}${r.score ? ' · ' + esc(r.score) : ''}</span></div>
      <button class="ai-del" data-del-drill="${i}">✕</button>
    </div>`).join('');
    const swingList = d._pendingSwings.map((s, i) => `<div class="addon-item">
      <span class="ai-ico">🏌️</span>
      <div class="ai-text"><b>${esc(s.title)}</b> · <span>${esc(s.category)}</span></div>
      <button class="ai-del" data-del-swing="${i}">✕</button>
    </div>`).join('');

    return `<div class="card">
        <div class="row-between"><h4 style="margin:0;font-size:15px">🎯 Drill results</h4></div>
        <p class="field-hint" style="margin:6px 0 0">Log how a practice drill went.</p>
        ${drillList || ''}
        <button class="btn btn-ghost btn-sm btn-block" style="margin-top:12px" data-action="add-drill">+ Add drill result</button>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="row-between"><h4 style="margin:0;font-size:15px">🏌️ Swing notes</h4></div>
        <p class="field-hint" style="margin:6px 0 0">Capture a swing thought and what to check next.</p>
        ${swingList || ''}
        <button class="btn btn-ghost btn-sm btn-block" style="margin-top:12px" data-action="add-swing">+ Add swing note</button>
      </div>`;
  }

  function stepReview(d) {
    const acts = (d.activityTypes || []).map((a) => { const m = activityMeta(a); return `<span class="tag ${m.cls}">${m.emoji} ${a}</span>`; }).join(' ') || '<span class="muted">None</span>';
    const ratedCount = Object.values(d.ratings).filter((v) => v > 0).length;
    const reflCount = Object.values(d.reflection).filter(Boolean).length;
    const line = (k, v) => `<div class="review-line"><span class="rl-k">${k}</span><span class="rl-v">${v}</span></div>`;
    return `<div class="card">
      <div class="row-between" style="margin-bottom:10px">
        <div><div class="entry-date">${relativeDay(d.date)}</div><h3 style="margin:3px 0 0;font-family:var(--font-display);font-weight:600;font-size:19px">${esc(d.title || 'Untitled session')}</h3></div>
        ${d.isStarred ? `<span class="star-btn on" style="width:32px;height:32px">${I.star(true)}</span>` : ''}
      </div>
      <div class="tag-row" style="margin-bottom:6px">${acts}</div>
      ${line('Course', d.course ? esc(d.course) : '—')}
      ${line('Holes / Score', (d.score !== '' && d.score != null ? esc(d.score) : '—') + (d.holes ? ' on ' + d.holes : ''))}
      ${line('Conditions', d.conditions ? esc(d.conditions) : '—')}
      ${line('Tournament', d.isTournament ? 'Yes' : 'No')}
      ${line('Game ratings', ratedCount + ' of 8')}
      ${line('Reflections', reflCount + ' answered')}
      ${line('Add-ons', (d._pendingDrills.length + (d._existingDrills ? d._existingDrills.length : 0)) + ' drills · ' + (d._pendingSwings.length + (d._existingSwings ? d._existingSwings.length : 0)) + ' swings')}
    </div>
    <div class="coach-card" style="margin-top:14px">
      <div class="coach-head"><div class="coach-avatar">🧠</div><div><div class="ch-name">Mental Coach</div><div class="ch-role">Ready when you are</div></div></div>
      <p class="coach-body" style="margin:0;color:rgba(255,255,255,.88);font-size:14px;line-height:1.6">Hit save and I’ll read this session, spot the pattern that matters, and give you one clear focus for next time.</p>
    </div>`;
  }

  viewBinders.newEntry = function () {
    const d = state.draft;
    $('[data-action="exit-flow"]').addEventListener('click', () => {
      if (confirm(d._editing ? 'Discard your changes?' : 'Discard this entry?')) {
        state.draft = null; go(d._editing ? 'entry' : 'overview', d._editing ? { id: d.id } : {});
      }
    });
    const prev = $('[data-action="prev"]');
    if (prev) prev.addEventListener('click', () => { captureStep(); d._step--; go('newEntry'); });
    $('[data-action="next"]').addEventListener('click', () => {
      captureStep();
      if (d._step === 1) {
        if (!d.title.trim()) { toast('Give your session a name to continue'); return; }
        if (!d.activityTypes.length) { toast('Pick at least one activity'); return; }
      }
      if (d._step === 6) { finalizeEntry(); return; }
      d._step++; go('newEntry');
    });

    bindStepInputs();
  };

  function bindStepInputs() {
    const d = state.draft;
    // activity chips
    $$('#f-acts .chip').forEach((c) => c.addEventListener('click', () => {
      const k = c.getAttribute('data-act');
      const i = d.activityTypes.indexOf(k);
      if (i >= 0) d.activityTypes.splice(i, 1); else d.activityTypes.push(k);
      if (k === 'Tournament') d.isTournament = d.activityTypes.includes('Tournament');
      c.classList.toggle('checked');
    }));
    const star = $('#f-star');
    if (star) star.addEventListener('click', () => { d.isStarred = !d.isStarred; star.classList.toggle('on', d.isStarred); star.innerHTML = I.star(d.isStarred); });

    // holes segmented
    $$('#f-holes button').forEach((b) => b.addEventListener('click', () => {
      d.holes = Number(b.getAttribute('data-h'));
      $$('#f-holes button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
    }));
    const tourn = $('#f-tourn');
    if (tourn) tourn.addEventListener('change', () => { d.isTournament = tourn.checked; });

    // rating dots (energy/focus + ratings.* )
    $$('.rating-dot[data-rk]').forEach((dot) => dot.addEventListener('click', () => {
      const key = dot.getAttribute('data-rk');
      const val = Number(dot.getAttribute('data-rv'));
      setByPath(d, key, val);
      // re-render the dot group
      const group = dot.parentElement;
      $$('.rating-dot', group).forEach((x) => {
        const v = Number(x.getAttribute('data-rv'));
        x.className = 'rating-dot ' + (v <= val ? (v <= 2 ? 'on low' : v >= 4 ? 'on high' : 'on') : '');
      });
    }));

    // add-on buttons
    const ad = $('[data-action="add-drill"]'); if (ad) ad.addEventListener('click', openDrillModal);
    const as = $('[data-action="add-swing"]'); if (as) as.addEventListener('click', () => openSwingModal());
    $$('[data-del-drill]').forEach((b) => b.addEventListener('click', () => { d._pendingDrills.splice(Number(b.getAttribute('data-del-drill')), 1); go('newEntry'); }));
    $$('[data-del-swing]').forEach((b) => b.addEventListener('click', () => { d._pendingSwings.splice(Number(b.getAttribute('data-del-swing')), 1); go('newEntry'); }));
  }

  function captureStep() {
    const d = state.draft;
    const val = (id) => { const el = $('#' + id); return el ? el.value : undefined; };
    if (d._step === 1) {
      if (val('f-date') !== undefined) d.date = val('f-date') || todayISO();
      if (val('f-title') !== undefined) d.title = val('f-title');
    } else if (d._step === 2) {
      d.course = val('f-course') || '';
      d.score = val('f-score') || '';
      d.conditions = val('f-conditions') || '';
    } else if (d._step === 4) {
      $$('[data-rf]').forEach((t) => { d.reflection[t.getAttribute('data-rf')] = t.value; });
    }
  }

  function setByPath(obj, path, val) {
    const parts = path.split('.');
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = val;
  }

  function finalizeEntry() {
    const d = state.draft;
    captureStep();
    const entry = {
      id: d.id, date: d.date, title: d.title || 'Untitled session',
      activityTypes: d.activityTypes, course: d.course, holes: d.holes,
      score: d.score === '' ? null : Number(d.score),
      isTournament: d.isTournament, isStarred: d.isStarred, conditions: d.conditions,
      energyLevel: d.energyLevel, focusLevel: d.focusLevel,
      ratings: d.ratings, reflection: d.reflection,
      drillResults: [], swingNotes: [], coachFeedback: null,
      createdAt: d.createdAt || Date.now(), updatedAt: Date.now(),
    };

    // generate coach feedback against all OTHER entries
    const others = state.entries.filter((e) => e.id !== entry.id);
    entry.coachFeedback = generateCoachFeedback(entry, state.entries.concat([entry]));

    // save pending drill results
    d._pendingDrills.forEach((r) => {
      const rr = Object.assign({}, r, { id: r.id || uid(), linkedEntryId: entry.id, date: entry.date });
      state.drillResults.push(rr);
      entry.drillResults.push(rr.id);
    });
    // save pending swing notes
    d._pendingSwings.forEach((s) => {
      const ss = Object.assign({}, s, { id: s.id || uid(), linkedEntryId: entry.id, date: s.date || entry.date });
      delete ss.fileObjectUrl; // can't persist
      state.swingNotes.push(ss);
      entry.swingNotes.push(ss.id);
    });
    // preserve existing linked items on edit
    if (d._existingDrills) entry.drillResults = entry.drillResults.concat(d._existingDrills);
    if (d._existingSwings) entry.swingNotes = entry.swingNotes.concat(d._existingSwings);

    // upsert
    const idx = state.entries.findIndex((e) => e.id === entry.id);
    if (idx >= 0) state.entries[idx] = entry; else state.entries.unshift(entry);

    persistAll();
    state.draft = null;
    go('entry', { id: entry.id });
    toast(idx >= 0 ? 'Entry updated ✓' : 'Saved — coach feedback ready 🧠');
  }

  /* ===========================================================
     DRILL / SWING MODALS (used in flow)
  =========================================================== */
  function openModal(html) {
    els.modal.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal-sheet">${html}</div>`;
    els.modal.classList.add('open');
    els.modal.setAttribute('aria-hidden', 'false');
    $('[data-close]', els.modal).addEventListener('click', closeModal);
  }
  function closeModal() {
    els.modal.classList.remove('open');
    els.modal.setAttribute('aria-hidden', 'true');
    els.modal.innerHTML = '';
  }

  function openDrillModal(prefill) {
    prefill = prefill || {};
    openModal(`<h3>Log a drill result</h3><p class="msub">Track how a focused drill went.</p>
      <div class="field"><label class="field-label">Category</label>
        <select class="input" id="dm-cat">${DRILL_CATEGORIES.map((c) => `<option ${prefill.category === c.key ? 'selected' : ''}>${c.key}</option>`).join('')}</select></div>
      <div class="field"><label class="field-label">Drill name</label>
        <input class="input" id="dm-name" list="dm-list" placeholder="e.g. Spider Drill" value="${esc(prefill.drillName || '')}">
        <datalist id="dm-list">${DRILLS.map((dd) => `<option value="${esc(dd.name)}">`).join('')}</datalist></div>
      <div class="field"><label class="field-label">Score / result</label>
        <input class="input" id="dm-score" placeholder="e.g. 14/18 or 5 ft" value="${esc(prefill.score || '')}"></div>
      <div class="field"><label class="field-label">Notes</label>
        <textarea class="textarea" id="dm-notes" placeholder="How did it feel?">${esc(prefill.notes || '')}</textarea></div>
      <button class="btn btn-primary btn-block" id="dm-save">Add drill result</button>`);
    $('#dm-save').addEventListener('click', () => {
      const name = $('#dm-name').value.trim();
      if (!name) { toast('Name the drill'); return; }
      state.draft._pendingDrills.push({
        id: uid(), drillName: name, category: $('#dm-cat').value,
        score: $('#dm-score').value.trim(), notes: $('#dm-notes').value.trim(),
      });
      closeModal(); go('newEntry'); toast('Drill added');
    });
  }

  function openSwingModal() {
    openModal(`<h3>Add a swing note</h3><p class="msub">Capture the feel and what to check next.</p>
      <div class="field"><label class="field-label">Title</label><input class="input" id="sm-title" placeholder="e.g. Driver — wider takeaway"></div>
      <div class="field"><label class="field-label">Category</label>
        <select class="input" id="sm-cat">${['Driver','Irons','Wedges','Putting','Short Game','Tournament Swing'].map((c) => `<option>${c}</option>`).join('')}</select></div>
      <div class="field"><label class="field-label">Swing thought</label><textarea class="textarea" id="sm-thought" placeholder="The one feel you want to keep"></textarea></div>
      <div class="field"><label class="field-label">What I liked</label><textarea class="textarea" id="sm-liked"></textarea></div>
      <div class="field"><label class="field-label">What to check next</label><textarea class="textarea" id="sm-check"></textarea></div>
      <button class="btn btn-primary btn-block" id="sm-save">Add swing note</button>`);

    $('#sm-save').addEventListener('click', () => {
      const title = $('#sm-title').value.trim();
      if (!title) { toast('Give the swing note a title'); return; }
      state.draft._pendingSwings.push({
        id: uid(), date: state.draft.date, title, category: $('#sm-cat').value,
        swingThought: $('#sm-thought').value.trim(),
        liked: $('#sm-liked').value.trim(), checkNext: $('#sm-check').value.trim(),
        isStarred: false,
      });
      closeModal(); go('newEntry'); toast('Swing note added');
    });
  }

  /* ===========================================================
     ENTRY DETAIL
  =========================================================== */
  function renderEntryDetail() {
    const e = state.entries.find((x) => x.id === state.params.id);
    if (!e) return `<div class="view"><button class="back-btn" data-go="overview">${I.back} Journal</button><div class="empty"><h3>Entry not found</h3></div></div>`;

    const acts = (e.activityTypes || []).map((a) => { const m = activityMeta(a); return `<span class="tag ${m.cls}">${m.emoji} ${esc(a)}</span>`; }).join(' ');
    const ratings = RATING_FIELDS.map((f) => {
      const v = e.ratings && e.ratings[f.key] || 0;
      let pips = '';
      for (let i = 1; i <= 5; i++) {
        const tone = f.key === 'mental' || f.key === 'commitment' || f.key === 'patience' ? (v >= 4 ? 'green' : v <= 2 && v > 0 ? 'red' : '') : '';
        pips += `<span class="rt-pip ${i <= v ? 'on ' + tone : ''}"></span>`;
      }
      return `<div class="rating-tile"><div class="rt-name">${f.label}${v ? ' · ' + v : ''}</div><div class="rt-bar">${pips}</div></div>`;
    }).join('');

    const refl = REFLECTION_FIELDS.filter((f) => e.reflection && e.reflection[f.key]).map((f) =>
      `<div class="reflection-item"><p class="reflection-q">${f.q}</p><p class="reflection-a">${esc(e.reflection[f.key])}</p></div>`
    ).join('') || '<p class="muted center" style="padding:14px 0">No reflections recorded.</p>';

    const linkedDrills = state.drillResults.filter((r) => (e.drillResults || []).includes(r.id) || r.linkedEntryId === e.id);
    const linkedSwings = state.swingNotes.filter((s) => (e.swingNotes || []).includes(s.id) || s.linkedEntryId === e.id);

    const drillsHTML = linkedDrills.length ? `<div class="section-label">Drill results</div>` + linkedDrills.map((r) => `<div class="card"><div class="row-between"><div><h4 style="margin:0;font-size:15px">🎯 ${esc(r.drillName)}</h4><div class="entry-course" style="margin-top:3px">${esc(r.category)}</div></div>${r.score ? `<span class="tag score">${esc(r.score)}</span>` : ''}</div>${r.notes ? `<p class="swing-thought">${esc(r.notes)}</p>` : ''}</div>`).join('') : '';

    const swingsHTML = linkedSwings.length ? `<div class="section-label">Swing notes</div>` + linkedSwings.map(swingCardHTML).join('') : '';

    const cf = e.coachFeedback;
    return `<div class="view">
      <button class="back-btn" data-go="overview">${I.back} Journal</button>
      <div class="detail-hero">
        <div class="row-between">
          <div style="min-width:0"><div class="entry-date">${fmtDate(e.date, { weekday:'long', month:'long', day:'numeric', year:'numeric' })}</div>
            <h2>${esc(e.title || 'Untitled session')}</h2>
            ${e.course ? `<div class="entry-course">📍 ${esc(e.course)}${e.conditions ? ' · ' + esc(e.conditions) : ''}</div>` : ''}
          </div>
          <button class="star-btn ${e.isStarred ? 'on' : ''}" data-star-detail="${e.id}" style="width:40px;height:40px">${I.star(e.isStarred)}</button>
        </div>
        <div class="tag-row" style="margin-top:12px">${acts}</div>
        ${e.score != null ? `<div style="display:flex;gap:12px;margin-top:16px;align-items:center">
          <div class="score-badge"><span class="n">${esc(e.score)}</span><span class="l">Score · ${e.holes || 18}</span></div>
          <div class="muted" style="font-size:13px">${e.isTournament ? '🏆 Tournament round' : 'Casual round'}</div>
        </div>` : ''}
      </div>

      ${cf ? coachCardHTML(cf) : ''}

      <div class="section-label">Game ratings</div>
      <div class="ratings-grid">${ratings}</div>

      <div class="section-label">Reflection</div>
      <div class="card">${refl}</div>

      ${drillsHTML}
      ${swingsHTML}

      <div class="section-label">Manage</div>
      <div class="btn-row"><button class="btn btn-ghost" data-action="edit">✏️ Edit</button><button class="btn btn-ghost" data-action="duplicate">⧉ Duplicate</button></div>
      <div style="height:10px"></div>
      <button class="btn btn-danger btn-block" data-action="delete">Delete entry</button>
      <div style="height:10px"></div>
      <button class="btn btn-ghost btn-block" data-go="overview">Back to overview</button>
    </div>`;
  }

  function coachCardHTML(cf) {
    const tags = (cf.focusTags || []).map((t) => `<span class="coach-tag">${esc(t)}</span>`).join('');
    const risks = (cf.riskFlags || []).map((t) => `<span class="coach-tag risk">⚑ ${esc(t)}</span>`).join('');
    const pos = (cf.positiveSignals || []).map((t) => `<span class="coach-tag pos">✓ ${esc(t)}</span>`).join('');
    return `<div class="coach-card" style="margin-top:16px">
      <div class="coach-head"><div class="coach-avatar">🧠</div><div><div class="ch-name">Mental Coach</div><div class="ch-role">${esc(cf.mainPattern || 'Session read')}</div></div></div>
      <h3 class="coach-headline">${esc(cf.headline)}</h3>
      <div class="coach-body"><p>${esc(cf.coachTake)}</p></div>
      <div class="coach-action"><div class="coach-section-t">Your one action step</div><p>${esc(cf.actionStep)}</p></div>
      ${cf.affirmation ? `<p class="coach-affirm">${esc(cf.affirmation)}</p>` : ''}
      <div class="coach-tags">${pos}${tags}${risks}</div>
    </div>`;
  }

  viewBinders.entry = function () {
    const id = state.params.id;
    const sd = $('[data-star-detail]');
    if (sd) sd.addEventListener('click', () => { toggleStar(id); });
    const edit = $('[data-action="edit"]'); if (edit) edit.addEventListener('click', () => startEditEntry(id));
    const dup = $('[data-action="duplicate"]'); if (dup) dup.addEventListener('click', () => duplicateEntry(id));
    const del = $('[data-action="delete"]'); if (del) del.addEventListener('click', () => deleteEntry(id));
  };

  function duplicateEntry(id) {
    const e = state.entries.find((x) => x.id === id);
    if (!e) return;
    const copy = JSON.parse(JSON.stringify(e));
    copy.id = uid(); copy.date = todayISO(); copy.title = e.title + ' (copy)';
    copy.createdAt = Date.now(); copy.updatedAt = Date.now();
    copy.drillResults = []; copy.swingNotes = [];
    state.entries.unshift(copy);
    save(KEYS.entries, state.entries);
    go('entry', { id: copy.id }); toast('Entry duplicated');
  }
  function deleteEntry(id) {
    if (!confirm('Delete this entry permanently? This cannot be undone.')) return;
    state.entries = state.entries.filter((e) => e.id !== id);
    state.drillResults = state.drillResults.filter((r) => r.linkedEntryId !== id);
    state.swingNotes = state.swingNotes.filter((s) => s.linkedEntryId !== id);
    persistAll();
    go('overview'); toast('Entry deleted');
  }

  /* ===========================================================
     DRILLS LIBRARY
  =========================================================== */
  function renderDrills() {
    const cats = ['All'].concat(DRILL_CATEGORIES.map((c) => c.key));
    const active = state.filters.drillCat;
    const pills = `<div class="pill-row" id="drillFilters">${cats.map((c) => `<button class="pill ${active === c ? 'active' : ''}" data-dc="${c}">${c}</button>`).join('')}</div>`;
    const list = (active === 'All' ? DRILLS : DRILLS.filter((d) => d.category === active));
    const cards = list.map((d) => {
      const m = DRILL_CATEGORIES.find((c) => c.key === d.category) || { emoji: '🎯' };
      const logged = state.drillResults.filter((r) => r.drillName === d.name).length;
      return `<div class="drill-card" data-drill="${d.id}">
        <div class="drill-ico">${m.emoji}</div>
        <div style="flex:1;min-width:0"><span class="drill-cat-badge">${d.category}</span><h4>${esc(d.name)}</h4><p>${esc(d.purpose)}</p>${logged ? `<span class="entry-date">Logged ${logged}×</span>` : ''}</div>
        <span class="chevron">${I.chevron}</span>
      </div>`;
    }).join('');
    const recent = state.drillResults.slice(-3).reverse();
    const recentHTML = recent.length ? `<div class="section-label">Recent results</div>${recent.map((r) => `<div class="card-soft card"><div class="row-between"><div><b style="font-size:14px">${esc(r.drillName)}</b><div class="entry-date" style="margin-top:2px">${relativeDay(r.date)}</div></div>${r.score ? `<span class="tag score">${esc(r.score)}</span>` : ''}</div></div>`).join('')}` : '';
    return `<div class="view">${pills}<div class="section-label">${list.length} drills</div><div style="display:grid;gap:12px">${cards}</div>${recentHTML}</div>`;
  }
  viewBinders.drills = function () {
    $$('#drillFilters .pill').forEach((p) => p.addEventListener('click', () => { state.filters.drillCat = p.getAttribute('data-dc'); render(); }));
    $$('.drill-card[data-drill]').forEach((c) => c.addEventListener('click', () => go('drillDetail', { id: c.getAttribute('data-drill') })));
  };

  function renderDrillDetail() {
    const d = drillById(state.params.id);
    if (!d) return `<div class="view"><button class="back-btn" data-go="drills">${I.back} Drills</button><div class="empty"><h3>Drill not found</h3></div></div>`;
    const m = DRILL_CATEGORIES.find((c) => c.key === d.category) || { emoji: '🎯' };
    const history = state.drillResults.filter((r) => r.drillName === d.name).slice().reverse();
    return `<div class="view">
      <button class="back-btn" data-go="drills">${I.back} Drills</button>
      <div class="detail-hero">
        <div style="display:flex;gap:14px;align-items:center">
          <div class="drill-ico" style="width:54px;height:54px;font-size:27px">${m.emoji}</div>
          <div><span class="drill-cat-badge">${d.category}</span><h2 style="margin:2px 0 0;font-size:21px">${esc(d.name)}</h2></div>
        </div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="detail-block" style="margin-top:0"><h5>Purpose</h5><p>${esc(d.purpose)}</p></div>
        <div class="detail-block"><h5>How to do it</h5><ol>${d.instructions.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>
        <div class="detail-block"><h5>Scoring</h5><p>${esc(d.scoring)}</p></div>
        <div class="detail-block"><h5>🧠 Mental focus</h5><p>${esc(d.mental)}</p></div>
      </div>
      <button class="btn btn-primary btn-block btn-lg" style="margin-top:16px" data-action="log-drill">Log a result</button>
      ${history.length ? `<div class="section-label">Your history</div>${history.map((r) => `<div class="card"><div class="row-between"><div><div class="entry-date">${relativeDay(r.date)}</div>${r.notes ? `<p style="margin:4px 0 0;font-size:13px">${esc(r.notes)}</p>` : ''}</div>${r.score ? `<span class="tag score">${esc(r.score)}</span>` : ''}</div></div>`).join('')}` : ''}
    </div>`;
  }
  viewBinders.drillDetail = function () {
    const d = drillById(state.params.id);
    $('[data-action="log-drill"]').addEventListener('click', () => {
      openModal(`<h3>Log result — ${esc(d.name)}</h3><p class="msub">${esc(d.scoring)}</p>
        <div class="field"><label class="field-label">Score / result</label><input class="input" id="ld-score" placeholder="e.g. 14/18"></div>
        <div class="field"><label class="field-label">Notes</label><textarea class="textarea" id="ld-notes" placeholder="How did it go?"></textarea></div>
        <button class="btn btn-primary btn-block" id="ld-save">Save result</button>`);
      $('#ld-save').addEventListener('click', () => {
        state.drillResults.push({ id: uid(), date: todayISO(), drillName: d.name, category: d.category, score: $('#ld-score').value.trim(), notes: $('#ld-notes').value.trim(), linkedEntryId: null });
        save(KEYS.drillResults, state.drillResults);
        closeModal(); render(); toast('Result logged ✓');
      });
    });
  };

  /* ===========================================================
     SWING NOTES / VIDEO LIBRARY
  =========================================================== */
  const SWING_CAT_EMOJI = { 'Driver': '🚀', 'Irons': '🎯', 'Wedges': '⛳', 'Putting': '🥅', 'Short Game': '🪁', 'Tournament Swing': '🏆' };
  function swingCardHTML(s) {
    const emoji = SWING_CAT_EMOJI[s.category] || '🏌️';
    return `<div class="swing-card">
      <div class="swing-thumb">
        <span class="ph">${emoji}</span>
        <span class="cat-chip">${esc(s.category || 'Swing')}</span>
      </div>
      <div class="swing-body">
        <div class="row-between"><div><h4>${esc(s.title)}</h4><div class="sdate">${relativeDay(s.date)}</div></div>
          <button class="star-btn ${s.isStarred ? 'on' : ''}" data-swing-star="${s.id}" style="width:34px;height:34px">${I.star(s.isStarred)}</button></div>
        ${s.swingThought ? `<p class="swing-thought">💭 ${esc(s.swingThought)}</p>` : ''}
        <div class="swing-meta">
          ${s.liked ? `<div class="sm-row liked"><b>Liked:</b> ${esc(s.liked)}</div>` : ''}
          ${s.checkNext ? `<div class="sm-row"><b>Check next:</b> ${esc(s.checkNext)}</div>` : ''}
        </div>
      </div>
    </div>`;
  }

  function renderSwing() {
    const cats = ['All', 'Starred', 'Driver', 'Irons', 'Wedges', 'Putting', 'Short Game', 'Tournament Swing'];
    const active = state.filters.swing;
    const pills = `<div class="pill-row" id="swingFilters">${cats.map((c) => `<button class="pill ${active === c ? 'active' : ''}" data-sc="${c}">${c}</button>`).join('')}</div>`;
    let list = state.swingNotes.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (active === 'Starred') list = list.filter((s) => s.isStarred);
    else if (active !== 'All') list = list.filter((s) => s.category === active);

    const body = list.length
      ? list.map(swingCardHTML).join('')
      : (state.swingNotes.length
        ? `<div class="empty"><div class="emoji">🔍</div><h3>No swing notes here</h3><p>Try another category.</p></div>`
        : `<div class="empty"><div class="emoji">🎥</div><h3>No swing notes yet</h3><p>Capture a swing thought and what to check next — add a video for a quick reference.</p></div>`);

    return `<div class="view">
      ${pills}
      <button class="btn btn-primary btn-block btn-lg" style="margin:6px 0 16px" data-action="add-swing-lib">+ Add swing note</button>
      ${body}
    </div>`;
  }
  viewBinders.swing = function () {
    $$('#swingFilters .pill').forEach((p) => p.addEventListener('click', () => { state.filters.swing = p.getAttribute('data-sc'); render(); }));
    $$('[data-swing-star]').forEach((b) => b.addEventListener('click', () => {
      const s = state.swingNotes.find((x) => x.id === b.getAttribute('data-swing-star'));
      if (s) { s.isStarred = !s.isStarred; save(KEYS.swingNotes, state.swingNotes); render(); }
    }));
    $('[data-action="add-swing-lib"]').addEventListener('click', openSwingLibModal);
  };

  function openSwingLibModal() {
    openModal(`<h3>Add a swing note</h3><p class="msub">Saved to your swing library.</p>
      <div class="field"><label class="field-label">Title</label><input class="input" id="sl-title" placeholder="e.g. Driver — smoother transition"></div>
      <div class="field"><label class="field-label">Date</label><input class="input" type="date" id="sl-date" value="${todayISO()}" max="${todayISO()}"></div>
      <div class="field"><label class="field-label">Category</label><select class="input" id="sl-cat">${['Driver','Irons','Wedges','Putting','Short Game','Tournament Swing'].map((c) => `<option>${c}</option>`).join('')}</select></div>
      <div class="field"><label class="field-label">Swing thought</label><textarea class="textarea" id="sl-thought"></textarea></div>
      <div class="field"><label class="field-label">What I liked</label><textarea class="textarea" id="sl-liked"></textarea></div>
      <div class="field"><label class="field-label">What to check next</label><textarea class="textarea" id="sl-check"></textarea></div>
      <button class="btn btn-primary btn-block" id="sl-save">Save swing note</button>`);
    $('#sl-save').addEventListener('click', () => {
      const title = $('#sl-title').value.trim();
      if (!title) { toast('Give it a title'); return; }
      state.swingNotes.push({
        id: uid(), date: $('#sl-date').value || todayISO(), title, category: $('#sl-cat').value,
        swingThought: $('#sl-thought').value.trim(),
        liked: $('#sl-liked').value.trim(), checkNext: $('#sl-check').value.trim(),
        isStarred: false, linkedEntryId: null,
      });
      save(KEYS.swingNotes, state.swingNotes);
      closeModal(); render(); toast('Swing note saved ✓');
    });
  }

  /* ===========================================================
     PERFORMANCE STATS
  =========================================================== */
  function renderStats() {
    const entries = state.entries.slice();
    if (!entries.length) {
      return `<div class="view"><div class="empty"><div class="emoji">📊</div><h3>No stats yet</h3><p>Log a few rounds and your trends, strengths, and weaknesses will appear here.</p><button class="btn btn-primary" data-action="new-entry">Log an entry</button></div></div>`;
    }
    const scored = entries.filter((e) => e.score != null && !isNaN(Number(e.score)))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const scores = scored.map((e) => Number(e.score));
    const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const bestScore = scores.length ? Math.min.apply(null, scores) : null;

    const r = (k) => avgOf(entries, (e) => e.ratings && e.ratings[k]);
    const ratingAverages = RATING_FIELDS.map((f) => ({ key: f.key, label: f.label, avg: r(f.key) || 0 }));

    const tournScores = scored.filter((e) => e.isTournament || (e.activityTypes||[]).includes('Tournament')).map((e) => Number(e.score));
    const casualScores = scored.filter((e) => !(e.isTournament || (e.activityTypes||[]).includes('Tournament'))).map((e) => Number(e.score));
    const tournAvg = tournScores.length ? tournScores.reduce((a,b)=>a+b,0)/tournScores.length : null;
    const casualAvg = casualScores.length ? casualScores.reduce((a,b)=>a+b,0)/casualScores.length : null;

    // most common activity
    const actCount = {};
    entries.forEach((e) => (e.activityTypes||[]).forEach((a) => actCount[a] = (actCount[a]||0)+1));
    const topAct = Object.entries(actCount).sort((a,b)=>b[1]-a[1])[0];

    // strongest / weakest
    const rated = ratingAverages.filter((x) => x.avg > 0);
    const strongest = rated.slice().sort((a,b)=>b.avg-a.avg)[0];
    const weakest = rated.slice().sort((a,b)=>a.avg-b.avg)[0];

    // trends
    const scoreTrend = trend(scores.slice(-6));
    const mentalSeries = entries.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''))
      .map((e) => e.ratings && e.ratings.mental).filter((v) => typeof v === 'number' && v > 0);
    const mentalTrend = trend(mentalSeries.slice(-6));

    const statCards = `<div class="stat-grid">
      ${statCard(entries.length, 'Total entries')}
      ${statCard(avgScore != null ? avgScore.toFixed(1) : '—', 'Avg score')}
      ${statCard(bestScore != null ? bestScore : '—', 'Best score')}
      ${statCard((r('mental')||0).toFixed(1), 'Avg mental')}
    </div>
    <div class="stat-grid" style="margin-top:12px">
      ${statCard((r('commitment')||0).toFixed(1), 'Avg commitment')}
      ${statCard((r('patience')||0).toFixed(1), 'Avg patience')}
    </div>`;

    const scoreChart = scored.length >= 2 ? `<div class="chart-card" style="margin-top:18px"><h4>Score over time</h4><p class="csub">Last ${Math.min(scored.length,10)} scored rounds</p>${lineChartSVG(scored.slice(-10).map((e)=>({label:fmtDateShort(e.date),val:Number(e.score)})), true)}</div>` : '';

    const radar = rated.length >= 3 ? `<div class="chart-card" style="margin-top:14px"><h4>Game balance</h4><p class="csub">Average rating across your game</p>${radarSVG(ratingAverages)}</div>` : '';

    const bars = rated.length ? `<div class="chart-card" style="margin-top:14px"><h4>Average by category</h4><p class="csub">Out of 5</p><div class="bars">${ratingAverages.map((x)=>`<div class="bar-row"><span class="bname">${x.label}</span><div class="bar-track"><div class="bar-fill" style="width:${(x.avg/5*100)||0}%"></div></div><span class="bar-val">${x.avg?x.avg.toFixed(1):'—'}</span></div>`).join('')}</div></div>` : '';

    const bw = (strongest && weakest) ? `<div class="section-label">Strengths & focus</div><div class="duo-grid">
      <div class="bw-card best"><div class="bw-l">Strongest</div><div class="bw-n">${strongest.label}</div><div class="bw-v">${strongest.avg.toFixed(1)} / 5</div></div>
      <div class="bw-card worst"><div class="bw-l">Focus area</div><div class="bw-n">${weakest.label}</div><div class="bw-v">${weakest.avg.toFixed(1)} / 5</div></div>
    </div>` : '';

    // text insights
    const insights = [];
    if (strongest) insights.push({ ico: '💪', h: 'Your edge', p: `Your strongest area is <b>${strongest.label}</b> (${strongest.avg.toFixed(1)}/5). It’s a reliable asset — build your strategy around it and lean on it under pressure.` });
    if (weakest && weakest.key !== (strongest&&strongest.key)) insights.push({ ico: '🎯', h: 'Primary focus', p: `<b>${weakest.label}</b> (${weakest.avg.toFixed(1)}/5) is your clearest development area. Isolate it in deliberate practice rather than addressing it on the course.` });
    if (tournAvg != null && casualAvg != null) {
      const diff = tournAvg - casualAvg;
      insights.push({ ico: '🏆', h: 'Tournament vs. casual', p: diff > 1.5
        ? `You average <b>${diff.toFixed(1)} more strokes</b> in tournaments (${tournAvg.toFixed(1)} vs ${casualAvg.toFixed(1)}). That gap is competitive, not mechanical — rehearse pressure with real consequences in practice.`
        : `Your tournament scoring (${tournAvg.toFixed(1)}) is close to casual (${casualAvg.toFixed(1)}). You’re transferring your game under pressure — keep the same routine.` });
    }
    if (mentalTrend) insights.push({ ico: mentalTrend === 'up' ? '📈' : mentalTrend === 'down' ? '📉' : '➡️', h: 'Mental trend', p: mentalTrend === 'up'
      ? 'Your mental ratings are <b>trending up</b>. Keep the routine that is producing the composure.'
      : mentalTrend === 'down' ? 'Your mental ratings have <b>dipped lately</b>. Prioritise attention control and post-shot routine before the next round.'
      : 'Your mental game is <b>steady</b>. Consistency under pressure is the objective.' });
    if (scoreTrend && scores.length >= 3) insights.push({ ico: scoreTrend === 'down' ? '📈' : scoreTrend === 'up' ? '📊' : '➡️', h: 'Scoring trend', p: scoreTrend === 'down' ? 'Your scores are <b>trending lower</b>. The process is producing results.' : scoreTrend === 'up' ? 'Scores have edged up recently. Return to process — one decision, one target, one shot.' : 'Your scoring is holding steady.' });
    if (topAct) insights.push({ ico: '📅', h: 'Your pattern', p: `Most of your logged work is <b>${topAct[0]}</b> (${topAct[1]} entries). ${topAct[0]==='Practiced'?'Make sure some of it rehearses competitive pressure.':'Keep logging — the value is in the patterns it surfaces over time.'}` });

    const insightsHTML = `<div class="section-label">Coach insights</div>` + insights.map((x)=>`<div class="insight-card"><span class="insight-ico">${x.ico}</span><div><h5>${x.h}</h5><p>${x.p}</p></div></div>`).join('');

    return `<div class="view">${statCards}${scoreChart}${radar}${bars}${bw}${insightsHTML}<div style="height:20px"></div></div>`;
  }

  function trend(arr) {
    if (arr.length < 2) return null;
    const first = arr.slice(0, Math.ceil(arr.length/2));
    const last = arr.slice(Math.floor(arr.length/2));
    const a = first.reduce((x,y)=>x+y,0)/first.length;
    const b = last.reduce((x,y)=>x+y,0)/last.length;
    const d = b - a;
    if (Math.abs(d) < 0.4) return 'flat';
    return d > 0 ? 'up' : 'down';
  }

  // ---- SVG line chart ----
  function lineChartSVG(points, lowerBetter) {
    const W = 320, H = 150, pad = 26;
    if (!points.length) return '';
    const vals = points.map((p) => p.val);
    let min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (min === max) { min -= 2; max += 2; }
    const pad2 = (max - min) * 0.15; min -= pad2; max += pad2;
    const x = (i) => pad + (i * (W - pad * 1.4) / Math.max(points.length - 1, 1));
    const y = (v) => H - pad - ((v - min) / (max - min)) * (H - pad * 1.8);
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.val).toFixed(1)}`).join(' ');
    const area = `M${x(0).toFixed(1)},${(H-pad).toFixed(1)} ` + points.map((p,i)=>`L${x(i).toFixed(1)},${y(p.val).toFixed(1)}`).join(' ') + ` L${x(points.length-1).toFixed(1)},${(H-pad).toFixed(1)} Z`;
    const dots = points.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.val).toFixed(1)}" r="3.5" fill="#fff" stroke="#8fb8e8" stroke-width="2"/>`).join('');
    const labels = points.map((p, i) => (i % Math.ceil(points.length/5||1) === 0 || i === points.length-1) ? `<text x="${x(i).toFixed(1)}" y="${H-6}" font-size="9" fill="#aab1bf" text-anchor="middle">${esc(p.label)}</text>` : '').join('');
    const valLabels = points.map((p,i)=>`<text x="${x(i).toFixed(1)}" y="${(y(p.val)-8).toFixed(1)}" font-size="9" fill="#8b93a4" text-anchor="middle" font-weight="600">${p.val}</text>`).join('');
    return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb8e8" stop-opacity="0.25"/><stop offset="1" stop-color="#a7a3ea" stop-opacity="0"/></linearGradient>
      <linearGradient id="ls" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8fb8e8"/><stop offset="1" stop-color="#a7a3ea"/></linearGradient></defs>
      <path d="${area}" fill="url(#lg)"/>
      <path d="${line}" fill="none" stroke="url(#ls)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}${valLabels}${labels}
    </svg>`;
  }

  // ---- SVG radar chart ----
  function radarSVG(data) {
    const items = data.filter((d) => d.avg > 0);
    const n = items.length;
    if (n < 3) return '';
    const cx = 150, cy = 135, R = 95;
    const angle = (i) => (Math.PI * 2 * i / n) - Math.PI / 2;
    const pt = (i, val) => [cx + Math.cos(angle(i)) * R * (val/5), cy + Math.sin(angle(i)) * R * (val/5)];
    let grid = '';
    [1, 2, 3, 4, 5].forEach((ring) => {
      const poly = items.map((_, i) => { const p = pt(i, ring); return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' ');
      grid += `<polygon points="${poly}" fill="none" stroke="#ebedf2" stroke-width="1"/>`;
    });
    let spokes = '';
    items.forEach((_, i) => { const p = pt(i, 5); spokes += `<line x1="${cx}" y1="${cy}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" stroke="#ebedf2" stroke-width="1"/>`; });
    const poly = items.map((d, i) => { const p = pt(i, d.avg); return p[0].toFixed(1)+','+p[1].toFixed(1); }).join(' ');
    const dots = items.map((d, i) => { const p = pt(i, d.avg); return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#7f7ce0"/>`; }).join('');
    const labels = items.map((d, i) => {
      const p = pt(i, 5.7); const a = angle(i);
      const anchor = Math.abs(Math.cos(a)) < 0.3 ? 'middle' : (Math.cos(a) > 0 ? 'start' : 'end');
      return `<text x="${p[0].toFixed(1)}" y="${(p[1]+3).toFixed(1)}" font-size="9.5" fill="#8b93a4" text-anchor="${anchor}" font-weight="600">${esc(shortLabel(d.label))}</text>`;
    }).join('');
    return `<svg class="chart-svg" viewBox="0 0 300 270" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fb8e8" stop-opacity="0.5"/><stop offset="1" stop-color="#a7a3ea" stop-opacity="0.45"/></linearGradient></defs>
      ${grid}${spokes}
      <polygon points="${poly}" fill="url(#rg)" stroke="#7f7ce0" stroke-width="2"/>
      ${dots}${labels}
    </svg>`;
  }
  function shortLabel(l) { return l.replace('Course Mgmt','Course').replace('Short Game','Short').replace('Tee Shots','Tee'); }

  /* ===========================================================
     SETTINGS / DATA
  =========================================================== */
  function renderSettings() {
    return `<div class="view">
      <div class="storage-note">🔒 <b>Fully self-contained.</b> Everything lives in this app, in your browser’s localStorage. No account, no cloud, no external API, no files in or out. Your data stays on this device.</div>

      <div class="section-label">Your profile</div>
      <div class="card"><div class="field" style="margin:0"><label class="field-label">Display name</label><input class="input" id="set-name" value="${esc(state.settings.name||'')}" placeholder="Your name"></div></div>

      <div class="section-label">Data management</div>
      <div class="card">
        <div class="settings-row"><div class="si">✨</div><div class="stext"><h4>Load demo data</h4><p>Populate the app with sample entries to explore.</p></div><button class="btn btn-sm" data-action="demo">Load</button></div>
        <div class="settings-row"><div class="si">🗑️</div><div class="stext"><h4>Clear all data</h4><p>Permanently erase everything on this device.</p></div><button class="btn btn-sm btn-danger" data-action="clear">Clear</button></div>
      </div>

      <div class="section-label">About</div>
      <div class="card"><div class="settings-row" style="border:none"><div class="si">⛳</div><div class="stext"><h4>Mindful Golf</h4><p>Journal. Reflect. Compete with a clearer mind. — Local-first MVP v1.0</p></div></div>
        <p class="muted center" style="font-size:12px;margin:6px 0 0">${state.entries.length} entries · ${state.drillResults.length} drill results · ${state.swingNotes.length} swing notes</p></div>
      <div style="height:20px"></div>
    </div>`;
  }
  viewBinders.settings = function () {
    const name = $('#set-name');
    name.addEventListener('change', () => { state.settings.name = name.value.trim() || 'Golfer'; save(KEYS.settings, state.settings); toast('Name updated'); });
    $('[data-action="demo"]').addEventListener('click', () => {
      if (state.entries.length && !confirm('Add demo data to your existing entries?')) return;
      loadDemoData(); go('overview'); toast('Demo data loaded ⛳');
    });
    $('[data-action="clear"]').addEventListener('click', clearData);
  };

  function clearData() {
    if (!confirm('Erase ALL data permanently? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? Consider exporting first.')) return;
    state.entries = []; state.swingNotes = []; state.drillResults = [];
    state.settings = { name: 'Golfer', onboarded: false };
    persistAll();
    state.filters = { feed: 'All', swing: 'All', drillCat: 'All' }; state.search = '';
    go('landing'); toast('All data cleared');
  }

  /* ===========================================================
     DEMO DATA
  =========================================================== */
  function loadDemoData() {
    const mk = (daysAgo) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString().slice(0,10); };
    const rng = { putting:0, shortGame:0, approach:0, teeShots:0, mental:0, commitment:0, patience:0, courseManagement:0 };
    const R = (o) => Object.assign({}, rng, o);
    const blankRefl = { learned:'', struggled:'', proud:'', bestMentalMoment:'', lostFocus:'', adjustment:'', affirmation:'' };
    const Re = (o) => Object.assign({}, blankRefl, o);

    const drillSeed = [];
    const swingSeed = [];

    const raw = [
      { date: mk(2), title: 'State Open — Final Round', activityTypes:['Tournament','Played'], course:'Bellingham CC', holes:18, score:69, isTournament:true, isStarred:true, conditions:'Firm, fast greens', energyLevel:4, focusLevel:5,
        ratings:R({putting:4,shortGame:4,approach:5,teeShots:4,mental:5,commitment:5,patience:4,courseManagement:5}),
        reflection:Re({learned:'When I commit to the conservative target, the aggressive result tends to follow.', struggled:'Left two approaches on the wrong side of the pin early.', proud:'Stayed fully with each shot in the last three holes with the tournament on the line. Took the safe line on 17 instead of forcing it.', bestMentalMoment:'Neutral reaction to the bogey on 12 — moved straight to the next target.', lostFocus:'Nowhere I couldn’t recover from quickly.', adjustment:'Take the centre of the green when between clubs.', affirmation:'Play the shot in front of me.'}) },

      { date: mk(3), title: 'State Open — Round 1', activityTypes:['Tournament','Played'], course:'Bellingham CC', holes:18, score:71, isTournament:true, isStarred:true, conditions:'Breezy, soft fairways', energyLevel:4, focusLevel:4,
        ratings:R({putting:4,shortGame:3,approach:4,teeShots:4,mental:4,commitment:4,patience:4,courseManagement:4}),
        reflection:Re({learned:'My start-of-round routine settles me faster than I expect.', struggled:'Pace control on the longer lag putts.', proud:'Disciplined off the tee — took the 3-wood on the two tight holes.', bestMentalMoment:'Calm acceptance after a lipped birdie putt on 9.', lostFocus:'A brief lapse checking the leaderboard on 14.', adjustment:'Avoid the board until the round is complete.', affirmation:'One shot at a time, no scoreboard.'}) },

      { date: mk(6), title: 'Home tune-up', activityTypes:['Played'], course:'Pine Valley GC', holes:18, score:70, isTournament:false, isStarred:false, conditions:'Calm, overcast', energyLevel:4, focusLevel:4,
        ratings:R({putting:4,shortGame:4,approach:4,teeShots:4,mental:4,commitment:4,patience:4,courseManagement:4}),
        reflection:Re({learned:'My stock fade holds its line in soft conditions.', proud:'Built every shot around a single clear target.', adjustment:'Trim the practice swings to one before each shot.', affirmation:'Decide, commit, accept.'}) },

      { date: mk(9), title: 'Putting & speed block', activityTypes:['Practiced','Mental Training'], course:'Short-game area', holes:9, score:null, isTournament:false, isStarred:false, conditions:'Quick greens', energyLevel:4, focusLevel:5,
        ratings:R({putting:5,shortGame:0,approach:0,teeShots:0,mental:4,commitment:4,patience:4,courseManagement:0}),
        reflection:Re({learned:'Speed control improves the moment I focus on the entry point, not the cup.', proud:'Held attention on the process for the full block.', adjustment:'Carry the same speed-first focus onto the course.', affirmation:'Speed first, line second.'}),
        _drills:[{drillName:'3-6-9 Ladder',category:'Putting',score:'16/18',notes:'Speed was automatic from 9 feet.'},{drillName:'Spider Drill',category:'Putting',score:'6 ft',notes:'Cleared all four out to six feet.'}] },

      { date: mk(12), title: 'Wedge matrix session', activityTypes:['Practiced'], course:'Range', holes:9, score:null, isTournament:false, isStarred:false, conditions:'Light breeze', energyLevel:4, focusLevel:4,
        ratings:R({putting:0,shortGame:5,approach:4,teeShots:0,mental:4,commitment:4,patience:4,courseManagement:0}),
        reflection:Re({learned:'My 50–80 yard gaps are tighter than I assumed.', proud:'Committed to a precise number on every ball.', adjustment:'Build the same clear-number routine into competition.', affirmation:'Clear number, full commitment.'}),
        _drills:[{drillName:'9-Ball Wedge Matrix',category:'Short Game',score:'7/9',notes:'Two long ones drifted; carries were dialled.'}],
        _swings:[{title:'Wedges — quieter lower body', category:'Wedges', swingThought:'Keep the legs quiet and let the chest turn through.', liked:'Cleaner strike and more consistent spin.', checkNext:'Hold the finish on the partial wedges.'}] },

      { date: mk(15), title: 'Tuesday round at Maple Creek', activityTypes:['Played'], course:'Maple Creek', holes:18, score:70, isTournament:false, isStarred:false, conditions:'Warm, still', energyLevel:3, focusLevel:2,
        ratings:R({putting:3,shortGame:3,approach:3,teeShots:3,mental:2,commitment:4,patience:3,courseManagement:3}),
        reflection:Re({learned:'I can shoot a number without ever really being present.', struggled:'Distracted and a little flat all day — going through the motions between shots.', proud:'Kept committing to targets even when my attention wandered.', lostFocus:'The whole middle of the round felt mechanical.', adjustment:'Use the walk to the ball to reset attention every time.', affirmation:'Be where my feet are.'}) },

      { date: mk(19), title: 'Off day at Highland Links', activityTypes:['Played'], course:'Highland Links', holes:18, score:77, isTournament:false, isStarred:false, conditions:'Strong wind, firm', energyLevel:3, focusLevel:4,
        ratings:R({putting:3,shortGame:3,approach:3,teeShots:3,mental:4,commitment:5,patience:5,courseManagement:4}),
        reflection:Re({learned:'On days the swing isn’t there, patience and course management protect the score.', struggled:'Never found a rhythm with the irons in the wind.', proud:'Took my medicine after two wayward drives instead of compounding errors. Stayed disciplined to the last hole.', bestMentalMoment:'Accepting a bogey on 16 and playing 17 and 18 cleanly.', adjustment:'Trust a three-quarter flighted iron earlier in the wind.', affirmation:'Control what I can control.'}) },

      { date: mk(24), title: 'Member-Guest — Round 2', activityTypes:['Tournament','Played'], course:'Riverside CC', holes:18, score:71, isTournament:true, isStarred:true, conditions:'Warm, breezy', energyLevel:4, focusLevel:4,
        ratings:R({putting:4,shortGame:4,approach:4,teeShots:3,mental:4,commitment:4,patience:4,courseManagement:4}),
        reflection:Re({learned:'My routine travels under pressure when I trust it.', struggled:'One tentative tee shot on 18 with the match close.', proud:'Composed and patient down the stretch; trusted the read on the closing putt.', bestMentalMoment:'A single breath and a committed swing on the 72nd hole.', adjustment:'Bring the breath trigger in earlier on tee shots.', affirmation:'I trust the work.'}) },

      { date: mk(30), title: 'Lesson — transition & sequencing', activityTypes:['Lesson','Practiced'], course:'Academy', holes:9, score:null, isTournament:false, isStarred:false, conditions:'Indoor bay', energyLevel:3, focusLevel:4,
        ratings:R({putting:0,shortGame:0,approach:4,teeShots:4,mental:3,commitment:3,patience:3,courseManagement:0}),
        reflection:Re({learned:'A slightly later transition improves my low-point control.', struggled:'The old pattern returned when I added speed.', adjustment:'Groove the new sequence at 80% before pushing speed.', affirmation:'Smooth sequence, then speed.'}),
        _swings:[{title:'Irons — later transition', category:'Irons', swingThought:'Let the lower body start down while the club still finishes back.', liked:'Better compression and a more penetrating flight.', checkNext:'Keep the sequence under pressure on the course.'}] },

      { date: mk(37), title: 'Bogey-free at Pine Valley', activityTypes:['Played'], course:'Pine Valley GC', holes:18, score:68, isTournament:false, isStarred:true, conditions:'Perfect, receptive greens', energyLevel:5, focusLevel:5,
        ratings:R({putting:5,shortGame:4,approach:5,teeShots:4,mental:5,commitment:5,patience:5,courseManagement:5}),
        reflection:Re({learned:'Total presence makes the scoring an afterthought.', proud:'Bogey-free and never got ahead of the round at 4-under through 13.', bestMentalMoment:'Stayed in the present and took each shot on its own merit.', adjustment:'Note what made today’s process repeatable — it came from routine, not results.', affirmation:'Present and committed.'}) },

      { date: mk(41), title: 'Pressure putting simulation', activityTypes:['Mental Training','Practiced'], course:'Practice green', holes:9, score:null, isTournament:false, isStarred:false, conditions:'Solo, consequence added', energyLevel:3, focusLevel:4,
        ratings:R({putting:4,shortGame:0,approach:0,teeShots:0,mental:3,commitment:4,patience:3,courseManagement:0}),
        reflection:Re({learned:'Adding a real consequence exposes exactly where my routine speeds up.', struggled:'Felt arousal climb on the final must-make putt — the same trigger as in competition.', adjustment:'Rehearse the same breath and tempo before every pressure putt.', affirmation:'Same routine, every putt.'}),
        _drills:[{drillName:'Tournament Simulation',category:'Mental',score:'Pass',notes:'Holed the last to pass; kept the routine intact under the nerves.'}] },

      { date: mk(45), title: 'Quick 9 after practice', activityTypes:['Played'], course:'Maple Creek', holes:9, score:34, isTournament:false, isStarred:false, conditions:'Twilight, calm', energyLevel:3, focusLevel:3,
        ratings:R({putting:3,shortGame:4,approach:3,teeShots:3,mental:3,commitment:3,patience:4,courseManagement:3}),
        reflection:Re({learned:'A free, low-stakes nine keeps the tempo honest.', proud:'Played without mechanical thought and let the swing go.', adjustment:'Carry the same freedom into competition.', affirmation:'Free and committed.'}) },
    ];

    raw.forEach((e) => {
      const entry = {
        id: uid(), date: e.date, title: e.title, activityTypes: e.activityTypes,
        course: e.course, holes: e.holes, score: e.score, isTournament: e.isTournament,
        isStarred: e.isStarred, conditions: e.conditions, energyLevel: e.energyLevel, focusLevel: e.focusLevel,
        ratings: e.ratings, reflection: e.reflection, drillResults: [], swingNotes: [],
        coachFeedback: null, createdAt: Date.now() - Math.random()*1e6, updatedAt: Date.now(),
      };
      entry.coachFeedback = generateCoachFeedback(entry, state.entries.concat([entry]));
      (e._drills || []).forEach((d) => {
        const r = { id: uid(), date: e.date, drillName: d.drillName, category: d.category, score: d.score, notes: d.notes, linkedEntryId: entry.id };
        state.drillResults.push(r); entry.drillResults.push(r.id);
      });
      (e._swings || []).forEach((s) => {
        const ss = { id: uid(), date: e.date, title: s.title, category: s.category, swingThought: s.swingThought, liked: s.liked, checkNext: s.checkNext, isStarred: false, linkedEntryId: entry.id };
        state.swingNotes.push(ss); entry.swingNotes.push(ss.id);
      });
      state.entries.push(entry);
    });

    // a couple of standalone swing notes & drill results
    state.swingNotes.push({ id: uid(), date: mk(4), title: 'Driver — wider takeaway', category: 'Driver', swingThought: 'Feel the club go back low and wide to set up width at the top.', liked: 'Fuller turn and a more reliable start line.', checkNext: 'Guard against a quick transition under pressure.', isStarred: true, linkedEntryId: null });
    state.drillResults.push({ id: uid(), date: mk(7), drillName: 'Gate Start Line', category: 'Putting', score: '14 in a row', notes: 'Face stayed square and quiet through impact.', linkedEntryId: null });

    state.settings.onboarded = true;
    persistAll();
  }

  /* ===========================================================
     BOOT
  =========================================================== */
  function boot() {
    // skip landing if data already exists
    if (state.entries.length > 0) go('overview');
    else go('landing');
  }
  boot();
})();
