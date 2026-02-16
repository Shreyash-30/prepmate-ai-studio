MASTER PROMPT — Adaptive Learning Multi-LLM Integration Layer

Act as a senior backend + AI infrastructure engineer.
Extend the existing backend by creating a production-ready **LLM Service Layer** inside the `/llm` folder that integrates with the current database models, backend APIs, and ML scoring pipelines.

SYSTEM REQUIREMENTS

1. The system must support multiple LLM providers:

   * Primary: Groq (llama3-70b-8192)
   * Fallback 1: Together AI (Llama-3-70B)
   * Fallback 2: OpenRouter (Llama-3-8B)

2. Implement automatic **failover routing**:

   * If the primary provider fails or quota is exceeded, automatically switch to fallback providers without breaking API responses.
   * Maintain consistent response schema across providers.

3. Integrate with the existing database:

   * Accept user profile, performance scores, weak topics, and study history from the current DB models.
   * Generate:

     * readiness_score_reasoning
     * weak_topic_analysis
     * adaptive_daily_plan
   * Save generated outputs back into the database using existing repositories/controllers.

4. Create the following structure:

/llm
llmProviderRouter.js
promptTemplates.js
readinessEngine.js
adaptivePlannerEngine.js
weakTopicEngine.js

5. Implement backend service functions:

generateReadinessReasoning(userId)
generateWeakTopicInsights(userId)
generateAdaptiveDailyPlanner(userId)

Each function must:

* Fetch required data from the database
* Construct structured prompts using promptTemplates.js
* Call the LLM router
* Parse structured JSON response
* Persist results into DB
* Return standardized API response

6. Ensure structured JSON output format:

{
"readiness_score": number,
"weak_topics": [],
"recommended_tasks": [],
"reasoning": ""
}

7. Create REST endpoints (controller integration):

POST /ai/readiness/:userId
POST /ai/weak-topics/:userId
POST /ai/adaptive-plan/:userId

8. Add logging, retry handling, and latency-safe timeout protection suitable for production pipelines triggered by:

   * submission events
   * weekly recompute jobs
   * daily planner generation jobs

9. Ensure the implementation matches the existing backend architecture style, environment variable structure, database schema, and authentication middleware already present in the project.

OUTPUT REQUIREMENT
Generate complete production-ready Node.js/Express service code with routing, controllers, provider adapters, structured prompts, DB integration calls, and usage examples ready for immediate integration.
# Expected Generated Questions & Database Documents

## User shreyash@gmail.com - Topic: Arrays & Hashing

### API Response Format

