document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNavigation();
  Categories.init();
  Report.init();
  QuickReport.init();
  Modals.init();
  initToolbarActions();
  initNotifToggle();
});

function initTheme() {
  const theme = Storage.getTheme();
  applyTheme(theme);

  document.getElementById('btn-theme').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    Storage.setTheme(next);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.querySelector('#btn-theme .material-icons-round');
  icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
}

function initNavigation() {
  const navButtons = document.querySelectorAll('.toolbar__nav [data-page]');
  const pages = document.querySelectorAll('.page');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.page;

      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === `page-${target}`) {
          page.classList.add('active');
        }
      });

      if (target === 'quick-report') QuickReport.refresh();
    });
  });
}

function initToolbarActions() {
  document.getElementById('btn-copy-ids').addEventListener('click', () => {
    const ids = Categories.getAllIds();
    if (ids.length === 0) {
      Notifications.error('Нет ID для копирования');
      return;
    }
    const text = ids.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      Notifications.success(`${ids.length} уникальных ID скопировано!`);
    }).catch(() => {
      Notifications.error('Не удалось скопировать');
    });
  });

  document.getElementById('btn-clear-all').addEventListener('click', () => {
    const total = [0, 1, 2, 3].reduce((s, c) => s + Categories.getCount(c), 0);
    if (total === 0) {
      Notifications.info('Нечего очищать');
      return;
    }
    Modals.confirm(
      'Очистить все данные',
       `Удалить все <b>${total}</b> ID из всех категорий?<br><br>
        <span style="color:var(--text-2);font-size:var(--fs-xs)">
          Сохранятся: избранные страны, скрытые категории, порядок категорий, тема, состояние уведомлений.
        </span>`,
      () => {
        // Wipe everything except preserved settings
        Storage.clearUserData();
        // Re-init categories from fresh storage (empty arrays)
        Categories.init();
        if (typeof Report !== 'undefined' && typeof Report.reset === 'function') {
          Report.reset();
        }
        QuickReport.refresh();
        const notifToggle = document.getElementById('toggle-notif');
        if (notifToggle) notifToggle.checked = Storage.getNotifEnabled();
        Notifications.success('Все данные очищены');
      }
    );
  });
}

function initNotifToggle() {
  const toggle = document.getElementById('toggle-notif');
  toggle.checked = Storage.getNotifEnabled();
  toggle.addEventListener('change', () => {
    Storage.setNotifEnabled(toggle.checked);
    if (toggle.checked) Notifications.info('Уведомления включены');
  });
}
