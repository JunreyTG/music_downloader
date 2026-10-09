import { Platform } from 'react-native';

export interface PlaybackUpdate {
  isLoaded: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMillis: number;
  durationMillis: number;
  didJustFinish: boolean;
  error?: string;
}

type StatusCallback = (update: PlaybackUpdate) => void;

class AudioEngine {
  private expoAudioModule: any = null;
  private currentExpoAudioPlayer: any = null;
  private currentExpoAudioSub: any = null;

  private nativeAvModule: any = null;
  private currentNativeAvSound: any = null;

  private currentWebAudio: any = null;
  private mockInterval: any = null;
  private isSimulated: boolean = false;
  private currentPosition: number = 0;
  private currentDuration: number = 1000;
  private currentIsPlaying: boolean = false;
  private statusCallback: StatusCallback | null = null;

  constructor() {
    this.initAudioModules();
  }

  private initAudioModules() {
    if (Platform.OS === 'web') {
      return;
    }

    // 1. Try modern expo-audio first (Standard for Expo SDK 53+, 54+, 57+ in Expo Go)
    try {
      const expoAudio = require('expo-audio');
      if (expoAudio && (expoAudio.createAudioPlayer || expoAudio.AudioPlayer)) {
        this.expoAudioModule = expoAudio;
        if (typeof expoAudio.setAudioModeAsync === 'function') {
          expoAudio
            .setAudioModeAsync({
              playsInSilentMode: true,
              shouldPlayInBackground: true,
              interruptionMode: 'duckOthers',
            })
            .catch((err: any) => {
              console.warn('[AudioEngine] expo-audio setAudioModeAsync warning:', err);
            });
        }
        console.log('[AudioEngine] Initialized native expo-audio engine successfully');
      }
    } catch (e) {
      console.warn('[AudioEngine] expo-audio module not available:', e);
      this.expoAudioModule = null;
    }

    // 2. Try legacy expo-av as fallback (Expo SDK <= 52 or custom dev builds)
    if (!this.expoAudioModule) {
      try {
        const expoAv = require('expo-av');
        if (expoAv && expoAv.Audio) {
          this.nativeAvModule = expoAv.Audio;
          this.nativeAvModule
            .setAudioModeAsync({
              allowsRecordingIOS: false,
              staysActiveInBackground: true,
              playsInSilentModeIOS: true,
              shouldDuckAndroid: true,
              playThroughEarpieceAndroid: false,
            })
            .catch(() => {});
          console.log('[AudioEngine] Initialized legacy expo-av engine successfully');
        }
      } catch (e) {
        this.nativeAvModule = null;
      }
    }
  }

