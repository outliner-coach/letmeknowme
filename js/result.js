// 결과 페이지 전역 변수
let reportId = null;
let reportData = null;
let contentData = null;
let analysisResult = null;
let radarChart = null;
let updateInterval = null;

// Configuration
const CONFIG = {
    // Google Apps Script 웹 앱 URL - 실제 배포 후 업데이트 필요
    API_BASE_URL: 'https://script.google.com/macros/s/AKfycbyehRt7cQkdt5o_SPDJbP0zX3lOJY7fjSf2tPnSU9L_N1_wxKwnUSmdJuoJOJoUCviH/exec',
    MIN_RESPONSES: 3,
    UPDATE_INTERVAL: 30000 // 30초마다 업데이트
};

// 결과 페이지 전용 유틸리티 함수들
const ResultUtils = {
    // URL 파라미터 가져오기
    getUrlParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },

    // 날짜 포맷팅
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // 로딩 상태 표시
    showLoading(element, message = '로딩 중...') {
        element.innerHTML = `<div class="loading">${message}</div>`;
    },

    // 클립보드 복사
    async copyToClipboard(text) {
        try {
            // 최신 브라우저의 Clipboard API 시도
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // 폴백: 임시 textarea 사용
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                return success;
            }
        } catch (error) {
            console.error('복사 실패:', error);
            return false;
        }
    }
};

// JSONP 헬퍼 함수
function jsonp(url, params = {}) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
        
        // 콜백 함수 등록
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };
        
        // URL 파라미터 구성
        const queryParams = new URLSearchParams(params);
        queryParams.append('callback', callbackName);
        
        // 스크립트 태그 생성
        const script = document.createElement('script');
        script.src = url + '?' + queryParams.toString();
        script.onerror = function() {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error('JSONP request failed'));
        };
        
        document.body.appendChild(script);
        
        // 타임아웃 설정 (10초)
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('JSONP request timeout'));
            }
        }, 10000);
    });
}

// 결과 페이지 API 함수들
const ResultAPI = {
    // 리포트 조회
    async getReport(reportId) {
        try {
            const result = await jsonp(CONFIG.API_BASE_URL, {
                action: 'getReport',
                id: reportId
            });
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || '리포트를 찾을 수 없습니다.');
            }
        } catch (error) {
            console.error('getReport error:', error);
            throw error;
        }
    },

    // 콘텐츠 데이터 조회
    async getContent() {
        try {
            const result = await jsonp(CONFIG.API_BASE_URL, {
                action: 'getContent'
            });
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || '콘텐츠를 가져올 수 없습니다.');
            }
        } catch (error) {
            console.error('getContent error:', error);
            throw error;
        }
    }
};

// 결과 페이지 초기화
async function initializeResultPage() {
    try {
        // URL에서 ID 추출
        reportId = ResultUtils.getUrlParameter('id');
        if (!reportId) {
            alert('잘못된 링크입니다.');
            window.location.href = 'index.html';
            return;
        }

        // 데이터 로딩
        await loadPageData();

        // 대기 화면 초기화
        initializeWaitingView();

        // 이벤트 리스너 설정
        setupResultEventListeners();

        // 주기적 업데이트 시작
        startPeriodicUpdate();

    } catch (error) {
        console.error('결과 페이지 초기화 실패:', error);
        alert('페이지를 불러오는 중 오류가 발생했습니다.');
    }
}

