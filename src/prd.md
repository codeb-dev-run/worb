WORKB 그룹웨어 SaaS 통합 기획서 v1.0

(프로젝트 관리 + 근태/유연/재택 + 재무 + 비용 + 손익 + 그룹웨어 + 전자결재)

1. 서비스 개요
1.1 서비스 목적

WORKB는 프로젝트 중심으로 회사 운영의 전 과정을 한 번에 관리할 수 있는 그룹웨어 SaaS 서비스다.
핵심 목표는 다음과 같다.

프로젝트 단위로 모든 정보가 모이는 구조

일정 / 작업 / 담당자 / 파일 / 계약 / 비용 / 손익이 전부 프로젝트 기준으로 연결

근태·유연·재택·휴가 등 HR 정보와 실제 업무(프로젝트)를 연결

누가, 어떤 프로젝트에 얼마만큼 투입되었는지, 근태 기준과 실제 작업 기준을 함께 볼 수 있음

재무(매출·비용·손익)를 프로젝트·계약·근태와 연결

계약부터 인보이스, 입금, 지출, 손익까지 하나의 흐름으로 확인

스타트업·중소기업이 바로 쓸 수 있는 라이트한 전자결재

복잡한 대기업식 워크플로우가 아니라 “결재선만 심플하게 커스텀하는 구조”

2. 전체 아키텍처 컨셉
2.1 상위 개념

워크스페이스(Workspace)

“회사 / 조직” 단위 컨테이너

멤버, 프로젝트, 정책, 근태, 재무, 그룹웨어 설정 등 모든 리소스를 포함

프로젝트(Project)

실제로 일을 수행하는 기본 단위

칸반/간트/마인드맵/파일/재무/손익이 모두 프로젝트 단위로 묶임

유저(User / WorkspaceMember / ProjectMember)

하나의 계정이 여러 워크스페이스에 속할 수 있음

워크스페이스 역할 + 프로젝트 역할 두 레벨의 권한 구조

2.2 역할/권한 모델
워크스페이스 역할

owner

워크스페이스 생성자, 최상위 권한

결제/요금제/전사 정책/삭제 등 포함

admin

멤버 관리, 근태/휴가/전자결재 정책 설정

member

일반 직원, 대부분 기능 사용

guest

제한된 접근(클라이언트/외주 등), 프로젝트 일부만 보기

프로젝트 역할

owner

프로젝트 생성자, 프로젝트 소유권(다른 사람에게 위임 가능)

manager

프로젝트 설정/멤버/재무/손익까지 볼 수 있는 PM 권한

editor

Task/칸반/간트/파일 편집 가능

viewer

읽기 전용

3. 프로젝트 관리 모듈
3.1 구성 요소

프로젝트 개요(Overview)

프로젝트 기본 정보(이름, 설명, 기간, 상태)

핵심 메트릭(진행률, 남은 일정, 손익 요약 등)

칸반(Kanban Board)

To-do / In Progress / Review / Done 등 컬럼

드래그&드롭으로 Task 이동

실시간 동기화

간트(Gantt Chart)

Task/마일스톤 일정 시각화

기간 드래그로 일정 조정

파일(File)

프로젝트 단위 파일 업로드

버전 관리(필요 시)

마인드맵(Mindmap)

PM이 프로젝트 구조 및 작업 쪼개기를 자유롭게 그리는 공간

여기서 자동으로 Task·간트·담당자 배정까지 생성

3.2 마인드맵 → Task/간트/칸반 자동 연동
3.2.1 목적

PM이 익숙한 방식(마인드맵)으로 생각만 정리하면,

자동으로 Task가 생성되고,

담당자 / 마감일 / 상태 / 간트 차트까지 연결되는 구조.

3.2.2 데이터 구조 (개념)

MindmapNode

id

projectId

parentId (루트는 null)

title — 노드 제목(추후 Task 제목으로 사용)

description — 상세 설명

assigneeId — 담당자

startDate, dueDate — 일정

status — todo/doing/done 등

type — epic | task | subtask

order — 형제 노드 정렬 순서

3.2.3 변환 규칙

루트 바로 아래(depth 1) → Epic 또는 큰 기능 단위

depth 2 → 실제 작업(Task)

depth 3 이후 → Subtask 혹은 체크리스트 수준

3.2.4 동작 플로우

PM이 마인드맵을 작성한다.

“마인드맵 → 작업 생성” 버튼 클릭.

시스템이 다음을 수행:

모든 MindmapNode를 순회.

type에 따라 Epic/Task/Subtask 생성.

