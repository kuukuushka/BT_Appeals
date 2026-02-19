const Countries = (() => {
  const DB = [
    { name: 'Афганистан',          abbr: 'афг' },
    { name: 'Алжир',               abbr: 'алж' },
    { name: 'Бахрейн',             abbr: 'бах' },
    { name: 'Джибути',             abbr: 'джи' },
    { name: 'Египет',              abbr: 'еги' },
    { name: 'Иордания',            abbr: 'иор' },
    { name: 'Ирак',                abbr: 'ирак' },
    { name: 'Иран',                abbr: 'иран' },
    { name: 'Йемен',               abbr: 'йем' },
    { name: 'Катар',               abbr: 'кат' },
    { name: 'Кувейт',              abbr: 'кув' },
    { name: 'Ливан',               abbr: 'лив' },
    { name: 'Ливия',               abbr: 'ливия' },
    { name: 'Мавритания',          abbr: 'мав' },
    { name: 'Марокко',             abbr: 'мар' },
    { name: 'Монголия',            abbr: 'мон' },
    { name: 'ОАЭ',                 abbr: 'оаэ' },
    { name: 'Оман',                abbr: 'оман' },
    { name: 'Палестина',           abbr: 'пал' },
    { name: 'Саудовская Аравия',   abbr: 'сау' },
    { name: 'Сирия',               abbr: 'сир' },
    { name: 'Судан',               abbr: 'суд' },
    { name: 'Сомали',              abbr: 'сом' },
    { name: 'Тунис',               abbr: 'тун' },
    { name: 'Эфиопия',             abbr: 'эфи' },
    { name: 'Южный Судан',         abbr: 'юж.суд' },
  ];

  const nameToAbbr = new Map();
  const abbrToName = new Map();
  DB.forEach(c => {
    nameToAbbr.set(c.name.toLowerCase(), c.abbr);
    abbrToName.set(c.abbr, c.name);
  });

  function getAbbr(countryName) {
    if (!countryName) return null;
    const lower = countryName.trim().toLowerCase();
    if (abbrToName.has(lower)) return lower;
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
