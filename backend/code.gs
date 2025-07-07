/**
 * Let Me Know Me - Google Apps Script Backend
 *
 * Database Structure (feedbacks sheet):
 * - id: Report's unique ID
 * - type: 'META' for report creation, 'RESPONSE' for a submission
 * - created_at: Timestamp of the row creation
 * - requester_name: Name of the person requesting feedback (only in META)
 * - q1-q9: Answers for questions 1-9 (only in RESPONSE)
 * - q10_keywords: JSON array of keywords for question 10 (only in RESPONSE)
 */

// Google Sheets 스프레드시트 ID
const SPREADSHEET_ID = '1mTxn4HJRZiuuLe_HpqDCP_KgXQzXGj0ZcgYz3MeVzWY';
const FEEDBACKS_SHEET = 'feedbacks';
const CONTENTS_SHEET = 'contents';

// --- API Entry Points ---

function doGet(e) {
  const action = e.parameter.action;
  let result;
  try {
    switch (action) {
      case 'getContent':
        result = getContent();
        break;
      case 'getReports':
        result = getReports();
        break;
      case 'getReport':
        if (!e.parameter.id) throw new Error("리포트 ID가 필요합니다.");
        result = getReport(e.parameter.id);
        break;
      default:
        throw new Error("지원하지 않는 GET 액션입니다: " + action);
    }
  } catch (error) {
    console.error('GET Error:', error.message, error.stack);
    result = { success: false, error: error.message };
  }
  // Add CORS header to allow cross-origin requests
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
    .withHeaders({'Access-Control-Allow-Origin': '*'});
}

function doPost(e) {
  let result;
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    switch (action) {
      case 'create':
        if (!payload.name) throw new Error("요청자 이름이 필요합니다.");
        result = createReport(payload.name);
        break;
      case 'submit':
        if (!payload.id || !payload.response) throw new Error("리포트 ID와 응답 데이터가 필요합니다.");
        result = submitResponse(payload.id, payload.response);
        break;
      default:
        throw new Error("지원하지 않는 POST 액션입니다: " + action);
    }
  } catch (error) {
    console.error('POST Error:', error.message, error.stack);
    result = { success: false, error: '잘못된 요청입니다: ' + error.message };
  }
  // Add CORS header to allow cross-origin requests
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON)
    .withHeaders({'Access-Control-Allow-Origin': '*'});
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .withHeaders({
      'Access-Control-Allow-Origin': '*', // 모든 출처 허용
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
}

// --- Core Logic ---

/**
 * 신규 리포트 생성 (META 데이터)
 */
function createReport(name) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FEEDBACKS_SHEET);
  if (!sheet) throw new Error(`${FEEDBACKS_SHEET} 시트를 찾을 수 없습니다.`);

  const reportId = 'rpt_' + Date.now();
  const createdAt = new Date().toISOString();

  sheet.appendRow([
    reportId,        // id
    'META',          // type
    createdAt,       // created_at
    name.trim(),     // requester_name
    '', '', '', '', '', '', '', '', '', '' // q1-q10 (공백)
  ]);

  return { success: true, data: { id: reportId } };
}

/**
 * 설문 응답 제출 (RESPONSE 데이터)
 */
function submitResponse(reportId, response) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FEEDBACKS_SHEET);
  if (!sheet) throw new Error(`${FEEDBACKS_SHEET} 시트를 찾을 수 없습니다.`);

  const createdAt = new Date().toISOString();

  sheet.appendRow([
    reportId,                     // id
    'RESPONSE',                   // type
    createdAt,                    // created_at
    '',                           // requester_name (공백)
    response.q1 || '',            // q1
    response.q2 || '',            // q2
    response.q3 || '',            // q3
    response.q4 || '',            // q4
    response.q5 || '',            // q5
    response.q6 || '',            // q6
    response.q7 || '',            // q7
    response.q8 || '',            // q8
    response.q9 || '',            // q9
    JSON.stringify(response.q10 || []) // q10_keywords (JSON 문자열)
  ]);

  return { success: true, message: '응답이 성공적으로 제출되었습니다.' };
}

/**
 * 특정 리포트 상세 데이터 조회
 */
