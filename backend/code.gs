/**
 * Let Me Know Me - Google Apps Script Backend
 * 
 * Database Structure:
 * - feedbacks sheet: id, requester_name, responses, created_at
 * - contents sheet: key, value (for questions, choices, keywords, archetypes, comments)
 */

// Configuration
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Replace with your Google Sheets ID
const FEEDBACKS_SHEET = 'feedbacks';
const CONTENTS_SHEET = 'contents';

/**
 * Main entry point for all HTTP requests
 */
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const method = e.parameter.method || 'GET';
    const action = e.parameter.action;
    
    // Enable CORS
    const response = {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
    
    let result;
    
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
        const responseData = JSON.parse(e.parameter.responseData || e.postData?.contents || '{}');
        result = submitResponse(e.parameter.reportId, responseData);
        break;
      default:
        result = { error: 'Invalid action' };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
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
    
    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const [key, value] = data[i];
      if (key && value) {
        try {
          // Try to parse as JSON, fallback to string
          content[key] = JSON.parse(value);
        } catch {
          content[key] = value;
        }
      }
    }
    
    return { success: true, data: content };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get recent reports list
 */
function getReports(limit = 10) {
  try {
    const sheet = getSheet(FEEDBACKS_SHEET);
    const data = sheet.getDataRange().getValues();
    const reports = [];
    
    // Skip header row and get recent reports
    for (let i = Math.max(1, data.length - limit); i < data.length; i++) {
      const [id, requesterName, responses, createdAt] = data[i];
      if (id) {
        const responseCount = responses ? JSON.parse(responses).length : 0;
        reports.push({
          id,
          requesterName,
          responseCount,
          createdAt
        });
      }
    }
    
    // Sort by creation date (newest first)
    reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return { success: true, data: reports };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get specific report data
 */
function getReport(reportId) {
  try {
    if (!reportId) {
      return { success: false, error: 'Report ID is required' };
    }
    
    const sheet = getSheet(FEEDBACKS_SHEET);
    const data = sheet.getDataRange().getValues();
    
    // Find report by ID
    for (let i = 1; i < data.length; i++) {
      const [id, requesterName, responses, createdAt] = data[i];
      if (id === reportId) {
        const parsedResponses = responses ? JSON.parse(responses) : [];
        return {
          success: true,
          data: {
            id,
            requesterName,
            responses: parsedResponses,
            responseCount: parsedResponses.length,
            createdAt
          }
        };
      }
    }
    
    return { success: false, error: 'Report not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Create new report
 */
function createReport(requesterName) {
  try {
    if (!requesterName) {
      return { success: false, error: 'Requester name is required' };
    }
    
    const reportId = generateUUID();
    const createdAt = new Date().toISOString();
    const sheet = getSheet(FEEDBACKS_SHEET);
    
    // Add new row
    sheet.appendRow([reportId, requesterName, '[]', createdAt]);
    
    return {
      success: true,
      data: {
        id: reportId,
        requesterName,
        responses: [],
        responseCount: 0,
        createdAt
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Submit survey response
 */
function submitResponse(reportId, responseData) {
  try {
    if (!reportId || !responseData) {
      return { success: false, error: 'Report ID and response data are required' };
    }
    
    const sheet = getSheet(FEEDBACKS_SHEET);
    const data = sheet.getDataRange().getValues();
    
    // Find report by ID
    for (let i = 1; i < data.length; i++) {
      const [id, requesterName, responses, createdAt] = data[i];
      if (id === reportId) {
        const parsedResponses = responses ? JSON.parse(responses) : [];
        
        // Add new response with timestamp
        const newResponse = {
          ...responseData,
          submittedAt: new Date().toISOString()
        };
        parsedResponses.push(newResponse);
        
        // Update the row
        sheet.getRange(i + 1, 3).setValue(JSON.stringify(parsedResponses));
        
        return {
          success: true,
          data: {
            id,
            requesterName,
            responses: parsedResponses,
            responseCount: parsedResponses.length,
            createdAt
          }
        };
      }
    }
    
    return { success: false, error: 'Report not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
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
    
    // Add headers based on sheet type
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
 * Initialize content data in the contents sheet
 * Run this function once to populate the contents sheet with initial data
 */
function initializeContentData() {
  const sheet = getSheet(CONTENTS_SHEET);
  
  // Clear existing data (except headers)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  
  const contentData = [
    // Questions for Q1-Q9
    ['questions', JSON.stringify([
      "친구가 힘들어할 때 당신의 첫 번째 반응은?",
      "새로운 프로젝트를 시작할 때 당신은?",
      "갈등 상황에서 당신의 역할은?",
      "여가 시간에 당신이 선호하는 활동은?",
      "중요한 결정을 내릴 때 당신은?",
      "팀에서 당신의 역할은 주로?",
      "스트레스를 받을 때 당신은?",
      "새로운 사람들과 만날 때 당신은?",
      "목표를 달성하기 위해 당신이 중요하게 생각하는 것은?"
    ])],
    
    // Choices for Q1-Q9 (A-F options for each question)
    ['choices', JSON.stringify([
      // Q1 choices
      [
        "바로 달려가서 위로해준다",
        "조용히 옆에서 들어준다", 
        "창의적인 방법으로 기분전환을 시켜준다",
        "긍정적인 에너지로 힘을 북돋아준다",
        "구체적인 해결책을 제시한다",
        "혼자만의 시간을 갖도록 배려한다"
      ],
      // Q2 choices
      [
        "팀을 이끌고 체계적으로 진행한다",
        "모든 구성원의 의견을 수렴한다",
        "독창적인 아이디어를 제안한다",
        "열정적으로 동기부여한다",
        "철저한 계획을 세운다",
        "자유롭게 탐색하며 시작한다"
      ],
      // Q3 choices
      [
        "중재자 역할을 맡는다",
        "모두의 감정을 살핀다",
        "새로운 관점을 제시한다",
        "분위기를 밝게 만든다",
        "논리적 해결책을 찾는다",
        "개입하지 않고 지켜본다"
      ],
      // Q4 choices
      [
        "리더십 관련 활동",
        "봉사나 상담 활동",
        "예술이나 창작 활동",
        "스포츠나 파티",
        "독서나 연구",
        "여행이나 모험"
      ],
      // Q5 choices
      [
        "경험과 직감을 믿는다",
        "주변 사람들과 상의한다",
        "직감과 영감을 따른다",
        "긍정적인 결과에 집중한다",
        "데이터와 분석에 의존한다",
        "마음이 이끄는 대로 한다"
      ],
      // Q6 choices
      [
        "팀을 이끄는 리더",
        "팀원들을 돌보는 서포터",
        "아이디어를 제공하는 크리에이터",
        "분위기를 띄우는 에너자이저",
        "전략을 세우는 플래너",
        "자유롭게 활동하는 프리랜서"
      ],
      // Q7 choices
      [
        "문제를 해결하려 노력한다",
        "신뢰하는 사람과 대화한다",
        "창작이나 예술로 표현한다",
        "운동이나 활동으로 풀어낸다",
        "혼자 분석하고 정리한다",
        "여행이나 새로운 환경을 찾는다"
      ],
      // Q8 choices
      [
        "적극적으로 대화를 시작한다",
        "상대방을 편안하게 해준다",
        "독특한 매력으로 관심을 끈다",
        "밝은 에너지로 분위기를 만든다",
        "관찰하며 신중하게 접근한다",
        "자연스럽게 어울린다"
      ],
      // Q9 choices
      [
        "명확한 리더십과 책임감",
        "팀워크와 협력",
        "창의성과 독창성",
        "열정과 긍정적 마인드",
        "체계적인 계획과 실행",
        "유연성과 적응력"
      ]
    ])],
    
    // Keywords for Q10
    ['keywords', JSON.stringify([
      "리더십", "따뜻함", "창의적", "에너지", "분석적", "자유로움",
      "책임감", "공감", "독창적", "긍정적", "논리적", "모험적",
      "카리스마", "배려", "예술적", "활발함", "전략적", "유연함"
    ])],
    
    // Archetype definitions
    ['archetypes', JSON.stringify({
      A: {
        name: "든든한 리더",
        description: "타고난 리더십으로 주변을 이끄는 사람",
        traits: ["리더십", "책임감", "카리스마", "결단력", "추진력"]
      },
      B: {
        name: "따뜻한 상담가", 
        description: "공감과 배려로 사람들의 마음을 어루만지는 사람",
        traits: ["공감", "배려", "따뜻함", "경청", "치유"]
      },
      C: {
        name: "창의적인 아티스트",
        description: "독창적 사고와 예술적 감각을 가진 사람",
        traits: ["창의성", "독창성", "예술성", "상상력", "표현력"]
      },
      D: {
        name: "긍정의 에너자이저",
        description: "밝은 에너지로 주변을 활기차게 만드는 사람", 
        traits: ["긍정성", "활발함", "에너지", "열정", "사교성"]
      },
      E: {
        name: "치밀한 전략가",
        description: "논리적 사고와 체계적 접근으로 문제를 해결하는 사람",
        traits: ["논리성", "분석력", "전략적", "체계성", "신중함"]
      },
      F: {
        name: "자유로운 탐험가",
        description: "자유로운 영혼으로 새로운 경험을 추구하는 사람",
        traits: ["자유로움", "모험심", "유연성", "적응력", "호기심"]
      }
    })],
    
    // Comments for each archetype combination
    ['comments', JSON.stringify({
      AA: "당신은 타고난 리더의 자질을 가지고 있습니다. 강한 카리스마와 추진력으로 주변 사람들을 이끌어가는 능력이 뛰어납니다.",
      AB: "리더십과 따뜻함을 동시에 갖춘 당신은 사람들이 자연스럽게 따르고 싶어하는 매력적인 리더입니다.",
      AC: "창의적인 아이디어와 리더십을 결합한 당신은 혁신적인 변화를 이끌어내는 능력이 있습니다.",
      AD: "긍정적인 에너지와 리더십으로 팀을 밝고 역동적으로 이끌어가는 당신만의 특별한 매력이 있습니다.",
      AE: "전략적 사고와 리더십을 겸비한 당신은 체계적이고 효율적으로 목표를 달성하는 능력이 뛰어납니다.",
      AF: "자유로운 사고와 리더십을 결합한 당신은 기존의 틀을 벗어나 새로운 길을 개척하는 개척자입니다.",
      BB: "당신은 타고난 상담가의 기질을 가지고 있습니다. 깊은 공감능력과 따뜻한 마음으로 사람들에게 위로와 힘을 주는 존재입니다.",
      BC: "따뜻한 마음과 창의적 사고를 가진 당신은 사람들의 마음을 어루만지며 새로운 관점을 제시하는 능력이 있습니다.",
      BD: "따뜻함과 긍정적 에너지를 동시에 가진 당신은 주변 사람들에게 희망과 활력을 주는 특별한 존재입니다.",
      BE: "공감능력과 분석적 사고를 겸비한 당신은 사람들의 마음을 이해하면서도 논리적인 해결책을 제시할 수 있습니다.",
      BF: "따뜻한 마음과 자유로운 영혼을 가진 당신은 사람들에게 편안함과 새로운 가능성을 동시에 제공합니다.",
      CC: "당신은 순수한 예술가의 영혼을 가지고 있습니다. 독창적인 사고와 뛰어난 창의력으로 세상에 새로운 아름다움을 선사합니다.",
      CD: "창의성과 긍정적 에너지가 만난 당신은 밝고 독창적인 아이디어로 주변을 즐겁게 하는 매력적인 사람입니다.",
      CE: "창의적 사고와 논리적 분석력을 겸비한 당신은 혁신적이면서도 실현 가능한 아이디어를 만들어내는 능력이 있습니다.",
      CF: "자유로운 창의성을 가진 당신은 기존의 틀에 얽매이지 않고 독창적인 방식으로 자신을 표현하는 진정한 아티스트입니다.",
      DD: "당신은 타고난 에너지의 원천입니다. 밝고 긍정적인 에너지로 어떤 상황에서도 주변을 활기차게 만드는 특별한 능력이 있습니다.",
      DE: "긍정적 에너지와 전략적 사고를 결합한 당신은 열정적이면서도 체계적으로 목표를 달성하는 능력이 뛰어납니다.",
      DF: "자유로운 에너지를 가진 당신은 어디서든 자연스럽게 어울리며 새로운 경험을 통해 더욱 빛나는 존재입니다.",
      EE: "당신은 타고난 전략가입니다. 뛰어난 분석력과 논리적 사고로 복잡한 문제도 체계적으로 해결하는 능력이 있습니다.",
      EF: "논리적 사고와 자유로운 탐구정신을 가진 당신은 새로운 분야를 체계적으로 탐험하며 혁신을 만들어내는 능력이 있습니다.",
      FF: "당신은 진정한 자유영혼입니다. 어떤 틀에도 얽매이지 않고 자신만의 길을 개척하며 새로운 경험을 추구하는 모험가입니다.",
      // Default fallback comment
      default: "당신은 독특하고 매력적인 개성을 가진 사람입니다. 다양한 면모를 가지고 있어 상황에 따라 다른 매력을 발산하는 특별한 존재입니다."
    })]
  ];
  
  // Add all content data
  for (const [key, value] of contentData) {
    sheet.appendRow([key, value]);
  }
  
  Logger.log('Content data initialized successfully');
}

/**
 * Test function to verify the setup
 */
function testAPI() {
  // Test getContent
  console.log('Testing getContent:');
  console.log(getContent());
  
  // Test createReport
  console.log('Testing createReport:');
  const createResult = createReport('Test User');
  console.log(createResult);
  
  if (createResult.success) {
    const reportId = createResult.data.id;
    
    // Test submitResponse
    console.log('Testing submitResponse:');
    const responseData = {
      responses: ['A', 'B', 'C', 'D', 'E', 'F', 'A', 'B', 'C'],
      keywords: ['리더십', '따뜻함', '창의적']
    };
    console.log(submitResponse(reportId, responseData));
    
    // Test getReport
    console.log('Testing getReport:');
    console.log(getReport(reportId));
  }
  
  // Test getReports
  console.log('Testing getReports:');
  console.log(getReports());
} 