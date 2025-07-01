// 공통 설정
const CONFIG = {
    // Google Apps Script 웹 앱 URL - 실제 배포 후 업데이트 필요
    API_BASE_URL: 'https://script.google.com/macros/s/AKfycbyehRt7cQkdt5o_SPDJbP0zX3lOJY7fjSf2tPnSU9L_N1_wxKwnUSmdJuoJOJoUCviH/exec',
    MIN_RESPONSES: 5
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
    // 리포트 목록 조회
    async getReports() {
        try {
            const result = await jsonp(CONFIG.API_BASE_URL, {
                action: 'getReports'
            });
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || '리포트 목록을 가져올 수 없습니다.');
            }
        } catch (error) {
            console.error('getReports error:', error);
            throw error;
        }
    },

    // 새 리포트 생성
    async createReport(requesterName) {
        try {
            const result = await jsonp(CONFIG.API_BASE_URL, {
                action: 'createReport',
                requesterName: requesterName
            });
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.error || '리포트를 생성할 수 없습니다.');
            }
        } catch (error) {
            console.error('createReport error:', error);
            throw error;
        }
    },

    // 리포트 상세 조회
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

// 메인 페이지 전용 유틸리티 함수들
const MainUtils = {
    // 클립보드 복사 함수
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
    },
    
    // 날짜 포맷팅
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return '방금 전';
        if (minutes < 60) return `${minutes}분 전`;
        if (hours < 24) return `${hours}시간 전`;
        if (days < 7) return `${days}일 전`;
        
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    // 로딩 상태 표시
    showLoading(element, message = '로딩 중...') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.innerHTML = `
                <div class="loading-message">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    },
    
    // 에러 표시
    showError(element, message) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.innerHTML = `
                <div class="error-message">
                    <i class="error-icon">⚠️</i>
                    <p>${message}</p>
                </div>
            `;
        }
    }
};

// URL 파라미터 유틸리티
const URLUtils = {
    getParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },
    
    setParam(name, value) {
        const url = new URL(window.location);
        url.searchParams.set(name, value);
        window.history.pushState({}, '', url);
    },
    
    removeParam(name) {
        const url = new URL(window.location);
        url.searchParams.delete(name);
        window.history.pushState({}, '', url);
    }
};

// 로딩 상태 관리
const LoadingManager = {
    show(element, message = '로딩 중...') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    },
    
    hide(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        if (element) {
            element.innerHTML = '';
        }
    }
};

// 에러 처리 유틸리티
const ErrorHandler = {
    show(message, container = 'error-container') {
        const errorDiv = document.getElementById(container);
        if (errorDiv) {
            errorDiv.innerHTML = `
                <div class="error-message">
                    <i class="error-icon">⚠️</i>
                    <p>${message}</p>
                    <button onclick="this.parentElement.parentElement.style.display='none'">닫기</button>
                </div>
            `;
            errorDiv.style.display = 'block';
        } else {
            alert(message);
        }
    },
    
    hide(container = 'error-container') {
        const errorDiv = document.getElementById(container);
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }
};

// 메인 페이지 초기화 함수
async function initializeMainPage() {
    const createBtn = document.getElementById('create-btn');
    const nameInput = document.getElementById('name-input');
    const linkDisplayArea = document.getElementById('link-display-area');
    const createSection = document.getElementById('create-section');
    const createAnotherBtn = document.getElementById('create-another-btn');

    // 링크 생성 버튼 클릭 이벤트
    if (createBtn) {
        createBtn.addEventListener('click', async function() {
            const name = nameInput.value.trim();
            
            if (!name) {
                alert('이름(닉네임)을 입력해주세요.');
                nameInput.focus();
                return;
            }

            try {
                createBtn.disabled = true;
                createBtn.textContent = '생성 중...';

                const result = await API.createReport(name);
                
                // 링크 생성
                const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
                const feedbackLink = `${baseUrl}feedback.html?id=${result.id}`;
                const resultLink = `${baseUrl}result.html?id=${result.id}`;

                // 링크 표시
                document.getElementById('feedback-link').value = feedbackLink;
                document.getElementById('result-link').value = resultLink;

                // UI 전환
                createSection.style.display = 'none';
                linkDisplayArea.style.display = 'block';

                // 리포트 목록 새로고침
                loadRecentReports();

            } catch (error) {
                alert('링크 생성에 실패했습니다. 다시 시도해주세요.');
                console.error(error);
            } finally {
                createBtn.disabled = false;
                createBtn.textContent = '내 리포트 링크 만들기';
            }
        });
    }

    // 다시 만들기 버튼
    if (createAnotherBtn) {
        createAnotherBtn.addEventListener('click', function() {
            createSection.style.display = 'block';
            linkDisplayArea.style.display = 'none';
            nameInput.value = '';
            nameInput.focus();
        });
    }

    // 복사 버튼들
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const targetId = this.getAttribute('data-target');
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const success = await MainUtils.copyToClipboard(targetElement.value);
                if (success) {
                    const originalText = this.textContent;
                    this.textContent = '복사됨!';
                    this.classList.add('copy-success');
                    
                    setTimeout(() => {
                        this.textContent = originalText;
                        this.classList.remove('copy-success');
                    }, 2000);
                } else {
                    alert('복사에 실패했습니다.');
                }
            }
        });
    });

    // Enter 키로 링크 생성
    if (nameInput) {
        nameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                createBtn.click();
            }
        });
    }
}

// 최근 리포트 목록 로딩
async function loadRecentReports() {
    const reportList = document.getElementById('report-list');
    if (!reportList) return;

    try {
        MainUtils.showLoading(reportList, '리포트 목록을 불러오는 중...');
        
        const reports = await API.getReports();
        
        if (reports.length === 0) {
            reportList.innerHTML = '<div class="no-reports">아직 생성된 리포트가 없습니다.</div>';
            return;
        }

        const reportsHtml = reports.map(report => `
            <div class="report-item">
                <a href="result.html?id=${report.id}">
                    <span class="report-name">${report.requesterName}님의 리포트</span>
                    <span class="report-info">${report.responseCount}개 응답</span>
                    <span class="report-date">${MainUtils.formatDate(report.createdAt)}</span>
                </a>
            </div>
        `).join('');

        reportList.innerHTML = reportsHtml;

    } catch (error) {
        MainUtils.showError(reportList, '리포트 목록을 불러올 수 없습니다.');
        console.error('리포트 목록 로딩 실패:', error);
    }
}

// 전역 변수로 콘텐츠 데이터 저장
let globalContent = null;

// 콘텐츠 데이터 로딩 및 캐싱
async function loadContent() {
    if (globalContent) {
        return globalContent;
    }
    
    try {
        globalContent = await API.getContent();
        return globalContent;
    } catch (error) {
        console.error('콘텐츠 로딩 실패:', error);
        throw error;
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeMainPage();
    loadRecentReports();
});
