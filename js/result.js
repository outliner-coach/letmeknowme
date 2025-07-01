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
    MIN_RESPONSES: 5,
    UPDATE_INTERVAL: 30000 // 30초마다 업데이트
};

// 유틸리티 함수들
const Utils = {
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

// API 함수들
const API = {
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
        reportId = Utils.getUrlParameter('id');
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
            API.getContent(),
            API.getReport(reportId)
        ]);

        console.log('로딩된 데이터:', { contentData, reportData });
    } catch (error) {
        console.error('데이터 로딩 실패:', error);
        throw error;
    }
}

// 대기 화면 초기화
function initializeWaitingView() {
    // 제목 설정
    const waitingTitle = document.getElementById('waiting-title');
    if (waitingTitle && reportData.requester_name) {
        waitingTitle.textContent = `${reportData.requester_name}님의 리포트`;
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
            const success = await Utils.copyToClipboard(shareLink.value);
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
            const newReportData = await API.getReport(reportId);
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
        // 최신 데이터 로딩
        reportData = await API.getReport(reportId);
        
        // 분석 실행
        analysisResult = analyzeResponses(reportData.responses);
        
        // 화면 전환
        document.getElementById('waiting-view').style.display = 'none';
        document.getElementById('report-view').style.display = 'block';

        // 리포트 렌더링
        renderReport();

    } catch (error) {
        console.error('결과 화면 표시 실패:', error);
        alert('결과를 불러오는 중 오류가 발생했습니다.');
    }
}

// 응답 분석 로직 (PRD 7번 명세)
function analyzeResponses(responses) {
    // 초기화
    const scores = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    const keywordCounts = {};

    // 데이터 순회 및 계산
    responses.forEach(response => {
        // Q1-Q9 점수 계산
        for (let i = 1; i <= 9; i++) {
            const answer = response[`q${i}`];
            if (answer && scores.hasOwnProperty(answer)) {
                scores[answer]++;
            }
        }

        // Q10 키워드 계산
        if (response.q10 && Array.isArray(response.q10)) {
            response.q10.forEach(keyword => {
                keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
            });
        }
    });

    // 아키타입 결정 (점수 기준 내림차순 정렬)
    const sortedScores = Object.entries(scores)
        .sort(([,a], [,b]) => b - a)
        .map(([key, value]) => ({ type: key, score: value }));

    const mainArchetype = sortedScores[0];
    const subArchetype = sortedScores[1];

    // 총 응답 수
    const totalResponses = responses.length;

    // 퍼센트 계산
    const mainPercentage = totalResponses > 0 ? Math.round((mainArchetype.score / totalResponses) * 100) : 0;
    const subPercentage = totalResponses > 0 ? Math.round((subArchetype.score / totalResponses) * 100) : 0;

    // 키워드 상위 5개 추출
    const topKeywords = Object.entries(keywordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([keyword, count]) => ({ keyword, count }));

    return {
        scores,
        mainArchetype: mainArchetype.type,
        subArchetype: subArchetype.type,
        mainPercentage,
        subPercentage,
        topKeywords,
        totalResponses,
        radarData: [scores.A, scores.B, scores.C, scores.D, scores.E, scores.F]
    };
}

// 리포트 렌더링
function renderReport() {
    // 제목 설정
    const reportTitle = document.getElementById('report-title');
    if (reportTitle && reportData.requester_name) {
        reportTitle.textContent = `${reportData.requester_name}님의 피드백 리포트`;
    }

    // 대표 이미지 렌더링
    renderMainArchetype();

    // 잠재적 매력 렌더링
    renderSubArchetype();

    // 레이더 차트 렌더링
    renderRadarChart();

    // 키워드 클라우드 렌더링
    renderKeywordsCloud();

    // 종합 코멘트 렌더링
    renderFinalComment();

    // 통계 렌더링
    renderStatistics();
}

// 대표 이미지 렌더링
function renderMainArchetype() {
    const mainType = analysisResult.mainArchetype;
    
    const nameEl = document.getElementById('main-archetype-name');
    const descEl = document.getElementById('main-archetype-desc');
    const percentageEl = document.getElementById('main-percentage');

    if (nameEl) nameEl.textContent = contentData[`archetype_${mainType}_name`] || '분석 중...';
    if (descEl) descEl.textContent = contentData[`archetype_${mainType}_desc`] || '분석 중...';
    if (percentageEl) percentageEl.textContent = analysisResult.mainPercentage;
}

// 잠재적 매력 렌더링
function renderSubArchetype() {
    const subType = analysisResult.subArchetype;
    
    const nameEl = document.getElementById('sub-archetype-name');
    const descEl = document.getElementById('sub-archetype-desc');
    const percentageEl = document.getElementById('sub-percentage');

    if (nameEl) nameEl.textContent = contentData[`archetype_${subType}_name`] || '분석 중...';
    if (descEl) descEl.textContent = contentData[`archetype_${subType}_desc`] || '분석 중...';
    if (percentageEl) percentageEl.textContent = analysisResult.subPercentage;
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
            contentData.archetype_A_name || '든든한 리더',
            contentData.archetype_B_name || '따뜻한 상담가', 
            contentData.archetype_C_name || '창의적인 아티스트',
            contentData.archetype_D_name || '긍정의 에너자이저',
            contentData.archetype_E_name || '치밀한 전략가',
            contentData.archetype_F_name || '자유로운 탐험가'
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
    const keywordsCloud = document.getElementById('keywords-cloud');
    if (!keywordsCloud) return;

    let html = '';
    analysisResult.topKeywords.forEach((item, index) => {
        const size = Math.max(1, 4 - index); // 크기 차등화
        html += `<span class="keyword-tag size-${size}">${item.keyword} (${item.count})</span>`;
    });

    keywordsCloud.innerHTML = html;
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
        Utils.copyToClipboard(window.location.href).then(success => {
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