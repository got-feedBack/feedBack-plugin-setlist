// Setlist Builder plugin

let _slCurrentId = null;
let _slQueue = [];  // for sequential playback
let _slQueueIndex = -1;

// JS-string-escapes a value for use inside a single-quoted string literal in an
// inline onclick attribute. The browser HTML-decodes the attribute before parsing
// it as JS, so this must run first and the result must still be wrapped in esc()
// for the surrounding HTML attribute: esc(formatJsStringForHtml(value)).
function formatJsStringForHtml(str) {
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ── List View ───────────────────────────────────────────────────────────

async function slLoadList() {
    const resp = await fetch('/api/plugins/setlist/list');
    const setlists = await resp.json();
    const container = document.getElementById('sl-list');

    if (setlists.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">No setlists yet. Create one to get started.</p>';
        return;
    }

    container.innerHTML = setlists.map(s => `
        <div class="flex items-center gap-4 bg-dark-700/50 border border-gray-800/50 rounded-xl p-4 hover:border-accent/20 transition cursor-pointer"
             onclick="slOpenDetail(${s.id})">
            <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold text-white">${esc(s.name)}</h3>
                <p class="text-xs text-gray-500 mt-0.5">${s.song_count} song${s.song_count !== 1 ? 's' : ''}</p>
            </div>
            <button onclick="event.stopPropagation();slDelete(${s.id},'${_escAttr(formatJsStringForHtml(s.name))}')"
                class="px-2 py-1 text-gray-600 hover:text-red-400 transition text-xs">Delete</button>
        </div>
    `).join('');
}

async function slCreateNew() {
    const name = prompt('Setlist name:');
    if (!name) return;
    await fetch('/api/plugins/setlist/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    slLoadList();
}

async function slDelete(id, name) {
    if (!confirm(`Delete setlist "${name}"?`)) return;
    await fetch(`/api/plugins/setlist/${id}`, { method: 'DELETE' });
    slLoadList();
}

// ── Detail View ─────────────────────────────────────────────────────────

async function slOpenDetail(id) {
    _slCurrentId = id;
    document.getElementById('sl-list-view').classList.add('hidden');
    document.getElementById('sl-detail-view').classList.remove('hidden');
    document.getElementById('sl-search-results').innerHTML = '';
    document.getElementById('sl-search').value = '';
    await slLoadDetail();
}

function slBackToList() {
    document.getElementById('sl-detail-view').classList.add('hidden');
    document.getElementById('sl-list-view').classList.remove('hidden');
    _slCurrentId = null;
    slLoadList();
}

async function slLoadDetail() {
    const resp = await fetch(`/api/plugins/setlist/${_slCurrentId}`);
    const data = await resp.json();

    document.getElementById('sl-detail-name').textContent = data.name;

    const container = document.getElementById('sl-songs');
    if (data.songs.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">Empty setlist. Search and add songs above.</p>';
        document.getElementById('sl-play-btn').classList.add('hidden');
        return;
    }

    document.getElementById('sl-play-btn').classList.remove('hidden');

    container.innerHTML = data.songs.map((s, i) => `
        <div class="flex items-center gap-3 bg-dark-700/30 border border-gray-800/30 rounded-lg p-3" data-song-id="${s.id}">
            <span class="text-xs text-gray-600 w-6 text-center">${i + 1}</span>
            <div class="flex-1 min-w-0 cursor-pointer" onclick="playSong('${esc(formatJsStringForHtml(encodeURIComponent(s.filename)))}')">
                <span class="text-sm text-white truncate block hover:text-accent-light transition">${esc(s.title || s.filename)}</span>
                <span class="text-xs text-gray-500">${esc(s.artist || '')}${s.arrangement ? ' · ' + esc(s.arrangement) : ''}</span>
            </div>
            <div class="flex gap-1 flex-shrink-0">
                <button onclick="slMove(${s.id},-1)" class="px-2 py-1 text-gray-600 hover:text-white transition text-xs" ${i === 0 ? 'disabled' : ''}>&#9650;</button>
                <button onclick="slMove(${s.id},1)" class="px-2 py-1 text-gray-600 hover:text-white transition text-xs" ${i === data.songs.length - 1 ? 'disabled' : ''}>&#9660;</button>
                <button onclick="slRemoveSong(${s.id})" class="px-2 py-1 text-gray-600 hover:text-red-400 transition text-xs">&#10005;</button>
            </div>
        </div>
    `).join('');
}

async function slRename() {
    const name = prompt('New name:');
    if (!name) return;
    await fetch(`/api/plugins/setlist/${_slCurrentId}/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    slLoadDetail();
}

async function slRemoveSong(songId) {
    await fetch(`/api/plugins/setlist/${_slCurrentId}/song/${songId}`, { method: 'DELETE' });
    slLoadDetail();
}

async function slMove(songId, direction) {
    // Get current order, swap, reorder
    const resp = await fetch(`/api/plugins/setlist/${_slCurrentId}`);
    const data = await resp.json();
    const ids = data.songs.map(s => s.id);
    const idx = ids.indexOf(songId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= ids.length) return;
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    await fetch(`/api/plugins/setlist/${_slCurrentId}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_ids: ids }),
    });
    slLoadDetail();
}

// ── Add songs ───────────────────────────────────────────────────────────