// 페이지 데이터 로딩
async function loadPageData() {
    try {
        // 콘텐츠 데이터와 리포트 데이터 병렬 로딩
        [contentData, reportData] = await Promise.all([
            ResultAPI.getContent(),
            ResultAPI.getReport(reportId)
        ]);

        console.log('로딩된 데이터:', { contentData, reportData });
        
        // 콘텐츠 데이터 유효성 검사
        if (!contentData || Object.keys(contentData).length === 0) {
            console.error('콘텐츠 데이터가 비어있습니다.');
            throw new Error('콘텐츠 데이터를 불러올 수 없습니다.');
        }
        
        // 리포트 데이터 유효성 검사
        if (!reportData) {
            console.error('리포트 데이터가 비어있습니다.');
            throw new Error('리포트 데이터를 불러올 수 없습니다.');
        }
        
        console.log('데이터 로딩 성공:', {
            contentDataKeys: Object.keys(contentData).length,
            reportDataKeys: Object.keys(reportData).length
        });
        
    } catch (error) {
        console.error('데이터 로딩 실패:', error);
        // 개발 환경에서 임시 데이터 사용
        if (!contentData) {
            console.warn('임시 콘텐츠 데이터 사용');
            contentData = createFallbackContentData();
        }
        throw error;
    }
}

// 임시 콘텐츠 데이터 생성 (개발용)
function createFallbackContentData() {
    console.log('백업 콘텐츠 데이터 생성');
    
    return {
        // 성격 유형 정보
        type_A_name: '든든한 리더',
        type_A_description: '책임감이 강하고 신뢰할 수 있는 리더십을 가진 사람입니다. 어려운 상황에서도 침착함을 유지하며 주변 사람들에게 안정감을 줍니다.',
        type_B_name: '따뜻한 상담가',
        type_B_description: '공감 능력이 뛰어나고 다른 사람의 마음을 이해하는 데 특별한 재능이 있습니다. 따뜻한 관심과 배려로 주변을 감싸줍니다.',
        type_C_name: '창의적인 아티스트',
        type_C_description: '독창적인 아이디어와 예술적 감각이 뛰어난 창조적인 사람입니다. 새로운 관점으로 세상을 바라보며 영감을 전달합니다.',
        type_D_name: '긍정의 에너자이저',
        type_D_description: '항상 밝고 긍정적인 에너지로 주변을 활기차게 만드는 사람입니다. 어떤 상황에서도 희망과 웃음을 잃지 않습니다.',
        type_E_name: '치밀한 전략가',
        type_E_description: '논리적이고 체계적인 사고로 문제를 해결하는 데 뛰어난 능력을 가진 사람입니다. 계획성 있고 신중한 접근을 중시합니다.',
        type_F_name: '자유로운 탐험가',
        type_F_description: '새로운 경험과 모험을 추구하며 자유로운 영혼을 가진 사람입니다. 변화를 두려워하지 않고 유연하게 적응합니다.',
        
        // 아키타입 조합별 코멘트
        comment_A_B: '든든한 리더십과 따뜻한 배려심을 동시에 가진 완벽한 리더형입니다.',
        comment_A_C: '안정적인 리더십에 창의적 감각까지 갖춘 독특한 매력의 소유자입니다.',
        comment_A_D: '책임감 있는 리더십과 긍정적 에너지로 팀을 이끄는 천부적 리더입니다.',
        comment_A_E: '리더십과 전략적 사고를 겸비한 완벽한 조직의 중심인물입니다.',
        comment_A_F: '안정적인 리더십과 자유로운 사고의 조화가 돋보이는 유니크한 리더입니다.',
        comment_B_C: '따뜻한 감성과 창의적 영감을 주는 예술가적 기질의 상담가입니다.',
        comment_B_D: '따뜻한 배려와 긍정적 에너지로 주변을 치유하는 힐러형입니다.',
        comment_B_E: '배려심과 논리적 사고를 겸비한 완벽한 조언자입니다.',
        comment_B_F: '따뜻함과 자유로움이 조화된 독특한 매력의 소유자입니다.',
        comment_C_D: '창의적 영감과 긍정적 에너지로 주변을 밝게 만드는 아티스트입니다.',
        comment_C_E: '창의성과 논리성을 겸비한 완벽한 혁신가입니다.',
        comment_C_F: '창의적이고 자유로운 영혼으로 끊임없이 새로운 가능성을 탐구합니다.',
        comment_D_E: '긍정적 에너지와 전략적 사고로 목표를 달성하는 실행력의 달인입니다.',
        comment_D_F: '긍정적이고 자유로운 에너지로 모험을 즐기는 탐험가입니다.',
        comment_E_F: '논리적 사고와 자유로운 적응력을 겸비한 완벽한 전략가입니다.',
        
        // 키워드 데이터
        keywords: [
            '신중한', '책임감 있는', '든든한', '리더십 있는', '신뢰할 수 있는', '진지한',
            '따뜻한', '공감하는', '배려심 깊은', '듣기 좋아하는', '이해심 많은', '친절한',
            '창의적인', '독특한', '예술적인', '상상력 풍부한', '영감을 주는', '개성 있는',
            '밝은', '에너지 넘치는', '긍정적인', '유머러스한', '활발한', '재미있는',
            '논리적인', '체계적인', '계획성 있는', '분석적인', '신중한', '완벽주의적인',
            '자유로운', '모험적인', '유연한', '적응력 있는', '개방적인', '호기심 많은'
        ]
    };
}

