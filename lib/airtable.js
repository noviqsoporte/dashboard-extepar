// lib/airtable.js — Server-side ONLY. Never import from frontend.
const BASE_URL = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;

const headers = () => ({
  Authorization: `Bearer ${process.env.AIRTABLE_PAT}`,
  'Content-Type': 'application/json',
});

// Generic fetch with pagination
async function fetchAll(tableId, options = {}) {
  const { filterByFormula, sort, fields, maxRecords } = options;
  let allRecords = [];
  let offset = null;

  do {
    const params = new URLSearchParams();
    if (offset) params.set('offset', offset);
    if (filterByFormula) params.set('filterByFormula', filterByFormula);
    if (maxRecords) params.set('maxRecords', String(maxRecords));
    if (fields) fields.forEach(f => params.append('fields[]', f));
    if (sort) sort.forEach((s, i) => {
      params.set(`sort[${i}][field]`, s.field);
      if (s.direction) params.set(`sort[${i}][direction]`, s.direction);
    });

    const url = `${BASE_URL}/${tableId}?${params.toString()}`;
    const res = await fetch(url, { headers: headers() });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Airtable error ${res.status}: ${err}`);
    }

    const data = await res.json();
    allRecords = allRecords.concat(data.records || []);
    offset = data.offset || null;
  } while (offset);

  return allRecords;
}

async function getRecord(tableId, recordId) {
  const res = await fetch(`${BASE_URL}/${tableId}/${recordId}`, { headers: headers() });
  if (!res.ok) throw new Error(`Airtable error ${res.status}`);
  return res.json();
}

async function createRecord(tableId, fields) {
  const res = await fetch(`${BASE_URL}/${tableId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable create error ${res.status}: ${err}`);
  }
  return res.json();
}

async function updateRecord(tableId, recordId, fields) {
  const res = await fetch(`${BASE_URL}/${tableId}/${recordId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable update error ${res.status}: ${err}`);
  }
  return res.json();
}

async function deleteRecord(tableId, recordId) {
  const res = await fetch(`${BASE_URL}/${tableId}/${recordId}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Airtable delete error ${res.status}`);
  return res.json();
}

module.exports = { fetchAll, getRecord, createRecord, updateRecord, deleteRecord };