async function slSearchSongs() {
    const q = document.getElementById('sl-search').value.trim();
    if (!q) return;
    const resp = await fetch(`/api/library?q=${encodeURIComponent(q)}&page=0&size=10&sort=artist`);
    const data = await resp.json();
    const container = document.getElementById('sl-search-results');

    if (!data.songs || data.songs.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-xs py-2">No results</p>';
        return;
    }

    container.innerHTML = data.songs.map(s => {
        const arrs = (s.arrangements || []).map(a => a.name);
        return `<div class="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-dark-700/50 transition">
            <div class="flex-1 min-w-0">
                <span class="text-sm text-white">${esc(s.title)}</span>
                <span class="text-xs text-gray-500 ml-2">${esc(s.artist)}</span>
            </div>
            ${arrs.map(a => `<button onclick="slAddSong('${esc(formatJsStringForHtml(encodeURIComponent(s.filename)))}','${_escAttr(formatJsStringForHtml(s.title))}','${_escAttr(formatJsStringForHtml(s.artist))}','${_escAttr(formatJsStringForHtml(a))}')"
                class="px-2 py-1 bg-dark-600 hover:bg-accent/30 rounded text-xs text-gray-300 hover:text-white transition">+ ${esc(a)}</button>`).join('')}
        </div>`;
    }).join('');
}

async function slAddSong(filename, title, artist, arrangement) {
    await fetch(`/api/plugins/setlist/${_slCurrentId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filename: decodeURIComponent(filename),
            title, artist, arrangement,
        }),
    });
    slLoadDetail();
}

// ── Sequential Playback ─────────────────────────────────────────────────

async function slPlayAll() {
    const resp = await fetch(`/api/plugins/setlist/${_slCurrentId}`);
    const data = await resp.json();
    if (!data.songs || data.songs.length === 0) return;

    _slQueue = data.songs;
    _slQueueIndex = 0;
    _slPlayCurrent();
}

function _slPlayCurrent() {
    if (_slQueueIndex < 0 || _slQueueIndex >= _slQueue.length) {
        _slQueue = [];
        _slQueueIndex = -1;
        return;
    }
    const song = _slQueue[_slQueueIndex];
    playSong(encodeURIComponent(song.filename));

    // Show setlist progress overlay
    _slShowProgress();
}

function _slShowProgress() {
    let overlay = document.getElementById('sl-progress');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'sl-progress';
        overlay.className = 'fixed top-16 right-4 z-50 bg-dark-700/95 border border-gray-700 rounded-xl p-3 shadow-xl max-w-xs';
        document.body.appendChild(overlay);
    }
    const song = _slQueue[_slQueueIndex];
    overlay.innerHTML = `
        <div class="text-xs text-gray-400 mb-2">Setlist: ${_slQueueIndex + 1} / ${_slQueue.length}</div>
        <div class="text-sm text-white mb-1">${esc(song.title || song.filename)}</div>
        <div class="text-xs text-gray-500 mb-3">${esc(song.artist || '')}</div>
        <div class="flex gap-2">
            <button onclick="_slPrev()" class="px-2 py-1 bg-dark-600 hover:bg-dark-500 rounded text-xs text-gray-300 transition" ${_slQueueIndex === 0 ? 'disabled' : ''}>Prev</button>
            <button onclick="_slNext()" class="px-2 py-1 bg-accent hover:bg-accent-light rounded text-xs text-white transition">${_slQueueIndex < _slQueue.length - 1 ? 'Next' : 'Done'}</button>
            <button onclick="_slStopQueue()" class="px-2 py-1 bg-dark-600 hover:bg-red-900/50 rounded text-xs text-gray-400 hover:text-red-400 transition">Stop</button>
        </div>
    `;
}

function _slNext() {
    _slQueueIndex++;
    if (_slQueueIndex >= _slQueue.length) {
        _slStopQueue();
        return;
    }
    _slPlayCurrent();
}

function _slPrev() {
    if (_slQueueIndex > 0) {
        _slQueueIndex--;
        _slPlayCurrent();
    }
}

function _slStopQueue() {
    _slQueue = [];
    _slQueueIndex = -1;
    const overlay = document.getElementById('sl-progress');
    if (overlay) overlay.remove();
}

// ── Hook: auto-advance when song ends ───────────────────────────────────
(function() {
    const audio = document.getElementById('audio');
    if (audio) {
        audio.addEventListener('ended', () => {
            if (_slQueue.length > 0 && _slQueueIndex >= 0) {
                _slNext();
            }
        });
    }
})();

// ── Init: load list when screen shown ───────────────────────────────────
// The showScreen hook is already handled by the plugin loader calling
// the screen JS after injection. We also hook showScreen to reload.
(function() {
    // Idempotency: if screen.js is re-evaluated (loader cache miss, hot reload,
    // older core builds without the load-side guard), don't re-wrap showScreen —
    // each re-wrap captures the previous wrapper, growing the chain and
    // leaking closures.
    const HOOK_KEY = '__slopsmithSetlistHooksInstalled';
    if (window[HOOK_KEY]) return;
    window[HOOK_KEY] = true;

    const origShowScreen = window.showScreen;
    window.showScreen = function(id) {
        origShowScreen(id);
        if (id === 'plugin-setlist') {
            document.getElementById('sl-list-view').classList.remove('hidden');
            document.getElementById('sl-detail-view').classList.add('hidden');
            slLoadList();
        }
    };
})();
