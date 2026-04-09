(function () {
  if (typeof DEFAULT_CFG === 'undefined') return;

  const clone = (obj) => JSON.parse(JSON.stringify(obj));
  const state = {
    touchpoints: clone(DEFAULT_CFG.avg_touchpoints_by_method),
    alloc: clone(DEFAULT_CFG.allocated_minutes_by_visit_category),
    pops: clone(DEFAULT_CFG.population_params),
  };

  const toggleBtn = document.getElementById('toggleAdvanced');
  const advancedBlock = document.getElementById('advancedBlock');
  const advancedOn = document.getElementById('advanced_on');
  const advOk = document.getElementById('advOk');
  const advError = document.getElementById('advError');

  function showAdvanced(open) {
    advancedBlock.style.display = open ? 'block' : 'none';
    advancedBlock.setAttribute('aria-hidden', open ? 'false' : 'true');
    advancedOn.value = open ? '1' : '0';
    if (toggleBtn) toggleBtn.textContent = open ? 'Advanced Settings ▲' : 'Advanced Settings ▼';
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = getComputedStyle(advancedBlock).display === 'none';
      showAdvanced(isHidden);
    });
  }

  function makeNumberInput(value, step = '0.01', min = '0') {
    const input = document.createElement('input');
    input.className = 'form-control form-control-sm';
    input.type = 'number';
    input.step = step;
    input.min = min;
    input.value = value;
    return input;
  }

  function renderTouchpoints() {
    const tbody = document.querySelector('#touchpointsTable tbody');
    tbody.innerHTML = '';
    Object.entries(state.touchpoints).forEach(([k, v]) => {
      const tr = document.createElement('tr');
      const input = makeNumberInput(v, '0.1', '0');
      input.addEventListener('input', () => state.touchpoints[k] = Number(input.value || 0));
      tr.innerHTML = `<td>${k}</td>`;
      const td = document.createElement('td'); td.appendChild(input); tr.appendChild(td);
      tbody.appendChild(tr);
    });
  }

  function renderAlloc() {
    const tbody = document.querySelector('#allocTable tbody');
    tbody.innerHTML = '';
    Object.entries(state.alloc).forEach(([k, v]) => {
      const tr = document.createElement('tr');
      const input = makeNumberInput(v, '1', '0');
      input.addEventListener('input', () => state.alloc[k] = Number(input.value || 0));
      tr.innerHTML = `<td>${k}</td>`;
      const td = document.createElement('td'); td.appendChild(input); tr.appendChild(td);
      tbody.appendChild(tr);
    });
  }

  function renderPopParams() {
    const wrap = document.getElementById('popAccordion');
    wrap.innerHTML = '';
    Object.entries(state.pops).forEach(([popName, popCfg], popIdx) => {
      const card = document.createElement('div');
      card.className = 'accordion mb-3';
      const item = document.createElement('div');
      item.className = 'accordion-item';
      item.innerHTML = `
        <h2 class="accordion-header" id="heading-${popIdx}">
          <button class="accordion-button ${popIdx ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${popIdx}">${popName}</button>
        </h2>
        <div id="collapse-${popIdx}" class="accordion-collapse collapse ${popIdx ? '' : 'show'}">
          <div class="accordion-body">
            <div class="table-responsive mb-3">
              <table class="table table-sm align-middle">
                <thead><tr><th>Method</th><th>Probability of Use</th><th>P(schedule)</th><th>P(complete)</th><th>mu</th><th>sigma</th><th>mu2</th><th>sigma2</th></tr></thead>
                <tbody class="method-body"></tbody>
              </table>
            </div>
            <div class="table-responsive">
              <table class="table table-sm align-middle">
                <thead><tr><th>Visit Category</th><th>Probability</th></tr></thead>
                <tbody class="visit-body"></tbody>
              </table>
            </div>
          </div>
        </div>`;
      const methodBody = item.querySelector('.method-body');
      popCfg.methods.forEach((m, i) => {
        const tr = document.createElement('tr');
        const fields = ['likelihood','p_schedule','p_complete','mu','sigma','mu2','sigma2'];
        tr.innerHTML = `<td>${m.method}</td>`;
        fields.forEach((f) => {
          const td = document.createElement('td');
          const input = makeNumberInput(m[f], '0.01', '0');
          input.addEventListener('input', () => state.pops[popName].methods[i][f] = Number(input.value || 0));
          td.appendChild(input); tr.appendChild(td);
        });
        methodBody.appendChild(tr);
      });
      const visitBody = item.querySelector('.visit-body');
      popCfg.visit_categories.forEach((v, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${v.category}</td>`;
        const td = document.createElement('td');
        const input = makeNumberInput(v.prob, '0.01', '0');
        input.addEventListener('input', () => state.pops[popName].visit_categories[i].prob = Number(input.value || 0));
        td.appendChild(input); tr.appendChild(td);
        visitBody.appendChild(tr);
      });
      card.appendChild(item);
      wrap.appendChild(card);
    });
  }

  function validate() {
    const errors = [];
    Object.entries(state.pops).forEach(([popName, popCfg]) => {
      const methodSum = popCfg.methods.reduce((s, x) => s + Number(x.likelihood || 0), 0);
      const visitSum = popCfg.visit_categories.reduce((s, x) => s + Number(x.prob || 0), 0);
      if (methodSum <= 0) errors.push(`${popName}: method probabilities must sum above 0.`);
      if (visitSum <= 0) errors.push(`${popName}: visit probabilities must sum above 0.`);
    });
    advError.style.display = errors.length ? 'block' : 'none';
    advError.innerHTML = errors.join('<br>');
    advOk.style.display = errors.length ? 'none' : 'inline';
    return !errors.length;
  }

  function syncHidden() {
    document.getElementById('avg_touchpoints_json').value = JSON.stringify(state.touchpoints);
    document.getElementById('allocated_minutes_json').value = JSON.stringify(state.alloc);
    document.getElementById('population_params_json').value = JSON.stringify(state.pops);
  }

  document.getElementById('validateAdvanced')?.addEventListener('click', validate);
  document.getElementById('resetTouchpoints')?.addEventListener('click', () => { state.touchpoints = clone(DEFAULT_CFG.avg_touchpoints_by_method); renderTouchpoints(); syncHidden(); });
  document.getElementById('resetAlloc')?.addEventListener('click', () => { state.alloc = clone(DEFAULT_CFG.allocated_minutes_by_visit_category); renderAlloc(); syncHidden(); });
  document.getElementById('resetPopParams')?.addEventListener('click', () => { state.pops = clone(DEFAULT_CFG.population_params); renderPopParams(); syncHidden(); });
  document.getElementById('simForm')?.addEventListener('submit', (e) => {
    const open = getComputedStyle(advancedBlock).display !== 'none';
    if (open && !validate()) {
      e.preventDefault();
      return;
    }
    syncHidden();
  });

  renderTouchpoints();
  renderAlloc();
  renderPopParams();
  syncHidden();

  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => new bootstrap.Tooltip(el));
})();
