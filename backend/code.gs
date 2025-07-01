/**
 * Let Me Know Me - Google Apps Script Backend
 * 
 * Database Structure:
 * - feedbacks sheet: id, requester_name, responses, created_at
 * - contents sheet: key, value (for questions, choices, keywords, archetypes, comments)
 */

// Google Sheets 스프레드시트 ID
const SPREADSHEET_ID = '16qJ9rggrNGxZt-nC4lr5SOEuzVPIjmYmqQxG3wXFyME';
const FEEDBACKS_SHEET = 'feedbacks';
const CONTENTS_SHEET = 'contents';

/**
 * Main entry point for GET requests
 */
function doGet(e) {
  // JSONP 콜백 지원
  const callback = e.parameter.callback;
  const result = handleRequest(e);
  
  if (callback) {
    // JSONP 응답
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    // 일반 JSON 응답
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Main entry point for POST requests
 */
function doPost(e) {
  // POST 요청도 JSONP 콜백 지원
  const callback = e.parameter.callback;
  const result = handleRequest(e);
  
  if (callback) {
    // JSONP 응답
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(result) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    // 일반 JSON 응답
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle all requests
 */
function handleRequest(e) {
  try {
    const action = e.parameter.action;
    
    switch (action) {
      case 'getContent':
        return getContent();
      case 'createReport':
        return createReport(e.parameter.requesterName);
      case 'getReports':
        return getReports();
      case 'getReport':
        return getReport(e.parameter.id);
      case 'submitResponse':
        return submitResponse(e.parameter.reportId, e.parameter.responses);
      default:
        return {
          success: false,
          error: '지원하지 않는 액션입니다: ' + action
        };
    }
  } catch (error) {
    console.error('Request handling error:', error);
    return {
      success: false,
      error: '서버 오류가 발생했습니다: ' + error.message
    };
  }
}

/**
 * Get all content data (questions, choices, keywords, archetypes, comments)
 */
function getContent() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CONTENTS_SHEET);
    
    if (!sheet) {
      // contents 시트가 없으면 초기 데이터 생성
      initializeContentData();
      return getContent(); // 재귀 호출
    }
    
    const data = sheet.getDataRange().getValues();
    const content = {};
    
    // 키-값 쌍으로 데이터 변환
    data.forEach(row => {
      const [key, value] = row;
      if (key && value) {
        content[key] = value;
      }
    });
    
    return {
      success: true,
      data: content
    };
  } catch (error) {
    console.error('getContent error:', error);
    return {
      success: false,
      error: '콘텐츠 데이터를 가져올 수 없습니다: ' + error.message
    };
  }
}

/**
 * Initialize content data in the contents sheet
 */
function initializeContentData() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(CONTENTS_SHEET);
    
    if (!sheet) {
      sheet = spreadsheet.insertSheet(CONTENTS_SHEET);
    }
    
    // 기존 데이터 삭제
    sheet.clear();
    
    // 헤더 추가
    sheet.appendRow(['key', 'value']);
    
    // 질문 데이터
    const questions = [
      ['q1_text', '이 사람은 어떤 상황에서 가장 빛을 발하나요?'],
      ['q1_choice_A', '혼자서 깊이 생각할 때'],
      ['q1_choice_B', '사람들과 함께 있을 때'],
      ['q1_choice_C', '새로운 것을 시도할 때'],
      ['q1_choice_D', '계획을 세우고 실행할 때'],
      ['q1_choice_E', '문제를 해결할 때'],
      ['q1_choice_F', '자유롭게 행동할 때'],
      
      ['q2_text', '이 사람의 의사결정 스타일은?'],
      ['q2_choice_A', '신중하게 분석한 후 결정'],
      ['q2_choice_B', '다른 사람들과 상의 후 결정'],
      ['q2_choice_C', '직감을 따라 결정'],
      ['q2_choice_D', '논리적 근거를 바탕으로 결정'],
      ['q2_choice_E', '데이터와 정보를 분석 후 결정'],
      ['q2_choice_F', '상황에 따라 유연하게 결정'],
      
      ['q3_text', '이 사람이 스트레스를 받을 때 보이는 반응은?'],
      ['q3_choice_A', '혼자만의 시간을 갖고 싶어함'],
      ['q3_choice_B', '누군가와 대화하고 싶어함'],
      ['q3_choice_C', '새로운 활동으로 전환하려 함'],
      ['q3_choice_D', '체계적으로 문제를 해결하려 함'],
      ['q3_choice_E', '원인을 분석하고 대책을 세움'],
      ['q3_choice_F', '환경을 바꾸거나 여행을 떠나고 싶어함'],
      
      ['q4_text', '이 사람의 커뮤니케이션 스타일은?'],
      ['q4_choice_A', '말수가 적지만 핵심을 짚어냄'],
      ['q4_choice_B', '따뜻하고 공감적으로 소통'],
      ['q4_choice_C', '창의적이고 독창적인 표현'],
      ['q4_choice_D', '명확하고 논리적으로 설명'],
      ['q4_choice_E', '구체적인 데이터와 근거 제시'],
      ['q4_choice_F', '자유분방하고 솔직한 표현'],
      
      ['q5_text', '이 사람이 가장 중요하게 생각하는 가치는?'],
      ['q5_choice_A', '진실과 정직'],
      ['q5_choice_B', '인간관계와 화합'],
      ['q5_choice_C', '창의성과 독창성'],
      ['q5_choice_D', '성취와 성공'],
      ['q5_choice_E', '효율성과 완성도'],
      ['q5_choice_F', '자유와 모험'],
      
      ['q6_text', '이 사람의 업무 스타일은?'],
      ['q6_choice_A', '혼자 집중해서 깊이 파고듦'],
      ['q6_choice_B', '팀워크를 중시하며 협력함'],
      ['q6_choice_C', '새로운 아이디어를 제안함'],
      ['q6_choice_D', '목표 달성을 위해 체계적으로 접근'],
      ['q6_choice_E', '완벽한 결과를 위해 세심하게 준비'],
      ['q6_choice_F', '유연하게 상황에 맞춰 적응'],
      
      ['q7_text', '이 사람이 새로운 환경에 적응하는 방식은?'],
      ['q7_choice_A', '관찰하며 천천히 적응'],
      ['q7_choice_B', '사람들과 친해지며 적응'],
      ['q7_choice_C', '새로운 시도를 통해 적응'],
      ['q7_choice_D', '계획을 세워 단계별로 적응'],
      ['q7_choice_E', '정보를 수집하고 분석하며 적응'],
      ['q7_choice_F', '자연스럽게 흘러가며 적응'],
      
      ['q8_text', '이 사람의 리더십 스타일은?'],
      ['q8_choice_A', '모범을 보이며 이끄는 타입'],
      ['q8_choice_B', '팀원들을 돌보며 이끄는 타입'],
      ['q8_choice_C', '비전을 제시하며 이끄는 타입'],
      ['q8_choice_D', '목표를 설정하고 달성하도록 이끄는 타입'],
      ['q8_choice_E', '전략을 세우고 실행하도록 이끄는 타입'],
      ['q8_choice_F', '자율성을 주며 이끄는 타입'],
      
      ['q9_text', '이 사람이 가장 행복해하는 순간은?'],
      ['q9_choice_A', '깊이 있는 대화를 나눌 때'],
      ['q9_choice_B', '소중한 사람들과 함께 있을 때'],
      ['q9_choice_C', '새로운 것을 창조할 때'],
      ['q9_choice_D', '목표를 달성했을 때'],
      ['q9_choice_E', '완벽한 결과를 만들어냈을 때'],
      ['q9_choice_F', '자유롭게 여행하거나 모험할 때'],
      
      // Q10 키워드 선택 질문
      ['q10_text', '마지막으로, 이 사람을 가장 잘 표현하는 키워드 3개를 선택해주세요.'],
      
      // 키워드 목록 (JSON 형태)
      ['keyword_list', JSON.stringify([
        '리더십', '책임감', '추진력', '결단력', '안정감', '든든함',
        '공감능력', '배려심', '다정함', '따뜻함', '상담능력', '치유력',
        '창의력', '독창성', '심미안', '예술감각', '상상력', '영감',
        '긍정적', '유머감각', '사교성', '활발함', '에너지', '열정',
        '분석력', '논리적', '효율성', '체계적', '계획성', '전략적',
        '도전적', '자유로움', '호기심', '모험심', '개방성', '유연함'
      ])],
    ];
    
    // 성격 유형 데이터
    const personalityTypes = [
      ['type_A_name', '든든한 리더'],
      ['type_A_description', '신중하고 책임감이 강한 당신! 깊이 있는 사고와 진정성으로 주변 사람들에게 신뢰를 주는 든든한 존재입니다.'],
      ['type_A_trait1', '깊이 있는 사고력'],
      ['type_A_trait2', '강한 책임감'],
      ['type_A_trait3', '진정성 있는 소통'],
      ['type_A_color', '#2E7D32'],
      
      ['type_B_name', '따뜻한 상담가'],
      ['type_B_description', '따뜻하고 공감능력이 뛰어난 당신! 사람들의 마음을 이해하고 위로해주는 따뜻한 상담가 같은 존재입니다.'],
      ['type_B_trait1', '뛰어난 공감능력'],
      ['type_B_trait2', '따뜻한 배려심'],
      ['type_B_trait3', '화합을 추구하는 성향'],
      ['type_B_color', '#FF6B6B'],
      
      ['type_C_name', '창의적인 아티스트'],
      ['type_C_description', '창의적이고 독창적인 당신! 새로운 아이디어와 독특한 시각으로 세상을 바라보는 예술가 같은 존재입니다.'],
      ['type_C_trait1', '뛰어난 창의성'],
      ['type_C_trait2', '독창적인 사고'],
      ['type_C_trait3', '예술적 감각'],
      ['type_C_color', '#9C27B0'],
      
      ['type_D_name', '긍정의 에너자이저'],
      ['type_D_description', '에너지가 넘치고 목표지향적인 당신! 긍정적인 에너지로 주변을 활기차게 만드는 에너자이저 같은 존재입니다.'],
      ['type_D_trait1', '강한 추진력'],
      ['type_D_trait2', '목표 지향적'],
      ['type_D_trait3', '긍정적 에너지'],
      ['type_D_color', '#FF9800'],
      
      ['type_E_name', '치밀한 전략가'],
      ['type_E_description', '분석적이고 체계적인 당신! 데이터와 논리를 바탕으로 완벽한 전략을 세우는 뛰어난 전략가입니다.'],
      ['type_E_trait1', '뛰어난 분석력'],
      ['type_E_trait2', '체계적인 사고'],
      ['type_E_trait3', '완벽주의 성향'],
      ['type_E_color', '#3F51B5'],
      
      ['type_F_name', '자유로운 탐험가'],
      ['type_F_description', '자유롭고 모험을 좋아하는 당신! 새로운 경험과 변화를 즐기는 자유로운 탐험가 같은 존재입니다.'],
      ['type_F_trait1', '자유로운 영혼'],
      ['type_F_trait2', '모험을 즐기는 성향'],
      ['type_F_trait3', '뛰어난 적응력'],
      ['type_F_color', '#00BCD4'],
    ];
    
    // 키워드 데이터
    const keywords = [
      ['keyword_A1', '신중한'], ['keyword_A2', '책임감 있는'], ['keyword_A3', '진실한'],
      ['keyword_A4', '깊이 있는'], ['keyword_A5', '신뢰할 수 있는'], ['keyword_A6', '든든한'],
      ['keyword_A7', '성실한'], ['keyword_A8', '일관성 있는'], ['keyword_A9', '원칙적인'],
      ['keyword_A10', '차분한'], ['keyword_A11', '사려깊은'], ['keyword_A12', '안정적인'],
      
      ['keyword_B1', '따뜻한'], ['keyword_B2', '공감하는'], ['keyword_B3', '배려심 깊은'],
      ['keyword_B4', '친근한'], ['keyword_B5', '이해심 많은'], ['keyword_B6', '포용력 있는'],
      ['keyword_B7', '다정한'], ['keyword_B8', '협력적인'], ['keyword_B9', '화합을 추구하는'],
      ['keyword_B10', '상냥한'], ['keyword_B11', '마음이 넓은'], ['keyword_B12', '인정 많은'],
      
      ['keyword_C1', '창의적인'], ['keyword_C2', '독창적인'], ['keyword_C3', '예술적인'],
      ['keyword_C4', '상상력 풍부한'], ['keyword_C5', '혁신적인'], ['keyword_C6', '감성적인'],
      ['keyword_C7', '독특한'], ['keyword_C8', '영감을 주는'], ['keyword_C9', '직관적인'],
      ['keyword_C10', '표현력 풍부한'], ['keyword_C11', '개성 있는'], ['keyword_C12', '자유로운 사고'],
      
      ['keyword_D1', '에너지 넘치는'], ['keyword_D2', '목표지향적인'], ['keyword_D3', '추진력 있는'],
      ['keyword_D4', '긍정적인'], ['keyword_D5', '열정적인'], ['keyword_D6', '도전적인'],
      ['keyword_D7', '활동적인'], ['keyword_D8', '성취욕 강한'], ['keyword_D9', '리더십 있는'],
      ['keyword_D10', '자신감 있는'], ['keyword_D11', '결단력 있는'], ['keyword_D12', '역동적인'],
      
      ['keyword_E1', '분석적인'], ['keyword_E2', '체계적인'], ['keyword_E3', '논리적인'],
      ['keyword_E4', '치밀한'], ['keyword_E5', '완벽주의적인'], ['keyword_E6', '전략적인'],
      ['keyword_E7', '계획적인'], ['keyword_E8', '정확한'], ['keyword_E9', '효율적인'],
      ['keyword_E10', '객관적인'], ['keyword_E11', '신중한'], ['keyword_E12', '체계적인'],
      
      ['keyword_F1', '자유로운'], ['keyword_F2', '모험적인'], ['keyword_F3', '유연한'],
      ['keyword_F4', '적응력 있는'], ['keyword_F5', '개방적인'], ['keyword_F6', '호기심 많은'],
      ['keyword_F7', '변화를 즐기는'], ['keyword_F8', '자연스러운'], ['keyword_F9', '솔직한'],
      ['keyword_F10', '즉흥적인'], ['keyword_F11', '여행을 좋아하는'], ['keyword_F12', '경험을 중시하는'],
    ];
    
    // 모든 데이터를 시트에 추가
    questions.forEach(row => sheet.appendRow(row));
    personalityTypes.forEach(row => sheet.appendRow(row));
    keywords.forEach(row => sheet.appendRow(row));
    
    console.log('콘텐츠 데이터가 성공적으로 초기화되었습니다.');
    
  } catch (error) {
    console.error('initializeContentData 오류:', error);
    throw error;
  }
}

