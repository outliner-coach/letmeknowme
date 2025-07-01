// 공통 설정
const CONFIG = {
    // Google Apps Script 웹 앱 URL - 실제 배포 후 업데이트 필요
    API_BASE_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    MIN_RESPONSES: 5
};

// API 통신 함수들
const API = {
    // 전체 콘텐츠 조회
    async getContent() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}?action=getContent`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('콘텐츠 로딩 실패:', error);
            throw error;
        }
    },

    // 전체 리포트 목록 조회
    async getReports() {
        try {
            const response = await fetch(CONFIG.API_BASE_URL);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('리포트 목록 로딩 실패:', error);
            throw error;
        }
    },

    // 특정 리포트 상세 데이터 조회
    async getReport(id) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}?id=${id}`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('리포트 데이터 로딩 실패:', error);
            throw error;
        }
    },

    // 신규 리포트 생성
    async createReport(name) {
        try {
            const response = await fetch(CONFIG.API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'create',
                    name: name
                })
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error('리포트 생성 실패:', error);
            throw error;
        }
    },

    // 설문 응답 제출
    async submitResponse(id, response) {
        try {
            const apiResponse = await fetch(CONFIG.API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'submit',
                    id: id,
                    response: response
                })
            });
            if (!apiResponse.ok) throw new Error('Network response was not ok');
            return await apiResponse.json();
        } catch (error) {
            console.error('응답 제출 실패:', error);
            throw error;
        }
    }
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

    // 클립보드에 복사
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (error) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    },

    // 로딩 표시
    showLoading(element, message = '로딩 중...') {
        element.innerHTML = `<div class="loading">${message}</div>`;
    },

    // 에러 메시지 표시
    showError(element, message = '오류가 발생했습니다.') {
        element.innerHTML = `<div class="error">${message}</div>`;
    },

    // UUID 생성 (클라이언트용)
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
};

// 메인 페이지 초기화 함수
function initializeMainPage() {
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
                const success = await Utils.copyToClipboard(targetElement.value);
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
        Utils.showLoading(reportList, '리포트 목록을 불러오는 중...');
        
        const reports = await API.getReports();
        
        if (reports.length === 0) {
            reportList.innerHTML = '<div class="no-reports">아직 생성된 리포트가 없습니다.</div>';
            return;
        }

        const reportsHtml = reports.map(report => `
            <div class="report-item">
                <a href="result.html?id=${report.id}">
                    <span class="report-name">${report.name}님의 리포트</span>
                    <span class="report-date">${Utils.formatDate(report.date)}</span>
                </a>
            </div>
        `).join('');

        reportList.innerHTML = reportsHtml;

    } catch (error) {
        Utils.showError(reportList, '리포트 목록을 불러올 수 없습니다.');
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