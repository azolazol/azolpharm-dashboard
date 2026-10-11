# 설치 순서

## 1. 이미 만든 Google Sheets에서 Apps Script 열기

https://docs.google.com/spreadsheets/d/1WY2_PX-E2f8Oz3hvo4No7B0I6LAZzWvjv1AO8FGnxN0/edit

PC에서 시트 상단 `확장 프로그램 → Apps Script`를 엽니다. 프로젝트 이름은 `azolpharm-backend`로 합니다.
기본 `Code.gs` 내용을 패키지 `apps-script/Code.gs` 전체로 바꿉니다.
프로젝트 설정에서 `appsscript.json 매니페스트 파일 표시`를 켜고 패키지의 JSON 내용으로 바꿉니다.

## 2. API 키를 스크립트 속성에 입력

Apps Script 왼쪽 톱니바퀴 `프로젝트 설정 → 스크립트 속성 → 속성 추가`:

| 속성 이름 | 입력할 값 |
|---|---|
| SPREADSHEET_ID | 1WY2_PX-E2f8Oz3hvo4No7B0I6LAZzWvjv1AO8FGnxN0 |
| NAVER_CLIENT_ID | 현재 사용하는 네이버 API HUB의 API Key ID |
| NAVER_CLIENT_SECRET | 현재 사용하는 네이버 API HUB의 API Key |
| YOUTUBE_API_KEY | YouTube Data API v3가 활성화된 Google API 키 |

이 코드의 네이버 주소는 `naverapihub.apigw.ntruss.com`입니다. 기존 NAVER Developers의 Client ID/Secret과 혼동하지 마세요.
Google 키는 가능하면 API 제한을 YouTube Data API v3로 좁힙니다. 브라우저 HTTP referrer 제한을 적용한 키는 Apps Script 서버 호출에 맞지 않습니다.
키를 코드, 셀, GitHub, 채팅에 붙이지 마세요. 기존 사이트에서 자동으로 복사되지 않습니다.

## 3. 첫 수집과 권한 승인

상단 함수 선택에서 `setup` 실행 후 본인 Google 계정으로 권한을 승인합니다.
이후 `refreshNow`를 실행합니다. `NAVER_CURRENT`, `NAVER_HISTORY`, `YOUTUBE_CURRENT`, `RUN_LOG`를 확인합니다.
`RUN_LOG`에서 `NAVER_HTTP_403`이면 네이버 키·상품 권한을, `YOUTUBE_HTTP_403`이면 키 제한·API 활성화·할당량을 확인합니다.
401/403/429 오류를 반복 실행으로 해결하려 하지 마세요. 기존 성공 결과는 남습니다.

## 4. 웹 앱 배포

`배포 → 새 배포 → 유형: 웹 앱`
- 실행 사용자: 나
- 액세스 권한: 모든 사용자 (친구들이 로그인 없이 볼 수 있도록)

생성된 `/exec`로 끝나는 URL을 복사합니다. 시트 파일 자체의 공유는 비공개로 유지합니다.
웹 앱 URL을 새 브라우저 창에서 열면 JSON이 나옵니다. 키·개인 식별 해시·RUN_LOG가 노출되지 않아야 합니다.
코드를 바꾼 뒤에는 `배포 관리 → 수정 → 새 버전`으로 배포를 갱신해야 합니다.

## 5. GitHub 저장소 및 화면

저장소 https://github.com/azolazol/azolpharm-dashboard 를 사용합니다.
화면과 Apps Script 소스는 저장소에 포함되어 있습니다. API 키는 포함되어 있지 않습니다.
`config.js`의 빈 apiUrl에 4번에서 복사한 Apps Script `/exec` 주소를 넣습니다.

```js
window.AZOLPHARM_CONFIG = { apiUrl: '여기에_웹앱_exec_주소' };
```

GitHub `Settings → Pages → Deploy from a branch → main → /(root) → Save`로 설정합니다.
GitHub가 표시하는 실제 공개 주소를 열어 표·국내/해외 영상·방문자 수를 확인합니다.
네이버·유튜브 API 키를 GitHub Secrets에 중복 등록할 필요는 없습니다. GitHub 쓰기 토큰도 필요 없습니다.

## 6. 자동 갱신 켜기

수동 수집과 공개 화면이 정상인 것을 확인한 후 Apps Script에서 `installTriggers`를 한 번 실행합니다.
`status`를 실행하면 `refreshMorning`, `refreshEvening` 두 트리거가 보여야 합니다.
한국시간 오전 8시/오후 8시 전후에 실행되며 약 ±15분 오차가 있습니다.
사이트를 닫거나 PC를 꺼도 Google에서 실행합니다. ChatGPT 예약 5개 한도와 무관합니다.
첫 예약 실행 후 RUN_LOG의 수집 시각을 확인해야 자동 운영 검증이 끝납니다.

## 키워드 수정

KEYWORDS의 keyword, kind, category, enabled, youtube_en을 편집합니다.
enabled는 TRUE/FALSE로 설정합니다. 최대 80개. 중복 키워드는 허용하지 않습니다.
해외 검색어를 비워두면 해외 검색을 생략합니다. 국내 상품을 다른 제품·성분 검색으로 임의 대체하지 않도록 했습니다.
기존 키워드명 변경은 과거 기록과 별개 키워드로 취급됩니다.

## 전환 확인

- 새 시스템 날짜와 네이버 40개 결과 확인
- 유튜브 실제 영상 링크와 게시일 확인
- API 키가 공개 HTML/JS/JSON/GitHub에 없는지 확인
- 예약 실행 결과 확인
- 친구에게 새 주소 공유 후 기존 사이트 전환 여부 결정

기존 사이트와 데이터는 이 설치로 삭제되지 않습니다. 신규 방문자 통계는 새로 시작합니다.
