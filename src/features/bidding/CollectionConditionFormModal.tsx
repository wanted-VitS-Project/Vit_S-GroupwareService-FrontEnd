'use client';

import { useState } from 'react';

import Modal from '@/components/Modal';
import { ApiError, messageOf } from '@/lib/api';

import { createCollectionCondition, updateCollectionCondition } from './api';
import { BIDDING_CODES } from './errorCodes';
import {
  AlertBanner,
  AmountField,
  CheckboxField,
  SelectField,
  TextField,
} from './FormFields';
import { REGION_OPTIONS } from './regions';
import {
  COLLECTION_LOOKBACK_LABELS,
  type CollectionCondition,
  type CreateCollectionConditionRequest,
} from './types';

/** 폼 대상 — `'create'` 는 등록, 객체는 그 조건 수정 */
export type ConditionFormTarget = 'create' | CollectionCondition;

/** 수집처. 지금은 나라장터뿐이고 등록 후에는 바꿀 수 없다 */
const SOURCE_OPTIONS = [{ value: 'NARA', label: '나라장터' }];

const SCHEDULE_TYPE_OPTIONS = [
  { value: 'WEEKDAYS', label: '평일' },
  { value: 'DAILY', label: '매일' },
];

/**
 * 조회 기간. **라벨 맵에서 파생시킨다** — 목록 화면과 값 집합이 갈리면
 * 한쪽만 고쳤을 때 다른 쪽이 조용히 엉뚱한 기간을 보여준다.
 * 순서는 맵에 적은 순서(짧은 것부터)를 그대로 따른다.
 */
