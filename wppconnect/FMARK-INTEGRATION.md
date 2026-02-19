# FMARK Call Integration for WPPConnect

This document describes how to handle WPPConnect updates and use the FMARK voice/video call functionality with audio streaming.

---

## Table of Contents

1. [Git Update Strategy](#git-update-strategy)
2. [Quick Start](#quick-start)
3. [Usage Guide](#usage-guide)
4. [API Reference](#api-reference)
5. [Troubleshooting](#troubleshooting)

---

## Git Update Strategy

### Overview

The FMARK integration is designed to be **git-merge friendly**. When WPPConnect releases updates:

- **Minimal core changes**: Only 2 files modified with small additions
- **Isolated new code**: All FMARK functionality in separate files
- **Optional dependency**: FMARK script injection won't break if missing

### Files Modified in WPPConnect Core

| File                         | Change                                  | Lines Modified |
| ---------------------------- | --------------------------------------- | -------------- |
| `src/controllers/browser.ts` | FMARK injection at end of `injectApi()` | +12            |
| `src/api/whatsapp.ts`        | Change inheritance to `FmarkLayer`      | 2 lines        |
| `tsconfig.json`              | Add FMARK types                         | 1 line         |

### Files Created (New)

```
src/lib/fmark/fmark-call.js    # Extracted call functions
src/types/FMARK.d.ts               # TypeScript declarations
src/api/layers/fmark.layer.ts    # API layer with streaming
```

### Update Workflow

```bash
# 1. Commit your FMARK integration first
git add .
git commit -m "Add FMARK call integration with audio streaming"

# 2. Fetch latest WPPConnect updates
git remote add upstream https://github.com/wppconnect-team/wppconnect.git
git fetch upstream

# 3. Merge upstream changes
git merge upstream/main

# 4. Resolve conflicts if any
# - For browser.ts: Usually automatic, both add FMARK injection at same location
# - For whatsapp.ts: Keep FmarkLayer inheritance, discard BusinessLayer
# - For tsconfig.json: Merge types array, keep FMARK entry

# 5. Test and commit
npm run build
npm test
git add .
git commit -m "Merge upstream main"
```

### Conflict Resolution

#### `src/controllers/browser.ts`

**Expected conflict**: Near end of `injectApi()` function

**Resolution**: Keep both script injections

```typescript
// Before your FMARK addition (existing):
await page.addScriptTag({
  path: require.resolve('@wppconnect/wa-js'),
});

await page.evaluate(() => {
  WPP.chat.defaultSendMessageOptions.createChat = true;
  WPP.conn.setKeepAlive(true);
});
await page.addScriptTag({
  path: require.resolve(path.join(__dirname, '../../dist/lib/wapi', 'wapi.js')),
});

await onLoadingScreen(page, onLoadingScreenCallBack);
await page.waitForFunction(() => { ... });

// Your FMARK addition (new):
// Inject FMARK Call module for voice/video call functionality
await page.addScriptTag({
  path: require.resolve(
    path.join(__dirname, '../../dist/lib/fmark', 'fmark-call.js')
  ),
}).catch(() => {
  // FMARK call script is optional, don't fail if not found
});
```

#### `src/api/whatsapp.ts`

**Expected conflict**: Import and class declaration

**Resolution**: Keep FmarkLayer, discard BusinessLayer

```typescript
// Discard this:
// import { BusinessLayer } from './layers/business.layer';
// export class Whatsapp extends BusinessLayer {

// Keep this:
import { FmarkLayer } from './layers/fmark.layer';
export class Whatsapp extends FmarkLayer {
```

#### `tsconfig.json`

**Expected conflict**: Types array

**Resolution**: Merge arrays

```json
// Resolve to:
"types": [
  "./src/types/WAPI",
  "./src/types/FMARK",
  "@types/mocha"
]
```

---

## Quick Start

### Installation

The FMARK integration is included in the WPPConnect build. No additional installation needed after pulling changes.

```bash
# Clone or pull the repository
git clone <your-fork>
cd wppconnect

# Build the project
npm install
npm run build
```

### First Run - Chrome Permission

**Important**: The first time you use `callAndCapture()`, Chrome will display a dialog:

> "Chrome is trying to share audio from this tab. Select the current tab and click 'Share'"

**Action Required**:

1. Click on the current WhatsApp Web tab in the dialog
2. ✅ Check "Share tab audio" (Share audio desta guia)
3. Click "Share" (Compartilhar)

After this first permission grant, all subsequent calls will reuse the permission automatically.

---

## Usage Guide

### Basic Call with Capture

```typescript
import wppconnect from '@wppconnect-team/wppconnect';

const client = await wppconnect.create({ session: 'my-session' });

// Make a call and capture audio response
const call = await client.callAndCapture('5511999999999@c.us', audioBase64, {
  maxDuration: 60000, // Max 60 seconds (0 = unlimited)

  onEnd: (result) => {
    console.log('Call ended. Duration:', result.capturedAudio.duration);
    console.log('Captured audio (base64):', result.capturedAudio.base64);
  },
});
```

### Real-Time Audio Streaming

The `onAudioChunk` callback provides audio data **as it's captured**, enabling:

- Live transcription (STT)
- Real-time file writing
- Streaming to WebSocket clients
- Progressive processing

```typescript
const call = await client.callAndCapture('5511999999999@c.us', audioBase64, {
  chunkInterval: 1000, // Receive chunks every 1 second (default)

  // Real-time streaming callback
  onAudioChunk: (chunk) => {
    console.log(`Chunk ${chunk.index}:`);
    console.log(`  Duration: ${chunk.duration.toFixed(2)}s`);
    console.log(`  Size: ${chunk.size} bytes`);
    console.log(`  Total: ${chunk.totalDuration.toFixed(2)}s`);
    console.log(`  Type: ${chunk.mimeType}`);

    // Audio data in base64 (without data URI prefix)
    const audioData = chunk.base64;

    // Example: Send to STT API for live transcription
    // const text = await whisperAPI.transcribe(audioData);
    // console.log('Transcribed:', text);

    // Example: Stream to WebSocket clients
    // ws.send(JSON.stringify({ type: 'audio', data: audioData }));

    // Example: Append to file incrementally
    // fs.appendFileSync('recording.webm', Buffer.from(audioData, 'base64'));
  },

  onEnd: (result) => {
    console.log('Call ended. Total duration:', result.capturedAudio.duration);
  },
});
```

### Send Additional Audio During Call

```typescript
// Send initial audio
const call = await client.callAndCapture(
  '5511999999999@c.us',
  primeiroAudioBase64
);

// ... during call ...

// Send more audio messages
await call.sendAudio(segundoAudioBase64);
await call.sendAudio(terceiroAudioBase64);
await call.sendAudio(quartoAudioBase64);

// Each call.sendAudio() injects the new audio immediately
// Previous audio is replaced
```

### Get Current Capture State

```typescript
const call = await client.callAndCapture('5511999999999@c.us', audioBase64);

// ... during call ...

// Get current capture state at any time
const capture = await call.getCapture();

console.log('Current duration:', capture.duration);
console.log('Currently recording:', capture.recording);
console.log('Total chunks captured:', capture.chunks);
```

### Stop Call Manually

```typescript
const call = await client.callAndCapture('5511999999999@c.us', audioBase64, {
  maxDuration: 300000, // 5 minutes max

  onEnd: (result) => {
    console.log('Final duration:', result.capturedAudio.duration);
  },
});

// ... during call ...

// Manually stop before maxDuration
const final = await call.stop();

// Get the final captured audio
console.log('Final audio:', final.capturedAudio.base64);
console.log('Duration:', final.capturedAudio.duration);
console.log('MIME type:', final.capturedAudio.mimeType);
```

---

## API Reference

### `client.callAndCapture(chatId, base64Audio, options)`

Initiates a voice/video call, injects audio, and captures the response with real-time streaming.

#### Parameters

| Parameter     | Type                    | Required | Default                                                            | Description |
| ------------- | ----------------------- | -------- | ------------------------------------------------------------------ | ----------- |
| `chatId`      | `string`                | ✅ Yes   | Target contact ID (e.g., `'5511999999999@c.us'`)                   |
| `base64Audio` | `string`                | ✅ Yes   | Audio to play when call is answered (any format: OGG/MP3/WAV/WebM) |
| `options`     | `CallAndCaptureOptions` | ❌ No    | Configuration options                                              |

#### Options - `CallAndCaptureOptions`

| Option                 | Type                                             | Default | Description                                                           |
| ---------------------- | ------------------------------------------------ | ------- | --------------------------------------------------------------------- |
| `isVideo`              | `boolean`                                        | `false` | Make a video call instead of voice call                               |
| `maxDuration`          | `number`                                         | `0`     | Maximum call duration in milliseconds (0 = unlimited)                 |
| `chunkInterval`        | `number`                                         | `1000`  | Interval between audio chunks in milliseconds (lower = more frequent) |
| `updateInterval`       | `number`                                         | `3000`  | Interval for full audio state updates in milliseconds                 |
| `endCallOnAudioFinish` | `boolean`                                        | `false` | Auto-hangup when the sent audio finishes playing                      |
| `endCallOnMaxDuration` | `boolean`                                        | `true`  | Auto-hangup when `maxDuration` is reached                             |
| `onAudioChunk`         | `(chunk: AudioChunk) => void`                    | `null`  | Callback for each audio chunk (real-time streaming)                   |
| `onCaptureUpdate`      | `(data: CaptureData) => void`                    | `null`  | Callback for periodic full audio state updates                        |
| `onAnswer`             | `(call: any, info: {success, duration}) => void` | `null`  | Callback when the other person answers                                |
| `onAudioSent`          | `() => void`                                     | `null`  | Callback when the sent audio finishes playing                         |
| `onEnd`                | `(result: CallEndResult) => void`                | `null`  | Callback when call ends for any reason                                |

#### Returns

`Promise<CallHandle>` - An object with methods to control the call.

### `CallHandle` Interface

```typescript
interface CallHandle {
  callId: string; // Unique call identifier
  success: boolean; // Whether the call started successfully
  error?: string; // Error message if call failed
  duration?: number; // Duration of sent audio (seconds)
  usedMethod?: string; // Method used for audio injection

  // Methods
  getCapture(): Promise<CaptureData>;
  sendAudio(
    base64Audio: string
  ): Promise<{ success: boolean; duration?: number; error?: string }>;
  stop(): Promise<{
    capturedAudio: { base64: string; duration: number; mimeType: string };
  }>;
}
```

#### `handle.getCapture()`

Returns the current captured audio state without stopping the call.

```typescript
const capture = await call.getCapture();

// Returns:
interface CaptureData {
  base64: string; // Full audio captured so far (base64)
  duration: number; // Total duration in seconds
  mimeType: string; // MIME type (e.g., 'audio/webm')
  recording?: boolean; // Whether currently recording
}
```

#### `handle.sendAudio(base64Audio)`

Injects new audio into the active call. Replaces any previously injected audio.

```typescript
const result = await call.sendAudio(newAudioBase64);

// Returns:
{
  success: boolean;       // Whether injection succeeded
  duration?: number;       // Audio duration in seconds
  error?: string;          // Error message if failed
}
```

#### `handle.stop()`

Stops the call and returns the final captured audio.

```typescript
const final = await call.stop();

// Returns:
{
  capturedAudio: {
    base64: string; // Final audio in base64
    duration: number; // Total duration in seconds
    mimeType: string; // MIME type
  }
}
```

### Other Call Methods

#### `client.startCall(chatId, options)`

Start a voice or video call without audio injection.

```typescript
const result = await client.startCall('5511999999999@c.us', {
  isVideo: true,
  onAnswer: (call) => console.log('Answered!'),
  onEnd: (call) => console.log('Ended'),
});
```

#### `client.endCall()`

End the currently active call.

```typescript
await client.endCall();
```

#### `client.injectAudioInCall(base64Audio, options)`

Inject audio into an already active call.

```typescript
await client.injectAudioInCall(audioBase64, { loop: true });
```

---

## Audio Chunk Interface

### `AudioChunk`

```typescript
interface AudioChunk {
  base64: string; // Base64 encoded audio (no data URI prefix)
  timestamp: number; // Unix timestamp when captured
  duration: number; // Duration of this chunk (seconds)
  totalDuration: number; // Total call duration so far (seconds)
  mimeType: string; // MIME type (e.g., 'audio/webm;codecs=opus')
  size: number; // Size in bytes
  index: number; // Chunk sequence (0, 1, 2, ...)
}
```

---

## Troubleshooting

### Chrome Permission Dialog Never Appears

**Issue**: The "share tab audio" dialog doesn't appear.

**Cause**: Audio sharing was previously granted but the tab was closed/refreshed.

**Solution**:

1. Refresh the WhatsApp Web page
2. Try the call again
3. If still no dialog, clear browser data/userDataDir and start fresh

### `getDisplayMedia_denied` Error

**Issue**: Call fails with "getDisplayMedia_denied" error.

**Cause**: Browser permission denied or wrong Chrome arguments.

**Solution**:

- Ensure Chrome is launched with correct flags:
  ```bash
  chromium --use-fake-ui-for-media-stream
  ```
- Check browser permissions settings

### `no_audio_track` Error

**Issue**: Error "no_audio_track" when trying to capture.

**Cause**: "Share tab audio" checkbox was not checked in the Chrome dialog.

**Solution**:

1. Make sure to ✅ check "Share tab audio" (Compartilhar áudio da guia)
2. Click Share again

### Call Starts But No Audio Is Captured

**Issue**: Call connects but `onAudioChunk` is never called.

**Cause**: `chunkInterval` is too high or capture failed to start.

**Solution**:

- Try reducing `chunkInterval` to 500 or 1000ms
- Check browser console for "MediaRecorder started" message
- Verify `window.FMARK_CALL` is defined in browser console

### Audio Quality Issues

**Issue**: Captured audio has poor quality.

**Cause**: `getDisplayMedia` captures system audio, which may include other sounds.

**Solution**:

- Close other tabs/applications during call
- Use headphones to prevent echo
- Adjust `chunkInterval` - smaller intervals = smoother audio

### Build Errors After Git Merge

**Issue**: `npm run build` fails after merging upstream changes.

**Solution**:

```bash
# Clean and rebuild
rm -rf dist/
npm install
npm run build

# If wapi build fails, ensure webpack is installed
npm install --save-dev webpack webpack-cli
```

### FMARK Script Not Injected

**Issue**: `callAndCapture` returns error or FMARK not available.

**Solution**:

1. Check browser console for "FMARK-CALL Module loaded successfully"
2. Verify file exists: `dist/lib/fmark/fmark-call.js`
3. Check `src/controllers/browser.ts` injection code is present
4. Rebuild: `npm run build`

---

## Examples

### Example 1: Simple Voice Call

```typescript
const client = await wppconnect.create({ session: 'demo' });
await client.onStateChange((state) => {
  if (state === 'CONNECTED') {
    startVoiceCall();
  }
});

async function startVoiceCall() {
  const audioBase64 = 'data:audio/webm;base64,GkXfo9Ag...'; // Your audio
  const call = await client.callAndCapture('5511999999999@c.us', audioBase64, {
    maxDuration: 60000,
    onAnswer: () => console.log('Call answered'),
    onEnd: (result) => {
      console.log('Call ended:', result.reason);
      console.log('Duration:', result.capturedAudio.duration);
    },
  });
}
```

### Example 2: Live Transcription with Whisper

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: 'sk-...' });

const call = await client.callAndCapture('5511999999999@c.us', audioBase64, {
  chunkInterval: 2000,

  onAudioChunk: async (chunk) => {
    try {
      // Send chunk to Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: Buffer.from(chunk.base64, 'base64'),
        model: 'whisper-1',
      });

      console.log('Transcribed:', transcription.text);
    } catch (e) {
      console.error('Transcription error:', e.message);
    }
  },
});
```

### Example 3: Stream Audio to WebSocket

```typescript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected to audio stream');

  ws.on('message', async (msg) => {
    const { chatId, audio } = JSON.parse(msg);

    const call = await client.callAndCapture(chatId, audio, {
      chunkInterval: 1000,

      onAudioChunk: (chunk) => {
        // Stream each audio chunk to the WebSocket client
        ws.send(
          JSON.stringify({
            type: 'audio_chunk',
            index: chunk.index,
            duration: chunk.duration,
            totalDuration: chunk.totalDuration,
            data: chunk.base64,
          })
        );
      },

      onEnd: (result) => {
        ws.send(
          JSON.stringify({
            type: 'call_ended',
            reason: result.reason,
            finalDuration: result.capturedAudio.duration,
          })
        );
        ws.close();
      },
    });
  });
});
```

### Example 4: Save Audio Incrementally to File

```typescript
import * as fs from 'fs';

