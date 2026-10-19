/* Lyric Follow — Bible search index in a background thread, so the screen never stutters. */
importScripts('core.js', 'bible.js');
const B = self.LFBible;
self.onmessage = async e => {
  const { id, op, vid, q, limit } = e.data;
  try {
    if (op === 'index') {
      await B.ensureIndex(vid, p => self.postMessage({ id, progress: p }));
      self.postMessage({ id, result: true });
    } else if (op === 'search') {
      await B.ensureIndex(vid);
      self.postMessage({ id, result: B.search(vid, q, limit) });
    } else if (op === 'quote') {
      await B.ensureIndex(vid);
      self.postMessage({ id, result: B.quote(vid, q, limit) });
    }
  } catch (err) { self.postMessage({ id, error: String(err && err.message || err) }); }
};
