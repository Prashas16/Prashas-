// ---- Repo config: update these to match your GitHub repo ----
const REPO_OWNER = 'prashas16';
const REPO_NAME = 'Prashas';
const REPO_BRANCH = 'main';
const DATA_PATH = 'trips.json';
const TOKEN_KEY = 'decTripBoard_ghToken';

let currentTrips = [];
let currentSha = null;
let editingIndex = null; // null = adding a new trip

// ---------- Boot ----------
init();

async function init(){
  wireSettingsModal();
  wireTripModal();
  document.getElementById('add-trip').addEventListener('click', () => openTripModal());
  await loadTrips();
}

// ---------- Loading & rendering ----------
async function loadTrips(){
  const board = document.getElementById('board');
  const empty = document.getElementById('empty');
  board.innerHTML = '';

  try{
    const token = getToken();
    if(token){
      // Authenticated read via API so we also get the file's sha for saving later
      const res = await fetch(apiUrl(), { headers: authHeaders(token) });
      if(!res.ok) throw new Error(`GitHub API ${res.status}`);
      const data = await res.json();
      currentSha = data.sha;
      currentTrips = JSON.parse(decodeBase64(data.content));
    } else {
      // Public read, no token needed
      const res = await fetch(`trips.json?t=${Date.now()}`, { cache: 'no-store' });
      currentTrips = await res.json();
    }
  }catch(err){
    console.error('Could not load trips.json', err);
    setStatus('Could not load trips.json — check the console for details.', true);
  }

  if(!currentTrips.length){
    empty.hidden = false;
  } else {
    empty.hidden = true;
  }

  currentTrips
    .map((trip, i) => ({ trip, i }))
    .sort((a,b) => new Date(a.trip.startDate) - new Date(b.trip.startDate))
    .forEach(({trip, i}) => board.appendChild(renderTag(trip, i)));

  updateCountdown(currentTrips);
}

function renderTag(trip, index){
  const el = document.createElement('article');
  el.className = 'tag';
  el.setAttribute('data-status', trip.status || 'idea');

  const dateLabel = formatDateRange(trip.startDate, trip.endDate);
  const people = (trip.people || []).join(', ');
  const initials = (trip.destination || '?').split(/[\s,]+/).map(w => w[0]).slice(0,2).join('').toUpperCase();

  const photoHtml = trip.imageUrl
    ? `<img class="tag-photo" src="${escapeAttr(trip.imageUrl)}" alt="${escapeAttr(trip.destination || '')}" loading="lazy">`
    : `<div class="tag-photo-placeholder">${escapeHtml(initials)}</div>`;

  const editBtn = getToken() ? `<button class="tag-edit" title="Edit trip" aria-label="Edit trip">✎</button>` : '';

  el.innerHTML = `
    ${editBtn}
    ${photoHtml}
    <div class="tag-body">
      <span class="tag-status">${escapeHtml(trip.status || 'idea')}</span>
      <h2 class="tag-dest">${escapeHtml(trip.destination || 'Somewhere TBD')}</h2>
      <div class="tag-dates">${dateLabel}</div>
      ${people ? `<div class="tag-people">${escapeHtml(people)}</div>` : ''}
      ${trip.note ? `<div class="tag-note">${escapeHtml(trip.note)}</div>` : ''}
      <button class="map-toggle" type="button">View map ▾</button>
    </div>
  `;

  const mapBtn = el.querySelector('.map-toggle');
  mapBtn.addEventListener('click', () => toggleMap(el, trip, mapBtn));

  const editEl = el.querySelector('.tag-edit');
  if(editEl){
    editEl.addEventListener('click', () => openTripModal(index));
  }

  return el;
}

function toggleMap(tagEl, trip, btn){
  const existing = tagEl.querySelector('.tag-map');
  if(existing){
    existing.remove();
    btn.textContent = 'View map ▾';
    return;
  }
  const iframe = document.createElement('iframe');
  iframe.className = 'tag-map';
  iframe.loading = 'lazy';
  iframe.src = `https://www.google.com/maps?q=${encodeURIComponent(trip.destination || '')}&output=embed`;
  tagEl.querySelector('.tag-body').appendChild(iframe);
  btn.textContent = 'Hide map ▴';
}

function formatDateRange(start, end){
  if(!start) return 'Dates TBD';
  const opts = { month:'short', day:'numeric' };
  const s = new Date(start);
  const sLabel = s.toLocaleDateString('en-US', opts);
  if(!end) return sLabel;
  const e = new Date(end);
  const eLabel = e.toLocaleDateString('en-US', opts);
  return `${sLabel} – ${eLabel}`;
}

function updateCountdown(trips){
  const el = document.getElementById('countdown');
  const upcoming = trips
    .filter(t => t.startDate && new Date(t.startDate) >= stripTime(new Date()))
    .sort((a,b) => new Date(a.startDate) - new Date(b.startDate))[0];

  if(!upcoming){
    el.textContent = trips.length ? 'No upcoming trips yet' : '--';
    return;
  }

  const days = Math.ceil((stripTime(new Date(upcoming.startDate)) - stripTime(new Date())) / 86400000);
  const dayWord = days === 1 ? 'day' : 'days';
  el.innerHTML = `<strong>${days} ${dayWord}</strong> until ${escapeHtml(upcoming.destination)}`;
}

