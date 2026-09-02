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
  IoPlayOutline,
  IoMicOutline,
} from "react-icons/io5";

const VoiceRecorder = ({ onSendAudio, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState([4, 12, 22, 16, 8, 20, 26, 14, 18, 10, 24, 12]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
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
        setDuration((prev) => prev + 1);
      }, 1000);
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

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

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

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevels = () => {
            if (analyserRef.current && !isPaused) {
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
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100); // 100ms timeslices for smooth chunking
      setIsRecording(true);
      setIsPaused(false);
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
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleCancel = () => {
    cleanupResources();
    onCancel();
  };

  const handleSend = () => {
    if (!mediaRecorderRef.current) return;

    const formattedTime = formatTime(duration);

    mediaRecorderRef.current.onstop = () => {
      const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

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
      onSendAudio(audioFile, formattedTime);
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
          {formatTime(duration)}
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