function getReport(reportId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FEEDBACKS_SHEET);
  if (!sheet) throw new Error(`${FEEDBACKS_SHEET} 시트를 찾을 수 없습니다.`);

  const data = sheet.getDataRange().getValues();
  const headers = data.shift() || []; // 헤더 추출 및 원본에서 제거

  const idCol = headers.indexOf('id');
  const typeCol = headers.indexOf('type');
  const nameCol = headers.indexOf('requester_name');
  const q1Col = headers.indexOf('q1');
  const q10Col = headers.indexOf('q10_keywords');

  let requesterName = '';
  const responses = [];

  data.forEach(row => {
    if (row[idCol] === reportId) {
      if (row[typeCol] === 'META') {
        requesterName = row[nameCol];
      } else if (row[typeCol] === 'RESPONSE') {
        const response = {};
        for (let i = 0; i < 9; i++) {
          response[`q${i + 1}`] = row[q1Col + i];
        }
        try {
          response.q10 = JSON.parse(row[q10Col]);
        } catch (e) {
          response.q10 = [];
        }
        responses.push(response);
      }
    }
  });

  if (!requesterName) {
    throw new Error(`ID가 ${reportId}인 리포트를 찾을 수 없습니다.`);
  }

  const result = {
    id: reportId,
    requesterName: requesterName,
    responses: responses
  };

  return { success: true, data: result };
}


/**
 * 최근 리포트 목록 조회
 */
function getReports() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FEEDBACKS_SHEET);
  if (!sheet) throw new Error(`${FEEDBACKS_SHEET} 시트를 찾을 수 없습니다.`);

  const data = sheet.getDataRange().getValues();
  data.shift(); // 헤더 제거

  const reports = {}; // { id: { name, date, count } }

  data.forEach(row => {
    const id = row[0];
    const type = row[1];
    const date = row[2];
    const name = row[3];

    if (type === 'META') {
      if (!reports[id]) {
        reports[id] = { id: id, name: name, date: date, responseCount: 0 };
      }
    } else if (type === 'RESPONSE') {
      if (reports[id]) {
        reports[id].responseCount++;
      }
    }
  });

  const reportList = Object.values(reports);
  reportList.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { success: true, data: reportList.slice(0, 10) };
}


// --- Content Management ---

/**
 * Get all content data (questions, choices, keywords, archetypes, comments)
 */
function getContent() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CONTENTS_SHEET);
    if (!sheet) {
      initializeContentData();
      const newSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(CONTENTS_SHEET);
      if (!newSheet) throw new Error(`${CONTENTS_SHEET} 시트를 생성할 수 없습니다.`);
      return getContent(); // 재귀 호출
    }
    
    const data = sheet.getDataRange().getValues();
    const contentData = {};
    
    data.forEach(row => {
      if (row.length >= 2 && row[0] && row[1]) {
        const key = row[0];
        let value = row[1];
        if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
          try { value = JSON.parse(value); } catch (e) {}
        }
        contentData[key] = value;
      }
    });
    
    return { success: true, data: contentData };
    
  } catch (error) {
    console.error('getContent error:', error);
    return { success: false, error: '콘텐츠 데이터를 가져올 수 없습니다: ' + error.message };
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
    const allKeywords = [
      '신중한', '책임감 있는', '든든한',
      '리더십 있는', '신뢰할 수 있는', '진지한',
      '따뜻한', '공감하는', '배려심 깊은',
      '듣기 좋아하는', '이해심 많은', '친절한',
      '창의적인', '독특한', '예술적인',
      '상상력 풍부한', '영감을 주는', '개성 있는',
      '밝은', '에너지 넘치는', '긍정적인',
      '유머러스한', '활발한', '재미있는',
      '논리적인', '체계적인', '계획성 있는',
      '분석적인', '신중한', '완벽주의적인',
      '자유로운', '모험적인', '유연한',
      '적응력 있는', '개방적인', '호기심 많은'
    ];
    sheet.appendRow(['keyword_list', JSON.stringify(allKeywords)]);
    
    console.log('콘텐츠 데이터가 성공적으로 초기화되었습니다.');
    
  } catch (error) {
    console.error('initializeContentData 오류:', error);
    throw error;
  }
}