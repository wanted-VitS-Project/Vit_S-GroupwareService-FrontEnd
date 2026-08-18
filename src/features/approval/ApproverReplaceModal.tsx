'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import EmployeeSearchInput from '@/features/employee/EmployeeSearchInput';
import { messageOf } from '@/lib/api';

import { setLines } from './api';
import { LINE_STATUS_LABELS } from './lineStatus';
import type { ApprovalDetailLine } from './types';
import { toLinesRequest, unavailableLines } from './unavailable';

/** 결재자 한 명을 어떻게 처리할지. 정하기 전에는 null 이다 */
type Handling =
  | { kind: 'replace'; approverId: string; approverName: string }
  | { kind: 'exclude' }
  | null;

/**
 * 참여 불가 결재자 교체 · 제외 모달. 막혀 있는 결재선만 골라 처리한다.
 * 요청은 전체 치환이라 손대지 않은 결재자까지 함께 보낸다.
 */
export default function ApproverReplaceModal({
  approvalId,
  revisionId,
  lines,
  onClose,
  onChanged,
}: {
  approvalId: number;
  revisionId: number;
  /** 현재 회차의 결재선 전체. 치환 요청에 그대로 필요하다 */
  lines: ApprovalDetailLine[];
  onClose: () => void;
  /** 저장이 끝나면 부르는 쪽이 회차를 다시 받는다 */
  onChanged: () => void;
}) {
  const ordered = [...lines].sort((a, b) => a.order - b.order);
  const targets = unavailableLines(ordered);

  /** 결재선별 처리 방법. 아직 안 정한 결재자는 키가 없다 */
  const [handlings, setHandlings] = useState<Map<number, Handling>>(new Map());
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  function decide(lineId: number, handling: Handling) {
    setHandlings((prev) => new Map(prev).set(lineId, handling));
  }

  /** 대상 전원의 처리 방법이 정해져야 저장할 수 있다 */
  const isReady = targets.every((line) => {
    const handling = handlings.get(line.lineId);
    return handling !== undefined && handling !== null;
  });

  /** 교체 후보에서 뺄 사람들. 다른 행이 이미 고른 대상도 함께 뺀다 */
  function excludedFor(lineId: number) {
    const pickedByOthers = [...handlings]
      .filter(([id, handling]) => id !== lineId && handling?.kind === 'replace')
      .map(([, handling]) => (handling as { approverId: string }).approverId);

    return [...ordered.map((item) => item.approverId), ...pickedByOthers];
  }

  async function save() {
    if (isBusy || !isReady) return;

    setIsBusy(true);
    setError('');

    /* 교체는 새 사번으로, 제외는 null 로 넘긴다 */
    const replacements = new Map<number, string | null>();
    for (const [lineId, handling] of handlings) {
      if (handling === null) continue;
      replacements.set(
        lineId,
        handling.kind === 'replace' ? handling.approverId : null,
      );
    }

    try {
      await setLines(
        approvalId,
        revisionId,
        toLinesRequest(ordered, replacements),
      );
      onChanged();
      onClose();
    } catch (caught) {
      /* 실패 사유는 백엔드 문구가 가장 정확하다 */
      setError(messageOf(caught, '결재선을 저장하지 못했습니다.'));
      setIsBusy(false);
    }
  }

  /** 저장 중에는 닫지 않는다 */
  function requestClose() {
    if (!isBusy) onClose();
  }

  return (
    <PanelModal title="결재자 처리" onClose={requestClose}>
      <div className="space-y-4 p-5">
        <p className="rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-yellow-text">
          아래 결재자는 더 이상 결재할 수 없어 결재가 멈춰 있습니다. 새 결재자로
          바꾸거나 결재선에서 빼주세요.
        </p>

        {targets.length === 0 ? (
          <p className="text-detail break-keep text-text-secondary">
            처리할 결재자가 없습니다. 이미 정리되었을 수 있으니 창을 닫고
            새로고침해주세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {targets.map((line) => (
              <TargetRow
                key={line.lineId}
                line={line}
                handling={handlings.get(line.lineId) ?? null}
                excludedIds={excludedFor(line.lineId)}
                disabled={isBusy}
                onDecide={(handling) => decide(line.lineId, handling)}
              />
            ))}
          </ul>
        )}
      </div>

      <ModalFooter>
        <p
          role={error ? 'alert' : undefined}
          className="mr-auto text-caption break-keep text-text-danger"
        >
          {error}
        </p>
        <div className="flex shrink-0 items-center gap-2">
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
            onClick={save}
            disabled={isBusy || !isReady || targets.length === 0}
            className="btn btn-md btn-primary min-w-[104px]"
          >
            {isBusy ? '저장 중…' : '저장'}
          </button>
        </div>
      </ModalFooter>
    </PanelModal>
  );
}

