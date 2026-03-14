import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, Languages, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { translateText as apiTranslateText } from '../lib/api';

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
  'Dari': 'prs-AF',
  'Farsi': 'fa-IR',
  'Other': 'en-US'
};

// Map to ISO codes for MyMemory translation API
const translationCodeMap = {
  'English': 'en',
  'Spanish': 'es',
  'Arabic': 'ar',
  'French': 'fr',
  'Swahili': 'sw',
  'Ukrainian': 'uk',
  'Russian': 'ru',
  'Hindi': 'hi',
  'Pashto': 'ps',
  'Dari': 'fa',
  'Farsi': 'fa',
  'Other': 'Autodetect'
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
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Stable callback refs to avoid re-creating recognition on every render
  const onTranscriptionUpdateRef = useRef(onTranscriptionUpdate);
  onTranscriptionUpdateRef.current = onTranscriptionUpdate;

  const onTranslationUpdateRef = useRef(onTranslationUpdate);
  onTranslationUpdateRef.current = onTranslationUpdate;

  const preferredLanguageRef = useRef(preferredLanguage);
  preferredLanguageRef.current = preferredLanguage;

  // Create a fresh SpeechRecognition instance on demand (not on mount)
  const createRecognition = useCallback(() => {
    // Clean up any existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) { /* ignore */ }
      recognitionRef.current = null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    const langCode = languageCodeMap[preferredLanguageRef.current] || 'en-US';
    recognition.lang = langCode;

    // The browser has officially started listening
    recognition.onstart = () => {
      setIsRecording(true);
      isRecordingRef.current = true;
      setIsWarmingUp(false);
      setError(null);
      retryCountRef.current = 0; // Reset retries on successful start
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
      onTranscriptionUpdateRef.current(fullDisplay);
    };

    recognition.onspeechend = () => {
      // No action needed — continuous mode handles this
    };

    recognition.onerror = (event) => {
      // Ignore harmless errors silently
      if (event.error === 'aborted' || event.error === 'no-speech') {
        return;
      }

      console.warn('Speech recognition error:', event.error);

      if (event.error === 'network') {
        // Chrome speech server disconnect — retry with backoff
        if (isRecordingRef.current && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = retryCountRef.current * 1000; // 1s, 2s, 3s backoff
          console.log(`Network error, retrying in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
          setTimeout(() => {
            if (isRecordingRef.current) {
              try {
                const fresh = createRecognition();
                if (fresh) {
                  recognitionRef.current = fresh;
                  fresh.start();
                }
              } catch (e) {
                console.warn('Retry failed:', e);
              }
            }
          }, delay);
          return;
        }
        // Max retries exhausted
        setError("Microphone connection lost. Please click 'Start Recording' again.");
        setIsRecording(false);
        setIsWarmingUp(false);
        isRecordingRef.current = false;
        return;
      }

      // Other errors (not-allowed, service-not-allowed, etc.)
      setError(`Microphone error: ${event.error}. Please check permissions.`);
      setIsRecording(false);
      setIsWarmingUp(false);
      isRecordingRef.current = false;
    };

    // The recognition service has fully disconnected
    recognition.onend = () => {
      // If user still wants to record, restart (silence timeout bounce-back)
      if (isRecordingRef.current) {
        try {
          // Small delay to avoid rapid-fire restarts
          setTimeout(() => {
            if (isRecordingRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                // If start fails, create a fresh instance
                const fresh = createRecognition();
                if (fresh) {
                  recognitionRef.current = fresh;
                  try { fresh.start(); } catch (e2) {
                    console.warn('Could not restart recognition:', e2);
                    setIsRecording(false);
                    isRecordingRef.current = false;
                    setError("Microphone disconnected. Please click 'Start Recording' again.");
                  }
                }
              }
            }
          }, 300);
          return;
        } catch (e) {
          console.warn("Could not auto-restart continuous listening", e);
        }
      }
      
      // Real stop scenario
      setIsRecording(false);
      isRecordingRef.current = false;

      // Trigger translation after stopping
      if (preferredLanguageRef.current !== 'English' && finalTranscriptRef.current.trim()) {
        if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
        translationTimeoutRef.current = setTimeout(() => {
          translateText(finalTranscriptRef.current);
        }, 800);
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  }, []); // No deps — uses refs for everything

  const toggleRecording = () => {
    setError(null);

    if (isRecording || isRecordingRef.current) {
      // ── STOP ──
      isRecordingRef.current = false;
      setIsRecording(false);
      setIsWarmingUp(false);
      retryCountRef.current = 0;

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort(); // Use abort() for immediate stop
        } catch (err) {
          console.warn('Stop error:', err);
        }
      }
    } else {
      // ── START ──
      // Always create a fresh instance to avoid stale state
      const recognition = createRecognition();
      if (!recognition) return;

      finalTranscriptRef.current = originalText;
      setIsWarmingUp(true);
      isRecordingRef.current = true;
      retryCountRef.current = 0;

      try {
        recognition.start();
      } catch (err) {
        console.error('Start error:', err);
        setIsWarmingUp(false);
        isRecordingRef.current = false;
        setError("Could not start microphone. Please refresh and try again.");
      }
    }
  };

  const translateText = async (textToTranslate) => {
    if (!textToTranslate.trim() || preferredLanguageRef.current === 'English') return;

    setIsTranslating(true);
    setError(null);
    
    try {
      // Pass the specific source language to the backend translation service for better accuracy
      const sourceLang = translationCodeMap[preferredLanguageRef.current] || 'Autodetect';
      const data = await apiTranslateText(textToTranslate, sourceLang, 'en');
      
      if (!data.success) {
        throw new Error(data.message || "Translation failed");
      }

      const result = data.translatedText;
      setTranslatedText(result);
      if (onTranslationUpdateRef.current) onTranslationUpdateRef.current(result);
    } catch (err) {
      console.error('Translation error:', err);
      setError("Failed to translate the text. Ensure your backend is running.");
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
            onTranscriptionUpdateRef.current(e.target.value);
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
                <span className="text-sm font-medium">Translating securely via MyMemory API...</span>
              </div>
            ) : translatedText ? (
              <Textarea
                value={translatedText}
                onChange={(e) => {
                  setTranslatedText(e.target.value);
                  if (onTranslationUpdateRef.current) onTranslationUpdateRef.current(e.target.value);
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
