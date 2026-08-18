'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { NoticeFormSkeleton } from '@/components/bidding/NoticeSkeletons';
import PageTitle from '@/components/PageTitle';
import { notifyToast } from '@/components/Toast';
import { formatFileSize } from '@/features/file/format';
import { ApiError, messageOf } from '@/lib/api';

import {
  createNotice,
  getNoticeDetail,
  updateNotice,
  uploadNoticeAttachment,
} from './api';
import { BIDDING_CODES } from './errorCodes';
import {
  AlertBanner,
  AmountField,
  CheckboxField,
  FormSection,
  SelectField,
  TextareaField,
  TextField,
} from './FormFields';
import { BIDDING_ROUTES } from './routes';
import type {
  BidNoticeDetail,
  CreateNoticeRequest,
  NoticeAttachment,
  UpdateNoticeRequest,
} from './types';

/** 공고 유형 선택지. 수집 조건의 `noticeTypes` 와 같은 축이다 */
const NOTICE_TYPE_OPTIONS = [
  { value: 'SERVICE', label: '용역' },
  { value: 'CONSTRUCTION', label: '공사' },
  { value: 'GOODS', label: '물품' },
];

const INTERNATIONAL_OPTIONS = [
  { value: 'DOMESTIC', label: '국내입찰' },
  { value: 'INTERNATIONAL', label: '국제입찰' },
];

/** 폼은 전부 문자열로 다룬다. 변환 지점을 한 곳에 모으기 위해서다 */
interface FormValues {
  noticeName: string;
  noticeType: string;
  noticeAgency: string;
  demandAgency: string;
  internationalBidType: string;
  announcedAt: string;
  bidStartAt: string;
  bidDeadlineAt: string;
  openingAt: string;
  baseAmount: string;
  estimatedAmount: string;
  bidMethod: string;
  contractMethod: string;
  participationQualificationText: string;
  regionLimitText: string;
  businessLimitText: string;
  jointContractText: string;
  evaluationMethod: string;
  sourceUrl: string;
}

type FieldName = keyof FormValues;

const EMPTY_VALUES: FormValues = {
  noticeName: '',
  // 대부분이 용역이라 기본값을 준다
  noticeType: 'SERVICE',
  noticeAgency: '',
  demandAgency: '',
  internationalBidType: 'DOMESTIC',
  announcedAt: '',
  bidStartAt: '',
  bidDeadlineAt: '',
  openingAt: '',
  baseAmount: '',
  estimatedAmount: '',
  bidMethod: '',
  contractMethod: '',
  participationQualificationText: '',
  regionLimitText: '',
  businessLimitText: '',
  jointContractText: '',
  evaluationMethod: '',
  sourceUrl: '',
};

/** 필수 항목. 400(`BIDDING_INVALID_MANUAL_NOTICE`) 을 미리 막는다 */
const REQUIRED_MESSAGES: Partial<Record<FieldName, string>> = {
  noticeName: '공고명을 입력해주세요.',
  noticeType: '공고 유형을 선택해주세요.',
  noticeAgency: '발주처를 입력해주세요.',
};

/**
 * 첨부 개수 상한. 서버와 같은 값이다.
 * 첨부는 공고를 저장한 뒤 올라가 그때 막히면 늦으므로 고르는 자리에서 먼저 막는다.
 */
const MAX_ATTACHMENTS = 10;

/** `http(s)://` 로 시작하는 주소인지. 원문 URL 이 이 규칙을 쓴다 */
function isHttpUrl(value: string) {
  return /^https?:\/\/.+/.test(value.trim());
}

