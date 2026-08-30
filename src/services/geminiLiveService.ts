/**
 * Real-Time Gemini Multimodal Live Audio Agent Service
 * Handles WebSockets, 16kHz PCM mono microphone streaming,
 * 24kHz PCM speaker playback queue, natural barge-in / interruption,
 * and autonomous function calling tools execution.
 */

export interface LiveSessionCallbacks {
  onStateChange?: (state: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'LISTENING' | 'SPEAKING' | 'ERROR') => void;
  onVolumeChange?: (volumes: { userVolume: number; agentVolume: number }) => void;
  onCaption?: (caption: { role: 'user' | 'agent'; text: string; isFinal?: boolean }) => void;
  onToolExecuted?: (tool: { toolName: string; ticketId?: string; result: any }) => void;
  onError?: (error: string) => void;
  onGrievanceTriggered?: (data: { category: string; landmark: string; description: string; ticketId?: string }) => void;
}

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private callbacks: LiveSessionCallbacks = {};

  private isConnected = false;
  private isMuted = false;
  private isAgentSpeaking = false;

  // Speaker playback queue state
  private scheduledAudioSources: AudioBufferSourceNode[] = [];
  private nextStartTime = 0;
  private currentUserRMS = 0;

  // Interrupt threshold for natural barge-in
  private bargeInThreshold = 0.08;

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Start live voice session via WebSocket connection to backend relay or Gemini Live endpoint
   */
  public async startSession(customApiKey?: string): Promise<void> {
    if (this.isConnected) return;

    this.callbacks.onStateChange?.('CONNECTING');

    try {
      // Setup Web Audio Contexts
      // Input context for microphone capture
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtxClass();
      
      // Output context for 24kHz PCM playback
      this.outputAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
      if (this.outputAudioCtx.state === 'suspended') {
        await this.outputAudioCtx.resume();
      }

      // Determine WebSocket URL (server relay /ws/live)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live`;

      console.log("[Gemini Live] Connecting to WebSocket endpoint:", wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        console.log("[Gemini Live] WebSocket connected successfully.");
        this.isConnected = true;
        this.callbacks.onStateChange?.('CONNECTED');

        // Start microphone capture
        await this.startMicrophoneCapture();
        this.callbacks.onStateChange?.('LISTENING');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'audio' && data.audio) {
            this.handleIncomingAudioChunk(data.audio);
          } else if (data.type === 'caption') {
            this.callbacks.onCaption?.({
              role: data.role || 'agent',
              text: data.text,
              isFinal: data.isFinal ?? true
            });
          } else if (data.type === 'interrupted') {
            console.log("[Gemini Live] Interruption signal received from agent.");
            this.stopAgentPlayback();
          } else if (data.type === 'toolExecuted') {
            console.log("[Gemini Live] Tool executed:", data.toolName, data.result);
            this.callbacks.onToolExecuted?.({
              toolName: data.toolName,
              ticketId: data.ticketId || data.result?.ticketId,
              result: data.result
            });

            if (data.toolName === 'submitVoiceGrievance' && data.result) {
              this.callbacks.onGrievanceTriggered?.({
                category: data.result.category || 'ROADS_POTHOLE',
                landmark: data.result.landmark || 'Ward 4',
                description: data.result.description || '',
                ticketId: data.result.ticketId
              });
            }
          } else if (data.type === 'error') {
            console.warn("[Gemini Live] Server error message:", data.message);
            this.callbacks.onError?.(data.message || "Live session error");
          }
        } catch (err) {
          console.warn("[Gemini Live] Error parsing WS message:", err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn("[Gemini Live] WebSocket error:", err);
        this.callbacks.onStateChange?.('ERROR');
        this.callbacks.onError?.("WebSocket connection error");
      };

      this.ws.onclose = () => {
        console.log("[Gemini Live] WebSocket closed.");
        this.stopSession();
      };

    } catch (err: any) {
      console.error("[Gemini Live] Failed to initialize session:", err);
      this.callbacks.onStateChange?.('ERROR');
      this.callbacks.onError?.(err?.message || "Failed to access microphone or WebSocket");
      this.stopSession();
    }
  }

  /**
   * Start microphone audio capture and stream 16kHz PCM mono chunks
   */
  private async startMicrophoneCapture(): Promise<void> {
    if (!this.inputAudioCtx) return;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
    this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioCtx.destination);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isConnected || this.isMuted) return;

      const inputBuffer = e.inputBuffer.getChannelData(0);

      // Compute RMS volume
      let sum = 0;
      for (let i = 0; i < inputBuffer.length; i++) {
        sum += inputBuffer[i] * inputBuffer[i];
      }
      this.currentUserRMS = Math.sqrt(sum / inputBuffer.length);

      // Report volume for live animated orb
      this.callbacks.onVolumeChange?.({
        userVolume: this.currentUserRMS,
        agentVolume: this.isAgentSpeaking ? 0.6 : 0
      });

      // Check for natural barge-in / user interruption
      if (this.currentUserRMS > this.bargeInThreshold && this.isAgentSpeaking) {
        console.log("[Gemini Live] User speech detected above threshold — Barging in!");
        this.stopAgentPlayback();
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "user_interrupted" }));
        }
      }

      // Resample to 16kHz if needed
      const pcm16k = this.resampleTo16k(inputBuffer, this.inputAudioCtx!.sampleRate);
      const int16Array = this.floatTo16BitPCM(pcm16k);
      const base64Pcm = this.arrayBufferToBase64(int16Array.buffer);

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "audio", audio: base64Pcm }));
      }
    };
  }

  /**
   * Handle incoming 24kHz PCM audio chunk from Gemini model and schedule playback
   */
  private handleIncomingAudioChunk(base64Audio: string): void {
    if (!this.outputAudioCtx) return;

    try {
      const floatData = this.base64ToFloat32(base64Audio);
      if (floatData.length === 0) return;

      // Compute agent RMS volume for orb
      let sum = 0;
      for (let i = 0; i < floatData.length; i++) {
        sum += floatData[i] * floatData[i];
      }
      const agentRMS = Math.sqrt(sum / floatData.length);

      this.callbacks.onVolumeChange?.({
        userVolume: this.currentUserRMS,
        agentVolume: agentRMS
      });

      const audioBuffer = this.outputAudioCtx.createBuffer(1, floatData.length, 24000);
      audioBuffer.getChannelData(0).set(floatData);

      const currentTime = this.outputAudioCtx.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime + 0.04; // 40ms buffer cushion
      }

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioCtx.destination);
      source.start(this.nextStartTime);

      this.scheduledAudioSources.push(source);
      this.nextStartTime += audioBuffer.duration;
      this.isAgentSpeaking = true;
      this.callbacks.onStateChange?.('SPEAKING');

      source.onended = () => {
        const idx = this.scheduledAudioSources.indexOf(source);
        if (idx !== -1) {
          this.scheduledAudioSources.splice(idx, 1);
        }
        if (this.scheduledAudioSources.length === 0) {
          this.isAgentSpeaking = false;
          this.callbacks.onStateChange?.('LISTENING');
        }
      };
    } catch (err) {
      console.warn("[Gemini Live] Error playing incoming audio chunk:", err);
    }
  }

  /**
   * Stop all scheduled agent audio playback immediately (interruption / barge-in)
   */
  public stopAgentPlayback(): void {
    for (const src of this.scheduledAudioSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    this.scheduledAudioSources = [];
    this.nextStartTime = 0;
    this.isAgentSpeaking = false;
    this.callbacks.onStateChange?.('LISTENING');
  }

  /**
   * Toggle microphone mute status
   */
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuteState(): boolean {
    return this.isMuted;
  }

  /**
   * Tear down and clean up media streams, Web Audio, and WebSockets
   */
  public stopSession(): void {
    this.stopAgentPlayback();

    if (this.scriptProcessor) {
      try { this.scriptProcessor.disconnect(); } catch {}
      this.scriptProcessor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioCtx) {
      try { this.inputAudioCtx.close(); } catch {}
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx) {
      try { this.outputAudioCtx.close(); } catch {}
      this.outputAudioCtx = null;
    }

    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.isConnected = false;
    this.callbacks.onStateChange?.('DISCONNECTED');
  }

  // --- Audio Conversion Helpers ---

  private resampleTo16k(inputData: Float32Array, inputSampleRate: number): Float32Array {
    if (inputSampleRate === 16000) return inputData;
    const ratio = inputSampleRate / 16000;
    const newLength = Math.round(inputData.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const origIndex = Math.floor(i * ratio);
      result[i] = inputData[origIndex];
    }
    return result;
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToFloat32(base64: string): Float32Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    return float32Array;
  }
}