  public async ensureBackgroundAudioMode(): Promise<void> {
    if (Platform.OS === 'web') return;

    // 1. Configure expo-audio background playback
    if (this.expoAudioModule && typeof this.expoAudioModule.setAudioModeAsync === 'function') {
      try {
        await this.expoAudioModule.setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'doNotMix',
        });
      } catch (err) {
        console.warn('[AudioEngine] expo-audio setAudioModeAsync error:', err);
      }
    }

    // 2. Configure legacy expo-av background playback
    if (this.nativeAvModule && typeof this.nativeAvModule.setAudioModeAsync === 'function') {
      try {
        await this.nativeAvModule.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });
      } catch (err) {
        console.warn('[AudioEngine] expo-av setAudioModeAsync error:', err);
      }
    }

    // 3. Keep CPU awake while music is playing to prevent Android sleep termination
    try {
      const keepAwake = require('expo-keep-awake');
      if (keepAwake?.activateKeepAwakeAsync) {
        await keepAwake.activateKeepAwakeAsync('MSEEK_AUDIO_PLAYBACK');
      }
    } catch {}
  }

  public isNativeSupported(): boolean {
    return Boolean(this.expoAudioModule || this.nativeAvModule);
  }

  public async loadAndPlay(
    uri: string,
    onStatusUpdate: StatusCallback,
    expectedDurationMillis?: number
  ): Promise<void> {
    // Unload existing audio and clear callbacks
    await this.unload();

    // Ensure background audio session is locked and active
    await this.ensureBackgroundAudioMode();

    this.statusCallback = onStatusUpdate;
    this.currentPosition = 0;
    if (expectedDurationMillis && expectedDurationMillis > 1000) {
      this.currentDuration = expectedDurationMillis;
    }

    // 1. Try Web Audio first if running in browser
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
      try {
        const audio = new (window as any).Audio(uri);
        this.currentWebAudio = audio;
        this.currentIsPlaying = true;

        audio.addEventListener('timeupdate', () => {
          if (!this.statusCallback) return;
          this.currentPosition = (audio.currentTime || 0) * 1000;
          this.currentDuration = (audio.duration || 1) * 1000;
          this.statusCallback({
            isLoaded: true,
            isPlaying: !audio.paused,
            isBuffering: false,
            positionMillis: this.currentPosition,
            durationMillis: this.currentDuration,
            didJustFinish: false,
          });
        });

        audio.addEventListener('ended', () => {
          this.currentIsPlaying = false;
          this.statusCallback?.({
            isLoaded: true,
            isPlaying: false,
            isBuffering: false,
            positionMillis: this.currentDuration,
            durationMillis: this.currentDuration,
            didJustFinish: true,
          });
        });

        audio.addEventListener('waiting', () => {
          this.statusCallback?.({
            isLoaded: true,
            isPlaying: false,
            isBuffering: true,
            positionMillis: this.currentPosition,
            durationMillis: this.currentDuration,
            didJustFinish: false,
          });
        });

        audio.addEventListener('error', () => {
          this.statusCallback?.({
            isLoaded: false,
            isPlaying: false,
            isBuffering: false,
            positionMillis: 0,
            durationMillis: 1,
            didJustFinish: false,
            error: 'Audio playback failed',
          });
        });

        await audio.play();
        return;
      } catch (err) {
        console.warn('[AudioEngine] Web audio playback error:', err);
      }
    }

    // 2. Try modern Native Audio (expo-audio - standard in Expo SDK 57)
    if (this.expoAudioModule) {
      try {
        const player = this.expoAudioModule.createAudioPlayer(
          uri,
          { updateInterval: 250, keepAudioSessionActive: true }
        );

        this.currentExpoAudioSub = player.addListener(
          'playbackStatusUpdate',
          (status: any) => {
            if (!this.statusCallback) return;

            if (status.playbackState === 'error') {
              this.statusCallback({
                isLoaded: false,
                isPlaying: false,
                isBuffering: false,
                positionMillis: 0,
                durationMillis: 1,
                didJustFinish: false,
                error: 'Audio playback failed',
              });
              return;
            }

            const isLoaded = Boolean(status.isLoaded);
            const isPlaying = Boolean(status.playing);
            const isBuffering = Boolean(status.isBuffering);
            const didJustFinish = Boolean(status.didJustFinish);

            // expo-audio provides currentTime & duration in seconds (float)
            const posSec = typeof status.currentTime === 'number' ? status.currentTime : 0;
            const durSec = typeof status.duration === 'number' && status.duration > 0 ? status.duration : 0;

            const positionMillis = Math.max(0, Math.round(posSec * 1000));
            let durationMillis = Math.max(1, Math.round(durSec * 1000));
            if (durationMillis <= 1 && this.currentDuration > 1000) {
              durationMillis = this.currentDuration;
            }

            this.currentPosition = positionMillis;
            if (durationMillis > 1) {
              this.currentDuration = durationMillis;
            }
            this.currentIsPlaying = isPlaying;

            this.statusCallback({
              isLoaded,
              isPlaying,
              isBuffering,
              positionMillis: this.currentPosition,
              durationMillis: this.currentDuration,
              didJustFinish,
            });
          }
        );

        player.play();
        this.currentExpoAudioPlayer = player;
        this.currentIsPlaying = true;
        console.log(`[AudioEngine] Playing audio via expo-audio from: ${uri}`);
        return;
      } catch (err) {
        console.warn('[AudioEngine] expo-audio player creation error:', err);
      }
    }

    // 3. Try legacy Native Audio (expo-av) if available
    if (this.nativeAvModule) {
      try {
        const { sound } = await this.nativeAvModule.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status: any) => {
            if (!this.statusCallback) return;
            if (!status.isLoaded) {
              if (status.error) {
                this.statusCallback({
                  isLoaded: false,
                  isPlaying: false,
                  isBuffering: false,
                  positionMillis: 0,
                  durationMillis: 1,
                  didJustFinish: false,
                  error: status.error,
                });
              }
              return;
            }
            this.statusCallback({
              isLoaded: true,
              isPlaying: status.isPlaying,
              isBuffering: status.isBuffering,
              positionMillis: status.positionMillis || 0,
              durationMillis: status.durationMillis || 1,
              didJustFinish: !!status.didJustFinish,
            });
          }
        );
        this.currentNativeAvSound = sound;
        this.currentIsPlaying = true;
        console.log(`[AudioEngine] Playing audio via expo-av from: ${uri}`);
        return;
      } catch (err) {
        console.warn('[AudioEngine] expo-av sound creation error:', err);
      }
    }

    // 4. Graceful Simulation Fallback (only if no native or web audio module exists)
    console.warn('[AudioEngine] No native audio module available, using simulated playback timer.');
    this.isSimulated = true;
    this.currentIsPlaying = true;
    this.currentPosition = 0;
    this.currentDuration = expectedDurationMillis && expectedDurationMillis > 1000 ? expectedDurationMillis : 240000;

    this.mockInterval = setInterval(() => {
      if (!this.currentIsPlaying) return;
      this.currentPosition += 1000;
      const finished = this.currentPosition >= this.currentDuration;
      if (finished) {
        this.currentPosition = this.currentDuration;
        this.currentIsPlaying = false;
      }
      this.statusCallback?.({
        isLoaded: true,
        isPlaying: this.currentIsPlaying,
        isBuffering: false,
        positionMillis: this.currentPosition,
        durationMillis: this.currentDuration,
        didJustFinish: finished,
      });
      if (finished && this.mockInterval) {
        clearInterval(this.mockInterval);
        this.mockInterval = null;
      }
    }, 1000);
  }

  public async play(): Promise<void> {
    this.currentIsPlaying = true;
    if (this.currentExpoAudioPlayer) {
      try {
        this.currentExpoAudioPlayer.play();
      } catch (err) {
        console.warn('[AudioEngine] expo-audio play error:', err);
      }
    } else if (this.currentWebAudio) {
      await this.currentWebAudio.play();
    } else if (this.currentNativeAvSound) {
      await this.currentNativeAvSound.playAsync();
    }
  }

  public async pause(): Promise<void> {
    this.currentIsPlaying = false;
    if (this.currentExpoAudioPlayer) {
      try {
        this.currentExpoAudioPlayer.pause();
      } catch (err) {
        console.warn('[AudioEngine] expo-audio pause error:', err);
      }
    } else if (this.currentWebAudio) {
      this.currentWebAudio.pause();
    } else if (this.currentNativeAvSound) {
      await this.currentNativeAvSound.pauseAsync();
    }
  }

  public async seekTo(millis: number): Promise<void> {
    this.currentPosition = millis;
    if (this.currentExpoAudioPlayer) {
      try {
        await this.currentExpoAudioPlayer.seekTo(millis / 1000);
      } catch (err) {
        console.warn('[AudioEngine] expo-audio seek error:', err);
      }
    } else if (this.currentWebAudio) {
      this.currentWebAudio.currentTime = millis / 1000;
    } else if (this.currentNativeAvSound) {
      await this.currentNativeAvSound.setPositionAsync(millis);
    }
  }

  public async unload(): Promise<void> {
    // Clear status callback immediately to prevent race conditions during track change
    this.statusCallback = null;

    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
    if (this.currentExpoAudioSub) {
      try {
        this.currentExpoAudioSub.remove();
      } catch {}
      this.currentExpoAudioSub = null;
    }
    if (this.currentExpoAudioPlayer) {
      try {
        this.currentExpoAudioPlayer.pause();
      } catch {}
      try {
        if (typeof this.currentExpoAudioPlayer.release === 'function') {
          this.currentExpoAudioPlayer.release();
        } else if (typeof this.currentExpoAudioPlayer.remove === 'function') {
          this.currentExpoAudioPlayer.remove();
        }
      } catch {}
      this.currentExpoAudioPlayer = null;
    }
    if (this.currentWebAudio) {
      try {
        this.currentWebAudio.pause();
        this.currentWebAudio.src = '';
      } catch {}
      this.currentWebAudio = null;
    }
    if (this.currentNativeAvSound) {
      try {
        await this.currentNativeAvSound.unloadAsync();
      } catch {}
      this.currentNativeAvSound = null;
    }
    this.isSimulated = false;
    this.currentIsPlaying = false;
  }
}

export const audioEngine = new AudioEngine();