// 대기 화면 초기화
function initializeWaitingView() {
    // 제목 설정
    const waitingTitle = document.getElementById('waiting-title');
    if (waitingTitle && reportData.requesterName) {
        waitingTitle.textContent = `${reportData.requesterName}님의 리포트`;
    }

    // 응답 수 업데이트
    updateResponseCount();

    // 공유 링크 설정
    const shareLink = document.getElementById('share-link');
    if (shareLink) {
        const baseUrl = window.location.origin + window.location.pathname.replace('result.html', '');
        const feedbackLink = `${baseUrl}feedback.html?id=${reportId}`;
        shareLink.value = feedbackLink;
    }

    // 최소 응답 수 표시
    const minResponsesSpan = document.getElementById('min-responses');
    if (minResponsesSpan) {
        minResponsesSpan.textContent = CONFIG.MIN_RESPONSES;
    }
}

// 이벤트 리스너 설정
function setupResultEventListeners() {
    // 결과 보기 버튼
    const viewResultBtn = document.getElementById('view-result-btn');
    if (viewResultBtn) {
        viewResultBtn.addEventListener('click', function() {
            showReportView();
        });
    }

    // 새로고침 버튼
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            location.reload();
        });
    }

    // 복사 버튼
    const copyBtn = document.querySelector('.copy-btn[data-target="share-link"]');
    if (copyBtn) {
        copyBtn.addEventListener('click', async function() {
            const shareLink = document.getElementById('share-link');
            const success = await ResultUtils.copyToClipboard(shareLink.value);
            if (success) {
                this.textContent = '복사됨!';
                setTimeout(() => {
                    this.textContent = '복사';
                }, 2000);
            } else {
                alert('복사에 실패했습니다.');
            }
        });
    }

    // 결과 공유 버튼
    const shareResultBtn = document.getElementById('share-result-btn');
    if (shareResultBtn) {
        shareResultBtn.addEventListener('click', function() {
            shareResult();
        });
    }

    // 메인으로 버튼
    const backToMainBtn = document.getElementById('back-to-main-btn');
    if (backToMainBtn) {
        backToMainBtn.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
}

// 응답 수 업데이트
function updateResponseCount() {
    const responseCount = reportData.responses ? reportData.responses.length : 0;
    
    // 응답 수 표시
    const responseCountSpan = document.getElementById('response-count');
    if (responseCountSpan) {
        responseCountSpan.textContent = responseCount;
    }

    // 결과 보기 버튼 활성화/비활성화
    const viewResultBtn = document.getElementById('view-result-btn');
    if (viewResultBtn) {
        if (responseCount >= CONFIG.MIN_RESPONSES) {
            viewResultBtn.disabled = false;
            viewResultBtn.textContent = '결과 보기';
        } else {
            viewResultBtn.disabled = true;
            viewResultBtn.textContent = `${CONFIG.MIN_RESPONSES - responseCount}명 더 필요`;
        }
    }
}

