// static/results.js
(function () {
    if (typeof SUMMARY === "undefined" || !SUMMARY) return;
  
    const byPop = SUMMARY.by_population || [];
    const popLabels = byPop.map(r => r.Population);
    const completionByPop = byPop.map(r => (r.completion_rate ?? 0) * 100);
    const touchpointsByPop = byPop.map(r => r.avg_touchpoints ?? 0);
    const timeByPop = byPop.map(r => r.avg_total_time ?? 0);
  
    const overallCompletion = (SUMMARY.completed_rate ?? 0) * 100;
  
    // ---- Completion gauge (doughnut) ----
    const gaugeEl = document.getElementById("kpiCompletionGauge");
    if (gaugeEl) {
      new Chart(gaugeEl, {
        type: "doughnut",
        data: {
          labels: ["Completed", "Not completed"],
          datasets: [{
            data: [overallCompletion, Math.max(0, 100 - overallCompletion)],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "70%",
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ${ctx.raw.toFixed(2)}%`
              }
            },
            title: {
              display: true,
              text: `Overall: ${overallCompletion.toFixed(2)}%`
            }
          }
        }
      });
    }
  
    function makeBar(el, title, labels, data, yLabel, suffix = "") {
      if (!el) return;
      return new Chart(el, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: yLabel,
            data,
            borderWidth: 1,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: title },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.raw.toFixed(3)}${suffix}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (v) => `${v}${suffix}`
              }
            }
          }
        }
      });
    }
  
    // ---- Completion by population ----
    makeBar(
      document.getElementById("kpiCompletionByPop"),
      "Completion rate by population",
      popLabels,
      completionByPop,
      "Completion rate",
      "%"
    );
  
    // ---- Touchpoints by population ----
    makeBar(
      document.getElementById("kpiTouchpointsByPop"),
      "Average touchpoints by population",
      popLabels,
      touchpointsByPop,
      "Touchpoints"
    );
  
    // ---- Time by population ----
    makeBar(
      document.getElementById("kpiTimeByPop"),
      "Average total time (days) by population",
      popLabels,
      timeByPop,
      "Days"
    );
  })();
  