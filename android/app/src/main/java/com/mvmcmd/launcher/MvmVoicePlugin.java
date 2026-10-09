package com.mvmcmd.launcher;

import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Locale;

@CapacitorPlugin(name = "MvmVoice")
public class MvmVoicePlugin extends Plugin implements RecognitionListener {
    private SpeechRecognizer recognizer;
    private PluginCall activeCall;
    private String requestedLocale = "en-US";
    private TextToSpeech textToSpeech;

    @PluginMethod
    public void startListening(PluginCall call) {
        requestedLocale = call.getString("locale", "en-US");
        getActivity().runOnUiThread(() -> startOnMainThread(call));
    }

    private void startOnMainThread(PluginCall call) {
        if (activeCall != null) {
            call.reject("Voice recognition is already active.");
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            call.reject("Speech recognition is unavailable on this Android device. Type the command instead.");
            return;
        }
        try {
            recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(this);
            activeCall = call;
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, requestedLocale);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, requestedLocale);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            recognizer.startListening(intent);
        } catch (Exception error) {
            rejectActive("Unable to start speech recognition: " + error.getClass().getSimpleName());
        }
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        boolean cancel = Boolean.TRUE.equals(call.getBoolean("cancel", false));
        getActivity().runOnUiThread(() -> {
            if (recognizer == null || activeCall == null) {
                JSObject idle = new JSObject();
                idle.put("stopping", false);
                idle.put("cancelled", cancel);
                call.resolve(idle);
                return;
            }
            if (cancel) {
                PluginCall pending = activeCall;
                activeCall = null;
                releaseRecognizer();
                if (pending != null) {
                    JSObject result = new JSObject();
                    result.put("cancelled", true);
                    pending.resolve(result);
                }
                JSObject result = new JSObject();
                result.put("cancelled", true);
                call.resolve(result);
                return;
            }
            try {
                recognizer.stopListening();
                JSObject result = new JSObject();
                result.put("stopping", true);
                call.resolve(result);
            } catch (Exception error) {
                rejectActive("Unable to stop speech recognition: " + error.getClass().getSimpleName());
                call.reject("Unable to stop speech recognition.");
            }
        });
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "").trim();
        String locale = call.getString("locale", Locale.getDefault().toLanguageTag());
        if (text.isEmpty()) {
            call.reject("Speech text is empty.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                if (textToSpeech == null) {
                    textToSpeech = new TextToSpeech(getContext(), status -> {
                        if (status != TextToSpeech.SUCCESS || textToSpeech == null) {
                            call.reject("Text-to-speech is unavailable.");
                            return;
                        }
                        speakNow(text, locale, call);
                    });
                } else {
                    speakNow(text, locale, call);
                }
            } catch (Exception error) {
                call.reject("Unable to speak the result: " + error.getClass().getSimpleName());
            }
        });
    }

    private void speakNow(String text, String languageTag, PluginCall call) {
        if (textToSpeech == null) {
            call.reject("Text-to-speech is unavailable.");
            return;
        }
        int languageStatus = textToSpeech.setLanguage(Locale.forLanguageTag(languageTag));
        if (languageStatus == TextToSpeech.LANG_MISSING_DATA || languageStatus == TextToSpeech.LANG_NOT_SUPPORTED) {
            textToSpeech.setLanguage(Locale.getDefault());
        }
        textToSpeech.setSpeechRate(1.0f);
        int result = textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, "mvm-voice-result");
        JSObject response = new JSObject();
        response.put("spoken", result == TextToSpeech.SUCCESS);
        call.resolve(response);
    }

    @PluginMethod
    public void stopSpeaking(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (textToSpeech != null) textToSpeech.stop();
            JSObject result = new JSObject();
            result.put("stopped", true);
            call.resolve(result);
        });
    }

    @Override public void onReadyForSpeech(Bundle params) { }
    @Override public void onBeginningOfSpeech() { }
    @Override public void onRmsChanged(float rmsdB) { }
    @Override public void onBufferReceived(byte[] buffer) { }
    @Override public void onEndOfSpeech() { }

    @Override
    public void onError(int error) {
        String reason;
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO: reason = "Microphone audio error."; break;
            case SpeechRecognizer.ERROR_CLIENT: reason = "Speech recognition was interrupted."; break;
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: reason = "Microphone permission is missing."; break;
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: reason = "Speech recognition service failed. Check connectivity or type the command."; break;
            case SpeechRecognizer.ERROR_NO_MATCH:
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: reason = "No speech detected. Try again or type the command."; break;
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: reason = "Speech recognition is busy. Retry in a moment."; break;
            case SpeechRecognizer.ERROR_SERVER: reason = "Speech recognition service returned an error."; break;
            default: reason = "Speech recognition failed. Type the command instead.";
        }
        rejectActive(reason);
    }

    @Override
    public void onResults(Bundle results) {
        PluginCall pending = activeCall;
        if (pending == null) return;
        ArrayList<String> matches = results == null ? null : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (matches == null || matches.isEmpty() || matches.get(0) == null || matches.get(0).trim().isEmpty()) {
            rejectActive("No speech detected. Try again or type the command.");
            return;
        }
        activeCall = null;
        releaseRecognizer();
        JSObject response = new JSObject();
        response.put("transcript", matches.get(0).trim());
        response.put("locale", requestedLocale);
        float[] confidence = results.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES);
        if (confidence != null && confidence.length > 0) response.put("confidence", (double) confidence[0]);
        pending.resolve(response);
    }

    @Override public void onPartialResults(Bundle partialResults) { }
    @Override public void onEvent(int eventType, Bundle params) { }

    private void rejectActive(String message) {
        PluginCall pending = activeCall;
        activeCall = null;
        releaseRecognizer();
        if (pending != null) pending.reject(message);
    }

    private void releaseRecognizer() {
        SpeechRecognizer current = recognizer;
        recognizer = null;
        if (current != null) {
            try { current.cancel(); } catch (Exception ignored) { }
            try { current.destroy(); } catch (Exception ignored) { }
        }
    }

    @Override
    protected void handleOnDestroy() {
        releaseRecognizer();
        if (textToSpeech != null) {
            try { textToSpeech.stop(); } catch (Exception ignored) { }
            try { textToSpeech.shutdown(); } catch (Exception ignored) { }
            textToSpeech = null;
        }
        super.handleOnDestroy();
    }
}
