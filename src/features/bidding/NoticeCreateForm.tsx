'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import PageTitle from '@/components/PageTitle';
import { notifyToast } from '@/components/Toast';
import { formatFileSize } from '@/features/file/format';
import { ApiError, messageOf } from '@/lib/api';

import { createNotice, uploadNoticeAttachment } from './api';
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
import type { CreateNoticeRequest } from './types';

/**
 * 공고 유형 선택지 — 나라장터의 `업무구분` 에 대응한다.
 *
 * ⚠️ 스웨거가 `noticeType` 을 `string` 으로만 주고 예시에 `CONSTRUCTION` · `SERVICE` 둘만 나온다.
 *    실제 나라장터 목록에는 **물품 · 기술용역**도 있어 `GOODS` 를 추정으로 넣어 뒀다.
 *    등록 시 400(`BIDDING_INVALID_MANUAL_NOTICE`) 이 나면 백엔드 enum 에 없는 값이니 지운다.
 *    (수집 조건의 `noticeTypes` 와 같은 축이라 값이 확정되면 양쪽이 이 상수를 함께 쓴다)
 */
const NOTICE_TYPE_OPTIONS = [
  { value: 'SERVICE', label: '용역' },
  { value: 'CONSTRUCTION', label: '공사' },
  { value: 'GOODS', label: '물품' },
];

const INTERNATIONAL_OPTIONS = [
  { value: 'DOMESTIC', label: '국내입찰' },
  { value: 'INTERNATIONAL', label: '국제입찰' },
];

/** 폼은 전부 문자열로 다룬다 — 셀렉트 · 일시 · 금액 입력이 모두 문자열이라 변환 지점을 한 곳에 모은다 */
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

/**
 * 필수 항목 — 400(`BIDDING_INVALID_MANUAL_NOTICE`) 을 미리 막는다.
 *
 * ⚠️ 스웨거에 필수 표시가 없어 **최소한만** 잡았다. 400 이 나면 이 표를 늘린다.
 */
const REQUIRED_MESSAGES: Partial<Record<FieldName, string>> = {
  noticeName: '공고명을 입력해주세요.',
  noticeType: '공고 유형을 선택해주세요.',
  noticeAgency: '발주처를 입력해주세요.',
};

/**
 * ⚠️ **원문 URL 은 선택 입력이다** (2026-08-14 변경).
 *
 * 한동안 화면 정책으로 필수로 잡았는데, 원문 링크가 없는 공고(구두 · 내부 건)를
 * 등록할 방법이 사라졌다. 백엔드도 처음부터 `null` 을 허용한다.
 * 대신 **적었을 때 형식만** 본다 — `example.org` 처럼 적으면 링크가 열리지 않는다.
 */

/**
 * 첨부 개수 상한 — 서버와 **같은 값**이다.
 * 넘겨 보내면 409(`BIDDING_MANUAL_NOTICE_ATTACHMENT_LIMIT_EXCEEDED`) 인데,
 * 첨부는 공고를 만든 **뒤에** 올라가므로 그때 막히면 공고만 덩그러니 남는다.
 * 그래서 고르는 자리에서 먼저 막는다.
 */
const MAX_ATTACHMENTS = 10;

/** `http(s)://` 로 시작하는 주소인지. 원문 URL · 첨부 URL 이 같은 규칙을 쓴다 */
function isHttpUrl(value: string) {
  return /^https?:\/\/.+/.test(value.trim());
}

