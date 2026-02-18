# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**나를 알려줘 (Let Me Know Me)** — 친구들이 나를 어떻게 보는지 10개 설문을 통해 분석하는 성격 피드백 서비스. 링크 기반으로 설문을 공유하고, 5명 이상 응답 시 6가지 성격 유형 분석 리포트를 생성한다.

**Live**: https://outliner-coach.github.io/letmeknowme/

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (프레임워크 없음, 빌드 도구 없음)
- **Backend**: Google Apps Script (`backend/code.gs`) → Google Sheets를 DB로 사용
- **차트**: Chart.js 3.x (CDN)
- **배포**: GitHub Pages (프론트엔드) + Google Apps Script 웹앱 (백엔드)
- **GAS 배포 도구**: clasp CLI (`backend/.clasp.json`)

## Development

```bash
# 로컬 개발 서버 실행
python -m http.server 8000
# 또는
npx http-server
```

빌드/린트/테스트 도구 없음. `test.html`은 API 엔드포인트 수동 테스트용 유틸리티 페이지.

## GAS Backend Deployment (clasp)

```bash
cd backend
clasp push                  # 코드 업로드
clasp deploy                # 새 버전 배포 (새 URL이 생성됨)
clasp deploy -i <id>        # 기존 배포 덮어쓰기 (URL 유지)
clasp deployments           # 배포 목록 확인
```

**중요 주의사항**:
- GAS 코드 변경 후에는 반드시 **새 배포** 또는 **기존 배포 덮어쓰기**를 해야 반영됨
- 단순히 `clasp push`만으로는 웹앱에 반영되지 않음 (push는 개발 버전만 업데이트)
- 새 배포 시 URL이 변경되므로 `js/config.js`의 `API_BASE_URL`도 업데이트 필요
- `clasp deploy -i <deploymentId>`를 사용하면 URL을 유지하면서 코드만 업데이트 가능
- 현재 GAS 프로젝트는 Google Sheets에 바인딩된 스크립트(bound script)이므로 `getActiveSpreadsheet()`가 우선 사용됨

## Architecture

### 페이지 흐름

```
index.html (리포트 생성) → feedback.html?id=xxx (설문 응답) → result.html?id=xxx (결과 확인)
```

### 핵심 파일 역할

| 파일 | 역할 |
|------|------|
| `js/config.js` | API URL, 최소 응답 수(5), 폴링 간격(30초) 등 전역 설정 |
| `js/main.js` | index.html — 리포트 생성, 최근 리포트 목록 표시 |
| `js/feedback.js` | feedback.html — Q1~Q9 객관식(A-F) + Q10 키워드(18개 중 3개) 설문 |
| `js/result.js` | result.html — 응답 집계, 유형 분석, 레이더 차트/키워드 클라우드/종합 코멘트 렌더링 |
| `backend/code.gs` | Google Apps Script — CRUD API, 콘텐츠 초기화 |
| `backend/.clasp.json` | clasp 설정 — Apps Script 프로젝트 ID 매핑 |
| `backend/appsscript.json` | Apps Script 매니페스트 — 타임존, 런타임, 웹앱 설정 |
| `css/styles.css` | 전체 스타일시트 (그라데이션 배경, 반응형 768px/480px 브레이크포인트) |

### 코드 구조 주의사항

- **ES 모듈 미사용**: 각 JS 파일은 독립적인 `<script>` 태그로 로드됨. `callApi()` 함수가 `main.js`, `feedback.js`, `result.js` 세 곳에 동일하게 복제되어 있음. API 호출 로직 변경 시 세 파일 모두 수정 필요
- **각 HTML 페이지는 `config.js` + 페이지별 JS 파일** 두 개만 로드 (예: `index.html` → `config.js` + `main.js`)

### API 구조 (Google Apps Script)

```
GET  ?action=getContent              → 설문 콘텐츠(질문, 유형, 코멘트) 전체 반환
GET  ?action=getReports              → 최근 리포트 10개 목록
GET  ?action=getReport&id={reportId} → 특정 리포트 + 모든 응답 데이터
POST { action: 'create', name }      → 새 리포트 생성, ID 반환
POST { action: 'submit', id, response } → 설문 응답 제출
```

