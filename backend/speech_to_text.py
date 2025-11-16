import speech_recognition as sr
from pydub import AudioSegment
import os

class SpeechToText:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.language_codes = {
            'english': 'en-US',
            'hindi': 'hi-IN',
            'kannada': 'kn-IN',
            'malayalam': 'ml-IN'
        }

    def transcribe_audio(self, audio_file_path, language='english'):
        """
        Convert speech from an audio file to text.
        
        Args:
            audio_file_path (str): Path to the audio file
            language (str): Language of the audio ('english', 'hindi', 'kannada', 'malayalam')
            
        Returns:
            str: Transcribed text
        """
        # Convert the audio file to WAV format if it's not already
        if not audio_file_path.lower().endswith('.wav'):
            audio = AudioSegment.from_file(audio_file_path)
            wav_path = os.path.splitext(audio_file_path)[0] + '.wav'
            audio.export(wav_path, format='wav')
            audio_file_path = wav_path

        # Use the audio file as the audio source
        with sr.AudioFile(audio_file_path) as source:
            audio_data = self.recognizer.record(source)  # Read the entire audio file
            
            try:
                # Get the language code, default to English if not found
                lang_code = self.language_codes.get(language.lower(), 'en-US')
                
                # Recognize speech using Google Web Speech API
                text = self.recognizer.recognize_google(
                    audio_data,
                    language=lang_code
                )
                return text
                
            except sr.UnknownValueError:
                return "Could not understand audio"
            except sr.RequestError as e:
                return f"Could not request results from Google Speech Recognition service; {e}"
            except Exception as e:
                return f"An error occurred: {str(e)}"

# Example usage
if __name__ == "__main__":
    stt = SpeechToText()
    
    print("Speech to Text Converter")
    print("Supported languages: english, hindi, kannada, malayalam")
    
    audio_file = input("Enter the path to your audio file: ")
    language = input("Enter the language of the audio (default: english): ").strip().lower()
    
    if not language or language not in ['english', 'hindi', 'kannada', 'malayalam']:
        language = 'english'
    
    print("\nTranscribing...")
    result = stt.transcribe_audio(audio_file, language)
    print("\nTranscription:", result)
