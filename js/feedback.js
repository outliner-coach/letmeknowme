// 설문 페이지 전역 변수
let currentQuestion = 1;
let selectedKeywords = [];
let contentData = null;
let reportId = null;
let requesterName = '';

// 설문 페이지 초기화
async function initializeFeedbackPage() {
    try {
        // URL에서 ID 추출
        reportId = Utils.getUrlParameter('id');
        if (!reportId) {
            alert('잘못된 링크입니다.');
            window.location.href = 'index.html';
            return;
        }

        // 로딩 상태 표시
        showPageLoading(true);

        // 콘텐츠 데이터 로딩
        contentData = await loadContent();
        
        // 리포트 정보 가져오기 (요청자 이름)
        const reportData = await API.getReport(reportId);
        requesterName = reportData.requester_name;

        // 페이지 제목 업데이트
        updatePageTitle();

        // 질문들 생성
        generateQuestions();

        // 키워드 섹션 생성
        generateKeywords();

        // 이벤트 리스너 설정
        setupEventListeners();

        // 로딩 상태 해제
        showPageLoading(false);

        // 첫 번째 질문 표시
        showQuestion(1);

    } catch (error) {
        console.error('설문 페이지 초기화 실패:', error);
        alert('페이지를 불러오는 중 오류가 발생했습니다.');
    }
}

// 페이지 로딩 상태 관리
function showPageLoading(isLoading) {
    const form = document.getElementById('feedback-form');
    if (isLoading) {
        form.innerHTML = '<div class="loading">설문을 준비하는 중...</div>';
    }
}

// 페이지 제목 업데이트
function updatePageTitle() {
    const pageTitle = document.getElementById('page-title');
    if (pageTitle && requesterName) {
        pageTitle.textContent = `${requesterName}님에 대한 설문`;
    }
}

// Q1-Q9 질문들 생성
function generateQuestions() {
    const questionsContainer = document.getElementById('questions-container');
    let questionsHtml = '';

    for (let i = 1; i <= 9; i++) {
        const questionKey = `q${i}_text`;
        const questionText = contentData[questionKey] || `질문 ${i}`;

        questionsHtml += `
            <div class="question-section" id="q${i}-section" style="display: none;">
                <h3 class="question-title">${questionText}</h3>
                <div class="choices-container">
        `;

        // A-F 선택지 생성
        for (let choice of ['A', 'B', 'C', 'D', 'E', 'F']) {
            const choiceKey = `q${i}_choice_${choice}`;
            const choiceText = contentData[choiceKey] || `선택지 ${choice}`;

            questionsHtml += `
                <div class="choice-item">
                    <input type="radio" id="q${i}_${choice}" name="q${i}" value="${choice}">
                    <label for="q${i}_${choice}" class="choice-text">${choiceText}</label>
                </div>
            `;
        }

        questionsHtml += `
                </div>
                <div class="question-navigation">
                    ${i > 1 ? `<button type="button" class="btn-secondary prev-btn" data-question="${i}">이전</button>` : ''}
                    ${i < 9 ? `<button type="button" class="btn-primary next-btn" data-question="${i}">다음</button>` : 
                             `<button type="button" class="btn-primary next-btn" data-question="${i}">키워드 선택하기</button>`}
                </div>
            </div>
        `;
    }

    questionsContainer.innerHTML = questionsHtml;
}

// Q10 키워드 생성
function generateKeywords() {
    const keywordsContainer = document.getElementById('keywords-container');
    const q10Title = document.getElementById('q10-title');
    
    // Q10 제목 설정
    if (q10Title && contentData.q10_text) {
        q10Title.textContent = contentData.q10_text;
    }

    // 키워드 목록 파싱
    let keywords = [];
    try {
        keywords = JSON.parse(contentData.keyword_list || '[]');
    } catch (error) {
        console.error('키워드 파싱 실패:', error);
        keywords = ['리더십', '책임감', '추진력', '공감능력', '배려심', '다정함', '창의력', '독창성', '심미안', '긍정적', '유머감각', '사교성', '분석력', '논리적', '효율성', '도전적', '자유로움', '호기심'];
    }

    let keywordsHtml = '';
    keywords.forEach((keyword, index) => {
        keywordsHtml += `
            <div class="keyword-item" data-keyword="${keyword}">
                <input type="checkbox" id="keyword_${index}" value="${keyword}">
                <label for="keyword_${index}">${keyword}</label>
            </div>
        `;
    });

    keywordsContainer.innerHTML = keywordsHtml;

    // Q10 섹션 초기 숨김
    document.getElementById('q10-section').style.display = 'none';
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 라디오 버튼 선택 이벤트
    document.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const questionNum = parseInt(this.name.replace('q', ''));
            enableNextButton(questionNum);
        });
    });

    // 이전/다음 버튼 이벤트
    document.querySelectorAll('.prev-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const questionNum = parseInt(this.getAttribute('data-question'));
            showQuestion(questionNum - 1);
        });
    });

    document.querySelectorAll('.next-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const questionNum = parseInt(this.getAttribute('data-question'));
            if (questionNum < 9) {
                showQuestion(questionNum + 1);
            } else {
                showKeywordSection();
            }
        });
    });

    // 키워드 선택 이벤트
    document.querySelectorAll('.keyword-item').forEach(item => {
        item.addEventListener('click', function() {
            const checkbox = this.querySelector('input[type="checkbox"]');
            const keyword = this.getAttribute('data-keyword');

            if (checkbox.checked) {
                // 선택 해제
                checkbox.checked = false;
                this.classList.remove('selected');
                selectedKeywords = selectedKeywords.filter(k => k !== keyword);
            } else {
                // 선택 (3개 제한)
                if (selectedKeywords.length >= 3) {
                    alert('최대 3개까지만 선택할 수 있습니다.');
                    return;
                }
                checkbox.checked = true;
                this.classList.add('selected');
                selectedKeywords.push(keyword);
            }

            updateKeywordCount();
            updateSubmitButton();
        });
    });

    // 폼 제출 이벤트
    const form = document.getElementById('feedback-form');
    form.addEventListener('submit', handleFormSubmit);
}

