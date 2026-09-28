// Habibi Bot ID API — logika halaman dokumentasi
// Mengambil daftar endpoint dari GET /api/menu lalu merender kartu.

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Syntax highlighting sederhana untuk contoh curl
function highlight(code) {
  let h = escapeHtml(code);
  h = h
    .replace(/(&quot;.*?&quot;|&#x27;.*?&#x27;|'[^']*'|"[^"]*")/g, '<span class="tok-s">$1</span>')
    .replace(/\b(curl|-X|-H|-d|--data)\b/g, '<span class="tok-k">$1</span>')
    .replace(/(https?:\/\/[^\s'"]+)/g, '<span class="tok-u">$1</span>');
  return h;
}

function renderEndpoint(ep) {
  const method = String(ep.method || 'GET').toUpperCase();
  const badgeClass = method === 'POST' ? 'post' : 'get';
  const authBadge = ep.auth ? '<span class="badge auth">🔒 butuh key</span>' : '<span class="badge auth" style="opacity:.55">🔓 publik</span>';

  let paramsHtml = '';
  if (ep.params && ep.params.length) {
    const rows = ep.params
      .map(
        (p) => `<tr>
          <td><code>${escapeHtml(p.nama)}</code></td>
          <td>${escapeHtml(p.tipe)}</td>
          <td class="${p.wajib ? 'wajib' : 'opsional'}">${p.wajib ? 'wajib' : 'opsional'}</td>
          <td><code>${escapeHtml(p.contoh || '-')}</code></td>
        </tr>`,
      )
      .join('');
    paramsHtml = `<table class="params">
      <tr><th>Parameter</th><th>Tipe</th><th>Status</th><th>Contoh</th></tr>${rows}</table>`;
  }

  const contoh = ep.contoh
    ? `<div class="codeblock">
        <button class="copy" data-copy="${escapeHtml(ep.contoh)}">⧉ Salin</button>
        <pre><code>${highlight(ep.contoh)}</code></pre>
      </div>`
    : '';

  return `<article class="ep">
    <div class="ep-head">
      <span class="badge ${badgeClass}">${method}</span>
      <span class="ep-path">${escapeHtml(ep.path)}</span>
      ${authBadge}
    </div>
    <p class="ep-desc">${escapeHtml(ep.deskripsi)}</p>
    ${paramsHtml}
    ${contoh}
  </article>`;
}

async function muatMenu() {
  const wadah = document.getElementById('daftarEndpoint');
  try {
    const res = await fetch('/api/menu');
    const data = await res.json();
    const list = data.endpoints || [];
    document.getElementById('versi').textContent = 'v' + (data.versi || '1.0.0');
    wadah.innerHTML = list.map(renderEndpoint).join('');
  } catch (e) {
    wadah.innerHTML = '<p class="note">⚠️ Gagal memuat daftar endpoint dari /api/menu. Pastikan server API berjalan.</p>';
  }
}

async function cekStatus() {
  const dot = document.getElementById('statusDot');
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.status) {
      dot.classList.add('ok');
      dot.innerHTML = '<span class="pulse"></span><em>online</em>';
    } else {
      throw new Error('offline');
    }
  } catch (e) {
    dot.classList.add('down');
    dot.innerHTML = '<span class="pulse"></span><em>offline</em>';
  }
}

// Tombol salin (event delegation — berlaku untuk kartu yang dirender dinamis)
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.copy');
  if (!btn) return;
  const teks = btn.getAttribute('data-copy') || '';
  try {
    await navigator.clipboard.writeText(teks);
  } catch {
    // fallback untuk browser lama / konteks non-HTTPS
    const ta = document.createElement('textarea');
    ta.value = teks;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  btn.classList.add('done');
  const labelAwal = btn.textContent;
  btn.textContent = '✓ Tersalin';
  setTimeout(() => {
    btn.classList.remove('done');
    btn.textContent = labelAwal;
  }, 1500);
});

muatMenu();
cekStatus();
