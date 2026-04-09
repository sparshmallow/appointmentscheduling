(function () {
  if (typeof SUMMARY === 'undefined' || !SUMMARY || typeof Chart === 'undefined') return;

  const COLORS = {
    demand: 'rgba(96, 165, 250, 0.90)',
    used: 'rgba(248, 113, 113, 0.90)',
    available: 'rgba(251, 191, 36, 0.80)',
    queue: 'rgba(251, 146, 60, 0.82)',
    decrease: 'rgba(96, 165, 250, 0.62)',
    increase: 'rgba(248, 113, 113, 0.62)',
    baseline: 'rgba(251, 191, 36, 0.60)',
    decreaseBorder: 'rgba(96, 165, 250, 0.92)',
    increaseBorder: 'rgba(248, 113, 113, 0.92)',
    baselineBorder: 'rgba(245, 158, 11, 0.90)',
    completionBar: 'rgba(96, 165, 250, 0.55)',
    completionBorder: 'rgba(59, 130, 246, 0.86)',
    accessBar: 'rgba(251, 146, 60, 0.52)',
    accessBorder: 'rgba(249, 115, 22, 0.82)'
  };

  function signed(v, digits = 2) {
    const n = Number(v || 0);
    return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`;
  }

  function makeBar(el, labels, data, title, suffix = '') {
    if (!el) return;
    const isCompletion = suffix === '%';
    new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          borderRadius: 8,
          backgroundColor: isCompletion ? COLORS.completionBar : COLORS.accessBar,
          borderColor: isCompletion ? COLORS.completionBorder : COLORS.accessBorder,
          borderWidth: 1.2,
          hoverBackgroundColor: isCompletion ? 'rgba(96, 165, 250, 0.68)' : 'rgba(251, 146, 60, 0.64)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: title },
          tooltip: { callbacks: { label: (ctx) => `${Number(ctx.raw).toFixed(1)}${suffix}` } }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => `${v}${suffix}` },
            grid: { color: 'rgba(148, 163, 184, 0.18)' }
          }
        }
      }
    });
  }

  const byPop = SUMMARY.by_population || [];
  makeBar(
    document.getElementById('completionByPop'),
    byPop.map(r => r.Population),
    byPop.map(r => (r.completion_rate || 0) * 100),
    'Completion rate by population (%)',
    '%'
  );
  makeBar(
    document.getElementById('accessDelayByPop'),
    byPop.map(r => r.Population),
    byPop.map(r => r.avg_access_delay || 0),
    'Average access delay by population (days)',
    ' d'
  );

  const timeline = (SUMMARY.access && SUMMARY.access.timeline) ? SUMMARY.access.timeline : [];
  const tlLabels = timeline.map(r => `Day ${r.Day}`);
  new Chart(document.getElementById('accessFlowChart'), {
    type: 'line',
    data: {
      labels: tlLabels,
      datasets: [
        { label: 'Demand (patients requesting slots)', data: timeline.map(r => r.Demand), tension: 0.15, pointRadius: 0, borderColor: COLORS.demand, backgroundColor: COLORS.demand, borderWidth: 2 },
        { label: 'Used slots (slots/day)', data: timeline.map(r => r['Used Slots']), tension: 0.15, pointRadius: 0, borderColor: COLORS.used, backgroundColor: COLORS.used, borderWidth: 2 },
        { label: 'Available slots (slots/day)', data: timeline.map(r => r['Available Slots']), tension: 0, pointRadius: 0, borderColor: COLORS.available, backgroundColor: COLORS.available, borderWidth: 2 },
        { label: 'Queue end (patients waiting)', data: timeline.map(r => r['Queue End']), tension: 0.15, pointRadius: 0, yAxisID: 'y1', borderColor: COLORS.queue, backgroundColor: COLORS.queue, borderWidth: 2 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: { display: true, text: 'Day-by-day appointment flow' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(0)}`
          }
        }
      },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 20 } },
        y: { beginAtZero: true, title: { display: true, text: 'Patients or slots per day' } },
        y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Patients waiting at end of day' } }
      }
    }
  });

  const sens = (typeof SENSITIVITY !== 'undefined' && Array.isArray(SENSITIVITY)) ? SENSITIVITY : [];
  const nonBaseline = sens.filter(s => s.category !== 'Baseline');

  function pairSensitivity(rows) {
    const grouped = {};
    rows.forEach((s) => {
      if (!grouped[s.category]) grouped[s.category] = { category: s.category };
      const lower = String(s.scenario).includes('-');
      const base = String(s.scenario).toLowerCase().includes('baseline');
      const higher = String(s.scenario).includes('+');
      if (lower) grouped[s.category].lower = s;
      else if (base) grouped[s.category].baseline = s;
      else if (higher) grouped[s.category].higher = s;
    });
    const order = ['Demand', 'Max Attempts', 'Scheduling Success', 'Completion Success', 'Daily Capacity'];
    return order.filter(k => grouped[k]).map(k => grouped[k]);
  }

  const paired = pairSensitivity(nonBaseline);
  const labels = paired.map(r => r.category);

  function makePairedDeltaChart(el, title, key, axisText, formatterSuffix, multiplier = 1, digits = 2) {
    if (!el) return;
    new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Decrease case',
            data: paired.map(r => ((r.lower && r.lower[key]) || 0) * multiplier),
            borderRadius: 6,
            backgroundColor: COLORS.decrease,
            borderColor: COLORS.decreaseBorder,
            borderWidth: 1,
            scenarioNames: paired.map(r => r.lower ? r.lower.scenario : '')
          },
          {
            label: 'Increase case',
            data: paired.map(r => ((r.higher && r.higher[key]) || 0) * multiplier),
            borderRadius: 6,
            backgroundColor: COLORS.increase,
            borderColor: COLORS.increaseBorder,
            borderWidth: 1,
            scenarioNames: paired.map(r => r.higher ? r.higher.scenario : '')
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: true },
        plugins: {
          title: { display: true, text: title },
          tooltip: {
            callbacks: {
              title: (items) => items[0].label,
              label: (ctx) => {
                const scenario = ctx.dataset.scenarioNames[ctx.dataIndex] || ctx.dataset.label;
                return `${scenario}: ${signed(ctx.raw, digits)}${formatterSuffix}`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: axisText },
            ticks: { callback: (v) => signed(v, digits) + formatterSuffix }
          },
          y: { ticks: { autoSkip: false } }
        }
      }
    });
  }

  makePairedDeltaChart(
    document.getElementById('sensitivityAccessChart'),
    'Change in average access delay vs baseline',
    'delta_access_delay',
    'Days relative to baseline',
    ' days',
    1,
    2
  );

  makePairedDeltaChart(
    document.getElementById('sensitivityUtilChart'),
    'Change in utilization vs baseline',
    'delta_utilization',
    'Percentage points relative to baseline',
    ' pts',
    100,
    2
  );

  makePairedDeltaChart(
    document.getElementById('sensitivityCompletionChart'),
    'Change in completion rate vs baseline',
    'delta_completion',
    'Percentage points relative to baseline',
    ' pts',
    100,
    2
  );

  new Chart(document.getElementById('whatIfTripletChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Decrease case',
          data: paired.map(r => r.lower ? r.lower.avg_access_delay : null),
          borderRadius: 6,
          backgroundColor: COLORS.decrease,
          borderColor: COLORS.decreaseBorder,
          borderWidth: 1,
          scenarioNames: paired.map(r => r.lower ? r.lower.scenario : '')
        },
        {
          label: 'Baseline',
          data: paired.map(r => r.baseline ? r.baseline.avg_access_delay : null),
          borderRadius: 6,
          backgroundColor: COLORS.baseline,
          borderColor: COLORS.baselineBorder,
          borderWidth: 1,
          scenarioNames: paired.map(r => r.baseline ? r.baseline.scenario : '')
        },
        {
          label: 'Increase case',
          data: paired.map(r => r.higher ? r.higher.avg_access_delay : null),
          borderRadius: 6,
          backgroundColor: COLORS.increase,
          borderColor: COLORS.increaseBorder,
          borderWidth: 1,
          scenarioNames: paired.map(r => r.higher ? r.higher.scenario : '')
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: 'Average access delay under each exact what-if scenario' },
        tooltip: {
          callbacks: {
            title: (items) => items[0].label,
            label: (ctx) => {
              const scenario = ctx.dataset.scenarioNames[ctx.dataIndex] || ctx.dataset.label;
              return `${scenario}: ${Number(ctx.raw).toFixed(2)} days`;
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Average access delay (days)' } },
        x: { ticks: { autoSkip: false, maxRotation: 0, minRotation: 0 } }
      }
    }
  });
})();
