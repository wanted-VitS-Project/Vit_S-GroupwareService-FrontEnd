'use client';

import { useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import { notifyToast } from '@/components/Toast';
import { ApiError, messageOf } from '@/lib/api';

import { updateProject } from '../api';
import { isVersionConflict } from '../errorCodes';
import type { ProjectDetail, UpdateProjectRequest } from '../types';
import { CLIENT_NAME_MAX_LENGTH, PROJECT_NAME_MAX_LENGTH } from '../types';
import SettingsSection from './SettingsSection';

interface ProjectInfoFormProps {
  projectId: string;
  /** 아직 도착하지 않았으면 `null` — 입력칸을 비활성으로 그린다 */
  project: ProjectDetail | null;
  canEdit: boolean;
  /** 저장 응답의 **새 `version`** 을 위로 올린다 */
  onSaved: (version: number) => void;
  /** 충돌 후 다시 불러오기 */
  onReload: () => void;
}

/** 폼이 들고 있는 값 — 전부 문자열로 다룬다 (빈칸과 0 을 구분해야 한다) */
interface FormValues {
  name: string;
  description: string;
  clientName: string;
  startedOn: string;
  endedOn: string;
  contractAmount: string;
}

function toFormValues(project: ProjectDetail): FormValues {
  return {
    name: project.name,
    description: project.description ?? '',
    clientName: project.clientName ?? '',
    startedOn: project.startedOn ?? '',
    endedOn: project.endedOn ?? '',
    contractAmount:
      project.contractAmount === null || project.contractAmount === undefined
        ? ''
        : String(project.contractAmount),
  };
}

const EMPTY: FormValues = {
  name: '',
  description: '',
  clientName: '',
  startedOn: '',
  endedOn: '',
  contractAmount: '',
};

/**
 * 과업 기본 정보 편집. (.ai/API.md 129)
 *
 * ⚠️ **전체 덮어쓰기 API 라 폼 전체를 매번 보낸다.** 바뀐 필드만 보내면 나머지가 해제된다 —
 *    그래서 "수정된 칸만 추려 보내기" 같은 최적화를 하지 않는다.
 * ⚠️ 낙관적 락 — 409 면 **재조회 / 덮어쓰기**를 사용자에게 묻는다 (스테이지 · 스텝과 같은 규칙).
 */
export default function ProjectInfoForm({
  projectId,
  project,
  canEdit,
  onSaved,
  onReload,
}: ProjectInfoFormProps) {
  const [values, setValues] = useState<FormValues>(
    project ? toFormValues(project) : EMPTY,
  );
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  /** 409 를 받아 사용자의 선택을 기다리는 중 */
  const [conflictMessage, setConflictMessage] = useState('');

  /*
   * 상세가 도착하거나 다시 읽혔으면 폼을 갈아끼운다.
   * (effect 가 아니라 렌더 중 상태 조정 — https://react.dev/reference/react/useState)
   *
   * `version` 까지 열쇠에 넣는다 — 값이 같아도 버전이 올랐으면 근거가 달라진 것이라
   * 그대로 두면 다음 저장이 옛 버전을 실어 또 409 다.
   */
  const syncKey = project
    ? `${project.projectId}@${project.version ?? '-'}`
    : '';
  const [syncedKey, setSyncedKey] = useState(syncKey);
  if (project && syncedKey !== syncKey) {
    setSyncedKey(syncKey);
    setValues(toFormValues(project));
    setError('');
    setConflictMessage('');
  }

  function change<K extends keyof FormValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setError('');
  }

  /** 6필드를 항상 함께 싣는다 — 빈칸은 "해제" 라는 뜻이라 생략과 같다 */
  function toRequest(version: number, overwrite: boolean) {
    const body: UpdateProjectRequest = { name: values.name.trim(), version };

    if (overwrite) body.overwrite = true;
    if (values.description.trim()) body.description = values.description.trim();
    if (values.clientName.trim()) body.clientName = values.clientName.trim();
    if (values.startedOn) body.startedOn = values.startedOn;
    if (values.endedOn) body.endedOn = values.endedOn;
    if (values.contractAmount.trim()) {
      body.contractAmount = Number(values.contractAmount);
    }

    return body;
  }

  async function save(overwrite: boolean) {
    if (!project || isSaving) return;

    const name = values.name.trim();

    // 백엔드도 막지만, 여기서 걸러야 "이름을 잃은 프로젝트" 를 만들 위험이 없다
    if (!name) {
      setError('과업명을 입력해주세요.');
      return;
    }
    if (name.length > PROJECT_NAME_MAX_LENGTH) {
      setError(`과업명은 ${PROJECT_NAME_MAX_LENGTH}자를 넘을 수 없습니다.`);
      return;
    }
    if (values.clientName.trim().length > CLIENT_NAME_MAX_LENGTH) {
      setError(`발주처는 ${CLIENT_NAME_MAX_LENGTH}자를 넘을 수 없습니다.`);
      return;
    }
    if (
      values.startedOn &&
      values.endedOn &&
      values.startedOn > values.endedOn
    ) {
      setError('시작일이 종료일보다 늦습니다.');
      return;
    }
    /*
     * ⚠️ 숫자가 아닌 값을 먼저 거른다 — `Number('abc')` 는 `NaN` 이라 아래 음수 검사를
     *    그냥 통과하고, JSON 직렬화에서 `null` 이 되어 서버가 400 을 내거나 값을 해제한다.
     *    `type="number"` 가 대부분 막지만 붙여넣기 · IME 로 새어 들어올 수 있다.
     */
    const contractAmount = values.contractAmount.trim()
      ? Number(values.contractAmount)
      : null;

    if (contractAmount !== null && !Number.isFinite(contractAmount)) {
      setError('계약금액은 숫자로 입력해주세요.');
      return;
    }
    if (contractAmount !== null && contractAmount < 0) {
      setError('계약금액은 0보다 작을 수 없습니다.');
      return;
    }
    if (project.version === undefined) {
      setError('버전 정보가 없어 저장할 수 없습니다. 새로고침해주세요.');
      return;
    }

    setError('');
    setConflictMessage('');
    setIsSaving(true);

    try {
      const saved = await updateProject(
        projectId,
        toRequest(project.version, overwrite),
      );
      /*
       * ⚠️ **`version` 만 꽂고 끝내면 안 된다.**
       * 폼 초기화 열쇠(`syncKey`)가 `version` 을 보고 있어, 버전만 올리면 폼이
       * **방금 저장한 값이 아니라 옛 상세 값으로 되돌아간다.**
       * 그래서 새 버전을 올린 뒤 상세를 다시 읽어 서버 값으로 맞춘다
       * (수정 응답에는 `description` 이 없어 응답만으로는 폼을 채울 수 없다).
       */
      onSaved(saved.version);
      onReload();
      notifyToast('과업 정보를 저장했습니다.');
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      if (isVersionConflict(code)) {
        setConflictMessage(
          messageOf(caught, '다른 사람이 먼저 이 프로젝트를 수정했습니다.'),
        );
      } else {
        setError(messageOf(caught, '저장하지 못했습니다.'));
      }
    } finally {
      setIsSaving(false);
    }
  }

  const isDisabled = !project || !canEdit || isSaving;

  return (
    <SettingsSection
      title="과업 정보"
      description="과업명 · 발주처 · 기간 · 계약금액을 수정합니다. 저장하면 폼에 보이는 값이 그대로 반영됩니다."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save(false);
        }}
        className="space-y-4"
      >
        <Field label="과업명" htmlFor="projectName" isRequired>
          <input
            id="projectName"
            value={values.name}
            maxLength={PROJECT_NAME_MAX_LENGTH}
            disabled={isDisabled}
            onChange={(event) => change('name', event.target.value)}
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="설명" htmlFor="projectDescription">
          <textarea
            id="projectDescription"
            value={values.description}
            rows={3}
            disabled={isDisabled}
            onChange={(event) => change('description', event.target.value)}
            className={`${INPUT_CLASS} resize-y`}
          />
        </Field>

        <Field label="발주처" htmlFor="projectClientName">
          <input
            id="projectClientName"
            value={values.clientName}
            maxLength={CLIENT_NAME_MAX_LENGTH}
            disabled={isDisabled}
            onChange={(event) => change('clientName', event.target.value)}
            className={INPUT_CLASS}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="시작일" htmlFor="projectStartedOn">
            <input
              id="projectStartedOn"
              type="date"
              value={values.startedOn}
              disabled={isDisabled}
              onChange={(event) => change('startedOn', event.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="종료일" htmlFor="projectEndedOn">
            <input
              id="projectEndedOn"
              type="date"
              value={values.endedOn}
              disabled={isDisabled}
              onChange={(event) => change('endedOn', event.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        <Field label="계약금액 (원)" htmlFor="projectContractAmount">
          <input
            id="projectContractAmount"
            type="number"
            min={0}
            inputMode="numeric"
            value={values.contractAmount}
            disabled={isDisabled}
            onChange={(event) => change('contractAmount', event.target.value)}
            className={INPUT_CLASS}
          />
        </Field>

        <p className="text-caption break-keep text-text-secondary">
          사업 카테고리는 아래 <strong>사업 카테고리</strong> 항목에서 따로
          관리합니다. 기간은 자동으로 계산되지 않습니다.
        </p>

        {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
        <p
          role="alert"
          className="text-caption break-keep text-text-danger empty:hidden"
        >
          {error}
        </p>

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isDisabled}
              className="cursor-pointer rounded-lg bg-btn-primary px-4 py-2 text-label font-semibold text-text-white hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
            >
              {isSaving ? '저장 중…' : '과업 정보 저장'}
            </button>
          </div>
        )}
      </form>

      {conflictMessage && (
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="다른 사람이 먼저 수정했습니다"
          description={`${conflictMessage} 최신 내용을 다시 불러올지, 지금 입력한 값으로 덮어쓸지 선택해주세요. 덮어쓰면 그 사이 저장된 변경은 사라집니다.`}
          confirmLabel="덮어쓰기"
          cancelLabel="다시 불러오기"
          isDanger
          isBusy={isSaving}
          onConfirm={() => void save(true)}
          onCancel={() => {
            setConflictMessage('');
            onReload();
          }}
        />
      )}
    </SettingsSection>
  );
}

/** 입력칸 공통 모양 — 설정 화면 안에서 폭 · 테두리를 통일한다 */
const INPUT_CLASS =
  'w-full rounded-lg border border-border-default px-3 py-2 text-label text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary disabled:bg-bg-surface disabled:text-text-secondary';

function Field({
  label,
  htmlFor,
  isRequired,
  children,
}: {
  label: string;
  htmlFor: string;
  isRequired?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-detail font-medium text-text-primary"
      >
        {label}
        {isRequired && (
          <span aria-hidden className="ml-0.5 text-text-danger">
            *
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
