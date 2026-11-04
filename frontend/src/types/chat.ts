export interface IUser {
  _id: string;
  name: string;
  email: string;
  pic?: string;
  token?: string;
  bio?: string;
  about?: string;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IReaction {
  user: IUser | string;
  emoji: string;
  createdAt?: string;
}

export interface IMessage {
  _id: string;
  sender: IUser;
  content: string;
  chat: IChat | string;
  mediaType?: "text" | "image" | "video" | "audio" | "file";
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  audioDuration?: number;
  replyTo?: IMessage | null;
  isStarred?: boolean;
  isPinned?: boolean;
  deletedFor?: string[];
  reactions?: IReaction[];
  status?: "sent" | "delivered" | "seen" | "pending";
  deliveredTo?: string[];
  readBy?: string[];
  createdAt?: string;
  updatedAt?: string;
  tempId?: string;
  isPending?: boolean;
  chatId?: string;
}

export interface IChat {
  _id: string;
  chatName: string;
  isGroupChat: boolean;
  users: IUser[];
  latestMessage?: IMessage;
  groupAdmin?: IUser;
  pinnedBy?: string[];
  mutedBy?: string[];
  favorites?: string[];
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

