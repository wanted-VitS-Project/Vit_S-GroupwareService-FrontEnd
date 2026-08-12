'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import PageTitle from '@/components/PageTitle';
import { ApiError, messageOf } from '@/lib/api';

import { createNotice } from './api';
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
import type { CreateNoticeRequest, NoticeAttachmentInput } from './types';

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
  /**
   * 원문 URL 은 백엔드가 요구하지 않지만 **화면 정책으로 필수**다 (2026-08-11 결정).
   * 직접 등록 건은 근거가 사람 입력뿐이라, 원문 링크가 없으면 나중에 내용을 확인할 방법이 없다.
   */
  sourceUrl: '공고 원문 URL 을 입력해주세요.',
};

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
 * 첨부는 **파일 업로드가 아니라 원문 URL 등록**이다 — 우리 저장소에 올라가지 않는다.
 */
export default function NoticeCreateForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [jointContractAllowed, setJointContractAllowed] = useState(false);
  const [attachments, setAttachments] = useState<NoticeAttachmentInput[]>([]);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  /** 첨부 행별 오류 — 어느 줄이 잘못됐는지 그 줄에 붙여 보여준다 */
  const [attachmentErrors, setAttachmentErrors] = useState<
    Record<number, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function change(name: FieldName) {
    return (value: string) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      // 고치는 중에 빨간 글씨가 남아 있으면 이미 해결한 것도 문제처럼 보인다
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    };
  }

  function addAttachment() {
    setAttachments((prev) => [...prev, { fileName: '', sourceUrl: '' }]);
  }

  function changeAttachment(
    index: number,
    key: keyof NoticeAttachmentInput,
    value: string,
  ) {
    setAttachments((prev) =>
      prev.map((item, at) => (at === index ? { ...item, [key]: value } : item)),
    );
    setAttachmentErrors((prev) => ({ ...prev, [index]: '' }));
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, at) => at !== index));
  }

  /** 마감일이 공고일보다 앞서는 등 순서가 뒤집힌 입력을 잡는다 */
  function validate() {
    const next: Partial<Record<FieldName, string>> = {};

    for (const [name, message] of Object.entries(REQUIRED_MESSAGES)) {
      if (values[name as FieldName].trim() === '') {
        next[name as FieldName] = message;
      }
    }

    const { announcedAt, bidDeadlineAt, openingAt, sourceUrl } = values;

    // 필수로 잡았으니 형식도 본다 — `example.org` 만 적으면 링크가 열리지 않는다
    if (next.sourceUrl === undefined && !isHttpUrl(sourceUrl)) {
      next.sourceUrl = 'http:// 또는 https:// 로 시작하는 주소를 넣어주세요.';
    }

    if (announcedAt && bidDeadlineAt && bidDeadlineAt < announcedAt) {
      next.bidDeadlineAt = '마감일이 공고일보다 앞설 수 없어요.';
    }
    if (bidDeadlineAt && openingAt && openingAt < bidDeadlineAt) {
      next.openingAt = '개찰일이 마감일보다 앞설 수 없어요.';
    }

    setErrors(next);

    /**
     * 첨부는 **파일명과 URL 이 짝**이어야 한다.
     * 한쪽만 채우면 링크 없는 첨부(열 수 없음) · 이름 없는 첨부(구분 불가) 가 저장된다.
     */
    const attachmentIssues: Record<number, string> = {};

    attachments.forEach((item, index) => {
      const fileName = item.fileName.trim();
      const url = item.sourceUrl.trim();

      // 둘 다 비어 있으면 전송 전에 걸러내므로 오류가 아니다
      if (fileName === '' && url === '') return;

      if (fileName === '') attachmentIssues[index] = '파일명을 넣어주세요.';
      else if (url === '') attachmentIssues[index] = '파일 URL 을 넣어주세요.';
      else if (!isHttpUrl(url))
        attachmentIssues[index] =
          'http:// 또는 https:// 로 시작하는 주소를 넣어주세요.';
    });

    setAttachmentErrors(attachmentIssues);

    const firstInvalid = Object.keys(next)[0];
    if (firstInvalid) focusField(firstInvalid);

    return (
      Object.keys(next).length === 0 &&
      Object.keys(attachmentIssues).length === 0
    );
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

  /**
   * 이름 · URL 이 **둘 다 채워진 행만** 보낸다.
   * 빈 행(추가만 하고 안 채운 것)은 조용히 버리고, 한쪽만 채운 행은 검증에서 이미 막힌다.
   */
  function toAttachmentPayload() {
    return attachments
      .map((item) => ({
        fileName: item.fileName.trim(),
        sourceUrl: item.sourceUrl.trim(),
      }))
      .filter((item) => item.fileName !== '' && item.sourceUrl !== '');
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
      attachments: toAttachmentPayload(),
    };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const result = await createNotice(toPayload());
      router.replace(BIDDING_ROUTES.detail(result.noticeId));
    } catch (error) {
      // 중복은 입력을 고칠 여지가 있어 폼을 유지한 채 알려준다
      const isDuplicated =
        error instanceof ApiError &&
        error.code === BIDDING_CODES.manualNoticeDuplicated;

      setFormError(
        isDuplicated
          ? '같은 공고가 이미 등록돼 있어요. 목록에서 확인해주세요.'
          : messageOf(
              error,
              '공고 등록에 실패했어요. 잠시 후 다시 시도해주세요.',
            ),
      );
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <p className="text-micro text-text-secondary">
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
          description="수집으로 가져오지 못한 공고를 직접 넣습니다. 등록 후에도 수정할 수 있어요."
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
          description="비워두면 목록에서 '-' 로 보입니다. 마감일을 넣으면 남은 일수(D-Day)가 계산돼요."
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
            hint="나라장터 '기초금액'. 공개 전이면 비워둡니다."
            placeholder="0"
            value={values.baseAmount}
            onChange={change('baseAmount')}
          />
          <AmountField
            id="estimatedAmount"
            label="추정가격"
            hint="부가가치세를 포함하지 않은 금액입니다."
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
          description="첨부는 파일 업로드가 아니라 원문 사이트의 링크를 적어두는 것입니다."
        >
          <div className="sm:col-span-2">
            <TextField
              id="sourceUrl"
              label="공고 원문 URL"
              type="url"
              required
              placeholder="https://"
              hint="직접 등록한 공고는 원문 링크가 유일한 근거 자료라 반드시 필요해요."
              value={values.sourceUrl}
              error={errors.sourceUrl}
              onChange={change('sourceUrl')}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            {attachments.map((attachment, index) => (
              <div
                // 값으로 key 를 만들면 입력 중에 순서가 바뀐다 — 인덱스가 맞다
                key={index}
                className="flex items-end gap-2"
              >
                <div className="w-52 shrink-0">
                  <TextField
                    id={`attachment-name-${index}`}
                    label="파일명"
                    placeholder="공고문.pdf"
                    value={attachment.fileName}
                    onChange={(value) =>
                      changeAttachment(index, 'fileName', value)
                    }
                  />
                </div>
                <div className="flex-1">
                  <TextField
                    id={`attachment-url-${index}`}
                    label="파일 URL"
                    type="url"
                    placeholder="https://"
                    value={attachment.sourceUrl}
                    error={attachmentErrors[index] || undefined}
                    onChange={(value) =>
                      changeAttachment(index, 'sourceUrl', value)
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="btn btn-sm btn-gray"
                >
                  삭제
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addAttachment}
              className="btn btn-sm btn-gray"
            >
              첨부 추가
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
            className="btn btn-md btn-primary"
          >
            {isSubmitting ? '등록 중…' : '등록'}
          </button>
        </div>
      </form>
    </>
  );
}
