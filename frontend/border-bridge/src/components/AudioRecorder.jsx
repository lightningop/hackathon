import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Languages, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

// Map of dropdown language options to BCP 47 language tags for Speech Recognition
const languageCodeMap = {
  'English': 'en-US',
  'Spanish': 'es-ES',
  'Arabic': 'ar-SA',
  'French': 'fr-FR',
  'Swahili': 'sw-KE',
  'Ukrainian': 'uk-UA',
  'Russian': 'ru-RU',
  'Hindi': 'hi-IN',
  'Pashto': 'ps-AF',
  'Dari': 'prs-AF', // Simplified
  'Farsi': 'fa-IR',
  'Other': 'en-US' // Fallback
};

// Map to LibreTranslate 2-letter ISO codes
const libreTranslateCodeMap = {
  'English': 'en',
  'Spanish': 'es',
  'Arabic': 'ar',
  'French': 'fr',
  'Swahili': 'sw',
  'Ukrainian': 'uk',
  'Russian': 'ru',
  'Hindi': 'hi',
  'Pashto': 'ps', // Not supported by default LibreTranslate models typically, but we will send it.
  'Dari': 'fa', // Map to Persian as LibreTranslate fallback
  'Farsi': 'fa',
  'Other': 'en'
};

export default function AudioRecorder({ 
  preferredLanguage, 
  onTranscriptionUpdate,
  onTranslationUpdate,
  initialValue = "",
  initialTranslation = ""
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [originalText, setOriginalText] = useState(initialValue);
  const [translatedText, setTranslatedText] = useState(initialTranslation);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef(initialValue);
  const translationTimeoutRef = useRef(null);

  const isRecordingRef = useRef(false);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    
    const langCode = languageCodeMap[preferredLanguage] || 'en-US';
    recognition.lang = langCode;

    // --- EXACT STATE SYNCHRONIZATION ---

    // The browser has officially started listening
    recognition.onstart = () => {
      setIsRecording(true);
      isRecordingRef.current = true;
      setIsWarmingUp(false);
      setError(null);
      // Clear any pending auto-translations if the user starts speaking again quickly
      if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let newFinalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          newFinalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (newFinalTranscript) {
        finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + newFinalTranscript;
      }

      const fullDisplay = finalTranscriptRef.current + (interimTranscript ? ' ' + interimTranscript : '');
      setOriginalText(fullDisplay);
      onTranscriptionUpdate(fullDisplay);
    };

    // The browser physically stopped hearing sound
    recognition.onspeechend = () => {
       // We don't necessarily kill the recording session here yet (continuous=true),
       // but it's a good place to listen for natural pauses if needed.
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'aborted') {
        setIsRecording(false);
        isRecordingRef.current = false;
      } else if (event.error !== 'no-speech') {
        setError(`Microphone error: ${event.error}. Please check permissions.`);
        setIsRecording(false);
        isRecordingRef.current = false;
      }
    };

    // The recognition service has fully disconnected
    recognition.onend = () => {
      // If the user didn't explicitly trigger 'Stop Recording', 
      // the browser just timed out due to silence. Force restart it!
      if (isRecordingRef.current) {
        try {
          recognition.start();
          return; // Skip the stop UI/translation logic since we successfully bounced back
        } catch(e) {
          console.warn("Could not auto-restart continuous listening", e);
        }
      }
      
      // Real stop scenario
      setIsRecording(false);
      isRecordingRef.current = false;

      // Give the final text a moment to settle, then trigger translation if needed
      if (preferredLanguage !== 'English' && finalTranscriptRef.current.trim()) {
        if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
        translationTimeoutRef.current = setTimeout(() => {
            translateText(finalTranscriptRef.current);
        }, 800);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch(e) {}
      }
      if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
    };
  }, [preferredLanguage, onTranscriptionUpdate]);

  const toggleRecording = () => {
    setError(null);
    if (!recognitionRef.current) return;

    if (isRecording) {
      // User manually stopped -> force stop
      isRecordingRef.current = false; // Mark true intent so onend doesn't bounce back
      setIsRecording(false);          // Force immediate UI update to feel responsive
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error(err);
      }
    } else {
      // User manually started
      try {
        finalTranscriptRef.current = originalText;
        setIsWarmingUp(true);
        isRecordingRef.current = true;
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
        setIsWarmingUp(false);
        setError("Could not reconnect to microphone. Please refresh.");
      }
    }
  };

  const translateText = async (textToTranslate) => {
    if (!textToTranslate.trim() || preferredLanguage === 'English') return;

    setIsTranslating(true);
    setError(null);

    // MyMemory uses standard ISO codes (e.g., en, es, fr, ar)
    const sourceLang = libreTranslateCodeMap[preferredLanguage] || 'en';
    const langPair = `${sourceLang}|en`;
    
    try {
      // Using MyMemory Translation API (Free, no key required for low volume)
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=${langPair}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Translation service unavailable');
      }

      const data = await response.json();
      
      if (data.responseStatus !== 200) {
        throw new Error(data.responseDetails || "Translation failed");
      }

      const result = data.responseData.translatedText;
      setTranslatedText(result);
      if (onTranslationUpdate) onTranslationUpdate(result);
    } catch (err) {
      console.error(err);
      setError("Failed to translate the text. The public translation server might be overloaded.");
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2 border border-red-100">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Recording Display */}
      <div className={`relative border-2 rounded-xl overflow-hidden transition-all ${
        isRecording ? 'border-amber-400 shadow-md ring-4 ring-amber-400/10' : 'border-gray-200'
      }`}>
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Mic className={`w-4 h-4 ${isRecording ? 'text-amber-500 animate-pulse' : 'text-gray-400'}`} />
            Original Audio ({preferredLanguage})
          </div>
          {isRecording && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Recording
            </span>
          )}
        </div>
        
        <Textarea
          value={originalText}
          onChange={(e) => {
            setOriginalText(e.target.value);
            finalTranscriptRef.current = e.target.value;
            onTranscriptionUpdate(e.target.value);
          }}
          placeholder={`Speak in ${preferredLanguage} or type manually...`}
          className="min-h-[140px] border-none shadow-none text-lg resize-none focus-visible:ring-0 p-4"
        />
        
        <div className="bg-white p-3 border-t border-gray-100 flex justify-center">
          <Button 
            type="button" 
            size="lg" 
            onClick={toggleRecording}
            disabled={isWarmingUp}
            className={`px-8 transition-colors ${
              isRecording 
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200 shadow-lg' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 shadow-md'
            }`}
          >
            {isWarmingUp ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Starting...</>
            ) : isRecording ? (
              <><MicOff className="w-5 h-5 mr-2" /> Stop Recording</>
            ) : (
              <><Mic className="w-5 h-5 mr-2" /> Start Recording</>
            )}
          </Button>
        </div>
      </div>

      {/* Translation Display */}
      {preferredLanguage !== 'English' && (originalText || translatedText) && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl overflow-hidden">
          <div className="bg-indigo-50/80 border-b border-indigo-100 px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm font-medium text-indigo-900">
              <Languages className="w-4 h-4 text-indigo-600" />
              English Translation
            </div>
            
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => translateText(originalText)}
              disabled={isTranslating || !originalText.trim()}
              className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-100"
            >
              {isTranslating ? (
                <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Translating...</>
              ) : (
                <><RefreshCw className="w-3 h-3 mr-1.5" /> Re-translate</>
              )}
            </Button>
          </div>
          
          <div className="p-4 bg-white min-h-[100px]">
            {isTranslating ? (
              <div className="flex flex-col items-center justify-center h-full text-indigo-400 py-4 gap-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm font-medium">Translating securely via LibreTranslate...</span>
              </div>
            ) : translatedText ? (
              <Textarea
                value={translatedText}
                onChange={(e) => {
                  setTranslatedText(e.target.value);
                  if (onTranslationUpdate) onTranslationUpdate(e.target.value);
                }}
                placeholder="English translation will appear here..."
                className="min-h-[100px] border-none shadow-none text-lg resize-none focus-visible:ring-0 p-0 text-gray-800 leading-relaxed"
              />
            ) : (
              <p className="text-indigo-300 italic text-center py-4">
                Translation will appear here after recording is stopped.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