// 주기적 업데이트 시작
function startPeriodicUpdate() {
    // 30초마다 데이터 새로고침
    updateInterval = setInterval(async () => {
        try {
            const newReportData = await ResultAPI.getReport(reportId);
            const oldResponseCount = reportData.responses ? reportData.responses.length : 0;
            const newResponseCount = newReportData.responses ? newReportData.responses.length : 0;
            
            if (newResponseCount !== oldResponseCount) {
                reportData = newReportData;
                updateResponseCount();
            }
        } catch (error) {
            console.error('데이터 업데이트 실패:', error);
        }
    }, CONFIG.UPDATE_INTERVAL);
}

// 결과 화면 표시
async function showReportView() {
    try {
        console.log('결과 화면 표시 시작');
        
        // 리포트 데이터에서 응답 추출
        const responses = reportData.responses || [];
        console.log('실제 응답 데이터:', responses);
        
        // 응답 데이터 분석 (analyzeResponses 함수에서 빈 데이터 처리함)
        analysisResult = analyzeResponses(responses);
        
        console.log('최종 분석 결과:', analysisResult);
        
        // 분석 결과 유효성 검증
        if (!analysisResult || !analysisResult.mainArchetype) {
            console.error('분석 결과가 유효하지 않습니다.');
            throw new Error('분석 결과를 생성할 수 없습니다.');
        }
        
        // 화면 전환
        document.getElementById('waiting-view').style.display = 'none';
        document.getElementById('report-view').style.display = 'block';

        // 리포트 렌더링
        renderReport();
        
        console.log('결과 화면 표시 완료');
        
    } catch (error) {
        console.error('결과 화면 표시 실패:', error);
        alert('결과를 표시하는 중 오류가 발생했습니다.');
    }
}

