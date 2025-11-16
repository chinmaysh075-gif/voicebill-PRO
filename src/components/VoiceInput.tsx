import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { speechService } from '@/services/speechService';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface VoiceInputProps {
  onVoiceCommand: (transcript: string) => void;
  isProcessing?: boolean;
}

export function VoiceInput({ onVoiceCommand, isProcessing = false }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState('');
  const onVoiceCommandRef = useRef(onVoiceCommand);
  const { i18n } = useTranslation();

  // Map app language to Web Speech API BCP-47 codes
  const LANG_MAP: Record<string, string> = {
    en: 'en-US',
    kn: 'kn-IN', // Kannada
    hi: 'hi-IN', // Hindi
    ml: 'ml-IN', // Malayalam
    ta: 'ta-IN', // Tamil
  };

  useEffect(() => {
    onVoiceCommandRef.current = onVoiceCommand;
  }, [onVoiceCommand]);

  useEffect(() => {
    setIsSupported(speechService.isSupported());
  }, []);

  const startListening = () => {
    if (!isSupported) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const base = (i18n.language || 'en').split('-')[0];
    const recognitionLang = LANG_MAP[base] ?? 'en-US';

    const success = speechService.startListening({
      onResult: (result) => {
        setTranscript(result.transcript);
        // Use latest handler to avoid stale cart/state closures
        onVoiceCommandRef.current(result.transcript);
        setError('');
      },
      onError: (errorMsg) => {
        setError(errorMsg);
        setIsListening(false);
      },
      onEnd: () => {
        setIsListening(false);
      },
      language: recognitionLang,
    });

    if (success) {
      setIsListening(true);
      setError('');
      setTranscript('');
    }
  };

  const stopListening = () => {
    speechService.stopListening();
    setIsListening(false);
  };

  if (!isSupported) {
    return (
      <Card className="border-warning/50 bg-warning/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <MicOff className="w-5 h-5 text-warning" />
            <div>
              <p className="font-medium text-warning">Speech Recognition Not Supported</p>
              <p className="text-sm text-muted-foreground">
                Please use Chrome, Edge, or Safari for voice input features
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full transition-all duration-200",
              isListening 
                ? "bg-gradient-primary shadow-glow animate-pulse" 
                : "bg-muted"
            )}>
              <Mic className={cn(
                "w-5 h-5 transition-colors",
                isListening ? "text-primary-foreground" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <h3 className="font-semibold">Voice Input</h3>
              <p className="text-sm text-muted-foreground">
                {isListening ? 'Listening...' : 'Click to start voice input'}
              </p>
            </div>
          </div>

          <Button
            variant={isListening ? "destructive" : "voice"}
            size="lg"
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            className="relative"
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Start Listening
              </>
            )}
          </Button>
        </div>

        {transcript && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <Badge variant="outline" className="text-xs">Last Command</Badge>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-sm font-mono">{transcript}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Voice Command Examples ({i18n.language}):</p>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const lang = (i18n.language || 'en').split('-')[0];
              const examples: { [key: string]: string[] } = {
                en: ['"Two packets of chips"', '"Remove last item"', '"Clear cart"', '"Checkout"', '"Pay with cash"', '"Received 50 dollars"'],
                hi: ['"दो पैकेट चिप्स"', '"आखिरी हटाओ"', '"कार्ट साफ करो"', '"बिल"', '"नकद"', '"पचास रुपए मिले"'],
                kn: ['"ಎರಡು ಪ್ಯಾಕೆಟ್ ಚಿಪ್ಸ್"', '"ಕೊನೆಯದನ್ನು ತೆಗೆದುಹಾಕಿ"', '"ಕಾರ್ಟ್ ಸ್ಪಷ್ಟ"', '"ಬಿಲ್"', '"ನಗದು"', '"ಐವತ್ತು ರೂಪಾಯಿ ಸಿಕ್ಕಿತು"'],
                ml: ['"രണ്ട് പാക്കറ്റ് ചിപ്സ്"', '"അവസാനത്തേത് നീക്കംചെയ്യുക"', '"കാർട്ട് വ്യക്തമാക്കുക"', '"ബിൽ"', '"പണം"', '"അമ്പത് രൂപ ലഭിച്ചു"'],
                ta: ['"இரண்டு பாக்கெட் சிப்ஸ்"', '"கடைசியை நீக்க"', '"கார்ட்டை அழிக்க"', '"பில்"', '"பணம்"', '"ஐம்பது ரூபாய் கிடைத்தது"']
              };
              return (examples[lang] || examples.en).map((example, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {example}
                </Badge>
              ));
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}