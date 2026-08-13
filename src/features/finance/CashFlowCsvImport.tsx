'use client';

import { useState } from 'react';

import Breadcrumb from '@/components/Breadcrumb';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { AlertBanner, TextField } from '@/features/bidding/FormFields';
import { messageOf } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

import { previewCashFlowCsv } from './api';
import CashFlowCsvMapping from './CashFlowCsvMapping';
import {
  isCsvInvalidFile,
  isCsvPasswordInvalid,
  isCsvPasswordIssue,
} from './errorCodes';
import { formatAmount } from './display';
import { FINANCE_ROUTES } from './routes';
import type { CsvDuplicateRow, CsvPreview, CsvUploadResult } from './types';

/** 받을 수 있는 파일 — 백엔드가 CSV · 엑셀 둘 다 파싱한다 */
const ACCEPT = '.csv,.xlsx,.xls';

const STEPS = ['파일 선택', '컬럼 맞추기', '결과 확인'] as const;

/**
 * 입출금 내역 CSV · 엑셀 일괄 등록. (#14)
 *
 * 세 단계다 — **파일을 고르면 컬럼 추천을 받고**, 사람이 매핑을 확정하면 저장한다.
 * 1단계에서 올린 파일은 저장되지 않는다 (추천을 받기 위한 미리보기다).
 *
 * ⚠️ 스텝퍼 · 매핑 UI 는 **세금계산서 CSV 수집(#17)이 그대로 쓴다** —
 *    입출금 전용 문구를 컴포넌트 안에 박아 두지 않는다.
 */
export default function CashFlowCsvImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);

  /** 비밀번호가 걸린 엑셀일 때만 칸이 열린다 */
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');

  /** 저장까지 끝난 결과 — 있으면 3단계다 */
  const [result, setResult] = useState<CsvUploadResult | null>(null);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const step = result !== null ? 2 : preview === null ? 0 : 1;

  /** 파일을 고르면 곧바로 추천을 받는다 — 버튼을 한 번 더 누르게 하지 않는다 */
  function pick(next: File | null) {
    if (!next) return;

    setFile(next);
    setPreview(null);
    setNeedsPassword(false);
    setPassword('');
    setError('');
    void load(next, undefined);
  }

  async function load(target: File, secret: string | undefined) {
    if (isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      setPreview(await previewCashFlowCsv(target, secret));
      setNeedsPassword(false);
    } catch (caught) {
      /**
       * ⚠️ 비밀번호 요구는 **실패가 아니라 다음 단계**다 — 칸을 열고 기다린다.
       *    틀린 경우도 같은 자리에서 다시 받는다 (문구만 다르다).
       */
      if (isCsvPasswordIssue(caught)) {
        setNeedsPassword(true);
        setError(
          isCsvPasswordInvalid(caught)
            ? '비밀번호가 올바르지 않습니다.'
            : '비밀번호가 걸린 파일입니다. 비밀번호를 입력해주세요.',
        );
        return;
      }

      // ⚠️ 형식 오류는 404 로 온다 — '없는 화면' 으로 오해되지 않게 문구를 따로 준다
      if (isCsvInvalidFile(caught)) {
        setError('CSV 또는 엑셀 파일만 올릴 수 있습니다.');
        return;
      }

      setError(messageOf(caught, '파일을 읽지 못했습니다.'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: '재무 관리', href: FINANCE_ROUTES.hub },
            { label: '입출금 내역', href: FINANCE_ROUTES.cashFlows },
            { label: 'CSV 일괄 등록' },
          ]}
        />
        <h2 className="mt-1 text-heading-m font-bold">CSV 일괄 등록</h2>
        <p className="mt-1.5 text-caption break-keep text-text-secondary">
          은행에서 내려받은 거래 내역 파일을 올려 한 번에 등록합니다.
        </p>
      </div>

      <StepBar current={step} />

      {result !== null ? (
        <UploadResult result={result} />
      ) : preview !== null && file !== null ? (
        <CashFlowCsvMapping
          file={file}
          preview={preview}
          password={password || undefined}
          onUploaded={setResult}
          // 파일부터 다시 고른다 — 매핑만 남겨 두면 어느 파일의 것인지 흐려진다
          onBack={() => setPreview(null)}
        />
      ) : (
        <>
          <div className="mt-4 rounded-base border border-border-default bg-bg-card p-6">
            <FilePicker file={file} isLoading={isLoading} onPick={pick} />

            {needsPassword && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (file) void load(file, password);
                }}
                className="mt-4 flex items-end gap-2"
              >
                <div className="flex-1">
                  <TextField
                    id="csvPassword"
                    label="파일 비밀번호"
                    type="password"
                    value={password}
                    placeholder="엑셀 파일에 걸린 비밀번호"
                    onChange={setPassword}
                  />
                </div>
                <button
                  type="submit"
                  disabled={password === '' || isLoading}
                  className="btn btn-md btn-primary"
                >
                  확인
                </button>
              </form>
            )}

            {error && (
              <AlertBanner tone="danger" className="mt-4">
                {error}
              </AlertBanner>
            )}
          </div>
        </>
      )}
    </>
  );
}

