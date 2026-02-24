import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

async function discoverAvaialbeProbems() {
  console.log(`\n${colors.cyan}🔍 Discovering available problems and topics...${colors.reset}\n`);

  try {
    // Get all topics
    console.log(`${colors.cyan}Getting available topics...${colors.reset}`);
    const topicsRes = await axios.get(`${API_BASE}/practice/topics`);
    const topics = topicsRes.data?.data || [];
    
    if (topics.length === 0) {
      console.log(`${colors.yellow}No topics found${colors.reset}`);
      return;
    }

    console.log(`${colors.green}✓ Found ${topics.length} topics:${colors.reset}`);
    topics.slice(0, 5).forEach((topic, i) => {
      console.log(`  ${i + 1}. ${topic.topicId || topic._id} - ${topic.name}`);
    });

    if (topics.length > 0) {
      // Try to start a session with the first topic
      const firstTopic = topics[0];
      console.log(`\n${colors.cyan}Attempting to start session with topic: ${firstTopic.topicId}${colors.reset}`);

      try {
        const sessionRes = await axios.post(`${API_BASE}/practice/session/start`, {
          problemId: 'two-sum',
          topicId: firstTopic.topicId || firstTopic._id,
          language: 'python',
        });

        if (sessionRes.data?.data?.sessionId) {
          const sessionId = sessionRes.data.data.sessionId;
          console.log(`${colors.green}✓ Session created: ${sessionId}${colors.reset}`);

          // Get session details
          const sessionDetailsRes = await axios.get(`${API_BASE}/practice/session/${sessionId}`);
          const session = sessionDetailsRes.data?.data;

          console.log(`\n${colors.cyan}Session Details:${colors.reset}`);
          console.log(`  Problem ID: ${session.problemId}`);
          console.log(`  Topic ID: ${session.topicId}`);
          console.log(`  Language: ${session.codeLanguage}`);
          console.log(`  Schema Version: ${session.schemaVersion}`);
          console.log(`  Is Legacy: ${session.isLegacy}`);
          
          if (session.problemTitle) {
            console.log(`  ${colors.green}✓ Problem Title:${colors.reset} ${session.problemTitle}`);
          }
          
          if (session.problemDescription) {
            console.log(`  ${colors.green}✓ Problem Description:${colors.reset} ${session.problemDescription.substring(0, 100)}...`);
          }

          if (session.testCases && Array.isArray(session.testCases)) {
            console.log(`  ${colors.green}✓ Test Cases:${colors.reset} ${session.testCases.length} total`);
            const visibleTests = session.testCases.filter(t => t.visibility === 'visible');
            console.log(`    - Visible: ${visibleTests.length}`);
            if (visibleTests.length > 0) {
              console.log(`    - First test input: ${JSON.stringify(visibleTests[0].input).substring(0, 80)}`);
              console.log(`    - First test output: ${JSON.stringify(visibleTests[0].expectedOutput).substring(0, 80)}`);
            }
          } else {
            console.log(`  ${colors.yellow}⚠ Test Cases: Not found or not array${colors.reset}`);
          }

          if (session.wrapperTemplate && session.wrapperTemplate.python) {
            console.log(`  ${colors.green}✓ Wrapper Template:${colors.reset} ${session.wrapperTemplate.python.length} chars`);
            if (session.wrapperTemplate.python.includes('__USER_CODE__')) {
              console.log(`    - Contains __USER_CODE__ placeholder`);
            }
          } else {
            console.log(`  ${colors.yellow}⚠ Wrapper Template: Not found${colors.reset}`);
          }

          if (session.functionMetadata) {
            console.log(`  ${colors.green}✓ Function Metadata:${colors.reset}`);
            console.log(`    - Function: ${session.functionMetadata.functionName}`);
            if (session.functionMetadata.parameters) {
              console.log(`    - Parameters: ${JSON.stringify(session.functionMetadata.parameters)}`);
            }
          }
        } else {
          console.log(`${colors.yellow}⚠ Session not created - response: ${JSON.stringify(sessionRes.data)}${colors.reset}`);
        }
      } catch (error) {
        console.log(`${colors.yellow}⚠ Could not start session: ${error.response?.data?.message || error.message}${colors.reset}`);
      }
    }
  } catch (error) {
    console.error(`${colors.yellow}Error: ${error.message}${colors.reset}`);
  }
}

discoverAvaialbeProbems();
