import axios from 'axios';

// This test calls the actual practice run endpoint
// which should use the wrapped execution with stdin/stdout

const API_BASE = 'http://localhost:8000/api';

// Mock auth token
const mockToken = 'test-token-' + Date.now();

async function testWrappedExecution() {
  console.log('🧪 Testing wrapped execution via HTTP...\n');

  try {
    // Step 1: Create a practice session
    console.log('1️⃣  Creating practice session...');
    const sessionRes = await axios.post(
      `${API_BASE}/practice/session`,
      {
        problemId: 'two-sum',
        language: 'python',
        starterCode: 'def twoSum(nums, target):\n    pass',
      },
      {
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const sessionId = sessionRes.data?.data?.sessionId;
    console.log(`   ✅ Session created: ${sessionId}\n`);

    // Step 2: Run wrapped code
    console.log('2️⃣  Running wrapped code...');
    const code = `def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`;

    const runRes = await axios.post(
      `${API_BASE}/practice/run/${sessionId}`,
      {
        code: code,
        language: 'python',
      },
      {
        headers: {
          Authorization: `Bearer ${mockToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`   Status: ${runRes.status}`);
    console.log('   Response:', JSON.stringify(runRes.data, null, 2));

    if (runRes.data?.verdict === 'accepted') {
      console.log('\n✅ Test passed! Wrapped execution is working.');
    } else {
      console.log('\n⚠️  Test did not pass. Verdict:', runRes.data?.verdict);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.response?.status, error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Full error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testWrappedExecution();