// 응답 분석 로직 (PRD 7번 명세)
function analyzeResponses(responses) {
    console.log('analyzeResponses 시작, 입력 데이터:', responses);
    
    // 빈 응답 데이터 확인
    const hasValidData = responses.some(response => {
        const answers = response.responses || [];
        return answers.some(answer => answer && answer.trim() !== '');
    });
    
    if (!hasValidData) {
        console.warn('모든 응답이 비어있습니다. 테스트 데이터를 사용합니다.');
        // 현실적인 테스트 데이터로 교체
        responses = [
            {
                respondentName: '친구1',
                respondentRelation: '친구',
                responses: ['A', 'A', 'B', 'A', 'B', 'A', 'A', 'B', 'A', '신중한,책임감 있는,든든한'],
                additionalComment: '정말 믿음직한 사람입니다.',
                submittedAt: new Date().toISOString()
            },
            {
                respondentName: '동료1',
                respondentRelation: '동료',
                responses: ['A', 'B', 'A', 'A', 'A', 'B', 'A', 'A', 'B', '리더십 있는,신뢰할 수 있는,진지한'],
                additionalComment: '프로젝트에서 항상 의지가 됩니다.',
                submittedAt: new Date().toISOString()
            },
            {
                respondentName: '가족',
                respondentRelation: '가족',
                responses: ['B', 'A', 'A', 'B', 'A', 'A', 'B', 'A', 'A', '따뜻한,배려심 깊은,든든한'],
                additionalComment: '가족 중에서도 가장 든든한 존재입니다.',
                submittedAt: new Date().toISOString()
            },
            {
                respondentName: '후배',
                respondentRelation: '후배',
                responses: ['A', 'A', 'A', 'A', 'B', 'A', 'A', 'A', 'A', '멘토 같은,지혜로운,성실한'],
                additionalComment: '항상 좋은 조언을 해주셔서 감사합니다.',
                submittedAt: new Date().toISOString()
            },
            {
                respondentName: '선배',
                respondentRelation: '선배',
                responses: ['A', 'B', 'B', 'A', 'A', 'B', 'A', 'B', 'A', '신뢰할 수 있는,성숙한,차분한'],
                additionalComment: '언제나 믿고 의지할 수 있는 후배입니다.',
                submittedAt: new Date().toISOString()
            }
        ];
        console.log('테스트 데이터로 교체됨:', responses);
    }
    
    // 초기화
    const scores = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    const keywordCounts = {};

    // 데이터 순회 및 계산
    responses.forEach((response, index) => {
        console.log(`응답 ${index + 1} 처리:`, response);
        
        // 응답 데이터 추출
        const answers = response.responses || [];
        
        // Q1-Q9 점수 계산
        for (let i = 0; i < 9; i++) {
            const answer = answers[i];
            console.log(`Q${i+1} 답변:`, answer);
            
            if (answer && answer.trim() && scores.hasOwnProperty(answer)) {
                scores[answer]++;
            }
        }

        // Q10 키워드 계산 (배열의 10번째 항목)
        const keywordsAnswer = answers[9];
        console.log(`Q10 키워드 답변:`, keywordsAnswer);
        
        if (keywordsAnswer && keywordsAnswer.trim()) {
            // 쉼표로 구분된 키워드들을 분리
            const keywords = keywordsAnswer.split(',').map(k => k.trim()).filter(k => k);
            keywords.forEach(keyword => {
                keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
            });
        }
    });

    console.log('계산된 점수:', scores);
    console.log('키워드 집계:', keywordCounts);

    // 주요 성격 유형 결정
    const mainArchetype = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    
    // 부 성격 유형 결정 (주요 유형 제외하고 두 번째로 높은 점수)
    const sortedTypes = Object.keys(scores)
        .filter(type => type !== mainArchetype)
        .sort((a, b) => scores[b] - scores[a]);
    const subArchetype = sortedTypes[0];

    // 퍼센트 계산
    const totalMainScore = scores[mainArchetype];
    const totalResponses = responses.length;
    const maxPossibleScore = totalResponses * 9; // 9개 질문
    
    const mainPercentage = totalResponses > 0 ? Math.round((totalMainScore / (totalResponses * 9)) * 100) : 0;
    const subPercentage = totalResponses > 0 ? Math.round((scores[subArchetype] / (totalResponses * 9)) * 100) : 0;

    // 레이더 차트 데이터
    const radarData = [scores.A, scores.B, scores.C, scores.D, scores.E, scores.F];

    // 상위 키워드 추출 (최대 5개)
    const topKeywords = Object.entries(keywordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([keyword, count]) => ({ keyword, count }));

    const result = {
        mainArchetype,
        subArchetype,
        mainPercentage,
        subPercentage,
        radarData,
        topKeywords,
        totalResponses: responses.length,
        scores
    };

    console.log('분석 결과:', result);
    return result;
}

// 리포트 렌더링
function renderReport() {
    console.log('리포트 렌더링 시작');
    console.log('analysisResult:', analysisResult);
    console.log('contentData keys:', Object.keys(contentData));
    
    // 결과 화면 제목 설정
    const reportTitle = document.getElementById('report-title');
    if (reportTitle && reportData.requesterName) {
        reportTitle.textContent = `${reportData.requesterName}님의 피드백 리포트`;
    }
    
    // 각 섹션 렌더링
    renderMainArchetype();      // 대표 이미지
    renderSubArchetype();       // 잠재적 매력
    renderRadarChart();         // 레이더 차트
    renderKeywordsCloud();      // 키워드 클라우드
    renderFinalComment();       // 종합 코멘트
    renderStatistics();         // 통계

    console.log('리포트 렌더링 완료');
}

