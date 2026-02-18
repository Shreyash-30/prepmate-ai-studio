import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

console.log('🧪 Testing Question Generation with Mastery Score Tracking\n');
console.log('=' .repeat(70));

let authToken = null;
let userId = null;

// Step 1: Login
async function loginUser() {
  console.log('\n📝 Step 1: Logging in as jay@gmail.com...');
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'jay@gmail.com',
      password: '123456',
    });

    authToken = response.data.token;
    userId = response.data.user.id;
    
    console.log('✅ Login successful');
    console.log(`   User ID: ${userId}`);
    console.log(`   User Name: ${response.data.user.name}`);
    console.log(`   User Email: ${response.data.user.email}`);
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Step 2: Generate questions for Arrays & Hashing
async function generateQuestions() {
  console.log('\n🤖 Step 2: Generating questions for Arrays & Hashing...');
  console.log('⏳ Watch backend logs to see learner profile sent to LLM...\n');
  
  try {
    const response = await axios.post(
      `${API_BASE}/practice/topics/arrays-hashing/generate-questions?limit=5`,
      {},
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    console.log('✅ Questions generated successfully');
    console.log(`   Success: ${response.data.data.success}`);
    console.log(`   Source: ${response.data.data.source || 'unknown'}`);
    console.log(`   Question Count: ${response.data.data.questions?.length || 0}`);
    
    if (response.data.data.questions && response.data.data.questions.length > 0) {
      console.log('\n📋 Questions Generated:');
      response.data.data.questions.forEach((q, idx) => {
        console.log(`\n   ${idx + 1}. ${q.problemTitle}`);
        console.log(`      Difficulty: ${q.difficulty || 'N/A'}`);
        console.log(`      Mastery Required: ${q.masteryRequired || 'N/A'}%`);
        console.log(`      Mastery Range: ${q.masteryMin || 'N/A'}% - ${q.masteryMax || 'N/A'}%`);
      });
    }

    console.log('\n📊 ANALYSIS:');
    console.log('--------');
    const questions = response.data.data.questions || [];
    if (questions.length === 0) {
      console.log('❌ No questions were generated!');
    } else {
      const difficulties = questions.map(q => q.difficulty);
      const easyCount = difficulties.filter(d => d === 'Easy').length;
      const mediumCount = difficulties.filter(d => d === 'Medium').length;
      const hardCount = difficulties.filter(d => d === 'Hard').length;
      
      console.log(`Difficulty Breakdown:`);
      console.log(`  Easy: ${easyCount}`);
      console.log(`  Medium: ${mediumCount}`);
      console.log(`  Hard: ${hardCount}`);
      
      if (easyCount === 5 && questions.length === 5) {
        console.log('\n⚠️  WARNING: User has 50+ mastery but ALL 5 questions are EASY!');
        console.log('   This suggests mastery score is NOT being considered by LLM');
      } else if (easyCount > hardCount) {
        console.log('\n⚠️  WARNING: More easy questions than hard.');
        console.log('   Verify learner profile mastery is being sent correctly');
      } else {
        console.log('\n✅ Question difficulty distribution looks reasonable');
      }
    }

  } catch (error) {
    console.error('❌ Question generation failed:', error.response?.data || error.message);
  }
}

// Main test
async function main() {
  try {
    await loginUser();
    await generateQuestions();
    
    console.log('\n' + '='.repeat(70));
    console.log('\n📌 CHECK BACKEND LOGS (above output) to see:');
    console.log('   1. "LEARNER PROFILE PREPARED:" section');
    console.log('   2. "FULL LEARNER PROFILE BEING SENT:" with');
    console.log('      - masteryScore value (should be 50+)');
    console.log('      - recommendedDifficulty (should be Medium/Hard for 50+)');
    console.log('   3. "✅ AXIOS POST CALL SUCCESSFUL" showing request went through');
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