assigneeId 있으면 Task 담당자로 설정.

startDate/dueDate 있으면 Gantt에 그대로 반영.

status가 있으면 해당 상태 칸반 컬럼에 자동 배치.

이미 생성된 Task와의 중복 여부는:

mindmapNodeId를 Task에 저장해 중복 생성 방지,

변경 시에는 업데이트로 동작하도록 추후 확장 가능.

3.3 칸반 실시간 협업
3.3.1 요구사항

여러 사용자가 동시에 같은 보드를 보고 있을 때:

누가 어떤 Task를 어디로 옮겼는지 실시간 반영

전체 멤버가 “같은 판때기”를 보고 있다는 느낌

3.3.2 동작 개념

WebSocket 기반 project:[id] 룸 사용

클라이언트에서 Task 이동 시:

// 예시 payload
{
  "type": "task:moved",
  "projectId": "p1",
  "taskId": "t1",
  "fromColumnId": "todo",
  "toColumnId": "doing",
  "newIndex": 1
}
서버에서 같은 프로젝트 룸에 브로드캐스트

다른 클라이언트는 해당 Task를 동일 위치로 업데이트

3.3.3 충돌 처리

기본은 Last Write Wins

Task 엔티티에 updatedAt, updatedBy 필드를 두고,
나중에 “변경 이력”이나 “되돌리기” 기능까지 확장 가능

4. 근태·유연근무·재택근무 시스템
4.1 설계 목표

단순 출퇴근 기록이 아니라:

**근무정책(고정/유연/코어타임)**을 반영

재택근무 시에는 근무 여부를 팝업으로 체크

퇴근 미체크, 근무시간 부족 등은 패널티로 관리

4.2 주요 개념

근무 정책(AttendancePolicy)

워크스페이스 단위 (회사 전체 규칙)

팀별, 개인별 override는 2차 확장

AttendanceRecord (일 단위 근태 기록)

출근·퇴근·근무시간·상태(지각/조퇴/결근 등)

WorkSession (실제 프로젝트 수행 시간)

어떤 프로젝트/Task에 얼마나 투입되었는지 기록

나중에 T&M 계약/인건비 계산에도 연결 가능

PresenceCheck (근무확인 팝업)

특히 재택근무 시, 중간중간 “근무중” 클릭 유도

4.3 AttendancePolicy 상세
4.3.1 구성 항목 (개념)

workType

fixed: 9–18시 같은 고정 시간제

flexible: 출퇴근 시간 자유, 총 근무시간만 맞추면 됨

core-time: 코어타임(예: 11–16시) + 나머지는 자유

dailyRequiredMinutes: 일일 필요 근무시간(예: 8시간=480분)

weeklyRequiredMinutes: 주단위 기준(선택)

workStartTime / workEndTime: 고정 시간제 기본값

coreTimeStart / coreTimeEnd: 코어타임 범위

allowRemoteCheckIn: 재택 출근 허용 여부

autoClockOutEnabled: 자동 퇴근 기능 사용 여부

autoClockOutTime: 예를 들어 19:30

missingClockOutPenaltyPoints: 퇴근 미체크 시 패널티 점수

presenceCheckEnabled: 근무확인 팝업 사용 여부

presenceIntervalMinutes: 예: 90분마다

presenceResponseWindowMinutes: 응답 허용 시간 (예: 10분)

presenceMissPenaltyPoints: 응답 실패 시 패널티

4.4 AttendanceRecord 상세
4.4.1 주요 필드

date: 해당 근무일

clockInAt, clockOutAt

workMinutes: 실제 근무로 인정된 총 시간

breakMinutes: 휴게시간

workLocation: office | remote | field

status:

normal: 정상 근무

late: 지각

early_leave: 조퇴

short_work: 근무시간 미달

core_time_violation: 코어타임 미준수

missing_clock_out: 퇴근 미체크

unverified_remote: 재택인데 PresenceCheck 미응답 등

absent: 결근

penaltyPoints: 규칙 위반에 따른 패널티 합산

4.4.2 출퇴근 흐름 예시

유저가 “출근” 버튼 클릭

해당 날짜의 AttendanceRecord 생성

clockInAt 기록

근무 중

PresenceCheck 트리거 조건 시 팝업 표시

응답 여부 기록

사용자가 “퇴근” 버튼 클릭

clockOutAt 기록

workMinutes 계산

status 결정(지각/조퇴/정상 등)

만약 퇴근 버튼을 안 눌렀다면:

autoClockOutTime 도래 시 시스템이 clockOutAt 자동 설정