/** 참여 불가 결재자 한 명. 교체 · 제외 중 하나를 고른다 */
function TargetRow({
  line,
  handling,
  excludedIds,
  disabled,
  onDecide,
}: {
  line: ApprovalDetailLine;
  handling: Handling;
  excludedIds: string[];
  disabled: boolean;
  onDecide: (handling: Handling) => void;
}) {
  /** 교체를 골랐지만 아직 사람을 안 정한 상태 */
  const [isPicking, setIsPicking] = useState(false);

  const picked = handling?.kind === 'replace' ? handling : null;
  const isExcluded = handling?.kind === 'exclude';

  return (
    <li className="rounded-lg border border-border-default p-3">
      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded-button-sm bg-bg-hover px-1.5 py-0.5 text-caption text-text-secondary">
          {line.order}차
        </span>
        <span className="min-w-0 truncate text-detail font-semibold text-text-primary">
          {line.approverName}
        </span>
        {line.approverPosition && (
          <span className="shrink-0 text-caption text-text-secondary">
            {line.approverPosition}
          </span>
        )}
        <span className="ml-auto shrink-0 rounded-button-sm bg-bg-hover px-1.5 py-0.5 text-caption text-text-secondary">
          {LINE_STATUS_LABELS[line.status]}
        </span>
      </div>

      <div className="mt-2 flex gap-1.5">
        <ChoiceButton
          isSelected={picked !== null || isPicking}
          disabled={disabled}
          onClick={() => {
            setIsPicking(true);
            // 고르기 전까지는 미정으로 둬 저장 버튼이 열리지 않게 한다
            if (!picked) onDecide(null);
          }}
        >
          새 결재자로 교체
        </ChoiceButton>
        <ChoiceButton
          isSelected={isExcluded}
          disabled={disabled}
          onClick={() => {
            setIsPicking(false);
            onDecide({ kind: 'exclude' });
          }}
        >
          결재선에서 제외
        </ChoiceButton>
      </div>

      {isPicking && (
        <div className="mt-2">
          {picked ? (
            <p className="text-caption break-keep text-text-secondary">
              <strong className="text-text-primary">
                {picked.approverName}
              </strong>{' '}
              님으로 교체합니다.{' '}
              <button
                type="button"
                onClick={() => onDecide(null)}
                disabled={disabled}
                className="cursor-pointer text-text-primary-blue underline disabled:cursor-not-allowed disabled:text-text-muted"
              >
                다시 고르기
              </button>
            </p>
          ) : (
            <EmployeeSearchInput
              excludedIds={excludedIds}
              placeholder="이름 · 사번 검색"
              disabled={disabled}
              onSelect={(employee) =>
                onDecide({
                  kind: 'replace',
                  approverId: employee.userId,
                  approverName: employee.name,
                })
              }
            />
          )}
        </div>
      )}

      {isExcluded && (
        <p className="mt-2 text-caption break-keep text-text-secondary">
          이 결재자를 빼고 뒤 순번을 당깁니다.
        </p>
      )}
    </li>
  );
}

function ChoiceButton({
  isSelected,
  disabled,
  onClick,
  children,
}: {
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 cursor-pointer rounded-lg border px-2 py-1.5 text-caption font-semibold disabled:cursor-not-allowed disabled:text-text-muted ${
        isSelected
          ? 'border-border-primary bg-blue-bg-soft text-text-primary-blue'
          : 'border-border-default text-text-primary hover:bg-bg-hover'
      }`}
    >
      {children}
    </button>
  );
}
