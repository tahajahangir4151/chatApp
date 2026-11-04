import { IMessage, IUser } from "@/types/chat";

export const getSender = (
  loggedUser: any,
  users: IUser[] = []
): string => {
  if (!users || !users.length) return "";
  const loggedId = loggedUser?.data?._id || loggedUser?._id;
  if (!loggedId) return users[0]?.name || "";
  return users[0]?._id === loggedId
    ? users[1]?.name || users[0]?.name || ""
    : users[0]?.name || "";
};

export const getSenderFull = (
  loggedUser: any,
  users: IUser[] = []
): IUser | Record<string, any> => {
  if (!users || !users.length) return {};
  const loggedId = loggedUser?.data?._id || loggedUser?._id;
  if (!loggedId) return users[0] || {};
  return users[0]?._id === loggedId
    ? users[1] || users[0] || {}
    : users[0] || {};
};

export const isSameSender = (
  messages: IMessage[],
  m: IMessage,
  i: number,
  userId: string
): boolean => {
  return (
    i < messages.length - 1 &&
    (messages[i + 1]?.sender?._id !== m?.sender?._id ||
      messages[i + 1]?.sender?._id === undefined) &&
    m?.sender?._id !== userId
  );
};

export const isLastMessage = (
  messages: IMessage[],
  i: number,
  userId: string
): boolean => {
  return (
    i === messages.length - 1 &&
    messages[messages.length - 1]?.sender?._id !== userId &&
    Boolean(messages[messages.length - 1]?.sender?._id)
  );
};

export const isSameSenderMargin = (
  messages: IMessage[],
  m: IMessage,
  i: number,
  userId: string
): number | "auto" => {
  if (
    i < messages.length - 1 &&
    messages[i + 1]?.sender?._id === m?.sender?._id &&
    m?.sender?._id !== userId
  )
    return 33;
  else if (
    (i < messages.length - 1 &&
      messages[i + 1]?.sender?._id !== m?.sender?._id &&
      m?.sender?._id !== userId) ||
    (i === messages.length - 1 && m?.sender?._id !== userId)
  )
    return 0;
  else return "auto";
};

export const isSameUser = (
  messages: IMessage[],
  m: IMessage,
  i: number
): boolean => {
  return i > 0 && messages[i - 1]?.sender?._id === m?.sender?._id;
};

