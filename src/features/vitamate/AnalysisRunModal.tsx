'use client';

import { useEffect, useRef, useState } from 'react';

import Modal from '@/components/Modal';
import { ModalFooter } from '@/components/PanelModal';
import { extensionLabel, extensionStyle } from '@/features/file/format';
import type { ProjectFileVersion } from '@/features/file/types';
import { useProjectFileVersions } from '@/features/file/useProjectFileVersions';
import { ApiError, messageOf } from '@/lib/api';

import { createAnalysis, getReviewTemplates, newIdempotencyKey } from './api';
import FileVersionPickerModal from './FileVersionPickerModal';
import {
  type Analysis,
  buildDefaultPrompt,
  type CreateAnalysisRequest,
  type DocumentRole,
  PROMPT_MAX_LENGTH,
  type ReviewType,
  ROLE_LABEL,
} from './types';

/**
 * 비타메이트 분석 실행 · 수정 화면.
 *
 * 사용자는 프롬프트를 백지에서 쓰지 않는다 — 카테고리를 고르면 서버가 준
 * `exampleText` 가 입력창에 채워지고, 그걸 확인·보완하는 흐름이다.
 * 이미 손댄 프롬프트는 카테고리를 더 골라도 덮어쓰지 않는다.
 *
 * `previous` 를 주면 그 분석의 설정을 그대로 되살린다 (수정 · 재실행).
 */
