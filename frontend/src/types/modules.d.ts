declare module "fix-webm-duration" {
  export default function fixWebmDuration(
    blob: Blob,
    duration: number,
    callbackOrOptions?: any
  ): Promise<Blob>;
}

declare module "react-scrollable-feed" {
  import { Component, ReactNode } from "react";
  interface ScrollableFeedProps {
    children?: ReactNode;
    forceScroll?: boolean;
    onScroll?: (isAtBottom: boolean) => void;
    className?: string;
  }
  export default class ScrollableFeed extends Component<ScrollableFeedProps> { }
}

declare module "react-notification-badge" {
  import { Component, ReactNode } from "react";
  export const Effect: {
    SCALE: any;
    ROTATE_X: any;
    ROTATE_Y: any;
  };
  interface NotificationBadgeProps {
    count: number;
    effect?: any[];
    style?: React.CSSProperties;
    className?: string;
  }
  export default class NotificationBadge extends Component<NotificationBadgeProps> { }
}

declare module "*.css";