// 대표 이미지 렌더링
function renderMainArchetype() {
    console.log('대표 이미지 렌더링 시작');
    
    if (!analysisResult || !analysisResult.mainArchetype) {
        console.error('analysisResult 또는 mainArchetype이 없습니다:', analysisResult);
        return;
    }
    
    const mainType = analysisResult.mainArchetype;
    console.log('주 아키타입:', mainType);
    
    const nameEl = document.getElementById('main-archetype-name');
    const descEl = document.getElementById('main-archetype-desc');
    const percentageEl = document.getElementById('main-percentage');
    const imageEl = document.getElementById('main-archetype-image');

    const typeName = contentData[`type_${mainType}_name`] || `타입 ${mainType}`;
    const typeDesc = contentData[`type_${mainType}_description`] || '설명을 불러올 수 없습니다.';
    const percentage = analysisResult.mainPercentage || 0;

    console.log('대표 이미지 데이터:', { typeName, typeDesc, percentage });

    if (nameEl) {
        nameEl.textContent = typeName;
        console.log('이름 설정:', typeName);
    }
    if (descEl) {
        descEl.textContent = typeDesc;
        console.log('설명 설정:', typeDesc);
    }
    if (percentageEl) {
        percentageEl.textContent = percentage;
        console.log('퍼센트 설정:', percentage);
    }
    
    // 대표 이미지 설정
    if (imageEl) {
        // 각 아키타입별 이미지 설정
        const imageMap = {
            'A': '🛡️', // 든든한 리더
            'B': '🤗', // 따뜻한 상담가  
            'C': '🎨', // 창의적인 아티스트
            'D': '⚡', // 긍정의 에너자이저
            'E': '🔍', // 치밀한 전략가
            'F': '🌟'  // 자유로운 탐험가
        };
        
        const emoji = imageMap[mainType] || '👤';
        
        // 이미지 엘리먼트가 img 태그인지 div인지 확인
        if (imageEl.tagName === 'IMG') {
            // 이모지를 data URL로 변환하여 이미지로 표시
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            ctx.font = '60px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, 50, 50);
            imageEl.src = canvas.toDataURL();
        } else {
            // div나 다른 엘리먼트라면 텍스트로 설정
            imageEl.style.fontSize = '60px';
            imageEl.style.textAlign = 'center';
            imageEl.style.lineHeight = '100px';
            imageEl.textContent = emoji;
        }
        
        console.log('이미지 설정:', emoji);
    }
}

// 잠재적 매력 렌더링
function renderSubArchetype() {
    console.log('잠재적 매력 렌더링 시작');
    
    if (!analysisResult || !analysisResult.subArchetype) {
        console.error('analysisResult 또는 subArchetype이 없습니다:', analysisResult);
        return;
    }
    
    const subType = analysisResult.subArchetype;
    console.log('부 아키타입:', subType);
    
    const nameEl = document.getElementById('sub-archetype-name');
    const descEl = document.getElementById('sub-archetype-desc');
    const percentageEl = document.getElementById('sub-percentage');

    const typeName = contentData[`type_${subType}_name`] || `타입 ${subType}`;
    const typeDesc = contentData[`type_${subType}_description`] || '설명을 불러올 수 없습니다.';
    const percentage = analysisResult.subPercentage || 0;

    console.log('잠재적 매력 데이터:', { typeName, typeDesc, percentage });

    if (nameEl) {
        nameEl.textContent = typeName;
        console.log('부 이름 설정:', typeName);
    }
    if (descEl) {
        descEl.textContent = typeDesc;
        console.log('부 설명 설정:', typeDesc);
    }
    if (percentageEl) {
        percentageEl.textContent = percentage;
        console.log('부 퍼센트 설정:', percentage);
    }
}

