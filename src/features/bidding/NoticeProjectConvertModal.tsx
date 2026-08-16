'use client';

import { useEffect, useState } from 'react';

import Modal from '@/components/Modal';
import LoadingSpinner from '@/components/Spinner';
import { getCategories } from '@/features/businessCategory/api';
import {
  readCachedCategories,
  writeCachedCategories,
} from '@/features/businessCategory/cache';
import type { BusinessCategory } from '@/features/businessCategory/types';
import { ApiError, messageOf } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { PROJECT_NAME_MAX_LENGTH } from '@/features/project/types';

import { convertNoticeToProject, getNoticeSummaries } from './api';
import { BIDDING_CODES } from './errorCodes';
import {
  AlertBanner,
  SelectField,
  TextareaField,
  TextField,
} from './FormFields';
import type { BidNoticeDetail, SummaryHistoryItem } from './types';

/** 요약을 연결하지 않을 때의 값 — 셀렉트는 문자열만 다룬다 */
const NO_SUMMARY = '';

/**
 * 공고 → 프로젝트 전환 모달. (`POST /bidding/notices/{noticeId}/projects`)
 *
 * ⭐ **완료된 AI 문서 검토가 근거로 필수**다. 검토에서 내려받기에 성공한 공고 첨부가
 *    정식 파일로 프로젝트에 귀속되고, 전환하지 않으면 임시 파일은 만료 시 삭제된다.
 *    그래서 진입점은 **검토 결과 화면 하나뿐**이고, 근거 검토는 여기서 고르지 않고 받아 온다.
 *
 * ⚠️ 요청자는 서버가 편집 권한으로 자동 등록한다 — 참여자 입력에 자신을 넣지 않는다.
 * ℹ️ 추가 참여자는 여기서 받지 않는다. 프로젝트 설정에서 검색해 넣는 편이 정확하고,
 *    사번을 직접 적게 하면 오타를 걸러낼 방법이 없다.
 */
