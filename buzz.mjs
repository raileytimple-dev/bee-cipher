// Play the supplied bee recording locally during ciphertext generation.
export function createBeeBuzz(host = globalThis) {
  let context, bufferPromise, active, enabled = true, playback = 0;
  try { enabled = host.localStorage.getItem('bee-sound') !== 'off'; } catch {}
  const supported = !!(host.AudioContext || host.webkitAudioContext);
  function stop() {
    playback++;
    if (active) { try { active.stop(); } catch {} active = null; }
  }
  function prepare() {
    if (!enabled || !supported) return;
    try {
      context ??= new (host.AudioContext || host.webkitAudioContext)();
      if (context.state === 'suspended') context.resume().catch(() => {});
      if (!bufferPromise) {
        bufferPromise = host.fetch(new URL('./assets/bee-buzz-1s.mp3', import.meta.url))
          .then(response => {
            if (!response.ok) throw new Error('Bee recording unavailable');
            return response.arrayBuffer();
          })
          .then(data => context.decodeAudioData(data))
          .catch(() => { bufferPromise = null; return null; });
      }
    } catch { /* Audio must never interrupt encryption. */ }
  }
  async function play() {
    if (!enabled || !context || !bufferPromise) return;
    stop();
    const request = playback;
    try {
      const buffer = await bufferPromise;
      if (!buffer || !enabled || request !== playback || context.state !== 'running') return;
      const source = context.createBufferSource(), volume = context.createGain();
      source.buffer = buffer;
      volume.gain.value = 0.65;
      source.connect(volume).connect(context.destination);
      source.onended = () => {
        source.disconnect(); volume.disconnect();
        if (active === source) active = null;
      };
      active = source;
      source.start(0, 0, Math.min(1, buffer.duration));
    } catch { stop(); }
  }
  return {
    get enabled() { return enabled; }, supported, prepare, play, stop,
    toggle() {
      enabled = !enabled;
      if (!enabled) stop();
      try { host.localStorage.setItem('bee-sound', enabled ? 'on' : 'off'); } catch {}
      return enabled;
    }
  };
}
