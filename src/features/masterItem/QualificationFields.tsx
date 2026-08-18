'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { getMasterItems } from './api';
import type {
  CertificateInput,
  Degree,
  EducationInput,
  MasterItem,
} from './types';
import { DEGREE_LABELS, DEGREES, newRowKey } from './types';

/**
 * 사원의 학력 · 자격증 입력 칸. 등록 폼과 수정 폼이 같은 것을 쓴다.
 * 표기가 갈리지 않게 마스터 목록에서 고르고, 비어 있으면 항목 관리로 가는 길을 준다.
 */
export default function QualificationFields({
  educations,
  certificates,
  onChange,
}: {
  educations: EducationInput[];
  certificates: CertificateInput[];
  onChange: (next: {
    educations: EducationInput[];
    certificates: CertificateInput[];
  }) => void;
}) {
  const [majors, setMajors] = useState<MasterItem[] | null>(null);
  const [certificateItems, setCertificateItems] = useState<MasterItem[] | null>(
    null,
  );
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      getMasterItems('major', controller.signal),
      getMasterItems('certificate', controller.signal),
    ])
      .then(([majorList, certificateList]) => {
        setMajors(majorList);
        setCertificateItems(certificateList);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHasFailed(true);
      });

    return () => controller.abort();
  }, []);

  function patchEducation(index: number, change: Partial<EducationInput>) {
    onChange({
      certificates,
      educations: educations.map((row, at) =>
        at === index ? { ...row, ...change } : row,
      ),
    });
  }

  function patchCertificate(index: number, change: Partial<CertificateInput>) {
    onChange({
      educations,
      certificates: certificates.map((row, at) =>
        at === index ? { ...row, ...change } : row,
      ),
    });
  }

  const isEmpty = majors?.length === 0 && certificateItems?.length === 0;

  return (
    <section className="rounded-base border border-border-default bg-bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-body-m font-bold text-text-primary">
            학력 · 자격증
          </h3>
          <p className="mt-1 text-caption break-keep text-text-secondary">
            등록된 전공 · 자격증 목록에서 고릅니다. 목록에 없으면 먼저
            추가해주세요.
          </p>
        </div>

        {/*
          새 탭으로 연다. 사원 폼 안이라 같은 탭으로 옮기면 작성하던 내용이 사라진다.
        */}
        <Link
          href="/settings/qualifications"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-gray-outlined shrink-0"
        >
          항목 관리
        </Link>
      </div>

      {hasFailed && (
        <p role="alert" className="mt-2 text-caption text-text-danger">
          전공 · 자격증 목록을 불러오지 못했습니다. 새로고침 후 다시
          시도해주세요.
        </p>
      )}

      {/* 위 버튼이 갈 곳을 이미 말하므로 여기서는 상태만 적는다 */}
      {isEmpty && (
        <p className="mt-3 rounded-lg border border-border-default px-4 py-6 text-center text-caption text-text-secondary">
          등록된 항목이 없어 고를 수 없습니다.
        </p>
      )}

      {/* 학력 */}
      <div className="mt-4">
        <p className="pb-1.5 text-detail font-semibold text-text-primary">
          학력{' '}
          <span className="font-normal text-text-secondary">
            · 여러 개 등록 가능
          </span>
        </p>

        <ul className="flex flex-col gap-1.5">
          {educations.map((row, index) => (
            <li key={row.rowKey} className="flex flex-wrap items-center gap-2">
              <select
                aria-label={`${index + 1}번째 학력 전공`}
                value={row.majorId || ''}
                onChange={(event) =>
                  patchEducation(index, { majorId: Number(event.target.value) })
                }
                className="input min-w-40 flex-1 cursor-pointer"
              >
                <option value="">전공 선택</option>
                {majors?.map((major) => (
                  <option key={major.id} value={major.id}>
                    {major.name}
                  </option>
                ))}
              </select>

              <select
                aria-label={`${index + 1}번째 학력 학위`}
                value={row.degree}
                onChange={(event) =>
                  patchEducation(index, {
                    degree: event.target.value as Degree,
                  })
                }
                className="input w-28 cursor-pointer"
              >
                {DEGREES.map((degree) => (
                  <option key={degree} value={degree}>
                    {DEGREE_LABELS[degree]}
                  </option>
                ))}
              </select>

              <input
                aria-label={`${index + 1}번째 학력 학교명`}
                placeholder="학교명 (선택)"
                value={row.school ?? ''}
                onChange={(event) =>
                  patchEducation(index, { school: event.target.value })
                }
                className="input min-w-36 flex-1"
              />

              <RemoveButton
                label={`${index + 1}번째 학력 삭제`}
                onClick={() =>
                  onChange({
                    certificates,
                    educations: educations.filter((_, at) => at !== index),
                  })
                }
              />
            </li>
          ))}
        </ul>

        <AddButton
          label="학력 추가"
          disabled={majors?.length === 0}
          onClick={() =>
            onChange({
              certificates,
              // 학위는 비워 둘 수 없어 첫 값으로 시작한다. 전공만 고르면 된다
              educations: [
                ...educations,
                { rowKey: newRowKey(), majorId: 0, degree: 'BACHELOR' },
              ],
            })
          }
        />
      </div>

      {/* 자격증 */}
      <div className="mt-5">
        <p className="pb-1.5 text-detail font-semibold text-text-primary">
          자격증{' '}
          <span className="font-normal text-text-secondary">
            · 여러 개 등록 가능
          </span>
        </p>

        <ul className="flex flex-col gap-1.5">
          {certificates.map((row, index) => (
            <li key={row.rowKey} className="flex flex-wrap items-center gap-2">
              <select
                aria-label={`${index + 1}번째 자격증`}
                value={row.certificateId || ''}
                onChange={(event) =>
                  patchCertificate(index, {
                    certificateId: Number(event.target.value),
                  })
                }
                className="input min-w-40 flex-1 cursor-pointer"
              >
                <option value="">자격증 선택</option>
                {certificateItems?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                aria-label={`${index + 1}번째 자격증 취득일`}
                /* 상한이 없으면 브라우저가 연도를 6자리까지 받는다 */
                min="1900-01-01"
                max="2999-12-31"
                value={row.acquiredDate ?? ''}
                onChange={(event) =>
                  patchCertificate(index, { acquiredDate: event.target.value })
                }
                className="input min-w-36 flex-1"
              />

              <RemoveButton
                label={`${index + 1}번째 자격증 삭제`}
                onClick={() =>
                  onChange({
                    educations,
                    certificates: certificates.filter((_, at) => at !== index),
                  })
                }
              />
            </li>
          ))}
        </ul>

        <AddButton
          label="자격증 추가"
          disabled={certificateItems?.length === 0}
          onClick={() =>
            onChange({
              educations,
              certificates: [
                ...certificates,
                { rowKey: newRowKey(), certificateId: 0 },
              ],
            })
          }
        />
      </div>
    </section>
  );
}

