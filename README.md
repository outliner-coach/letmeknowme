# Let Me Know Me

"나를 알려줘" - 링크 기반 설문조사를 통해 타인의 시각에서 바라본 나의 모습을 6가지 성격 유형으로 분석하여 시각적 리포트로 제공하는 웹 서비스입니다.

## 🌟 서비스 개요

- **목적**: 10개 질문으로 구성된 설문조사를 통해 "타인이 보는 나의 모습"을 6가지 성격 유형으로 분석
- **기술 스택**: HTML, CSS, JavaScript (프론트엔드) + Google Apps Script (백엔드) + Google Sheets (데이터베이스)
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

1. [Google Apps Script](https://script.google.com)에서 새 프로젝트 생성
2. `backend/code.gs` 파일의 내용을 복사하여 붙여넣기
3. `SPREADSHEET_ID` 변수를 실제 스프레드시트 ID로 변경:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_ACTUAL_SPREADSHEET_ID';
   ```
4. `initializeContentData()` 함수 실행하여 초기 데이터 설정
5. 웹앱으로 배포:
   - 배포 > 새 배포
   - 유형: 웹앱
   - 실행 대상: 나
   - 액세스 권한: 모든 사용자
   - 배포 후 웹앱 URL 복사

### 3. 프론트엔드 설정

1. `js/main.js` 파일에서 `API_BASE_URL` 수정:
   ```javascript
   const CONFIG = {
       API_BASE_URL: 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL'
   };
   ```

### 4. 웹 호스팅

정적 파일 호스팅 서비스에 업로드:
- **GitHub Pages**: 무료, 간단한 설정
- **Netlify**: 무료 티어, 자동 배포
- **Vercel**: 무료 티어, 빠른 성능
- **Firebase Hosting**: Google 생태계 통합

## 📁 프로젝트 구조

```
letmeknowme/
├── index.html              # 메인 페이지 (이름 입력, 링크 생성)
├── feedback.html           # 설문 페이지 (10개 질문)
├── result.html            # 결과 페이지 (분석 리포트)
├── css/
│   └── styles.css         # 전체 스타일시트
├── js/
│   ├── main.js           # 메인 페이지 로직
│   ├── feedback.js       # 설문 페이지 로직
│   └── result.js         # 결과 페이지 로직
├── backend/
│   └── code.gs           # Google Apps Script 백엔드
└── README.md             # 이 파일
```

## 🔧 API 명세

### GET 요청
- `?action=getContent`: 모든 콘텐츠 데이터 조회
- `?action=getReports`: 최근 리포트 목록 조회
- `?action=getReport&id={reportId}`: 특정 리포트 조회

### POST 요청
- `?action=createReport&requesterName={name}`: 새 리포트 생성
- `?action=submitResponse&reportId={id}`: 설문 응답 제출

## 📊 데이터베이스 스키마

### feedbacks 시트
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | String | 리포트 고유 ID (UUID) |
| requester_name | String | 요청자 이름 |
| responses | JSON | 응답 데이터 배열 |
| created_at | DateTime | 생성 시간 |

### contents 시트
| 컬럼 | 타입 | 설명 |
|------|------|------|
| key | String | 데이터 키 (questions, choices, keywords, etc.) |
| value | JSON | 데이터 값 |

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
- **대표 이미지**: 가장 높은 점수의 성격 유형
- **잠재 매력**: 두 번째로 높은 점수의 성격 유형  
- **레이더 차트**: 6가지 유형별 점수 시각화
- **키워드 클라우드**: 선택된 키워드 빈도별 크기 표시
- **종합 코멘트**: 성격 유형 조합에 따른 개인화된 분석

## 🛠️ 개발 및 테스트

### 로컬 개발
```bash
# 간단한 HTTP 서버 실행 (Python 3)
python -m http.server 8000

# 또는 Node.js
npx http-server
```

### Google Apps Script 테스트
1. Apps Script 편집기에서 `testAPI()` 함수 실행
2. 로그에서 각 API 기능 동작 확인

## 🔒 보안 고려사항

- Google Apps Script는 HTTPS를 기본 제공
- CORS 헤더 설정으로 크로스 도메인 요청 허용
- 개인정보는 최소한으로 수집 (이름만 저장)
- 응답 데이터는 익명으로 처리

## 📈 확장 가능성

- 추가 성격 유형 개발
- 다국어 지원
- 소셜 미디어 공유 기능
- 상세 분석 리포트
- 팀/그룹 분석 기능

## 🐛 문제 해결

### 일반적인 문제
1. **API 호출 실패**: Google Apps Script URL 확인
2. **데이터 로딩 안됨**: 스프레드시트 권한 확인
3. **결과 표시 안됨**: 최소 5개 응답 필요
4. **차트 오류**: Chart.js 라이브러리 로딩 확인

### 디버깅
- 브라우저 개발자 도구 콘솔 확인
- Google Apps Script 실행 로그 확인
- 네트워크 탭에서 API 요청/응답 확인

## 📞 지원

문제가 발생하거나 개선 제안이 있으시면 이슈를 등록해 주세요.

---

**Let Me Know Me** - 타인의 시각으로 발견하는 새로운 나의 모습 ✨ 