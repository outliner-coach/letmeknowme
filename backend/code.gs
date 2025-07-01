/**
 * Let Me Know Me - Google Apps Script Backend
 * 
 * Database Structure:
 * - feedbacks sheet: id, requester_name, responses, created_at
 * - contents sheet: key, value (for questions, choices, keywords, archetypes, comments)
 */

// Google Sheets 스프레드시트 ID (실제 ID로 변경 필요)
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
    // 일반 JSON 응답 (CORS 헤더 포함)
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      });
  }
}

/**
 * Main entry point for POST requests
 */
function doPost(e) {
  const result = handleRequest(e);
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    });
}

/**
 * Handle all requests
 */
function handleRequest(e) {
  try {
    const action = e.parameter.action;
    let result;
    
    // 기본 리포트 목록 조회 (action이 없을 때)
    if (!action) {
      result = getReports();
    } else {
      switch (action) {
        case 'getContent':
          result = getContent();
          break;
        case 'getReports':
          result = getReports();
          break;
        case 'getReport':
          result = getReport(e.parameter.id);
          break;
        case 'createReport':
          result = createReport(e.parameter.requesterName);
          break;
        case 'submitResponse':
          const postData = e.postData ? JSON.parse(e.postData.contents) : e.parameter;
          result = submitResponse(postData.reportId, postData.responses);
          break;
        default:
          result = { success: false, error: 'Invalid action' };
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Request handling error:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get all content data (questions, choices, keywords, archetypes, comments)
 */
function getContent() {
  try {
    const sheet = getSheet(CONTENTS_SHEET);
    const data = sheet.getDataRange().getValues();
    
    const content = {};
    data.forEach(row => {
      if (row[0] && row[1]) {
        try {
          content[row[0]] = JSON.parse(row[1]);
        } catch (e) {
          content[row[0]] = row[1];
        }
      }
    });
    
    return {
      success: true,
      data: content
    };
  } catch (error) {
    console.error('Error getting content:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get recent reports list
 */
function getReports() {
  try {
    const sheet = getSheet(FEEDBACKS_SHEET);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: true,
        data: []
      };
    }
    
    const reports = data.slice(1).map(row => {
      const responses = row[2] ? JSON.parse(row[2]) : [];
      return {
        id: row[0],
        requesterName: row[1],
        responseCount: responses.length,
        createdAt: row[3]
      };
    }).reverse(); // 최신순 정렬
    
    return {
      success: true,
      data: reports
    };
  } catch (error) {
    console.error('Error getting reports:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get specific report data
 */
function getReport(reportId) {
  try {
    if (!reportId) {
      return {
        success: false,
        error: 'Report ID is required'
      };
    }
    
    const sheet = getSheet(FEEDBACKS_SHEET);
    const data = sheet.getDataRange().getValues();
    
    const reportRow = data.find(row => row[0] === reportId);
    if (!reportRow) {
      return {
        success: false,
        error: 'Report not found'
      };
    }
    
    const responses = reportRow[2] ? JSON.parse(reportRow[2]) : [];
    
    return {
      success: true,
      data: {
        id: reportRow[0],
        requesterName: reportRow[1],
        responses: responses,
        responseCount: responses.length,
        createdAt: reportRow[3]
      }
    };
  } catch (error) {
    console.error('Error getting report:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Create new report
 */
function createReport(requesterName) {
  try {
    if (!requesterName) {
      return {
        success: false,
        error: 'Requester name is required'
      };
    }
    
    const reportId = generateUUID();
    const sheet = getSheet(FEEDBACKS_SHEET);
    
    sheet.appendRow([
      reportId,
      requesterName,
      JSON.stringify([]), // 빈 응답 배열
      new Date().toISOString()
    ]);
    
    return {
      success: true,
      data: {
        id: reportId,
        requesterName: requesterName,
        responseCount: 0,
        createdAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error creating report:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Submit survey response
 */
function submitResponse(reportId, responses) {
  try {
    if (!reportId || !responses) {
      return {
        success: false,
        error: 'Report ID and responses are required'
      };
    }
    
    const sheet = getSheet(FEEDBACKS_SHEET);
    const data = sheet.getDataRange().getValues();
    
    const rowIndex = data.findIndex(row => row[0] === reportId);
    if (rowIndex === -1) {
      return {
        success: false,
        error: 'Report not found'
      };
    }
    
    const currentResponses = data[rowIndex][2] ? JSON.parse(data[rowIndex][2]) : [];
    currentResponses.push(responses);
    
    sheet.getRange(rowIndex + 1, 3).setValue(JSON.stringify(currentResponses));
    
    return {
      success: true,
      data: {
        responseCount: currentResponses.length
      }
    };
  } catch (error) {
    console.error('Error submitting response:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Helper function to get or create sheet
 */
function getSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    
    if (sheetName === FEEDBACKS_SHEET) {
      sheet.getRange(1, 1, 1, 4).setValues([['id', 'requester_name', 'responses', 'created_at']]);
    } else if (sheetName === CONTENTS_SHEET) {
      sheet.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
    }
  }
  
  return sheet;
}

/**
 * Generate UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Initialize content data (run once)
 */
function initializeContentData() {
  const sheet = getSheet(CONTENTS_SHEET);
  
  // 질문 데이터
  const questions = [
    "이 사람과 함께 있을 때 가장 먼저 떠오르는 느낌은?",
    "이 사람이 문제를 해결하는 방식은?",
    "이 사람의 대화 스타일은?",
    "이 사람이 스트레스를 받을 때 보이는 모습은?",
    "이 사람의 인간관계에서 가장 두드러지는 특징은?",
    "이 사람이 새로운 환경에 적응하는 방식은?",
    "이 사람의 장점 중 가장 인상적인 것은?",
    "이 사람과 함께 일할 때 기대할 수 있는 것은?",
    "이 사람의 성격에서 가장 독특한 부분은?"
  ];
  
  // 선택지 데이터
  const choices = [
    { value: 'A', text: '든든하고 믿음직스러운 느낌' },
    { value: 'B', text: '따뜻하고 편안한 느낌' },
    { value: 'C', text: '흥미롭고 신선한 느낌' },
    { value: 'D', text: '활기차고 즐거운 느낌' },
    { value: 'E', text: '차분하고 신중한 느낌' },
    { value: 'F', text: '자유롭고 유연한 느낌' }
  ];
  
  // 키워드 데이터
  const keywords = [
    '리더십', '공감능력', '창의성', '긍정적', '논리적', '자유로운',
    '책임감', '배려심', '독창적', '에너지', '분석적', '모험적',
    '신뢰성', '따뜻함', '예술적', '활발함', '체계적', '유연성',
    '결단력', '이해심', '상상력', '열정적', '객관적', '개방적',
    '안정감', '친근함', '혁신적', '밝음', '전략적', '탐험적',
    '의지력', '소통력', '감성적', '유머', '계획적', '즉흥적'
  ];
  
  // 성격 유형 데이터
  const archetypes = {
    A: {
      name: '든든한 리더',
      description: '타고난 리더십으로 주변을 이끄는 사람',
      traits: ['리더십', '책임감', '신뢰성', '결단력', '안정감', '의지력']
    },
    B: {
      name: '따뜻한 상담가',
      description: '공감과 배려로 사람들의 마음을 어루만지는 사람',
      traits: ['공감능력', '배려심', '따뜻함', '이해심', '친근함', '소통력']
    },
    C: {
      name: '창의적인 아티스트',
      description: '독창적 사고와 예술적 감각을 가진 사람',
      traits: ['창의성', '독창적', '예술적', '상상력', '혁신적', '감성적']
    },
    D: {
      name: '긍정의 에너자이저',
      description: '밝은 에너지로 주변을 활기차게 만드는 사람',
      traits: ['긍정적', '에너지', '활발함', '열정적', '밝음', '유머']
    },
    E: {
      name: '치밀한 전략가',
      description: '논리적 사고와 체계적 접근으로 문제를 해결하는 사람',
      traits: ['논리적', '분석적', '체계적', '객관적', '전략적', '계획적']
    },
    F: {
      name: '자유로운 탐험가',
      description: '자유로운 영혼으로 새로운 경험을 추구하는 사람',
      traits: ['자유로운', '모험적', '유연성', '개방적', '탐험적', '즉흥적']
    }
  };
  
  // 조합별 코멘트 데이터
  const comments = {
    'AA': '당신은 타고난 리더입니다. 강한 카리스마와 책임감으로 주변 사람들에게 신뢰를 받고 있어요.',
    'AB': '든든한 리더십과 따뜻한 마음을 겸비한 당신은 사람들이 가장 의지하고 싶어하는 존재입니다.',
    'AC': '리더십과 창의성을 동시에 갖춘 당신은 혁신적인 변화를 이끌어내는 비전 리더입니다.',
    'AD': '카리스마 있는 리더십과 긍정적 에너지로 팀을 활기차게 이끄는 매력적인 리더입니다.',
    'AE': '강력한 리더십과 전략적 사고를 겸비한 당신은 조직을 성공으로 이끄는 최고의 리더입니다.',
    'AF': '리더십과 자유로운 사고를 가진 당신은 새로운 가능성을 열어가는 개척자형 리더입니다.',
    
    'BB': '당신은 진정한 힐러입니다. 따뜻한 마음과 깊은 공감능력으로 사람들의 마음을 치유해주고 있어요.',
    'BC': '따뜻한 감성과 창의적 영감을 가진 당신은 사람들에게 위로와 영감을 동시에 주는 특별한 존재입니다.',
    'BD': '따뜻함과 긍정 에너지가 만난 당신은 주변을 밝고 따뜻하게 만드는 햇살 같은 사람입니다.',
    'BE': '공감능력과 논리적 사고를 겸비한 당신은 현명한 조언으로 사람들을 이끄는 멘토입니다.',
    'BF': '따뜻한 마음과 자유로운 영혼을 가진 당신은 편견 없이 모든 사람을 포용하는 진정한 친구입니다.',
    
    'CC': '당신은 순수한 아티스트입니다. 독창적인 사고와 예술적 감각으로 세상에 새로운 아름다움을 선사하고 있어요.',
    'CD': '창의성과 긍정 에너지가 만난 당신은 혁신적이면서도 즐거운 아이디어로 사람들을 매료시킵니다.',
    'CE': '창의적 영감과 논리적 분석력을 가진 당신은 혁신을 현실로 만드는 실용적 아티스트입니다.',
    'CF': '무한한 창의성과 자유로운 영혼을 가진 당신은 기존의 틀을 깨고 새로운 세계를 만들어가는 혁신가입니다.',
    
    'DD': '당신은 순수한 에너지 덩어리입니다. 끝없는 긍정성과 활력으로 주변을 항상 밝게 만들어주고 있어요.',
    'DE': '긍정적 에너지와 체계적 사고를 가진 당신은 목표를 향해 즐겁게 달려가는 성공형 인재입니다.',
    'DF': '긍정성과 자유로운 정신이 만난 당신은 어떤 상황에서도 희망을 잃지 않는 불굴의 모험가입니다.',
    
    'EE': '당신은 완벽한 전략가입니다. 치밀한 분석과 논리적 사고로 어떤 문제든 해결해내는 능력을 가지고 있어요.',
    'EF': '전략적 사고와 유연성을 겸비한 당신은 변화하는 상황에 맞춰 최적의 해답을 찾아내는 적응형 리더입니다.',
    
    'FF': '당신은 진정한 자유인입니다. 무한한 가능성을 추구하며 새로운 경험을 통해 끊임없이 성장하고 있어요.',
    
    'default': '당신은 여러 매력이 조화롭게 어우러진 독특하고 매력적인 사람입니다. 다양한 상황에서 각기 다른 면모를 보여주며 사람들에게 새로운 발견의 즐거움을 선사합니다.'
  };
  
  // 데이터 저장
  const dataToSave = [
    ['questions', JSON.stringify(questions)],
    ['choices', JSON.stringify(choices)],
    ['keywords', JSON.stringify(keywords)],
    ['archetypes', JSON.stringify(archetypes)],
    ['comments', JSON.stringify(comments)]
  ];
  
  // 기존 데이터 삭제 후 새 데이터 입력
  sheet.clear();
  sheet.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
  sheet.getRange(2, 1, dataToSave.length, 2).setValues(dataToSave);
  
  console.log('Content data initialized successfully');
}

/**
 * Test all API functions
 */
function testAPI() {
  console.log('=== API Test Start ===');
  
  // Test getContent
  console.log('1. Testing getContent...');
  const content = getContent();
  console.log('Content result:', content);
  
  // Test createReport
  console.log('2. Testing createReport...');
  const report = createReport('테스트 사용자');
  console.log('Create report result:', report);
  
  if (report.success) {
    const reportId = report.data.id;
    
    // Test getReport
    console.log('3. Testing getReport...');
    const getReportResult = getReport(reportId);
    console.log('Get report result:', getReportResult);
    
    // Test submitResponse
    console.log('4. Testing submitResponse...');
    const testResponse = {
      'q1': 'A', 'q2': 'B', 'q3': 'C', 'q4': 'D', 'q5': 'E', 'q6': 'F',
      'q7': 'A', 'q8': 'B', 'q9': 'C',
      'q10': ['리더십', '창의성', '긍정적']
    };
    const submitResult = submitResponse(reportId, testResponse);
    console.log('Submit response result:', submitResult);
  }
  
  // Test getReports
  console.log('5. Testing getReports...');
  const reports = getReports();
  console.log('Get reports result:', reports);
  
  console.log('=== API Test End ===');
} 