const call = await client.callAndCapture('5511999999999@c.us', audioBase64, {
  chunkInterval: 5000,

  onAudioChunk: (chunk) => {
    // Create WebM header for first chunk
    if (chunk.index === 0) {
      const header = Buffer.from([
        0x1a,
        0x45,
        0xdf,
        0xa3, // WebM Magic
        0x93,
        0x42,
        0x82,
        0x88, // EBML version
        0x67,
        0x81,
        0x42,
        0x74, // Audio track entry
        0x86,
        0x81,
        0x83,
        0x81, // Track UID
      ]);
      fs.writeFileSync('recording.webm', header);
    }

    // Append audio data
    const audioData = Buffer.from(chunk.base64, 'base64');
    fs.appendFileSync('recording.webm', audioData);
  },

  onEnd: () => {
    console.log('Recording saved to recording.webm');
  },
});
```

---

## Architecture Details

### How FMARK Call Works

1. **Start Capture First** - Uses `getDisplayMedia()` to capture tab audio
2. **Make Call** - Initiates WhatsApp voice/video call
3. **Inject Audio** - Hooks `getUserMedia()` to play your audio
4. **Stream Chunks** - `MediaRecorder` captures audio in real-time
5. **Stop & Collect** - When call ends, collect final audio as base64

### Browser-Side Injection

The `fmark-call.js` script is injected after `wapi.js` in `src/controllers/browser.ts`:

```javascript
// 1. Load WAPI and WPP libraries
// 2. Load WA-JS modules for calls
// 3. Hook getUserMedia() for audio injection
// 4. Hook MediaRecorder events for streaming
// 5. Expose functions via window.FMARK_CALL
```

### Node.js Bridge

The `FmarkLayer` class in `src/api/layers/fmark.layer.ts` uses `page.exposeFunction()` to bridge callbacks:

```typescript
// Browser exposes: window.__fmarkChunk_xyz
// Node.js receives: via callback in callAndCapture()
```

---

## Support

- **WPPConnect Issues**: https://github.com/wppconnect-team/wppconnect/issues
- **Original FMARK**: See `FMARK/fmark.js` for full feature set

---

**Version**: 1.0.0  
**Last Updated**: 2026-02-17
