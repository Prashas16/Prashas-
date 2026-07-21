async function loadTrips(){
  const board = document.getElementById('board');
  const empty = document.getElementById('empty');

  let trips = [];
  try{
    const res = await fetch('trips.json', {cache:'no-store'});
    trips = await res.json();
  }catch(err){
    console.error('Could not load trips.json', err);
  }

  if(!trips.length){
    empty.hidden = false;
    return;
  }

  trips
    .slice()
    .sort((a,b) => new Date(a.startDate) - new Date(b.startDate))
    .forEach(trip => board.appendChild(renderTag(trip)));

  updateCountdown(trips);
}

function renderTag(trip){
  const el = document.createElement('article');
  el.className = 'tag';
  el.setAttribute('data-status', trip.status || 'idea');

  const dateLabel = formatDateRange(trip.startDate, trip.endDate);
  const people = (trip.people || []).join(', ');

  el.innerHTML = `
    <div class="tag-hole"></div>
    <div class="tag-body">
      <span class="tag-status">${trip.status || 'idea'}</span>
      <h2 class="tag-dest">${escapeHtml(trip.destination || 'Somewhere TBD')}</h2>
      <div class="tag-dates">${dateLabel}</div>
      ${people ? `<div class="tag-people">${escapeHtml(people)}</div>` : ''}
      ${trip.note ? `<div class="tag-note">${escapeHtml(trip.note)}</div>` : ''}
    </div>
  `;
  return el;
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
    el.textContent = 'No upcoming trips yet';
    return;
  }

  const days = Math.ceil((stripTime(new Date(upcoming.startDate)) - stripTime(new Date())) / 86400000);
  const dayWord = days === 1 ? 'day' : 'days';
  el.innerHTML = `<strong>${days} ${dayWord}</strong> until ${escapeHtml(upcoming.destination)}`;
}

function stripTime(d){
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadTrips();
