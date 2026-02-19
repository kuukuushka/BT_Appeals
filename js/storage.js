const Storage = (() => {
  const PREFIX = 'bt_appeals_';

  const KEYS = {
    CATEGORIES: PREFIX + 'categories',
    CATEGORY_ORDER: PREFIX + 'cat_order',
    HIDDEN_CATS: PREFIX + 'hidden_cats',
    THEME: PREFIX + 'theme',
    NOTIF_ENABLED: PREFIX + 'notif_enabled',
    FAV_COUNTRIES: PREFIX + 'fav_countries',
    CUSTOM_COUNTRIES: PREFIX + 'custom_countries',
  };

  function get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* quota exceeded */ }
  }

  function remove(key) {
    localStorage.removeItem(key);
  }

  function getCategories() {
    return get(KEYS.CATEGORIES, { 0: [], 1: [], 2: [], 3: [] });
  }

  function setCategories(data) {
    set(KEYS.CATEGORIES, data);
  }

  function getCategoryOrder() {
    return get(KEYS.CATEGORY_ORDER, [0, 1, 2, 3]);
  }

  function setCategoryOrder(order) {
    set(KEYS.CATEGORY_ORDER, order);
  }

  function getHiddenCats() {
    return get(KEYS.HIDDEN_CATS, []);
  }

  function setHiddenCats(cats) {
    set(KEYS.HIDDEN_CATS, cats);
  }

  function getTheme() {
    return get(KEYS.THEME, 'light');
  }

  function setTheme(theme) {
    set(KEYS.THEME, theme);
  }

  function getNotifEnabled() {
    return get(KEYS.NOTIF_ENABLED, true);
  }

  function setNotifEnabled(val) {
    set(KEYS.NOTIF_ENABLED, val);
  }

  function getFavCountries() {
    return get(KEYS.FAV_COUNTRIES, []);
  }

  function setFavCountries(list) {
    set(KEYS.FAV_COUNTRIES, list);
  }

  function getCustomCountries() {
    return get(KEYS.CUSTOM_COUNTRIES, {});
  }

  function setCustomCountries(map) {
    set(KEYS.CUSTOM_COUNTRIES, map);
  }

  // Clears all app data EXCEPT: favourite countries, hidden cats, cat order, theme, notifications toggle.
  function clearUserData() {
    const favCountries = getFavCountries();
    const catOrder = getCategoryOrder();
    const hiddenCats = getHiddenCats();
    const theme = getTheme();
    const notifEnabled = getNotifEnabled();

    // Wipe every key that belongs to this app
    Object.values(KEYS).forEach(k => remove(k));

    // Restore preserved settings
    setFavCountries(favCountries);
    setCategoryOrder(catOrder);
    setHiddenCats(hiddenCats);
    setTheme(theme);
    setNotifEnabled(notifEnabled);
  }

  return {
    KEYS, get, set, remove,
    getCategories, setCategories,
    getCategoryOrder, setCategoryOrder,
    getHiddenCats, setHiddenCats,
    getTheme, setTheme,
    getNotifEnabled, setNotifEnabled,
    getFavCountries, setFavCountries,
    getCustomCountries, setCustomCountries,
    clearUserData,
  };
})();
