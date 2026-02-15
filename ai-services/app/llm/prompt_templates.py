"""
Prompt Templates for LLM Services
Maintains structured templates for consistent AI responses
"""
from typing import Dict, Optional
from datetime import datetime


class PromptTemplates:
    """Collection of structured prompt templates for different services"""

    @staticmethod
    def mentor_explanation(
        topic: str,
        user_message: str,
        mastery_score: Optional[float] = None,
        current_performance: Optional[str] = None,
    ) -> str:
        """
        Template for mentor-style explanations

        Args:
            topic: Topic being discussed
            user_message: User's question or request
            mastery_score: User's current mastery level (0-1)
            current_performance: Description of current performance level

        Returns:
            Formatted prompt for Gemini
        """
        context = f"""You are an expert AI mentor helping a student prepare for technical interviews.

Topic: {topic}
Student's Question: {user_message}
"""
        if mastery_score is not None:
            level = "beginner" if mastery_score < 0.4 else "intermediate" if mastery_score < 0.7 else "advanced"
            context += f"Student's Current Level: {level} (mastery score: {mastery_score:.1%})\n"

        if current_performance:
            context += f"Current Performance: {current_performance}\n"

        context += """
Please provide:
1. A clear, concise explanation tailored to their level
2. Practical examples relevant to interview scenarios
3. Common mistakes to avoid
4. Suggested areas to focus on for improvement

Be encouraging and supportive. Focus on building confidence while being honest about challenges."""

        return context.strip()

    @staticmethod
    def code_review(
        problem_description: str,
        user_code: str,
        language: str,
        difficulty: str,
        topic: str,
    ) -> str:
        """
        Template for code review and optimization suggestions

        Args:
            problem_description: Description of the coding problem
            user_code: The user's submitted code
            language: Programming language used
            difficulty: Difficulty level of the problem
            topic: Topic area (arrays, strings, trees, etc.)

        Returns:
            Formatted prompt for Gemini
        """
        return f"""You are a senior software engineer reviewing code for a technical interview candidate.

Problem: {problem_description}

Language: {language}
Difficulty: {difficulty}
Topic: {topic}

User's Solution:
```{language}
{user_code}
```

Please provide a professional code review covering:

1. **Correctness**: Does the solution solve the problem correctly?
2. **Time Complexity**: Analyze the time complexity (Big O notation)
3. **Space Complexity**: Analyze the space complexity
4. **Code Quality**: 
   - Readability and structure
   - Variable naming conventions
   - Comments and documentation
5. **Best Practices**:
   - Adherence to {language} conventions
   - Error handling
   - Edge case handling
6. **Optimization Suggestions**:
   - If not optimal, suggest improvements
   - Alternative approaches
   - Trade-offs to consider
7. **Interview Feedback**:
   - What went well
   - Areas for improvement
   - Tips for explaining this solution in an interview

Format your response with clear sections.""".strip()

    @staticmethod
    def interview_follow_up(
        problem_context: str,
        candidate_explanation: str,
        topic: str,
    ) -> str:
        """
        Template for interview-style follow-up questions

        Args:
            problem_context: The coding problem being discussed
            candidate_explanation: Candidate's explanation of their solution
            topic: Topic area

        Returns:
            Formatted prompt for Gemini
        """
        return f"""You are a technical interviewer evaluating a candidate's solution.

Problem Context:
{problem_context}

The candidate's explanation:
{candidate_explanation}

Topic: {topic}

Based on their explanation, do the following:

1. **Generate 2-3 follow-up questions** that would naturally come from an interviewer:
   - Ask about edge cases they may have missed
   - Probe their understanding of the solution deeply
   - Ask about optimization possibilities

2. **Evaluate their reasoning** on:
   - Problem understanding (did they grasp the problem correctly?)
   - Solution approach (is the approach sound?)
   - Communication clarity (how well did they explain it?)
   - Technical depth (did they demonstrate strong technical knowledge?)

3. **Provide a communication score** (1-10) based on:
   - Clarity of explanation
   - Use of technical terminology
   - Ability to convey complex ideas
   - Confidence level demonstrated

Format your response as:
FOLLOW_UP_QUESTIONS:
[List questions here]

REASONING_EVALUATION:
[Your evaluation]

COMMUNICATION_SCORE: [Score 1-10]
[Brief explanation of score]""".strip()

    @staticmethod
    def learning_content_generation(
        topic: str,
        subject: str,
        difficulty_level: str,
        user_knowledge_level: int,
    ) -> str:
        """
        Template for generating learning content

        Args:
            topic: The topic to learn about
            subject: Subject area (DSA, OS, etc.)
            difficulty_level: easy, medium, or hard
            user_knowledge_level: 1-5 scale of user's current knowledge

        Returns:
            Formatted prompt for Gemini
        """
        knowledge_desc = {
            1: "beginner with basic programming knowledge",
            2: "some foundational understanding",
            3: "intermediate understanding",
            4: "strong understanding, looking for advanced concepts",
            5: "expert level, looking for deep insights",
        }.get(user_knowledge_level, "intermediate")

        return f"""Create comprehensive learning material for a student preparing for technical interviews.

Topic: {topic}
Subject: {subject}
Difficulty Level: {difficulty_level}
Student's Current Knowledge Level: {knowledge_desc}

Please generate:

1. **Summary**: A 2-3 paragraph overview of the topic

2. **Key Concepts**: 5-7 essential concepts with brief explanations
   - Order from foundational to advanced
   - Include relevant terminology

3. **Visual Explanation**: ASCII diagrams or pseudocode examples where helpful

4. **Practical Examples**:
   - Real-world applications
   - 2-3 concrete examples from interviews or industry

5. **Flashcards**: 4-5 flashcard pairs (question-answer format)
   - Focus on key definitions and concepts
   - Good for quick review and retention

6. **Practice Questions**: 3-5 practice questions with hints
   - Ensure questions test understanding
   - Use interview-relevant scenarios

7. **Common Mistakes**: Top 3-4 mistakes students make with this topic

8. **Further Learning**: Recommended topics to study next

Format clearly with markdown headers. Focus on practical understanding over theory.""".strip()

    @staticmethod
    def preparation_recommendation_explanation(
        topic: str,
        current_mastery: float,
        weak_signal: Optional[str] = None,
        target_goal: Optional[str] = None,
    ) -> str:
        """
        Template for explaining why a preparation task is recommended

        Args:
            topic: The topic being recommended
            current_mastery: Current mastery score (0-1)
            weak_signal: Description of weak signal if any
            target_goal: User's target goal

        Returns:
            Formatted prompt for Gemini
        """
        context = f"""You are an AI preparation advisor explaining to a student why a specific topic should be studied now.

Topic Being Recommended: {topic}
Current Mastery Level: {current_mastery:.1%}
"""
        if weak_signal:
            context += f"Weak Signal Detected: {weak_signal}\n"
        if target_goal:
            context += f"Target Goal: {target_goal}\n"

        context += """
Explain:
1. **Why This Topic Now**: Why this topic is important to focus on at their current level
2. **Impact on Interviews**: How this topic appears in real technical interviews
3. **Real-World Usage**: Practical applications in industry
4. **Learning Strategy**: Recommended approach to master this topic
5. **Expected Outcomes**: What they should be able to do after learning this

Be motivating and specific. Reference the weak signals to show why this recommendation is personalized for them.
Keep the explanation concise but comprehensive."""

        return context.strip()

    @staticmethod
    def concept_explanation(
        concept: str,
        detail_level: str = "intermediate",
    ) -> str:
        """
        Template for explaining individual concepts

        Args:
            concept: The concept to explain
            detail_level: Level of detail (beginner, intermediate, advanced)

        Returns:
            Formatted prompt for Gemini
        """
        return f"""Explain the concept of '{concept}' at a {detail_level} level.

For a {detail_level} audience, provide:
1. **Definition**: What is this concept?
2. **Why It Matters**: Why is it important?
3. **How It Works**: Step-by-step explanation
4. **Example**: A concrete, easy-to-understand example
5. **Interview Relevance**: How this might appear in a technical interview
6. **Common Pitfalls**: Mistakes to avoid

Keep the explanation clear, practical, and interview-focused.""".strip()

    @staticmethod
    def adaptive_task_generation(
        user_topics_mastery: Dict[str, float],
        weak_topics: list,
        recent_submissions: Optional[str] = None,
    ) -> str:
        """
        Template for generating adaptive practice tasks

        Args:
            user_topics_mastery: Dict of topics and mastery scores
            weak_topics: List of identified weak topics
            recent_submissions: Description of recent practice

        Returns:
            Formatted prompt for Gemini
        """
        mastery_summary = "\n".join(
            [f"- {topic}: {score:.1%}" for topic, score in user_topics_mastery.items()]
        )

        prompt = f"""Generate 3-4 personalized practice task recommendations for a student preparing for technical interviews.

Student's Topic Mastery:
{mastery_summary}

Weak Topics Identified: {", ".join(weak_topics) if weak_topics else "None"}
"""
        if recent_submissions:
            prompt += f"\nRecent Practice Activity: {recent_submissions}\n"

        prompt += """
For each recommendation, provide:
1. **Task**: Specific coding problem or topic to practice
2. **Difficulty**: easy/medium/hard
3. **Reason**: Why this task is recommended for them
4. **Expected Duration**: Estimated time to complete
5. **Learning Outcome**: What they'll gain from this task
6. **Focus Areas**: Specific aspects to pay attention to

Prioritize weak topics and increasing complexity gradually. Make recommendations practical and achievable."""

        return prompt.strip()

    @staticmethod
    def revision_schedule_explanation(
        topic: str,
        last_practice_date: Optional[str] = None,
        current_retention: float = 0.7,
    ) -> str:
        """
        Template for explaining revision schedules (spaced repetition)

        Args:
            topic: The topic being revised
            last_practice_date: When the topic was last practiced
            current_retention: Estimated retention probability (0-1)

        Returns:
            Formatted prompt for Gemini
        """
        prompt = f"""Explain the importance and strategy for revising '{topic}' in the context of technical interview preparation.

"""
        if last_practice_date:
            prompt += f"Last Practiced: {last_practice_date}\n"

        prompt += f"""Estimated Retention Rate: {current_retention:.1%}

Please explain:
1. **Why Revision is Critical**: The science of spaced repetition and memory
2. **This Topic's Relevance**: How often it appears in interviews
3. **Retention Assessment**: Current knowledge retention level
4. **Optimal Revision Strategy**: How to effectively revise this topic
5. **Practical Revision Techniques**: Specific methods to use
6. **Expected Improvement**: Likely outcome of following this revision plan

Be encouraging and explain the cognitive science behind why this revision is important."""

        return prompt.strip()


