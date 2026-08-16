'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

import Breadcrumb from '@/components/Breadcrumb';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import PageTitle from '@/components/PageTitle';
import { AlertBanner, TextField } from '@/features/bidding/FormFields';
import { messageOf } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

import { previewCashFlowCsv } from './api';
import CashFlowCsvMapping from './CashFlowCsvMapping';
import { Figure, FilePicker, StepBar } from './CsvImportParts';
import {
  isCsvInvalidFile,
  isCsvPasswordInvalid,
  isCsvPasswordIssue,
} from './errorCodes';
import { formatAmount } from './display';
import { FINANCE_ROUTES } from './routes';
import type { CsvDuplicateRow, CsvPreview, CsvUploadResult } from './types';

const STEPS = ['파일 선택', '컬럼 맞추기', '결과 확인'] as const;

/**
 * 입출금 내역 CSV · 엑셀 일괄 등록. (#13)
 *
 * 세 단계다 — **파일을 고르면 컬럼 추천을 받고**, 사람이 매핑을 확정하면 저장한다.
 * 1단계에서 올린 파일은 저장되지 않는다 (추천을 받기 위한 미리보기다).
 *
 * ⚠️ 스텝퍼 · 매핑 UI 는 **세금계산서 CSV 수집(#17)이 그대로 쓴다** —
 *    입출금 전용 문구를 컴포넌트 안에 박아 두지 않는다.
 */
export default function CashFlowCsvImport() {
  /**
   * 진행 중인 미리보기 요청.
   *
   * ⚠️ 로딩 중이라고 새 선택을 무시하면, 파일명만 바뀌고 **아무 반응도 없는 화면**이 된다
   *    (드래그 앤 드롭은 `disabled` 로 막히지도 않는다). 앞 요청을 끊고 새로 부른다.
   */
  const pendingRef = useRef<AbortController | null>(null);

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
    // 앞 요청이 남아 있으면 끊는다 — 늦게 온 응답이 새 파일의 추천을 덮으면 안 된다
    pendingRef.current?.abort();

    const controller = new AbortController();
    pendingRef.current = controller;

    setIsLoading(true);
    setError('');

    try {
      setPreview(await previewCashFlowCsv(target, secret, controller.signal));
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
          { label: '입출금 내역', href: FINANCE_ROUTES.cashFlows },
          { label: 'CSV 일괄 등록' },
        ]}
      />

      <PageTitle
        title="CSV 일괄 등록"
        description="은행에서 내려받은 거래 내역 파일을 올려 한 번에 등록합니다."
      />

      <StepBar steps={STEPS} current={step} />

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

        {/**
         * ⚠️ 등록된 건은 **아직 어디에도 연결되지 않았다** — 여기서 끝난 줄 알고 나가면
         *    미연결 건이 쌓인다. 다음 할 일(연결)을 결과 화면에서 알려 준다.
         */}
        <p className="mt-4 rounded-lg bg-bg-surface px-4 py-3 text-caption break-keep text-text-secondary">
          등록된 입출금은 <b>미연결 상태</b>입니다. 목록에서 정산 블록에
          연결해주세요.
        </p>

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

      {/* 끝난 뒤의 다음 행동 — 완료 화면에서는 목록으로 가는 길을 눈에 띄게 둔다 */}
      <div className="mt-4 flex justify-end">
        <Link
          href={FINANCE_ROUTES.cashFlows}
          className="btn btn-md btn-primary"
        >
          입출금 내역으로
        </Link>
      </div>
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
