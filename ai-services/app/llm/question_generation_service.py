"""
Question Generation Service
Uses Gemini to generate personalized coding practice questions based on learner profile
"""
import json
import logging
import re
from typing import Optional, List, Dict, Any
from .gemini_client import get_gemini_client

logger = logging.getLogger(__name__)


class QuestionGenerationService:
    """Service for generating personalized coding questions using Gemini LLM"""

    @staticmethod
    async def generate_questions(learner_profile: Dict[str, Any], limit: int = 5) -> Dict[str, Any]:
        """
        Generate personalized coding questions based on learner profile using Gemini
        
        Args:
            learner_profile: Dict containing user's learning context:
                - learningLevel: 'beginner' | 'intermediate' | 'advanced'
                - targetCompanies: comma-separated company names
                - preparationGoal: 'interview' | 'practice' | 'learning'
                - topicId: Name of the topic
                - masteryScore: 0-1 (ML-based mastery)
                - progressionReadinessScore: 0-1 (database readiness)
                - weakSubtopics: comma-separated weak areas
                - recentMistakePatterns: common mistakes
                - recommendedDifficulty: 'Easy' | 'Medium' | 'Hard'
                - desiredQuestionCount: number of questions
            limit: Maximum number of questions to generate
            
        Returns:
            {
                'success': bool,
                'questions': [
                    {
                        'problemTitle': str,
                        'topic': str,
                        'difficulty': str,
                        'primaryConceptTested': str,
                        'whyRecommended': str,
                        'hints': [str],
                        'approachGuide': str
                    }
                ],
                'error': Optional[str]
            }
        """
        try:
            client = get_gemini_client()
            if not client or not client.available:
                logger.warning("Gemini client not available, using fallback")
                fallback = QuestionGenerationService.get_fallback_questions(learner_profile, limit)
                return {
                    'success': True,
                    'questions': fallback,
                    'error': 'Gemini service unavailable - using fallback',
                    'source': 'fallback'
                }

            # Build the prompt
            prompt = QuestionGenerationService._build_generation_prompt(
                learner_profile, limit
            )
            
            logger.info(f"Generating {limit} personalized questions for {learner_profile.get('topicId', 'Unknown')}")
            
            # Call Gemini to generate questions
            response_text = await client.generate_response(
                prompt,
                temperature=0.7,
                max_tokens=4096
            )
            
            # Parse the response
            questions = QuestionGenerationService._parse_gemini_response(
                response_text,
                learner_profile
            )
            
            if not questions:
                logger.warning("No questions parsed from Gemini response, using fallback")
                fallback = QuestionGenerationService.get_fallback_questions(learner_profile, limit)
                return {
                    'success': True,
                    'questions': fallback,
                    'error': 'No valid questions generated - using fallback',
                    'source': 'fallback'
                }
            
            logger.info(f"Successfully generated {len(questions)} questions")
            return {
                'success': True,
                'questions': questions,
                'generatedAt': str(__import__('datetime').datetime.utcnow()),
                'source': 'gemini'
            }
            
        except Exception as e:
            logger.error(f"Error in question generation: {str(e)}")
            # Fallback to database questions
            fallback = QuestionGenerationService.get_fallback_questions(learner_profile, limit)
            return {
                'success': True,
                'questions': fallback,
                'error': f'Gemini error: {str(e)} - using fallback',
                'source': 'fallback'
            }

    @staticmethod
    def _build_generation_prompt(learner_profile: Dict[str, Any], limit: int) -> str:
        """
        Build detailed prompt for Gemini to generate questions
        
        Prompt structure:
        1. Learner Profile Context
        2. Topic & Difficulty Guidance
        3. Weak Areas Focus
        4. Company-Specific Focus
        5. Detailed Requirements
        6. Output Format
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
        
        prompt = f"""You are an expert coding interview preparation specialist. Generate {limit} personalized coding practice questions based on the following learner profile.

## LEARNER PROFILE
- Learning Level: {learning_level}
- Target Companies: {companies}
- Preparation Goal: {goal}
- Current Topic: {topic}
- Mastery Score: {mastery:.1%}
- Readiness Score: {readiness:.1%}
- Weak Areas: {weak_subtopics}
- Recent Mistakes: {mistake_patterns}

## DIFFICULTY GUIDANCE
- Recommended Difficulty Range: {difficulty_focus}
- System Recommended: {recommended_difficulty}
- Strategy: Focus on {weak_subtopics} areas to build mastery

## REQUIREMENTS FOR EACH QUESTION
1. **Problem Title**: Real problem name (or conceptually similar)
2. **Topic**: The specific topic/concept (e.g., "Arrays", "Dynamic Programming")
3. **Difficulty**: Easy, Medium, or Hard (prefer {recommended_difficulty})
4. **Primary Concept**: The main concept being tested (align with weak areas if possible)
5. **Why Recommended**: Personalized explanation (2-3 sentences) why this is good for this user
   - Consider their weak areas: {weak_subtopics}
   - Consider their mistakes: {mistake_patterns}
   - Consider their target companies if relevant
