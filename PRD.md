'Let me Know me' 서비스 기능 명세서 (FSD) v2.2
1. 문서 개요
문서 목적: 'Let me Know me' 웹 서비스의 모든 기능, 데이터 구조, API 사양 및 화면별 로직을 상세히 정의하여 개발자가 명확한 가이드라인에 따라 프로젝트를 수행할 수 있도록 함.

제품명: Let me Know me

버전: 2.2 (전체 상세 명세)

최종 수정일: 2025년 7월 1일

2. 서비스 개요
한 줄 요약: 링크 공유 기반의 10문항 설문을 통해, 6가지 유형으로 분석된 '타인이 보는 나'의 이미지를 시각적 리포트로 제공하는 자기 성찰 피드백 웹 서비스.

핵심 가치: 사용자가 쉽고 재미있게 자신에 대한 다각적이고 솔직한 피드백을 얻고, 이를 통해 자신을 더 깊이 이해하고 성장할 기회를 제공함.

3. 기술 스택 (Technical Stack)
프론트엔드: HTML, CSS, JavaScript (외부 라이브러리 사용 가능, 예: Chart.js for Radar Chart)

백엔드: Google Apps Script

데이터베이스: Google Sheets

4. 데이터베이스 명세 (Google Sheets)
4.1. 사용자 데이터 시트
시트 이름: feedbacks

설명: 리포트 생성(META)과 설문 응답(RESPONSE) 데이터를 모두 저장합니다. 각 행은 하나의 이벤트(생성 또는 응답)를 나타냅니다.

컬럼 구성:

| 컬럼명 | 데이터 타입 | 설명 |
|---|---|---|
| id | Text | 모든 관련 행을 묶는 리포트의 고유 ID. |
| type | Text | 행의 종류. 'META' 또는 'RESPONSE'. |
| created_at | Date | 행이 생성된 일시 (ISO 8601 형식). |
| requester_name | Text | 피드백 요청자의 이름. `type`이 'META'일 때만 사용됩니다. |
| q1 ~ q9 | Text | 질문 1~9에 대한 답변 (A~F). `type`이 'RESPONSE'일 때만 사용됩니다. |
| q10_keywords | Text | 질문 10에서 선택된 키워드들의 JSON 배열. `type`이 'RESPONSE'일 때만 사용됩니다. 예: `["리더십", "책임감"]` |

4.2. 콘텐츠 관리 시트 (CMS)
시트 이름: contents

설명: 서비스에 표시되는 모든 텍스트 콘텐츠(질문, 선택지, 결과 문구 등)를 관리합니다. Key-Value 형태로 구성됩니다.

(콘텐츠 시트의 상세 내용은 기존과 동일하므로 생략)

5. 백엔드 API 명세 (Google Apps Script)
배포 형태: 웹 앱 (액세스 권한: 모든 사용자)

