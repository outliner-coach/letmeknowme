# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**나를 알려줘 (Let Me Know Me)** — 친구들이 나를 어떻게 보는지 10개 설문을 통해 분석하는 성격 피드백 서비스. 링크 기반으로 설문을 공유하고, 5명 이상 응답 시 6가지 성격 유형 분석 리포트를 생성한다.

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (프레임워크 없음, 빌드 도구 없음)
- **Backend**: Google Apps Script (`backend/code.gs`) → Google Sheets를 DB로 사용
- **차트**: Chart.js 3.x (CDN)
- **배포**: 정적 파일 호스팅 (GitHub Pages 등) + Google Apps Script 웹앱

## Development

```bash
# 로컬 개발 서버 실행
python -m http.server 8000
# 또는
npx http-server
```

빌드/린트/테스트 도구 없음. `test.html`은 API 엔드포인트 수동 테스트용 유틸리티 페이지.

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
| `backend/code.gs` | Google Apps Script — CRUD API, 콘텐츠 초기화, CORS 처리 |
| `css/styles.css` | 전체 스타일시트 (그라데이션 배경, 반응형 768px/480px 브레이크포인트) |

### API 구조 (Google Apps Script)

```
GET  ?action=getContent              → 설문 콘텐츠(질문, 유형, 코멘트) 전체 반환
GET  ?action=getReports              → 최근 리포트 10개 목록
GET  ?action=getReport&id={reportId} → 특정 리포트 + 모든 응답 데이터
POST { action: 'create', name }      → 새 리포트 생성, ID 반환
POST { action: 'submit', id, response } → 설문 응답 제출
```

### 데이터 저장 (Google Sheets)

- **feedbacks 시트**: META 행(리포트 생성)과 RESPONSE 행(설문 응답)을 같은 시트에 저장. 행 구조: `[id, type, created_at, requester_name, q1~q9, q10_keywords]`
- **contents 시트**: 키-값 쌍으로 모든 UI 텍스트/설문 콘텐츠 저장. `initializeContentData()`로 초기화

### 분석 로직 (프론트엔드 전용)

성격 분석은 `result.js`에서 클라이언트 사이드로 수행:
1. 모든 응답의 Q1~Q9에서 A-F 선택 횟수 집계
2. 최다 득표 유형 = 대표 이미지(mainType), 차점 = 잠재적 매력(subType)
3. Q10 키워드 빈도 집계 → 상위 5개 키워드 클라우드
4. mainType+subType 조합으로 contents에서 종합 코멘트 매칭

### 6가지 성격 유형

A: 든든한 리더 | B: 따뜻한 상담가 | C: 창의적인 아티스트 | D: 긍정의 에너자이저 | E: 치밀한 전략가 | F: 자유로운 탐험가

## Deployment

1. Google Sheets에 feedbacks/contents 시트 생성
2. `backend/code.gs`를 Apps Script에 복사 → `SPREADSHEET_ID` 수정 → `initializeContentData()` 실행
3. 웹앱으로 배포 (액세스: 모든 사용자) → 웹앱 URL 복사
4. `js/config.js`의 `API_BASE_URL`을 웹앱 URL로 업데이트
5. 정적 파일을 호스팅에 배포 (backend/ 폴더 제외)

상세 체크리스트: `DEPLOYMENT.md` 참조
