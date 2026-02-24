"""
Question Generation Service
Uses Groq to generate personalized coding practice questions based on learner profile
"""
import json
import logging
import re
import os
import asyncio
from typing import Optional, List, Dict, Any

from .gemini_client import get_gemini_client

logger = logging.getLogger(__name__)


class QuestionGenerationService:
    """Service for generating personalized coding questions using Multi-Provider LLM Router"""

    @staticmethod
    async def generate_questions(learner_profile: Dict[str, Any], limit: int = 5) -> Dict[str, Any]:
        """
        Generate personalized coding questions based on learner profile
        Uses Gemini (primary) with automatic fallback to Groq/Together AI
        """
        try:
            # Build the prompt
            prompt = QuestionGenerationService._build_generation_prompt(
                learner_profile, limit
            )
            
            logger.info(f"🤖 Generating {limit} questions via LLM Router for {learner_profile.get('topicId', 'Unknown')}")
            
            # Use Gemini client (with automatic multi-provider fallback)
            # Prefer Groq as requested by user for stability and speed
            client = get_gemini_client()
            response_text = await client.generate_content(
                prompt=prompt,
                temperature=0.7,
                max_tokens=3072,
                timeout=25,
                provider='groq',
                retry_count=1
            )
            
            if not response_text or len(response_text) < 10:
                logger.error("LLM returned empty or too short response")
                return {
                    'success': False,
                    'questions': [],
                    'error': 'LLM failed to generate content',
                    'source': None
                }
            
            logger.info(f"[LLM_RESPONSE] Received {len(response_text)} chars")
            
            # Parse the response
            questions = QuestionGenerationService._parse_gemini_response(
                response_text,
                learner_profile
            )
            
            if not questions:
                logger.error("No questions parsed from LLM response")
                return {
                    'success': False,
                    'questions': [],
                    'error': 'No valid questions generated from LLM',
                    'source': None
                }
            
            logger.info(f"Successfully generated {len(questions)} questions")
            return {
                'success': True,
                'questions': questions,
                'generatedAt': str(__import__('datetime').datetime.utcnow()),
                'source': 'llm_router'
            }
            
        except Exception as e:
            logger.error(f"Error in question generation: {str(e)}")
            return {
                'success': False,
                'questions': [],
                'error': f'LLM generation failed: {str(e)}',
                'source': None
            }

    @staticmethod
    def _build_generation_prompt(learner_profile: Dict[str, Any], limit: int) -> str:
        """
        Build detailed prompt for LeetCode-style function-based problem generation
        
        GENERATES:
        - Function metadata (name, parameters, return type)
        - Starter code for multiple languages
        - Wrapper templates for execution
        - Structured test cases with public/hidden visibility
        """
        
        learning_level = learner_profile.get('learningLevel', 'intermediate').lower()
        companies = learner_profile.get('targetCompanies', 'General')
        goal = learner_profile.get('preparationGoal', 'practice')
        topic = learner_profile.get('topicId', 'General')
        mastery = float(learner_profile.get('masteryScore', 0))
        readiness = float(learner_profile.get('progressionReadinessScore', 0))
        weak_subtopics = learner_profile.get('weakSubtopics', 'General concepts')
        mistake_patterns = learner_profile.get('recentMistakePatterns', 'Standard mistakes')
        recommended_difficulty = learner_profile.get('recommendedDifficulty', 'Medium')
        
        # Determine difficulty range based on mastery
        if mastery < 0.3:
            difficulty_focus = "Easy to Medium"
        elif mastery < 0.6:
            difficulty_focus = "Medium"
        else:
            difficulty_focus = "Medium to Hard"
        
        prompt = f"""You are an expert coding interview preparation specialist. Generate {limit} personalized coding practice questions in LeetCode-style format.

CRITICAL: Users write ONLY function implementations. The platform handles everything else via wrappers.

## LEARNER PROFILE
- Learning Level: {learning_level}
- Target Companies: {companies}
- Preparation Goal: {goal}
- Current Topic: {topic}
- Mastery Score: {mastery:.1%}
- Readiness Score: {readiness:.1%}
- Weak Areas: {weak_subtopics}
- Recent Mistakes: {mistake_patterns}

## OUTPUT FORMAT: Structured JSON with ALL required fields

For EACH question, return EXACTLY this structure (no markdown, no code blocks, ONLY JSON):

{{
  "problemTitle": "Two Sum",
  "difficulty": "Easy",
  "description": "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to the target. You may assume each input has exactly one solution, and you cannot use the same element twice.",
  "constraints": "1 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, -10^9 <= target <= 10^9",
  "functionMetadata": {{
    "functionName": "twoSum",
    "parameters": [
      {{"name": "nums", "type": "number[]"}},
      {{"name": "target", "type": "number"}}
    ],
    "returnType": "number[]"
  }},
  "starterCode": {{
    "javascript": "function twoSum(nums, target) {{\\n    \\n}}",
    "python": "def two_sum(nums: list[int], target: int) -> list[int]:\\n    pass",
    "java": "public class Solution {{\\n    public int[] twoSum(int[] nums, int target) {{\\n        \\n    }}\\n}}"
  }},
  "wrapperTemplate": {{
    "javascript": "__USER_CODE__\\nconst input = JSON.parse(process.argv[2]);\\nconst result = twoSum(input.nums, input.target);\\nconsole.log(JSON.stringify(result));",
    "python": "__USER_CODE__\\nimport sys, json\\ninput_data = json.loads(sys.argv[1])\\nresult = two_sum(input_data['nums'], input_data['target'])\\nprint(json.dumps(result))",
    "java": "__USER_CODE__\\npublic class Main {{\\n    public static void main(String[] args) {{\\n        String jsonInput = args[0];\\n        // Parse JSON and call solution...\\n    }}\\n}}"
  }},
  "testCases": [
    {{
      "input": {{"nums": [2,7,11,15], "target": 9}},
      "expectedOutput": [0,1],
      "visibility": "public"
    }},
    {{
      "input": {{"nums": [3,2,4], "target": 6}},
      "expectedOutput": [1,2],
      "visibility": "public"
    }},
    {{
      "input": {{"nums": [3,3], "target": 6}},
      "expectedOutput": [0,1],
      "visibility": "hidden"
    }},
    {{
      "input": {{"nums": [-1000000000, 1000000000], "target": 0}},
      "expectedOutput": [0,1],
      "visibility": "hidden"
    }}
  ]
}}

## REQUIREMENTS FOR EACH QUESTION

1. **problemTitle**: Real problem name (LeetCode-style)
2. **difficulty**: Exactly one of: "Easy", "Medium", "Hard"
3. **description**: Clear problem statement (2-3 sentences)
4. **constraints**: Input/output constraints
5. **functionMetadata**: REQUIRED
   - functionName: camelCase (e.g., "twoSum")
   - parameters: Array with {{name, type}}
   - returnType: Simple type (e.g., "number[]", "string", "int")
6. **starterCode**: REQUIRED for javascript, python, java
   - Use {{}} for braces, not backticks
   - Include "\\n" for newlines
7. **wrapperTemplate**: REQUIRED for each language
   - Must contain exactly "__USER_CODE__" placeholder
   - Handles JSON parsing and function invocation
   - Last line: print/console.log the result as JSON
8. **testCases**: Minimum 2 public + 2 hidden
   - input: JSON object matching function parameters
   - expectedOutput: Exact expected result as JSON
   - visibility: "public" or "hidden"

## GUIDANCE
- Prefer difficulty: {recommended_difficulty}
- Address weak areas: {weak_subtopics}
- Avoid mistake patterns: {mistake_patterns}
- For {companies} interviews, include real-world context
- Mix theory with practical problem-solving
- Test cases must have diverse inputs and edge cases

## VALIDATION RULES
- All fields are REQUIRED
- JSON must be valid (proper escaping)
- functionMetadata must match starterCode signatures
- wrapperTemplate must contain __USER_CODE__
- testCases must be 4+ with proper visibility splits
- Return ONLY raw JSON, no markdown formatting

Generate {limit} diverse, high-quality questions now. Each must be valid JSON on its own:"""
        
        return prompt

    @staticmethod
    def _parse_multiple_json_objects(text: str) -> List[Dict[str, Any]]:
        """
        Parse multiple JSON objects from a single string
        Handles cases like:
        { "key": "value1" }
        { "key": "value2" }
        
        Or with newlines/spacing.
        Uses brace matching to identify object boundaries.
        """
        objects = []
        i = 0
        text = text.strip()
        
        while i < len(text):
            # Skip whitespace
            while i < len(text) and text[i].isspace():
                i += 1
            
            if i >= len(text):
                break
            
            # Start of object must be '{'
            if text[i] != '{':
                logger.warning(f"[PARSE_MULTI] Expected '{{' at position {i}, found '{text[i]}'")
                break
            
            # Find matching closing brace
            brace_count = 0
            start = i
            in_string = False
            escape_next = False
            
            while i < len(text):
                char = text[i]
                
                if escape_next:
                    escape_next = False
                    i += 1
                    continue
                
                if char == '\\':
                    escape_next = True
                    i += 1
                    continue
                
                if char == '"' and not escape_next:
                    in_string = not in_string
                
                if not in_string:
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            # Found matching closing brace
                            obj_str = text[start:i+1]
                            try:
                                obj = json.loads(obj_str)
                                objects.append(obj)
                                logger.debug(f"[PARSE_MULTI] Successfully parsed object {len(objects)}")
                            except json.JSONDecodeError as e:
                                logger.warning(f"[PARSE_MULTI] Failed to parse object: {str(e)[:100]}")
                            break
                
                i += 1
            
            if brace_count != 0:
                logger.warning(f"[PARSE_MULTI] Unmatched braces at position {start}")
                break
            
            i += 1
        
        logger.info(f"[PARSE_MULTI] Extracted {len(objects)} JSON objects from text")
        return objects

    @staticmethod
    def _parse_gemini_response(response_text: str, learner_profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Parse LeetCode-style function-based question responses
        
        VALIDATES:
        - functionMetadata (name, parameters, return type)
        - starterCode (javascript, python, java)
        - wrapperTemplate (each language)
        - testCases (input, expectedOutput, visibility)
        
        REJECTS malformed responses with detailed logging
        """
        try:
            # Remove markdown code blocks if present
            text = response_text.strip()
            logger.info(f"[PARSE] Raw response length: {len(text)} chars")
            logger.info(f"[PARSE] First 200 chars: {text[:200]}")
            
            if text.startswith('```json'):
                text = text[7:]
            if text.startswith('```'):
                text = text[3:]
            if text.endswith('```'):
                text = text[:-3]
            text = text.strip()
            
            logger.info(f"[PARSE] After markdown removal: {len(text)} chars")
            
            # Try to find JSON in the text
            if not text.startswith('[') and not text.startswith('{'):
                # Search for the first '[' or '{'
                array_start = text.find('[')
                object_start = text.find('{')
                
                if array_start != -1 and (object_start == -1 or array_start < object_start):
                    text = text[array_start:]
                    logger.info(f"[PARSE] Found start of array at {array_start}")
                elif object_start != -1:
                    text = text[object_start:]
                    logger.info(f"[PARSE] Found start of object at {object_start}")

            # Handle different JSON formats
            questions = []
            
            if text.startswith('['):
                # JSON array format
                logger.info("[PARSE] Detected JSON array format")
                try:
                    # Find matching closing bracket
                    bracket_count = 0
                    last_bracket = -1
                    for idx, char in enumerate(text):
                        if char == '[': bracket_count += 1
                        elif char == ']':
                            bracket_count -= 1
                            if bracket_count == 0:
                                last_bracket = idx
                                break
                    
                    if last_bracket != -1:
                        text = text[:last_bracket+1]
                    
                    questions = json.loads(text)
                except Exception as e:
                    logger.warning(f"[PARSE] Array parse failed: {str(e)}")
                    # Try fallback to multi-object parsing
                    questions = QuestionGenerationService._parse_multiple_json_objects(text)
            elif text.startswith('{'):
                # Multiple JSON objects format - parse with brace matching
                logger.info("[PARSE] Detected multiple JSON object format (NDJSON)")
                questions = QuestionGenerationService._parse_multiple_json_objects(text)
            else:
                # Try JSONL (one per line)
                logger.info("[PARSE] Trying JSONL (one JSON per line)")
                for line in text.split('\n'):
                    line = line.strip()
                    if line and not line.startswith('//'):
                        try:
                            obj = json.loads(line)
                            questions.append(obj)
                        except Exception as e:
                            logger.debug(f"[PARSE] Line parse failed: {str(e)[:100]}")
                            pass
            
            logger.info(f"[PARSE] Parsed {len(questions)} question objects")
            
            if not isinstance(questions, list):
                questions = [questions] if isinstance(questions, dict) else []
            
            # Validate each question
            validated_questions = []
            for i, q in enumerate(questions):
                if not isinstance(q, dict):
                    logger.warning(f"[VALIDATE] Q{i}: Not a dict (type={type(q).__name__}), skipping")
                    continue
                
                problem_title = q.get('problemTitle', 'Unknown')
                logger.info(f"[VALIDATE] Q{i}: {problem_title}")
                
                # STRICT VALIDATION: All required fields must exist
                required_fields = [
                    'problemTitle',
                    'difficulty',
                    'description',
                    'constraints',
                    'functionMetadata',
                    'starterCode',
                    'wrapperTemplate',
                    'testCases'
                ]
                
                missing_fields = [f for f in required_fields if f not in q]
                if missing_fields:
                    logger.warning(f"[VALIDATE] Q{i} ({problem_title}): Missing fields {missing_fields}, skipping")
                    continue
                
                # Validate functionMetadata
                func_meta = q.get('functionMetadata', {})
                if not isinstance(func_meta, dict):
                    logger.warning(f"[VALIDATE] Q{i}: functionMetadata is not a dict, skipping")
                    continue
                
                func_required = ['functionName', 'parameters', 'returnType']
                func_missing = [f for f in func_required if f not in func_meta]
                if func_missing:
                    logger.warning(f"[VALIDATE] Q{i}: functionMetadata missing {func_missing}, skipping")
                    continue
                
                # Validate starterCode (relaxed: at least python or javascript)
                starter = q.get('starterCode', {})
                if not isinstance(starter, dict):
                    logger.warning(f"Question {i}: starterCode is not dict, generating default")
                    starter = {}
                
                # Provide defaults for at least Python and JavaScript
                if not starter.get('python') and not starter.get('javascript'):
                    func_name = func_meta.get('functionName', 'solve')
                    starter['python'] = f"def {func_name}(**kwargs):\n    pass"
                    starter['javascript'] = f"function {func_name}(input) {{\n    // TODO: Implement\n}}"
                
                q['starterCode'] = starter
                
                # Validate wrapperTemplate (relaxed: at least python or javascript)
                wrapper = q.get('wrapperTemplate', {})
                if not isinstance(wrapper, dict):
                    logger.warning(f"Question {i}: wrapperTemplate is not dict, generating default")
                    wrapper = {}
                
                # Provide defaults with __USER_CODE__ placeholder
                if not wrapper.get('python') and not wrapper.get('javascript'):
                    wrapper['python'] = "__USER_CODE__\nimport sys, json\nresult = solve({})\nprint(json.dumps(result))"
                    wrapper['javascript'] = "__USER_CODE__\nconst input = {};\nconst result = solve(input);\nconsole.log(JSON.stringify(result));"
                
                # Ensure __USER_CODE__ is in all templates
                for lang, tmpl in wrapper.items():
                    if '__USER_CODE__' not in str(tmpl):
                        logger.warning(f"Question {i}: wrapperTemplate[{lang}] missing __USER_CODE__, adding it")
                        wrapper[lang] = f"__USER_CODE__\n{tmpl}"
                
                q['wrapperTemplate'] = wrapper
                
                # Validate & normalize testCases
                test_cases = q.get('testCases', [])
                if not isinstance(test_cases, list):
                    logger.warning(f"[VALIDATE] Q{i}: testCases is not a list (type={type(test_cases).__name__}), skipping")
                    continue
                
                # Minimum 1 test case (relaxed from 4)
                if len(test_cases) < 1:
                    logger.warning(f"[VALIDATE] Q{i}: testCases must have at least 1, got {len(test_cases)}, skipping")
                    continue
                
                logger.info(f"[VALIDATE] Q{i}: Has {len(test_cases)} test cases")
                
                # Normalize test cases
                valid_tests = []
                for j, tc in enumerate(test_cases):
                    if not isinstance(tc, dict):
                        logger.warning(f"[VALIDATE] Q{i}: testCase[{j}] is not dict (type={type(tc).__name__}), skipping this test case")
                        continue
                    
                    # Ensure all required fields exist
                    if 'input' not in tc:
                        tc['input'] = {}
                    if 'expectedOutput' not in tc and 'output' not in tc:
                        tc['expectedOutput'] = {}
                    elif 'output' in tc and 'expectedOutput' not in tc:
                        tc['expectedOutput'] = tc['output']
                    
                    if 'visibility' not in tc:
                        tc['visibility'] = 'public' if j == 0 else ('hidden' if j > 2 else 'public')
                    elif tc.get('visibility') not in ['public', 'hidden']:
                        tc['visibility'] = 'public'
                    
                    valid_tests.append(tc)
                
                if not valid_tests:
                    logger.warning(f"[VALIDATE] Q{i}: No valid test cases after normalization, skipping")
                    continue
                
                logger.info(f"[VALIDATE] Q{i}: {len(valid_tests)} test cases passed validation")
                q['testCases'] = valid_tests
                
                # Validate difficulty
                difficulty = q.get('difficulty', 'Medium').strip().capitalize()
                if difficulty not in ['Easy', 'Medium', 'Hard']:
                    logger.warning(f"Question {i}: Invalid difficulty '{difficulty}', using 'Medium'")
                    difficulty = 'Medium'
                q['difficulty'] = difficulty
                
                # Add metadata
                q['learnerLevel'] = learner_profile.get('learningLevel', 'intermediate').lower()
                q['generatedFor'] = learner_profile.get('topicId', 'Unknown')
                
                # Add backward-compatible fields for fallback
                q['primaryConceptTested'] = func_meta.get('functionName', 'unknown')
                q['topic'] = q.get('topic', learner_profile.get('topicId', 'General'))
                q['whyRecommended'] = q.get('description', '')[:200]  # First 200 chars
                q['hints'] = q.get('hints', [])
                q['approachGuide'] = q.get('description', '')
                
                # IMPORTANT: Add problemId for database lookups
                # Generate from title if not provided by LLM
                # MUST MATCH Node.js slug algorithm exactly for database consistency
                if 'problemId' not in q:
                    import re
                    title = q.get('problemTitle', 'problem').lower()
                    # Step 1: Replace spaces and underscores with hyphens
                    slug = title.replace(' ', '-').replace('_', '-')
                    # Step 2: Remove special characters (keep only alphanumeric and hyphens)
                    slug = re.sub(r'[^a-z0-9-]', '', slug)
                    # Step 3: Collapse multiple consecutive hyphens into single hyphen
                    slug = re.sub(r'-+', '-', slug)
                    # Step 4: Strip leading and trailing hyphens
                    slug = slug.strip('-')
                    q['problemId'] = slug
                
                validated_questions.append(q)
                logger.info(f"✅ Question {i}: {q.get('problemTitle', 'Unknown')} (ID: {q.get('problemId', 'unknown')})")
            
            if not validated_questions:
                logger.error(f"❌ No valid structured questions parsed. Total questions: {len(questions)}")
            
            return validated_questions
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse JSON response: {str(e)}")
            logger.debug(f"Response text (first 500 chars): {response_text[:500]}")
            return []
        except Exception as e:
            logger.error(f"❌ Error parsing response: {str(e)}")
            import traceback
            logger.debug(traceback.format_exc())
            return []

    @staticmethod
    def get_fallback_questions(learner_profile: Dict[str, Any], limit: int = 5) -> List[Dict[str, Any]]:
        """
        Return fallback questions when Gemini is unavailable
        These are generic well-known problems suitable for the topic
        Ensures learnerLevel is always included
        Provides multiple questions per topic to meet limit
        """
        topic = learner_profile.get('topicId', 'General').lower()
        difficulty = learner_profile.get('recommendedDifficulty', 'Medium')
        learner_level = learner_profile.get('learningLevel', 'intermediate').lower()
        
        # Comprehensive topic-specific fallback questions (5+ per topic)
        fallback_map = {
            'arrays': [
                {
                    'problemTitle': 'Two Sum',
                    'topic': 'Hash Table',
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Hash table lookup',
                    'whyRecommended': 'Fundamental array problem using hash tables',
                    'hints': ['Use a hash table', 'Store complements'],
                    'approachGuide': 'Single pass with hash table',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Best Time to Buy and Sell Stock',
                    'topic': 'Dynamic Programming',
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Tracking min value',
                    'whyRecommended': 'Classic array problem with optimization',
                    'hints': ['Track minimum price seen', 'Track maximum profit'],
                    'approachGuide': 'Single pass tracking min and max profit',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Contains Duplicate',
                    'topic': 'Hash Set',
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Duplicate detection with hash set',
                    'whyRecommended': 'Essential for identifying duplicate elements efficiently',
                    'hints': ['Use a set to track seen elements', 'Single pass solution'],
                    'approachGuide': 'Iterate through array, check if element in set, add to set',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Product of Array Except Self',
                    'topic': 'Dynamic Programming',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'Prefix and suffix products',
                    'whyRecommended': 'Teaches prefix/suffix pattern important for many problems',
                    'hints': ['Use prefix and suffix products', 'Two pass solution'],
                    'approachGuide': 'Compute left products then right products in separate passes',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Maximum Subarray',
                    'topic': 'Dynamic Programming',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'Kadane algorithm',
                    'whyRecommended': 'Classic DP problem teaching greedy approach',
                    'hints': ['Track max ending here', 'Track global max'],
                    'approachGuide': 'Kadane algorithm: track max sum ending at each position',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                }
            ],
            'strings': [
                {
                    'problemTitle': 'Longest Substring Without Repeating Characters',
                    'topic': 'Sliding Window',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'Sliding window technique',
                    'whyRecommended': 'Classic string problem using sliding window',
                    'hints': ['Use a hash map to track characters', 'Use two pointers'],
                    'approachGuide': 'Sliding window with character tracking',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Valid Anagram',
                    'topic': 'Hash Table',
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Character frequency counting',
                    'whyRecommended': 'Fundamental string problem teaching frequency analysis',
                    'hints': ['Count character frequencies', 'Compare with sorted strings'],
                    'approachGuide': 'Sort both strings and compare or use hash map for counts',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Palindrome String',
                    'topic': 'Two Pointers',
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Two pointer technique',
                    'whyRecommended': 'Core technique for many string problems',
                    'hints': ['Use two pointers from start and end', 'Move towards center'],
                    'approachGuide': 'Two pointer approach: compare from both ends moving inward',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Regular Expression Matching',
                    'topic': 'Dynamic Programming',
                    'difficulty': 'Hard',
                    'primaryConceptTested': 'DP with pattern matching',
                    'whyRecommended': 'Advanced string DP problem',
                    'hints': ['Use DP table', 'Handle . and * patterns'],
                    'approachGuide': 'Build DP table to track pattern matches',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Group Anagrams',
                    'topic': 'Hash Table',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'Grouping with hash table',
                    'whyRecommended': 'Teaches key formation for grouping problems',
                    'hints': ['Sort characters as key', 'Group by sorted string'],
                    'approachGuide': 'Group strings by their sorted character representation',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                }
            ],
            'trees': [
                {
                    'problemTitle': 'Binary Tree Level Order Traversal',
                    'topic': 'Tree Traversal',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'BFS traversal',
                    'whyRecommended': 'Fundamental tree traversal pattern',
                    'hints': ['Use a queue for BFS', 'Process level by level'],
                    'approachGuide': 'BFS with queue to traverse level by level',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Maximum Depth of Binary Tree',
                    'topic': 'Tree Traversal',
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Tree height calculation',
                    'whyRecommended': 'Basic tree traversal problem',
                    'hints': ['Use DFS recursion', 'Track max depth'],
                    'approachGuide': 'Recursive DFS: 1 + max(left_depth, right_depth)',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Invert Binary Tree',
                    'topic': 'Tree Traversal',
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Tree transformation',
                    'whyRecommended': 'Basic tree manipulation',
                    'hints': ['Swap left and right children', 'Recursive approach'],
                    'approachGuide': 'Recursively swap left and right children for all nodes',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Path Sum',
                    'topic': 'DFS',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'DFS path tracking',
                    'whyRecommended': 'Core DFS pattern for path finding',
                    'hints': ['Use DFS with running sum', 'Check at leaf nodes'],
                    'approachGuide': 'DFS accumulating sum along paths, check at leaves',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Lowest Common Ancestor',
                    'topic': 'Tree Traversal',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'LCA algorithm',
                    'whyRecommended': 'Important tree concept for interviews',
                    'hints': ['Post-order traversal', 'Return node if p or q found'],
                    'approachGuide': 'Recursively search subtrees, LCA is where both found',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                }
            ],
            'graphs': [
                {
                    'problemTitle': 'Number of Islands',
                    'topic': 'Graph Traversal',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'DFS/BFS connected components',
                    'whyRecommended': 'Classic graph connectivity problem',
                    'hints': ['Mark visited cells', 'Count connected components'],
                    'approachGuide': 'DFS or BFS to explore each island, count them',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Clone Graph',
                    'topic': 'Graph Traversal',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'Graph cloning with DFS/BFS',
                    'whyRecommended': 'Tests deep understanding of graph structures',
                    'hints': ['Use hash map for visited nodes', 'Clone while traversing'],
                    'approachGuide': 'DFS/BFS with hash map to map old nodes to cloned nodes',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Course Schedule',
                    'topic': 'Topological Sort',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'Cycle detection',
                    'whyRecommended': 'Important graph pattern for dependency problems',
                    'hints': ['Detect cycle in directed graph', 'Use DFS or topological sort'],
                    'approachGuide': 'DFS to detect cycle using visited/recursion states',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Word Ladder',
                    'topic': 'BFS',
                    'difficulty': 'Hard',
                    'primaryConceptTested': 'BFS shortest path',
                    'whyRecommended': 'Advanced BFS application',
                    'hints': ['Build graph implicitly', 'Use BFS for shortest path'],
                    'approachGuide': 'BFS from start word, build neighbors on the fly',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Alien Dictionary',
                    'topic': 'Topological Sort',
                    'difficulty': 'Hard',
                    'primaryConceptTested': 'Topological ordering',
                    'whyRecommended': 'Advanced graph algorithm',
                    'hints': ['Build directed graph', 'Topological sort gives order'],
                    'approachGuide': 'Build graph from character pairs, topological sort',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                }
            ],
            'dynamic_programming': [
                {
                    'problemTitle': 'Coin Change',
                    'topic': 'DP',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'DP memoization',
                    'whyRecommended': 'Classic DP problem for building intuition',
                    'hints': ['Use memoization', 'Consider all coin denominations'],
                    'approachGuide': 'Bottom-up DP: dp[i] = min coins to make amount i',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Longest Increasing Subsequence',
                    'topic': 'DP',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'DP subsequence problems',
                    'whyRecommended': 'Fundamental DP pattern',
                    'hints': ['DP[i] = longest increasing ending at i', 'Compare all previous'],
                    'approachGuide': 'For each element, check all previous for LIS ending there',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'House Robber',
                    'topic': 'DP',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'DP transitions',
                    'whyRecommended': 'Classic DP transition problem',
                    'hints': ['Rob house i or skip it', 'Take max of two choices'],
                    'approachGuide': 'DP[i] = max(rob i + dp[i-2], skip i + dp[i-1])',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Word Break',
                    'topic': 'DP',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'DP string segmentation',
                    'whyRecommended': 'Important DP pattern for string problems',
                    'hints': ['DP[i] = can we form s[0:i]', 'Check all valid break points'],
                    'approachGuide': 'For each position, check if any prefix in dict and rest is valid',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Edit Distance',
                    'topic': 'DP',
                    'difficulty': 'Hard',
                    'primaryConceptTested': '2D DP',
                    'whyRecommended': 'Classic 2D DP problem',
                    'hints': ['DP[i][j] = min edits for s1[0:i] to s2[0:j]', 'Consider insert/delete/replace'],
                    'approachGuide': '2D DP: dp[i][j] = 0 if match, else 1 + min(3 operations)',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                }
            ],
            'linked_lists': [
                {
                    'problemTitle': 'Reverse Linked List',
                    'topic': 'Linked List',
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Pointer manipulation',
                    'whyRecommended': 'Fundamental linked list operation',
                    'hints': ['Use three pointers for tracking', 'Reverse in single pass'],
                    'approachGuide': 'Iterative reversal with pointer manipulation',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Merge Two Sorted Lists',
                    'topic': 'Linked List',
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Merging linked lists',
                    'whyRecommended': 'Core technique for merge sort on linked lists',
                    'hints': ['Two pointers for each list', 'Compare and append'],
                    'approachGuide': 'Compare nodes from both lists, append smaller one',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Linked List Cycle',
                    'topic': 'Linked List',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'Cycle detection with Floyd algorithm',
                    'whyRecommended': 'Important linked list pattern',
                    'hints': ['Fast and slow pointers', 'Detect when they meet'],
                    'approachGuide': 'Floyd cycle detection: slow and fast pointers',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Remove Nth Node From End',
                    'topic': 'Linked List',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'Two pointer technique',
                    'whyRecommended': 'Tests pointer manipulation skills',
                    'hints': ['Two pass: count then remove', 'Or two pointer with gap'],
                    'approachGuide': 'Use gap between two pointers to find node to remove',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Reorder List',
                    'topic': 'Linked List',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'List manipulation',
                    'whyRecommended': 'Tests multiple linked list operations',
                    'hints': ['Find middle', 'Reverse second half', 'Interleave'],
                    'approachGuide': 'Find middle, reverse second half, merge alternately',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                }
            ],
            'heap': [
                {
                    'problemTitle': 'Kth Largest Element',
                    'topic': 'Heap',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'Min heap for kth largest',
                    'whyRecommended': 'Classic heap application',
                    'hints': ['Maintain min heap of size k', 'Top element is kth largest'],
                    'approachGuide': 'Use min heap of size k, return heap top',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Merge K Sorted Lists',
                    'topic': 'Heap',
                    'difficulty': 'Hard',
                    'primaryConceptTested': 'Min heap with custom comparison',
                    'whyRecommended': 'Advanced heap application',
                    'hints': ['Use min heap of list nodes', 'Pop and push while merging'],
                    'approachGuide': 'Min heap of (value, list_index) tuples',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Top K Frequent Elements',
                    'topic': 'Heap',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'Heap with frequency counts',
                    'whyRecommended': 'Combines hash map with heap',
                    'hints': ['Count frequencies with hash map', 'Use min heap of size k'],
                    'approachGuide': 'Count frequencies, use heap to get k most frequent',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Reorganize String',
                    'topic': 'Heap',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'Heap for rearrangement',
                    'whyRecommended': 'Creative heap usage',
                    'hints': ['Greedily pick most frequent', 'Alternate with next frequent'],
                    'approachGuide': 'Max heap of characters by frequency, alternate placement',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Sliding Window Maximum',
                    'topic': 'Heap/Deque',
                    'difficulty': 'Hard',
                    'primaryConceptTested': 'Sliding window with heap',
                    'whyRecommended': 'Advanced sliding window pattern',
                    'hints': ['Maintain max in window', 'Remove out-of-window elements'],
                    'approachGuide': 'Use heap or deque to track max in sliding window',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                }
            ],
            'math': [
                {
                    'problemTitle': 'Reverse Integer',
                    'topic': 'Math',
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Integer manipulation',
                    'whyRecommended': 'Basic integer operation',
                    'hints': ['Use modulo and division', 'Handle overflow'],
                    'approachGuide': 'Extract digits with % 10, build reversed number',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Palindrome Number',
                    'topic': 'Math',
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Number comparison',
                    'whyRecommended': 'Tests number manipulation',
                    'hints': ['Convert to string or reverse', 'Compare'],
                    'approachGuide': 'Reverse the number and compare with original',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Plus One',
                    'topic': 'Math/Array',
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Carry propagation',
                    'whyRecommended': 'Tests array/math combination',
                    'hints': ['Handle carry', 'Handle overflow to next digit'],
                    'approachGuide': 'Iterate from right to left, handle carry, prepend 1 if needed',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Power of Three',
                    'topic': 'Math',
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Power properties',
                    'whyRecommended': 'Tests mathematical properties',
                    'hints': ['Repeatedly divide by 3', 'Check if result is 1'],
                    'approachGuide': 'Keep dividing by 3 while divisible, check if reaches 1',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Integer Break',
                    'topic': 'Math/DP',
                    'difficulty': 'Medium',
                    'primaryConceptTested': 'Optimization with math',
                    'whyRecommended': 'Combines math and DP thinking',
                    'hints': ['Break into factors', 'Optimize product'],
                    'approachGuide': 'Mathematical insight: use 3s and 2s for max product',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                }
            ]
        }
        
        # Get topic-specific questions or use generic fallback
        topic_questions = fallback_map.get(topic, [])
        if not topic_questions:
            topic_questions = [
                {
                    'problemTitle': 'Two Sum',
                    'topic': learner_profile.get('topicId', 'General'),
                    'difficulty': difficulty,
                    'primaryConceptTested': 'Problem Solving',
                    'whyRecommended': 'Classic interview problem for skill assessment',
                    'hints': ['Think about data structures', 'Consider tradeoffs'],
                    'approachGuide': 'Choose optimal data structure based on constraints',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                },
                {
                    'problemTitle': 'Reverse String',
                    'topic': learner_profile.get('topicId', 'General'),
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Basic operations',
                    'whyRecommended': 'Foundational problem for any topic area',
                    'hints': ['Use built-in functions or two pointers'],
                    'approachGuide': 'Utilize language features or manual reversal',
                    'learnerLevel': learner_level,
                    'generatedFor': topic,
                }
            ]
        
        # Return up to limit questions (fall back map now has 5+ per topic)
        result = topic_questions[:limit]
        
        # ✅ CRITICAL: Generate problemId for each fallback question
        # MUST use EXACT same algorithm as Node.js backend
        import re
        for q in result:
            if 'problemId' not in q:
                title = q.get('problemTitle', 'problem').lower()
                # Step 1: Replace spaces and underscores with hyphens
                slug = title.replace(' ', '-').replace('_', '-')
                # Step 2: Remove special characters
                slug = re.sub(r'[^a-z0-9-]', '', slug)
                # Step 3: Collapse multiple hyphens
                slug = re.sub(r'-+', '-', slug)
                # Step 4: Strip leading/trailing hyphens
                slug = slug.strip('-')
                q['problemId'] = slug
                logger.debug(f"✅ Generated fallback problemId: {q['problemId']}")
        
        logger.info(f"Returning {len(result)} fallback questions for topic '{topic}' (limit={limit})")
        return result
