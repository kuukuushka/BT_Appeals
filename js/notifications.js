const Notifications = (() => {
  const animations = ['notifSlideIn', 'notifBounceIn', 'notifFadeIn'];
  const CATEGORY_NAMES = ['Коллеги', 'Агенты', 'Консультант', 'Тикеты'];

  function show(message, type = 'info', duration = 2500) {
    const container = document.getElementById('notifications');
    if (!container) return;

    const el = document.createElement('div');
    const anim = animations[Math.floor(Math.random() * animations.length)];
    el.className = `notif notif--${type}`;
    el.style.animationName = anim;

    const icons = {
      'info': 'info',
      'success': 'check_circle',
      'error': 'error',
      'warning': 'warning',
      'cat-0': 'group',
      'cat-1': 'support_agent',
      'cat-2': 'headset_mic',
      'cat-3': 'confirmation_number',
    };

    const safeMsg = String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    el.innerHTML = `
      <span class="material-icons-round">${icons[type] || 'info'}</span>
      <span>${safeMsg}</span>
    `;

    container.appendChild(el);

    setTimeout(() => {
      el.style.animationName = 'notifOut';
      el.addEventListener('animationend', () => el.remove());
    }, duration);
  }

  function showCategoryAdd(catIndex, id, count) {
    if (!Storage.getNotifEnabled()) return;
    const name = CATEGORY_NAMES[catIndex];
    const msg = count > 1
      ? `${count} ID добавлено в ${name}`
      : `ID ${id} добавлен в ${name}`;
    show(msg, `cat-${catIndex}`);
  }

  function success(msg) { show(msg, 'success'); }
  function error(msg) { show(msg, 'error', 3500); }
  function info(msg) { show(msg, 'info'); }
  function warning(msg) { show(msg, 'warning', 4000); }

  return { show, showCategoryAdd, success, error, info, warning, CATEGORY_NAMES };
})();