/**
 * Get recent reports list
 */
function getReports() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FEEDBACKS_SHEET);
    
    if (!sheet) {
      throw new Error(`${FEEDBACKS_SHEET} 시트를 찾을 수 없습니다.`);
    }
    
    const data = sheet.getDataRange().getValues();
    const reports = [];
    const reportStats = {};
    
    // 데이터 파싱
    data.slice(1).forEach(row => {
      const [reportId, type, requesterName, , , , , , , , , , , createdAt] = row;
      
      if (type === 'META') {
        reports.push({
          id: reportId,
          requesterName: requesterName,
          createdAt: createdAt,
          responseCount: 0
        });
        reportStats[reportId] = 0;
      } else if (type === 'RESPONSE') {
        if (reportStats[reportId] !== undefined) {
          reportStats[reportId]++;
        }
      }
    });
    
    // 응답 수 업데이트
    reports.forEach(report => {
      report.responseCount = reportStats[report.id] || 0;
    });
    
    // 최신순 정렬 후 최대 10개만 반환
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return {
      success: true,
      data: reports.slice(0, 10)
    };
  } catch (error) {
    console.error('getReports error:', error);
    return {
      success: false,
      error: '리포트 목록을 가져올 수 없습니다: ' + error.message
    };
  }
}

/**
 * Get specific report data
 */