/**
 * 결과 (3단계).
 *
 * ⚠️ **중복은 실패가 아니다** — 이미 등록된 거래라 건너뛴 것이다. 실패처럼 붉게 칠하지 않고,
 *    어떤 건이 왜 빠졌는지 사유와 함께 보여준다.
 */
function UploadResult({ result }: { result: CsvUploadResult }) {
  return (
    <div className="mt-4">
      <div className="rounded-base border border-border-default bg-bg-card p-6">
        <dl className="flex flex-wrap gap-x-10 gap-y-3">
          <Figure label="전체" value={result.totalRows} />
          <Figure label="등록" value={result.savedCount} isStrong />
          <Figure label="중복 제외" value={result.duplicateCount} />
        </dl>

        {result.duplicateRows.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-caption font-semibold text-text-primary">
              중복으로 제외된 건
            </p>
            <DataTable
              caption="중복으로 제외된 거래"
              columns={DUPLICATE_COLUMNS}
              rows={result.duplicateRows}
              dense
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  isStrong = false,
}: {
  label: string;
  value: number;
  isStrong?: boolean;
}) {
  return (
    <div>
      <dt className="text-caption text-text-secondary">{label}</dt>
      <dd
        className={`mt-0.5 text-heading-m font-bold ${
          isStrong ? 'text-text-primary-blue' : 'text-text-primary'
        }`}
      >
        {value.toLocaleString('ko-KR')}건
      </dd>
    </div>
  );
}

const DUPLICATE_COLUMNS: DataTableColumn<CsvDuplicateRow>[] = [
  {
    key: 'tradedAt',
    header: '거래일시',
    width: '25%',
    cell: (row) => (
      <span className="block text-text-secondary">
        {formatDateTime(row.tradedAt) || '-'}
      </span>
    ),
  },
  {
    key: 'amount',
    header: '금액',
    width: '20%',
    cell: (row) => (
      <span className="block font-semibold text-text-primary">
        {formatAmount(row.amount)}
      </span>
    ),
  },
  {
    key: 'reason',
    header: '사유',
    width: '55%',
    // 사유는 서버 문구가 가장 정확하다 — 화면이 다시 풀어 쓰지 않는다
    cell: (row) => (
      <span className="block break-keep text-text-secondary">{row.reason}</span>
    ),
  },
];

/** 지금 어디쯤인지 — 세 단계는 되돌아갈 수 있어 숫자만으로도 충분하다 */
function StepBar({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {STEPS.map((label, index) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`flex size-5 items-center justify-center rounded-pill text-detail font-bold ${
              index <= current
                ? 'bg-btn-primary text-text-white'
                : 'bg-bg-hover text-text-muted'
            }`}
          >
            {index + 1}
          </span>
          <span
            className={`text-caption ${
              index === current
                ? 'font-semibold text-text-primary'
                : 'text-text-secondary'
            }`}
          >
            {label}
          </span>
          {index < STEPS.length - 1 && (
            <span aria-hidden className="mx-1 text-text-muted">
              ›
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

/**
 * 파일 선택 — 클릭과 드래그 앤 드롭을 함께 받는다.
 *
 * ⚠️ 라벨로 감싸 **영역 전체가 파일 선택 버튼**이 되게 한다. `<input>` 을 숨기고
 *    별도 버튼에 `click()` 을 흉내 내면 키보드 접근이 끊긴다.
 */
function FilePicker({
  file,
  isLoading,
  onPick,
}: {
  file: File | null;
  isLoading: boolean;
  onPick: (file: File | null) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        onPick(event.dataTransfer.files[0] ?? null);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-5 py-10 text-center transition-colors ${
        isOver
          ? 'border-border-primary bg-blue-bg-soft'
          : 'border-border-default hover:bg-bg-surface'
      }`}
    >
      <input
        type="file"
        accept={ACCEPT}
        disabled={isLoading}
        onChange={(event) => onPick(event.target.files?.[0] ?? null)}
        className="sr-only"
      />

      <span className="text-label font-semibold text-text-primary">
        {file ? file.name : '파일을 끌어다 놓거나 눌러서 선택하세요'}
      </span>
      <span className="mt-1 text-caption text-text-secondary">
        {isLoading ? '파일을 읽는 중입니다…' : 'CSV · 엑셀(.xlsx · .xls)'}
      </span>
    </label>
  );
}
