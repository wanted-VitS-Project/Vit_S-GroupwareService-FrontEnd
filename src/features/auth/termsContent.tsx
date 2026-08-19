/**
 * 약관 본문. 화면이 두 건을 각각 보여주고 동의는 서버에 한 번만 보낸다.
 * 문구가 바뀌면 여기만 고친다 (2026-08-19 데모 운영판).
 */

export interface TermsDocument {
  id: 'service' | 'privacy';
  title: string;
  /** 체크박스 라벨 */
  label: string;
  /** 본문 위에 붙는 데모 안내 */
  notice: string;
  body: React.ReactNode;
}

/** `데모 서비스 안내` 머리말은 화면이 굵게 붙인다 */
const DEMO_NOTICE_BASE =
  '본 서비스는 개발·시연 목적의 데모 버전입니다. ' +
  '서비스 및 등록된 데이터는 사전 통지 없이 변경·초기화·삭제될 수 있으며, ' +
  '실제 업무 데이터나 실존 인물의 개인정보를 등록하지 마십시오.';

/** 본문 안 소제목. 조문 · 절 앞에 공통으로 쓴다 */
function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mt-5 mb-1.5 text-label font-bold break-keep text-text-primary first:mt-0">
      {children}
    </h4>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-pretty whitespace-pre-line">{children}</p>;
}

/**
 * 약관용 표. 모달 폭 안에 들어가되, 더 좁아지면 표만 가로로 넘긴다.
 */
function TermsTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="mt-2 overflow-x-auto rounded-button-sm border border-border-default">
      <table className="w-full min-w-[26rem] border-collapse text-left text-micro">
        <thead>
          <tr className="bg-bg-hover-secondary">
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="border-b border-border-default px-3 py-2 font-semibold text-text-primary"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[0]}
              className="border-b border-border-default last:border-0"
            >
              {row.map((cell, index) => (
                <td
                  key={headers[index]}
                  className={`px-3 py-2 align-top break-keep ${
                    index === 0 ? 'font-medium text-text-primary' : ''
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SERVICE_ARTICLES: { title: string; body: string }[] = [
  {
    title: '제1조 (목적)',
    body: '이 약관은 VitaminS(이하 "서비스")가 제공하는 입찰·프로젝트·정산 관리 그룹웨어의 이용 조건과 절차, 이용자와 서비스 제공자의 권리·의무를 정함을 목적으로 합니다.',
  },
  {
    title: '제2조 (정의)',
    body: '1. "이용기관"이란 서비스 이용 계약을 체결한 회사를 말합니다.\n2. "이용자"란 이용기관의 관리자가 등록한 임직원 계정으로 서비스에 접속하는 자를 말합니다.',
  },
  {
    title: '제3조 (계정)',
    body: '1. 계정은 이용기관 관리자가 발급하며, 이용자는 최초 로그인 시 임시 비밀번호를 변경해야 합니다.\n2. 이용자는 계정 정보를 타인에게 양도·공유할 수 없으며, 계정 관리 소홀로 발생한 결과에 책임을 집니다.',
  },
  {
    title: '제4조 (서비스 이용)',
    body: '1. 이용자는 이용기관이 부여한 권한 범위 안에서만 서비스를 이용할 수 있습니다.\n2. 이용자는 서비스에 등록되는 문서·데이터가 관계 법령과 이용기관의 내부 규정에 위배되지 않도록 해야 합니다.',
  },
  {
    title: '제5조 (데이터의 귀속)',
    body: '이용자가 서비스에 등록한 문서·프로젝트·정산 정보 등 모든 데이터는 이용기관에 귀속되며, 이용기관이 서비스 이용을 종료하면 해당 이용기관의 데이터는 전부 삭제됩니다.',
  },
  {
    title: '제6조 (AI 분석 기능)',
    body: '서비스는 이용자가 요청한 문서에 한해 외부 AI 모델을 이용한 분석·검토 기능을 제공하며, 분석 결과는 참고 자료일 뿐 법적·재무적 판단을 대체하지 않습니다.',
  },
  {
    title: '제7조 (서비스 변경 및 중단)',
    body: '서비스는 운영상·기술상 필요에 따라 기능을 변경하거나 일시 중단할 수 있으며, 중요한 변경은 사전에 공지합니다.',
  },
  {
    title: '제8조 (책임 제한)',
    body: '서비스는 천재지변, 이용자의 귀책, 제3자 서비스 장애 등 서비스 제공자의 통제 밖 사유로 발생한 손해에 대해 책임을 지지 않습니다.',
  },
  {
    title: '부칙',
    body: '이 약관은 2026년 8월 18일부터 데모 운영 종료 시까지 적용됩니다.',
  },
];

const COLLECTION_ROWS = [
  [
    '계정 정보 (필수)',
    '이름, 사번, 이메일, 연락처',
    '계정 발급 및 본인 확인, 임시 비밀번호 발송, 서비스 내 사용자 식별',
  ],
  [
    '인사 정보 (필수)',
    '소속 부서·직급, 입사일·퇴사일',
    '결재선 구성, 프로젝트 구성원 관리, 권한 부여',
  ],
  [
    '자격 정보 (필수)',
    '학력(학교·전공·학위), 자격증·취득일',
    '입찰 참여 자격 요건 집계 (개인 식별 없이 인원수만 집계)',
  ],
  ['프로필 (필수)', '프로필 사진', '사용자 식별 및 화면 표시'],
  [
    '이용 기록 (자동 수집)',
    '로그인 일시, 로그인 실패 횟수, 서비스 내 활동 기록',
    '계정 보안(잠금·비정상 접근 차단), 변경 이력 관리',
  ],
];

const CONSIGNMENT_ROWS = [
  [
    'Amazon Web Services',
    '첨부 파일·이미지·프로필 사진 저장',
    '국내(서울) 리전',
  ],
  [
    'Google (Gemini API)',
    '이용자가 요청한 문서의 AI 분석·임베딩 처리',
    '국외 처리 — 요청한 문서 내용에 한함',
  ],
  [
    'Google (Gmail)',
    '계정 발급·비밀번호 재설정 안내 메일 발송',
    '수신자 이메일·이름 전송',
  ],
];

export const TERMS_DOCUMENTS: TermsDocument[] = [
  {
    id: 'service',
    title: '서비스 이용약관',
    label: '서비스 이용약관에 동의합니다. (필수)',
    notice: `${DEMO_NOTICE_BASE} 본 약관은 데모 운영 기간에 한해 적용되며, 정식 서비스 전환 시 별도의 약관으로 대체됩니다.`,
    body: (
      <>
        {SERVICE_ARTICLES.map((article) => (
          <div key={article.title}>
            <Heading>{article.title}</Heading>
            <Paragraph>{article.body}</Paragraph>
          </div>
        ))}
      </>
    ),
  },
  {
    id: 'privacy',
    title: '개인정보 수집·이용 동의서',
    label: '개인정보 수집·이용에 동의합니다. (필수)',
    notice: `${DEMO_NOTICE_BASE} 본 동의서는 데모 운영 기간에 한해 적용되며, 정식 서비스 전환 시 별도의 동의 절차로 대체됩니다.`,
    body: (
      <>
        <Paragraph>
          VitaminS(이하 &quot;서비스&quot;)는 서비스 제공을 위해 아래와 같이
          개인정보를 수집·이용합니다. 내용을 확인하신 후 동의 여부를 결정해
          주십시오.
        </Paragraph>

        <Heading>1. 수집·이용 항목 및 목적</Heading>
        <TermsTable
          headers={['구분', '수집 항목', '수집·이용 목적']}
          rows={COLLECTION_ROWS}
        />

        <Heading>2. 보유·이용 기간</Heading>
        <Paragraph>
          데모 운영 종료 또는 이용기관(소속 회사)의 서비스 이용 종료 시까지
          보유하며, 종료 시 지체 없이 파기합니다.
        </Paragraph>

        <Heading>3. 개인정보 처리 위탁 및 국외 처리</Heading>
        <TermsTable
          headers={['수탁자', '위탁 업무', '비고']}
          rows={CONSIGNMENT_ROWS}
        />

        <Heading>4. 정보주체의 권리</Heading>
        <Paragraph>
          개인정보는 이용기관(소속 회사)이 등록·관리하며, 열람·정정·삭제 요청은
          소속 회사 관리자에게 하실 수 있습니다.
        </Paragraph>

        <Heading>5. 동의 거부 권리 및 불이익</Heading>
        <Paragraph>
          귀하는 위 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다.
          다만 필수 항목에 대한 동의를 거부하실 경우 서비스 이용이 제한됩니다.
        </Paragraph>
      </>
    ),
  },
];
