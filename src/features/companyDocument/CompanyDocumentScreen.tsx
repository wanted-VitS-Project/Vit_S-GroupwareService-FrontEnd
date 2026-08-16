import Breadcrumb from '@/components/Breadcrumb';

import CompanyDocumentList from './CompanyDocumentList';

/**
 * 사내 문서함 화면. 전사 관리 허브(`/settings`)의 `파일 › 사내 문서함` 으로 들어온다.
 *
 * ℹ️ 프로젝트 파일과 **저장소가 다른 별도 도메인**이다 (143~150번 `/admin/company-documents`).
 *    회사 재정 · 소개 · 실적 자료로 AI 공고 검토의 비교 기준이 된다.
 */
export default function CompanyDocumentScreen() {
  return (
    <>
      <Breadcrumb
        items={[
          { label: '전사 관리', href: '/settings' },
          { label: '사내 문서함' },
        ]}
      />

      <div className="mt-2 mb-6">
        <h2 className="text-heading-m font-bold">사내 문서함</h2>
        <p className="mt-1.5 text-label break-keep text-text-secondary">
          회사 재정 · 소개 · 실적 자료를 보관합니다. AI 공고 검토의 비교
          기준으로 쓰입니다.
        </p>
      </div>

      <CompanyDocumentList />
    </>
  );
}