const LOOKBACK_OPTIONS = Object.entries(COLLECTION_LOOKBACK_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const INTERNATIONAL_OPTIONS = [
  { value: 'DOMESTIC', label: '국내입찰' },
  { value: 'INTERNATIONAL', label: '국제입찰' },
];

/** 자동 수집을 켤 때 함께 보내는 값. 서버가 이 기준으로 `nextRunAt` 을 계산한다 */
const TIMEZONE = 'Asia/Seoul';
const DEFAULT_SCHEDULED_TIME = '09:00';

interface FormState {
  sourceCode: string;
  conditionName: string;
  /**
   * 공고 유형. **입력 UI 는 없다** — `industryCodes` 와 같은 이유로 상태로만 들고 있다.
   * 수정이 **전체 교체**라 빼고 보내면 서버에 저장된 값이 지워진다.
   */
  noticeTypes: string[];
  keywords: string[];
  regionCodes: string[];
  /**
   * 업종코드. **입력 UI 는 없다** (2026-08-11) — 우리 사업 카테고리와 체계가 달라 뺐다.
   * 그래도 상태로 들고 있는 이유는 수정이 **전체 교체**라서다 —
   * 빼고 보내면 서버에 저장돼 있던 값이 지워진다.
   */
  industryCodes: string[];
  minimumEstimatedPrice: string;
  maximumEstimatedPrice: string;
  excludeClosed: boolean;
  internationalBidType: string;
  isActive: boolean;
  /** 실행할 때마다 며칠 치를 되돌아볼지 */
  lookbackPeriod: string;
  autoCollectionEnabled: boolean;
  scheduleType: string;
  /** `HH:mm` — 응답(`HH:mm:ss`) 을 그대로 쓰면 안 된다 */
  scheduledTime: string;
}

const EMPTY_STATE: FormState = {
  sourceCode: 'NARA',
  conditionName: '',
  noticeTypes: ['SERVICE'],
  keywords: [],
  regionCodes: [],
  industryCodes: [],
  minimumEstimatedPrice: '',
  maximumEstimatedPrice: '',
  // 이미 마감된 공고를 가져와도 할 수 있는 일이 없다
  excludeClosed: true,
  internationalBidType: 'DOMESTIC',
  isActive: true,
  // 자동 수집을 매일 돌리는 경우가 많아 1주면 충분하다
  lookbackPeriod: 'ONE_WEEK',
  autoCollectionEnabled: false,
  scheduleType: 'WEEKDAYS',
  scheduledTime: DEFAULT_SCHEDULED_TIME,
};

/** 조회값을 폼 상태로 되돌린다. `scheduledTime` 의 초를 떼는 곳이 여기다 */
function toFormState(condition: CollectionCondition): FormState {
  const { filters } = condition;

  return {
    sourceCode: condition.sourceCode,
    conditionName: condition.conditionName,
    noticeTypes: condition.noticeTypes,
    keywords: filters.keywords,
    regionCodes: filters.regionCodes,
    industryCodes: filters.industryCodes,
    minimumEstimatedPrice: filters.minimumEstimatedPrice?.toString() ?? '',
    maximumEstimatedPrice: filters.maximumEstimatedPrice?.toString() ?? '',
    excludeClosed: filters.excludeClosed,
    internationalBidType: filters.internationalBidType,
    isActive: condition.isActive,
    // 옛 조건에는 값이 없다 — 서버 기본값과 같은 것으로 채운다
    lookbackPeriod: condition.lookbackPeriod ?? 'ONE_WEEK',
    autoCollectionEnabled: condition.autoCollectionEnabled,
    scheduleType: condition.scheduleType ?? 'WEEKDAYS',
    scheduledTime:
      condition.scheduledTime?.slice(0, 5) ?? DEFAULT_SCHEDULED_TIME,
  };
}

/**
 * 수집 조건 등록 · 수정 모달. (.ai/API.md 입찰 도메인 공통 `수집 조건`)
 *
 * ⚠️ **수정은 부분 수정이 아니다.** `noticeTypes` · `filters` · 자동 수집 설정이 통째로 교체되므로
 *    조회값을 전부 폼에 채워 다시 보낸다. 한 항목만 고쳐 보내면 나머지가 비워진다.
 * ⚠️ `sourceCode` 는 등록 때만 정한다 — 수정 본문에는 아예 없다.
 */
export default function CollectionConditionFormModal({
  target,
  onClose,
  onSaved,
}: {
  target: ConditionFormTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isCreate = target === 'create';
  const [form, setForm] = useState<FormState>(
    isCreate ? EMPTY_STATE : toFormState(target),
  );
  const [keywordInput, setKeywordInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function patch(next: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...next }));
    setError(null);
  }

  function toggle(name: 'noticeTypes' | 'regionCodes') {
    return (value: string) => {
      const current = form[name];
      patch({
        [name]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      });
    };
  }

  function addKeyword() {
    const value = keywordInput.trim();
    if (value === '') return;

    // 같은 키워드를 두 번 넣으면 조회 조합만 늘어난다 (상한 초과 400 의 원인)
    if (!form.keywords.includes(value)) {
      patch({ keywords: [...form.keywords, value] });
    }
    setKeywordInput('');
  }

  function removeKeyword(value: string) {
    patch({ keywords: form.keywords.filter((item) => item !== value) });
  }

  function validate() {
    if (form.conditionName.trim() === '') return '조건명을 입력해주세요.';
    if (form.keywords.length === 0)
      return '검색 키워드를 하나 이상 넣어주세요.';

    const min = Number(form.minimumEstimatedPrice);
    const max = Number(form.maximumEstimatedPrice);

    // 자릿수가 지나치면 `Number()` 가 `Infinity` 가 되고 JSON 에서 `null` 로 바뀐다
    if (form.minimumEstimatedPrice && !Number.isFinite(min)) {
      return '추정가격 최소가 너무 큽니다.';
    }
    if (form.maximumEstimatedPrice && !Number.isFinite(max)) {
      return '추정가격 최대가 너무 큽니다.';
    }
    if (form.minimumEstimatedPrice && form.maximumEstimatedPrice && min > max) {
      return '추정가격 최소가 최대보다 클 수 없습니다.';
    }
    if (form.autoCollectionEnabled && form.scheduledTime === '') {
      return '자동 수집 시각을 입력해주세요.';
    }

    return null;
  }

  function toPayload(): CreateCollectionConditionRequest {
    const auto = form.autoCollectionEnabled;

    return {
      sourceCode: form.sourceCode,
      conditionName: form.conditionName.trim(),
      noticeTypes: form.noticeTypes,
      filters: {
        keywords: form.keywords,
        regionCodes: form.regionCodes,
        industryCodes: form.industryCodes,
        minimumEstimatedPrice: form.minimumEstimatedPrice
          ? Number(form.minimumEstimatedPrice)
          : null,
        maximumEstimatedPrice: form.maximumEstimatedPrice
          ? Number(form.maximumEstimatedPrice)
          : null,
        excludeClosed: form.excludeClosed,
        internationalBidType: form.internationalBidType,
      },
      isActive: form.isActive,
      lookbackPeriod: form.lookbackPeriod,
      autoCollectionEnabled: auto,
      // 자동 수집이 꺼져 있으면 스케줄 3개를 모두 null 로 보낸다 (응답도 그렇게 온다)
      scheduleType: auto ? form.scheduleType : null,
      scheduledTime: auto ? form.scheduledTime : null,
      timezone: auto ? TIMEZONE : null,
    };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const message = validate();
    if (message) {
      setError(message);
      return;
    }

    setIsSubmitting(true);

    try {
      const { sourceCode, ...rest } = toPayload();

      if (isCreate) {
        await createCollectionCondition({ sourceCode, ...rest });
      } else {
        // 수정 본문에는 `sourceCode` 를 실을 수 없다 — 빼고 보낸다
        await updateCollectionCondition(target.conditionId, rest);
      }

      onSaved();
    } catch (caught) {
      setError(toErrorMessage(caught));
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title={isCreate ? '수집 조건 등록' : '수집 조건 수정'}
      onClose={onClose}
      dismissOnBackdrop={false}
      // 스크롤은 패널이 아니라 **안쪽 목록**이 한다 — 패널이 스크롤하면 스크롤바가
      // 둥근 모서리를 잘라 먹어 위아래 모서리가 짝짝이로 보인다
      className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-base p-8 shadow-2xl"
    >
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        {/* 필드만 스크롤한다 — 제목과 하단 버튼은 제자리에 남는다 */}
        <div className="-mr-3 min-h-0 flex-1 space-y-5 overflow-y-auto pr-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="sourceCode"
              label="수집처"
              required
              options={SOURCE_OPTIONS}
              value={form.sourceCode}
              // 수집처는 등록 때만 정한다 (수정 본문에 없다)
              disabled={!isCreate}
              hint={isCreate ? undefined : '수집처는 변경할 수 없습니다.'}
              onChange={(value) => patch({ sourceCode: value })}
            />
            <SelectField
              id="internationalBidType"
              label="국내 · 국제"
              options={INTERNATIONAL_OPTIONS}
              value={form.internationalBidType}
              onChange={(value) => patch({ internationalBidType: value })}
            />
            <div className="sm:col-span-2">
              <TextField
                id="conditionName"
                label="조건명"
                required
                maxLength={100}
                placeholder="예) 수도권 스마트시티 공사·용역"
                value={form.conditionName}
                onChange={(value) => patch({ conditionName: value })}
              />
            </div>
          </div>

          <div>
            <p className="pb-1.5 text-detail font-semibold text-text-primary">
              검색 키워드
            </p>
            <div className="flex gap-2">
              <input
                value={keywordInput}
                placeholder="키워드 입력 후 Enter"
                onChange={(event) => setKeywordInput(event.target.value)}
                onKeyDown={(event) => {
                  // Enter 로 폼이 제출되면 키워드를 넣다가 조건이 저장된다
                  if (event.key === 'Enter' || event.key === ',') {
                    event.preventDefault();
                    addKeyword();
                  }
                }}
                className="input flex-1"
              />
              {/* 입력칸(`.input` 40px)과 **같은 높이**여야 나란히 선다 — `btn-md` 는 34px 이다 */}
              <button
                type="button"
                onClick={addKeyword}
                className="btn btn-gray min-w-16 shrink-0"
              >
                추가
              </button>
            </div>

            {form.keywords.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {form.keywords.map((keyword) => (
                  <li key={keyword}>
                    <button
                      type="button"
                      onClick={() => removeKeyword(keyword)}
                      className="tag tag-blue cursor-pointer hover:bg-blue-bg"
                      aria-label={`${keyword} 삭제`}
                    >
                      {keyword}
                      <span aria-hidden>×</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <CheckGroup
            label="지역"
            hint="선택하지 않으면 전국"
            options={REGION_OPTIONS.map((option) => ({
              value: option.code,
              label: option.name,
            }))}
            selected={form.regionCodes}
            onToggle={toggle('regionCodes')}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <AmountField
              id="minimumEstimatedPrice"
              label="추정가격 최소"
              // `0` 을 두면 **0원으로 지정한 것**처럼 읽힌다 — 제한 없음을 그대로 적는다
              placeholder="제한 없음"
              value={form.minimumEstimatedPrice}
              onChange={(value) => patch({ minimumEstimatedPrice: value })}
            />
            <AmountField
              id="maximumEstimatedPrice"
              label="추정가격 최대"
              placeholder="제한 없음"
              value={form.maximumEstimatedPrice}
              onChange={(value) => patch({ maximumEstimatedPrice: value })}
            />
          </div>

          <div className="space-y-2 rounded-lg border border-border-default bg-bg-surface p-4">
            <CheckboxField
              id="excludeClosed"
              label="이미 마감된 공고 제외"
              checked={form.excludeClosed}
              onChange={(checked) => patch({ excludeClosed: checked })}
            />
            <CheckboxField
              id="isActive"
              label="조건 활성화"
              checked={form.isActive}
              onChange={(checked) => patch({ isActive: checked })}
            />
            {/**
             * 조회 기간은 자동 · 수동 수집에 **모두** 적용된다 —
             * 자동 수집 칸 안에 넣으면 수동 실행에는 안 걸리는 것처럼 읽힌다.
             */}
            <SelectField
              id="lookbackPeriod"
              label="조회 기간"
              hint="실행할 때마다 이 기간만큼 거슬러 올라가 검색합니다."
              options={LOOKBACK_OPTIONS}
              value={form.lookbackPeriod}
              onChange={(value) => patch({ lookbackPeriod: value })}
            />

            <CheckboxField
              id="autoCollectionEnabled"
              label="자동 수집"
              checked={form.autoCollectionEnabled}
              onChange={(checked) => patch({ autoCollectionEnabled: checked })}
            />

            {form.autoCollectionEnabled && (
              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                <SelectField
                  id="scheduleType"
                  label="주기"
                  options={SCHEDULE_TYPE_OPTIONS}
                  value={form.scheduleType}
                  onChange={(value) => patch({ scheduleType: value })}
                />
                <TextField
                  id="scheduledTime"
                  label="시각"
                  type="time"
                  hint={`기준 시간대: ${TIMEZONE}`}
                  value={form.scheduledTime}
                  onChange={(value) => patch({ scheduledTime: value })}
                />
              </div>
            )}
          </div>
        </div>

        {error && (
          <AlertBanner tone="danger" className="mt-4">
            {error}
          </AlertBanner>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-md btn-gray"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-md btn-primary min-w-[104px]"
          >
            {isSubmitting ? '저장 중…' : isCreate ? '등록' : '저장'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** 여러 개를 고르는 체크박스 묶음 — 유형 · 지역 · 카테고리가 같은 모양을 쓴다 */
function CheckGroup({
  label,
  required,
  hint,
  options,
  selected,
  onToggle,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="pb-1.5 text-detail font-semibold text-text-primary">
        {label} {required && <span className="text-text-danger">*</span>}
      </p>

      {options.length === 0 ? (
        <p className="text-caption break-keep text-text-secondary">{hint}</p>
      ) : (
        <>
          <ul className="flex flex-wrap gap-1.5">
            {options.map((option) => {
              const isOn = selected.includes(option.value);

              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => onToggle(option.value)}
                    aria-pressed={isOn}
                    // 공용 `.tag` 를 토글로 쓴다 — 켜짐은 blue, 꺼짐은 gray
                    className={`tag cursor-pointer transition-colors ${
                      isOn ? 'tag-blue' : 'tag-gray hover:bg-bg-hover'
                    }`}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>
          {hint && (
            <p className="mt-1 text-caption break-keep text-text-secondary">
              {hint}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** 400 세 종류는 원인이 달라 문구를 나눈다 — 백엔드 문구만으로는 무엇을 고칠지 알 수 없다 */
function toErrorMessage(error: unknown) {
  const code = error instanceof ApiError ? error.code : undefined;

  if (code === BIDDING_CODES.collectionQueryLimitExceeded) {
    return '조건 조합이 너무 많아요. 키워드 · 지역 · 카테고리 수를 줄여주세요.';
  }
  if (code === BIDDING_CODES.unsupportedSource) {
    return '지원하지 않는 수집처입니다.';
  }
  if (code === BIDDING_CODES.invalidCollectionCondition) {
    return messageOf(error, '입력값을 다시 확인해주세요.');
  }

  return messageOf(error, '저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
}
