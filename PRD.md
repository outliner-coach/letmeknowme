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

설명: 사용자별 리포트 요청 및 응답 결과를 저장합니다.

컬럼 구성:

컬럼명

데이터 타입

설명

예시

id

Text

각 리포트를 구분하는 고유 UUID.

a1b2c3-d4e5-f6g7

requester_name

Text

피드백 요청자의 이름 또는 닉네임.

김민준

responses

Text

응답 결과들을 JSON 배열 형태의 문자열로 저장.

"[{\"q1\":\"A\",...}]"

created_at

Date

리포트가 생성된 일시.

2025-07-01T20:30:00.000Z

4.2. 콘텐츠 관리 시트 (CMS)
시트 이름: contents

설명: 서비스에 표시되는 모든 텍스트 콘텐츠를 관리합니다. (질문, 선택지, 결과 문구 등)

컬럼 구성: Key-Value 형태

key

value

(질문)



q1_text

이 친구에게 '새로운 프로젝트'가 주어졌을 때 가장 먼저 할 일은?

q2_text

친구들과의 여행 계획을 짤 때 이 친구의 스타일은?

q3_text

이 친구가 스트레스를 푸는 방식에 가장 가까운 것은?

q4_text

이 친구의 SNS 피드에서 가장 많이 보이는 게시물은?

q5_text

이 친구에게 '선물'을 한다면 어떤 것이 좋을까?

q6_text

대화 중 의견 충돌이 생겼을 때 이 친구의 대처법은?

q7_text

이 친구가 무인도에 단 하나의 물건만 가져갈 수 있다면?

q8_text

이 친구의 방은 어떤 모습일 것 같나?

q9_text

이 친구가 영화를 만든다면 어떤 장르일까?

q10_text

[강점 키워드] 이 친구를 가장 잘 표현하는 키워드 3가지를 골라주세요.

(선택지)



q1_choice_A

최종 목표를 설정하고 팀원들에게 역할을 분배한다.

q1_choice_B

프로젝트에 대해 팀원들이 어떻게 생각하는지부터 묻는다.

q1_choice_C

프로젝트 컨셉을 독창적으로 시각화하는 작업을 시작한다.

q1_choice_D

"우리 한번 재밌게 해보자!"라며 팀의 사기를 북돋운다.

q1_choice_E

예상되는 리스크를 분석하고 단계별 계획표를 작성한다.

q1_choice_F

일단 관련 분야를 직접 경험해보기 위해 현장으로 나선다.

q2_choice_A

여행의 리더로서 예산과 동선을 책임지고 결정한다.

q2_choice_B

모두의 의견이 잘 반영되도록 중간에서 조율한다.

...

(이하 Q9까지 모든 선택지 내용을 위와 같은 패턴으로 작성)

(키워드)



keyword_list

["리더십", "책임감", "추진력", "공감능력", "배려심", "다정함", "창의력", "독창성", "심미안", "긍정적", "유머감각", "사교성", "분석력", "논리적", "효율성", "도전적", "자유로움", "호기심"]

(아키타입)



archetype_A_name

든든한 리더

archetype_A_desc

목표 지향, 책임, 추진

archetype_B_name

따뜻한 상담가

archetype_B_desc

공감, 경청, 관계 조율

archetype_C_name

창의적인 아티스트

archetype_C_desc

독창성, 심미안, 감성

archetype_D_name

긍정의 에너자이저

archetype_D_desc

활력, 유머, 분위기 주도

archetype_E_name

치밀한 전략가

archetype_E_desc

분석, 논리, 계획

archetype_F_name

자유로운 탐험가

archetype_F_desc

호기심, 도전, 경험 중시

(결과 코멘트)



comment_A_B

당신은 목표를 향해 팀을 이끄는 '리더'의 모습과 함께, 구성원들을 세심하게 챙기는 '상담가'의 따뜻함도 가지고 있군요!

comment_A_C

당신은 강력한 추진력을 가진 '리더'이면서 동시에, 세상을 남다른 시선으로 바라보는 '아티스트'의 감성을 지녔습니다.

comment_E_F

당신은 모든 것을 철저하게 분석하는 '전략가'이지만, 그 안에는 언제든 훌쩍 떠날 준비가 된 '탐험가'의 영혼이 숨 쉬고 있습니다.

...

(이하 모든 조합(30개)의 코멘트를 위와 같은 패턴으로 작성)

5. 백엔드 API 명세 (Google Apps Script)
배포 형태: 웹 앱 (액세스 권한: 모든 사용자)

Endpoint URL: 배포 후 생성된 고유 URL (https://script.google.com/macros/s/.../exec)

Request Method: GET

Case 1: 전체 콘텐츠 조회 (신규)

요청: GET {Endpoint URL}?action=getContent

처리: contents 시트의 모든 Key-Value 데이터를 읽어와 하나의 큰 JSON 객체로 변환하여 반환.

응답 (JSON): { "q1_text": "...", "q1_choice_A": "...", ... }

Case 2: 전체 리포트 목록 조회

요청: GET {Endpoint URL} (파라미터 없음)

처리: feedbacks 시트의 id, requester_name, created_at을 추출하여 최신순 정렬 후 반환.

응답 (JSON): [ { "id": "...", "name": "...", "date": "..." } ]

Case 3: 특정 리포트 상세 데이터 조회

요청: GET {Endpoint URL}?id={report_id}

처리: id에 해당하는 행을 찾아 id, requester_name, responses 등을 반환.

응답 (JSON): { "id": "...", "requester_name": "...", "responses": [ ... ] }

Request Method: POST

Case 1: 신규 리포트 생성

요청 Body (JSON): { "action": "create", "name": "김민준" }

처리: 새 UUID를 생성하고, name과 함께 새 행을 추가.

응답 (JSON): { "id": "새로_생성된_uuid" }

Case 2: 설문 응답 제출

요청 Body (JSON): { "action": "submit", "id": "uuid1", "response": { "q1":"A", ... "q10":["키워드1", ...]} }

처리: id로 해당 행을 찾아 responses 컬럼에 새 response 객체를 추가(append)하고 업데이트.

응답 (JSON): { "status": "success" }

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