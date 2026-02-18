# Let Me Know Me

"나를 알려줘" - 링크 기반 설문조사를 통해 타인의 시각에서 바라본 나의 모습을 6가지 성격 유형으로 분석하여 시각적 리포트로 제공하는 웹 서비스입니다.

**Live**: https://outliner-coach.github.io/letmeknowme/

## 🌟 서비스 개요

- **목적**: 10개 질문으로 구성된 설문조사를 통해 "타인이 보는 나의 모습"을 6가지 성격 유형으로 분석
- **기술 스택**: HTML, CSS, JavaScript (프론트엔드) + Google Apps Script (백엔드) + Google Sheets (데이터베이스)
- **폰트/디자인**: Pretendard 웹폰트, 흰색/크림 배경 + 네이비 텍스트 + 에메랄드 그린 포인트
- **주요 기능**: 링크 공유, 설문 응답, 성격 분석, 시각적 리포트 생성

## 📊 6가지 성격 유형

- **A. 든든한 리더**: 타고난 리더십으로 주변을 이끄는 사람
- **B. 따뜻한 상담가**: 공감과 배려로 사람들의 마음을 어루만지는 사람
- **C. 창의적인 아티스트**: 독창적 사고와 예술적 감각을 가진 사람
- **D. 긍정의 에너자이저**: 밝은 에너지로 주변을 활기차게 만드는 사람
- **E. 치밀한 전략가**: 논리적 사고와 체계적 접근으로 문제를 해결하는 사람
- **F. 자유로운 탐험가**: 자유로운 영혼으로 새로운 경험을 추구하는 사람

## 🚀 배포 가이드

### 1. Google Sheets 설정

