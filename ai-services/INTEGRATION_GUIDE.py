"""
Integration Example: How to call AI Services from Node.js backend
This shows the request/response format and error handling patterns
"""

# Example Node.js fetch calls (JavaScript/TypeScript)

MENTOR_CHAT_EXAMPLE = """
// Call mentor chat from Node backend
async function chatWithMentor(userId, topic, userMessage, masteryScore) {
  try {
    const response = await fetch('http://localhost:8000/ai/mentor/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        topic,
        userMessage,
        masteryScore,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      conversationId: data.conversationId,
      mentorResponse: data.mentorResponse,
      suggestedActions: data.suggestedActions,
    };
  } catch (error) {
    console.error('Error chatting with mentor:', error);
    throw error;
  }
}

// Retrieve conversation
async function getMentorConversation(conversationId) {
  const response = await fetch(
    `http://localhost:8000/ai/mentor/conversation/${conversationId}`
  );
  return response.json();
}
"""

CODE_REVIEW_EXAMPLE = """
// Call code review from Node backend
async function reviewCode(userId, problemDescription, code, language, difficulty, topic) {
  try {
    const response = await fetch('http://localhost:8000/ai/practice/review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        problemDescription,
        userCode: code,
        language,
        difficulty,
        topic,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      reviewSummary: data.reviewSummary,
      optimizationSuggestions: data.optimizationSuggestions,
      conceptualFeedback: data.conceptualFeedback,
      codeQuality: data.codeQuality,
    };
  } catch (error) {
    console.error('Error reviewing code:', error);
    throw error;
  }
}
"""

INTERVIEW_EXAMPLE = """
// Simulate interview from Node backend
async function simulateInterview(userId, problemContext, explanation, topic, difficulty) {
  try {
    const response = await fetch('http://localhost:8000/ai/interview/simulate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        problemContext,
        candidateExplanation: explanation,
        topic,
        difficulty,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      interviewSessionId: data.interviewSessionId,
      followUpQuestions: data.followUpQuestions,
      communicationScoreEstimate: data.communicationScoreEstimate,
      technicalFeedback: data.technicalFeedback,
      strengths: data.strengths,
      areasForImprovement: data.areasForImprovement,
    };
  } catch (error) {
    console.error('Error simulating interview:', error);
    throw error;
  }
}

// Get interview progress
async function getInterviewProgress(userId) {
  const response = await fetch(
    `http://localhost:8000/ai/interview/progress/${userId}`
  );
  return response.json();
}
"""

LEARNING_EXAMPLE = """
// Generate learning content from Node backend
async function generateLearningContent(topic, subject, difficultyLevel, userKnowledgeLevel) {
  try {
    const response = await fetch('http://localhost:8000/ai/learning/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        subject,
        difficultyLevel,
        userKnowledgeLevel,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      topic: data.topic,
      summary: data.summary,
      keyConcepts: data.keyConcepts,
      flashcards: data.flashcards,
      practiceQuestions: data.practiceQuestions,
      estimatedLearningTime: data.estimatedLearningTime,
    };
  } catch (error) {
    console.error('Error generating learning content:', error);
    throw error;
  }
}

// Get quick summary
async function getQuickSummary(topic) {
  const response = await fetch(
    `http://localhost:8000/ai/learning/summary/${encodeURIComponent(topic)}`
  );
  return response.json();
}

// Explain concept
async function explainConcept(concept, detailLevel = 'intermediate') {
  const response = await fetch(
    `http://localhost:8000/ai/learning/explain/${encodeURIComponent(concept)}?detail_level=${detailLevel}`
  );
  return response.json();
}
"""

HEALTH_CHECK_EXAMPLE = """
// Check if AI services are healthy
async function checkAIServicesHealth() {
  try {
    const response = await fetch('http://localhost:8000/ai/health');
    const data = await response.json();
    
    console.log('AI Services Status:', data.status);
    console.log('Available Services:', {
      mentor: data.mentor,
      practiceReview: data.practice_review,
      interview: data.interview,
      learning: data.learning,
    });
    
    return data.status === 'healthy';
  } catch (error) {
    console.error('Error checking AI services health:', error);
    return false;
  }
}
"""

ENVIRONMENT_SETUP_EXAMPLE = """
# In your Node backend .env file, add:

# AI Services Configuration
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT=60000

# Optional: Use environment-specific URLs
AI_SERVICE_URL_DEV=http://localhost:8000
AI_SERVICE_URL_PROD=https://ai-services.prepmate.com

# Setup for calling AI services in Node:
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Create a utility function for all AI service calls
async function callAIService(endpoint, method = 'POST', body = null) {
  const url = `${AI_SERVICE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '60000'),
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`AI Service error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`AI Service call failed (${endpoint}):`, error);
    // Return graceful fallback or re-throw
    throw error;
  }
}
"""

if __name__ == "__main__":
    print("=== AI SERVICES INTEGRATION GUIDE ===\n")
    print("Mentor Chat Example:")
    print(MENTOR_CHAT_EXAMPLE)
    print("\nCode Review Example:")
    print(CODE_REVIEW_EXAMPLE)
    print("\nInterview Simulation Example:")
    print(INTERVIEW_EXAMPLE)
    print("\nLearning Content Example:")
    print(LEARNING_EXAMPLE)
    print("\nHealth Check Example:")
    print(HEALTH_CHECK_EXAMPLE)
    print("\nEnvironment Setup Example:")
    print(ENVIRONMENT_SETUP_EXAMPLE)
