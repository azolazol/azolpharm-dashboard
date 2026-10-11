# azolpharm GitHub + Google Sheets 이전 패키지

이 패키지는 기존 azolpharm의 건강 키워드 40개와 네이버 계산 기준을 재사용합니다.
GitHub에는 공개 화면·코드만, Google Sheets에는 데이터를, Apps Script의 스크립트 속성에는 API 키를 저장합니다.

## 현재 상태

- Google Sheets DB 생성 및 키워드 40개 입력 완료
- 기존 사이트의 최신 네이버 순위 40개 및 일별 기록 1,360행 이전 완료 (최신 기준일 2026-10-10)
- 과거 일별 기록은 회차를 추측하지 않고 `이전 일별` 표시로 보관. 새 수집부터 오전·오후 회차를 기록
- 이전 일별 기록은 해당 날짜의 관심도이며, 새 회차 기록은 최근 7일 합계 기준입니다. 서로 같은 기간의 점수로 비교하지 마세요.
- Apps Script 수집·예약·공개 읽기·방문자 집계 코드 작성 완료
- 회귀 테스트 7개 통과. 실제 Google 실행 권한 승인 및 공급자 호출은 설치 후 검증 필요
- GitHub 저장소 생성 완료. Apps Script 배포, API 키 입력 및 트리거 실행은 아직 완료되지 않음
- 기존 공개 사이트는 유지. 새 주소 확인 전 기존 사이트를 끄지 않음
- 로컬 코드 테스트와 Sheets 읽기 검증 완료. 실제 브라우저 동작·Google 트리거·공급자 API 성공 검증은 배포 후 필요

DB: https://docs.google.com/spreadsheets/d/1WY2_PX-E2f8Oz3hvo4No7B0I6LAZzWvjv1AO8FGnxN0/edit

설치 순서는 `docs/SETUP.md`를 보세요.

## 파일

- `index.html`, `style.css`, `app.js`, `config.js`: GitHub Pages용 화면
- `apps-script/Code.gs`: 데이터 수집·공개 읽기·방문자 집계
- `apps-script/appsscript.json`: Google 권한·한국시간 설정
- `apps-script/keywords.json`: 최초 키워드 백업. 실제 설정은 Sheets의 KEYWORDS 사용
- `tests/backend.test.cjs`: 공급자 실패·중복 방지·공개 출력 회귀 테스트

GitHub 저장소: https://github.com/azolazol/azolpharm-dashboard
공개 화면 주소: https://azolazol.github.io/azolpharm-dashboard/
다른 주식 대시보드 저장소에는 파일을 올리지 마세요.

## 처리 기준

- 한국시간 오전 8시·오후 8시 전후, 기본 트리거 오차 약 ±15분
- 네이버: 전날까지 28일을 받아 최근 7일·직전 7일을 비교
- 비타민D 공통 기준으로 API 배치 간 지수를 보정. 실제 검색 횟수가 아닌 추적 목록 내 상대 지수
- 유튜브: 상위 10개 키워드, 최근 30일 게시, 조회수순. 국내·해외는 언어와 검색지역 신호로 분류
- 해외 검색어가 비어 있는 국내 상품은 해외 검색을 생략. 임의의 다른 상품이나 광범위한 성분으로 대체하지 않음
- 네이버와 유튜브는 별도로 저장. 공급자 한 쪽 실패가 다른 쪽 성공을 되돌리지 않음
- 동일 회차 성공 작업은 건너뛰고, 실패 작업만 다음 수동/회차 실행에서 재시도. 무한 재시도 없음
- 유튜브 검색 자체 예산: 태평양 날짜 기준 일 60회. 실제 프로젝트 한도는 Google 콘솔에서 확인
- 유튜브 이전 값은 다음 성공 수집 때 교체. 29일 이상 미갱신된 값은 공개 응답에서 제외하고 수집 시 제거
- 날짜별 네이버 기록은 Sheets에 누적. 공개 화면은 최근 30일만 표시
- 방문자는 브라우저의 무작위 식별자를 해시해 오늘·전체 중복을 제외. 봇·저장소 삭제·다른 기기로 인한 오차가 있는 참고 통계
- 새 시스템 방문자 수는 0부터 시작. 기존 사이트 누적 38명 등의 값을 임의로 합산하지 않음

## 공개·비공개 범위

시트와 스크립트 편집 권한은 소유자만 유지합니다. 누구나 볼 수 있는 웹 앱에는 순위·영상·집계만 노출합니다.
공개 HTTP 쓰기는 익명 방문 집계만 허용하며, 수집 실행·키 변경·시트 임의 수정 기능은 공개하지 않습니다.
Script Properties는 편집자로부터 비밀을 숨기는 금고가 아닙니다. 스크립트 편집자를 추가하지 마세요.
Apps Script URL은 비밀키가 아니며 `config.js`에 넣어도 됩니다. API 키는 절대 넣지 마세요.

## 알려진 운영 한계

- Apps Script 실행·URL Fetch·Sheets 호출에는 할당량과 실행시간 제한이 있습니다. 증가한 트래픽에서 별도 데이터베이스/캐시로 옮길 수 있습니다.
- JSONP는 공개 데이터를 읽는 데만 사용합니다. 사용자 개인정보·비밀키·원문 로그를 반환하지 않습니다.
- 공개 방문 집계는 인증 없는 참고용입니다. 악의적인 방문 수 조작을 완전히 방지하지는 않습니다.
- 외부 공급자 장애·키 권한·호출 한도 오류는 RUN_LOG에 기록합니다. 시스템 이전만으로 잘못된 키를 고치지는 못합니다.

## 검증

로컬: `node --test tests/backend.test.cjs`
설치 후: `setup` → `refreshNow` → 결과 시트 및 RUN_LOG 확인 → 웹 앱 공개 응답 확인 → `installTriggers` → `status`로 2개 트리거 확인.
첫 예약 실행 후 RUN_LOG에 실제 실행 결과가 있어야 자동 운영 검증 완료입니다.

공식 참고:
- https://developers.google.com/apps-script/guides/properties
- https://developers.google.com/apps-script/reference/script/clock-trigger-builder
- https://developers.google.com/apps-script/guides/content
- https://developers.google.com/apps-script/guides/services/quotas
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
