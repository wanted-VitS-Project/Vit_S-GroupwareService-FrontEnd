'use client';

import { useId, useRef, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import Modal from '@/components/Modal';
import { ApiError, messageOf } from '@/lib/api';

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
} from './types';

/** 5MB — 서버 상한과 같은 값. 넘기면 400 이라 보내기 전에 막는다 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * 템플릿 8개 열의 입력 규칙 (.ai/API.md 32 · 87).
 *
 * ⚠️ 템플릿 파일은 백엔드가 만들고 **헤더 줄만** 들어 있다 — 형식 안내가 파일에 없어
 *    여기서 대신 보여준다. 규칙은 단건 등록(32번)과 같다.
 */
const TEMPLATE_COLUMNS: {
  name: string;
  required: boolean;
  format: string;
}[] = [
  {
    name: '사번',
    required: true,
    format: '로그인 아이디로 쓰인다 (중복 불가)',
  },
  { name: '이름', required: true, format: '' },
  { name: '부서명', required: true, format: '등록된 부서명과 정확히 일치' },
  { name: '직급명', required: false, format: '등록된 직급명과 정확히 일치' },
  {
    name: '입사일',
    required: true,
    // 엑셀이 날짜 서식으로 바꾸면 `2026.04.05` 가 되어 그대로 검증에 걸린다
    format: "yyyy-MM-dd (예: 2026-08-10) — 셀 서식을 '텍스트'로 두세요",
  },
  {
    name: '이메일',
    required: false,
    format: '없으면 초기 비밀번호가 발송되지 않는다',
  },
  { name: '연락처', required: false, format: '' },
  {
    name: '권한',
    required: true,
    format: 'MASTER · MEMBER (ADMIN 은 거부된다)',
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
 * 사원 엑셀 일괄 등록 (.ai/API.md 87~89).
 *
 * 템플릿 받기 → 검증 → 등록 3단계다. **검증과 등록을 나눈 이유**는 등록이
 * 행마다 독립 트랜잭션이라 되돌릴 수 없어서다 — 무엇이 들어갈지 먼저 보여준다.
 *
 * ⚠️ 검증은 오류 행이 있어도 200 이다. 400 은 파일 자체 문제 3종뿐이고,
 *    그건 표로 보여줄 게 아니라 파일을 다시 고르게 해야 한다.
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
  const [errorMessage, setErrorMessage] = useState('');
  /** 등록은 되돌릴 수 없고 초기 비밀번호 메일까지 나간다 — 한 번 더 묻는다 */
  const [isConfirming, setIsConfirming] = useState(false);
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
      const next = await validateBulkEmployees(file);
      setValidation(next);
      // 오류가 없으면 건너뛰기를 물을 이유가 없다
      setSkipErrors(next.errorCount > 0);
      setStep('validated');
    } catch (caught) {
      setErrorMessage(messageOf(caught, '파일을 검증하지 못했습니다.'));
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
      const next = await registerBulkEmployees(file, skipErrors);
      setResult(next);
      setIsConfirming(false);
      setStep('done');
      if (next.registeredCount > 0) onRegistered();
    } catch (caught) {
      setErrorMessage(messageOf(caught, '등록하지 못했습니다.'));
      // 확인 창을 닫고 검증 화면으로 되돌린다 — 고칠 곳(건너뛰기 · 파일)이 거기 있다
      setIsConfirming(false);
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
      // 검증 표를 훑다 바깥을 잘못 눌러 파일 선택부터 다시 하게 되면 곤란하다
      dismissOnBackdrop={false}
      className="w-full max-w-[640px] rounded-xl p-8 shadow-lg"
    >
      <div className="mt-5">
        {step === 'pick' && (
          <PickStep
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
          <p role="alert" className="mt-4 text-xs text-text-danger">
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
              className="btn btn-md btn-primary"
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
              onClick={() => setIsConfirming(true)}
              // 건너뛰기를 꺼둔 채로 오류가 있으면 서버가 전체를 거부한다
              disabled={
                isBusy ||
                validation.validCount === 0 ||
                (validation.errorCount > 0 && !skipErrors)
              }
              className="btn btn-md btn-primary"
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
            className="btn btn-md btn-primary"
          >
            닫기
          </button>
        )}
      </div>

      {/*
        되돌릴 수 없는 데다 **초기 비밀번호 메일이 즉시 나간다** —
        발송을 끄는 옵션이 명세에 없어(.ai/API.md 89) 더더욱 한 번 더 물어야 한다.
      */}
      {isConfirming && validation && (
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title={`${validation.validCount}명을 등록할까요?`}
          description={
            <>
              계정이 함께 발급되고 <b>초기 비밀번호 메일이 바로 발송</b>됩니다.
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
          onCancel={() => setIsConfirming(false)}
        />
      )}
    </Modal>
  );
}

/** ① 템플릿을 받고 채운 파일을 고른다 */
function PickStep({
  fileInputId,
  fileInputRef,
  file,
  busy,
  onDownload,
  onPick,
  onInvalidFile,
}: {
  fileInputId: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  file: File | null;
  busy: Busy;
  onDownload: () => void;
  onPick: (file: File | null) => void;
  onInvalidFile: (message: string) => void;
}) {
  const isBusy = busy !== null;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-lg border border-border-default p-4">
        <h3 className="text-sm font-semibold text-text-primary">
          1. 템플릿 내려받기
        </h3>
        <p className="mt-1 text-xs break-keep text-text-secondary">
          아래 8개 열로 되어 있습니다. 열을 지우거나 순서를 바꾸지 마세요.
        </p>
        <button
          type="button"
          onClick={onDownload}
          disabled={isBusy}
          className="btn btn-sm btn-gray-outlined mt-3"
        >
          {busy === 'template' ? '내려받는 중…' : '템플릿 다운로드'}
        </button>

        <table className="mt-4 w-full text-left text-xs">
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
        <p className="mt-2 text-xs text-text-secondary">
          <span className="text-text-danger">*</span> 는 필수 항목입니다.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-text-primary">
          2. 작성한 파일 선택
        </h3>

        {/*
          네이티브 파일 표시를 숨긴다 — 단계를 오가면 이 input 이 새 요소로 다시 그려지는데
          `input[type=file]` 의 값은 보안상 되돌릴 수 없어 살아남은 `file` state 와 갈린다.
          파일명은 아래 한 줄로만 보여주고 input 은 클릭 통로로만 쓴다.
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

        <p className="mt-2 text-xs text-text-secondary">
          {file ? `선택됨 — ${file.name}` : '선택된 파일이 없습니다.'}
        </p>
      </section>
    </div>
  );
}

/** ② 무엇이 들어갈지 먼저 보여준다 — 등록은 되돌릴 수 없다 */
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

      {validation.emailNotRegisteredCount > 0 && (
        <p className="rounded-lg bg-bg-hover px-4 py-3 text-xs break-keep text-text-secondary">
          이메일이 없는 행이 {validation.emailNotRegisteredCount}건 있습니다.
          등록은 되지만 초기 비밀번호 메일이 발송되지 않습니다.
        </p>
      )}

      {validation.errorCount > 0 && (
        <>
          <RowErrorTable errors={validation.errors} />
          {/* 한 행에 오류가 여러 개여도 응답은 하나만 준다 (2026-08-10 실측) */}
          <p className="text-xs break-keep text-text-secondary">
            한 행에 문제가 여러 개여도 사유는 하나씩만 표시됩니다. 고친 뒤 다시
            검증하면 남은 문제가 나타납니다.
          </p>
          <label className="flex cursor-pointer items-start gap-2 text-xs text-text-primary">
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
        </>
      )}

      {validation.errorCount === 0 && (
        <p className="text-xs text-text-secondary">
          오류가 없습니다. 그대로 등록할 수 있습니다.
        </p>
      )}
    </div>
  );
}

/** ③ 행마다 독립 트랜잭션이라 부분 성공이 정상이다 */
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

      <p className="text-xs text-text-secondary">
        초기 비밀번호 메일 {result.emailSentCount}건 발송
      </p>

      {result.emailNotRegistered.length > 0 && (
        <div className="rounded-lg bg-bg-hover px-4 py-3">
          <p className="text-xs font-semibold text-text-primary">
            이메일이 없어 발송하지 못한 사번 {result.emailNotRegistered.length}
            건
          </p>
          <p className="mt-1 text-xs break-keep text-text-secondary">
            {result.emailNotRegistered.join(' · ')}
          </p>
          <p className="mt-1 text-xs break-keep text-text-secondary">
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
          <dt className="text-xs text-text-secondary">{item.label}</dt>
          <dd
            className={`mt-0.5 text-lg font-bold ${
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
 * 행 오류 표. 검증 · 등록이 같은 구조를 줘서 한 컴포넌트로 쓴다.
 * 행 번호는 사용자가 **엑셀에서 찾아갈 좌표**라 가장 앞에 둔다.
 */
function RowErrorTable({ errors }: { errors: BulkRowError[] }) {
  return (
    <div className="max-h-60 overflow-auto rounded-lg border border-border-default">
      <table className="w-full text-left text-xs">
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
              {/* 백엔드 문구가 가장 정확하다 — 프론트가 다시 쓰지 않는다 */}
              <td className="px-4 py-2.5 break-keep">{error.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
