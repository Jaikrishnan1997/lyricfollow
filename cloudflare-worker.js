// Lyric Follow - Whisper relay on YOUR OWN free Cloudflare account (Workers AI).
// Browsers cannot call Cloudflare's AI API directly, so this tiny Worker receives a clip from the app and asks
// Workers AI (whisper-large-v3-turbo) to write it out. Free plan: 10,000 "neurons" a day = about 214 audio minutes,
// reset at 00:00 UTC. Setup steps: README, "More free Whisper: Cloudflare Worker".
//
// Bindings needed on the Worker: Workers AI binding named  AI  and a secret named  KEY  (any password you choose;
// the same password goes into Lyric Follow > Settings > Worker password, so nobody else can use your allocation).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-key',
  'Access-Control-Max-Age': '86400'
};
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (req.method !== 'POST') return new Response('Lyric Follow Whisper relay is running.', { headers: CORS });
    if (env.KEY && req.headers.get('x-key') !== env.KEY) return json({ error: 'wrong password' }, 401);
    let form;
    try { form = await req.formData(); } catch (e) { return json({ error: 'expected a form with the audio clip' }, 400); }
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') return json({ error: 'no audio file' }, 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length > 2 * 1024 * 1024) return json({ error: 'clip too long' }, 413);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    const input = { audio: btoa(bin), task: 'transcribe', condition_on_previous_text: false };
    const lang = form.get('language'); if (lang) input.language = String(lang).slice(0, 5);
    const prompt = form.get('prompt'); if (prompt) input.initial_prompt = String(prompt).slice(0, 400);
    try {
      const r = await env.AI.run('@cf/openai/whisper-large-v3-turbo', input);
      return json({ text: (r && r.text) || '' });
    } catch (e) {
      const msg = String((e && e.message) || e);
      // The daily free allocation used up: the app moves on to the next service until 00:00 UTC.
      const limit = /neuron|allocation|quota|limit|exceeded|429|4006/i.test(msg);
      return json({ error: { message: (limit ? 'daily allocation reached: ' : '') + msg } }, limit ? 429 : 500);
    }
  }
};
