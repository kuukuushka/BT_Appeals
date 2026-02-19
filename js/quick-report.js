const QuickReport = (() => {
  const tbody = document.getElementById('qr-tbody');
  const emptyState = document.getElementById('qr-empty');
  const btnSort = document.getElementById('btn-qr-sort');
  const btnFav = document.getElementById('btn-manage-fav');
  const btnGenerate = document.getElementById('btn-qr-generate');
  const output = document.getElementById('qr-output');

  let sortMode = 'id-asc';
  let selections = {};

  const SORT_LABELS = {
    'id-asc': 'По ID (возр.)',
    'id-desc': 'По ID (убыв.)',
    'cat-asc': 'По категории',
  };

  const CAT_VARS = ['colleagues', 'agents', 'consultant', 'tickets'];

  function init() {
    btnSort.addEventListener('click', toggleSort);
    btnFav.addEventListener('click', () => {
      Modals.showFavCountries(refreshSelectors);
    });
    btnGenerate.addEventListener('click', generate);
    refresh();
  }

  function toggleSort() {
    const modes = Object.keys(SORT_LABELS);
    const idx = (modes.indexOf(sortMode) + 1) % modes.length;
    sortMode = modes[idx];
    btnSort.innerHTML = `<span class="material-icons-round">sort</span> ${SORT_LABELS[sortMode]}`;
    refresh();
  }

  // Re-render only the <select> dropdowns without rebuilding the whole table
  function refreshSelectors() {
    const rows = tbody.querySelectorAll('tr[data-key]');
    rows.forEach(tr => {
      const key = tr.dataset.key;
      const cell = tr.querySelector('.qr-country-cell');
      const savedCountry = selections[key] || '';
      cell.innerHTML = '';
      cell.appendChild(createCountrySelector(key, savedCountry));
    });
  }

  function refresh() {
    const items = Categories.getAllItems();

    if (items.length === 0) {
      tbody.innerHTML = '';
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    let sorted;
    switch (sortMode) {
      case 'id-asc':
        sorted = [...items].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
        break;
      case 'id-desc':
        sorted = [...items].sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
        break;
      case 'cat-asc':
        sorted = [...items].sort((a, b) => a.catIndex - b.catIndex || a.id.localeCompare(b.id, undefined, { numeric: true }));
        break;
      default:
        sorted = [...items];
    }

    tbody.innerHTML = '';
    sorted.forEach((item) => {
      const key = item.uid || `${item.catIndex}_${item.id}`;
      const savedCountry = selections[key] || '';

      const tr = document.createElement('tr');
      tr.dataset.key = key;

      tr.innerHTML = `
        <td style="font-family:var(--mono)">${item.id}</td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:var(--cat-${CAT_VARS[item.catIndex]})"></span>
            ${item.catName}
          </span>
        </td>
        <td class="qr-country-cell"></td>
      `;

      tr.querySelector('.qr-country-cell').appendChild(createCountrySelector(key, savedCountry));
      tbody.appendChild(tr);
    });
  }

  function createCountrySelector(key, savedValue) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;gap:4px;align-items:center';

    const select = document.createElement('select');
    select.className = 'country-select';

    const favList = Storage.getFavCountries();
    const { favorites, others } = Countries.getSortedWithFavorites(favList);

    let optHtml = '<option value="">— Выбрать —</option>';

    if (favorites.length > 0) {
      optHtml += '<optgroup label="★ Избранные">';
      favorites.forEach(c => {
        const sel = savedValue === c.name ? 'selected' : '';
        optHtml += `<option value="${c.name}" ${sel}>${c.name} (${c.abbr})</option>`;
      });
      optHtml += '</optgroup>';
    }

    optHtml += '<optgroup label="Все страны">';
    others.forEach(c => {
      const sel = savedValue === c.name ? 'selected' : '';
      optHtml += `<option value="${c.name}" ${sel}>${c.name} (${c.abbr})</option>`;
    });
    optHtml += '</optgroup>';

    const isCustom = savedValue && !Countries.isKnown(savedValue);
    optHtml += `<option value="__custom__" ${isCustom ? 'selected' : ''}>Другая...</option>`;
    select.innerHTML = optHtml;

    const customInput = document.createElement('input');
    customInput.type = 'text';
    customInput.className = 'country-input';
    customInput.placeholder = 'Сокращение (3 буквы)';
    customInput.title = 'Рекомендуется первые 3 буквы страны';
    customInput.style.display = 'none';

    if (isCustom) {
      select.value = '__custom__';
      customInput.value = savedValue;
      customInput.style.display = '';
    }

    select.addEventListener('change', () => {
      if (select.value === '__custom__') {
        customInput.style.display = '';
        customInput.focus();
        selections[key] = customInput.value;
      } else {
        customInput.style.display = 'none';
        selections[key] = select.value;
      }
    });

    customInput.addEventListener('input', () => {
      selections[key] = customInput.value;
    });

    customInput.addEventListener('focus', () => {
      Notifications.info('Рекомендуется ввести первые 3 буквы страны');
    });

    wrapper.appendChild(select);
    wrapper.appendChild(customInput);
    return wrapper;
  }

  function generate() {
    const items = Categories.getAllItems();
    if (items.length === 0) {
      Notifications.error('Нет данных для генерации');
      return;
    }

    const catGroups = {};
    const catLabels = ['Обращений коллег', 'Обращений агентов', 'Обращений по консультанту', 'Обращений по тикетам'];

    items.forEach((item) => {
      const key = item.uid || `${item.catIndex}_${item.id}`;
      const country = selections[key];
      if (!country) return;

      if (!catGroups[item.catIndex]) catGroups[item.catIndex] = {};

      let abbr = Countries.getAbbr(country);
      if (!abbr) {
        abbr = country.length > 3 ? country.substring(0, 3).toLowerCase() : country.toLowerCase();
      }

      catGroups[item.catIndex][abbr] = (catGroups[item.catIndex][abbr] || 0) + 1;
    });

    const parts = [];
    for (const cat of [0, 1, 2, 3]) {
      if (!catGroups[cat] || Object.keys(catGroups[cat]).length === 0) continue;
      const sorted = Object.entries(catGroups[cat]).sort((a, b) => a[0].localeCompare(b[0], 'ru'));
      parts.push(`${catLabels[cat]}:\n${sorted.map(([a, c]) => `${a}:${c}`).join('\n')}`);
    }

    const result = parts.join('\n\n');

    if (!result) {
      Notifications.error('Выберите страны для игроков');
      return;
    }

    output.value = result;
    navigator.clipboard.writeText(result).then(() => {
      Notifications.success('Быстрый отчет сгенерирован и скопирован!');
    }).catch(() => {
      Notifications.info('Быстрый отчет сгенерирован');
    });
  }

  return { init, refresh, refreshSelectors };
})();
