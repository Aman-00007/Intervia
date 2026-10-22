import asyncio
import logging
from typing import Dict, Any

logger = logging.getLogger("intervia.forensics.voice")

try:
    import webrtcvad
    HAS_VAD_DEPS = True
except ImportError:
    HAS_VAD_DEPS = False
    logger.warning("webrtcvad not installed. VoiceVerifier running in stub mode.")

class VoiceVerifier:
    """
    Processes raw 16-bit mono PCM audio chunks using Google's WebRTC VAD engine
    to detect unauthorized voice activity while the candidate is supposed to be coding silently.
    """
    def __init__(self, aggressiveness: int = 3):
        """
        aggressiveness: Integer between 0 and 3. 
        3 is the most aggressive at filtering out non-speech background noise (fans, typing).
        """
        if not (0 <= aggressiveness <= 3):
            raise ValueError("VAD aggressiveness mode must be between 0 and 3.")
            
        self.aggressiveness = aggressiveness
        self.vad = webrtcvad.Vad(self.aggressiveness) if HAS_VAD_DEPS else None

    def _analyze_pcm_sync(
        self, 
        pcm_bytes: bytes, 
        sample_rate: int = 16000, 
        frame_duration_ms: int = 30
    ) -> Dict[str, Any]:
        """Synchronous sliding-window evaluation of raw PCM audio bytes."""
        if sample_rate not in (8000, 16000, 32000, 48000):
            raise ValueError(f"Unsupported sample rate: {sample_rate}. Must be 8k, 16k, 32k, or 48k.")
        if frame_duration_ms not in (10, 20, 30):
            raise ValueError("Frame duration must be 10, 20, or 30 ms.")

        if not HAS_VAD_DEPS or self.vad is None:
            return {
                "speech_detected": False,
                "speech_ratio": 0.0,
                "total_frames_analyzed": 0,
                "flagged_for_review": False
            }

        # 16-bit PCM = 2 bytes per sample
        bytes_per_sample = 2
        samples_per_frame = int(sample_rate * (frame_duration_ms / 1000.0))
        chunk_size = samples_per_frame * bytes_per_sample

        if len(pcm_bytes) < chunk_size:
            return {
                "speech_detected": False,
                "speech_ratio": 0.0,
                "total_frames_analyzed": 0,
                "flagged_for_review": False
            }

        total_frames = 0
        speech_frames = 0

        # Slide across the byte buffer in exact 30ms increments
        for offset in range(0, len(pcm_bytes) - chunk_size + 1, chunk_size):
            frame_slice = pcm_bytes[offset:offset + chunk_size]
            total_frames += 1
            if self.vad.is_speech(frame_slice, sample_rate):
                speech_frames += 1

        speech_ratio = round(speech_frames / total_frames, 4) if total_frames > 0 else 0.0
        
        # If more than 15% of the audio chunk contains active human speech during silent coding, flag it
        flagged = speech_ratio > 0.15

        return {
            "speech_detected": speech_frames > 0,
            "speech_ratio": speech_ratio,
            "total_frames_analyzed": total_frames,
            "flagged_for_review": flagged
        }

    async def analyze_audio_chunk(
        self, 
        pcm_bytes: bytes, 
        sample_rate: int = 16000, 
        frame_duration_ms: int = 30
    ) -> Dict[str, Any]:
        """Async wrapper to keep audio processing off the main event loop."""
        return await asyncio.to_thread(
            self._analyze_pcm_sync, 
            pcm_bytes, 
            sample_rate, 
            frame_duration_ms
        )

# Singleton instance
voice_verifier = VoiceVerifier(aggressiveness=3)