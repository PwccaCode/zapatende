/*
 * FMARK Call Functions - Extracted for WPPConnect Integration
 * SCRIPT BY FERRAMENTAS MARKETING
 *
 * This file contains only the call-related functions from FMARK
 * for integration with WPPConnect.
 */

(function () {
  'use strict';

  // Prevent double injection
  if (window.FMARK_CALL) {
    console.log('[FMARK-CALL] Already injected, skipping');
    return;
  }
  window.FMARK_CALL = true;

  // ================== UTILITIES ==================

  /**
   * Ensures a WID object from various input types
   */
  function fmarkEnsureWid(value) {
    if (!value) return null;
    if (typeof value === 'object' && value._serialized) return value;
    if (typeof value === 'object' && typeof value.isGroup === 'function')
      return value;
    if (typeof value === 'string') {
      try {
        return window.Store?.WidFactory?.createWid(value);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Normalizes module names for WhatsApp Web
   */
  function fmarkGetModuleIdCandidates(loadName) {
    if (typeof loadName !== 'string') return [];
    const raw = loadName.trim();
    if (!raw) return [];
    const set = new Set();
    const add = (v) => {
      if (v && v.trim()) set.add(v.trim());
    };
    add(raw);
    const withoutUse = raw.startsWith('use') ? raw.slice(3) : raw;
    const base = withoutUse.startsWith('WAWeb')
      ? withoutUse.slice(5)
      : withoutUse;
    add(base);
    add('WAWeb' + base);
    add('use' + base);
    add('useWAWeb' + base);
    return Array.from(set);
  }

  /**
   * Tries to load a module using candidate names
   */
  function fmarkRequireByCandidates(webpackRequire, loadName) {
    const candidates = fmarkGetModuleIdCandidates(loadName);
    for (const candidate of candidates) {
      const mod = webpackRequire(candidate);
      if (mod) return { module: mod, moduleName: candidate };
    }
    return null;
  }

  // ================== STORE BOOTSTRAP FOR CALL MODULES ==================

  function ensureCallStore() {
    if (!window.Store) window.Store = {};
    const version = parseFloat(window.Debug?.VERSION || '2.3');

    if (version >= 2.3 && !window.Store._fmarkCallInitialized) {
      const global = self || window;

      const __debug = () => {
        if (!global.require) return null;
        try {
          return global.require('__debug');
        } catch (e) {
          return null;
        }
      };

      function createWebpackRequire() {
        const dbg = __debug();
        if (!dbg || !dbg.modulesMap) return null;

        const webpackRequire = function (id) {
          try {
            if (global.ErrorGuard && global.ErrorGuard.skipGuardGlobal) {
              global.ErrorGuard.skipGuardGlobal(true);
            }
            return global.importNamespace(id);
          } catch (error) {
            return null;
          }
        };

        Object.defineProperty(webpackRequire, 'm', {
          get() {
            const modulesMap = __debug()?.modulesMap;
            if (!modulesMap) return {};
            const ids = Object.keys(modulesMap).filter(
              (id) =>
                /^(?:use)?WA/.test(id) &&
                id !== 'WAWebEmojiPanelContentEmojiSearchEmpty.react' &&
                id !== 'WAWebMoment-es-do',
            );
            const result = {};
            for (const id of ids) {
              result[id] = modulesMap[id]?.factory;
            }
            return result;
          },
        });
        return webpackRequire;
      }

      const webpackRequire = createWebpackRequire();
      if (!webpackRequire) return;

      const callNeededObjects = [
        {
          id: 'CallCollection',
          load: 'WAWebCallCollection',
          resolve: (m) => m?.default || m?.CallCollectionImpl || m,
        },
        {
          id: 'CallModel',
          load: 'WAWebCallModel',
          resolve: (m) => m?.CallModel || m?.default,
        },
        {
          id: 'VoipWaCallEnums',
          load: 'WAWebVoipWaCallEnums',
          resolve: (m) => (m?.CallState ? m : m?.default),
        },
        {
          id: 'VoipGatingUtils',
          load: 'WAWebVoipGatingUtils',
          resolve: (m) =>
            typeof m?.isCallingEnabled === 'function' ? m : null,
        },
        {
          id: 'VoipBackendLoadable',
          load: 'WAWebVoipBackendLoadable',
          resolve: (m) =>
            typeof m?.requireVoipJsBackend === 'function' ? m : null,
        },
        { id: 'VoipStartCall', load: 'WAWebVoipStartCall', resolve: (m) => m },
        {
          id: 'CallUtils',
          resolve: (m) => (m?.sendCallEnd && m?.parseCall ? m : null),
        },
        { id: 'WidFactory', resolve: (m) => (m?.createWid ? m : null) },
        {
          id: 'FindChat',
          resolve: (m) => (m?.findOrCreateLatestChat ? m : null),
        },
        { id: 'Conn', resolve: (m) => (m?.default?.ref ? m.default : m) },
        { id: 'UserPrefs', load: 'WAWebUserPrefsMeUser', resolve: (m) => m },
      ];

      const moduleIds = Object.keys(webpackRequire.m);
      const Store = window.Store;

      for (const def of callNeededObjects) {
        if (Store[def.id]) continue;
        let value = null;

        if (def.load) {
          const loaded = fmarkRequireByCandidates(webpackRequire, def.load);
          if (loaded?.module) value = def.resolve(loaded.module);
        }

        if (!value) {
          for (const moduleName of moduleIds) {
            const m = webpackRequire(moduleName);
            if (!m) continue;
            const result = def.resolve(m);
            if (result) {
              value = result;
              break;
            }
          }
        }

        if (value) Store[def.id] = value;
      }

      window.Store._fmarkCallInitialized = true;
    }
  }

  // ================== FMARK CALL NAMESPACE ==================

  window.FMARK_CALL = {
    _version: '1.0.0',
    _remoteCapture: null,
    _remoteAudioBase64: '',
    _remoteAudioChunks: [],
    _activeAudioSource: null,
    _gumHooked: false,
    _audioNodes: null,
    _chunkCallback: null,
    _chunkIndex: 0,
  };

  // ================== CALL MODULE HELPERS ==================

  window.FMARK_CALL._ensureCallModules = function () {
    ensureCallStore();
    const g = self || window;
    if (!g.importNamespace) return;
    if (!window.Store) window.Store = {};
    const S = window.Store;

    if (!S.CallCollection) {
      try {
        const mod = g.importNamespace('WAWebCallCollection');
        if (mod) S.CallCollection = mod.default || mod;
      } catch (_) {}
    }
    if (!S.VoipWaCallEnums) {
      try {
        const mod = g.importNamespace('WAWebVoipWaCallEnums');
        if (mod?.CallState) S.VoipWaCallEnums = mod;
      } catch (_) {}
    }
    if (!S.VoipGatingUtils) {
      try {
        const mod = g.importNamespace('WAWebVoipGatingUtils');
        if (mod && typeof mod.isCallingEnabled === 'function')
          S.VoipGatingUtils = mod;
      } catch (_) {}
    }
    if (!S.VoipBackendLoadable) {
      try {
        const mod = g.importNamespace('WAWebVoipBackendLoadable');
        if (mod && typeof mod.requireVoipJsBackend === 'function')
          S.VoipBackendLoadable = mod;
      } catch (_) {}
    }
    if (!S.VoipStartCall) {
      try {
        const mod = g.importNamespace('WAWebVoipStartCall');
        if (mod) S.VoipStartCall = mod;
      } catch (_) {}
    }
  };

  window.FMARK_CALL._loadVoipBackend = async function () {
    try {
      const loadable = window.Store?.VoipBackendLoadable;
      if (loadable && typeof loadable.requireVoipJsBackend === 'function') {
        return await loadable.requireVoipJsBackend();
      }
      const g = self || window;
      if (g.importNamespace) {
        try {
          const mod = g.importNamespace('WAWebVoipBackendLoadable');
          if (mod && typeof mod.requireVoipJsBackend === 'function') {
            return await mod.requireVoipJsBackend();
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn('[FMARK-CALL] _loadVoipBackend failed:', err);
    }
    return null;
  };

  window.FMARK_CALL._getVoipStartCall = function () {
    if (window.Store?.VoipStartCall) return window.Store.VoipStartCall;
    const g = self || window;
    try {
      if (g.importNamespace) {
        const mod = g.importNamespace('WAWebVoipStartCall');
        if (mod) {
          window.Store.VoipStartCall = mod;
          return mod;
        }
      }
    } catch (_) {}
    return null;
  };

  // ================== AUDIO CAPTURE (STREAMING) ==================

  window.FMARK_CALL._blobToBase64 = function (blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  /**
   * Inicia captura do áudio da aba via getDisplayMedia com streaming.
   */
  window.FMARK_CALL.startRemoteAudioCapture = async function (options = {}) {
    if (window.FMARK_CALL._remoteCapture?.active) {
      return { success: false, error: 'capture_already_active' };
    }

    const chunkInterval = options.chunkInterval || 1000;
    const onChunk =
      typeof options.onChunk === 'function' ? options.onChunk : null;
    const onStart =
      typeof options.onStart === 'function' ? options.onStart : null;
    const onUpdate =
      typeof options.onUpdate === 'function' ? options.onUpdate : null;

    let displayStream;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        systemAudio: 'include',
      });
    } catch (err) {
      console.error('[FMARK-CALL] getDisplayMedia failed:', err?.message);
      return {
        success: false,
        error: 'getDisplayMedia_denied: ' + (err?.message || err),
      };
    }

    displayStream.getVideoTracks().forEach((t) => t.stop());
    const audioTracks = displayStream.getAudioTracks();

    if (audioTracks.length === 0) {
      console.error(
        '[FMARK-CALL] No audio tracks - did you check "Share tab audio"?',
      );
      return {
        success: false,
        error: 'no_audio_track - marque "Compartilhar áudio da guia"',
      };
    }

    const audioStream = new MediaStream(audioTracks);
    console.log(
      '[FMARK-CALL] Tab audio captured:',
      audioTracks.length,
      'tracks',
    );

    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
    }

    const recorder = new MediaRecorder(
      audioStream,
      mimeType ? { mimeType } : {},
    );
    const state = {
      active: true,
      recorder,
      recordedBlobs: [],
      stream: audioStream,
      displayStream,
      startTime: Date.now(),
      updateTimer: null,
      totalDuration: 0,
    };

    window.FMARK_CALL._remoteCapture = state;
    window.FMARK_CALL._remoteAudioBase64 = '';
    window.FMARK_CALL._remoteAudioChunks = [];
    window.FMARK_CALL._chunkIndex = 0;

    recorder.ondataavailable = async (event) => {
      if (event.data && event.data.size > 0) {
        state.recordedBlobs.push(event.data);

        // STREAMING: Send chunk immediately
        if (onChunk) {
          try {
            const chunkBase64 = await window.FMARK_CALL._blobToBase64(
              event.data,
            );
            const chunkData = {
              base64: chunkBase64,
              timestamp: Date.now(),
              duration: event.data.size / 1000, // Approximate
              totalDuration: (Date.now() - state.startTime) / 1000,
              mimeType: recorder.mimeType,
              size: event.data.size,
              index: window.FMARK_CALL._chunkIndex++,
            };
            onChunk(chunkData);
          } catch (e) {
            console.warn('[FMARK-CALL] Chunk callback error:', e);
          }
        }

        // Also call exposed Node.js callback if available
        if (window.__onFmarkAudioChunk) {
          try {
            const chunkBase64 = await window.FMARK_CALL._blobToBase64(
              event.data,
            );
            window.__onFmarkAudioChunk({
              base64: chunkBase64,
              timestamp: Date.now(),
              duration: event.data.size / 1000,
              totalDuration: (Date.now() - state.startTime) / 1000,
              mimeType: recorder.mimeType,
              size: event.data.size,
              index: window.FMARK_CALL._chunkIndex - 1,
            });
          } catch (e) {}
        }
      }
    };

    audioTracks[0].onended = () => {
      console.log('[FMARK-CALL] Tab audio track ended');
      if (state.active) {
        window.FMARK_CALL.stopRemoteAudioCapture();
      }
    };

    recorder.start(chunkInterval);
    console.log(
      '[FMARK-CALL] MediaRecorder started, mimeType:',
      recorder.mimeType,
      'chunkInterval:',
      chunkInterval,
    );

    if (onStart) {
      try {
        onStart();
      } catch (_) {}
    }

    // Periodic full updates (optional)
    if (onUpdate) {
      state.updateTimer = setInterval(async () => {
        if (!state.active || !state.recordedBlobs.length) return;
        try {
          const fullBlob = new Blob(state.recordedBlobs, {
            type: recorder.mimeType,
          });
          const fullBase64 = await window.FMARK_CALL._blobToBase64(fullBlob);
          const dur = (Date.now() - state.startTime) / 1000;
          window.FMARK_CALL._remoteAudioBase64 = fullBase64;
          state.totalDuration = dur;
          onUpdate({
            base64: fullBase64,
            duration: dur,
            mimeType: recorder.mimeType,
            size: fullBlob.size,
          });
        } catch (err) {
          console.warn('[FMARK-CALL] Update error:', err?.message);
        }
      }, options.updateInterval || 3000);
    }

    return { success: true };
  };

  /**
   * Para a captura e retorna o áudio completo em base64.
   */
  window.FMARK_CALL.stopRemoteAudioCapture = async function () {
    const state = window.FMARK_CALL._remoteCapture;
    if (!state) {
      return { success: false, error: 'no_active_capture' };
    }

    state.active = false;
    if (state.updateTimer) {
      clearInterval(state.updateTimer);
      state.updateTimer = null;
    }

    let finalBase64 = '';
    let mimeType = '';
    let dur = 0;

    if (state.recorder) {
      mimeType = state.recorder.mimeType;
      if (state.recorder.state !== 'inactive') {
        await new Promise((resolve) => {
          state.recorder.onstop = resolve;
          state.recorder.stop();
        });
      }
      if (state.recordedBlobs.length) {
        const blob = new Blob(state.recordedBlobs, { type: mimeType });
        finalBase64 = await window.FMARK_CALL._blobToBase64(blob);
        dur = (Date.now() - state.startTime) / 1000;
      }
    }

    if (state.stream) {
      state.stream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (_) {}
      });
    }
    if (state.displayStream) {
      state.displayStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (_) {}
      });
    }

    window.FMARK_CALL._remoteAudioBase64 = finalBase64;
    console.log('[FMARK-CALL] Capture stopped. Duration:', dur.toFixed(2), 's');
    window.FMARK_CALL._remoteCapture = null;

    return {
      success: true,
      base64: finalBase64,
      duration: dur,
      mimeType: mimeType || 'audio/webm',
    };
  };

  /**
   * Retorna o áudio remoto capturado até agora.
   */
  window.FMARK_CALL.getRemoteAudio = function () {
    const state = window.FMARK_CALL._remoteCapture;
    return {
      success: true,
      base64: window.FMARK_CALL._remoteAudioBase64 || '',
      duration: state ? state.totalDuration : 0,
      mimeType: state?.recorder?.mimeType || 'audio/webm',
      recording: !!state?.recorder,
      chunks: (window.FMARK_CALL._remoteAudioChunks || []).length,
    };
  };

  // ================== AUDIO INJECTION ==================

  window.FMARK_CALL._prepareAudioSource = async function (
    base64,
    options = {},
  ) {
    const raw = base64.includes(',') ? base64.split(',')[1] : base64;
    const binary = atob(raw);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    let mime = 'audio/ogg';
    if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) mime = 'audio/mpeg';
    else if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46
    )
      mime = 'audio/wav';
    else if (
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3
    )
      mime = 'audio/webm';

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 48000,
    });
    try {
      await audioCtx.resume();
    } catch (_) {}

    let audioBuffer = null;
    try {
      audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
    } catch (err) {
      console.warn('[FMARK-CALL] decodeAudioData failed:', err?.message);
    }

    if (!audioBuffer) {
      // Fallback: use <audio> element
      const blob = new Blob([bytes], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const audioElement = document.createElement('audio');
      audioElement.src = blobUrl;
      audioElement.loop = !!options.loop;
      audioElement.crossOrigin = 'anonymous';
      audioElement.preload = 'auto';

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Audio load timeout')),
          8000,
        );
        audioElement.oncanplaythrough = () => {
          clearTimeout(timeout);
          resolve();
        };
        audioElement.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Audio load error'));
        };
        audioElement.load();
      });

      await audioElement.play();
      const elemSrc = audioCtx.createMediaElementSource(audioElement);
      const offlineDest = audioCtx.createMediaStreamDestination();
      elemSrc.connect(offlineDest);
      elemSrc.connect(audioCtx.destination);

      const destTrack = offlineDest.stream.getAudioTracks()[0];
      window.FMARK_CALL._audioNodes = {
        elemSrc,
        offlineDest,
        audioElement,
        audioCtx,
      };

      return {
        audioCtx,
        audioBuffer: null,
        audioElement,
        blobUrl,
        track: destTrack,
        stream: offlineDest.stream,
        usedMethod: 'mediaElementSource',
        duration: audioElement.duration,
        destroy: () => {
          try {
            audioElement.pause();
          } catch (_) {}
          try {
            audioElement.src = '';
          } catch (_) {}
          try {
            URL.revokeObjectURL(blobUrl);
          } catch (_) {}
          try {
            audioCtx.close();
          } catch (_) {}
          window.FMARK_CALL._audioNodes = null;
        },
      };
    }

    const bufferSource = audioCtx.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.loop = !!options.loop;
    const dest = audioCtx.createMediaStreamDestination();
    bufferSource.connect(dest);
    bufferSource.start();
    const track = dest.stream.getAudioTracks()[0];
    window.FMARK_CALL._audioNodes = { bufferSource, dest, audioCtx };

    return {
      audioCtx,
      audioBuffer,
      audioElement: null,
      blobUrl: null,
      track,
      stream: dest.stream,
      usedMethod: 'decodedAudio',
      duration: audioBuffer.duration,
      destroy: () => {
        try {
          bufferSource.stop();
        } catch (_) {}
        try {
          audioCtx.close();
        } catch (_) {}
        window.FMARK_CALL._audioNodes = null;
      },
    };
  };

  window.FMARK_CALL._hookGetUserMedia = function (
    injectionTrack,
    audioCtx,
    audioBuffer,
  ) {
    if (window.FMARK_CALL._gumHooked) {
      window.FMARK_CALL._restoreGetUserMedia();
    }
    window.FMARK_CALL._gumHooked = true;
    window.FMARK_CALL._gumInjectionTrack = injectionTrack;
    window.FMARK_CALL._gumAudioCtx = audioCtx;
    window.FMARK_CALL._gumAudioBuffer = audioBuffer;
    window.FMARK_CALL._gumClones = [];

    const origInstanceGUM = navigator.mediaDevices.getUserMedia;
    window.FMARK_CALL._origInstanceGUM = origInstanceGUM;

    const interceptGUM = async (constraints, label) => {
      console.log('[FMARK-CALL] getUserMedia INTERCEPTED via ' + label);
      try {
        const realStream = await origInstanceGUM.call(navigator.mediaDevices, {
          audio: true,
        });
        realStream.getAudioTracks().forEach((t) => t.stop());
      } catch (e) {
        console.warn('[FMARK-CALL] Real getUserMedia failed:', e?.message);
      }

      const srcTrack = window.FMARK_CALL._gumInjectionTrack;
      let trackForVoip;
      if (srcTrack.readyState === 'live') {
        trackForVoip = srcTrack.clone();
        window.FMARK_CALL._gumClones.push(trackForVoip);
      } else {
        // Create rescue audio
        const freshCtx =
          window.FMARK_CALL._gumAudioCtx ||
          new (window.AudioContext || window.webkitAudioContext)();
        const freshBuf =
          window.FMARK_CALL._gumAudioBuffer ||
          freshCtx.createBuffer(1, freshCtx.sampleRate, freshCtx.sampleRate);
        const src = freshCtx.createBufferSource();
        src.buffer = freshBuf;
        src.loop = true;
        const dst = freshCtx.createMediaStreamDestination();
        src.connect(dst);
        src.start();
        trackForVoip = dst.stream.getAudioTracks()[0];
      }

      return new MediaStream([trackForVoip]);
    };

    navigator.mediaDevices.getUserMedia = async function (constraints) {
      if (constraints?.audio && window.FMARK_CALL._gumHooked) {
        return interceptGUM(constraints, 'instance');
      }
      return origInstanceGUM.call(navigator.mediaDevices, constraints);
    };

    window.FMARK_CALL._hookAudioConsumers(injectionTrack, audioBuffer);
    console.log('[FMARK-CALL] getUserMedia hook installed');
    return { restore: () => window.FMARK_CALL._restoreGetUserMedia() };
  };

  window.FMARK_CALL._restoreGetUserMedia = function () {
    if (window.FMARK_CALL._origInstanceGUM) {
      navigator.mediaDevices.getUserMedia = window.FMARK_CALL._origInstanceGUM;
      window.FMARK_CALL._origInstanceGUM = null;
    }
    if (window.FMARK_CALL._gumClones) {
      window.FMARK_CALL._gumClones.forEach((t) => {
        try {
          t.stop();
        } catch (_) {}
      });
      window.FMARK_CALL._gumClones = [];
    }
    window.FMARK_CALL._gumHooked = false;
    window.FMARK_CALL._restoreAudioConsumers();
    console.log('[FMARK-CALL] getUserMedia restored');
  };

  window.FMARK_CALL._hookAudioConsumers = function (
    customAudioTrack,
    audioBuffer,
  ) {
    window.FMARK_CALL._restoreAudioConsumers();
    window.FMARK_CALL._audioInjectionTrack = customAudioTrack;
    window.FMARK_CALL._audioInjectionBuffer = audioBuffer;
    window.FMARK_CALL._cmsInjectedNodes = [];

    const origCMS = AudioContext.prototype.createMediaStreamSource;
    window.FMARK_CALL._origCreateMediaStreamSource = origCMS;

    AudioContext.prototype.createMediaStreamSource = function (stream) {
      if (
        window.FMARK_CALL._audioInjectionTrack ||
        window.FMARK_CALL._audioInjectionBuffer
      ) {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          try {
            const buf = window.FMARK_CALL._audioInjectionBuffer;
            if (buf) {
              const src = this.createBufferSource();
              src.buffer = buf;
              src.loop = true;
              const dst = this.createMediaStreamDestination();
              src.connect(dst);
              src.start();
              window.FMARK_CALL._cmsInjectedNodes.push({ src, dst, ctx: this });
              return origCMS.call(this, dst.stream);
            }
          } catch (e) {
            console.error('[FMARK-CALL] CMS injection error:', e);
          }
        }
      }
      return origCMS.call(this, stream);
    };

    console.log('[FMARK-CALL] Audio consumer hooks installed');
  };

  window.FMARK_CALL._restoreAudioConsumers = function () {
    if (window.FMARK_CALL._origCreateMediaStreamSource) {
      AudioContext.prototype.createMediaStreamSource =
        window.FMARK_CALL._origCreateMediaStreamSource;
      window.FMARK_CALL._origCreateMediaStreamSource = null;
    }
    if (window.FMARK_CALL._cmsInjectedNodes) {
      window.FMARK_CALL._cmsInjectedNodes.forEach((n) => {
        try {
          n.src.stop();
        } catch (_) {}
      });
      window.FMARK_CALL._cmsInjectedNodes = [];
    }
    window.FMARK_CALL._audioInjectionTrack = null;
    window.FMARK_CALL._audioInjectionBuffer = null;
  };

  // ================== CALL FUNCTIONS ==================

  /**
   * Inicia uma chamada de voz ou vídeo.
   */
  window.FMARK_CALL.startCall = async function (chatId, options = {}) {
    window.FMARK_CALL._ensureCallModules();
    const isVideo = !!options.isVideo;
    const onStateChange =
      typeof options.onStateChange === 'function'
        ? options.onStateChange
        : null;
    const onAnswer =
      typeof options.onAnswer === 'function' ? options.onAnswer : null;
    const onEnd = typeof options.onEnd === 'function' ? options.onEnd : null;

    const rawId = typeof chatId === 'string' ? chatId : chatId?._serialized;
    if (!rawId) return { success: false, error: 'invalid_chat_id' };

    let peerJid = fmarkEnsureWid(rawId);
    let chat = null;

    try {
      chat = window.Store?.Chat?.get(rawId);
    } catch (_) {}
    if (!chat) {
      try {
        chat = window.Store?.Chat?.get(peerJid);
      } catch (_) {}
    }
    if (!chat && window.Store?.FindChat) {
      try {
        const result = await window.Store.FindChat.findOrCreateLatestChat(
          peerJid,
          'username_contactless_search',
          { forceUsync: true },
        );
        if (result?.chat) chat = result.chat;
      } catch (_) {}
    }

    if (chat?.id) peerJid = chat.id;

    const startCallMod = window.FMARK_CALL._getVoipStartCall();
    let callStarted = false;
    let nativeCallResult = null;

    if (startCallMod) {
      const fnNames = ['startWAWebVoipCall', 'startCall', 'default'];
      let startCallFn = null;
      for (const name of fnNames) {
        if (typeof startCallMod[name] === 'function') {
          startCallFn = startCallMod[name];
          break;
        }
      }
      if (!startCallFn && typeof startCallMod === 'function') {
        startCallFn = startCallMod;
      }
      if (startCallFn) {
        try {
          nativeCallResult = await startCallFn(peerJid, isVideo);
          callStarted = true;
          console.log('[FMARK-CALL] Native call initiated');
        } catch (err) {
          console.warn('[FMARK-CALL] Native startCall failed:', err?.message);
        }
      }
    }

    if (!callStarted) {
      return { success: false, error: 'call_not_started' };
    }

    let callId = nativeCallResult?.id || null;
    if (!callId) {
      const cc = window.Store?.CallCollection;
      if (cc?.activeCall?.id) callId = cc.activeCall.id;
      if (!callId && cc?.lastActiveCall?.id) callId = cc.lastActiveCall.id;
    }

    if (onStateChange || onAnswer || onEnd) {
      window.FMARK_CALL._monitorCallState(chatId, {
        callId,
        onStateChange,
        onAnswer,
        onEnd,
      });
    }

    return { success: true, callId: callId || 'unknown' };
  };

  /**
   * Encerra a chamada ativa.
   */
  window.FMARK_CALL.endCall = async function () {
    window.FMARK_CALL._ensureCallModules();
    try {
      const g = self || window;
      if (g.importNamespace) {
        try {
          const stackMod = g.importNamespace('WAWebVoipStackInterface');
          if (
            stackMod &&
            typeof stackMod.getVoipStackInterface === 'function'
          ) {
            const stack = await stackMod.getVoipStackInterface();
            if (stack && typeof stack.endCall === 'function') {
              await stack.endCall('Normal', true);
              return true;
            }
          }
        } catch (_) {}
      }
      const callCollection = window.Store?.CallCollection;
      if (
        window.Store?.CallUtils &&
        typeof window.Store.CallUtils.sendCallEnd === 'function'
      ) {
        const activeCall = callCollection?.activeCall;
        if (activeCall) {
          await window.Store.CallUtils.sendCallEnd(activeCall);
          return true;
        }
      }
      const activeCall = callCollection?.activeCall;
      if (activeCall && typeof activeCall.end === 'function') {
        await activeCall.end();
        return true;
      }
    } catch (err) {
      console.warn('[FMARK-CALL] endCall error:', err);
    }
    return false;
  };

  /**
   * Monitora estado da chamada.
   */
  window.FMARK_CALL._monitorCallState = function (chatId, opts = {}) {
    const { callId, onStateChange, onAnswer, onEnd } = opts;
    window.FMARK_CALL._ensureCallModules();

    let CallEnums = window.Store?.VoipWaCallEnums;
    let callCollection = window.Store?.CallCollection;

    if (!callCollection || !CallEnums) return;

    const ACTIVE_STATE = CallEnums.CallState?.CallActive ?? 6;
    const ENDING_STATE = CallEnums.CallState?.CallStateEnding ?? 13;
    const NONE_STATE = CallEnums.CallState?.None ?? 0;

    let answered = false;
    let ended = false;
    let lastState = null;

    const getCall = () => {
      const active = callCollection.activeCall;
      if (active) return active;
      if (callId && typeof callCollection.get === 'function') {
        return callCollection.get(callId);
      }
      return null;
    };

    const getState = (call) => {
      if (!call) return null;
      if (typeof call.getState === 'function') return call.getState();
      return call.__x_state ?? call.state ?? null;
    };

    const cleanup = () => {
      ended = true;
      clearInterval(checkInterval);
    };

    const checkInterval = setInterval(() => {
      const call = getCall();
      if (!call) {
        if (lastState !== null && !ended) {
          cleanup();
          if (onEnd) {
            try {
              onEnd(null);
            } catch (_) {}
          }
        }
        return;
      }
      const state = getState(call);
      if (state !== lastState) {
        lastState = state;
        if (onStateChange) {
          try {
            onStateChange(state, call);
          } catch (_) {}
        }
      }
      if (!answered && state === ACTIVE_STATE) {
        answered = true;
        if (onAnswer) {
          try {
            onAnswer(call);
          } catch (_) {}
        }
      }
      if (state === NONE_STATE || state === ENDING_STATE) {
        if (!ended) {
          cleanup();
          if (onEnd) {
            try {
              onEnd(call);
            } catch (_) {}
          }
        }
      }
    }, 400);

    setTimeout(
      () => {
        if (!ended) cleanup();
      },
      5 * 60 * 1000,
    );
  };

  /**
   * Inicia chamada com áudio injetado.
   */
  window.FMARK_CALL.startCallWithAudio = async function (
    chatId,
    base64Audio,
    options = {},
  ) {
    if (!base64Audio || typeof base64Audio !== 'string') {
      return { success: false, error: 'base64_audio_required' };
    }

    let audioSource;
    try {
      audioSource = await window.FMARK_CALL._prepareAudioSource(base64Audio, {
        loop: !!options.loop,
      });
    } catch (err) {
      return {
        success: false,
        error: 'audio_prepare_failed: ' + (err?.message || err),
      };
    }

    window.FMARK_CALL._hookGetUserMedia(
      audioSource.track,
      audioSource.audioCtx,
      audioSource.audioBuffer,
    );
    window.FMARK_CALL._activeAudioSource = audioSource;

    let _destroyed = false;
    let autoStopTimeout = null;

    const stopFn = async () => {
      if (_destroyed) return;
      _destroyed = true;
      if (autoStopTimeout) clearTimeout(autoStopTimeout);
      window.FMARK_CALL._restoreGetUserMedia();
      audioSource.destroy();
      window.FMARK_CALL._activeAudioSource = null;
      if (options.onAudioEnd) {
        try {
          options.onAudioEnd();
        } catch (_) {}
      }
      if (options.endCallOnFinish) {
        try {
          await window.FMARK_CALL.endCall();
        } catch (_) {}
      }
    };

    const callResult = await window.FMARK_CALL.startCall(chatId, {
      isVideo: !!options.isVideo,
      onAnswer: async (call) => {
        if (_destroyed) return;
        console.log('[FMARK-CALL] Call answered!');
        if (options.onAudioStart) {
          try {
            options.onAudioStart();
          } catch (_) {}
        }
        if (!options.loop && !autoStopTimeout) {
          const durationMs = Math.ceil(audioSource.duration * 1000) + 1000;
          autoStopTimeout = setTimeout(async () => {
            if (!_destroyed) {
              console.log('[FMARK-CALL] Audio finished playing');
              await stopFn();
            }
          }, durationMs);
        }
        if (options.onAnswer) {
          try {
            options.onAnswer(call, {
              success: true,
              duration: audioSource.duration,
            });
          } catch (_) {}
        }
      },
      onEnd: (call) => {
        if (!_destroyed) {
          _destroyed = true;
          if (autoStopTimeout) clearTimeout(autoStopTimeout);
          window.FMARK_CALL._restoreGetUserMedia();
          audioSource.destroy();
          window.FMARK_CALL._activeAudioSource = null;
        }
        if (options.onEnd) {
          try {
            options.onEnd(call);
          } catch (_) {}
        }
      },
    });

    if (!callResult.success) {
      window.FMARK_CALL._restoreGetUserMedia();
      audioSource.destroy();
      window.FMARK_CALL._activeAudioSource = null;
      return callResult;
    }

    return {
      ...callResult,
      duration: audioSource.duration,
      usedMethod: audioSource.usedMethod,
      stop: stopFn,
    };
  };

  /**
   * Injeta novo áudio durante chamada ativa.
   */
  window.FMARK_CALL.injectAudioInCall = async function (
    base64Audio,
    options = {},
  ) {
    if (!base64Audio || typeof base64Audio !== 'string') {
      return { success: false, error: 'base64_audio_required' };
    }
    if (!window.FMARK_CALL._gumHooked) {
      return { success: false, error: 'no_active_call' };
    }
    if (window.FMARK_CALL._activeAudioSource) {
      window.FMARK_CALL._activeAudioSource.destroy();
    }

    let audioSource;
    try {
      audioSource = await window.FMARK_CALL._prepareAudioSource(base64Audio, {
        loop: !!options.loop,
      });
    } catch (err) {
      return {
        success: false,
        error: 'audio_prepare_failed: ' + (err?.message || err),
      };
    }

    window.FMARK_CALL._gumInjectionTrack = audioSource.track;
    window.FMARK_CALL._gumAudioBuffer = audioSource.audioBuffer;
    window.FMARK_CALL._audioInjectionTrack = audioSource.track;
    window.FMARK_CALL._audioInjectionBuffer = audioSource.audioBuffer;
    window.FMARK_CALL._activeAudioSource = audioSource;

    console.log(
      '[FMARK-CALL] New audio injected, duration:',
      audioSource.duration.toFixed(2),
      's',
    );
    return {
      success: true,
      duration: audioSource.duration,
      usedMethod: audioSource.usedMethod,
    };
  };

  // ================== CALL AND CAPTURE (MAIN FUNCTION) ==================

  /**
   * Liga, envia áudio, e captura resposta com streaming.
   */
  window.FMARK_CALL.callAndCapture = async function (
    chatId,
    base64Audio,
    options = {},
  ) {
    if (!chatId) return { success: false, error: 'chatId_required' };
    if (!base64Audio || typeof base64Audio !== 'string') {
      return { success: false, error: 'base64_audio_required' };
    }

    const maxDuration = options.maxDuration || 0;
    const chunkInterval = options.chunkInterval || 1000;
    const endOnAudioFinish = !!options.endCallOnAudioFinish;

    let _captureStarted = false;
    let _callEnded = false;
    let _maxDurationTimer = null;

    const getCaptureFn = () => ({
      base64: window.FMARK_CALL._remoteAudioBase64 || '',
      duration: window.FMARK_CALL._remoteCapture?.totalDuration || 0,
      mimeType:
        window.FMARK_CALL._remoteCapture?.recorder?.mimeType || 'audio/webm',
      recording: !!window.FMARK_CALL._remoteCapture?.active,
      chunks: (window.FMARK_CALL._remoteAudioChunks || []).length,
    });

    const stopAndCollect = async () => {
      if (_maxDurationTimer) {
        clearTimeout(_maxDurationTimer);
        _maxDurationTimer = null;
      }
      let capturedAudio = { base64: '', duration: 0, mimeType: 'audio/webm' };

      if (_captureStarted && window.FMARK_CALL._remoteCapture?.active) {
        const stopResult = await window.FMARK_CALL.stopRemoteAudioCapture();
        if (stopResult.success) {
          capturedAudio = {
            base64: stopResult.base64,
            duration: stopResult.duration,
            mimeType: stopResult.mimeType,
          };
        }
      }

      if (!_callEnded) {
        try {
          await window.FMARK_CALL.endCall();
        } catch (_) {}
      }
      return { capturedAudio };
    };

    const finishCall = async (reason) => {
      if (_callEnded) return;
      _callEnded = true;
      console.log('[FMARK-CALL] callAndCapture ending. Reason:', reason);
      const result = await stopAndCollect();
      if (options.onEnd) {
        try {
          options.onEnd({ reason, ...result });
        } catch (_) {}
      }
    };

    // Start capture BEFORE call (with streaming)
    const startCapture = async () => {
      if (_captureStarted) return;
      if (window.FMARK_CALL._remoteCapture?.active) {
        _captureStarted = true;
        return;
      }
      try {
        const captureResult = await window.FMARK_CALL.startRemoteAudioCapture({
          chunkInterval,
          updateInterval: options.updateInterval || 3000,
          onChunk: options.onAudioChunk,
          onUpdate: options.onCaptureUpdate,
        });
        if (captureResult.success) {
          _captureStarted = true;
          console.log('[FMARK-CALL] Streaming capture started');
        } else {
          console.warn('[FMARK-CALL] Capture failed:', captureResult.error);
        }
      } catch (err) {
        console.warn('[FMARK-CALL] Capture error:', err?.message);
      }
    };

    await startCapture();

    const callResult = await window.FMARK_CALL.startCallWithAudio(
      chatId,
      base64Audio,
      {
        isVideo: !!options.isVideo,
        loop: false,
        endCallOnFinish: false,
        onAudioStart: () => {
          console.log('[FMARK-CALL] Audio injection started');
          if (options.onAudioSent) {
            try {
              options.onAudioSent();
            } catch (_) {}
          }
        },
        onAudioEnd: () => {
          console.log('[FMARK-CALL] Sent audio finished');
          if (endOnAudioFinish && !_callEnded) {
            setTimeout(() => finishCall('audio_finished'), 500);
          }
        },
        onAnswer: (call, info) => {
          console.log(
            '[FMARK-CALL] Call answered, capture active:',
            _captureStarted,
          );
          if (maxDuration > 0) {
            _maxDurationTimer = setTimeout(() => {
              if (options.endCallOnMaxDuration !== false) {
                finishCall('max_duration');
              }
            }, maxDuration);
          }
          if (options.onAnswer) {
            try {
              options.onAnswer(call, info);
            } catch (_) {}
          }
        },
        onEnd: (call) => {
          if (!_callEnded) {
            _callEnded = true;
            const capturedAudio = getCaptureFn();
            if (options.onEnd) {
              try {
                options.onEnd({ reason: 'call_ended', capturedAudio });
              } catch (_) {}
            }
          }
        },
      },
    );

    if (!callResult.success) {
      if (_captureStarted) await window.FMARK_CALL.stopRemoteAudioCapture();
      return callResult;
    }

    return {
      ...callResult,
      getCapture: getCaptureFn,
      sendAudio: async (newBase64Audio) => {
        if (_callEnded) return { success: false, error: 'call_already_ended' };
        return await window.FMARK_CALL.injectAudioInCall(newBase64Audio);
      },
      stop: async () => {
        if (callResult.stop) callResult.stop();
        return await stopAndCollect();
      },
    };
  };

  console.log('[FMARK-CALL] Module loaded successfully');
})();
