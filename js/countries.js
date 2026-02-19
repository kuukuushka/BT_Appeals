const Countries = (() => {
  const DB = [
    { name: 'Афганистан',          abbr: 'Афг' },
    { name: 'Алжир',               abbr: 'Алж' },
    { name: 'Бахрейн',             abbr: 'Бах' },
    { name: 'Джибути',             abbr: 'Джи' },
    { name: 'Египет',              abbr: 'Еги' },
    { name: 'Иордания',            abbr: 'Иор' },
    { name: 'Ирак',                abbr: 'Ирак' },
    { name: 'Иран',                abbr: 'Иран' },
    { name: 'Йемен',               abbr: 'Йем' },
    { name: 'Катар',               abbr: 'Кат' },
    { name: 'Кувейт',              abbr: 'Кув' },
    { name: 'Ливан',               abbr: 'Ливан' },
    { name: 'Ливия',               abbr: 'Ливия' },
    { name: 'Мавритания',          abbr: 'Мав' },
    { name: 'Марокко',             abbr: 'Мар' },
    { name: 'Монголия',            abbr: 'Мон' },
    { name: 'ОАЭ',                 abbr: 'ОАЭ' },
    { name: 'Оман',                abbr: 'Ома' },
    { name: 'Палестина',           abbr: 'Пал' },
    { name: 'Саудовская Аравия',   abbr: 'Сау' },
    { name: 'Сирия',               abbr: 'Сир' },
    { name: 'Судан',               abbr: 'Суд' },
    { name: 'Сомали',              abbr: 'Сом' },
    { name: 'Тунис',               abbr: 'Тун' },
    { name: 'Эфиопия',             abbr: 'Эфи' },
    { name: 'Южный Судан',         abbr: 'Южн' },
  ];

  const nameToAbbr = new Map();
  const abbrToCanonical = new Map();
  DB.forEach(c => {
    nameToAbbr.set(c.name.toLowerCase(), c.abbr);
    abbrToCanonical.set(c.abbr.toLowerCase(), c.abbr);
  });

  function getAbbr(countryName) {
    if (!countryName) return null;
    const lower = countryName.trim().toLowerCase();
    if (abbrToCanonical.has(lower)) return abbrToCanonical.get(lower);
    if (nameToAbbr.has(lower)) return nameToAbbr.get(lower);

    for (const [name, abbr] of nameToAbbr) {
      if (lower.includes(name) || name.includes(lower)) return abbr;
    }
    return null;
  }

  function isKnown(countryName) {
    return getAbbr(countryName) !== null;
  }

  function getAllSorted() {
    return [...DB].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }

  function getSortedWithFavorites(favList) {
    const all = getAllSorted();
    const favSet = new Set(favList);
    const favs = all.filter(c => favSet.has(c.name));
    const rest = all.filter(c => !favSet.has(c.name));
    return { favorites: favs, others: rest, all };
  }

  return { DB, getAbbr, isKnown, getAllSorted, getSortedWithFavorites };
})();