Endpoint URL: 배포 후 생성된 고유 URL (https://script.google.com/macros/s/.../exec)

### GET 요청

**Case 1: 전체 콘텐츠 조회**
- **요청:** `GET {Endpoint URL}?action=getContent`
- **처리:** `contents` 시트의 모든 Key-Value 데이터를 읽어 하나의 JSON 객체로 반환합니다.
- **성공 응답 (JSON):** `{ "success": true, "data": { "q1_text": "...", "q1_choice_A": "...", ... } }`

**Case 2: 최근 리포트 목록 조회**
- **요청:** `GET {Endpoint URL}?action=getReports`
- **처리:** `feedbacks` 시트에서 'META' 타입의 데이터를 기반으로 최근 리포트 목록을 생성하고, 각 리포트의 응답 수를 계산하여 최신순으로 정렬 후 반환합니다.
- **성공 응답 (JSON):** `{ "success": true, "data": [ { "id": "...", "name": "...", "date": "...", "responseCount": 5 }, ... ] }`

**Case 3: 특정 리포트 상세 데이터 조회**
- **요청:** `GET {Endpoint URL}?action=getReport&id={report_id}`
- **처리:** 주어진 `id`에 해당하는 'META' 데이터(요청자 이름)와 모든 'RESPONSE' 데이터(응답 목록)를 `feedbacks` 시트에서 찾아 조합하여 반환합니다.
- **성공 응답 (JSON):** `{ "success": true, "data": { "id": "...", "requesterName": "...", "responses": [ { "q1":"A", ... }, ... ] } }`

### POST 요청

**Case 1: 신규 리포트 생성**
- **요청 Body (JSON):** `{ "action": "create", "name": "김민준" }`
- **처리:** 새 리포트 ID를 생성하고, `type`을 'META'로 하여 `feedbacks` 시트에 새 행을 추가합니다.
- **성공 응답 (JSON):** `{ "success": true, "data": { "id": "새로_생성된_id" } }`

**Case 2: 설문 응답 제출**
- **요청 Body (JSON):** `{ "action": "submit", "id": "리포트_id", "response": { "q1":"A", ..., "q10":["키워드1", ...] } }`
- **처리:** 전달받은 `id`와 함께 `type`을 'RESPONSE'로 하여 `feedbacks` 시트에 새 응답 행을 추가합니다.
- **성공 응답 (JSON):** `{ "success": true, "message": "응답이 성공적으로 제출되었습니다." }`

6. 화면별 기능 명세
6.1. 메인 페이지 (index.html)
구성 요소:

서비스 제목 (<h1>Let me Know me</h1>) 및 간단한 설명

이름 입력 <input type="text" id="name-input" placeholder="이름(닉네임)을 입력하세요">

링크 생성 <button id="create-btn">내 리포트 링크 만들기</button>

링크 표시 영역 <div id="link-display-area"> (초기에는 숨김)

최근 생성된 리포트 목록 제목 <h2>최근에 생성된 리포트 📝</h2>

리포트 목록 표시 영역 <div id="report-list">

페이지 로드 시 (JS onLoad)

GET {Endpoint URL}을 호출하여 전체 리포트 목록을 가져온다.

#report-list 영역에 받아온 데이터를 기반으로 <li><a href="result.html?id=...">{이름}님의 리포트 ({날짜})</a></li> 형태의 목록을 동적으로 생성한다.

'내 리포트 링크 만들기' 버튼 클릭 시

#name-input의 값을 가져온다. (값이 없으면 alert 또는 인라인 에러 메시지 표시)

POST {Endpoint URL}로 { "action": "create", "name": "입력된_이름" }을 전송한다.

응답으로 받은 { "id": "..." } 값을 사용해 아래 두 링크를 생성한다.

공유용: feedback.html?id={id}

결과용: result.html?id={id}

#link-display-area에 두 링크와 '복사' 버튼을 표시하고, 기존 입력 폼은 숨긴다.

6.2. 설문 페이지 (feedback.html)
페이지 로드 시 (JS onLoad)

URL 파라미터에서 id 값을 추출한다.

GET {Endpoint URL}?action=getContent를 호출하여 전체 콘텐츠 데이터를 가져온다.

GET {Endpoint URL}?id={id}를 호출하여 requester_name을 가져온다.

가져온 requester_name으로 페이지 제목을 설정한다.

가져온 콘텐츠 데이터를 기반으로 Q1~Q10까지의 모든 질문, 선택지, 키워드를 동적으로 HTML에 생성한다.

구성 요소:

Q1 ~ Q9: 각 질문과 6개의 선택지(A~F)를 라디오 버튼 그룹으로 표시한다.

Q10: 18개의 강점 키워드를 체크박스 형태로 표시하고, 3개만 선택하도록 JS로 제어한다. (3개 초과 선택 시 alert 또는 안내 메시지 표시)

제출하기 <button id="submit-feedback-btn">피드백 제출하기</button>

'피드백 제출하기' 버튼 클릭 시

모든 질문에 대한 답변(Q1~Q9: "A"~"F", Q10: ["키워드1", "키워드2", "키워드3"])을 하나의 자바스크립트 객체로 수집한다.

POST {Endpoint URL}로 { "action": "submit", "id": "현재_페이지_id", "response": 수집된_객체 }를 전송한다.

성공적으로 제출되면, "소중한 피드백 감사합니다!" 와 같은 완료 메시지를 보여주고 설문 폼은 숨긴다.

6.3. 결과 확인 페이지 (result.html)
페이지 로드 시

URL에서 id 값을 추출한다.

const MIN_RESPONSES = 5; 설정.

GET {Endpoint URL}?action=getContent를 호출하여 전체 콘텐츠 데이터를 가져온다.

GET {Endpoint URL}?id={id}를 호출하여 상세 응답 데이터를 가져온다.

응답자 수를 계산하고 대기 화면(waiting-view)을 업데이트한다.

최소 응답자 수 충족 시 결과 보기 버튼을 활성화한다.

'결과 보기' 버튼 클릭 시

#waiting-view를 숨기고 #report-view를 표시한다.

페이지 로드 시 받아온 응답 데이터를 **[7. 결과 리포트 분석 로직]**에 따라 처리한다.

분석된 결과를 바탕으로, 페이지 로드 시 받아온 콘텐츠 데이터를 사용하여 리포트 화면의 모든 텍스트(아키타입 이름, 설명, 종합 코멘트 등)를 동적으로 채운다.

7. 결과 리포트 분석 로직 (JS)
※ 개발자 참고: 이 로직은 '결과 보기' 버튼 클릭 시 프론트엔드 자바스크립트에서 실행됩니다.

초기화:

scores = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 } 객체를 생성한다.

keywordCounts = {} 객체를 생성한다.

데이터 순회 및 계산:

data.responses 배열의 각 response 객체에 대해 반복문을 실행한다.

점수 계산: response.q1 부터 response.q9 까지의 값('A'~'F')에 해당하는 scores 객체의 카운트를 1씩 증가시킨다. (scores[response.q1]++)

키워드 계산: response.q10 배열의 각 키워드에 대해 keywordCounts 객체의 카운트를 1씩 증가시킨다.

아키타입 결정:

scores 객체를 값(value) 기준으로 내림차순 정렬한다.

가장 높은 점수를 받은 키(key)가 **'대표 이미지'**가 된다.

두 번째로 높은 점수를 받은 키(key)가 **'잠재적 매력'**이 된다.

데이터 시각화 준비:

레이더 차트 데이터: scores 객체의 A, B, C, D, E, F 순서에 맞는 값 배열 [scores.A, scores.B, scores.C, scores.D, scores.E, scores.F]을 생성한다.

키워드 클라우드 데이터: keywordCounts 객체에서 카운트가 높은 순으로 3~5개 키워드를 추출한다.

코멘트 생성:

결정된 '대표 이미지'(예: 'A')와 '잠재적 매력'(예: 'B')을 조합하여 코멘트 키(comment_A_B 또는 comment_B_A)를 생성한다.

페이지 로드 시 받아온 콘텐츠 객체에서 해당 키로 종합 코멘트 텍스트를 조회한다. (content['comment_A_B'])

렌더링:

위에서 가공된 모든 통계 데이터와 콘텐츠 객체에서 조회한 모든 텍스트를 result.html의 해당 영역에 표시한다.