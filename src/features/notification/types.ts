/**
 * 알림 도메인 타입 (.ai/API.md 79~83).
 * 읽음 여부 boolean 은 없고 readAt 이 null 이면 안 읽음이다.
 */

/**
 * 알림 종류. 아이콘 · 분류의 근거다.
 * 전체 목록이 확정되지 않아 문자열로 열어 두고 모르는 값은 기본 처리한다.
 */
export type NotificationType =
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_REJECTED'
  | 'APPROVAL_COMPLETED'
  | (string & {});

/** 알림 한 줄 (.ai/API.md 79) */
export interface NotificationItem {
  notificationId: number;
  notificationType: NotificationType;
  title: string;
  message: string;
  /** null 이면 안 읽음. 읽음 여부를 이 값으로만 판정한다 */
  readAt: string | null;
  createdAt: string;
}

/** 알림 목록 응답 봉투. page · size 는 오지 않는다 */
export interface NotificationPage {
  content: NotificationItem[];
  /** 헤더 배지 숫자. 목록 길이 대신 이 값을 쓴다 */
  totalElements: number;
  totalPages: number;
}

/** GET /notifications 쿼리. 값이 있는 것만 실어 보낸다 */
export interface NotificationQuery {
  /** notificationType 의 접두어. 미지정이면 전체 */
  category?: string;
  /** 안 읽음만 보려면 false */
  isRead?: boolean;
  /** 0부터 시작한다 */
  page?: number;
  /** 기본 10, 최대 100 */
  size?: number;
}

/**
 * 알림 클릭 시 이동 대상 (.ai/API.md 80).
 * 경로는 프론트가 조립하며 갈 곳이 없으면 type 이 NONE 으로 온다.
 */
export interface NotificationTarget {
  type: 'APPROVAL' | 'ISSUE' | 'NONE' | (string & {});
  targetId: number | null;
  /** 도메인별 부가 정보. 명세와 달리 값이 숫자로 오기도 한다 */
  extra: Record<string, string | number> | null;
}

/** 읽음 처리 응답. 이미 읽은 알림도 성공한다 */
export interface ReadNotificationResponse {
  notificationId: number;
  readAt: string;
}

/** 읽음 여부는 readAt 하나로만 판정한다 */
export function isUnread(notification: NotificationItem) {
  return notification.readAt === null;
}