```json
{
  "success": true,
  "topic": "Arrays & Hashing",
  "recommendedDifficulty": "Easy",
  "source": "gemini",
  "generatedAt": "2026-02-16T01:03:16.237Z",
  
  "generationPrompt": {
    "userId": "69920618261497b26786c42c",
    "userName": "Shreyash",
    "learningLevel": "intermediate",
    "targetCompanies": "General tech roles",
    "topicId": "arrays",
    "masteryScore": 0,
    "progressionReadinessScore": 0,
    "weakSubtopics": "Various",
    "recommendedDifficulty": "Easy",
    "desiredQuestionCount": 5
  },
  
  "questions": [
    {
      "problemTitle": "Two Sum",
      "difficulty": "Easy",
      "topic": "Arrays & Hashing",
      "primaryConceptTested": "Hash Map",
      "whyRecommended": "As a beginner, you need to master the fundamental approach of using hash maps to solve array problems efficiently. This problem teaches you how to reduce time complexity from O(n²) to O(n) using a hash table.",
      "sourceUrl": "https://leetcode.com/problems/two-sum/",
      "hints": [
        "Store each number and its index in a hash map",
        "For each number, check if (target - number) exists in the map"
      ],
      "approachGuide": "1. Create an empty hash map\n2. Iterate through array\n3. For each num, calculate complement = target - num\n4. If complement exists in map, return both indices\n5. Otherwise, add current num to map",
      "isDuplicate": false,
      "platform": "leetcode"
    },
    {
      "problemTitle": "Valid Anagram",
      "difficulty": "Easy",
      "topic": "Arrays & Hashing",
      "primaryConceptTested": "Hash Map / Character Counting",
      "whyRecommended": "This problem reinforces your understanding of hash maps and character frequency counting. The Easy difficulty ensures you can practice without being overwhelmed.",
      "sourceUrl": "https://leetcode.com/problems/valid-anagram/",
      "hints": [
        "Count the frequency of each character in both strings",
        "Compare the frequency maps"
      ],
      "approachGuide": "1. If lengths differ, not anagrams\n2. Count character frequencies in first string\n3. Decrement for each char in second string\n4. All counts should be 0",
      "isDuplicate": false,
      "platform": "leetcode"
    },
    {
      "problemTitle": "Contains Duplicate",
      "difficulty": "Easy",
      "topic": "Arrays & Hashing",
      "primaryConceptTested": "Hash Set Implementation",
      "whyRecommended": "Simple introduction to hash sets. After mastering Two Sum (pairs), this teaches you duplicate detection using sets - a critical pattern for array problems.",
      "sourceUrl": "https://leetcode.com/problems/contains-duplicate/",
      "hints": [
        "Use a set to track seen numbers",
        "If you see a number that's already in the set, return true"
      ],
      "approachGuide": "1. Create empty set\n2. Iterate through array\n3. If number in set, return true (duplicate found)\n4. If not in set, add to set\n5. Return false (no duplicates)",
      "isDuplicate": false,
      "platform": "leetcode"
    },
    {
      "problemTitle": "Group Anagrams",
      "difficulty": "Medium",
      "topic": "Arrays & Hashing",
      "primaryConceptTested": "Hash Map with Sorting",
      "whyRecommended": "Now that you've mastered basic hash operations with Valid Anagram, this Medium problem teaches you to group data using hashes. Slightly harder but very important interview pattern.",
      "sourceUrl": "https://leetcode.com/problems/group-anagrams/",
      "hints": [
        "Sorted versions of anagrams are identical",
        "Use sorted string as key in hash map"
      ],
      "approachGuide": "1. Create hash map\n2. For each word:\n   - Sort characters to get key\n   - If key exists, append word to group\n   - Else create new group\n3. Return all groups as list",
      "isDuplicate": false,
      "platform": "leetcode"
    },
    {
      "problemTitle": "Top K Frequent Elements",
      "difficulty": "Medium",
      "topic": "Arrays & Hashing",
      "primaryConceptTested": "Hash Map + Heap/Bucket Sort",
      "whyRecommended": "Final Medium problem to consolidate hash map knowledge. Teaches you to not just store but process hash map data - crucial for interview success.",
      "sourceUrl": "https://leetcode.com/problems/top-k-frequent-elements/",
      "hints": [
        "Count frequency of each element first using a hash map",
        "Use a min heap of size k or bucket sort"
      ],
      "approachGuide": "1. Count frequencies with hash map\n2. Use min heap (size k) to track top elements\n   OR use bucket sort with indices as frequencies\n3. Return top k elements",
      "isDuplicate": false,
      "platform": "leetcode"
    }
  ]
}
```

---

## MongoDB GeneratedQuestionLog Documents

### Sample Document 1: Two Sum
```json
{
  "_id": ObjectId("67a9f1c5d9e8f2c3b4a5c6d7"),
  "userId": ObjectId("69920618261497b26786c42c"),
  "topicId": "arrays",
  
  "problemTitle": "Two Sum",
  "problemTitleNormalized": "two sum",
  "topic": "Arrays & Hashing",
  "difficulty": "Easy",
  "primaryConceptTested": "Hash Map",
  
  "whyRecommended": "As a beginner, you need to master the fundamental approach of using hash maps to solve array problems efficiently. This problem teaches you how to reduce time complexity from O(n²) to O(n) using a hash table.",
  
  "hints": [
    "Store each number and its index in a hash map",
    "For each number, check if (target - number) exists in the map"
  ],
  
  "approachGuide": "1. Create an empty hash map\n2. Iterate through array\n3. For each num, calculate complement = target - num\n4. If complement exists in map, return both indices\n5. Otherwise, add current num to map",
  
  "generatedFor": "practice-session",
  "learnerLevel": "Easy",
  "sourceUrl": "https://leetcode.com/problems/two-sum/",
  "sourceQuestionBankId": ObjectId("67a8e0b4c7f9a1b2c3d4e5f6"),
  "isPaired": true,
  
  "userResponse": {
    "attempted": false,
    "solved": null,
    "rating": null,
    "feedback": null,
    "attemptedAt": null
  },
  
  "generationSessionId": "session-1708033251237",
  "generationPromptHash": "abc123hash456def789",
  "geminiModelVersion": "gemini-2.5-flash",
  
  "isEffective": null,
  "questionQualityScore": null,
  "isDuplicate": false,
  "duplicateOfId": null,
  "isHidden": false,
  "flaggedReason": null,
  "platform": "leetcode",
  
  "createdAt": ISODate("2026-02-16T01:03:31.237Z"),
  "updatedAt": ISODate("2026-02-16T01:03:31.237Z")
}
```

