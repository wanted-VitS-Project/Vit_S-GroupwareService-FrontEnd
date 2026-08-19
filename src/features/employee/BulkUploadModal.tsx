'use client';

import { useId, useRef, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import Modal from '@/components/Modal';
import { notifyToast } from '@/components/Toast';
import { ApiError, messageOf } from '@/lib/api';
import { useModal } from '@/lib/useModal';

import {
  downloadBulkTemplate,
  registerBulkEmployees,
  validateBulkEmployees,
} from './api';
import { BULK_FILE_CODES } from './errorCodes';
import type {
  BulkRegisterResult,
  BulkRowError,
  BulkValidateResult,
  MasterNameCount,
} from './types';

/** 5MB. 서버 상한과 같은 값이라 넘기면 보내기 전에 막는다 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * 템플릿 8개 열의 입력 규칙.
 * 템플릿 파일에는 헤더 줄만 있어 형식 안내를 여기서 대신 보여준다.
 */
const TEMPLATE_COLUMNS: {
  name: string;
  required: boolean;
  format: string;
}[] = [
  {
    name: '사번',
    required: true,
    format: '로그인 아이디 · 중복 불가',
  },
  { name: '이름', required: true, format: '' },
  { name: '부서명', required: true, format: '등록된 부서명과 동일하게' },
  { name: '직급명', required: false, format: '등록된 직급명과 동일하게' },
  {
    name: '입사일',
    required: true,
    // 엑셀이 날짜 서식으로 바꾸면 2026.04.05 가 되어 그대로 검증에 걸린다
    format: "yyyy-MM-dd · 셀 서식 '텍스트'",
  },
  {
    name: '이메일',
    required: false,
    format: '없으면 계정 메일 미발송',
  },
  { name: '연락처', required: false, format: '' },
  {
    name: '권한',
    required: true,
    format: 'MASTER · MEMBER',
  },
  /*
    학력 · 자격증은 한 칸에 여러 개를 담는다. 행을 늘리면 사번이 중복된다.
    구분자는 세미콜론 · 쉼표 · 셀 안 줄바꿈이라 이름에 쉼표가 있으면 쪼개진다.
  */
  {
    name: '학력',
    // 규칙을 적어 두면 읽고 다시 해석해야 한다. 그대로 따라 쓸 예시를 준다
    required: false,
    format: '컴퓨터공학:학사',
  },
  {
    name: '자격증',
    required: false,
    format: '정보처리기사',
  },
];

type Step = 'pick' | 'validated' | 'done';

/** 진행 중인 요청. 버튼 라벨이 갈려 불리언 하나로는 부족하다 */
type Busy = 'template' | 'validate' | 'register' | null;

const STEP_HEADER: Record<Step, { label: string; title: string }> = {
  pick: { label: '1 / 3', title: '엑셀 일괄 등록' },
  validated: { label: '2 / 3', title: '검증 결과 확인' },
  done: { label: '3 / 3', title: '등록 결과' },
};

/**
 * 사원 엑셀 일괄 등록. 템플릿 받기 → 검증 → 등록 3단계다.
 * 등록은 행마다 독립 트랜잭션이라 되돌릴 수 없어 무엇이 들어갈지 먼저 보여준다.
 */
export default function BulkUploadModal({
  onClose,
  onRegistered,
}: {
  onClose: () => void;
  /** 등록이 하나라도 성공하면 목록을 다시 불러온다 */
  onRegistered: () => void;
}) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<BulkValidateResult | null>(null);
  const [result, setResult] = useState<BulkRegisterResult | null>(null);
  const [skipErrors, setSkipErrors] = useState(false);
  /** 검증과 등록에 같은 값을 보내야 결과가 어긋나지 않는다 */
  const [autoCreateMasters, setAutoCreateMasters] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  /** 등록은 되돌릴 수 없고 초기 비밀번호 메일까지 나가 한 번 더 묻는다 */
  const confirmModal = useModal();
  const [busy, setBusy] = useState<Busy>(null);

  const isBusy = busy !== null;

  /** 파일을 바꾸면 앞서 받은 검증 결과는 더 이상 그 파일의 것이 아니다 */
  function pickFile(next: File | null) {
    setFile(next);
    setValidation(null);
    setErrorMessage('');
    setStep('pick');
  }

  async function handleTemplate() {
    setBusy('template');
    setErrorMessage('');
    try {
      await downloadBulkTemplate();
    } catch (caught) {
      setErrorMessage(messageOf(caught, '템플릿을 내려받지 못했습니다.'));
    } finally {
      setBusy(null);
    }
  }

  async function handleValidate() {
    if (!file) return;

    setBusy('validate');
    setErrorMessage('');
    try {
      const next = await validateBulkEmployees(file, autoCreateMasters);
      setValidation(next);
      // 오류가 없으면 건너뛰기를 물을 이유가 없다
      setSkipErrors(next.errorCount > 0);
      setStep('validated');
    } catch (caught) {
      const message = messageOf(caught, '파일을 검증하지 못했습니다.');

      setErrorMessage(message);
      notifyToast(message, 'error');
      // 파일 자체가 문제면 다시 고르는 것 말고 할 일이 없다
      if (
        caught instanceof ApiError &&
        BULK_FILE_CODES.includes(caught.code ?? '')
      ) {
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleRegister() {
    if (!file) return;

    setBusy('register');
    setErrorMessage('');
    try {
      const next = await registerBulkEmployees(
        file,
        skipErrors,
        autoCreateMasters,
      );
      setResult(next);
      confirmModal.close();
      setStep('done');
      if (next.registeredCount > 0) onRegistered();
      notifyToast(`사원 ${next.registeredCount}명을 등록했습니다.`);
    } catch (caught) {
      const message = messageOf(caught, '등록하지 못했습니다.');

      setErrorMessage(message);
      notifyToast(message, 'error');
      // 확인 창을 닫고 검증 화면으로 되돌린다. 고칠 곳이 거기 있다
      confirmModal.close();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal
      title={STEP_HEADER[step].title}
      stepLabel={STEP_HEADER[step].label}
      // 처리 중에 닫으면 등록이 어디까지 됐는지 알 수 없다
      onClose={isBusy ? undefined : onClose}
      // 검증 표를 훑다 바깥을 잘못 눌러도 처음부터 하게 되면 곤란하다
      dismissOnBackdrop={false}
      className="w-full max-w-[640px] rounded-base p-8 shadow-2xl"
    >
      <div className="mt-5">
        {step === 'pick' && (
          <PickStep
            autoCreateMasters={autoCreateMasters}
            onToggleAutoCreate={setAutoCreateMasters}
            fileInputId={fileInputId}
            fileInputRef={fileInputRef}
            file={file}
            busy={busy}
            onDownload={handleTemplate}
            onPick={pickFile}
            onInvalidFile={setErrorMessage}
          />
        )}

        {step === 'validated' && validation && (
          <ValidatedStep
            validation={validation}
            skipErrors={skipErrors}
            isBusy={isBusy}
            onToggleSkip={setSkipErrors}
          />
        )}

        {step === 'done' && result && <DoneStep result={result} />}

        {errorMessage && (
          <p role="alert" className="mt-4 text-label text-text-danger">
            {errorMessage}
          </p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        {step === 'pick' && (
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="btn btn-md btn-gray-outlined"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleValidate}
              disabled={!file || isBusy}
              className="btn btn-md btn-primary min-w-[104px]"
            >
              {busy === 'validate' ? '검증 중…' : '검증'}
            </button>
          </>
        )}

        {step === 'validated' && validation && (
          <>
            <button
              type="button"
              onClick={() => setStep('pick')}
              disabled={isBusy}
              className="btn btn-md btn-gray-outlined"
            >
              파일 다시 선택
            </button>
            <button
              type="button"
              onClick={confirmModal.open}
              // 건너뛰기를 꺼둔 채로 오류가 있으면 서버가 전체를 거부한다
              disabled={
                isBusy ||
                validation.validCount === 0 ||
                (validation.errorCount > 0 && !skipErrors)
              }
              className="btn btn-md btn-primary min-w-[104px]"
            >
              {busy === 'register'
                ? '등록 중…'
                : `${validation.validCount}명 등록`}
            </button>
          </>
        )}

        {step === 'done' && (
          <button
            type="button"
            onClick={onClose}
            className="btn btn-md btn-primary min-w-[104px]"
          >
            닫기
          </button>
        )}
      </div>

      {/*
        되돌릴 수 없는 데다 초기 비밀번호 메일이 즉시 나간다.
        발송을 끄는 옵션이 없어 한 번 더 묻는다.
      */}
      {confirmModal.isOpen && validation && (
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title={`${validation.validCount}명을 등록할까요?`}
          description={
            <>
              계정이 함께 발급되고 <b>사번 · 초기 비밀번호 메일이 바로 발송</b>
              됩니다.
              <br />
              {validation.errorCount > 0 && (
                <>
                  오류 {validation.errorCount}건은 건너뜁니다.
                  <br />
                </>
              )}
              등록을 취소할 수는 없고, 잘못 등록하면 퇴사 처리해야 합니다.
            </>
          }
          confirmLabel="등록"
          isBusy={busy === 'register'}
          onConfirm={handleRegister}
          onCancel={confirmModal.close}
        />
      )}
    </Modal>
  );
}

/** 1단계. 템플릿을 받고 채운 파일을 고른다 */
function PickStep({
  fileInputId,
  fileInputRef,
  file,
  busy,
  autoCreateMasters,
  onDownload,
  onPick,
  onInvalidFile,
  onToggleAutoCreate,
}: {
  fileInputId: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  file: File | null;
  busy: Busy;
  autoCreateMasters: boolean;
  onDownload: () => void;
  onPick: (file: File | null) => void;
  onInvalidFile: (message: string) => void;
  onToggleAutoCreate: (next: boolean) => void;
}) {
  const isBusy = busy !== null;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border border-border-default p-4">
        <h3 className="text-body-m font-semibold text-text-primary">
          1. 템플릿 내려받기
        </h3>
        <p className="mt-1 text-label break-keep text-text-secondary">
          열을 지우거나 순서를 바꾸지 마세요.
        </p>
        <button
          type="button"
          onClick={onDownload}
          disabled={isBusy}
          className="btn btn-sm btn-gray-outlined mt-3"
        >
          {busy === 'template' ? '내려받는 중…' : '템플릿 다운로드'}
        </button>

        <table className="mt-4 w-full text-left text-label">
          <thead>
            <tr className="text-text-secondary">
              <th scope="col" className="pb-1.5 font-medium">
                열
              </th>
              <th scope="col" className="pb-1.5 font-medium">
                입력 형식
              </th>
            </tr>
          </thead>
          <tbody>
            {TEMPLATE_COLUMNS.map((column) => (
              <tr key={column.name} className="border-t border-border-default">
                <td className="py-1.5 whitespace-nowrap text-text-primary">
                  {column.name}
                  {column.required && (
                    <>
                      <span className="ml-1 text-text-danger" aria-hidden>
                        *
                      </span>
                      <span className="sr-only">(필수)</span>
                    </>
                  )}
                </td>
                <td className="py-1.5 break-keep text-text-secondary">
                  {column.format || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-label text-text-secondary">
          <span className="text-text-danger">*</span> 는 필수 항목입니다.
        </p>
        {/* 문장마다 줄을 준다. 한 문단으로 흘리면 줄바꿈이 문장 가운데 걸린다 */}
        <ul className="mt-1 flex flex-col gap-0.5 text-label break-keep text-text-secondary">
          <li>
            학력은 <b className="font-semibold">전공:학위</b> 순으로 적습니다.
          </li>
          <li>학력 · 자격증 모두 등록된 항목 이름과 같아야 합니다.</li>
          <li>여러 개는 쌍반점(;) · 쉼표(,) · 셀 안 줄바꿈으로 구분합니다.</li>
          <li>항목 이름에 쉼표가 들어 있으면 쌍반점을 쓰세요.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-body-m font-semibold text-text-primary">
          2. 작성한 파일 선택
        </h3>

        {/*
          네이티브 파일 표시를 숨긴다. 단계를 오가면 input 이 새로 그려지는데
          값은 되돌릴 수 없어 살아남은 file state 와 갈린다.
        */}
        <input
          id={fileInputId}
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          disabled={isBusy}
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null;

            // 서버 상한과 같은 값이라 미리 막아 왕복을 줄인다
            if (next && next.size > MAX_FILE_SIZE) {
              onInvalidFile('파일이 5MB를 넘습니다. 나눠서 등록해주세요.');
              event.target.value = '';
              onPick(null);
              return;
            }
            onPick(next);
          }}
          className="peer sr-only"
        />
        <label
          htmlFor={fileInputId}
          className={`btn btn-md btn-gray-outlined mt-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-border-primary ${
            isBusy ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          {file ? '다른 파일 선택' : '파일 선택'}
        </label>

        <p className="mt-2 text-label text-text-secondary">
          {file ? `선택된 파일: ${file.name}` : '선택된 파일이 없습니다.'}
        </p>

        {/* 켜면 목록에 없는 이름이 행 오류가 아니라 생성 대상이 된다 */}
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-label text-text-primary">
          <input
            type="checkbox"
            checked={autoCreateMasters}
            disabled={isBusy}
            onChange={(event) => onToggleAutoCreate(event.target.checked)}
            className="mt-0.5 cursor-pointer"
          />
          <span className="break-keep">
            목록에 없는 전공 · 자격증은 자동 등록
            <span className="block text-text-secondary">
              끄면 등록되지 않은 이름이 있는 행은 오류로 빠집니다. 켜면 검증
              화면에서 새로 생길 이름을 먼저 확인할 수 있습니다.
            </span>
          </span>
        </label>
      </section>
    </div>
  );
}

/** 2단계. 등록은 되돌릴 수 없어 무엇이 들어갈지 먼저 보여준다 */
function ValidatedStep({
  validation,
  skipErrors,
  isBusy,
  onToggleSkip,
}: {
  validation: BulkValidateResult;
  skipErrors: boolean;
  isBusy: boolean;
  onToggleSkip: (next: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <CountRow
        items={[
          { label: '전체', value: validation.totalRows },
          { label: '정상', value: validation.validCount },
          { label: '오류', value: validation.errorCount, isDanger: true },
        ]}
      />

      <NewMastersPreview newMasters={validation.newMasters} />

      {validation.emailNotRegisteredCount > 0 && (
        <p className="rounded-lg bg-bg-hover px-4 py-3 text-label break-keep text-text-secondary">
          이메일이 없는 행이 {validation.emailNotRegisteredCount}건 있습니다.
          등록은 되지만 초기 비밀번호 메일이 발송되지 않습니다.
        </p>
      )}

      {validation.errorCount > 0 && (
        <>
          <RowErrorTable errors={validation.errors} />
          {/* 한 행에 오류가 여러 개여도 응답은 하나만 준다 */}
          <p className="text-label break-keep text-text-secondary">
            한 행에 문제가 여러 개여도 사유는 하나씩만 표시됩니다. 고친 뒤 다시
            검증하면 남은 문제가 나타납니다.
          </p>
          {/* 정상 행이 없으면 켜든 끄든 등록될 게 없어 감춘다 */}
          {validation.validCount > 0 && (
            <label className="flex cursor-pointer items-start gap-2 text-label text-text-primary">
              <input
                type="checkbox"
                checked={skipErrors}
                disabled={isBusy}
                onChange={(event) => onToggleSkip(event.target.checked)}
                className="mt-0.5 cursor-pointer"
              />
              <span className="break-keep">
                오류 행을 건너뛰고 정상 {validation.validCount}건만 등록합니다.
                <span className="block text-text-secondary">
                  끄면 오류가 하나라도 있을 때 전체가 거부됩니다.
                </span>
              </span>
            </label>
          )}
        </>
      )}

      {/*
        정상 행 0건을 먼저 본다. 빈 파일은 오류도 0 이라 아래 문구로 떨어지면
        등록할 수 있다고 해놓고 버튼은 비활성인 화면이 된다.
      */}
      {validation.validCount === 0 ? (
        <p className="text-label break-keep text-text-secondary">
          등록할 수 있는 행이 없습니다. 파일을 채우거나 오류를 고친 뒤 다시
          검증해주세요.
        </p>
      ) : (
        validation.errorCount === 0 && (
          <p className="text-label text-text-secondary">
            오류가 없습니다. 그대로 등록할 수 있습니다.
          </p>
        )
      )}
    </div>
  );
}

/** 새로 생길 전공 · 자격증. 오타가 마스터가 되는 걸 등록 전에 잡는 유일한 자리다 */
function NewMastersPreview({ newMasters }: { newMasters: MasterNameCount }) {
  const groups = [
    { label: '전공', items: newMasters?.majors ?? [] },
    { label: '자격증', items: newMasters?.certificates ?? [] },
  ].filter((group) => group.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <section className="rounded-lg border border-border-primary bg-blue-bg-soft px-4 py-3">
      <h3 className="text-label font-semibold text-text-primary">
        등록하면 아래 이름이 새로 만들어집니다
      </h3>

      {groups.map((group) => (
        <p key={group.label} className="mt-2 text-label break-keep">
          <span className="font-semibold text-text-primary">
            {group.label} {group.items.length}개
          </span>
          <span className="text-text-secondary">
            {' — '}
            {group.items
              .map((item) => `${item.name} (${item.rowCount}행)`)
              .join(' · ')}
          </span>
        </p>
      ))}

      <p className="mt-2 text-micro break-keep text-text-secondary">
        오타가 있으면 그대로 등록됩니다. 파일을 고치고 다시 검증해주세요.
      </p>
    </section>
  );
}

/** 3단계. 행마다 독립 트랜잭션이라 부분 성공이 정상이다 */
function DoneStep({ result }: { result: BulkRegisterResult }) {
  return (
    <div className="flex flex-col gap-4">
      <CountRow
        items={[
          { label: '전체', value: result.totalRows },
          { label: '등록', value: result.registeredCount },
          { label: '실패', value: result.failedCount, isDanger: true },
        ]}
      />

      <p className="text-label text-text-secondary">
        초기 비밀번호 메일 {result.emailSentCount}건 발송
      </p>

      {result.emailNotRegistered.length > 0 && (
        <div className="rounded-lg bg-bg-hover px-4 py-3">
          <p className="text-label font-semibold text-text-primary">
            이메일이 없어 발송하지 못한 사번 {result.emailNotRegistered.length}
            건
          </p>
          <p className="mt-1 text-label break-keep text-text-secondary">
            {result.emailNotRegistered.join(' · ')}
          </p>
          <p className="mt-1 text-label break-keep text-text-secondary">
            이메일을 등록한 뒤 비밀번호 재설정으로 발송할 수 있습니다.
          </p>
        </div>
      )}

      {result.errors.length > 0 && <RowErrorTable errors={result.errors} />}
    </div>
  );
}

function CountRow({
  items,
}: {
  items: { label: string; value: number; isDanger?: boolean }[];
}) {
  return (
    <dl className="flex gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex-1 rounded-lg border border-border-default px-4 py-3"
        >
          <dt className="text-label text-text-secondary">{item.label}</dt>
          <dd
            className={`mt-0.5 text-heading-m font-bold ${
              item.isDanger && item.value > 0
                ? 'text-text-danger'
                : 'text-text-primary'
            }`}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * 행 오류 표. 검증 · 등록이 같은 구조라 한 컴포넌트로 쓴다.
 * 행 번호는 엑셀에서 찾아갈 좌표라 가장 앞에 둔다.
 */
function RowErrorTable({ errors }: { errors: BulkRowError[] }) {
  return (
    <div className="max-h-60 overflow-auto rounded-lg border border-border-default">
      <table className="w-full text-left text-label">
        <thead className="sticky top-0 bg-bg-hover">
          <tr className="text-text-secondary">
            <th scope="col" className="px-4 py-2.5 font-medium">
              행
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              사번
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              이름
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              사유
            </th>
          </tr>
        </thead>
        <tbody>
          {errors.map((error) => (
            <tr
              key={`${error.row}-${error.validation}`}
              className="border-t border-border-default text-text-primary"
            >
              <td className="px-4 py-2.5 whitespace-nowrap">{error.row}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                {error.userId || '—'}
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                {error.name || '—'}
              </td>
              {/* 백엔드 문구가 가장 정확해 프론트가 다시 쓰지 않는다 */}
              <td className="px-4 py-2.5 break-keep">{error.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
