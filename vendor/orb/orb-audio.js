// Adapted from OrbAudioInput, copyright (c) 2026 LerSent001, MIT.
// Upstream, changes and original source: NOTICE.txt; full license: LICENSE.txt.
import {SpectralFluxDetector} from '../sound-to-light/spectral-flux.js?v=02f845f3303f';
import {timbreFeatures} from '../meyda/timbre.js?v=02f845f3303f';
export const silentBands = () => ({ low: 0, mid: 0, high: 0, all: 0, peak: 0, onset: 0, brightness:0, texture:0 });

/** Independent local input; microphone is never connected to the speakers. */
export class OrbAudioInput {
  gain = 0.7;
  threshold = 0.004;
  attack = 0.3;
  release = 1.2;
  lowCut = 200;
  highCut = 2000;
  level = 0;
  rms = 0;
  context = null;
  analyser = null;
  source = null;
  stream = null;
  player = null;
  url = null;
  generation = 0;
  spectrum = new Uint8Array(0);
  waveform = new Float32Array(0);
  smoothed = silentBands();
  gateOpen = false;
  autoLevel = true;
  curve = .7;
  onsetSensitivity = 1.5;
  onsetHold = .18;
  references = {all:.08,low:.04,mid:.04,high:.04,peak:.1};
  flux = new SpectralFluxDetector();
  magnitudes = new Float32Array(0);

  stop({ release = false } = {}) {
    this.generation++;
    this.stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    this.source?.disconnect();
    if (this.player) {
      this.player.pause();
      this.player.removeAttribute('src');
      this.player.load();
      this.player.remove();
    }
    if (this.url) URL.revokeObjectURL(this.url);
    void this.context?.close().catch(() => {});
    this.context = this.analyser = this.source = this.stream = this.player = this.url = null;
    if (!release) { this.smoothed = silentBands(); this.level = 0; }
    this.gateOpen = false;
    this.rms = 0;
    this.flux.reset();
    this.references = {all:.08,low:.04,mid:.04,high:.04,peak:.1};
  }

  async setup() {
    this.stop();
    const generation = this.generation;
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Questo browser non supporta Web Audio.');
    const context = new AudioContextClass({latencyHint:'interactive'});
    this.context = context;
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0;
    this.spectrum = new Float32Array(this.analyser.frequencyBinCount);
    this.magnitudes = new Float32Array(this.analyser.frequencyBinCount);
    this.waveform = new Float32Array(this.analyser.fftSize);
    await context.resume();
    return generation;
  }

  async microphone(onEnded, deviceId = '') {
    const generation = await this.setup();
    if (generation !== this.generation) return false;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microfono non disponibile. Apri Prisma in HTTPS o sul PC locale.');
    const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false,...(deviceId?{deviceId:{exact:deviceId}}:{})}});
    if (generation !== this.generation) {
      stream.getTracks().forEach(track => track.stop());
      return false;
    }
    this.stream = stream;
    this.source = this.context.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
    const track = stream.getAudioTracks()[0];
    if (!track) throw new Error('Nessun ingresso audio disponibile.');
    track.onended = () => {
      if (this.stream === stream) { this.stop({release: true}); onEnded?.(); }
    };
    return true;
  }

  async file(file, host) {
    const generation = await this.setup();
    if (generation !== this.generation) return false;
    // Fresh element: a MediaElementSource cannot be rebound to a new context.
    const player = document.createElement('audio');
    player.controls = true;
    player.setAttribute('aria-label', file.name);
    host.replaceChildren(player);
    this.player = player;
    this.url = URL.createObjectURL(file);
    player.src = this.url;
    this.source = this.context.createMediaElementSource(player);
    this.source.connect(this.analyser);
    this.source.connect(this.context.destination);
    await player.play();
    return generation === this.generation;
  }

  attachPlayer(host) {
    if (host && this.player && this.player.parentElement !== host) host.replaceChildren(this.player);
  }

  read(dt) {
    dt = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.1)) : 0;
    const target = silentBands(), analyser = this.analyser;
    this.rms = 0;
    if (analyser && this.context?.state === 'running' && (this.stream?.active || (this.player && !this.player.paused && !this.player.ended))) {
      analyser.getFloatFrequencyData(this.spectrum);
      analyser.getFloatTimeDomainData(this.waveform);
      const rms = Math.sqrt(this.waveform.reduce((sum, value) => sum + value * value, 0) / this.waveform.length);
      this.rms = rms;
      this.gateOpen = rms > this.threshold * (this.gateOpen ? 0.75 : 1);
      const binHz=this.context.sampleRate/analyser.fftSize;
      for(let i=0;i<this.spectrum.length;i++)this.magnitudes[i]=Number.isFinite(this.spectrum[i])?10**(this.spectrum[i]/20):0;
      const energy = (from, to) => {
        const start=Math.max(1,Math.ceil(from/binHz)),end=Math.min(this.magnitudes.length-1,Math.ceil(to/binHz)-1);
        let power=0;for(let i=start;i<=end;i++)power+=this.magnitudes[i]**2;
        return Math.sqrt(power)*1.63;
      };
      const raw={all:Math.max(0,rms-this.threshold),low:energy(30,this.lowCut),mid:energy(this.lowCut,this.highCut),high:energy(this.highCut,16000),peak:this.waveform.reduce((a,v)=>Math.max(a,Math.abs(v)),0)};
      for(const key of Object.keys(raw)){
        this.references[key]=Math.max(key==='peak'?.06:.035,raw[key],this.references[key]*Math.exp(-dt/4));
        const reference=this.autoLevel?this.references[key]:(key==='peak'?.3:.18);
        target[key]=this.gateOpen?Math.pow(Math.min(1,raw[key]/reference*this.gain/.7),this.curve):0;
      }
      target.onset=this.flux.update(this.magnitudes,binHz,dt,{audible:this.gateOpen,sensitivity:this.onsetSensitivity,hold:this.onsetHold});
      if(this.gateOpen){const timbre=timbreFeatures(this.magnitudes,binHz);target.brightness=timbre.brightness;target.texture=timbre.texture;}
    } else this.gateOpen = false;
    for (const band of Object.keys(target)) {
      const tau = target[band] > this.smoothed[band] ? (band==='onset'?0:this.attack) : this.release;
      this.smoothed[band] += (target[band] - this.smoothed[band]) * (tau<=0?1:1-Math.exp(-dt/tau));
      if (this.smoothed[band] < 0.0001) this.smoothed[band] = 0;
    }
    this.level = this.smoothed.all;
    return {...this.smoothed};
  }
}
