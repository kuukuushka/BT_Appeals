const Categories = (() => {
  const NAMES = ['Коллеги', 'Агенты', 'Консультант', 'Тикеты'];
  const grid = document.getElementById('categories-grid');
  const filterChips = document.getElementById('cat-filter-chips');

  let data = {};
  let order = [];
  let hidden = [];
  let dragSrcEl = null;

  function generateUid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `uid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function ensureStableItemIds() {
    let changed = false;
    for (const cat of [0, 1, 2, 3]) {
      if (!Array.isArray(data[cat])) data[cat] = [];
      data[cat].forEach(item => {
        if (!item.uid) {
          item.uid = generateUid();
          changed = true;
        }
      });
    }
    if (changed) save();
  }

  function init() {
    data = Storage.getCategories();
    order = Storage.getCategoryOrder();
    hidden = Storage.getHiddenCats();
    ensureStableItemIds();
    render();
    renderFilterChips();
  }

  function save() {
    Storage.setCategories(data);
  }

  function parseIds(raw) {
    return raw
      .split(/[\s,;|\/\\]+/)
      .map(s => s.replace(/\D/g, ''))
      .filter(s => s.length >= 3 && s.length <= 15);
  }

  function addIds(catIndex, rawInput) {
    const ids = parseIds(rawInput);
    if (ids.length === 0) return { added: 0, error: true };

    if (!data[catIndex]) data[catIndex] = [];

    const now = new Date().toISOString();
    ids.forEach(id => {
      data[catIndex].unshift({ id, addedAt: now, uid: generateUid() });
    });

    save();
    renderColumn(catIndex);
    updateCount(catIndex);
    return { added: ids.length, ids, error: false };
  }

  function removeId(catIndex, itemIndex) {
    if (!data[catIndex]) return;
    data[catIndex].splice(itemIndex, 1);
    save();
    renderColumn(catIndex);
    updateCount(catIndex);
  }

  function moveIds(fromCat, indices, toCat) {
    if (fromCat === toCat) return;
    if (!data[fromCat]) return;
    if (!data[toCat]) data[toCat] = [];

    const validIndices = [...new Set(indices.map(Number))]
      .filter(i => Number.isInteger(i) && i >= 0 && i < data[fromCat].length);
    if (validIndices.length === 0) return;

    const itemsToMove = [...validIndices]
      .sort((a, b) => a - b)
      .map(i => data[fromCat][i])
      .filter(Boolean);

    validIndices
      .sort((a, b) => b - a)
      .forEach(i => data[fromCat].splice(i, 1));

    data[toCat] = [...itemsToMove, ...data[toCat]];
    save();
    renderColumn(fromCat);
    renderColumn(toCat);
    updateCount(fromCat);
    updateCount(toCat);
  }

  function getAllIds() {
    const all = [];
    for (const cat of [0, 1, 2, 3]) {
      (data[cat] || []).forEach(item => {
        if (!all.includes(item.id)) all.push(item.id);
      });
    }
    return all;
  }

  function getAllItems() {
    const items = [];
    for (const cat of [0, 1, 2, 3]) {
      (data[cat] || []).forEach((item, idx) => {
        items.push({ ...item, catIndex: cat, itemIndex: idx, catName: NAMES[cat] });
      });
    }
    return items;
  }

  function getCount(catIndex) {
    return (data[catIndex] || []).length;
  }

  function updateCount(catIndex) {
    const el = grid.querySelector(`.cat-column[data-cat="${catIndex}"] .cat-column__count`);
    if (el) el.textContent = getCount(catIndex);
  }

  function render() {
    grid.innerHTML = '';
    const visible = order.filter(i => !hidden.includes(i));
    grid.className = `categories-grid cols-${visible.length}`;
    grid.style.setProperty('--visible-cols', visible.length);

    visible.forEach(catIndex => {
      const col = createColumn(catIndex);
      grid.appendChild(col);
    });

    renderFilterChips();
  }

  function createColumn(catIndex) {
    const col = document.createElement('div');
    col.className = 'cat-column';
    col.dataset.cat = catIndex;
    col.draggable = true;

    col.innerHTML = `
      <div class="cat-column__header">
        <span class="material-icons-round cat-column__drag-handle">drag_indicator</span>
        <span class="cat-column__name">${NAMES[catIndex]}</span>
        <span class="cat-column__count">${getCount(catIndex)}</span>
      </div>
      <div class="cat-column__input-wrap">
        <input type="text" class="cat-column__input" placeholder="Введите ID..." data-cat="${catIndex}" autocomplete="off">
      </div>
      <div class="cat-column__list" data-cat="${catIndex}"></div>
    `;

    const input = col.querySelector('.cat-column__input');
    setupInput(input, catIndex);

    const list = col.querySelector('.cat-column__list');
    renderItems(list, catIndex);

    setupDragDrop(col, catIndex);

    return col;
  }

  function setupInput(input, catIndex) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd(input, catIndex);
      }
    });

    input.addEventListener('paste', (e) => {
      setTimeout(() => handleAdd(input, catIndex), 10);
    });

    input.addEventListener('input', () => {
      const cleaned = input.value.replace(/[^\d\s,;|\/\\]/g, '');
      if (cleaned !== input.value) {
        input.value = cleaned;
        input.classList.add('error');
        setTimeout(() => input.classList.remove('error'), 600);
      }
    });
  }

  function handleAdd(input, catIndex) {
    const val = input.value.trim();
    if (!val) return;

    const result = addIds(catIndex, val);
    if (result.error) {
      input.classList.add('error');
      setTimeout(() => input.classList.remove('error'), 600);
      Notifications.error('Введите корректный числовой ID');
      return;
    }

    input.value = '';
    Notifications.showCategoryAdd(catIndex, result.ids[0], result.added);

    if (typeof QuickReport !== 'undefined' && QuickReport.refresh) {
      QuickReport.refresh();
    }
  }

  function renderColumn(catIndex) {
    const list = grid.querySelector(`.cat-column__list[data-cat="${catIndex}"]`);
    if (list) renderItems(list, catIndex);
  }

  function renderItems(list, catIndex) {
    list.innerHTML = '';
    const items = data[catIndex] || [];

    items.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'id-item';

      el.innerHTML = `
        <span class="id-item__id">${item.id}</span>
        <div class="id-item__actions">
          <button class="id-item__btn id-item__btn--move" title="Перенести">
            <span class="material-icons-round">drive_file_move</span>
          </button>
          <button class="id-item__btn id-item__btn--delete" title="Удалить">
            <span class="material-icons-round">close</span>
          </button>
        </div>
      `;

      el.querySelector('.id-item__btn--delete').addEventListener('click', () => {
        Modals.confirm(
          'Удаление ID',
          `Удалить ID <b>${item.id}</b> из категории <b>${NAMES[catIndex]}</b>?`,
          () => {
            removeId(catIndex, idx);
            Notifications.success(`ID ${item.id} удалён из ${NAMES[catIndex]}`);
            if (typeof QuickReport !== 'undefined') QuickReport.refresh();
          }
        );
      });

      el.querySelector('.id-item__btn--move').addEventListener('click', () => {
        Modals.showMove(
          `Перенести ID <b>${item.id}</b> из <b>${NAMES[catIndex]}</b> в:`,
          catIndex,
          (toCat) => {
            moveIds(catIndex, [idx], toCat);
            Notifications.success(`ID ${item.id} перенесён в ${NAMES[toCat]}`);
            if (typeof QuickReport !== 'undefined') QuickReport.refresh();
          }
        );
      });

      list.appendChild(el);
    });
  }

  function setupDragDrop(col, catIndex) {
    col.addEventListener('dragstart', (e) => {
      dragSrcEl = col;
      col.style.opacity = '0.5';
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', catIndex.toString());
    });

    col.addEventListener('dragend', () => {
      col.style.opacity = '1';
      grid.querySelectorAll('.cat-column').forEach(c => c.classList.remove('drag-over'));
    });

    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragSrcEl !== col) col.classList.add('drag-over');
    });

    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));

    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      if (dragSrcEl === col) return;

      const fromCat = parseInt(e.dataTransfer.getData('text/plain'));
      const toCat = catIndex;

      const fromIdx = order.indexOf(fromCat);
      const toIdx = order.indexOf(toCat);
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, fromCat);

      Storage.setCategoryOrder(order);
      render();
    });
  }

  function renderFilterChips() {
    filterChips.innerHTML = '';
    // chips follow current order
    order.forEach(i => {
      const chip = document.createElement('button');
      chip.className = `cat-filter__chip${!hidden.includes(i) ? ' active' : ''}`;
      chip.dataset.cat = i;
      chip.textContent = NAMES[i];
      chip.addEventListener('click', () => {
        if (hidden.includes(i)) {
          hidden = hidden.filter(h => h !== i);
        } else {
          const visible = order.filter(x => !hidden.includes(x));
          if (visible.length <= 1) {
            Notifications.error('Нельзя скрыть все категории');
            return;
          }
          hidden.push(i);
        }
        Storage.setHiddenCats(hidden);
        render();
      });
      filterChips.appendChild(chip);
    });
  }

  function clearAll() {
    data = { 0: [], 1: [], 2: [], 3: [] };
    save();
    render();
  }

  return { init, addIds, removeId, moveIds, getAllIds, getAllItems, getCount, render, clearAll, NAMES, data: () => data };
})();
