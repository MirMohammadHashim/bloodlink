// Presentation tier. All calls go to /api/*, which CloudFront routes to the
// Application Load Balancer, so the frontend never needs to know the ALB URL.
const API = '/api';
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const $ = (sel, root = document) => root.querySelector(sel);

// Build DOM nodes with textContent only, so user-entered data can never inject HTML.
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const child of [].concat(children)) {
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.errors || ['Request failed']).join('. '));
  return data;
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setMessage(node, text, ok) {
  node.textContent = text;
  node.className = 'form-msg ' + (ok ? 'ok' : 'err');
}

function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ---- Setup ----------------------------------------------------------------
document.querySelectorAll('select.blood-groups').forEach((select) => {
  select.append(el('option', { value: '', textContent: 'Select…' }));
  BLOOD_GROUPS.forEach((g) => select.append(el('option', { value: g, textContent: g })));
});

const todayIso = new Date().toISOString().slice(0, 10);
$('#donor-form [name=lastDonationDate]').max = todayIso;
$('#request-form [name=neededBy]').min = todayIso;

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab, .panel').forEach((n) => n.classList.remove('active'));
    tab.classList.add('active');
    $('#' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'requests') loadRequests();
  });
});

// ---- Find donors ----------------------------------------------------------
$('#search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { bloodGroup, city } = formToObject(e.target);
  const summary = $('#search-summary');
  const list = $('#donor-list');
  list.replaceChildren();
  summary.textContent = 'Searching…';

  try {
    const params = new URLSearchParams({ bloodGroup, city }); // encodes "+" safely
    const data = await api('/donors/search?' + params);
    summary.textContent = data.donors.length
      ? `${data.donors.length} eligible donor(s) in ${city} who can give to ${data.recipientGroup} ` +
        `(compatible groups: ${data.compatibleGroups.join(', ')}).`
      : `No eligible donors found in ${city} yet. Try posting an urgent request.`;

    data.donors.forEach((d) => {
      list.append(
        el('li', {}, [
          el('span', { className: 'badge' + (d.exactMatch ? '' : ' alt'), textContent: d.bloodGroup }),
          el('div', { style: 'flex:1' }, [
            el('div', { className: 'who', textContent: d.name }),
            el('div', {
              className: 'meta',
              textContent: d.city + (d.exactMatch ? ' · exact match' : ' · compatible'),
            }),
          ]),
          el('a', { className: 'call', href: 'tel:' + d.phone, textContent: 'Call ' + d.phone }),
        ])
      );
    });
  } catch (err) {
    summary.textContent = err.message;
  }
});

// ---- Become a donor -------------------------------------------------------
$('#donor-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const body = formToObject(form);
  body.consent = form.consent.checked;
  if (!body.lastDonationDate) delete body.lastDonationDate;

  const button = $('button', form);
  button.disabled = true;
  try {
    const data = await api('/donors', { method: 'POST', body: JSON.stringify(body) });
    setMessage($('#donor-msg'), data.message, true);
    form.reset();
  } catch (err) {
    setMessage($('#donor-msg'), err.message, false);
  } finally {
    button.disabled = false;
  }
});

// ---- Urgent requests ------------------------------------------------------
async function loadRequests(city = '') {
  const list = $('#request-list');
  list.replaceChildren(el('li', { className: 'muted', textContent: 'Loading…' }));
  try {
    const params = city ? '?' + new URLSearchParams({ city }) : '';
    const requests = await api('/requests' + params);
    list.replaceChildren();
    if (!requests.length) {
      list.append(el('li', { className: 'muted', textContent: 'No open requests right now.' }));
      return;
    }
    requests.forEach((r) => {
      list.append(
        el('li', {}, [
          el('span', { className: 'badge', textContent: r.bloodGroup }),
          el('div', { style: 'flex:1' }, [
            el('div', {
              className: 'who',
              textContent: `${r.units} unit(s) for ${r.patientName}`,
            }),
            el('div', {
              className: 'meta',
              textContent: `${r.hospital}, ${r.city} · needed by ${formatDate(r.neededBy)}`,
            }),
          ]),
          el('a', { className: 'call', href: 'tel:' + r.contactPhone, textContent: 'Call ' + r.contactPhone }),
        ])
      );
    });
  } catch (err) {
    list.replaceChildren(el('li', { className: 'muted', textContent: err.message }));
  }
}

$('#request-filter').addEventListener('submit', (e) => {
  e.preventDefault();
  loadRequests(formToObject(e.target).city.trim());
});

$('#request-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const body = formToObject(form);
  body.units = Number(body.units);

  const button = $('button', form);
  button.disabled = true;
  try {
    const data = await api('/requests', { method: 'POST', body: JSON.stringify(body) });
    setMessage($('#request-msg'), data.message, true);
    form.reset();
    loadRequests();
  } catch (err) {
    setMessage($('#request-msg'), err.message, false);
  } finally {
    button.disabled = false;
  }
});