export default function AnalysisRunModal({
  blockId,
  projectId,
  previous,
  onRequested,
  onClose,
}: {
  blockId: number;
  projectId: string;
  /** 직전 분석 — 없으면 처음 실행이다 */
  previous: Analysis | null;
  onRequested: (analysisId: number) => void;
  onClose: () => void;
}) {
  const [reviewTypes, setReviewTypes] = useState<ReviewType[] | null>(null);
  /** 인덱싱이 끝나면 목록이 알아서 갱신된다 (읽는 중인 문서가 없으면 폴링 안 함) */
  const {
    versions,
    loadError: versionsError,
    isIndexing,
  } = useProjectFileVersions(projectId);

  const [selectedType, setSelectedType] = useState(previous?.reviewType ?? '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    previous?.reviewCategoryCodes ?? [],
  );
  const [prompt, setPrompt] = useState(previous?.prompt ?? '');
  /** 사용자가 프롬프트를 직접 건드렸는지 — 건드린 뒤에는 자동으로 안 바꾼다 */
  const isPromptTouched = useRef(Boolean(previous?.prompt));

  const [referenceIds, setReferenceIds] = useState<number[]>(() =>
    idsOf(previous, 'REFERENCE'),
  );
  const [targetIds, setTargetIds] = useState<number[]>(() =>
    idsOf(previous, 'TARGET'),
  );
  /** 열려 있는 문서 선택 모달의 역할 */
  const [pickerRole, setPickerRole] = useState<DocumentRole | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  /**
   * 중복 방지 키. **보낸 내용이 그대로면 키도 그대로** 유지해야
   * 네트워크가 끊겨 다시 눌렀을 때 분석이 두 건 생기지 않는다.
   * 내용이 바뀌면 새 분석이므로 키를 새로 만든다 (같은 키 + 다른 내용은 409).
   */
  const lastSent = useRef<{ key: string; body: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // 공유 캐시라 취소되지 않는다 — 받은 뒤 이 화면이 아직 살아 있는지 본다
    getReviewTemplates()
      .then((data) => {
        if (!signal.aborted) setReviewTypes(data);
      })
      .catch(() => {
        if (!signal.aborted) setReviewTypes([]);
      });

    return () => controller.abort();
  }, []);

  /**
   * 전송 중에는 닫지 않는다.
   *
   * 닫아 버리면 `202` 응답이 **사라진 화면으로** 돌아온다 — 서버에는 분석이
   * 만들어졌는데 프론트는 그 `analysisId` 를 몰라, 블록이 옛 결과를 계속 보여준다.
   * ESC · 배경 클릭도 이 함수를 거친다.
   */
  function requestClose() {
    if (isSubmitting) return;
    onClose();
  }

  /**
   * 유형이 하나뿐이면 고를 것이 없다 — 탭을 눌러야 진행되는 화면을 만들지 않는다.
   * state 로 밀어 넣지 않고 계산으로 둔다 (목록이 늦게 와도 한 번에 맞는다).
   */
  const effectiveType =
    selectedType ||
    (reviewTypes?.length === 1 ? reviewTypes[0].reviewType : '');

  const currentType =
    reviewTypes?.find((type) => type.reviewType === effectiveType) ?? null;
  const categories = currentType?.categories ?? [];

  function toggleCategory(code: string) {
    const next = selectedCategories.includes(code)
      ? selectedCategories.filter((selected) => selected !== code)
      : [...selectedCategories, code];

    setSelectedCategories(next);

    // 사용자가 쓴 글을 지우지 않는다. 아직 안 건드렸을 때만 기본값을 채운다
    if (isPromptTouched.current) return;
    setPrompt(
      buildDefaultPrompt(
        categories.filter((category) => next.includes(category.categoryCode)),
      ),
    );
  }

  function changeType(reviewType: string) {
    setSelectedType(reviewType);
    // 카테고리는 유형 안에서만 뜻이 있다 — 유형이 바뀌면 같이 비운다
    setSelectedCategories([]);
    if (!isPromptTouched.current) setPrompt('');
  }

  const trimmedPrompt = prompt.trim();
  const blocker = findBlocker({
    selectedType: effectiveType,
    selectedCategories,
    referenceIds,
    targetIds,
    prompt: trimmedPrompt,
  });

  async function submit() {
    if (blocker || isSubmitting) return;

    const body: CreateAnalysisRequest = {
      referenceFileVersionIds: referenceIds,
      targetFileVersionIds: targetIds,
      reviewType: effectiveType,
      reviewCategoryCodes: selectedCategories,
      prompt: trimmedPrompt,
    };

    const signature = JSON.stringify(body);
    const key =
      lastSent.current?.body === signature
        ? lastSent.current.key
        : newIdempotencyKey();
    lastSent.current = { key, body: signature };

    setIsSubmitting(true);
    setError('');

    try {
      const created = await createAnalysis(blockId, body, key);
      onRequested(created.analysisId);
    } catch (caught) {
      // 같은 키로 내용이 다른 요청이 이미 처리 중이다
      if (caught instanceof ApiError && caught.status === 409) {
        setError(
          '이미 다른 분석 요청이 처리 중입니다. 잠시 후 다시 시도해주세요.',
        );
      } else {
        setError(messageOf(caught, '분석을 요청하지 못했습니다.'));
      }
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title="비타메이트 검토 실행"
      onClose={requestClose}
      /*
       * 높이를 **고정**한다. 목록이 늦게 오거나 카테고리 · 문서 칩이 늘고 줄 때마다
       * 패널이 커졌다 작아지면 버튼 위치가 흔들려 잘못 누르게 된다.
       * 남거나 모자란 만큼은 본문이 안에서 스크롤한다.
       */
      className="flex h-[560px] max-h-[85vh] w-full max-w-[620px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl"
      header={
        <div className="flex items-center justify-between gap-2 border-b border-border-default px-5 py-3.5">
          <h2 className="text-body-m font-semibold text-text-primary">
            비타메이트 검토 실행
          </h2>
          <button
            type="button"
            onClick={requestClose}
            disabled={isSubmitting}
            aria-label="닫기"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            ✕
          </button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        <Field label="검토 유형">
          {reviewTypes === null ? (
            <div
              aria-hidden
              className="h-7 animate-pulse rounded-button-sm bg-bg-hover"
            />
          ) : reviewTypes.length === 0 ? (
            <p className="text-caption text-text-secondary">
              검토 유형을 불러오지 못했습니다.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {/*
                탭이 아니라 **값 하나를 고르는** 컨트롤이다. `role="tab"` 을 쓰면
                스크린리더가 연결된 tabpanel · 방향키 이동 · roving tabindex 를
                기대하는데 그 동작이 없어 오히려 혼란스럽다. 눌린 상태만 알린다.
              */}
              {reviewTypes.map((type) => (
                <button
                  key={type.reviewType}
                  type="button"
                  aria-pressed={type.reviewType === effectiveType}
                  title={type.description}
                  onClick={() => changeType(type.reviewType)}
                  className={`cursor-pointer rounded-button-md border px-2.5 py-1 text-detail font-medium ${
                    type.reviewType === effectiveType
                      ? 'border-[#4F39F6] bg-blue-bg-soft text-[#4F39F6]'
                      : 'border-border-default text-text-secondary hover:bg-bg-surface'
                  }`}
                >
                  {type.reviewTypeName}
                </button>
              ))}
            </div>
          )}
        </Field>

        {currentType && (
          <Field label="세부 카테고리" hint="여러 개 고를 수 있어요">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((category) => (
                <label
                  key={category.categoryCode}
                  title={category.guideText}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-button-md border px-2.5 py-1 text-detail ${
                    selectedCategories.includes(category.categoryCode)
                      ? 'border-[#4F39F6] bg-blue-bg-soft text-[#4F39F6]'
                      : 'border-border-default text-text-secondary hover:bg-bg-surface'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.categoryCode)}
                    onChange={() => toggleCategory(category.categoryCode)}
                    className="size-3 accent-[#4F39F6]"
                  />
                  {category.categoryName}
                </label>
              ))}
            </div>
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <DocumentField
            role="REFERENCE"
            ids={referenceIds}
            versions={versions}
            onPick={() => setPickerRole('REFERENCE')}
            onRemove={(id) =>
              setReferenceIds((previousIds) =>
                previousIds.filter((current) => current !== id),
              )
            }
          />
          <DocumentField
            role="TARGET"
            ids={targetIds}
            versions={versions}
            onPick={() => setPickerRole('TARGET')}
            onRemove={(id) =>
              setTargetIds((previousIds) =>
                previousIds.filter((current) => current !== id),
              )
            }
          />
        </div>
        {versionsError && (
          <p className="text-caption text-text-danger">{versionsError}</p>
        )}

        {/* 카운터는 `maxLength` 와 같은 기준(원문 길이)이어야 한다 — 공백을 뺀 수를
            보여주면 2000 미만인데도 입력이 막혀 고장으로 보인다 */}
        <Field
          label="프롬프트"
          hint={`${prompt.length} / ${PROMPT_MAX_LENGTH}`}
        >
          <textarea
            rows={5}
            aria-label="프롬프트"
            value={prompt}
            maxLength={PROMPT_MAX_LENGTH}
            onChange={(event) => {
              isPromptTouched.current = true;
              setPrompt(event.target.value);
            }}
            placeholder="카테고리를 고르면 기본 문구가 채워져요. 필요한 만큼 고쳐서 쓰세요."
            className="w-full resize-none rounded-button-md border border-border-default bg-bg-surface px-2.5 py-2 text-detail leading-relaxed text-text-primary focus:border-[#4F39F6] focus:outline-none"
          />
          {currentType && selectedCategories.length > 0 && (
            <ul className="mt-1 flex flex-col gap-0.5">
              {categories
                .filter((category) =>
                  selectedCategories.includes(category.categoryCode),
                )
                .filter((category) => category.guideText)
                .map((category) => (
                  <li
                    key={category.categoryCode}
                    className="text-micro break-keep text-text-secondary"
                  >
                    · {category.guideText}
                  </li>
                ))}
            </ul>
          )}
        </Field>

        {error && (
          <p role="alert" className="text-detail text-text-danger">
            {error}
          </p>
        )}
      </div>

      <ModalFooter>
        {/* 줄바꿈되면 푸터 높이가 늘어 버튼이 밀린다 — 한 줄로 묶는다 */}
        {blocker && (
          <span className="mr-auto min-w-0 truncate text-caption text-text-secondary">
            {blocker}
          </span>
        )}
        <button
          type="button"
          onClick={requestClose}
          disabled={isSubmitting}
          className="cursor-pointer rounded-button-md border border-border-default px-3 py-1.5 text-detail font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={Boolean(blocker) || isSubmitting}
          className="cursor-pointer rounded-button-md bg-[#4F39F6] px-3 py-1.5 text-detail font-semibold text-text-white hover:bg-[#4429E0] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? '요청 중…' : '실행하기'}
        </button>
      </ModalFooter>

      {pickerRole && (
        <FileVersionPickerModal
          versions={versions}
          loadError={versionsError}
          isIndexing={isIndexing}
          role={pickerRole}
          selectedIds={pickerRole === 'REFERENCE' ? referenceIds : targetIds}
          takenIds={pickerRole === 'REFERENCE' ? targetIds : referenceIds}
          onConfirm={(ids) => {
            if (pickerRole === 'REFERENCE') setReferenceIds(ids);
            else setTargetIds(ids);
            setPickerRole(null);
          }}
          onClose={() => setPickerRole(null)}
        />
      )}
    </Modal>
  );
}

/** 직전 분석에서 그 역할의 파일 버전 ID 만 꺼낸다 */
function idsOf(analysis: Analysis | null, role: DocumentRole) {
  return (analysis?.documents ?? [])
    .filter((document) => document.documentRole === role)
    .map((document) => document.fileVersionId);
}

/**
 * 실행을 막는 첫 번째 이유. 없으면 빈 문자열.
 * 버튼을 흐리게만 두면 왜 안 눌리는지 알 수 없어 문구까지 함께 준다.
 */
function findBlocker({
  selectedType,
  selectedCategories,
  referenceIds,
  targetIds,
  prompt,
}: {
  selectedType: string;
  selectedCategories: string[];
  referenceIds: number[];
  targetIds: number[];
  prompt: string;
}) {
  if (!selectedType) return '검토 유형을 고르세요.';
  if (selectedCategories.length === 0) return '세부 카테고리를 고르세요.';
  if (referenceIds.length === 0) return '기준 문서를 고르세요.';
  if (targetIds.length === 0) return '검토 대상 문서를 고르세요.';
  // 서버도 400 으로 막지만, 실행을 눌러 보고 알게 되면 늦다
  if (referenceIds.some((id) => targetIds.includes(id))) {
    return '같은 문서를 기준과 대상에 함께 둘 수 없어요.';
  }
  if (!prompt) return '프롬프트를 입력하세요.';
  return '';
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <h3 className="text-detail font-semibold text-text-primary">{label}</h3>
        {hint && <span className="text-micro text-text-secondary">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

/** 역할별 문서 선택 칸 — 선택된 버전을 칩으로 늘어놓는다 */
function DocumentField({
  role,
  ids,
  versions,
  onPick,
  onRemove,
}: {
  role: DocumentRole;
  ids: number[];
  versions: ProjectFileVersion[] | null;
  onPick: () => void;
  onRemove: (fileVersionId: number) => void;
}) {
  return (
    <Field label={ROLE_LABEL[role]}>
      <button
        type="button"
        onClick={onPick}
        className="w-full cursor-pointer rounded-button-md border border-dashed border-border-default py-1.5 text-caption font-medium text-text-secondary hover:border-[#4F39F6] hover:text-[#4F39F6]"
      >
        + 문서 선택 {ids.length > 0 && `(${ids.length})`}
      </button>

      {ids.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-1">
          {ids.map((id) => {
            const version =
              versions?.find((current) => current.fileVersionId === id) ?? null;
            const style = extensionStyle(version?.extension ?? '');

            return (
              <li
                key={id}
                className="flex max-w-full items-center gap-1 rounded-button-sm border border-border-default bg-bg-surface py-0.5 pr-1 pl-1.5"
              >
                <span
                  style={{ color: style.text }}
                  className="shrink-0 text-[8px] font-bold"
                >
                  {extensionLabel(version?.extension ?? '')}
                </span>
                <span className="min-w-0 truncate text-caption text-text-primary">
                  {version ? `${version.name} v${version.versionNo}` : `#${id}`}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(id)}
                  aria-label={`${version?.name ?? id} 선택 해제`}
                  className="shrink-0 cursor-pointer px-0.5 text-caption text-text-secondary hover:text-text-danger"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Field>
  );
}