### Sample Document 2: Valid Anagram
```json
{
  "_id": ObjectId("67a9f1c5d9e8f2c3b4a5c6d8"),
  "userId": ObjectId("69920618261497b26786c42c"),
  "topicId": "arrays",
  
  "problemTitle": "Valid Anagram",
  "problemTitleNormalized": "valid anagram",
  "topic": "Arrays & Hashing",
  "difficulty": "Easy",
  "primaryConceptTested": "Hash Map / Character Counting",
  
  "whyRecommended": "This problem reinforces your understanding of hash maps and character frequency counting. The Easy difficulty ensures you can practice without being overwhelmed.",
  
  "hints": [
    "Count the frequency of each character in both strings",
    "Compare the frequency maps"
  ],
  
  "approachGuide": "1. If lengths differ, not anagrams\n2. Count character frequencies in first string\n3. Decrement for each char in second string\n4. All counts should be 0",
  
  "generatedFor": "practice-session",
  "learnerLevel": "Easy",
  "sourceUrl": "https://leetcode.com/problems/valid-anagram/",
  "sourceQuestionBankId": ObjectId("67a8e0b4c7f9a1b2c3d4e5f7"),
  "isPaired": true,
  
  "userResponse": {
    "attempted": false,
    "solved": null,
    "rating": null,
    "feedback": null,
    "attemptedAt": null
  },
  
  "generationSessionId": "session-1708033251237",
  "generationPromptHash": "abc123hash456def789",
  "geminiModelVersion": "gemini-2.5-flash",
  
  "isEffective": null,
  "questionQualityScore": null,
  "isDuplicate": false,
  "duplicateOfId": null,
  "isHidden": false,
  "flaggedReason": null,
  "platform": "leetcode",
  
  "createdAt": ISODate("2026-02-16T01:03:32.415Z"),
  "updatedAt": ISODate("2026-02-16T01:03:32.415Z")
}
```

### Sample Document 3: Contains Duplicate
```json
{
  "_id": ObjectId("67a9f1c5d9e8f2c3b4a5c6d9"),
  "userId": ObjectId("69920618261497b26786c42c"),
  "topicId": "arrays",
  
  "problemTitle": "Contains Duplicate",
  "problemTitleNormalized": "contains duplicate",
  "topic": "Arrays & Hashing",
  "difficulty": "Easy",
  "primaryConceptTested": "Hash Set Implementation",
  
  "whyRecommended": "Simple introduction to hash sets. After mastering Two Sum (pairs), this teaches you duplicate detection using sets - a critical pattern for array problems.",
  
  "hints": [
    "Use a set to track seen numbers",
    "If you see a number that's already in the set, return true"
  ],
  
  "approachGuide": "1. Create empty set\n2. Iterate through array\n3. If number in set, return true (duplicate found)\n4. If not in set, add to set\n5. Return false (no duplicates)",
  
  "generatedFor": "practice-session",
  "learnerLevel": "Easy",
  "sourceUrl": "https://leetcode.com/problems/contains-duplicate/",
  "sourceQuestionBankId": ObjectId("67a8e0b4c7f9a1b2c3d4e5f8"),
  "isPaired": true,
  
  "userResponse": {
    "attempted": false,
    "solved": null,
    "rating": null,
    "feedback": null,
    "attemptedAt": null
  },
  
  "generationSessionId": "session-1708033251237",
  "generationPromptHash": "abc123hash456def789",
  "geminiModelVersion": "gemini-2.5-flash",
  
  "isEffective": null,
  "questionQualityScore": null,
  "isDuplicate": false,
  "duplicateOfId": null,
  "isHidden": false,
  "flaggedReason": null,
  "platform": "leetcode",
  
  "createdAt": ISODate("2026-02-16T01:03:33.892Z"),
  "updatedAt": ISODate("2026-02-16T01:03:33.892Z")
}
```

### Sample Document 4: Group Anagrams (Medium)
```json
{
  "_id": ObjectId("67a9f1c5d9e8f2c3b4a5c6da"),
  "userId": ObjectId("69920618261497b26786c42c"),
  "topicId": "arrays",
  
  "problemTitle": "Group Anagrams",
  "problemTitleNormalized": "group anagrams",
  "topic": "Arrays & Hashing",
  "difficulty": "Medium",
  "primaryConceptTested": "Hash Map with Sorting",
  
  "whyRecommended": "Now that you've mastered basic hash operations with Valid Anagram, this Medium problem teaches you to group data using hashes. Slightly harder but very important interview pattern.",
  
  "hints": [
    "Sorted versions of anagrams are identical",
    "Use sorted string as key in hash map"
  ],
  
  "approachGuide": "1. Create hash map\n2. For each word:\n   - Sort characters to get key\n   - If key exists, append word to group\n   - Else create new group\n3. Return all groups as list",
  
  "generatedFor": "practice-session",
  "learnerLevel": "Easy",
  "sourceUrl": "https://leetcode.com/problems/group-anagrams/",
  "sourceQuestionBankId": ObjectId("67a8e0b4c7f9a1b2c3d4e5f9"),
  "isPaired": true,
  
  "userResponse": {
    "attempted": false,
    "solved": null,
    "rating": null,
    "feedback": null,
    "attemptedAt": null
  },
  
  "generationSessionId": "session-1708033251237",
  "generationPromptHash": "abc123hash456def789",
  "geminiModelVersion": "gemini-2.5-flash",
  
  "isEffective": null,
  "questionQualityScore": null,
  "isDuplicate": false,
  "duplicateOfId": null,
  "isHidden": false,
  "flaggedReason": null,
  "platform": "leetcode",
  
  "createdAt": ISODate("2026-02-16T01:03:35.341Z"),
  "updatedAt": ISODate("2026-02-16T01:03:35.341Z")
}
```

