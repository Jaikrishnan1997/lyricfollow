/* Lyric Follow — local storage on this computer (IndexedDB, with a memory fallback). */
(function () {
  'use strict';
  const NAME = 'lyricfollow', VER = 1;
  let dbp = null, mem = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res) => {
      let req;
      try { req = indexedDB.open(NAME, VER); } catch (e) { mem = { songs: new Map(), media: new Map(), kv: new Map() }; return res(null); }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('songs')) db.createObjectStore('songs', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => { mem = { songs: new Map(), media: new Map(), kv: new Map() }; res(null); };
    });
    return dbp;
  }

  function tx(store, mode, fn) {
    return open().then(db => new Promise((res, rej) => {
      if (!db) { try { res(fn(null, mem[store])); } catch (e) { rej(e); } return; }
      const t = db.transaction(store, mode), s = t.objectStore(store);
      let out; const r = fn(s);
      if (r && 'onsuccess' in r) r.onsuccess = () => { out = r.result; };
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    }));
  }

  window.LFStore = {
    all: store => tx(store, 'readonly', (s, m) => s ? s.getAll() : [...m.values()]).then(r => r || []),
    put: (store, obj) => tx(store, 'readwrite', (s, m) => s ? s.put(obj) : m.set(obj.id, obj)),
    del: (store, id) => tx(store, 'readwrite', (s, m) => s ? s.delete(id) : m.delete(id)),
    clear: store => tx(store, 'readwrite', (s, m) => s ? s.clear() : m.clear()),
    get: k => tx('kv', 'readonly', (s, m) => s ? s.get(k) : m.get(k)),
    set: (k, v) => tx('kv', 'readwrite', (s, m) => s ? s.put(v, k) : m.set(k, v))
  };
})();
