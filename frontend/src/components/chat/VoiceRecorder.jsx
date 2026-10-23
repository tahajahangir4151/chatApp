import React, { useState, useEffect, useRef } from "react";
import {
  Flex,
  Box,
  Text,
  IconButton,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import {
  IoTrashOutline,
  IoSend,
  IoPauseOutline,
  IoMicOutline,
} from "react-icons/io5";
import fixWebmDuration from "fix-webm-duration";

const VoiceRecorder = ({ onSendAudio, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState([4, 12, 22, 16, 8, 20, 26, 14, 18, 10, 24, 12]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const processedStreamRef = useRef(null);
  const timerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const isPausedRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const pauseStartedAtRef = useRef(0);
  const totalPausedMsRef = useRef(0);
  const finalDurationRef = useRef(0);
  const finalDurationMsRef = useRef(0);
  const toast = useToast();

  // Start microphone recording on mount
  useEffect(() => {
    startRecording();

    return () => {
      cleanupResources();
    };
  }, []);

  // Timer counter
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        const elapsedMs =
          performance.now() -
          recordingStartedAtRef.current -
          totalPausedMsRef.current;
        setDuration(Math.max(0, Math.floor(elapsedMs / 1000)));
      }, 200);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRecording, isPaused]);

  const cleanupResources = () => {
    clearInterval(timerRef.current);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // already stopped
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (processedStreamRef.current) {
      processedStreamRef.current.getTracks().forEach((track) => track.stop());
      processedStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close();
      } catch (e) {}
    }
  };

  const startRecording = async () => {
    audioChunksRef.current = [];
    setDuration(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Voice recording is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48000 },
          sampleSize: { ideal: 16 },
          latency: { ideal: 0.01 },
          // Preserve the actual microphone signal. Some Chromium devices
          // misclassify speech as echo and suppress it almost completely.
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;
      let recordingStream = stream;

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        throw new Error("No microphone audio track is available.");
      }

      // Real-time audio waveform analyzer using Web Audio API
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const audioCtx = new AudioContext();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 32;
          source.connect(analyser);
          analyserRef.current = analyser;

          // Apply a clean microphone preamp and dynamics control. This makes
          // quiet laptop/phone microphones audible without clipping loud speech.
          const preamp = audioCtx.createGain();
          preamp.gain.value = 6;
          const compressor = audioCtx.createDynamicsCompressor();
          compressor.threshold.value = -18;
          compressor.knee.value = 12;
          compressor.ratio.value = 6;
          compressor.attack.value = 0.003;
          compressor.release.value = 0.25;
          const recorderDestination = audioCtx.createMediaStreamDestination();
          source.connect(preamp);
          preamp.connect(compressor);
          compressor.connect(recorderDestination);
          recordingStream = recorderDestination.stream;
          processedStreamRef.current = recordingStream;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevels = () => {
            if (analyserRef.current && !isPausedRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              const normalized = Array.from(dataArray.slice(0, 12)).map(
                (v) => Math.max(4, Math.min(28, Math.round(v / 8)))
              );
              setAudioLevels(normalized);
            }
            animationFrameRef.current = requestAnimationFrame(updateLevels);
          };
          updateLevels();
        }
      } catch (e) {
        console.warn("Web Audio API analyser not supported:", e);
      }

      // Determine best supported MIME type
      if (typeof MediaRecorder === "undefined") {
        throw new Error("Voice recording is not supported in this browser.");
      }

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4;codecs=mp4a.40.2",
        "audio/mp4",
        "audio/webm",
      ];
      const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type));

      const recorderOptions = {
        audioBitsPerSecond: 160000,
        ...(mimeType ? { mimeType } : {}),
      };
      const recorder = new MediaRecorder(recordingStream, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onerror = () => {
        toast({
          title: "Recording interrupted",
          description: "The microphone stream stopped unexpectedly. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        cleanupResources();
        onCancel();
      };

      recorder.start(250);
      recordingStartedAtRef.current = performance.now();
      pauseStartedAtRef.current = 0;
      totalPausedMsRef.current = 0;
      setIsRecording(true);
      setIsPaused(false);
      isPausedRef.current = false;
    } catch (err) {
      console.error("Microphone access error:", err);
      toast({
        title: "Microphone Access Denied",
        description:
          "Please allow microphone permissions in your browser to send voice messages.",
        status: "error",
        duration: 3500,
        isClosable: true,
        position: "top",
      });
      onCancel();
    }
  };

  const handlePauseToggle = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      audioContextRef.current?.resume?.();
      if (pauseStartedAtRef.current) {
        totalPausedMsRef.current += performance.now() - pauseStartedAtRef.current;
        pauseStartedAtRef.current = 0;
      }
      isPausedRef.current = false;
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      audioContextRef.current?.suspend?.();
      pauseStartedAtRef.current = performance.now();
      isPausedRef.current = true;
      setIsPaused(true);
    }
  };

  const handleCancel = () => {
    cleanupResources();
    onCancel();
  };

  const handleSend = () => {
    if (!mediaRecorderRef.current || isSending) return;

    setIsSending(true);
    const activePauseMs =
      isPausedRef.current && pauseStartedAtRef.current
        ? performance.now() - pauseStartedAtRef.current
        : 0;
    finalDurationMsRef.current = Math.max(
      1,
      performance.now() -
        recordingStartedAtRef.current -
        totalPausedMsRef.current -
        activePauseMs
    );
    finalDurationRef.current = Math.max(
      1,
      Math.round(finalDurationMsRef.current / 1000)
    );

    mediaRecorderRef.current.onstop = async () => {
      const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
      let audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      if (audioBlob.size < 1000) {
        setIsSending(false);
        toast({
          title: "Recording is too short",
          description: "Hold the microphone a little longer and try again.",
          status: "warning",
          duration: 2500,
          isClosable: true,
        });
        cleanupResources();
        onCancel();
        return;
      }

      // Chromium records WebM with an unknown-length segment and no duration.
      // Finalize its EBML metadata before upload so normal audio playback,
      // seeking, and duration work without browser-specific recovery hacks.
      if (mimeType.includes("webm")) {
        try {
          audioBlob = await fixWebmDuration(
            audioBlob,
            finalDurationMsRef.current,
            { logger: false }
          );
        } catch (error) {
          console.warn("Could not finalize WebM duration metadata:", error);
        }
      }

      // Determine extension based on mimetype
      const ext = mimeType.includes("mp4")
        ? "mp4"
        : mimeType.includes("ogg")
        ? "ogg"
        : "webm";
      const audioFile = new File(
        [audioBlob],
        `Voice-Note-${Date.now()}.${ext}`,
        { type: mimeType }
      );

      cleanupResources();
      onSendAudio(audioFile, finalDurationRef.current);
    };

    try {
      mediaRecorderRef.current.stop();
    } catch (e) {
      cleanupResources();
    }
  };

  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <Flex
      align="center"
      justify="space-between"
      px={4}
      py={2.5}
      w="100%"
      bg="#F8FAFC"
      className="voice-recorder-bar"
    >
      {/* Left: Discard Trash Button */}
      <Tooltip label="Discard Voice Message" hasArrow placement="top">
        <IconButton
          size="sm"
          variant="ghost"
          color="#EF4444"
          _hover={{ bg: "#FEE2E2", color: "#DC2626" }}
          icon={<IoTrashOutline size={20} />}
          onClick={handleCancel}
          aria-label="Discard recording"
          borderRadius="full"
        />
      </Tooltip>

      {/* Middle: Blinking Recording Dot + Timer + Dynamic Waveform */}
      <Flex align="center" gap={3} flex="1" justify="center" px={4}>
        {/* Blinking Red Dot */}
        <Box
          w="10px"
          h="10px"
          borderRadius="full"
          bg="#EF4444"
          className={!isPaused ? "recording-pulse-dot" : ""}
          opacity={isPaused ? 0.4 : 1}
        />

        {/* Live Timer */}
        <Text
          fontSize="sm"
          fontWeight="600"
          color="#1E293B"
          fontFamily="monospace"
          minW="45px"
        >
          {isRecording ? formatTime(duration) : "Connecting…"}
        </Text>

        {/* Sound Wave Equalizer Bars */}
        <Flex align="center" gap="3px" h="28px" px={2}>
          {audioLevels.map((level, idx) => (
            <Box
              key={idx}
              w="3px"
              h={isPaused ? "4px" : `${level}px`}
              bg={isPaused ? "#94A3B8" : "#2563EB"}
              borderRadius="full"
              transition="height 0.08s ease"
            />
          ))}
        </Flex>

        {isPaused && (
          <Text fontSize="xs" color="#94A3B8" fontStyle="italic">
            (Paused)
          </Text>
        )}
      </Flex>

      {/* Right Controls: Pause/Resume + Send Button */}
      <Flex align="center" gap={2}>
        <Tooltip
          label={isPaused ? "Resume Recording" : "Pause Recording"}
          hasArrow
          placement="top"
        >
          <IconButton
            size="sm"
            variant="ghost"
            color="#64748B"
            _hover={{ bg: "#E2E8F0" }}
            icon={isPaused ? <IoMicOutline size={18} color="#2563EB" /> : <IoPauseOutline size={18} />}
            onClick={handlePauseToggle}
            aria-label="Toggle pause recording"
            borderRadius="full"
          />
        </Tooltip>

        <Tooltip label="Send Voice Message" hasArrow placement="top">
          <IconButton
            size="sm"
            bg="#2563EB"
            color="white"
            _hover={{ bg: "#1D4ED8", transform: "scale(1.05)" }}
            icon={<IoSend size={15} />}
            onClick={handleSend}
            isLoading={isSending}
            isDisabled={!isRecording || duration < 1}
            aria-label="Send voice message"
            borderRadius="full"
            boxShadow="0 2px 8px rgba(37, 99, 235, 0.35)"
          />
        </Tooltip>
      </Flex>
    </Flex>
  );
};

export default VoiceRecorder;