6. **Hints**: 2-3 hints to guide solving without spoiling
7. **Approach Guide**: Brief high-level approach (1-2 sentences)

## GUIDANCE
- If weak area is "{weak_subtopics}", prioritize questions that test this
- If recent mistakes are "{mistake_patterns}", focus on questions that avoid these
- For {companies} interviews, include appropriate real-world context
- Questions should be suitable for {learning_level} level
- Mix theory with practical problem-solving

## OUTPUT FORMAT
Return a JSON array with exactly {limit} questions. Each question must have these exact fields:
- problemTitle (string)
- topic (string)
- difficulty (string: "Easy"|"Medium"|"Hard")
- primaryConceptTested (string)
- whyRecommended (string, 2-3 sentences specific to this user)
- hints (array of 2-3 strings)
- approachGuide (string, 1-2 sentences)

Return ONLY valid JSON array, no markdown formatting, no code blocks, no extra text.
Example format:
[
  {{
    "problemTitle": "Two Sum",
    "topic": "Hash Table",
    "difficulty": "Easy",
    "primaryConceptTested": "Hash table lookup",
    "whyRecommended": "Perfect for building hash table fundamentals, addresses your weakness in lookup optimization",
    "hints": ["Consider storing values in a hash table", "What can you use as key?"],
    "approachGuide": "Use a hash table to store complements, single pass through array"
  }}
]

Generate {limit} diverse, high-quality questions now:"""
        
        return prompt

    @staticmethod
    def _parse_gemini_response(response_text: str, learner_profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Parse Gemini response to extract structured questions
        Handles various response formats and validates structure
        """
        try:
            # Remove markdown code blocks if present
            text = response_text.strip()
            if text.startswith('```json'):
                text = text[7:]
            if text.startswith('```'):
                text = text[3:]
            if text.endswith('```'):
                text = text[:-3]
            text = text.strip()
            
            # Parse JSON
            questions = json.loads(text)
            
            if not isinstance(questions, list):
                logger.warning("Gemini response is not a list, wrapping it")
                questions = [questions] if isinstance(questions, dict) else []
            
            # Validate and clean questions
            validated_questions = []
            for i, q in enumerate(questions):
                if not isinstance(q, dict):
                    logger.warning(f"Question {i} is not a dict, skipping")
                    continue
                
                # Ensure required fields
                required_fields = [
                    'problemTitle', 'topic', 'difficulty',
                    'primaryConceptTested', 'whyRecommended'
                ]
                
                if not all(field in q for field in required_fields):
                    logger.warning(f"Question {i} missing required fields, skipping")
                    continue
                
                # Validate difficulty
                difficulty = q.get('difficulty', 'Medium').strip().capitalize()
                if difficulty not in ['Easy', 'Medium', 'Hard']:
                    difficulty = 'Medium'
                    q['difficulty'] = difficulty
                
                # Ensure hints and approach guide
                if 'hints' not in q:
                    q['hints'] = []
                if not isinstance(q['hints'], list):
                    q['hints'] = [q['hints']]
                
                if 'approachGuide' not in q:
                    q['approachGuide'] = ''
                
                # Add generation context
                q['generatedFor'] = learner_profile.get('topicId', 'Unknown')
                q['learnerLevel'] = learner_profile.get('learningLevel', 'intermediate')
                
                validated_questions.append(q)
            
            return validated_questions
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini JSON response: {str(e)}")
            logger.debug(f"Response text: {response_text[:500]}")
            return []
        except Exception as e:
            logger.error(f"Error parsing Gemini response: {str(e)}")
            return []

    @staticmethod
    def get_fallback_questions(learner_profile: Dict[str, Any], limit: int = 5) -> List[Dict[str, Any]]:
        """
        Return fallback questions when Gemini is unavailable
        These are generic well-known problems suitable for the topic
        """
        topic = learner_profile.get('topicId', 'General').lower()
        difficulty = learner_profile.get('recommendedDifficulty', 'Medium')
        
        # Topic-specific fallback questions
        fallback_map = {
            'arrays': [
                {
                    'problemTitle': 'Two Sum',
                    'topic': 'Hash Table',
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Hash table lookup',
                    'whyRecommended': 'Fundamental array problem using hash tables',
                    'hints': ['Use a hash table', 'Store complements'],
                    'approachGuide': 'Single pass with hash table'
                },
                {
                    'problemTitle': 'Best Time to Buy and Sell Stock',
                    'topic': 'Dynamic Programming',
                    'difficulty': 'Easy',
                    'primaryConceptTested': 'Tracking min value',
                    'whyRecommended': 'Classic array problem with optimization',
                    'hints': ['Track minimum price seen', 'Track maximum profit'],
                    'approachGuide': 'Single pass tracking min and max profit'
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
                    'approachGuide': 'Sliding window with character tracking'
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
                    'approachGuide': 'BFS with queue to traverse level by level'
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
                    'approachGuide': 'Choose optimal data structure based on constraints'
                }
            ]
        
        return topic_questions[:limit]
