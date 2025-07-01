# 배포 체크리스트

Let Me Know Me 서비스를 배포하기 위한 단계별 가이드입니다.

## 📋 배포 전 체크리스트

### ✅ 필수 준비사항
- [ ] Google 계정 (Google Sheets, Apps Script 사용)
- [ ] 웹 호스팅 서비스 선택 (GitHub Pages, Netlify, Vercel 등)
- [ ] 도메인 (선택사항)

## 🚀 배포 단계

### 1단계: Google Sheets 설정

#### 1.1 스프레드시트 생성
- [ ] [Google Sheets](https://sheets.google.com) 접속
- [ ] "빈 스프레드시트" 생성
- [ ] 스프레드시트 이름을 "LetMeKnowMe_Database"로 변경

#### 1.2 시트 구성
- [ ] 기본 "시트1"을 "feedbacks"로 이름 변경
- [ ] 새 시트 추가 후 "contents"로 이름 변경
- [ ] 스프레드시트 URL에서 ID 복사 (예: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`)

#### 1.3 권한 설정
- [ ] 스프레드시트 공유 설정에서 "링크가 있는 모든 사용자"에게 "편집자" 권한 부여

### 2단계: Google Apps Script 배포

#### 2.1 프로젝트 생성
- [ ] [Google Apps Script](https://script.google.com) 접속
- [ ] "새 프로젝트" 생성
- [ ] 프로젝트 이름을 "LetMeKnowMe_Backend"로 변경

#### 2.2 코드 배포
- [ ] `backend/code.gs` 파일 내용 복사
- [ ] Apps Script 편집기에 붙여넣기
- [ ] `SPREADSHEET_ID` 변수를 실제 스프레드시트 ID로 수정:
  ```javascript
  const SPREADSHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'; // 실제 ID로 변경
  ```

#### 2.3 초기 데이터 설정
- [ ] `initializeContentData` 함수 실행 (실행 > 함수 선택 > 실행)
- [ ] 실행 권한 승인
- [ ] Google Sheets에서 contents 시트에 데이터가 생성되었는지 확인

#### 2.4 웹앱 배포
- [ ] 배포 > 새 배포 클릭
- [ ] 설정:
  - 유형: 웹앱
  - 설명: "LetMeKnowMe API v1.0"
  - 실행 대상: 나
  - 액세스 권한: 모든 사용자
- [ ] 배포 클릭
- [ ] 웹앱 URL 복사 (예: `https://script.google.com/macros/s/AKfycby.../exec`)

#### 2.5 API 테스트
- [ ] `testAPI` 함수 실행
- [ ] 실행 로그에서 모든 API 기능이 정상 작동하는지 확인

### 3단계: 프론트엔드 설정

#### 3.1 API URL 설정
- [ ] `js/main.js` 파일 열기
- [ ] `CONFIG.API_BASE_URL`을 실제 웹앱 URL로 수정:
  ```javascript
  const CONFIG = {
      API_BASE_URL: 'https://script.google.com/macros/s/AKfycby.../exec'
  };
  ```

#### 3.2 로컬 테스트
- [ ] 로컬 서버 실행:
  ```bash
  # Python 3 사용
  python -m http.server 8000
  
  # 또는 Node.js 사용
  npx http-server
  ```
- [ ] `http://localhost:8000`에서 테스트
- [ ] 메인 페이지에서 리포트 생성 테스트
- [ ] 설문 페이지에서 응답 제출 테스트
- [ ] 결과 페이지에서 데이터 로딩 테스트

### 4단계: 웹 호스팅 배포

#### 옵션 A: GitHub Pages
- [ ] GitHub 저장소 생성
- [ ] 프로젝트 파일 업로드 (backend/ 폴더 제외)
- [ ] Settings > Pages에서 배포 설정
- [ ] `https://username.github.io/repository-name`에서 접속 확인

#### 옵션 B: Netlify
- [ ] [Netlify](https://netlify.com) 계정 생성
- [ ] "New site from Git" 또는 드래그 앤 드롭으로 배포
- [ ] 자동 생성된 URL 확인
- [ ] 커스텀 도메인 설정 (선택사항)

#### 옵션 C: Vercel
- [ ] [Vercel](https://vercel.com) 계정 생성
- [ ] GitHub 연동 또는 파일 업로드로 배포
- [ ] 자동 생성된 URL 확인
- [ ] 커스텀 도메인 설정 (선택사항)

## 🔧 배포 후 확인사항

### 기능 테스트
- [ ] 메인 페이지 로딩 확인
- [ ] 이름 입력 후 리포트 생성 기능
- [ ] 설문 링크 생성 및 공유 기능
- [ ] 설문 페이지에서 질문 표시 및 응답 기능
- [ ] 결과 페이지에서 대기 화면 표시
- [ ] 5개 이상 응답 수집 후 결과 표시 기능

### 성능 확인
- [ ] 페이지 로딩 속도 (3초 이내)
- [ ] API 응답 시간 (5초 이내)
- [ ] 모바일 반응형 디자인
- [ ] 다양한 브라우저 호환성 (Chrome, Safari, Firefox, Edge)

### 데이터 확인
- [ ] Google Sheets feedbacks 시트에 데이터 저장 확인
- [ ] 응답 데이터 형식이 올바른지 확인
- [ ] 성격 분석 결과가 정확한지 확인

## 🛠️ 문제 해결

### 일반적인 문제와 해결방법

#### 1. API 호출 실패
**증상**: 콘솔에 CORS 오류 또는 404 오류
**해결방법**:
- [ ] Google Apps Script 웹앱 URL이 올바른지 확인
- [ ] 배포 시 "모든 사용자" 권한으로 설정했는지 확인
- [ ] 새 배포로 업데이트 후 새 URL 사용

#### 2. 데이터 저장 안됨
**증상**: 설문 제출 후 Google Sheets에 데이터가 없음
**해결방법**:
- [ ] 스프레드시트 ID가 올바른지 확인
- [ ] 스프레드시트 공유 권한이 "편집자"인지 확인
- [ ] Apps Script 실행 로그에서 오류 메시지 확인

#### 3. 결과 페이지 오류
**증상**: 결과 페이지에서 차트나 데이터가 표시되지 않음
**해결방법**:
- [ ] Chart.js 라이브러리 로딩 확인
- [ ] 최소 5개 응답이 있는지 확인
- [ ] 브라우저 개발자 도구에서 JavaScript 오류 확인

#### 4. 모바일 호환성 문제
**증상**: 모바일에서 레이아웃이 깨지거나 기능이 작동하지 않음
**해결방법**:
- [ ] CSS 미디어 쿼리 확인
- [ ] 터치 이벤트 지원 확인
- [ ] 뷰포트 메타 태그 설정 확인

## 📊 모니터링

### 배포 후 모니터링 체크리스트
- [ ] Google Apps Script 실행 할당량 확인 (일일 6시간 제한)
- [ ] Google Sheets 용량 확인 (15GB 제한)
- [ ] 웹 호스팅 트래픽 확인
- [ ] 사용자 피드백 수집 및 개선사항 파악

### 정기 점검 (월 1회)
- [ ] 백업 데이터 확인
- [ ] 시스템 성능 점검
- [ ] 보안 업데이트 확인
- [ ] 사용 통계 분석

## 🔐 보안 고려사항

### 배포 시 보안 체크리스트
- [ ] Google Apps Script 권한 최소화
- [ ] 개인정보 처리 방침 검토
- [ ] HTTPS 사용 확인
- [ ] 입력 데이터 검증 로직 확인

## 📈 확장 계획

### 향후 업그레이드 고려사항
- [ ] 사용자 분석 도구 연동 (Google Analytics)
- [ ] 성능 모니터링 도구 설정
- [ ] 자동 백업 시스템 구축
- [ ] 다국어 지원 준비
- [ ] 소셜 미디어 공유 기능 강화

---

**배포 완료 후 이 체크리스트를 보관하여 향후 유지보수 시 참고하세요.** 