function getReport(reportId) {
  try {
    if (!reportId) {
      throw new Error('리포트 ID가 필요합니다.');
    }
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FEEDBACKS_SHEET);
    
    if (!sheet) {
      throw new Error(`${FEEDBACKS_SHEET} 시트를 찾을 수 없습니다.`);
    }
    
    const data = sheet.getDataRange().getValues();
    let reportInfo = null;
    const responses = [];
    
    // 데이터 파싱
    data.slice(1).forEach(row => {
      const [id, type, requesterName, respondentName, respondentRelation, 
             q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, comment, submittedAt, createdAt] = row;
      
      if (id === reportId) {
        if (type === 'META') {
          reportInfo = {
            id: id,
            requesterName: requesterName,
            createdAt: createdAt
          };
        } else if (type === 'RESPONSE') {
          responses.push({
            respondentName: respondentName,
            respondentRelation: respondentRelation,
            responses: [q1, q2, q3, q4, q5, q6, q7, q8, q9, q10],
            additionalComment: comment,
            submittedAt: submittedAt
          });
        }
      }
    });
    
    if (!reportInfo) {
      throw new Error('리포트를 찾을 수 없습니다.');
    }
    
    // 성격 분석 수행
    const analysis = analyzePersonality(responses);
    
    return {
      success: true,
      data: {
        ...reportInfo,
        responseCount: responses.length,
        responses: responses,
        analysis: analysis
      }
    };
  } catch (error) {
    console.error('getReport error:', error);
    return {
      success: false,
      error: '리포트를 조회할 수 없습니다: ' + error.message
    };
  }
}