// 질문 표시
function showQuestion(questionNum) {
    // 모든 질문 숨기기
    for (let i = 1; i <= 9; i++) {
        const section = document.getElementById(`q${i}-section`);
        if (section) {
            section.style.display = 'none';
        }
    }

    // Q10 섹션 숨기기
    document.getElementById('q10-section').style.display = 'none';

    // 현재 질문 표시
    const currentSection = document.getElementById(`q${questionNum}-section`);
    if (currentSection) {
        currentSection.style.display = 'block';
        currentQuestion = questionNum;
        updateProgress();
    }
}

// 키워드 섹션 표시
function showKeywordSection() {
    // 모든 질문 숨기기
    for (let i = 1; i <= 9; i++) {
        const section = document.getElementById(`q${i}-section`);
        if (section) {
            section.style.display = 'none';
        }
    }

    // Q10 섹션 표시
    document.getElementById('q10-section').style.display = 'block';
    currentQuestion = 10;
    updateProgress();
}

// 진행률 업데이트
function updateProgress() {
    const progressFill = document.getElementById('progress-fill');
    const currentQuestionSpan = document.getElementById('current-question');
    
    const progressPercent = (currentQuestion / 10) * 100;
    progressFill.style.width = `${progressPercent}%`;
    currentQuestionSpan.textContent = currentQuestion;
}

// 다음 버튼 활성화
function enableNextButton(questionNum) {
    const nextBtn = document.querySelector(`[data-question="${questionNum}"].next-btn`);
    if (nextBtn) {
        nextBtn.disabled = false;
    }
}

// 키워드 카운트 업데이트
function updateKeywordCount() {
    const countSpan = document.getElementById('selected-count');
    if (countSpan) {
        countSpan.textContent = selectedKeywords.length;
    }
}

// 제출 버튼 상태 업데이트
function updateSubmitButton() {
    const submitBtn = document.getElementById('submit-feedback-btn');
    if (submitBtn) {
        submitBtn.disabled = selectedKeywords.length !== 3;
    }
}

// 폼 제출 처리
async function handleFormSubmit(e) {
    e.preventDefault();

    try {
        // 응답 데이터 수집
        const responseData = {};

        // Q1-Q9 응답 수집
        for (let i = 1; i <= 9; i++) {
            const selectedRadio = document.querySelector(`input[name="q${i}"]:checked`);
            if (!selectedRadio) {
                alert(`${i}번 질문에 답변해주세요.`);
                showQuestion(i);
                return;
            }
            responseData[`q${i}`] = selectedRadio.value;
        }

        // Q10 키워드 응답 수집
        if (selectedKeywords.length !== 3) {
            alert('키워드를 정확히 3개 선택해주세요.');
            showKeywordSection();
            return;
        }
        responseData.q10 = selectedKeywords;

        // 제출 버튼 비활성화
        const submitBtn = document.getElementById('submit-feedback-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '제출 중...';

        // API 호출
        await API.submitResponse(reportId, responseData);

        // 성공 메시지 표시
        showSuccessMessage();

    } catch (error) {
        console.error('설문 제출 실패:', error);
        alert('설문 제출에 실패했습니다. 다시 시도해주세요.');
        
        // 제출 버튼 재활성화
        const submitBtn = document.getElementById('submit-feedback-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = '피드백 제출하기';
    }
}

// 성공 메시지 표시
function showSuccessMessage() {
    const form = document.getElementById('feedback-form');
    const successMessage = document.getElementById('success-message');
    
    form.style.display = 'none';
    successMessage.style.display = 'block';
    
    // 페이지 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
} 