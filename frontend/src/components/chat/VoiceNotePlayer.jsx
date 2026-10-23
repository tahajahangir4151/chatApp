import React, { useState, useRef, useEffect } from "react";
import {
  Flex,
  Box,
  Text,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from "@chakra-ui/react";
import {
  IoPlay,
  IoPause,
  IoMic,
} from "react-icons/io5";

const PLAYBACK_SPEEDS = [1, 1.5, 2];

const VoiceNotePlayer = ({ audioUrl, isMe, fallbackDuration = 0 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(
    Number.isFinite(Number(fallbackDuration)) ? Number(fallbackDuration) : 0
  );
  const [speedIndex, setSpeedIndex] = useState(0);

  const audioRef = useRef(null);
  const recoveringDurationRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const suppliedDuration = Number(fallbackDuration);
    const hasSuppliedDuration =
      Number.isFinite(suppliedDuration) && suppliedDuration > 0;

    setCurrentTime(0);
    setIsPlaying(false);
    setDuration(
      hasSuppliedDuration
        ? suppliedDuration
        : 0
    );

    const saveFiniteDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        if (recoveringDurationRef.current) {
          recoveringDurationRef.current = false;
          audio.currentTime = 0;
        }
        return true;
      }
      return false;
    };

    const recoverWebmDuration = () => {
      if (recoveringDurationRef.current || Number.isFinite(audio.duration)) return;
      recoveringDurationRef.current = true;
      try {
        audio.currentTime = Number.MAX_SAFE_INTEGER;
      } catch (error) {
        recoveringDurationRef.current = false;
      }
    };

    const handleLoadedMetadata = () => {
      // New voice messages carry their measured duration, so do not perform
      // the extreme WebM seek that can generate failed range requests.
      if (!saveFiniteDuration() && !hasSuppliedDuration) {
        recoverWebmDuration();
      }
    };

    const handleTimeUpdate = () => {
      if (!recoveringDurationRef.current && Number.isFinite(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setIsPlaying(false);
    };

    const handleDurationChange = () => {
      saveFiniteDuration();
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("durationchange", handleDurationChange);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("durationchange", handleDurationChange);
    };
  }, [audioUrl, fallbackDuration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleSliderChange = (val) => {
    if (!audioRef.current || !Number.isFinite(duration) || duration <= 0) return;
    const targetTime = (val / 100) * duration;
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const toggleSpeed = () => {
    const nextIdx = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIdx);
    if (audioRef.current) {
      audioRef.current.playbackRate = PLAYBACK_SPEEDS[nextIdx];
    }
  };

  const formatTime = (secs) => {
    if (!Number.isFinite(Number(secs)) || Number(secs) < 0) return "0:00";
    secs = Number(secs);
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const progressPercent =
    Number.isFinite(duration) && duration > 0 && Number.isFinite(currentTime)
      ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
      : 0;

  return (
    <Box className="whatsapp-voice-player" minW={{ base: "220px", sm: "260px" }} py={1}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <Flex align="center" gap={2.5}>
        {/* Play / Pause Circular Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="whatsapp-voice-play-btn"
          style={{
            background: isMe ? "#15803D" : "#2563EB",
          }}
          aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
        >
          {isPlaying ? <IoPause size={15} color="white" /> : <IoPlay size={15} color="white" style={{ marginLeft: "2px" }} />}
        </button>

        {/* Progress Timeline & Waveform */}
        <Box flex="1">
          <Slider
            aria-label="voice-note-progress"
            value={progressPercent}
            onChange={handleSliderChange}
            focusThumbOnChange={false}
            size="sm"
          >
            <SliderTrack bg={isMe ? "#BBF7D0" : "#E2E8F0"} h="4px" borderRadius="full">
              <SliderFilledTrack bg={isMe ? "#15803D" : "#2563EB"} />
            </SliderTrack>
            <SliderThumb
              boxSize={3}
              bg={isMe ? "#15803D" : "#2563EB"}
              _focus={{ boxShadow: "none" }}
            />
          </Slider>

          {/* Time & Mic icon */}
          <Flex justify="space-between" align="center" mt="3px">
            <Text fontSize="10px" color={isMe ? "#166534" : "#64748B"} fontWeight="500">
              {isPlaying || currentTime > 0
                ? formatTime(currentTime)
                : formatTime(duration || 0)}
            </Text>

            <Flex align="center" gap={1.5}>
              <IoMic size={11} color={isMe ? "#166534" : "#64748B"} />
              {/* Playback speed pill */}
              <Box
                as="button"
                type="button"
                onClick={toggleSpeed}
                fontSize="9px"
                fontWeight="700"
                px="4px"
                py="1px"
                borderRadius="4px"
                bg={isMe ? "rgba(22, 101, 52, 0.12)" : "rgba(37, 99, 235, 0.1)"}
                color={isMe ? "#166534" : "#2563EB"}
                cursor="pointer"
                title="Change playback speed"
              >
                {PLAYBACK_SPEEDS[speedIndex]}x
              </Box>
            </Flex>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
};

export default VoiceNotePlayer;