/**
 * Create new report
 */
function createReport(requesterName) {
  try {
    if (!requesterName || requesterName.trim() === '') {
      throw new Error('요청자 이름이 필요합니다.');
    }
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FEEDBACKS_SHEET);
    
    if (!sheet) {
      throw new Error(`${FEEDBACKS_SHEET} 시트를 찾을 수 없습니다.`);
    }
    
    // 새 리포트 ID 생성 (타임스탬프 기반)
    const reportId = 'rpt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();
    
    // 리포트 메타데이터 행 추가
    sheet.appendRow([
      reportId,
      'META',
      requesterName.trim(),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      createdAt,
      0 // 초기 응답 수
    ]);
    
    return {
      success: true,
      data: {
        id: reportId,
        requesterName: requesterName.trim(),
        createdAt: createdAt,
        responseCount: 0
      }
    };
  } catch (error) {
    console.error('createReport error:', error);
    return {
      success: false,
      error: '리포트를 생성할 수 없습니다: ' + error.message
    };
  }
}

/**
 * Submit survey response
 */
function submitResponse(reportId, responsesJson) {
  try {
    if (!reportId) {
      throw new Error('리포트 ID가 필요합니다.');
    }
    
    if (!responsesJson) {
      throw new Error('응답 데이터가 필요합니다.');
    }
    
    let responseData;
    try {
      responseData = JSON.parse(responsesJson);
    } catch (e) {
      throw new Error('응답 데이터 형식이 올바르지 않습니다.');
    }
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FEEDBACKS_SHEET);
    
    if (!sheet) {
      throw new Error(`${FEEDBACKS_SHEET} 시트를 찾을 수 없습니다.`);
    }
    
    // 리포트 존재 확인
    const data = sheet.getDataRange().getValues();
    const reportExists = data.slice(1).some(row => row[0] === reportId && row[1] === 'META');
    
    if (!reportExists) {
      throw new Error('존재하지 않는 리포트입니다.');
    }
    
    // 응답 데이터 추가
    const submittedAt = new Date().toISOString();
    const responses = responseData.responses || [];
    
    sheet.appendRow([
      reportId,
      'RESPONSE',
      '', // requesterName (META에서만 사용)
      responseData.respondentName || '익명',
      responseData.respondentRelation || '지인',
      responses[0] || '',
      responses[1] || '',
      responses[2] || '',
      responses[3] || '',
      responses[4] || '',
      responses[5] || '',
      responses[6] || '',
      responses[7] || '',
      responses[8] || '',
      responses[9] || '',
      responseData.additionalComment || '',
      submittedAt
    ]);
    
    return {
      success: true,
      data: {
        message: '응답이 성공적으로 제출되었습니다.',
        submittedAt: submittedAt
      }
    };
  } catch (error) {
    console.error('submitResponse error:', error);
    return {
      success: false,
      error: '응답을 제출할 수 없습니다: ' + error.message
    };
  }
}