class PromptBuilder:
    """Helper class for building complex prompts with context"""

    def __init__(self):
        self.context_parts = []

    def add_context(self, key: str, value: str) -> "PromptBuilder":
        """Add a context part to the prompt"""
        if value:
            self.context_parts.append(f"{key}: {value}")
        return self

    def add_system_message(self, message: str) -> "PromptBuilder":
        """Add system-level instructions"""
        self.context_parts.insert(0, f"SYSTEM: {message}")
        return self

    def build(self, main_prompt: str) -> str:
        """Build final prompt with accumulated context"""
        if self.context_parts:
            return f"{chr(10).join(self.context_parts)}\n\n{main_prompt}"
        return main_prompt

    def clear(self) -> "PromptBuilder":
        """Clear accumulated context"""
        self.context_parts = []
        return self


# Convenience functions for common prompt building
def build_mentor_prompt_with_history(
    topic: str,
    user_message: str,
    conversation_context: Optional[str] = None,
    mastery_score: Optional[float] = None,
) -> str:
    """Build mentor prompt with conversation history context"""
    builder = PromptBuilder()

    if conversation_context:
        builder.add_context("Previous Conversation", conversation_context)

    main_prompt = PromptTemplates.mentor_explanation(
        topic=topic,
        user_message=user_message,
        mastery_score=mastery_score,
    )

    return builder.build(main_prompt)
