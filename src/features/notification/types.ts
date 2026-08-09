/**
 * 알림 도메인 타입. (.ai/API.md 74~78 · 알림 도메인 공통)
 *
 * ⚠️ **`isRead` 같은 boolean 이 없다.** `readAt` 이 `null` 이면 안 읽음이다.
 */

/**
 * 알림 종류. 아이콘 · 분류의 근거다.
 *
 * ❗ 전체 목록을 받지 못했다 — 확인된 것은 결재 3종뿐이고,
 * 시안에는 이슈 배정 · 새 댓글도 있어 더 있을 것으로 본다.
 * 그래서 **문자열로 열어 둔다** — 모르는 값이 와도 화면이 기본 아이콘으로 떨어진다.
 */
export type NotificationType =
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_REJECTED'
  | 'APPROVAL_COMPLETED'
  | (string & {});

/** 알림 한 줄 (.ai/API.md 74) */
export interface NotificationItem {
  notificationId: number;
  notificationType: NotificationType;
  /** 예: `결재 요청` */
  title: string;
  message: string;
  /** ⚠️ **null 이면 안 읽음.** 읽음 여부를 이 값으로만 판정한다 */
  readAt: string | null;
  createdAt: string;
}

/** 알림 목록 응답 봉투. 결재와 같이 `page` · `size` 는 오지 않는다 */
export interface NotificationPage {
  content: NotificationItem[];
  /** 헤더 배지 숫자 — 목록 길이가 아니라 이 값을 쓴다 (`size` 에 잘린다) */
  totalElements: number;
  totalPages: number;
}

/** GET /notifications 쿼리. 값이 있는 것만 실어 보낸다 */
export interface NotificationQuery {
  /** `notificationType` 의 접두어 — 예: `APPROVAL`. 미지정이면 전체 */
  category?: string;
  /** 안 읽음만 보려면 `false` */
  isRead?: boolean;
  /** **0부터** 시작한다 */
  page?: number;
  /** 기본 10, 최대 100 */
  size?: number;
}

/**
 * 알림 클릭 시 이동 대상 (.ai/API.md 75).
 *
 * 도메인을 가리지 않는 모양이라 **경로는 프론트가 조립한다.**
 * 이동할 곳이 없으면 `type: 'NONE'` 으로 오고, 그것도 정상 응답(200)이다.
 *
 * ❗ `type` 의 전체 목록 미확인 — 확인된 값은 `APPROVAL` · `NONE` 뿐이다.
 */
export interface NotificationTarget {
  type: 'APPROVAL' | 'NONE' | (string & {});
  targetId: number | null;
  /** 도메인별 덤. 없으면 null */
  extra: Record<string, string> | null;
}

/** PATCH /notifications/{id}/read — 멱등이라 이미 읽었어도 200 이다 */
export interface ReadNotificationResponse {
  notificationId: number;
  readAt: string;
}

/** 읽음 여부는 `readAt` 하나로만 판정한다 — 여기저기서 다시 쓰지 않게 모아 둔다 */
export function isUnread(notification: NotificationItem) {
  return notification.readAt === null;
}
