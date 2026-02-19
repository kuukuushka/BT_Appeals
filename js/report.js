const Report = (() => {
  let uploadedData = null;
  let lastReport = null;

  const fileInput = document.getElementById('file-input');
  const dropZone = document.getElementById('file-drop-zone');
  const fileInfo = document.getElementById('file-info');
  const fileNameEl = document.getElementById('file-name');
  const btnUpload = document.getElementById('btn-upload-file');
  const btnRemove = document.getElementById('btn-remove-file');
  const btnGenerate = document.getElementById('btn-generate-report');
  const btnCopy = document.getElementById('btn-copy-report');
  const btnMatching = document.getElementById('btn-show-matching');
  const reportOutput = document.getElementById('report-output');

  function init() {
    btnUpload.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    dropZone.addEventListener('click', (e) => {
      if (e.target === btnUpload || btnUpload.contains(e.target)) return;
      fileInput.click();
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    btnRemove.addEventListener('click', removeFile);
    btnGenerate.addEventListener('click', generateReport);
    btnCopy.addEventListener('click', copyReport);
    btnMatching.addEventListener('click', showMatching);
  }

  function handleFileSelect(e) {
    if (e.target.files.length) handleFile(e.target.files[0]);
  }

  function handleFile(file) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      Notifications.error('Поддерживаются только файлы .xlsx, .xls, .csv');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        parseExcelData(jsonData);

        dropZone.hidden = true;
        fileInfo.hidden = false;
        fileNameEl.textContent = file.name;
        lastReport = null;
        reportOutput.value = '';
        btnGenerate.disabled = false;
        btnCopy.disabled = true;
        btnMatching.disabled = true;

        Notifications.success(`Файл "${file.name}" загружен`);
      } catch (err) {
        Notifications.error('Ошибка чтения файла: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function parseExcelData(rows) {
    uploadedData = [];

    let idCol = 0;
    let countryCol = 5;

    if (rows.length > 0) {
      const header = rows[0];
      header.forEach((cell, i) => {
        const val = String(cell || '').trim().toLowerCase();
        if (val === 'id') idCol = i;
        if (val.includes('стран') || val.includes('country')) countryCol = i;
      });
    }

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[idCol]) continue;

      const id = String(row[idCol]).replace(/\D/g, '');
      const country = row[countryCol] ? String(row[countryCol]).trim() : '';

      if (id) {
        uploadedData.push({ id, country: country || '' });
      }
    }
  }

  function removeFile() {
    uploadedData = null;
    lastReport = null;
    fileInput.value = '';
    fileNameEl.textContent = '';
    dropZone.hidden = false;
    fileInfo.hidden = true;
    btnGenerate.disabled = true;
    btnCopy.disabled = true;
    btnMatching.disabled = true;
    reportOutput.value = '';
  }

  function generateReport(silent = false) {
    if (!uploadedData || uploadedData.length === 0) {
      if (!silent) Notifications.error('Нет данных для генерации отчета');
      return;
    }

    const catData = Categories.data();
    const customCountries = Storage.getCustomCountries();

    const catIds = {};
    for (const cat of [0, 1, 2, 3]) {
      catIds[cat] = new Map();
      (catData[cat] || []).forEach(item => {
        catIds[cat].set(item.id, (catIds[cat].get(item.id) || 0) + 1);
      });
    }

    const reportParts = [];
    const matchingData = { known: [], unknown: [], notFound: [] };
    const catLabels = ['Обращений коллег', 'Обращений агентов', 'Обращений по консультанту', 'Обращений по тикетам'];
    const norm = (v) => String(v || '').trim();
    const uploadedById = new Map();

    uploadedData.forEach(row => {
      const rowId = norm(row.id);
      if (rowId && !uploadedById.has(rowId)) {
        uploadedById.set(rowId, row);
      }
    });

    for (const cat of [0, 1, 2, 3]) {
      const ids = catIds[cat];
      if (ids.size === 0) continue;

      const countryCounts = {};
      for (const [id, count] of ids) {
        const idStr = norm(id);
        const found = uploadedById.get(idStr);

        if (!found) {
          if (customCountries[id]) {
            const country = customCountries[id];
            const abbr = Countries.getAbbr(country) || (country.length > 3 ? country.substring(0, 3).toLowerCase() : country.toLowerCase());
            matchingData.known.push({ id, country, abbr, catIndex: cat });
            countryCounts[abbr] = (countryCounts[abbr] || 0) + count;
          } else {
            matchingData.notFound.push({ id, catIndex: cat });
          }
          continue;
        }

        let country = found.country;
        if (customCountries[id]) country = customCountries[id];

        if (!country) {
          matchingData.notFound.push({ id, catIndex: cat });
          continue;
        }

        let abbr = Countries.getAbbr(country);
        if (!abbr && customCountries[id]) {
          abbr = (country.length > 3 ? country.substring(0, 3) : country).toLowerCase();
        }
        if (abbr) {
          matchingData.known.push({ id, country, abbr, catIndex: cat });
          countryCounts[abbr] = (countryCounts[abbr] || 0) + count;
        } else {
          matchingData.unknown.push({
            id,
            country,
            abbr: country.length > 3 ? country.substring(0, 3).toLowerCase() : country.toLowerCase(),
            catIndex: cat
          });
        }
      }

      if (Object.keys(countryCounts).length === 0) continue;

      const sorted = Object.entries(countryCounts).sort((a, b) => a[0].localeCompare(b[0], 'ru'));
      reportParts.push(`${catLabels[cat]}:\n${sorted.map(([a, c]) => `${a}:${c}`).join('\n')}`);
    }

    const result = reportParts.join('\n\n');
    reportOutput.value = result;
    lastReport = { text: result, matching: matchingData };
    btnCopy.disabled = result.trim().length === 0;

    if (!silent) {
      if (result.trim().length > 0) Notifications.success('Отчет сгенерирован');
      else Notifications.info('Отчет сгенерирован, но пустой');
    }

    btnMatching.disabled = false;
  }

  function copyReport() {
    const text = reportOutput.value.trim();
    if (!text) {
      Notifications.error('Сначала сгенерируйте отчет');
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      Notifications.success('Отчет скопирован');
    }).catch(() => {
      Notifications.error('Не удалось скопировать отчет');
    });
  }

  function showMatching() {
    if (!lastReport) return;
    Modals.showMatching(lastReport.matching);
  }

  function getLastMatching() {
    return lastReport ? lastReport.matching : null;
  }

  function getUploadedData() {
    return uploadedData;
  }

  return { init, getUploadedData, generateReport, getLastMatching };
})();