status = missing_clock_out

penaltyPoints 증가

4.5 PresenceCheck(근무확인 팝업)
4.5.1 목적

재택근무/유연근무 상황에서 “로그만 찍어놓고 실제로는 안 있는” 상태 방지

장시간 무응답/자리 비움 추적

4.5.2 동작 규칙

출근 이후 presenceIntervalMinutes마다 팝업

사용자에게 “근무 중입니다” 버튼 노출

presenceResponseWindowMinutes 내 응답 시:

PresenceCheckLog.status = confirmed

응답하지 않으면:

PresenceCheckLog.status = missed

패널티 부여 or unverified_remote 처리

재택근무자만 사용하도록 설정 가능(presenceCheckOnlyRemote)

5. 휴가 관리
5.1 휴가 종류

연차(annual)

반차(half_day)

병가(sick)

공가 등 기타 유형

5.2 주요 기능

휴가 신청

시작일 / 종료일 / 일수 / 사유 입력

전자결재와 연동

신청 시 ApprovalRequest 자동 생성

결재 승인 후에만 Attendance/LeaveBalance 반영

연차 잔여일 계산

연 단위 LeaveBalance 관리(부여/사용/잔여)

달력에 휴가 표시

본인/팀/전체 뷰 필터링

6. 재택근무 및 유연근무
6.1 재택근무 신청

사유, 기간, 반복여부 등 입력

전자결재로 승인받은 날/시간만 재택으로 인정

재택 시:

출퇴근은 remote 모드

PresenceCheck 강화 옵션 가능

6.2 유연근무 정책

고정 출퇴근이 아닌 형태에서

최소 일일/주간 근무시간 충족 여부 체크

근무 시작/종료 시간은 자유지만:

하루 총 workMinutes < dailyRequiredMinutes → short_work

7. 재무 모듈
7.1 클라이언트/담당자

클라이언트 회사 정보

회사명, 사업자등록번호, 주소, 대표자명 등

담당자 정보

실무 담당, 세금계산서 수신자, 회계 담당자 등

7.2 계약(ProjectContract)
7.2.1 지원 계약 유형

고정가(fixed)

단계별(milestone) — 계약금/중도금/잔금

Time & Material(T&M) — 실제 투입시간 기준

성과형(performance-based) — 특정 지표 충족 시 지급

7.2.2 계약 기본 정보

계약명 / 프로젝트명 연결

계약 기간(시작일/종료일)

총 계약 금액

세금계산서 품목 기본값

계약서 파일 첨부(전자문서함과 연결 가능)

7.3 Payment Stage (계약금/중도금/잔금 구조)

각 계약은 1개 이상의 PaymentStage로 쪼갤 수 있음.

Stage 목록 예시:

계약금 30% (계약 체결 시)

1차 중도금 40% (디자인 완료 시)

잔금 30% (최종 검수 완료 시)

각 Stage는 다음 정보 포함:

type: deposit / milestone / final

이름

금액

예정 청구일(dueDate)

관련 클라이언트 담당자 (청구 메일 수신자)

상태: planned / invoiced / partially_paid / paid / overdue

7.4 세금계산서(Invoice) 관리

각 PaymentStage별로 세금계산서를 1:1로 발행하는 구조를 기본으로 함

인보이스 정보:

공급가/부가세/합계

발행일(issueDate)

입금 기한(dueDate)

발행 상태

PDF URL (세무사 / 홈택스 발행본 저장)

7.5 입금(Payment)

실제로 돈이 들어온 시점에 기록

어떤 인보이스에 연결되는지, 계약과 연결되는지 저장

인보이스 상태:

일부 입금 시 partially_paid

완납 시 paid

미수금 계산에 사용

8. 프로젝트 비용(지출) 관리
8.1 목적

프로젝트 수행 중 발생하는 모든 비용을 재무 담당자가 계속 추가할 수 있게 하여,

프로젝트 단위 손익을 실시간에 가깝게 확인할 수 있도록 함.

8.2 비용 유형

인건비(labor) — 나중에 WorkSession + 단가와 연결해 자동 산출 가능

외주(subcontract)

도구/툴(tool) — 예: 디자인 툴, 협업툴 등

호스팅/서버(hosting)

출장비(travel)

마케팅(marketing)

기타(etc)

8.3 입력 플로우

재무 담당자/PM이 “비용 추가” 버튼 클릭

항목 입력:

날짜

금액

비용 유형

설명

공급자(업체명)

영수증/세금계산서 파일 첨부

