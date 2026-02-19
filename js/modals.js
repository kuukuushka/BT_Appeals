const Modals = (() => {
  let confirmCallback = null;
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  function init() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.closeModal;
        close(modalId);
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(overlay.id);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(m => close(m.id));
      }
    });

    document.getElementById('confirm-ok').addEventListener('click', () => {
      if (confirmCallback) confirmCallback();
      close('modal-confirm');
      confirmCallback = null;
    });

    initViewAll();
  }

  function open(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  }

  function close(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  function confirm(title, message, callback) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').innerHTML = message;
    confirmCallback = callback;
    open('modal-confirm');
  }

  function showMove(message, excludeCat, callback) {
    const container = document.getElementById('move-options');
    document.getElementById('move-message').innerHTML = message;
    container.innerHTML = '';

    const colors = ['var(--cat-colleagues)', 'var(--cat-agents)', 'var(--cat-consultant)', 'var(--cat-tickets)'];

    Categories.NAMES.forEach((name, i) => {
      if (i === excludeCat) return;
      const opt = document.createElement('div');
      opt.className = 'move-option';
      opt.innerHTML = `<span class="move-option__dot" style="background:${colors[i]}"></span>${name}`;
      opt.addEventListener('click', () => {
        // Close move modal FIRST, then show confirm
        close('modal-move');
        setTimeout(() => {
          confirm('Подтверждение переноса', `Перенести в категорию <b>${name}</b>?`, () => {
            callback(i);
          });
        }, 150);
      });
      container.appendChild(opt);
    });

    open('modal-move');
  }

  function showMatching(matchingData) {
    const notFoundSection = document.getElementById('matching-notfound');
    const notFoundTbody = document.getElementById('matching-notfound-tbody');
    const unknownSection = document.getElementById('matching-unknown');
    const unknownTbody = document.getElementById('matching-unknown-tbody');
    const knownTbody = document.getElementById('matching-known-tbody');

    notFoundTbody.innerHTML = '';
    unknownTbody.innerHTML = '';
    knownTbody.innerHTML = '';

    const catNames = Categories.NAMES;
    const CAT_COLORS = ['var(--cat-colleagues)', 'var(--cat-agents)', 'var(--cat-consultant)', 'var(--cat-tickets)'];

    function groupById(items) {
      const map = new Map();
      (items || []).forEach(item => {
        const idKey = String(item.id ?? '');
        if (!idKey) return;

        if (!map.has(idKey)) {
          map.set(idKey, {
            ...item,
            catIndices: [item.catIndex ?? 0],
          });
          return;
        }

        const existing = map.get(idKey);
        const catIndex = item.catIndex ?? 0;
        if (!existing.catIndices.includes(catIndex)) {
          existing.catIndices.push(catIndex);
        }
        if (!existing.country && item.country) existing.country = item.country;
        if (!existing.abbr && item.abbr) existing.abbr = item.abbr;
      });

      return [...map.values()].map(item => ({
        ...item,
        catIndices: [...item.catIndices].sort((a, b) => a - b),
      }));
    }

    function renderCategoryList(catIndices) {
      const indices = [...new Set((catIndices || []).map(Number))]
        .filter(i => Number.isInteger(i) && i >= 0 && i < catNames.length);

      return indices.map(i => `
        <span style="display:inline-flex;align-items:center;gap:5px">
          <span style="width:8px;height:8px;border-radius:50%;background:${CAT_COLORS[i]};flex-shrink:0"></span>
          ${escapeHtml(catNames[i] || '')}
        </span>
      `).join('<br>');
    }

    function refreshMatchingFromReport(successMessage) {
      if (typeof Report !== 'undefined') {
        Report.generateReport(true);
        if (typeof Report.getLastMatching === 'function') {
          const refreshed = Report.getLastMatching();
          if (refreshed) showMatching(refreshed);
        }
      }
      Notifications.success(successMessage);
    }

    const groupedNotFound = groupById(matchingData.notFound);
    const groupedUnknown = groupById(matchingData.unknown);

    // Helper: get abbreviation from full or short name
    function resolveAbbr(rawValue) {
      if (!rawValue) return null;
      const fromKnown = Countries.getAbbr(rawValue);
      if (fromKnown) return fromKnown;
      // treat as abbreviation directly if short
      return rawValue.trim().toLowerCase();
    }

    // Helper: add a row to the TOP of "known" section, optionally highlighted with previous category
    function addToKnown(id, country, abbr, catIndex, prevSection) {
      const tr = document.createElement('tr');
      if (prevSection) {
        tr.style.background = `color-mix(in srgb, ${CAT_COLORS[catIndex]} 15%, var(--surface))`;
        tr.title = `Ранее в разделе «${prevSection}»`;
      }
      const safeId = escapeHtml(id);
      const safeCountry = escapeHtml(country);
      const safeAbbr = escapeHtml(abbr);
      const safeCatName = escapeHtml(catNames[catIndex] || '');
      tr.innerHTML = `
        <td style="font-family:var(--mono)">${safeId}</td>
        <td>${safeCountry}</td>
        <td><b>${safeAbbr}</b></td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:5px">
            <span style="width:8px;height:8px;border-radius:50%;background:${CAT_COLORS[catIndex]};flex-shrink:0"></span>
            ${safeCatName}
          </span>
        </td>
      `;
      knownTbody.insertBefore(tr, knownTbody.firstChild);
    }

    // Pre-populate known section
    matchingData.known.forEach(item => {
      addToKnown(item.id, item.country, item.abbr, item.catIndex ?? 0);
    });

    // ===== NOT FOUND SECTION =====
    if (groupedNotFound.length > 0) {
      notFoundSection.hidden = false;
      groupedNotFound.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-family:var(--mono)">${escapeHtml(item.id)}</td>
          <td>
            ${renderCategoryList(item.catIndices)}
          </td>
          <td>
            <div style="display:flex;flex-direction:column;gap:4px">
              <input type="text" class="country-input nf-full-input" placeholder="Полное название страны" style="width:180px">
              <input type="text" class="country-input nf-abbr-input" placeholder="Сокращение (3 буквы)" style="width:140px">
            </div>
          </td>
          <td>
            <button class="btn btn--accent btn--sm nf-save-btn">
              <span class="material-icons-round" style="font-size:15px">check</span> Применить
            </button>
          </td>
        `;

        const fullInput = tr.querySelector('.nf-full-input');
        const abbrInput = tr.querySelector('.nf-abbr-input');
        const saveBtn = tr.querySelector('.nf-save-btn');

        // Auto-fill abbr when full name matches known country
        fullInput.addEventListener('input', () => {
          const abbr = Countries.getAbbr(fullInput.value.trim());
          if (abbr) abbrInput.value = abbr;
        });

        abbrInput.addEventListener('focus', () => {
          Notifications.info('Рекомендуется ввести первые 3 буквы страны');
        });

        saveBtn.addEventListener('click', () => {
          const fullVal = fullInput.value.trim();
          const abbrVal = abbrInput.value.trim().toLowerCase() || (item.abbr && item.abbr.toLowerCase());
          if (!abbrVal && !fullVal) {
            Notifications.error('Введите страну или сокращение');
            return;
          }
          const displayCountry = fullVal || item.country || abbrVal;
          const finalAbbr = resolveAbbr(fullVal) || resolveAbbr(abbrVal) || abbrVal || (item.country && item.country.length > 3 ? item.country.substring(0, 3).toLowerCase() : (item.country || '').toLowerCase());

          confirm(
            'Применить страну',
            `Указать страну <b>${escapeHtml(displayCountry)}</b> (${escapeHtml(finalAbbr)}) для ID <b>${escapeHtml(item.id)}</b>?`,
            () => {
              const custom = Storage.getCustomCountries();
              custom[item.id] = displayCountry;
              Storage.setCustomCountries(custom);
              refreshMatchingFromReport(`Страна ${displayCountry} применена для ${item.id}`);
            }
          );
        });

        notFoundTbody.appendChild(tr);
      });
    } else {
      notFoundSection.hidden = true;
    }

    // ===== UNKNOWN COUNTRIES SECTION =====
    if (groupedUnknown.length > 0) {
      unknownSection.hidden = false;
      groupedUnknown.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="font-family:var(--mono)">${escapeHtml(item.id)}</td>
          <td>
            <input type="text" class="country-input unk-full-input" value="${escapeHtml(item.country)}" placeholder="Полное название страны" style="width:180px" title="Страна из таблицы, можно изменить">
          </td>
          <td>
            ${renderCategoryList(item.catIndices)}
          </td>
          <td>
            <div style="display:flex;gap:4px;align-items:center">
              <input type="text" class="country-input unk-abbr-input" value="${escapeHtml(item.abbr)}" placeholder="3 буквы" style="width:90px">
              <button class="btn btn--accent btn--sm unk-save-btn">
                <span class="material-icons-round" style="font-size:15px">check</span> Применить
              </button>
            </div>
          </td>
        `;

        const fullInput = tr.querySelector('.unk-full-input');
        const abbrInput = tr.querySelector('.unk-abbr-input');
        const saveBtn = tr.querySelector('.unk-save-btn');

        fullInput.addEventListener('input', () => {
          const abbr = Countries.getAbbr(fullInput.value.trim());
          if (abbr) abbrInput.value = abbr;
        });

        abbrInput.addEventListener('focus', () => {
          Notifications.info('Рекомендуется ввести первые 3 буквы страны');
        });

        saveBtn.addEventListener('click', () => {
          const fullVal = fullInput.value.trim();
          const abbrVal = abbrInput.value.trim().toLowerCase() || (item.abbr && String(item.abbr).toLowerCase());
          if (!abbrVal && !fullVal) { Notifications.error('Введите страну или сокращение'); return; }
          const displayCountry = fullVal || item.country || abbrVal;
          const finalAbbr = resolveAbbr(fullVal) || resolveAbbr(abbrVal) || abbrVal || (item.country && item.country.length >= 3 ? item.country.substring(0, 3).toLowerCase() : (item.country || '').toLowerCase());

          confirm(
            'Применить изменение',
            `Указать страну <b>${escapeHtml(displayCountry)}</b> (${escapeHtml(finalAbbr)}) для ID <b>${escapeHtml(item.id)}</b>?`,
            () => {
              const custom = Storage.getCustomCountries();
              custom[item.id] = displayCountry;
              Storage.setCustomCountries(custom);
              refreshMatchingFromReport(`Страна применена для ${item.id}`);
            }
          );
        });

        unknownTbody.appendChild(tr);
      });
    } else {
      unknownSection.hidden = true;
    }

    open('modal-matching');
  }

  function initViewAll() {
    const btnView = document.getElementById('btn-view-all');
    const search = document.getElementById('view-all-search');
    const filter = document.getElementById('view-all-filter');
    const selectAll = document.getElementById('view-all-select-all');
    const btnDelete = document.getElementById('btn-view-all-delete');
    const btnMove = document.getElementById('btn-view-all-move');
    let selectedSet = new Set();

    btnView.addEventListener('click', () => {
      refreshViewAll();
      open('modal-view-all');
    });

    search.addEventListener('input', refreshViewAll);

    function refreshViewAll() {
      const tbody = document.getElementById('view-all-tbody');
      tbody.innerHTML = '';
      selectedSet.clear();
      updateViewAllButtons();

      filter.innerHTML = '';
      const colors = ['var(--cat-colleagues)', 'var(--cat-agents)', 'var(--cat-consultant)', 'var(--cat-tickets)'];

      let activeFilters = new Set([0, 1, 2, 3]);

      Categories.NAMES.forEach((name, i) => {
        const chip = document.createElement('button');
        chip.className = 'cat-filter__chip active';
        chip.dataset.cat = i;
        chip.textContent = `${name} (${Categories.getCount(i)})`;
        chip.style.cssText = `--chip-color:${colors[i]}`;
        chip.classList.add('active');
        chip.style.background = colors[i];
        chip.style.color = '#fff';
        chip.style.borderColor = 'transparent';

        chip.addEventListener('click', () => {
          if (activeFilters.has(i)) {
            activeFilters.delete(i);
            chip.style.background = '';
            chip.style.color = '';
            chip.style.borderColor = '';
            chip.classList.remove('active');
          } else {
            activeFilters.add(i);
            chip.style.background = colors[i];
            chip.style.color = '#fff';
            chip.style.borderColor = 'transparent';
            chip.classList.add('active');
          }
          renderRows();
        });
        filter.appendChild(chip);
      });

      function renderRows() {
        tbody.innerHTML = '';
        selectedSet.clear();
        updateViewAllButtons();
        selectAll.checked = false;

        const query = search.value.toLowerCase().trim();
        const items = Categories.getAllItems();

        items
          .filter(item => activeFilters.has(item.catIndex))
          .filter(item => !query || item.id.includes(query))
          .forEach(item => {
            const tr = document.createElement('tr');
            const uid = `${item.catIndex}_${item.itemIndex}`;

            tr.innerHTML = `
              <td><input type="checkbox" data-uid="${uid}"></td>
              <td style="font-family:var(--mono)">${item.id}</td>
              <td>
                <span style="display:inline-flex;align-items:center;gap:4px">
                  <span style="width:8px;height:8px;border-radius:50%;background:${colors[item.catIndex]}"></span>
                  ${item.catName}
                </span>
              </td>
              <td style="font-size:var(--fs-xs);color:var(--text-3)">${new Date(item.addedAt).toLocaleString('ru')}</td>
              <td>
                <div style="display:flex;gap:2px">
                  <button class="btn btn--icon btn--sm va-move" title="Перенести"><span class="material-icons-round" style="font-size:16px">drive_file_move</span></button>
                  <button class="btn btn--icon btn--sm btn--danger-icon va-delete" title="Удалить"><span class="material-icons-round" style="font-size:16px">close</span></button>
                </div>
              </td>
            `;

            const cb = tr.querySelector('input[type="checkbox"]');
            cb.addEventListener('change', () => {
              if (cb.checked) selectedSet.add(uid);
              else selectedSet.delete(uid);
              updateViewAllButtons();
            });

            tr.querySelector('.va-delete').addEventListener('click', () => {
              confirm('Удаление', `Удалить ID <b>${item.id}</b> из <b>${item.catName}</b>?`, () => {
                Categories.removeId(item.catIndex, item.itemIndex);
                refreshViewAll();
                if (typeof QuickReport !== 'undefined') QuickReport.refresh();
                Notifications.success(`ID ${item.id} удалён из ${item.catName}`);
              });
            });

            tr.querySelector('.va-move').addEventListener('click', () => {
              showMove(`Перенести ID <b>${item.id}</b> из <b>${item.catName}</b>:`, item.catIndex, (toCat) => {
                Categories.moveIds(item.catIndex, [item.itemIndex], toCat);
                Notifications.success(`Перенесено в ${Categories.NAMES[toCat]}`);
                refreshViewAll();
                if (typeof QuickReport !== 'undefined') QuickReport.refresh();
              });
            });

            tbody.appendChild(tr);
          });
      }

      selectAll.onchange = () => {
        const cbs = tbody.querySelectorAll('input[type="checkbox"]');
        cbs.forEach(cb => {
          cb.checked = selectAll.checked;
          if (selectAll.checked) selectedSet.add(cb.dataset.uid);
          else selectedSet.delete(cb.dataset.uid);
        });
        updateViewAllButtons();
      };

      btnDelete.onclick = () => {
        if (selectedSet.size === 0) return;
        const toDeleteCount = selectedSet.size;
        confirm('Удаление', `Удалить <b>${toDeleteCount}</b> выбранных ID?`, () => {
          const grouped = {};
          selectedSet.forEach(uid => {
            const [cat, idx] = uid.split('_').map(Number);
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(idx);
          });
          for (const cat of Object.keys(grouped).map(Number)) {
            grouped[cat].sort((a, b) => b - a);
            grouped[cat].forEach(idx => Categories.removeId(cat, idx));
          }
          refreshViewAll();
          if (typeof QuickReport !== 'undefined') QuickReport.refresh();
          Notifications.success(`Удалено ${toDeleteCount} ID`);
        });
      };

      btnMove.onclick = () => {
        if (selectedSet.size === 0) return;
        const uids = [...selectedSet];
        showMove(`Перенести <b>${selectedSet.size}</b> ID:`, -1, (toCat) => {
          const grouped = {};
          uids.forEach(uid => {
            const [cat, idx] = uid.split('_').map(Number);
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(idx);
          });
          for (const cat of Object.keys(grouped).map(Number)) {
            if (cat === toCat) continue;
            grouped[cat].sort((a, b) => b - a);
            Categories.moveIds(cat, grouped[cat], toCat);
          }
          refreshViewAll();
          if (typeof QuickReport !== 'undefined') QuickReport.refresh();
          Notifications.success(`Перенесено в ${Categories.NAMES[toCat]}`);
        });
      };

      renderRows();
    }

    function updateViewAllButtons() {
      btnDelete.disabled = selectedSet.size === 0;
      btnMove.disabled = selectedSet.size === 0;
    }
  }

  function showFavCountries(onChangeCallback) {
    const list = document.getElementById('fav-countries-list');
    list.innerHTML = '';
    const favs = new Set(Storage.getFavCountries());

    Countries.getAllSorted().forEach(country => {
      const item = document.createElement('label');
      item.className = 'fav-country-item';
      item.innerHTML = `
        <input type="checkbox" ${favs.has(country.name) ? 'checked' : ''}>
        <span>${country.name} (${country.abbr})</span>
      `;
      item.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) favs.add(country.name);
        else favs.delete(country.name);
        Storage.setFavCountries([...favs]);
        // Immediately update selectors in Quick Report
        if (typeof onChangeCallback === 'function') onChangeCallback();
        else if (typeof QuickReport !== 'undefined' && QuickReport.refreshSelectors) {
          QuickReport.refreshSelectors();
        }
      });
      list.appendChild(item);
    });

    open('modal-fav-countries');
  }

  return { init, open, close, confirm, showMove, showMatching, showFavCountries };
})();