/** 빈 문자열은 보내지 않는다. 백엔드가 빈 값을 값으로 저장한다 */
function orNull(value: string) {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * `datetime-local` 값(`2026-08-11T09:00`) 을 API 포맷(`2026-08-11T09:00:00`) 으로 바꾼다.
 * 백엔드는 초까지 받고 오프셋은 붙이지 않는다.
 */
function toApiDateTime(value: string) {
  if (value === '') return null;
  return value.length === 16 ? `${value}:00` : value;
}

/** 반대 방향. `datetime-local` 은 초를 받지 않아 앞 16자만 쓴다 */
function toInputDateTime(value: string | null) {
  return value ? value.slice(0, 16) : '';
}

function toNumber(value: string) {
  return value === '' ? null : Number(value);
}

/**
 * 조회한 공고를 폼 값으로 옮긴다.
 * 상세 응답에 없는 국내·국제 구분과 입찰 방식은 빈 값으로 두고 수정 화면에서 감춘다.
 */
function toValues(notice: BidNoticeDetail): FormValues {
  return {
    ...EMPTY_VALUES,
    noticeName: notice.noticeName,
    noticeType: notice.noticeType ?? 'SERVICE',
    noticeAgency: notice.noticeAgency,
    demandAgency: notice.demandAgency ?? '',
    announcedAt: toInputDateTime(notice.announcedAt),
    bidStartAt: toInputDateTime(notice.bidStartAt),
    bidDeadlineAt: toInputDateTime(notice.bidDeadlineAt),
    openingAt: toInputDateTime(notice.openingAt),
    baseAmount: notice.baseAmount === null ? '' : String(notice.baseAmount),
    estimatedAmount:
      notice.estimatedAmount === null ? '' : String(notice.estimatedAmount),
    contractMethod: notice.contractMethod ?? '',
    participationQualificationText: notice.participationQualificationText ?? '',
    regionLimitText: notice.regionLimitText ?? '',
    businessLimitText: notice.businessLimitText ?? '',
    jointContractText: notice.jointContractText ?? '',
    evaluationMethod: notice.evaluationMethod ?? '',
    sourceUrl: notice.sourceUrl ?? '',
  };
}

/**
 * 공고 직접 등록 · 수정 화면. (입찰 `EDITOR`)
 *
 * `noticeId` 를 주면 수정이다. 수정은 직접 등록한 공고(`sourceCode === 'MANUAL'`)만 되고
 * 수집 공고를 보내면 409(`BIDDING_NOTICE_EDIT_NOT_ALLOWED`) 다.
 */
export default function NoticeForm({ noticeId }: { noticeId?: number }) {
  const isEdit = noticeId !== undefined;
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [jointContractAllowed, setJointContractAllowed] = useState(false);
  /** 올릴 첨부 파일. 저장 버튼을 누른 뒤 한꺼번에 올린다 */
  const [files, setFiles] = useState<File[]>([]);
  /** 이미 올라가 있는 첨부. 삭제 API 가 없어 목록만 보여준다 */
  const [savedAttachments, setSavedAttachments] = useState<NoticeAttachment[]>(
    [],
  );
  /** 숨긴 파일 입력. `파일 선택` 버튼이 대신 연다 */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEdit);
  /** 폼을 아예 열 수 없는 경우. 없는 공고이거나 수집 공고다 */
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (noticeId === undefined) return;

    const controller = new AbortController();
    const { signal } = controller;

    getNoticeDetail(noticeId, signal)
      .then((notice) => {
        // 수집 공고는 서버가 막는다. 상세로 돌려보내고 폼을 열지 않는다
        if (notice.sourceCode !== 'MANUAL') {
          setLoadError('수집된 공고는 수정할 수 없습니다.');
          return;
        }
        setValues(toValues(notice));
        setJointContractAllowed(notice.jointContractAllowed ?? false);
        setSavedAttachments(notice.attachments);
      })
      .catch((caught: unknown) => {
        // 취소는 실패가 아니다
        if (signal.aborted) return;
        setLoadError(messageOf(caught, '공고를 불러오지 못했습니다.'));
      })
      .finally(() => {
        if (!signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [noticeId]);

  function change(name: FieldName) {
    return (value: string) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      // 고치는 중에 빨간 글씨가 남아 있으면 이미 해결한 것도 문제처럼 보인다
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    };
  }

  function addFiles(picked: FileList | null) {
    if (!picked || picked.length === 0) return;

    /*
      계산을 `setFiles` 업데이터 밖에서 한다. 업데이터는 순수해야 하고,
      React 가 두 번 실행하면(StrictMode) 안내가 두 번 세워진다.
    */
    // 같은 파일을 두 번 고르면 그대로 두 번 올라간다 — 이름+크기로 걸러낸다
    const keys = new Set(files.map((file) => `${file.name} ${file.size}`));
    const added = Array.from(picked).filter(
      (file) => !keys.has(`${file.name} ${file.size}`),
    );
    const room = Math.max(
      MAX_ATTACHMENTS - savedAttachments.length - files.length,
      0,
    );

    // 상한을 넘기면 담을 수 있는 만큼만 담는다. 통째로 되돌리면 하나도 안 들어온 것처럼 보인다
    setFormError(
      added.length > room
        ? `첨부는 최대 ${MAX_ATTACHMENTS}개까지 올릴 수 있습니다. ${added.length - room}개는 목록에 넣지 않았습니다.`
        : null,
    );

    setFiles((prev) => [...prev, ...added.slice(0, room)]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, at) => at !== index));
  }

  function validate() {
    const next: Partial<Record<FieldName, string>> = {};

    for (const [name, message] of Object.entries(REQUIRED_MESSAGES)) {
      if (values[name as FieldName].trim() === '') {
        next[name as FieldName] = message;
      }
    }

    const { announcedAt, bidDeadlineAt, openingAt, sourceUrl } = values;

    // 원문 URL 은 선택 입력이다 — 적었을 때만 형식을 본다
    if (sourceUrl.trim() !== '' && !isHttpUrl(sourceUrl)) {
      next.sourceUrl = 'http:// 또는 https:// 로 시작하는 주소를 넣어주세요.';
    }

    if (announcedAt && bidDeadlineAt && bidDeadlineAt < announcedAt) {
      next.bidDeadlineAt = '마감일이 공고일보다 앞설 수 없습니다.';
    }
    if (bidDeadlineAt && openingAt && openingAt < bidDeadlineAt) {
      next.openingAt = '개찰일이 마감일보다 앞설 수 없습니다.';
    }

    setErrors(next);

    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) focusField(firstInvalid);

    return Object.keys(next).length === 0;
  }

  /**
   * 첫 오류 항목으로 포커스를 옮긴다.
   * 항목이 20개 가까워 제출 버튼 자리에서는 첫 오류가 보이지 않는다.
   */
  function focusField(name: string) {
    document.getElementById(name)?.focus();
  }

  /** 공통 입력값. 첨부는 저장한 뒤 파일 업로드로 붙이므로 비워 보낸다 */
  function toCreatePayload(): CreateNoticeRequest {
    return {
      noticeName: values.noticeName.trim(),
      noticeType: values.noticeType,
      noticeAgency: values.noticeAgency.trim(),
      demandAgency: orNull(values.demandAgency),
      internationalBidType: values.internationalBidType,
      announcedAt: toApiDateTime(values.announcedAt),
      bidStartAt: toApiDateTime(values.bidStartAt),
      bidDeadlineAt: toApiDateTime(values.bidDeadlineAt),
      openingAt: toApiDateTime(values.openingAt),
      baseAmount: toNumber(values.baseAmount),
      estimatedAmount: toNumber(values.estimatedAmount),
      bidMethod: orNull(values.bidMethod),
      contractMethod: orNull(values.contractMethod),
      participationQualificationText: orNull(
        values.participationQualificationText,
      ),
      regionLimitText: orNull(values.regionLimitText),
      businessLimitText: orNull(values.businessLimitText),
      jointContractAllowed,
      // 허용하지 않으면 설명을 보내지 않는다 — 켰다 끈 흔적이 남지 않게 한다
      jointContractText: jointContractAllowed
        ? orNull(values.jointContractText)
        : null,
      evaluationMethod: orNull(values.evaluationMethod),
      sourceUrl: orNull(values.sourceUrl),
      attachments: [],
    };
  }

  /**
   * 수정 본문은 보낸 필드만 바뀐다.
   * `attachments` 는 통째로 교체라 싣지 않고, 상세 응답에 없는 두 항목도 뺀다.
   */
  function toUpdatePayload(): UpdateNoticeRequest {
    const payload: UpdateNoticeRequest = toCreatePayload();

    delete payload.attachments;
    delete payload.internationalBidType;
    delete payload.bidMethod;

    return payload;
  }

  /** 고른 파일을 차례로 올리고 실패한 이름만 돌려준다 */
  async function uploadPickedFiles(targetId: number) {
    const failed: string[] = [];

    for (const file of files) {
      try {
        await uploadNoticeAttachment(targetId, file);
      } catch {
        failed.push(file.name);
      }
    }

    return failed;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      /*
        공고는 여기서 이미 저장됐다. 첨부가 실패해도 되돌리지 않는다 —
        지운 뒤 다시 만들게 하면 입력한 20여 개 항목을 또 채워야 한다.
      */
      let targetId = noticeId ?? 0;

      if (noticeId === undefined) {
        targetId = (await createNotice(toCreatePayload())).noticeId;
      } else {
        await updateNotice(noticeId, toUpdatePayload());
      }

      const failed = await uploadPickedFiles(targetId);

      if (failed.length > 0) {
        notifyToast(
          `${isEdit ? '공고는 수정됐지만' : '공고는 등록됐지만'} 첨부 ${failed.length}개를 올리지 못했습니다: ${failed.join(', ')}`,
          'error',
        );
      } else if (isEdit) {
        notifyToast('공고를 수정했습니다.');
      }

      router.replace(BIDDING_ROUTES.detail(targetId));
    } catch (error) {
      setFormError(submitErrorOf(error, isEdit));
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <NoticeFormSkeleton />;

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-[820px]">
        <PageTitle title="공고 수정" />
        <AlertBanner tone="danger">{loadError}</AlertBanner>
        <div className="mt-4">
          <Link
            href={
              noticeId === undefined
                ? BIDDING_ROUTES.list
                : BIDDING_ROUTES.detail(noticeId)
            }
            className="btn btn-md btn-gray"
          >
            돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const cancelHref =
    isEdit && noticeId !== undefined
      ? BIDDING_ROUTES.detail(noticeId)
      : BIDDING_ROUTES.list;

  return (
    /* 폭 · 경로 글씨는 프로젝트 생성 화면과 같은 값이다 — 오갈 때 폭이 흔들리지 않게 맞춘다 */
    <div className="mx-auto w-full max-w-[820px]">
      <p className="mb-2 text-caption text-text-secondary">
        <Link
          href={BIDDING_ROUTES.list}
          className="hover:text-text-primary hover:underline"
        >
          입찰 공고
        </Link>
        {isEdit ? ' › 수정' : ' › 직접 등록'}
      </p>
      <PageTitle title={isEdit ? '공고 수정' : '공고 직접 등록'} />

      <form onSubmit={submit} className="space-y-4 pb-10">
        <FormSection
          title="기본 정보"
          description={
            isEdit
              ? '직접 등록한 공고만 수정할 수 있습니다. 수집으로 가져온 공고는 원문이 기준입니다.'
              : '수집으로 가져오지 못한 공고를 직접 등록합니다. 등록 후에도 수정할 수 있습니다.'
          }
        >
          <div className="sm:col-span-2">
            <TextField
              id="noticeName"
              label="공고명"
              required
              maxLength={200}
              placeholder="예) 교통정보 시스템 유지보수 용역"
              value={values.noticeName}
              error={errors.noticeName}
              onChange={change('noticeName')}
            />
          </div>
          <SelectField
            id="noticeType"
            label="공고 유형"
            required
            options={NOTICE_TYPE_OPTIONS}
            value={values.noticeType}
            error={errors.noticeType}
            onChange={change('noticeType')}
          />
          {/* 국내 · 국제 구분은 상세 응답에 없어 수정 화면에서는 감춘다 (보내지도 않는다) */}
          {!isEdit && (
            <SelectField
              id="internationalBidType"
              label="국내 · 국제"
              options={INTERNATIONAL_OPTIONS}
              value={values.internationalBidType}
              onChange={change('internationalBidType')}
            />
          )}
          <TextField
            id="noticeAgency"
            label="발주처"
            required
            placeholder="예) 경기도"
            value={values.noticeAgency}
            error={errors.noticeAgency}
            onChange={change('noticeAgency')}
          />
          <TextField
            id="demandAgency"
            label="수요기관"
            placeholder="예) 경기도 교통정보과"
            value={values.demandAgency}
            onChange={change('demandAgency')}
          />
        </FormSection>

        <FormSection
          title="일정"
          description="비워두면 목록에서 '-' 로 보입니다. 마감일을 넣으면 남은 일수(D-Day)가 계산됩니다."
        >
          <TextField
            id="announcedAt"
            label="공고일"
            type="datetime-local"
            value={values.announcedAt}
            onChange={change('announcedAt')}
          />
          <TextField
            id="bidStartAt"
            label="투찰 시작"
            type="datetime-local"
            value={values.bidStartAt}
            onChange={change('bidStartAt')}
          />
          <TextField
            id="bidDeadlineAt"
            label="투찰 마감"
            type="datetime-local"
            value={values.bidDeadlineAt}
            error={errors.bidDeadlineAt}
            onChange={change('bidDeadlineAt')}
          />
          <TextField
            id="openingAt"
            label="개찰일"
            type="datetime-local"
            value={values.openingAt}
            error={errors.openingAt}
            onChange={change('openingAt')}
          />
        </FormSection>

        <FormSection
          title="금액"
          description="나라장터의 예산금액(추정금액) · 부가가치세는 담을 필드가 없어 넣지 않습니다."
        >
          <AmountField
            id="baseAmount"
            label="기초금액"
            hint="공개 전이면 비워둡니다"
            placeholder="0"
            value={values.baseAmount}
            onChange={change('baseAmount')}
          />
          <AmountField
            id="estimatedAmount"
            label="추정가격"
            hint="부가가치세 제외"
            placeholder="0"
            value={values.estimatedAmount}
            onChange={change('estimatedAmount')}
          />
        </FormSection>

        <FormSection
          title="참가 자격 · 제한"
          description="수집 공고는 원문을 그대로 담는 항목이라 자유 입력입니다."
        >
          <div className="sm:col-span-2">
            <TextareaField
              id="participationQualificationText"
              label="참가 자격"
              placeholder="예) 관련 사업 수행 실적 보유 업체"
              value={values.participationQualificationText}
              onChange={change('participationQualificationText')}
            />
          </div>
          <TextField
            id="regionLimitText"
            label="지역 제한"
            placeholder="예) 경기도"
            value={values.regionLimitText}
            onChange={change('regionLimitText')}
          />
          <TextField
            id="businessLimitText"
            label="업종 제한"
            placeholder="예) 소프트웨어사업자"
            value={values.businessLimitText}
            onChange={change('businessLimitText')}
          />
          {/* 입찰 방식도 상세 응답에 없어 수정 화면에서는 감춘다 */}
          {!isEdit && (
            <TextField
              id="bidMethod"
              label="입찰 방식"
              placeholder="예) 전자입찰"
              value={values.bidMethod}
              onChange={change('bidMethod')}
            />
          )}
          <TextField
            id="contractMethod"
            label="계약 방법"
            placeholder="예) 협상에 의한 계약"
            value={values.contractMethod}
            onChange={change('contractMethod')}
          />
          <TextField
            id="evaluationMethod"
            label="평가 방법"
            placeholder="예) 기술·가격 종합평가"
            value={values.evaluationMethod}
            onChange={change('evaluationMethod')}
          />
          <div className="flex items-end pb-2">
            <CheckboxField
              id="jointContractAllowed"
              label="공동수급 허용"
              checked={jointContractAllowed}
              onChange={setJointContractAllowed}
            />
          </div>
          {jointContractAllowed && (
            <div className="sm:col-span-2">
              <TextField
                id="jointContractText"
                label="공동수급 조건"
                placeholder="예) 공동이행방식, 최대 3개사"
                value={values.jointContractText}
                onChange={change('jointContractText')}
              />
            </div>
          )}
        </FormSection>

        <FormSection
          title="원문 · 첨부"
          description="공고문 · 과업지시서 같은 파일을 올립니다. 저장을 누르면 함께 올라갑니다."
        >
          <div className="sm:col-span-2">
            <TextField
              id="sourceUrl"
              label="공고 원문 URL"
              type="url"
              placeholder="https://"
              hint="선택 입력"
              value={values.sourceUrl}
              error={errors.sourceUrl}
              onChange={change('sourceUrl')}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <p className="text-detail font-semibold text-text-primary">
              첨부 파일{' '}
              <span className="font-normal text-text-secondary">
                ({savedAttachments.length + files.length} / {MAX_ATTACHMENTS})
              </span>
            </p>

            {/* 이미 올라간 첨부는 삭제 API 가 없어 목록만 보여준다 */}
            {savedAttachments.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {savedAttachments.map((attachment) => (
                  <li
                    key={attachment.attachmentOrder}
                    className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-hover px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-detail text-text-primary">
                      {attachment.fileName}
                    </span>
                    <span className="shrink-0 text-caption text-text-secondary">
                      등록됨
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {files.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {files.map((file, index) => (
                  <li
                    // 이름이 같은 파일도 있을 수 있어 자리(인덱스)로 구분한다
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-border-default px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-detail text-text-primary">
                      {file.name}
                    </span>
                    <span className="shrink-0 text-caption text-text-secondary">
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      disabled={isSubmitting}
                      className="btn btn-sm btn-gray shrink-0"
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* 파일은 저장을 누른 뒤 올라간다 — 업로드 경로에 공고 번호가 들어가기 때문이다 */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                addFiles(event.target.files);
                // 같은 파일을 다시 고를 수 있게 값을 비운다
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={
                isSubmitting ||
                savedAttachments.length + files.length >= MAX_ATTACHMENTS
              }
              className="btn btn-sm btn-gray"
            >
              파일 선택
            </button>
          </div>
        </FormSection>

        {formError && <AlertBanner tone="danger">{formError}</AlertBanner>}

        <div className="flex justify-end gap-2">
          <Link href={cancelHref} className="btn btn-md btn-gray">
            취소
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-md btn-primary min-w-[104px]"
          >
            {submitLabel(isEdit, isSubmitting)}
          </button>
        </div>
      </form>
    </div>
  );
}

function submitLabel(isEdit: boolean, isSubmitting: boolean) {
  if (isEdit) return isSubmitting ? '저장 중…' : '저장';
  return isSubmitting ? '등록 중…' : '등록';
}

/**
 * 저장 실패 안내.
 * 중복 · 수정 불가는 원인이 뚜렷해 따로 알리고, 나머지는 서버 메시지를 그대로 쓴다.
 */
function submitErrorOf(error: unknown, isEdit: boolean) {
  if (error instanceof ApiError) {
    if (error.code === BIDDING_CODES.manualNoticeDuplicated) {
      return '같은 공고가 이미 등록돼 있습니다. 목록에서 확인해주세요.';
    }
    if (error.code === BIDDING_CODES.noticeEditNotAllowed) {
      return '수집된 공고는 수정할 수 없습니다.';
    }
  }

  return messageOf(
    error,
    isEdit
      ? '공고 수정에 실패했습니다. 잠시 후 다시 시도해주세요.'
      : '공고 등록에 실패했습니다. 잠시 후 다시 시도해주세요.',
  );
}
