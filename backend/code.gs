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
      throw new Error(`${CONTENTS_SHEET} 시트를 찾을 수 없습니다.`);
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // 질문 데이터 파싱
    const questions = [];
    const personalityTypes = {};
    
    rows.forEach(row => {
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = row[index];
      });
      
      if (rowData.type === 'question' && rowData.question) {
        questions.push({
          id: rowData.id,
          question: rowData.question,
          options: [
            rowData.option1,
            rowData.option2,
            rowData.option3,
            rowData.option4,
            rowData.option5,
            rowData.option6
          ].filter(option => option && option.toString().trim() !== '')
        });
      } else if (rowData.type === 'personality' && rowData.personality_type) {
        personalityTypes[rowData.personality_type] = {
          name: rowData.name,
          description: rowData.description,
          traits: [rowData.trait1, rowData.trait2, rowData.trait3].filter(trait => trait && trait.toString().trim() !== ''),
          color: rowData.color || '#007bff'
        };
      }
    });
    
    return {
      success: true,
      data: {
        questions: questions,
        personalityTypes: personalityTypes
      }
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