**GAS API 호출 시 주의**:
- GAS 웹앱은 302 리다이렉트로 응답하므로 `fetch()` 시 `redirect: 'follow'` 필요
- `response.ok` 체크 대신 응답 텍스트를 직접 `JSON.parse()`로 파싱해야 함
- POST 요청 시 `Content-Type: text/plain;charset=utf-8` 사용 (GAS가 CORS preflight를 처리하지 않으므로)
- GAS `ContentService`에는 `.withHeaders()` 메서드가 없음 — 사용 금지

### 데이터 저장 (Google Sheets)

- **feedbacks 시트**: META 행(리포트 생성)과 RESPONSE 행(설문 응답)을 같은 시트에 저장
  - 컬럼 인덱스: `[0:id, 1:type, 2:created_at, 3:requester_name, 4~12:q1~q9, 13:q10_keywords]`
  - 헤더 행 유무를 자동 감지: `data[0][0] === 'id'` 체크
- **contents 시트**: 키-값 쌍으로 모든 UI 텍스트/설문 콘텐츠 저장. `initializeContentData()`로 초기화
  - 질문 키: `q1`, `q2`, ..., `q9` (주의: `q1_text` 아님)
  - 선택지 키: `q1_choice_A`, `q1_choice_B`, ..., `q9_choice_F` (feedback.js에서 사용)
  - 키워드 키: `keyword_list` (JSON 배열 문자열, 36개 키워드)
  - 유형 키: `type_A_name`, `type_A_description`, ...
  - 코멘트 키: `comment_A_B`, `comment_A_C`, ... (알파벳 순서로만 저장, 프론트에서 역순도 시도)

### 응답 데이터 형태 (API → 프론트엔드)

`getReport` API가 반환하는 각 응답 객체:
```json
{
  "q1": "A", "q2": "B", "q3": "C", ..., "q9": "F",
  "q10": ["키워드1", "키워드2", "키워드3"]
}
```
`result.js`의 `analyzeResponses()`에서는 `response.q1` ~ `response.q9`로 접근 (배열 인덱스가 아닌 객체 속성).

### 분석 로직 (프론트엔드 전용)

성격 분석은 `result.js`의 `analyzeResponses()`에서 클라이언트 사이드로 수행:
1. 모든 응답의 `q1`~`q9`에서 A-F 선택 횟수 집계
2. 최다 득표 유형 = 대표 이미지(mainArchetype), 차점 = 잠재적 매력(subArchetype)
3. `q10` 키워드 빈도 집계 → 상위 5개 키워드 클라우드
4. mainArchetype+subArchetype 조합으로 contents에서 종합 코멘트 매칭 (`comment_A_B` 형태). `renderFinalComment()`는 `comment_X_Y`를 먼저 찾고, 없으면 `comment_Y_X`도 시도

### 6가지 성격 유형

A: 든든한 리더 | B: 따뜻한 상담가 | C: 창의적인 아티스트 | D: 긍정의 에너자이저 | E: 치밀한 전략가 | F: 자유로운 탐험가

## Deployment

1. Google Sheets에 feedbacks/contents 시트 생성
2. `backend/code.gs`의 `SPREADSHEET_ID`를 자신의 스프레드시트 ID로 수정
3. `cd backend && clasp push && clasp deploy` (또는 Apps Script 편집기에서 수동 배포)
4. 배포된 웹앱 URL을 `js/config.js`의 `API_BASE_URL`에 설정
5. Apps Script 편집기에서 `initializeContentData()` 함수를 1회 실행하여 contents 시트 초기화
6. 정적 파일을 호스팅에 배포 (backend/ 폴더 제외)

상세 체크리스트: `DEPLOYMENT.md` 참조

## GitHub Pages

- 리포지토리: `outliner-coach/letmeknowme`, `main` 브랜치에서 배포
- `backend/` 폴더는 GitHub Pages에 포함되지만 클라이언트에서 사용하지 않음
- 정적 사이트이므로 GitHub Pages 배포 시 별도 빌드 과정 없이 push만으로 반영