/**
 * 성격 분석 함수
 */
function analyzePersonality(responses) {
  if (!responses || responses.length === 0) {
    return {
      primaryType: null,
      scores: {},
      summary: '아직 충분한 응답이 없습니다.'
    };
  }
  
  // 성격 유형별 점수 계산
  const typeScores = {
    'A': 0, // 든든한 리더
    'B': 0, // 따뜻한 상담가
    'C': 0, // 창의적인 아티스트
    'D': 0, // 긍정의 에너자이저
    'E': 0, // 치밀한 전략가
    'F': 0  // 자유로운 탐험가
  };
  
  // 질문별 성격 유형 매핑 (예시)
  const questionTypeMapping = [
    ['A', 'B'], // Q1: 리더십 vs 공감
    ['C', 'D'], // Q2: 창의성 vs 긍정성
    ['E', 'F'], // Q3: 계획성 vs 자유로움
    ['A', 'E'], // Q4: 리더십 vs 전략성
    ['B', 'C'], // Q5: 상담 vs 창의성
    ['D', 'F'], // Q6: 에너지 vs 탐험
    ['A', 'B'], // Q7: 리더십 vs 공감
    ['C', 'E'], // Q8: 창의성 vs 전략성
    ['D', 'B'], // Q9: 긍정성 vs 상담
    ['F', 'A']  // Q10: 탐험 vs 리더십
  ];
  
  // 각 응답에서 점수 계산
  responses.forEach(response => {
    const answers = response.responses;
    answers.forEach((answer, qIndex) => {
      if (qIndex < questionTypeMapping.length && answer >= 1 && answer <= 6) {
        const types = questionTypeMapping[qIndex];
        if (answer <= 3) {
          // 1-3: 첫 번째 성격 유형에 점수
          typeScores[types[0]] += (4 - answer);
        } else {
          // 4-6: 두 번째 성격 유형에 점수
          typeScores[types[1]] += (answer - 3);
        }
      }
    });
  });
  
  // 최고 점수 유형 찾기
  const maxScore = Math.max(...Object.values(typeScores));
  const primaryType = Object.keys(typeScores).find(type => typeScores[type] === maxScore);
  
  // 백분율로 변환
  const totalScore = Object.values(typeScores).reduce((sum, score) => sum + score, 0);
  const percentageScores = {};
  Object.keys(typeScores).forEach(type => {
    percentageScores[type] = totalScore > 0 ? Math.round((typeScores[type] / totalScore) * 100) : 0;
  });
  
  return {
    primaryType: primaryType,
    scores: percentageScores,
    rawScores: typeScores,
    totalResponses: responses.length,
    summary: `${responses.length}명의 응답을 바탕으로 분석한 결과입니다.`
  };
} 