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
    console.log('getContent 함수 호출됨');
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CONTENTS_SHEET);
    
    if (!sheet) {
      console.log('콘텐츠 시트가 없음, 초기화 시도');
      initializeContentData();
      // 초기화 후 다시 시트 가져오기
      sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CONTENTS_SHEET);
      if (!sheet) {
        throw new Error(`${CONTENTS_SHEET} 시트를 생성할 수 없습니다.`);
      }
    }
    
    // 시트 데이터 읽기
    const data = sheet.getDataRange().getValues();
    const contentData = {};
    
    console.log(`콘텐츠 데이터 행 수: ${data.length}`);
    
    // 데이터를 키-값 쌍으로 변환
    data.forEach(row => {
      if (row.length >= 2 && row[0] && row[1]) {
        const key = row[0];
        let value = row[1];
        
        // JSON 문자열인 경우 파싱
        if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
          try {
            value = JSON.parse(value);
          } catch (e) {
            // JSON 파싱 실패 시 문자열 그대로 사용
          }
        }
        
        contentData[key] = value;
      }
    });
    
    console.log(`변환된 콘텐츠 데이터 키 수: ${Object.keys(contentData).length}`);
    console.log('주요 키들:', Object.keys(contentData).slice(0, 10));
    
    // 필수 데이터 확인 및 기본값 설정
    const requiredTypes = ['A', 'B', 'C', 'D', 'E', 'F'];
    requiredTypes.forEach(type => {
      if (!contentData[`type_${type}_name`]) {
        contentData[`type_${type}_name`] = getDefaultTypeName(type);
      }
      if (!contentData[`type_${type}_description`]) {
        contentData[`type_${type}_description`] = getDefaultTypeDescription(type);
      }
    });
    
    return {
      success: true,
      data: contentData
    };
    
  } catch (error) {
    console.error('getContent error:', error);
    
    // 에러 발생 시 기본 데이터 반환
    const defaultData = getDefaultContentData();
    
    return {
      success: true,
      data: defaultData,
      warning: '기본 데이터를 사용합니다: ' + error.message
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
    
    if (sheet) {
      console.log('기존 콘텐츠 시트를 삭제하고 새로 생성합니다.');
      spreadsheet.deleteSheet(sheet);
    }
    
    sheet = spreadsheet.insertSheet(CONTENTS_SHEET);
    
    // 질문 데이터
    const questions = [
      ['q1', '어려운 상황에서 이 사람의 반응은?'],
      ['q2', '이 사람과 함께할 때 가장 즐거운 순간은?'],
      ['q3', '이 사람의 가장 큰 매력은?'],
      ['q4', '이 사람이 가장 중요하게 여기는 것은?'],
      ['q5', '이 사람의 의사결정 방식은?'],
      ['q6', '이 사람과의 관계에서 느끼는 점은?'],
      ['q7', '이 사람이 스트레스를 받을 때는?'],
      ['q8', '이 사람의 소통 스타일은?'],
      ['q9', '이 사람을 한 단어로 표현한다면?']
    ];
    
    // 성격 유형 정보 (프론트엔드에서 사용하는 키 형식)
    const personalityTypes = [
      ['type_A_name', '든든한 리더'],
      ['type_A_description', '책임감이 강하고 신뢰할 수 있는 리더십을 가진 사람입니다. 어려운 상황에서도 침착함을 유지하며 주변 사람들에게 안정감을 줍니다.'],
      ['type_B_name', '따뜻한 상담가'],
      ['type_B_description', '공감 능력이 뛰어나고 다른 사람의 마음을 이해하는 데 특별한 재능이 있습니다. 따뜻한 관심과 배려로 주변을 감싸줍니다.'],
      ['type_C_name', '창의적인 아티스트'],
      ['type_C_description', '독창적인 아이디어와 예술적 감각이 뛰어난 창조적인 사람입니다. 새로운 관점으로 세상을 바라보며 영감을 전달합니다.'],
      ['type_D_name', '긍정의 에너자이저'],
      ['type_D_description', '항상 밝고 긍정적인 에너지로 주변을 활기차게 만드는 사람입니다. 어떤 상황에서도 희망과 웃음을 잃지 않습니다.'],
      ['type_E_name', '치밀한 전략가'],
      ['type_E_description', '논리적이고 체계적인 사고로 문제를 해결하는 데 뛰어난 능력을 가진 사람입니다. 계획성 있고 신중한 접근을 중시합니다.'],
      ['type_F_name', '자유로운 탐험가'],
      ['type_F_description', '새로운 경험과 모험을 추구하며 자유로운 영혼을 가진 사람입니다. 변화를 두려워하지 않고 유연하게 적응합니다.'],
      
      // 아키타입별 기본 코멘트
      ['comment_A_B', '든든한 리더십과 따뜻한 배려심을 동시에 가진 완벽한 리더형입니다.'],
      ['comment_A_C', '안정적인 리더십에 창의적 감각까지 갖춘 독특한 매력의 소유자입니다.'],
      ['comment_A_D', '책임감 있는 리더십과 긍정적 에너지로 팀을 이끄는 천부적 리더입니다.'],
      ['comment_A_E', '리더십과 전략적 사고를 겸비한 완벽한 조직의 중심인물입니다.'],
      ['comment_A_F', '안정적인 리더십과 자유로운 사고의 조화가 돋보이는 유니크한 리더입니다.'],
      ['comment_B_C', '따뜻한 감성과 창의적 영감을 주는 예술가적 기질의 상담가입니다.'],
      ['comment_B_D', '따뜻한 배려와 긍정적 에너지로 주변을 치유하는 힐러형입니다.'],
      ['comment_B_E', '배려심과 논리적 사고를 겸비한 완벽한 조언자입니다.'],
      ['comment_B_F', '따뜻함과 자유로움이 조화된 독특한 매력의 소유자입니다.'],
      ['comment_C_D', '창의적 영감과 긍정적 에너지로 주변을 밝게 만드는 아티스트입니다.'],
      ['comment_C_E', '창의성과 논리성을 겸비한 완벽한 혁신가입니다.'],
      ['comment_C_F', '창의적이고 자유로운 영혼으로 끊임없이 새로운 가능성을 탐구합니다.'],
      ['comment_D_E', '긍정적 에너지와 전략적 사고로 목표를 달성하는 실행력의 달인입니다.'],
      ['comment_D_F', '긍정적이고 자유로운 에너지로 모험을 즐기는 탐험가입니다.'],
      ['comment_E_F', '논리적 사고와 자유로운 적응력을 겸비한 완벽한 전략가입니다.']
    ];
    
    // 키워드 데이터 (18개 키워드)
    const keywords = [
      ['keyword_A1', '신중한'], ['keyword_A2', '책임감 있는'], ['keyword_A3', '든든한'],
      ['keyword_A4', '리더십 있는'], ['keyword_A5', '신뢰할 수 있는'], ['keyword_A6', '진지한'],
      ['keyword_B1', '따뜻한'], ['keyword_B2', '공감하는'], ['keyword_B3', '배려심 깊은'],
      ['keyword_B4', '듣기 좋아하는'], ['keyword_B5', '이해심 많은'], ['keyword_B6', '친절한'],
      ['keyword_C1', '창의적인'], ['keyword_C2', '독특한'], ['keyword_C3', '예술적인'],
      ['keyword_C4', '상상력 풍부한'], ['keyword_C5', '영감을 주는'], ['keyword_C6', '개성 있는'],
      ['keyword_D1', '밝은'], ['keyword_D2', '에너지 넘치는'], ['keyword_D3', '긍정적인'],
      ['keyword_D4', '유머러스한'], ['keyword_D5', '활발한'], ['keyword_D6', '재미있는'],
      ['keyword_E1', '논리적인'], ['keyword_E2', '체계적인'], ['keyword_E3', '계획성 있는'],
      ['keyword_E4', '분석적인'], ['keyword_E5', '신중한'], ['keyword_E6', '완벽주의적인'],
      ['keyword_F1', '자유로운'], ['keyword_F2', '모험적인'], ['keyword_F3', '유연한'],
      ['keyword_F4', '적응력 있는'], ['keyword_F5', '개방적인'], ['keyword_F6', '호기심 많은']
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

/**
 * Get default type name
 */
function getDefaultTypeName(type) {
  const names = {
    'A': '든든한 리더',
    'B': '따뜻한 상담가',
    'C': '창의적인 아티스트',
    'D': '긍정의 에너자이저',
    'E': '치밀한 전략가',
    'F': '자유로운 탐험가'
  };
  return names[type] || `타입 ${type}`;
}

/**
 * Get default type description
 */
function getDefaultTypeDescription(type) {
  const descriptions = {
    'A': '신중하고 책임감이 강한 당신! 깊이 있는 사고와 진정성으로 주변 사람들에게 신뢰를 주는 든든한 존재입니다.',
    'B': '따뜻하고 공감능력이 뛰어난 당신! 사람들의 마음을 이해하고 위로해주는 따뜻한 상담가 같은 존재입니다.',
    'C': '창의적이고 독창적인 당신! 새로운 아이디어와 독특한 시각으로 세상을 바라보는 예술가 같은 존재입니다.',
    'D': '에너지가 넘치고 목표지향적인 당신! 긍정적인 에너지로 주변을 활기차게 만드는 에너자이저 같은 존재입니다.',
    'E': '분석적이고 체계적인 당신! 데이터와 논리를 바탕으로 완벽한 전략을 세우는 뛰어난 전략가입니다.',
    'F': '자유롭고 모험을 좋아하는 당신! 새로운 경험과 변화를 즐기는 자유로운 탐험가 같은 존재입니다.'
  };
  return descriptions[type] || `${type} 타입의 설명입니다.`;
}

/**
 * Get default content data
 */
function getDefaultContentData() {
  const data = {};
  
  // 타입 정보
  const types = ['A', 'B', 'C', 'D', 'E', 'F'];
  types.forEach(type => {
    data[`type_${type}_name`] = getDefaultTypeName(type);
    data[`type_${type}_description`] = getDefaultTypeDescription(type);
  });
  
  // 코멘트 데이터
  data['comment_A_B'] = '든든한 리더십과 따뜻한 배려심을 동시에 갖춘 당신! 사람들에게 신뢰받는 리더이면서도 따뜻한 마음으로 다가가는 매력적인 사람입니다.';
  data['comment_A_C'] = '안정감 있는 리더십과 창의적인 아이디어가 조화를 이루는 당신! 체계적이면서도 독창적인 접근으로 새로운 가능성을 열어가는 사람입니다.';
  data['comment_B_C'] = '따뜻한 마음과 창의적인 감성이 어우러진 당신! 사람들의 마음을 치유하면서도 아름다운 영감을 주는 특별한 존재입니다.';
  
  return data;
} 