/** 빈 문자열은 보내지 않는다 — 백엔드가 빈 값을 값으로 저장한다 */
function orNull(value: string) {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * `datetime-local` 값(`2026-08-11T09:00`) 을 API 포맷(`2026-08-11T09:00:00`) 으로 바꾼다.
 * 백엔드가 초까지 받고 오프셋은 붙이지 않는다.
 */
function toApiDateTime(value: string) {
  if (value === '') return null;
  return value.length === 16 ? `${value}:00` : value;
}

function toNumber(value: string) {
  return value === '' ? null : Number(value);
}

/**
 * 입찰 공고 직접 등록 화면. (입찰 `EDITOR`, .ai/API.md `입찰 도메인 — 공통`)
 *
 * 수집이 못 가져온 공고를 사람이 넣는 화면이다. 등록해도 상태는 `COLLECTED` 라
 * 목록에서 수집분과 함께 보이고, 구분은 `sourceCode` 로 한다.
 *
 * 첨부는 **파일 업로드**다 (2026-08-17 백엔드 전환 — 예전에는 원문 URL 등록이었다).
 * 업로드 경로에 공고 번호가 들어가므로 **공고를 만든 뒤** 파일을 올린다.
 */
export default function NoticeCreateForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [jointContractAllowed, setJointContractAllowed] = useState(false);
  /**
   * 올릴 첨부 파일.
   *
   * ⚠️ **등록 버튼을 누를 때 한꺼번에 올린다** — 업로드 경로에 `noticeId` 가 들어가서
   *    공고를 먼저 만들어야 한다 (`POST /bidding/notices` → 파일 업로드).
   */
  const [files, setFiles] = useState<File[]>([]);
  /** 숨긴 파일 입력 — `파일 선택` 버튼이 대신 연다 */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      ⚠️ 계산을 `setFiles` 업데이터 **밖**에서 한다 — 업데이터는 순수해야 하고,
         React 가 두 번 실행할 수 있어(StrictMode) 그 안에서 다른 상태를 건드리면
         안내가 두 번 세워진다. 이벤트 핸들러라 `files` 는 이미 최신 값이다.
    */
    // 같은 파일을 두 번 고르면 그대로 두 번 올라간다 — 이름+크기로 걸러낸다
    const keys = new Set(files.map((file) => `${file.name} ${file.size}`));
    const added = Array.from(picked).filter(
      (file) => !keys.has(`${file.name} ${file.size}`),
    );
    const room = Math.max(MAX_ATTACHMENTS - files.length, 0);

    /*
      상한을 넘겨 고르면 **앞에서부터 담을 수 있는 만큼만** 담는다.
      통째로 되돌리면 방금 고른 것이 하나도 안 들어온 것처럼 보인다.
    */
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

    // 비워 두는 것은 괜찮다 — 적었을 때만 형식을 본다
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
   *
   * 구획 5개에 항목이 20개 가까워 제출 버튼에서 첫 오류가 보이지 않는다.
   * 포커스를 옮기면 스크롤과 스크린리더 안내가 함께 처리된다.
   */
  function focusField(name: string) {
    document.getElementById(name)?.focus();
  }

  function toPayload(): CreateNoticeRequest {
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
      // 첨부는 공고를 만든 뒤 파일 업로드로 붙인다 (아래 `handleSubmit`)
      attachments: [],
    };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const result = await createNotice(toPayload());

      /*
        ⚠️ 공고는 이미 만들어졌다 — 여기서 실패해도 **되돌리지 않는다.**
           지운 뒤 다시 만들게 하면 입력한 20여 개 항목을 또 채워야 한다.
           올리지 못한 파일만 알려주고 상세로 보낸다 (거기서 다시 붙일 수 있다).
      */
      const failed: string[] = [];

      for (const file of files) {
        try {
          await uploadNoticeAttachment(result.noticeId, file);
        } catch {
          failed.push(file.name);
        }
      }

      if (failed.length > 0) {
        notifyToast(
          `공고는 등록됐지만 첨부 ${failed.length}개를 올리지 못했습니다: ${failed.join(', ')}`,
          'error',
        );
      }

      router.replace(BIDDING_ROUTES.detail(result.noticeId));
    } catch (error) {
      // 중복은 입력을 고칠 여지가 있어 폼을 유지한 채 알려준다
      const isDuplicated =
        error instanceof ApiError &&
        error.code === BIDDING_CODES.manualNoticeDuplicated;

      setFormError(
        isDuplicated
          ? '같은 공고가 이미 등록돼 있습니다. 목록에서 확인해주세요.'
          : messageOf(
              error,
              '공고 등록에 실패했습니다. 잠시 후 다시 시도해주세요.',
            ),
      );
      setIsSubmitting(false);
    }
  }

  return (
    /* 폭 · 경로 글씨는 프로젝트 생성(`ProjectCreateForm`)과 같은 값이다 — 두 화면 모두
       한 줄짜리 입력 폼이라 폭이 다르면 오갈 때 화면이 넓어졌다 좁아진다 */
    <div className="mx-auto w-full max-w-[820px]">
      <p className="mb-2 text-caption text-text-secondary">
        <Link
          href={BIDDING_ROUTES.list}
          className="hover:text-text-primary hover:underline"
        >
          입찰 공고
        </Link>
        {' › 직접 등록'}
      </p>
      <PageTitle title="공고 직접 등록" />

      <form onSubmit={submit} className="space-y-4 pb-10">
        <FormSection
          title="기본 정보"
          description="수집으로 가져오지 못한 공고를 직접 등록합니다. 등록 후에도 수정할 수 있습니다."
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
          <SelectField
            id="internationalBidType"
            label="국내 · 국제"
            options={INTERNATIONAL_OPTIONS}
            value={values.internationalBidType}
            onChange={change('internationalBidType')}
          />
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
          <TextField
            id="bidMethod"
            label="입찰 방식"
            placeholder="예) 전자입찰"
            value={values.bidMethod}
            onChange={change('bidMethod')}
          />
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
          description="공고문 · 과업지시서 같은 파일을 올립니다. 등록을 누르면 함께 저장됩니다."
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
                ({files.length} / {MAX_ATTACHMENTS})
              </span>
            </p>

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

            {/*
              ⚠️ 파일은 **등록을 누른 뒤에** 올라간다 — 업로드 경로에 공고 번호가 들어가서
                 공고를 먼저 만들어야 한다. 그래서 여기서는 고르기만 한다.
            */}
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
              disabled={isSubmitting || files.length >= MAX_ATTACHMENTS}
              className="btn btn-sm btn-gray"
            >
              파일 선택
            </button>
          </div>
        </FormSection>

        {formError && <AlertBanner tone="danger">{formError}</AlertBanner>}

        <div className="flex justify-end gap-2">
          <Link href={BIDDING_ROUTES.list} className="btn btn-md btn-gray">
            취소
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-md btn-primary min-w-[104px]"
          >
            {isSubmitting ? '등록 중…' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
