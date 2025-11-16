// Add type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start(): void;
  stop(): void;
}

interface SpeechResult {
  transcript: string;
  confidence: number;
}

interface SpeechOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
}

class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private onResult: ((result: SpeechResult) => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private onEnd: (() => void) | null = null;

  constructor() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new (window as any).SpeechRecognition();
    }

    if (this.recognition) {
      this.setupRecognition();
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      if (result.isFinal) {
        const transcript = result[0].transcript.trim();
        const confidence = result[0].confidence;
        
        if (this.onResult) {
          this.onResult({ transcript, confidence });
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (this.onError) {
        this.onError(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEnd) {
        this.onEnd();
      }
    };
  }

  /**
   * Start listening with optional language override (BCP-47 like 'hi-IN', 'kn-IN').
   */
  startListening(options: {
    onResult: (result: SpeechResult) => void;
    onError?: (error: string) => void;
    onEnd?: () => void;
    language?: string;
  }) {
    if (!this.recognition) {
      if (options.onError) {
        options.onError('Speech recognition not supported');
      }
      return false;
    }

    if (this.isListening) {
      return false;
    }

    this.onResult = options.onResult;
    this.onError = options.onError || null;
    this.onEnd = options.onEnd || null;

    try {
      // Apply language override if provided
      if (options.language && this.recognition.lang !== options.language) {
        this.recognition.lang = options.language;
      }
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      if (options.onError) {
        options.onError('Failed to start speech recognition');
      }
      return false;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Set the recognition language explicitly (e.g., 'ml-IN').
   */
  setLanguage(lang: string) {
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }
}

export const speechService = new SpeechRecognitionService();