function stripTime(d){
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ---------- Token / settings modal ----------
function getToken(){
  return localStorage.getItem(TOKEN_KEY) || '';
}

function wireSettingsModal(){
  const modal = document.getElementById('token-modal');
  const openBtn = document.getElementById('settings-btn');
  const input = document.getElementById('token-input');

  openBtn.addEventListener('click', () => {
    input.value = getToken();
    modal.hidden = false;
  });

  document.getElementById('token-cancel').addEventListener('click', () => modal.hidden = true);

  document.getElementById('token-save').addEventListener('click', async () => {
    const val = input.value.trim();
    if(val) localStorage.setItem(TOKEN_KEY, val);
    modal.hidden = true;
    setStatus(val ? 'Token saved in this browser.' : '');
    await loadTrips();
  });

  document.getElementById('token-clear').addEventListener('click', async () => {
    localStorage.removeItem(TOKEN_KEY);
    input.value = '';
    modal.hidden = true;
    setStatus('Token removed. You can still view the board, but saving needs a token.');
    await loadTrips();
  });

  modal.addEventListener('click', (e) => { if(e.target === modal) modal.hidden = true; });
}

// ---------- Add / edit trip modal ----------
function wireTripModal(){
  const modal = document.getElementById('trip-modal');
  const form = document.getElementById('trip-form');

  document.getElementById('trip-cancel').addEventListener('click', () => modal.hidden = true);
  modal.addEventListener('click', (e) => { if(e.target === modal) modal.hidden = true; });

  document.getElementById('trip-delete').addEventListener('click', async () => {
    if(editingIndex === null) return;
    if(!confirm('Delete this trip?')) return;
    currentTrips.splice(editingIndex, 1);
    modal.hidden = true;
    await persistTrips('Remove trip');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const trip = {
      destination: document.getElementById('f-destination').value.trim(),
      startDate: document.getElementById('f-start').value,
      endDate: document.getElementById('f-end').value || undefined,
      status: document.getElementById('f-status').value,
      people: document.getElementById('f-people').value
        .split(',').map(s => s.trim()).filter(Boolean),
      imageUrl: document.getElementById('f-image').value.trim() || undefined,
      note: document.getElementById('f-note').value.trim() || undefined,
    };

    if(editingIndex === null){
      currentTrips.push(trip);
    } else {
      currentTrips[editingIndex] = trip;
    }

    modal.hidden = true;
    await persistTrips(editingIndex === null ? 'Add trip' : 'Update trip');
  });
}

function openTripModal(index){
  const token = getToken();
  if(!token){
    setStatus('Connect a GitHub token first (⚙ top right) to add or edit trips.', true);
    document.getElementById('token-modal').hidden = false;
    return;
  }

  editingIndex = (typeof index === 'number') ? index : null;
  const modal = document.getElementById('trip-modal');
  const title = document.getElementById('trip-modal-title');
  const deleteBtn = document.getElementById('trip-delete');

  if(editingIndex !== null){
    const t = currentTrips[editingIndex];
    title.textContent = 'Edit trip';
    deleteBtn.hidden = false;
    document.getElementById('f-destination').value = t.destination || '';
    document.getElementById('f-start').value = t.startDate || '';
    document.getElementById('f-end').value = t.endDate || '';
    document.getElementById('f-status').value = t.status || 'idea';
    document.getElementById('f-people').value = (t.people || []).join(', ');
    document.getElementById('f-image').value = t.imageUrl || '';
    document.getElementById('f-note').value = t.note || '';
  } else {
    title.textContent = 'Add a trip';
    deleteBtn.hidden = true;
    document.getElementById('trip-form').reset();
  }

  modal.hidden = false;
}

// ---------- Saving to GitHub ----------
async function persistTrips(message){
  const token = getToken();
  if(!token){
    setStatus('No token connected — changes were not saved.', true);
    return;
  }

  setStatus('Saving to GitHub…');
  try{
    const body = {
      message: `${message} via trip board`,
      content: encodeBase64(JSON.stringify(currentTrips, null, 2)),
      branch: REPO_BRANCH,
    };
    if(currentSha) body.sha = currentSha;

    const res = await fetch(apiUrl(), {
      method: 'PUT',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if(!res.ok){
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `GitHub API ${res.status}`);
    }

    const data = await res.json();
    currentSha = data.content.sha;
    setStatus('Saved. The board is up to date.');
    await loadTrips();
  }catch(err){
    console.error(err);
    setStatus(`Save failed: ${err.message}`, true);
  }
}

function apiUrl(){
  return `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${DATA_PATH}?ref=${REPO_BRANCH}`;
}

function authHeaders(token){
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  };
}

function encodeBase64(str){
  return btoa(unescape(encodeURIComponent(str)));
}

function decodeBase64(str){
  return decodeURIComponent(escape(atob(str)));
}

function setStatus(msg, isError){
  const el = document.getElementById('status-line');
  el.textContent = msg || '';
  el.classList.toggle('error', !!isError);
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str){
  return String(str).replace(/"/g, '&quot;');
}
