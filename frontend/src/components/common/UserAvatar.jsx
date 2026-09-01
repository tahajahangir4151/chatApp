import React from "react";
import { Avatar, AvatarBadge, Box } from "@chakra-ui/react";

// Deterministic pleasant color generation based on string
const getAvatarBg = (name = "") => {
  const colors = [
    "#3B82F6", // Blue
    "#10B981", // Emerald
    "#8B5CF6", // Purple
    "#F59E0B", // Amber
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#6366F1", // Indigo
    "#14B8A6", // Teal
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name = "") => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const UserAvatar = ({
  name = "User",
  src = "",
  size = "md",
  status = "offline", // "online" | "away" | "offline"
  showStatus = true,
  isTyping = false,
  cursor = "pointer",
  onClick,
}) => {
  // Status color map
  const statusColorMap = {
    online: "#10B981",
    away: "#F59E0B",
    offline: "#94A3B8",
  };

  const badgeColor =
    typeof status === "boolean"
      ? status
        ? statusColorMap.online
        : statusColorMap.offline
      : statusColorMap[status] || statusColorMap.offline;

  const bg = getAvatarBg(name);
  const initials = getInitials(name);

  return (
    <Box position="relative" display="inline-block" onClick={onClick} cursor={cursor}>
      <Avatar
        size={size}
        name={name}
        src={src}
        bg={bg}
        color="white"
        fontWeight="600"
        fontSize={size === "xs" ? "10px" : size === "sm" ? "12px" : "14px"}
        getInitials={() => initials}
      >
        {showStatus && !isTyping && (
          <AvatarBadge
            boxSize={
              size === "xs"
                ? "9px"
                : size === "sm"
                ? "11px"
                : size === "lg"
                ? "14px"
                : "12px"
            }
            bg={badgeColor}
            borderColor="white"
            borderWidth="2px"
          />
        )}

        {isTyping && (
          <AvatarBadge
            boxSize="14px"
            bg="#2563EB"
            borderColor="white"
            borderWidth="2px"
          >
            <Box className="typing-dots" px="1px">
              <span className="typing-dot" style={{ width: 2, height: 2, background: "white" }} />
              <span className="typing-dot" style={{ width: 2, height: 2, background: "white" }} />
            </Box>
          </AvatarBadge>
        )}
      </Avatar>
    </Box>
  );
};

export default UserAvatar;