1. [Google Sheets](https://sheets.google.com)에서 새 스프레드시트 생성
2. 스프레드시트 ID 복사 (URL에서 `/d/` 뒤의 긴 문자열)
3. 다음 두 개의 시트 생성:
   - `feedbacks`: 사용자 리포트 데이터 저장
   - `contents`: 질문, 선택지, 키워드, 성격 유형 등 콘텐츠 데이터 저장

### 2. Google Apps Script 배포

#### 방법 A: clasp CLI를 이용한 배포 (권장)

```bash
# clasp 설치 (최초 1회)
npm install -g @google/clasp

# Google 계정 로그인
clasp login

# backend/.clasp.json의 scriptId를 자신의 Apps Script 프로젝트 ID로 변경
# backend/code.gs의 SPREADSHEET_ID를 자신의 스프레드시트 ID로 변경

# 코드 푸시 및 배포
cd backend
clasp push
clasp deploy --description "배포 설명"
```

> **주의**: GAS 코드 변경 후에는 반드시 `clasp deploy`로 **새 배포**를 생성해야 합니다. 기존 배포를 수정(`clasp deploy -i <deploymentId>`)해도 코드 변경이 반영되지 않습니다.

#### 방법 B: 수동 배포

1. [Google Apps Script](https://script.google.com)에서 새 프로젝트 생성
2. `backend/code.gs` 파일의 내용을 복사하여 붙여넣기
3. `SPREADSHEET_ID` 변수를 실제 스프레드시트 ID로 변경
4. `initializeContentData()` 함수 실행하여 초기 데이터 설정
5. 웹앱으로 배포:
   - 배포 > 새 배포
   - 유형: 웹앱
   - 실행 대상: 나
   - 액세스 권한: 모든 사용자
   - 배포 후 웹앱 URL 복사

### 3. 프론트엔드 설정

`js/config.js` 파일에서 `API_BASE_URL`을 배포된 웹앱 URL로 수정:
```javascript
const CONFIG = {
    API_BASE_URL: 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL',
    MIN_RESPONSES: 5,
    UPDATE_INTERVAL: 30000
};
```

### 4. 웹 호스팅

정적 파일을 호스팅 서비스에 업로드 (`backend/` 폴더 제외):
- **GitHub Pages**: 무료, 간단한 설정 (현재 사용 중)
- **Netlify**: 무료 티어, 자동 배포
- **Vercel**: 무료 티어, 빠른 성능

## 📁 프로젝트 구조

```
letmeknowme/
├── index.html              # 메인 페이지 (히어로, 이용 방법, 링크 생성)
├── feedback.html           # 설문 페이지 (10개 질문)
├── result.html             # 결과 페이지 (분석 리포트)
├── test.html               # API 엔드포인트 수동 테스트용 유틸리티
├── css/
│   └── styles.css          # 전체 스타일시트 (Pretendard, 흰색/에메랄드 테마, 반응형)
├── js/
│   ├── config.js           # 전역 설정 (API URL, 최소 응답 수, 폴링 간격)
│   ├── main.js             # 메인 페이지 로직 (리포트 생성, 목록 표시)
│   ├── feedback.js         # 설문 페이지 로직 (Q1~Q9 객관식 + Q10 키워드)
│   └── result.js           # 결과 페이지 로직 (분석, 차트, 키워드 클라우드)
├── backend/
│   ├── code.gs             # Google Apps Script 백엔드
│   ├── .clasp.json         # clasp 설정 (Apps Script 프로젝트 ID)
│   └── appsscript.json     # Apps Script 매니페스트
├── CLAUDE.md               # Claude Code 개발 가이드
├── DEPLOYMENT.md           # 상세 배포 체크리스트
├── PRD.md                  # 프로덕트 요구사항 문서
└── README.md               # 이 파일
```

## 🔧 API 명세

모든 요청은 Google Apps Script로 배포된 하나의 웹앱 URL로 전송됩니다.

### GET 요청

- `?action=getContent`: 서비스에 필요한 모든 텍스트 콘텐츠(질문, 성격 유형 설명 등)를 조회합니다.
- `?action=getReports`: 최근에 생성된 리포트 목록(최대 10개)을 조회합니다.
- `?action=getReport&id={reportId}`: 특정 ID를 가진 리포트의 상세 데이터(요청자 이름, 모든 응답)를 조회합니다.

### POST 요청

`Content-Type: text/plain;charset=utf-8` 헤더와 함께 JSON 본문을 전송합니다.

> **참고**: GAS 웹앱은 302 리다이렉트를 사용하므로, `fetch` 호출 시 `redirect: 'follow'` 옵션이 필요합니다. `response.ok` 대신 응답 텍스트를 직접 JSON 파싱하는 방식을 사용합니다.

- **신규 리포트 생성**
  - **Request Body**: `{ "action": "create", "name": "요청자_이름" }`
  - **Response**: `{ "success": true, "data": { "id": "rpt_1234567890" } }`

- **설문 응답 제출**
  - **Request Body**: `{ "action": "submit", "id": "rpt_1234567890", "response": { "q1": "A", ..., "q9": "B", "q10": ["키워드1", "키워드2", "키워드3"] } }`
  - **Response**: `{ "success": true, "message": "응답이 성공적으로 제출되었습니다." }`

## 📊 데이터베이스 스키마 (Google Sheets)

### `feedbacks` 시트

컬럼 순서(인덱스 기반): `[0:id, 1:type, 2:created_at, 3:requester_name, 4~12:q1~q9, 13:q10_keywords]`

| 컬럼 인덱스 | 컬럼명 | 데이터 타입 | 설명 |
|---|---|---|---|
| 0 | id | Text | 리포트 고유 ID (`rpt_` 접두사 + 타임스탬프) |
| 1 | type | Text | 행 종류: `META`(리포트 생성) 또는 `RESPONSE`(설문 응답) |
| 2 | created_at | Date | 생성 일시 (ISO 8601 형식) |
| 3 | requester_name | Text | 피드백 요청자 이름 (`META` 행만 사용) |
| 4~12 | q1 ~ q9 | Text | 답변 A~F (`RESPONSE` 행만 사용) |
| 13 | q10_keywords | Text | 선택 키워드 JSON 배열 (`RESPONSE` 행만 사용) |

### `contents` 시트

| 컬럼 | 타입 | 설명 |
|---|---|---|
| key | String | 콘텐츠 키 (예: `q1`, `type_A_name`, `comment_A_B`) |
| value | String | 해당 텍스트 값 |

## 🎯 사용법

### 리포트 생성자
1. 메인 페이지에서 이름 입력
2. "링크 생성" 버튼 클릭
3. 생성된 설문 링크를 지인들에게 공유
4. 최소 5명의 응답 수집 후 결과 확인

### 설문 응답자
1. 공유받은 링크 접속
2. Q1-Q9: 객관식 문항 응답 (A-F 중 선택)
3. Q10: 키워드 3개 선택
4. 제출 완료

### 결과 분석
- **대표 이미지**: 가장 높은 점수의 성격 유형 + 비율
- **잠재적 매력**: 두 번째로 높은 점수의 성격 유형 + 비율
- **성향 분석**: 6가지 유형별 레이더 차트
- **핵심 키워드**: 상위 5개 키워드 빈도별 표시
- **종합 코멘트**: mainType + subType 조합별 개인화 분석

## 🛠️ 개발 및 테스트

### 로컬 개발
```bash
# 간단한 HTTP 서버 실행 (Python 3)
python -m http.server 8000

# 또는 Node.js
npx http-server
```

### GAS 백엔드 배포 (clasp)
```bash
cd backend
clasp push            # 코드 업로드
clasp deploy          # 새 버전 배포 (새 URL 생성)
clasp deployments     # 배포 목록 확인
```

### 테스트
- `test.html`을 브라우저에서 열어 각 API 엔드포인트를 수동 테스트
- 빌드/린트/테스트 도구는 별도 없음

## 🔒 보안 고려사항

- Google Apps Script는 HTTPS를 기본 제공
- GAS 웹앱 자체가 CORS를 자동 처리 (별도 헤더 설정 불필요)
- 개인정보는 최소한으로 수집 (이름만 저장)
- 응답 데이터는 익명으로 처리

## 🐛 문제 해결

### 일반적인 문제
1. **API 호출 실패**: `js/config.js`의 `API_BASE_URL` 확인. GAS 코드 변경 후 새 배포를 생성했는지 확인
2. **데이터 로딩 안됨**: 스프레드시트 권한 확인. GAS가 bound script인 경우 `getActiveSpreadsheet()`가 우선 사용됨
3. **결과 표시 안됨**: 최소 5개 응답 필요
4. **차트 오류**: Chart.js CDN 로딩 확인

### GAS 배포 주의사항
- GAS 코드를 변경한 뒤에는 반드시 **새 배포**를 생성해야 반영됨 (기존 배포 수정으로는 불가)
- 새 배포마다 URL이 변경되므로 `js/config.js`의 `API_BASE_URL`도 함께 업데이트 필요
- `clasp deploy -i <deploymentId>`로 기존 배포를 덮어쓸 수 있음

### 디버깅
- 브라우저 개발자 도구 콘솔 확인
- Google Apps Script 실행 로그 확인
- 네트워크 탭에서 API 요청/응답 확인

---

**Let Me Know Me** - 타인의 시각으로 발견하는 새로운 나의 모습 