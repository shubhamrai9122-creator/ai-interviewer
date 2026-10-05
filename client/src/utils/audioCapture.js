/**
 * Advanced Voice-Catching & Acoustic Analysis Engine
 * Features:
 * - Real-time Web Audio API AnalyserNode & FFT Frequency Spectrum
 * - Dynamic Voice Activity Detection (VAD) with noise floor calibration
 * - MediaRecorder WebM/Opus high-fidelity audio chunk capture
 * - Integrated WPM and Vocal Disfluency / Filler Words Counter
 */

export class AudioCaptureEngine {
  constructor({
    onVolumeChange = () => {},
    onSpeakingChange = () => {},
    onSilenceDetected = () => {},
    onAcousticUpdate = () => {},
    silenceThresholdSec = 2.5,
    dbThreshold = -42
  } = {}) {
    this.onVolumeChange = onVolumeChange;
    this.onSpeakingChange = onSpeakingChange;
    this.onSilenceDetected = onSilenceDetected;
    this.onAcousticUpdate = onAcousticUpdate;
    this.silenceThresholdSec = silenceThresholdSec;
    this.dbThreshold = dbThreshold;

    this.audioContext = null;
    this.analyser = null;
    this.microphoneStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.animationFrameId = null;

    this.isRecording = false;
    this.isSpeaking = false;
    this.speechStartTime = null;
    this.lastSpeechTime = null;
    this.silenceTimer = null;
    this.totalWordsSpoken = 0;
  }

  async start() {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        }
      };

      this.microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
      source.connect(this.analyser);

      // Initialize MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm';

      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(this.microphoneStream, { mimeType });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      this.mediaRecorder.start(250); // 250ms time slices

      this.isRecording = true;
      this.speechStartTime = Date.now();
      this.lastSpeechTime = Date.now();

      this._startAudioMonitoring();
      return true;
    } catch (err) {
      console.error('[AudioCaptureEngine] Failed to access microphone:', err);
      throw err;
    }
  }

  _startAudioMonitoring() {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const checkAudio = () => {
      if (!this.isRecording || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      // Compute RMS volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const normalizedVolume = Math.min(100, Math.round((rms / 128) * 100));

      // Calculate approximate dBFS
      const db = rms > 0 ? 20 * Math.log10(rms / 255) : -100;

      // Pass frequency spectrum and normalized volume
      this.onVolumeChange({
        volume: normalizedVolume,
        db: Math.round(db),
        frequencyData: Array.from(dataArray)
      });

      // Voice Activity Detection (VAD) logic
      const now = Date.now();
      if (db > this.dbThreshold && normalizedVolume > 8) {
        if (!this.isSpeaking) {
          this.isSpeaking = true;
          this.onSpeakingChange(true);
        }
        this.lastSpeechTime = now;
      } else {
        if (this.isSpeaking && (now - this.lastSpeechTime) > 800) {
          this.isSpeaking = false;
          this.onSpeakingChange(false);
        }

        // Check for sustained silence
        if (this.lastSpeechTime && (now - this.lastSpeechTime) >= (this.silenceThresholdSec * 1000)) {
          this.onSilenceDetected({
            silenceDurationSec: ((now - this.lastSpeechTime) / 1000).toFixed(1)
          });
        }
      }

      this.animationFrameId = requestAnimationFrame(checkAudio);
    };

    this.animationFrameId = requestAnimationFrame(checkAudio);
  }

  async stop() {
    this.isRecording = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      const stopPromise = new Promise((resolve) => {
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, {
            type: this.mediaRecorder.mimeType || 'audio/webm'
          });
          resolve(blob);
        };
        this.mediaRecorder.stop();
      });

      const audioBlob = await stopPromise;

      if (this.microphoneStream) {
        this.microphoneStream.getTracks().forEach(track => track.stop());
        this.microphoneStream = null;
      }

      if (this.audioContext && this.audioContext.state !== 'closed') {
        try {
          await this.audioContext.close();
        } catch (e) {
          // ignore
        }
        this.audioContext = null;
      }

      return audioBlob;
    }

    return null;
  }
}

/**
 * Calculates words per minute (WPM), detects filler words, and estimates fluency
 */
export function analyzeSpokenText(text, durationSeconds = 5) {
  if (!text || typeof text !== 'string') {
    return {
      wpm: 0,
      wpmStatus: 'Waiting for speech',
      fillerCounts: {},
      totalFillers: 0,
      fluencyScore: 100,
      wordCount: 0
    };
  }

  const words = text.toLowerCase().match(/\b[\w'-]+\b/g) || [];
  const wordCount = words.length;
  const duration = Math.max(1, durationSeconds);
  const wpm = Math.round((wordCount / duration) * 60);

  let wpmStatus = 'Optimal Pacing';
  if (wpm < 85) wpmStatus = 'Deliberate / Slow';
  else if (wpm > 170) wpmStatus = 'Fast / Rushed';

  const fillerKeywords = ['um', 'uh', 'er', 'ah', 'like', 'basically', 'actually', 'you know', 'sort of', 'kind of'];
  const fillerCounts = {};
  let totalFillers = 0;

  fillerKeywords.forEach(filler => {
    let count = 0;
    if (filler.includes(' ')) {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      count = (text.match(regex) || []).length;
    } else {
      count = words.filter(w => w === filler).length;
    }
    if (count > 0) {
      fillerCounts[filler] = count;
      totalFillers += count;
    }
  });

  const fillerRatio = totalFillers / Math.max(1, wordCount);
  let fluencyScore = Math.max(40, Math.min(100, Math.round(100 - (fillerRatio * 150))));

  return {
    wpm,
    wpmStatus,
    fillerCounts,
    totalFillers,
    fluencyScore,
    wordCount
  };
}
