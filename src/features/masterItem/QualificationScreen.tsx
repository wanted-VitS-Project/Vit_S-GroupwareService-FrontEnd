'use client';

import Breadcrumb from '@/components/Breadcrumb';
import PageTitle from '@/components/PageTitle';

import MasterItemPanel from './MasterItemPanel';

/**
 * 학력 · 자격증 **항목 관리** 화면. (ADMIN 전용)
 *
 * 사원 등록 · 수정은 여기 등록된 항목에서 **골라서** 넣는다 —
 * 자유입력을 두지 않아 표기가 갈리지 않는다(`컴퓨터공학` · `컴퓨터 공학` 처럼).
 * 그래서 목록에 없는 값이 필요하면 이 화면을 먼저 거쳐야 한다.
 *
 * ⭐ 두 목록을 **한 화면에** 둔다 — 성격이 같고 같이 관리되는 자료라
 *    화면을 갈라 두면 오갈 일만 늘어난다.
 */
export default function QualificationScreen() {
  return (
    <>
      <Breadcrumb
        items={[
          { label: '전사 관리', href: '/settings' },
          { label: '학력 · 자격증' },
        ]}
      />

      <PageTitle
        title="학력 · 자격증 항목"
        description="사원 등록 시 고를 수 있는 전공 · 자격증 목록입니다. 사원이 쓰고 있는 항목은 삭제할 수 없습니다."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <MasterItemPanel kind="major" title="전공" placeholder="예) 산업공학" />
        <MasterItemPanel
          kind="certificate"
          title="자격증"
          placeholder="예) 정보보안기사"
        />
      </div>
    </>
  );
}
