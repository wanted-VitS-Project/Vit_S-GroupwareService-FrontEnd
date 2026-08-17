'use client';

import { useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import Modal from '@/components/Modal';
import { messageOf } from '@/lib/api';

import { updateTextBlock } from './api';
import BlockTypeIcon from './BlockTypeIcon';
import { isTextVersionConflict, NO_VERSION_MESSAGE } from './errorCodes';
import MarkdownEditor from './MarkdownEditor';
import {
  clearTextDrafts,
  draftPreview,
  formatDraftTime,
  loadTextDrafts,
  MAX_TEXT_DRAFTS,
  removeTextDraft,
  removeTextDraftsWhere,
  saveTextDraft,
  type TextDraft,
} from './textDraft';

interface TextBlockModalProps {
  /** 헤더에 노출할 블록 제목 */
  blockTitle: string;
  txtId: number;
  /** 마크다운 원문 */
  initialContent: string;
  /**
   * 낙관적 락 버전 — 블록 목록의 `detail.version`.
   * 없으면 저장을 막고 새로고침을 안내한다.
   */
  version?: number;
  onClose: () => void;
  /** 저장 성공 시 화면에 반영할 내용 · 새 버전 */
  onSaved: (content: string, version?: number) => void;
  /** 409 에서 `재조회` 를 골랐을 때 — 블록 목록을 다시 읽게 한다 */
  onRefetch: () => void;
}

/**
 * 텍스트 블록 편집 모달.
 * 생성 직후에도 같은 모달이 곧바로 열린다 (빈 내용으로 시작).
 *
 * ⚠️ **낙관적 락** (2026-08-11) — 받은 `version` 을 실어 보내고, 409 면 조용히 삼키지 않고
 *    **재조회 / 덮어쓰기**를 묻는다. 취소(Esc · 배경)를 재조회에 둬 잘못 눌러도 남의 값이
 *    지워지지 않게 한다 (`StageFormModal` 과 같은 방침).
 *
 * 💾 **임시저장** (2026-08-12) — 편집 중인 본문을 `localStorage` 에 남긴다 (`textDraft.ts`).
 *    저장하지 않고 나가거나 **충돌로 저장이 막혔을 때** 쓴 글을 잃지 않게 하는 장치다.
 *    되살릴지 · 버릴지는 **언제나 사용자가 고른다** — 초안을 조용히 덮어씌우면 서버 본문이
 *    남의 최신 내용일 때 그것을 못 본 채 지우게 된다.
 *
 * 🔕 **묻는 자리는 이탈 한 곳뿐** (2026-08-17) — 타이핑 중 자동으로 남기지 않는다.
 *    자동저장은 사용자가 만들지 않은 초안을 임시저장함에 계속 밀어넣어, 정작 직접 남긴
 *    초안을 찾기 어렵게 했다. 대신 **나갈 때 한 번** 묻고, 지금 내용이 이미 임시저장함에
 *    있으면(=`임시저장` 을 누른 뒤 고친 게 없으면) **묻지 않고 그냥 닫는다** — 이미 안전한데
 *    한 번 더 묻는 것은 사용자를 훈련시켜 확인창을 읽지 않게 만든다.
 */
export default function TextBlockModal({
  blockTitle,
  txtId,
  initialContent,
  version,
  onClose,
  onSaved,
  onRefetch,
}: TextBlockModalProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmation, setConfirmation] = useState<
    'save' | 'leave' | 'conflict' | null
  >(null);
  /** TipTap이 최초로 파싱·직렬화한 값 — 원문 표기 차이를 수정으로 오인하지 않는다. */
  const [normalizedInitialContent, setNormalizedInitialContent] = useState<
    string | null
  >(null);
  /**
   * 임시저장함. **자동으로 적용하지 않는다** — 어느 것을 되살릴지 사용자가 고른다.
   * (열자마자 한 번 읽고, 이후에는 이 화면이 남기고 지운 결과로만 갱신한다)
   */
  const [drafts, setDrafts] = useState<TextDraft[]>(() =>
    loadTextDrafts(txtId),
  );
  /** 임시저장함 목록을 펼쳤는지 */
  const [isBoxOpen, setIsBoxOpen] = useState(false);
  /** 열 때 이미 있던 초안 수 — 배너를 접었는지와 무관하게 "복구할 게 있다" 를 판단한다 */
  const [dismissedBanner, setDismissedBanner] = useState(false);
  /** 저장소에 쓰지 못했다 (사생활 보호 모드 · 용량 초과) */
  const [draftFailed, setDraftFailed] = useState(false);
  /**
   * 에디터를 다시 마운트시키는 열쇠.
   *
   * ⚠️ `MarkdownEditor` 는 `useEditor({ content })` 로 **처음 값만** 읽는다 —
   *    `value` 를 바꿔도 화면이 따라오지 않아, 초안을 되살릴 때는 통째로 다시 만든다.
   */
  const [editorKey, setEditorKey] = useState(0);

  const isDirty =
    normalizedInitialContent !== null && content !== normalizedInitialContent;

  /**
   * 지금 편집 중인 내용과 **똑같은 초안** — 있으면 나가도 잃을 게 없다.
   * (`임시저장` 을 누른 뒤 손대지 않았거나, 초안을 되살린 직후)
   */
  const keptDraft = drafts.find((draft) => draft.content === content) ?? null;
  /** 지금 화면과 다른 초안만 되살릴 값이 있다 */
  const restorable = drafts.filter((draft) => draft.content !== content);
  /** 배너로 권할 최근 초안 */
  const latestDraft = restorable[0] ?? null;

  /** 초안을 뜬 뒤 남이 본문을 고쳤나 — 되살리면 그 변경을 덮어쓰게 된다 */
  function isStale(draft: TextDraft) {
    return (
      draft.version !== undefined &&
      version !== undefined &&
      draft.version !== version
    );
  }

  /** 초안을 편집기에 되살린다 */
  function restoreDraft(draft: TextDraft) {
    setContent(draft.content);
    setIsBoxOpen(false);
    setDismissedBanner(true);
    // 에디터를 다시 만들어야 되살린 본문이 화면에 뜬다
    setEditorKey((key) => key + 1);
  }

  /** 임시저장함에서 한 칸을 지운다 */
  function deleteDraft(id: string) {
    const remaining = removeTextDraft(txtId, id);
    if (remaining) setDrafts(remaining);
    else setDraftFailed(true);
  }

  /** 임시저장함을 비운다 */
  function emptyBox() {
    clearTextDrafts(txtId);
    setDrafts([]);
    setIsBoxOpen(false);
  }

  /** 지금 편집 중인 내용을 임시저장함에 남긴다. 나가기 · 충돌 때도 이 경로를 쓴다 */
  function keepDraft() {
    const saved = saveTextDraft(txtId, { content, version });
    setDraftFailed(saved === null);
    if (saved) setDrafts(saved);
    return saved !== null;
  }

  /**
   * 나가기.
   *
   * ⚠️ 묻는 건 **잃을 게 있을 때만**이다 — 고친 게 없거나(`isDirty`), 지금 내용이 이미
   *    임시저장함에 있으면(`keptDraft`) 확인창 없이 닫는다.
   */
  function requestClose() {
    if (isSaving) return;
    if (isDirty && !keptDraft) setConfirmation('leave');
    else onClose();
  }

  function requestSave() {
    if (isSaving) return;
    if (!isDirty) {
      onClose();
      return;
    }
    setConfirmation('save');
  }

  async function save(overwrite = false) {
    if (isSaving) return;

    setConfirmation(null);

    // 버전 없이 보내면 400 이다 — 요청하지 않고 새로고침을 안내한다
    if (version === undefined) {
      setErrorMessage(NO_VERSION_MESSAGE);
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const updated = await updateTextBlock(txtId, {
        content,
        version,
        ...(overwrite ? { overwrite: true } : {}),
      });
      /*
       * 서버에 들어간 내용과 **같은 초안만** 걷어낸다.
       * 임시저장함을 통째로 비우면 사용자가 따로 남겨 둔 다른 안까지 사라진다 —
       * 그건 사용자가 목록에서 직접 지울 일이다.
       */
      removeTextDraftsWhere(txtId, (draft) => draft.content === content);
      onSaved(updated.content, updated.version);
      onClose();
    } catch (caught) {
      // 남이 먼저 저장했다 — 덮어쓸지 다시 불러올지 묻는다
      if (isTextVersionConflict(caught)) {
        setConfirmation('conflict');
        setIsSaving(false);
        return;
      }

      setErrorMessage(messageOf(caught, '본문을 저장하지 못했습니다.'));
      setIsSaving(false);
    }
  }

  return (
    <>
      <Modal
        title="텍스트 블록 편집"
        // 저장 중에는 ESC · 백드롭 클릭까지 막는다.
        // 닫은 뒤 응답이 도착하면 카드 내용이 예고 없이 바뀐다
        onClose={isSaving ? undefined : requestClose}
        className="flex max-h-[85vh] w-full max-w-[680px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl"
        header={
          <div className="flex shrink-0 items-center gap-2.5 border-b border-border-default px-5 py-3">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-button-sm border border-border-default bg-bg-surface text-gray-text-soft">
              <BlockTypeIcon code="TEXT" />
            </span>
            <h2 className="shrink-0 text-body-m font-semibold text-text-primary">
              텍스트 블록 편집
            </h2>
            <span className="min-w-0 flex-1 truncate font-mono text-caption text-text-secondary">
              {blockTitle}
            </span>
            <button
              type="button"
              onClick={requestClose}
              disabled={isSaving}
              aria-label="닫기"
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CloseIcon />
            </button>
          </div>
        }
      >
        {latestDraft && !dismissedBanner && !isBoxOpen && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-yellow-border bg-yellow-bg-soft px-5 py-2.5">
            <p className="min-w-0 flex-1 text-caption break-keep text-yellow-text">
              <strong className="font-semibold">
                {formatDraftTime(latestDraft.savedAt) || '이전'}
              </strong>
              에 임시저장한 내용이 있습니다
              {restorable.length > 1 && ` (총 ${restorable.length}개)`}.
              {isStale(latestDraft) &&
                ' 그 뒤 다른 사람이 본문을 수정했으니, 되살리면 그 변경을 덮어씁니다.'}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => restoreDraft(latestDraft)}
                className="cursor-pointer rounded-button-md border border-yellow-border bg-bg-card px-2.5 py-1 text-caption font-semibold text-yellow-text hover:bg-yellow-bg"
              >
                이어서 편집
              </button>
              {restorable.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsBoxOpen(true)}
                  className="cursor-pointer rounded-button-md px-2 py-1 text-caption font-medium text-yellow-text hover:bg-yellow-bg"
                >
                  임시저장함 열기
                </button>
              )}
              <button
                type="button"
                onClick={() => setDismissedBanner(true)}
                aria-label="임시저장 안내 닫기"
                className="cursor-pointer rounded-button-md px-2 py-1 text-caption font-medium text-text-secondary hover:bg-bg-hover"
              >
                나중에
              </button>
            </div>
          </div>
        )}

        {isBoxOpen && (
          <div className="max-h-56 shrink-0 overflow-y-auto border-b border-border-default bg-bg-surface px-5 py-3">
            <div className="flex items-center justify-between gap-2 pb-2">
              <h3 className="text-caption font-semibold text-text-primary">
                임시저장함 {drafts.length} / {MAX_TEXT_DRAFTS}
              </h3>
              {drafts.length > 0 && (
                <button
                  type="button"
                  onClick={emptyBox}
                  className="cursor-pointer rounded-button-md px-2 py-0.5 text-caption font-medium text-text-secondary hover:bg-red-bg-soft hover:text-text-danger"
                >
                  전체 비우기
                </button>
              )}
            </div>

            {drafts.length === 0 ? (
              <p className="py-3 text-caption text-text-secondary">
                임시저장한 내용이 없습니다. `임시저장` 을 누르거나, 저장하지 않고
                나갈 때 남겨 두면 여기에 쌓입니다.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {drafts.map((draft) => {
                  const isCurrent = draft.content === content;

                  return (
                    <li
                      key={draft.id}
                      className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-card px-2.5 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-micro text-text-secondary">
                          {formatDraftTime(draft.savedAt)}
                          {isStale(draft) && (
                            <span className="text-yellow-text">
                              · 이후 서버 본문 변경됨
                            </span>
                          )}
                          {isCurrent && <span>· 지금 편집 중인 내용</span>}
                        </p>
                        <p className="truncate pt-0.5 text-detail text-text-primary">
                          {draftPreview(draft.content)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isCurrent}
                        onClick={() => restoreDraft(draft)}
                        className="shrink-0 cursor-pointer rounded-button-md border border-border-default px-2 py-1 text-caption font-medium text-text-primary-blue hover:bg-blue-bg-soft disabled:cursor-not-allowed disabled:border-transparent disabled:text-text-muted"
                      >
                        이어서 편집
                      </button>
                      <button
                        type="button"
                        aria-label={`${formatDraftTime(draft.savedAt)} 임시저장 삭제`}
                        onClick={() => deleteDraft(draft.id)}
                        className="shrink-0 cursor-pointer rounded-button-md px-1.5 py-1 text-caption font-medium text-text-secondary hover:bg-red-bg-soft hover:text-text-danger"
                      >
                        삭제
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <MarkdownEditor
          key={editorKey}
          value={content}
          onChange={setContent}
          onReady={(normalized) => {
            setContent(normalized);
            // 비교 기준은 **첫 마운트의 서버 본문**이다. 초안을 되살려 다시 만든
            // 에디터의 값으로 갈아치우면 되살린 내용이 "수정 없음" 이 되어 저장이 막힌다
            setNormalizedInitialContent((previous) => previous ?? normalized);
          }}
        />

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-border-default bg-bg-surface px-5 py-3">
          <p
            role={errorMessage ? 'alert' : undefined}
            className={`min-w-0 text-caption ${
              errorMessage ? 'text-text-danger' : 'text-text-secondary'
            }`}
          >
            {errorMessage ||
              (draftFailed
                ? '이 브라우저에 임시저장할 수 없습니다 — 저장 전에 창을 닫지 마세요.'
                : keptDraft
                  ? `임시저장됨 ${formatDraftTime(keptDraft.savedAt)} · 저장 전까지 이 브라우저에만 남습니다`
                  : '선택 후 툴바 버튼을 클릭하거나 Ctrl+B / Ctrl+I 단축키를 사용하세요')}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBoxOpen((open) => !open)}
              className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-detail font-medium hover:bg-bg-hover ${
                isBoxOpen ? 'text-text-primary-blue' : 'text-text-secondary'
              }`}
            >
              임시저장함
              {drafts.length > 0 && ` ${drafts.length}`}
            </button>
            <button
              type="button"
              onClick={keepDraft}
              // 이미 같은 내용이 임시저장함에 있으면 더 남길 게 없다
              disabled={isSaving || !isDirty || keptDraft !== null}
              title={
                keptDraft
                  ? '지금 내용은 이미 임시저장돼 있습니다'
                  : '이 브라우저에만 남깁니다'
              }
              className="cursor-pointer rounded-lg border border-border-default px-3 py-1.5 text-detail font-medium text-text-primary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {keptDraft ? '임시저장됨' : '임시저장'}
            </button>
            <button
              type="button"
              onClick={requestClose}
              disabled={isSaving}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-detail font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              취소
            </button>
            <button
              type="button"
              onClick={requestSave}
              disabled={isSaving}
              className="btn btn-md btn-primary min-w-[104px]"
            >
              {isSaving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </Modal>
      {confirmation === 'save' && (
        <AlertDialogTwoButton
          icon={DialogIcons.info}
          title="변경사항을 저장할까요?"
          description="편집한 텍스트 블록 본문을 저장합니다."
          confirmLabel="저장"
          onConfirm={() => void save()}
          onCancel={() => setConfirmation(null)}
        />
      )}
      {confirmation === 'conflict' && (
        /*
         * 409 를 조용히 삼키면 사용자는 저장된 줄 안다.
         * 선택지가 셋이라 `AlertDialogTwoButton` 을 쓰지 못한다 — **임시저장**이 있어야
         * "덮어쓰기는 부담스럽고 내 글도 버리기 싫다" 는 자리가 생긴다.
         */
        <ChoiceDialog
          title="다른 사람이 먼저 저장했습니다"
          description="그 사이 이 본문이 수정됐습니다. 내 내용으로 덮어쓰거나, 지금 쓴 글을 임시저장해 두고 최신 본문을 받을 수 있습니다."
          choices={[
            {
              label: '덮어쓰기',
              hint: '내 내용으로 저장합니다',
              tone: 'danger',
              onSelect: () => void save(true),
            },
            {
              label: '임시저장하고 다시 불러오기',
              hint: '내 글은 이 브라우저에 남고, 최신 본문을 받습니다',
              tone: 'primary',
              onSelect: () => {
                keepDraft();
                setConfirmation(null);
                onRefetch();
                onClose();
              },
            },
            {
              label: '계속 편집',
              onSelect: () => setConfirmation(null),
            },
          ]}
          onDismiss={() => setConfirmation(null)}
        />
      )}
      {confirmation === 'leave' && (
        <ChoiceDialog
          title="편집을 마칠까요?"
          description="아직 서버에 저장하지 않았습니다. 임시저장해 두면 다음에 이 블록을 열 때 이어서 쓸 수 있습니다."
          choices={[
            {
              label: '임시저장하고 나가기',
              hint: '이 브라우저에만 남습니다',
              tone: 'primary',
              onSelect: () => {
                const kept = keepDraft();
                setConfirmation(null);
                // 남기지 못했으면 닫지 않는다 — 닫으면 글이 사라진다
                if (kept) onClose();
              },
            },
            {
              label: '저장 안 하고 나가기',
              hint:
                drafts.length > 0
                  ? `지금 변경사항은 사라집니다 (임시저장함 ${drafts.length}개는 남습니다)`
                  : '지금 변경사항은 사라집니다',
              tone: 'danger',
              /*
               * 임시저장함은 건드리지 않는다 — 담긴 초안은 모두 사용자가 남긴 것이라
               * "이번 편집 버리기" 로 없애면 안 된다. 비우기는 `전체 비우기` 가 맡는다.
               */
              onSelect: onClose,
            },
            {
              label: '계속 편집',
              onSelect: () => setConfirmation(null),
            },
          ]}
          onDismiss={() => setConfirmation(null)}
        />
      )}
    </>
  );
}

interface Choice {
  label: string;
  /** 버튼 아래 한 줄 설명 — 무엇이 남고 무엇이 사라지는지 */
  hint?: string;
  tone?: 'primary' | 'danger';
  onSelect: () => void;
}

/**
 * 선택지가 **셋 이상**인 확인 창.
 *
 * `AlertDialogTwoButton` 은 확인 · 취소 둘뿐이라, "저장 / 임시저장 / 계속 편집" 처럼
 * 세 갈래인 자리에는 쓸 수 없다. 버튼을 세로로 쌓아 각 선택의 결과를 한 줄씩 적는다 —
 * 무엇이 사라지는지 모르고 고르게 하면 안 된다.
 *
 * ⚠️ Esc · 배경 클릭은 **가장 안전한 쪽**(계속 편집)으로 흐른다 — 실수로 눌러 글이 날아가면 안 된다.
 */
function ChoiceDialog({
  title,
  description,
  choices,
  onDismiss,
}: {
  title: string;
  description: string;
  choices: Choice[];
  onDismiss: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onDismiss}
      dismissOnBackdrop={false}
      className="w-full max-w-[420px] rounded-base border border-border-default p-5 shadow-2xl"
      header={
        <div className="pb-3">
          <h2 className="text-body-m font-semibold text-text-primary">
            {title}
          </h2>
          <p className="pt-1.5 text-detail leading-relaxed break-keep text-text-secondary">
            {description}
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        {choices.map((choice) => (
          <button
            key={choice.label}
            type="button"
            onClick={choice.onSelect}
            className={`flex cursor-pointer flex-col items-start gap-0.5 rounded-lg border px-3.5 py-2.5 text-left ${
              choice.tone === 'primary'
                ? 'border-border-primary bg-blue-bg-soft hover:bg-blue-bg'
                : choice.tone === 'danger'
                  ? 'border-red-border bg-bg-card hover:bg-red-bg-soft'
                  : 'border-border-default bg-bg-card hover:bg-bg-hover'
            }`}
          >
            <span
              className={`text-detail font-semibold ${
                choice.tone === 'danger'
                  ? 'text-text-danger'
                  : 'text-text-primary'
              }`}
            >
              {choice.label}
            </span>
            {choice.hint && (
              <span className="text-caption break-keep text-text-secondary">
                {choice.hint}
              </span>
            )}
          </button>
        ))}
      </div>
    </Modal>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      className="size-3.5"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