export default function NoticeProjectConvertModal({
  notice,
  reviewId,
  onClose,
  onConverted,
}: {
  notice: BidNoticeDetail;
  /** 근거가 될 완료된 검토 — 검토 결과 화면에서 넘어온다 */
  reviewId: number;
  onClose: () => void;
  onConverted: (projectId: number) => void;
}) {
  /** 요약은 선택 사항이라 못 받으면 그 자리만 빈다 */
  const [summaries, setSummaries] = useState<SummaryHistoryItem[] | null>(null);
  /**
   * ⚠️ 카테고리는 **필수 입력**이라 실패를 빈 목록으로 뭉개면 안 된다 —
   *    고를 것이 없는 채로 "선택해주세요" 만 뜨면 사용자는 영영 전환할 수 없다.
   *    못 받았다는 사실(`hasCategoryFailed`)을 따로 들고 재시도 길을 준다.
   */
  /** 직전 응답이 있으면 먼저 그린다 — 셀렉트가 빈 채로 떴다 채워지지 않게 */
  const [categories, setCategories] = useState<BusinessCategory[]>(
    () => readCachedCategories()?.filter((item) => !item.deletedAt) ?? [],
  );
  const [hasCategoryFailed, setHasCategoryFailed] = useState(false);
  /**
   * ⚠️ 로딩 판정에 **카테고리도 넣어야 한다.** 예전에는 `summaries === null` 만 봐서,
   *    요약이 먼저 도착하면 카테고리가 아직 오는 중인데도 폼이 열렸다 —
   *    그 순간 `categories` 는 빈 배열이라 "고를 수 있는 사업 카테고리가 없습니다" 로
   *    읽히고 생성 버튼도 잠긴다. 조회 중 · 실패 · 성공한 빈 목록은 서로 다른 상태다.
   *
   * **몇 번째 시도가 끝났는지**를 담는다 — 불리언으로 두면 `다시 시도` 때
   * 효과 안에서 `false` 로 되돌려야 하는데, 그건 렌더를 한 번 더 부른다.
   * (`DashboardProjects` 의 `failedAt` 과 같은 방식)
   */
  const [categoryLoadedAt, setCategoryLoadedAt] = useState<number | null>(null);
  /** 재시도 횟수 — 바뀔 때마다 아래 `useEffect` 가 다시 돈다 */
  const [reloadCount, setReloadCount] = useState(0);

  const [summaryId, setSummaryId] = useState(NO_SUMMARY);
  // 공고명을 그대로 쓰는 경우가 많아 기본값으로 채운다
  const [name, setName] = useState(notice.noticeName);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startedOn, setStartedOn] = useState('');
  // 투찰 마감이 있으면 종료일 기본값으로 깔아 둔다 — 대부분 그 날짜를 다시 적는다
  const [endedOn, setEndedOn] = useState(toDateInput(notice.bidDeadlineAt));

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    /**
     * 둘을 함께 기다린다 — 도착하는 대로 그리면 셀렉트가 하나씩 늘어나 창이 들썩인다.
     * 실패한 것만 빈 채로 두고 나머지는 그대로 쓴다.
     */
    Promise.all([
      getNoticeSummaries(notice.noticeId, signal)
        .then((data) => setSummaries(data.content.filter(isLinkableSummary)))
        .catch(() => {
          if (!signal.aborted) setSummaries([]);
        }),

      getCategories({}, signal)
        .then((data) => {
          setCategories(data.filter((item) => !item.deletedAt));
          setHasCategoryFailed(false);
          writeCachedCategories(data);
          setCategoryLoadedAt(reloadCount);
        })
        .catch(() => {
          if (signal.aborted) return;
          setHasCategoryFailed(true);
          // 실패도 "다 기다렸다" 다 — 안내는 `hasCategoryFailed` 자리가 맡는다
          setCategoryLoadedAt(reloadCount);
        }),
    ]).catch(() => {});

    return () => controller.abort();
  }, [notice.noticeId, reloadCount]);

  function validate() {
    // 고를 수 없는 상태를 입력 실수처럼 알리지 않는다 — 원인이 다르면 문구도 달라야 한다
    if (hasCategoryFailed) {
      return '사업 카테고리를 불러오지 못했습니다. 다시 시도해주세요.';
    }
    if (categories.length === 0) {
      return '고를 수 있는 사업 카테고리가 없습니다. 전사 관리에서 먼저 등록해주세요.';
    }
    if (name.trim() === '') return '과업명을 입력해주세요.';
    if (categoryId === '') return '사업 카테고리를 선택해주세요.';
    if (startedOn === '') return '시작일을 입력해주세요.';
    if (endedOn === '') return '종료일을 입력해주세요.';
    if (endedOn < startedOn) return '종료일이 시작일보다 앞설 수 없습니다.';

    return null;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    const message = validate();
    if (message) {
      setError(message);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await convertNoticeToProject(notice.noticeId, {
        reviewId,
        summaryId: summaryId === NO_SUMMARY ? null : Number(summaryId),
        name: name.trim(),
        description: description.trim() || null,
        businessCategoryId: Number(categoryId),
        startedOn,
        endedOn,
      });

      onConverted(result.projectId);
    } catch (caught) {
      setError(conflictMessage(caught));
      setIsSubmitting(false);
    }
  }

  const isLoading = summaries === null || categoryLoadedAt !== reloadCount;
  /** 채워 둔 종료일이 공고에서 온 것인지 — 사용자가 고치면 안내를 거둔다 */
  const hasDeadlineDefault =
    endedOn !== '' && endedOn === toDateInput(notice.bidDeadlineAt);

  return (
    <Modal
      title="프로젝트로 생성"
      onClose={onClose}
      // 여러 칸을 채우는 흐름이라 바깥을 잘못 눌러 닫히면 처음부터 다시다
      dismissOnBackdrop={false}
      className="flex max-h-[85vh] w-full max-w-[560px] flex-col rounded-base p-8 shadow-lg"
    >
      {/* 무엇을 근거로 만드는지 — 검토 결과에서 넘어왔다는 사실을 창 안에서도 알린다 */}
      <div className="mt-6 rounded-lg border border-border-default bg-bg-surface px-4 py-3">
        <p className="text-caption break-keep text-text-primary">
          {notice.noticeName}
        </p>
        <p className="mt-1 text-caption text-text-secondary">
          AI 검토 결과를 근거로 생성합니다. 검토에 쓰인 공고 첨부가 프로젝트
          파일로 보존됩니다.
        </p>
      </div>

      {isLoading ? (
        <LoadingSpinner label="전환 정보 불러오는 중" className="mt-5 py-16" />
      ) : (
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="mt-5 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
            {/* 확정 요약이 없으면 고를 것이 없다 — 빈 셀렉트를 띄우지 않는다 */}
            {summaries !== null && summaries.length > 0 && (
              <SelectField
                id="convertSummaryId"
                label="연결할 AI 요약"
                hint="확정된 요약만 연결할 수 있습니다"
                value={summaryId}
                emptyLabel="연결 안 함"
                options={summaries.map((summary) => ({
                  value: String(summary.summaryId),
                  label: `${summary.revisionNo}차 · ${formatDateTime(summary.completedAt) || '완료'}`,
                }))}
                onChange={setSummaryId}
              />
            )}

            <TextField
              id="convertName"
              label="과업명"
              required
              maxLength={PROJECT_NAME_MAX_LENGTH}
              placeholder="과업명 입력"
              value={name}
              onChange={setName}
            />

            {/**
             * 필수 입력인데 고를 것이 없는 세 경우를 갈라 보여준다.
             * ⚠️ 실패와 "등록된 카테고리가 없음" 은 사용자가 할 일이 달라 한 문구로 묶지 않는다.
             */}
            {hasCategoryFailed ? (
              <div>
                <AlertBanner tone="danger">
                  사업 카테고리를 불러오지 못했습니다. 잠시 후 다시
                  시도해주세요.
                </AlertBanner>
                <button
                  type="button"
                  onClick={() => setReloadCount((count) => count + 1)}
                  className="btn btn-sm btn-gray-outlined mt-2"
                >
                  다시 불러오기
                </button>
              </div>
            ) : categories.length === 0 ? (
              <p className="rounded-lg bg-bg-surface px-4 py-3 text-caption break-keep text-text-secondary">
                고를 수 있는 사업 카테고리가 없습니다. 전사 관리에서 먼저
                등록해주세요.
              </p>
            ) : (
              <SelectField
                id="convertCategoryId"
                label="사업 카테고리"
                required
                value={categoryId}
                emptyLabel="선택해주세요"
                options={categories.map((category) => ({
                  value: String(category.categoryId),
                  label: category.name,
                }))}
                onChange={setCategoryId}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="convertStartedOn"
                label="시작일"
                type="date"
                required
                value={startedOn}
                onChange={setStartedOn}
              />
              <TextField
                id="convertEndedOn"
                label="종료일"
                type="date"
                required
                hint={
                  hasDeadlineDefault ? '투찰 마감일로 채웠습니다.' : undefined
                }
                value={endedOn}
                onChange={setEndedOn}
              />
            </div>

            <TextareaField
              id="convertDescription"
              label="설명"
              rows={3}
              placeholder="과업 설명 입력"
              value={description}
              onChange={setDescription}
            />

            {/* 두 문장을 한 덩어리로 흘리면 줄바꿈이 아무 데나 걸린다 — 문장마다 줄을 준다 */}
            <div className="rounded-lg bg-bg-surface px-4 py-3 text-caption leading-relaxed break-keep text-text-secondary">
              <p>전환하면 요청자가 편집 권한으로 등록됩니다.</p>
              <p className="mt-1">
                다른 참여자는 생성 후 프로젝트 설정에서 추가해주세요.
              </p>
            </div>
          </div>

          {error && (
            <AlertBanner tone="danger" className="mt-4">
              {error}
            </AlertBanner>
          )}

          <div className="mt-6 flex shrink-0 justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-md btn-gray-outlined"
            >
              취소
            </button>
            <button
              type="submit"
              // 고를 카테고리가 없으면 눌러도 400 이다 — 누르기 전에 막는다
              disabled={
                isSubmitting || hasCategoryFailed || categories.length === 0
              }
              className="btn btn-md btn-primary min-w-[104px]"
            >
              {isSubmitting ? '생성 중…' : '생성'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/**
 * `'2026-09-01 18:00:00'` → `'2026-09-01'`. `<input type="date">` 는 이 형식만 받는다.
 *
 * ⚠️ `new Date()` 로 돌리지 않는다 — 서버가 주는 값에 타임존이 없어서 하루씩 밀린다.
 */
function toDateInput(value?: string | null) {
  return /^\d{4}-\d{2}-\d{2}/.test(value ?? '') ? value!.slice(0, 10) : '';
}

/** ⚠️ 확정되지 않았거나 이미 연결된 요약은 409 다 — 목록에서 뺀다 */
function isLinkableSummary(summary: SummaryHistoryItem) {
  return summary.confirmed && summary.projectId === null;
}

/**
 * 409 다섯 갈래를 문구로 옮긴다.
 *
 * 대부분 화면에서 미리 걸렀지만, 목록을 받은 뒤 다른 사람이 먼저 전환하면 여기로 온다.
 */
function conflictMessage(error: unknown) {
  const code = error instanceof ApiError ? error.code : undefined;

  if (code === BIDDING_CODES.noticeAlreadyLinked) {
    return '이미 프로젝트로 전환된 공고입니다.';
  }
  if (code === BIDDING_CODES.reviewNotCompleted) {
    return '완료되지 않은 검토입니다. 다른 검토를 선택해주세요.';
  }
  if (code === BIDDING_CODES.reviewAlreadyLinkedToProject) {
    return '이미 다른 프로젝트에 연결된 검토입니다.';
  }
  if (code === BIDDING_CODES.summaryNotConfirmed) {
    return '확정되지 않은 요약입니다. 요약을 확정한 뒤 다시 시도해주세요.';
  }
  if (code === BIDDING_CODES.summaryAlreadyLinked) {
    return '이미 다른 프로젝트에 연결된 요약입니다.';
  }

  return messageOf(error, '프로젝트를 생성하지 못했습니다.');
}