승인 흐름이 필요하면:

지출결의용 전자결재와 연동

승인 전에는 pending 상태, 승인 시 approved

8.4 승인 여부

승인된 비용만 손익(P&L)에 반영하는 옵션

임시 비용은 pending으로 쌓아두고, 월말/분기마다 승인 처리 가능

9. 프로젝트 손익(P&L) 모듈
9.1 손익 정의

계약 기준 손익
= 총 계약 매출 – 총 비용
(실제 입금 여부와 상관없이 계약·청구 기준)

현금 기준 손익
= 실제 입금된 금액 – 총 비용
(현금 흐름 기준)

9.2 화면 예시 항목

매출 관련

총 계약 금액

세금계산서 발행 금액

실제 입금 금액

미청구 금액

미수금

비용 관련

승인된 비용 합계

비용 유형별 합계(인건비/외주/도구/서버 등)

손익 관련

계약 기준 손익(금액, %)

현금 기준 손익(금액, %)

프로젝트 상세 페이지의 손익 탭에서 이 모든 정보를 한눈에 볼 수 있게 한다.

10. 그룹웨어 기본 기능
10.1 공지사항

전체/부서/역할 대상 선택 가능

고정공지(pinned) 기능

공지 읽음 여부(누가 읽었는지)까지 기록

10.2 게시판

자유게시판, 팀 게시판, Q&A 등 원하는 개수만큼 생성 가능

게시글 + 댓글 구조

익명 여부 설정 가능(게시판 단위 or 게시글 단위 옵션)

10.3 전자문서함

회사 규정, 양식, 가이드 문서 등 중앙 저장소 기능

폴더 구조

버전 관리(필요 시)

접근 권한(워크스페이스 역할 기반)

11. 전자결재(Approval) — 라이트 버전
11.1 설계 방향

“정부 그룹웨어 / 대기업 전자결재” 수준의 헤비한 워크플로우가 아니라,

스타트업에서 쓸 수 있는 간단한 결재선 + 상태관리에 집중

11.2 사용되는 요청 유형

휴가 신청(LeaveRequest)

지출 결의(ProjectExpense)

재택근무 신청(RemoteWorkRequest)

근태 수정 요청(AttendanceAdjustRequest)

계약 승인(ProjectContract Approval)

기타 Custom 양식

각 요청은 다음과 같이 동작:

사용자가 “신청/요청” 작성

시스템이 ApprovalRequest를 생성하고 결재선(결재자 리스트) 설정

결재자들이 순서대로 승인/반려

최종 승인 시:

해당 원본 엔티티(휴가/비용/계약 등) 상태를 approved로 변경

거절 시 rejected로 남김

11.3 결재선 설정

워크스페이스 설정에서 템플릿 결재선 정의 가능:

휴가: 팀장 → 대표

50만 원 이하 지출: 팀장만

50만 원 초과 지출: 팀장 → 대표

프론트에서 이 템플릿 기반으로 결재자 리스트를 구성한 뒤,

ApprovalRequest 생성 시 함께 저장하는 구조

복잡한 조건식은 초기 버전에서 제외

12. 기술 스택/구현 방향(간단)

(기획서라서 개략만)

프론트엔드

Next.js(React)

실시간 기능: WebSocket(Pusher/Ably/Self-hosted 등)

UI: Tailwind, shadcn/ui 등 활용 가능

백엔드

Next.js API 라우트 또는 별도 Node.js 서버

DB: PostgreSQL(Prisma 사용 가능)

인증: JWT + 세션 or NextAuth

실시간

프로젝트 룸 별 채널 구성

칸반 이동/Task 수정/Presence 전송

13. MVP 범위 제안 (실제 개발 1차 타깃)

너가 지금 하고 있는 개발 단계에 맞춰, 1차 릴리즈(MVP)는 이렇게 잡을 수 있음:

프로젝트 관리

프로젝트 생성/멤버 관리

칸반/간트

마인드맵 → Task/간트 변환

실시간 칸반 이동

근태

출근/퇴근

고정근무 or 기본 유연근무 한 가지 정책

재택근무 여부 플래그

기본 PresenceCheck

재무

클라이언트/계약

계약금/잔금 2~3단계 구조

세금계산서 정보 관리(내부 기록용)

입금 기록 + 미수금 표기

비용/손익

지출 입력/승인

프로젝트별 손익 카드(간단한 숫자 요약)

그룹웨어

공지사항

게시판 1~2개

전자결재

휴가/지출/재택만 우선 적용

팀장 → 대표 두 단계 결재선