'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

import Breadcrumb from '@/components/Breadcrumb';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import PageTitle from '@/components/PageTitle';
import { AlertBanner, TextField } from '@/features/bidding/FormFields';
import { messageOf } from '@/lib/api';

import { previewTaxInvoiceCsv } from './api';
import { Figure, FilePicker, StepBar } from './CsvImportParts';
import {
  isCsvInvalidFile,
  isCsvPasswordInvalid,
  isCsvPasswordIssue,
} from './errorCodes';
import { FINANCE_ROUTES } from './routes';
import TaxInvoiceCsvMapping from './TaxInvoiceCsvMapping';
import type {
  TaxInvoiceCsvDuplicateRow,
  TaxInvoiceCsvPreview,
  TaxInvoiceCsvUploadResult,
} from './types';

const STEPS = ['파일 선택', '컬럼 맞추기', '결과 확인'] as const;

/**
 * 세금계산서 CSV · 엑셀 일괄 수집. (#16)
 *
 * 입출금(#13)과 **같은 세 단계**를 걷는다 — 껍데기는 `CsvImportParts` 에서 가져다 쓰고
 * 여기에는 세금계산서에만 있는 것(구분 · 승인번호 중복)만 둔다.
 *
 * ⚠️ 1단계에서 올린 파일은 저장되지 않는다 (추천을 받기 위한 미리보기다).
 */
export default function TaxInvoiceCsvImport() {
  /**
   * 진행 중인 미리보기 요청.
   *
   * ⚠️ 로딩 중이라고 새 선택을 무시하면, 파일명만 바뀌고 **아무 반응도 없는 화면**이 된다
   *    (드래그 앤 드롭은 `disabled` 로 막히지도 않는다). 앞 요청을 끊고 새로 부른다.
   */
  const pendingRef = useRef<AbortController | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<TaxInvoiceCsvPreview | null>(null);

  /** 비밀번호가 걸린 엑셀일 때만 칸이 열린다 */
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');

  /** 저장까지 끝난 결과 — 있으면 3단계다 */
  const [result, setResult] = useState<TaxInvoiceCsvUploadResult | null>(null);

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
    // 앞 요청이 남아 있으면 끊는다 — 늦게 온 응답이 새 파일의 추천을 덮으면 안 된다
    pendingRef.current?.abort();

    const controller = new AbortController();
    pendingRef.current = controller;

    setIsLoading(true);
    setError('');

    try {
      setPreview(await previewTaxInvoiceCsv(target, secret, controller.signal));
      setNeedsPassword(false);
    } catch (caught) {
      // 취소는 실패가 아니다 — 새 요청이 이미 떠 있다는 뜻이다
      if (controller.signal.aborted) return;

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
      // 뒤늦게 끝난 앞 요청이 로딩 표시를 끄지 않게 한다
      if (pendingRef.current === controller) setIsLoading(false);
    }
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: '재무 관리', href: FINANCE_ROUTES.hub },
          { label: '세금계산서', href: FINANCE_ROUTES.taxInvoices },
          { label: 'CSV 일괄 수집' },
        ]}
      />

      <PageTitle
        title="CSV 일괄 수집"
        description="홈택스에서 내려받은 세금계산서 파일을 올려 한 번에 수집합니다."
      />

      <StepBar steps={STEPS} current={step} />

      {result !== null ? (
        <UploadResult result={result} />
      ) : preview !== null && file !== null ? (
        <TaxInvoiceCsvMapping
          file={file}
          preview={preview}
          password={password || undefined}
          onUploaded={setResult}
          // 파일부터 다시 고른다 — 매핑만 남겨 두면 어느 파일의 것인지 흐려진다
          onBack={() => setPreview(null)}
        />
      ) : (
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
                  id="taxCsvPassword"
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

          <HometaxNotice />
        </div>
      )}
    </>
  );
}

/**
 * 홈택스 직접 조회 안내.
 *
 * ⚠️ **누를 수 없는 버튼을 두고 사유를 밝힌다** — 없는 것처럼 감추면 "그 기능은 언제
 *    나오냐" 는 질문이 반복되고, 눌리게 두면 아무 일도 안 일어나 고장으로 읽힌다.
 *    지금은 CSV 가 유일한 길이라는 것도 함께 알린다.
 */
function HometaxNotice() {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border-default pt-5">
      <p className="text-caption break-keep text-text-secondary">
        홈택스에서 바로 불러오는 기능은 준비 중입니다. 지금은 내려받은 파일로
        수집해주세요.
      </p>
      <button
        type="button"
        disabled
        title="홈택스 연동은 준비 중입니다"
        className="btn btn-sm btn-gray-outlined shrink-0"
      >
        홈택스에서 조회
      </button>
    </div>
  );
}

/**
 * 결과 (3단계).
 *
 * ⚠️ **중복은 실패가 아니다** — 이미 등록된 승인번호라 건너뛴 것이다. 실패처럼 붉게
 *    칠하지 않고, 어떤 건이 왜 빠졌는지 사유와 함께 보여준다.
 */
function UploadResult({ result }: { result: TaxInvoiceCsvUploadResult }) {
  return (
    <div className="mt-4">
      <div className="rounded-base border border-border-default bg-bg-card p-6">
        <dl className="flex flex-wrap gap-x-10 gap-y-3">
          <Figure label="전체" value={result.totalRows} />
          <Figure label="수집" value={result.savedCount} isStrong />
          <Figure label="중복 제외" value={result.duplicateCount} />
        </dl>

        {/**
         * ⚠️ 수집된 건은 **아직 어디에도 연결되지 않았다** — 여기서 끝난 줄 알고 나가면
         *    미연결 건이 쌓인다. 다음 할 일(연결)을 결과 화면에서 알려 준다.
         */}
        <p className="mt-4 rounded-lg bg-bg-surface px-4 py-3 text-caption break-keep text-text-secondary">
          수집된 세금계산서는 <b>미연결 상태</b>입니다. 목록에서 정산 블록에
          연결해주세요.
        </p>

        {result.duplicateRows.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-caption font-semibold text-text-primary">
              중복으로 제외된 건
            </p>
            <DataTable
              caption="중복으로 제외된 세금계산서"
              columns={DUPLICATE_COLUMNS}
              rows={result.duplicateRows}
              dense
            />
          </div>
        )}
      </div>

      {/* 끝난 뒤의 다음 행동 — 완료 화면에서는 목록으로 가는 길을 눈에 띄게 둔다 */}
      <div className="mt-4 flex justify-end">
        <Link
          href={FINANCE_ROUTES.taxInvoices}
          className="btn btn-md btn-primary"
        >
          세금계산서로
        </Link>
      </div>
    </div>
  );
}

const DUPLICATE_COLUMNS: DataTableColumn<TaxInvoiceCsvDuplicateRow>[] = [
  {
    key: 'approvalNo',
    header: '승인번호',
    width: '40%',
    cell: (row) => (
      <span className="block font-semibold [overflow-wrap:anywhere] text-text-primary">
        {row.approvalNo || '-'}
      </span>
    ),
  },
  {
    key: 'reason',
    header: '사유',
    width: '60%',
    // 사유는 서버 문구가 가장 정확하다 — 화면이 다시 풀어 쓰지 않는다
    cell: (row) => (
      <span className="block break-keep text-text-secondary">{row.reason}</span>
    ),
  },
];