/**
 * 보낼 값만 남긴다. 고르지 않은 줄(id 0)은 빼고 보낸다. 0 을 보내면 404 다.
 * 빈 문자열도 값이 아니라 미입력이라 함께 뺀다.
 */
export function toQualificationPayload(next: {
  educations: EducationInput[];
  certificates: CertificateInput[];
}) {
  return {
    educations: next.educations
      .filter((row) => row.majorId > 0)
      .map((row) => ({
        majorId: row.majorId,
        degree: row.degree,
        ...(row.school?.trim() ? { school: row.school.trim() } : {}),
      })),
    certificates: next.certificates
      .filter((row) => row.certificateId > 0)
      .map((row) => ({
        certificateId: row.certificateId,
        ...(row.acquiredDate ? { acquiredDate: row.acquiredDate } : {}),
      })),
  };
}

function AddButton({
  label,
  disabled = false,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mt-1.5 cursor-pointer rounded-button-md px-2 py-1 text-caption font-medium text-text-primary-blue hover:bg-blue-bg-soft disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent"
    >
      + {label}
    </button>
  );
}

/** 줄 삭제. 터치 기기를 위해 항상 보인다 */
function RemoveButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-hover hover:text-text-primary"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="size-4"
      >
        <path d="M4 7h16M9 7V5h6v2M6 7l1 12h10l1-12" />
      </svg>
    </button>
  );
}