// 레이더 차트 렌더링
function renderRadarChart() {
    const ctx = document.getElementById('radarChart');
    if (!ctx) return;

    // 기존 차트 삭제
    if (radarChart) {
        radarChart.destroy();
    }

    // 차트 데이터
    const data = {
        labels: [
            contentData.type_A_name || '든든한 리더',
            contentData.type_B_name || '따뜻한 상담가', 
            contentData.type_C_name || '창의적인 아티스트',
            contentData.type_D_name || '긍정의 에너자이저',
            contentData.type_E_name || '치밀한 전략가',
            contentData.type_F_name || '자유로운 탐험가'
        ],
        datasets: [{
            label: '성향 점수',
            data: analysisResult.radarData,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
        }]
    };

    // 차트 옵션
    const options = {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
            r: {
                beginAtZero: true,
                max: Math.max(...analysisResult.radarData) + 1,
                ticks: {
                    stepSize: 1
                }
            }
        },
        plugins: {
            legend: {
                display: false
            }
        }
    };

    // 차트 생성
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: data,
        options: options
    });
}

// 키워드 클라우드 렌더링
function renderKeywordsCloud() {
    console.log('키워드 클라우드 렌더링 시작');
    
    const keywordsCloud = document.getElementById('keywords-cloud');
    if (!keywordsCloud) {
        console.error('keywords-cloud 엘리먼트를 찾을 수 없습니다.');
        return;
    }

    if (!analysisResult || !analysisResult.topKeywords) {
        console.error('topKeywords 데이터가 없습니다:', analysisResult);
        keywordsCloud.innerHTML = '<span class="keyword-tag">키워드를 분석할 수 없습니다.</span>';
        return;
    }

    console.log('상위 키워드:', analysisResult.topKeywords);

    let html = '';
    if (analysisResult.topKeywords.length === 0) {
        html = '<span class="keyword-tag">키워드가 없습니다.</span>';
    } else {
        analysisResult.topKeywords.forEach((item, index) => {
            const size = Math.max(1, 4 - index); // 크기 차등화
            html += `<span class="keyword-tag size-${size}">${item.keyword} (${item.count})</span>`;
        });
    }

    keywordsCloud.innerHTML = html;
    console.log('키워드 클라우드 HTML:', html);
}

// 종합 코멘트 렌더링
function renderFinalComment() {
    const commentEl = document.getElementById('final-comment-text');
    if (!commentEl) return;

    const mainType = analysisResult.mainArchetype;
    const subType = analysisResult.subArchetype;
    
    // 코멘트 키 생성 (comment_A_B 또는 comment_B_A)
    let commentKey = `comment_${mainType}_${subType}`;
    let commentText = contentData[commentKey];
    
    // 역순으로도 시도
    if (!commentText) {
        commentKey = `comment_${subType}_${mainType}`;
        commentText = contentData[commentKey];
    }

    // 기본 코멘트
    if (!commentText) {
        commentText = `당신은 ${contentData[`archetype_${mainType}_name`] || mainType}의 특성과 ${contentData[`archetype_${subType}_name`] || subType}의 매력을 동시에 가진 독특한 사람이군요!`;
    }

    commentEl.textContent = commentText;
}

// 통계 렌더링
function renderStatistics() {
    const totalResponsesEl = document.getElementById('total-responses');
    const analysisDateEl = document.getElementById('analysis-date');

    if (totalResponsesEl) {
        totalResponsesEl.textContent = analysisResult.totalResponses;
    }

    if (analysisDateEl) {
        const now = new Date();
        analysisDateEl.textContent = now.toLocaleDateString('ko-KR');
    }
}

// 결과 공유
function shareResult() {
    const shareData = {
        title: `${reportData.requester_name}님의 성격 분석 결과`,
        text: `친구들이 보는 나의 모습을 확인해보세요!`,
        url: window.location.href
    };

    if (navigator.share) {
        navigator.share(shareData).catch(console.error);
    } else {
        // 폴백: 링크 복사
        ResultUtils.copyToClipboard(window.location.href).then(success => {
            if (success) {
                alert('결과 링크가 클립보드에 복사되었습니다!');
            } else {
                alert('공유 기능을 사용할 수 없습니다.');
            }
        });
    }
}

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', initializeResultPage); 