### Sample Document 5: Top K Frequent (Medium)
```json
{
  "_id": ObjectId("67a9f1c5d9e8f2c3b4a5c6db"),
  "userId": ObjectId("69920618261497b26786c42c"),
  "topicId": "arrays",
  
  "problemTitle": "Top K Frequent Elements",
  "problemTitleNormalized": "top k frequent elements",
  "topic": "Arrays & Hashing",
  "difficulty": "Medium",
  "primaryConceptTested": "Hash Map + Heap/Bucket Sort",
  
  "whyRecommended": "Final Medium problem to consolidate hash map knowledge. Teaches you to not just store but process hash map data - crucial for interview success.",
  
  "hints": [
    "Count frequency of each element first using a hash map",
    "Use a min heap of size k or bucket sort"
  ],
  
  "approachGuide": "1. Count frequencies with hash map\n2. Use min heap (size k) to track top elements\n   OR use bucket sort with indices as frequencies\n3. Return top k elements",
  
  "generatedFor": "practice-session",
  "learnerLevel": "Easy",
  "sourceUrl": "https://leetcode.com/problems/top-k-frequent-elements/",
  "sourceQuestionBankId": ObjectId("67a8e0b4c7f9a1b2c3d4e5fa"),
  "isPaired": true,
  
  "userResponse": {
    "attempted": false,
    "solved": null,
    "rating": null,
    "feedback": null,
    "attemptedAt": null
  },
  
  "generationSessionId": "session-1708033251237",
  "generationPromptHash": "abc123hash456def789",
  "geminiModelVersion": "gemini-2.5-flash",
  
  "isEffective": null,
  "questionQualityScore": null,
  "isDuplicate": false,
  "duplicateOfId": null,
  "isHidden": false,
  "flaggedReason": null,
  "platform": "leetcode",
  
  "createdAt": ISODate("2026-02-16T01:03:36.782Z"),
  "updatedAt": ISODate("2026-02-16T01:03:36.782Z")
}
```

---

## Key Observations

### 1. **Why Recommended Explanations**
Each question has a **personalized explanation** for why it was generated:
- Relates to user's learning level (Easy/Medium progression)
- Connects to previous questions ("After mastering Two Sum...")
- Explains the learning objective
- Justifies difficulty level

### 2. **Difficulty Progression**
```
Easy (3) → Medium (2)
├─ Two Sum (fundamentals)
├─ Valid Anagram (hash operations)
├─ Contains Duplicate (sets)
├─ Group Anagrams (grouping data)
└─ Top K Frequent (advanced processing)
```

### 3. **Concept Progression**
```
Hash Maps → Character Counting → Sets → Sorting → Heap/Bucketing
```

### 4. **Database Fields That Get Populated**
- ✅ All 30+ fields filled
- ✅ Links to QuestionBank (isPaired: true)
- ✅ Hints and approach guides provided
- ✅ External URLs included
- ✅ Generation metadata recorded
- ✅ Ready for user interaction

### 5. **Ready for Frontend**
Once stored, these can be:
- Displayed in Practice UI
- User can attempt solving
- Progress tracked in userResponse
- Quality evaluated after user finishes
- Feedback collected

---

## Reasons Questions Are "Personalized"

### For shreyash@gmail.com:

1. **Learning Level (Intermediate)**
   - Mix of Easy (3) and Medium (2)
   - Not too hard, not too simple

2. **No Previous Attempts**
   - Starts with fundamentals (Two Sum)
   - Gradual difficulty curve

3. **LeetCode User (code__hard)**
   - All questions source to LeetCode
   - Questions user might recognize
   - Platform-specific solutions

4. **Arrays Topic**
   - Questions directly relevant
   - Covers hash map patterns (essential for arrays)
   - Interview-focused problems

5. **Progression Ready**
   - Two Sum → Valid Anagram (same concept, new angle)
   - Contains Duplicate (simpler than anagram)
   - Then Medium problems for challenge

---

*Expected to see these 5 documents stored in MongoDB once AI Service is running*
