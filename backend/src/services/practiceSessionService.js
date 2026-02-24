/**
 * Practice Session Service
 * 
 * Orchestrates practice session workflows:
 * - Submitting code to RapidAPI Judge0
 * - Calling FastAPI AI endpoints for hints, reviews, suggestions
 * - Tracking LLM costs and usage
 * - Enqueuing ML jobs for async processing
 * - Updating PracticeSession with results
 */

import axios from 'axios';
import { JobQueueService } from './JobQueueService.js';
import AIObservabilityService from './AIObservabilityService.js';
import logger from '../utils/logger.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001';
const MAX_RETRIES = 3;

/**
 * Helper to call FastAPI endpoints with retry logic
 */
async function callAIEndpoint(endpoint, method = 'POST', data = null) {
  let lastError;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const config = {
        method,
        url: `${AI_SERVICE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      };

      if (data) {
        config.data = data;
      }

      logger.info(`[AI Service] ${method} ${endpoint} (attempt ${attempt}/${MAX_RETRIES})`);
      const response = await axios(config);
      
      return {
        success: true,
        data: response.data,
        statusCode: response.status,
      };
    } catch (error) {
      lastError = error;
      logger.error(`[AI Service] Error on attempt ${attempt}: ${error.message}`);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw new Error(`AI Service call failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

/**
 * Submit practice code solution
 * 1. Run in Judge0 sandbox (with Idempotency protection)
 * 2. Track results
 * 3. Enqueue ML jobs
 * 4. Stream code review and scoring
 */
export async function submitPractice(session, code, explanation = '', voiceTranscript = '') {
  try {
    logger.info(`📝 Submitting practice for session ${session._id}`);

    // Check idempotency - prevent duplicate submissions
    if (session.idempotencyKey && session.submissionResult?.verdict !== 'pending') {
      logger.warn(`⚠️ Submission already processed for session ${session._id}`);
      return session.submissionResult;
    }

    // Update session with code
    session.code = code;
    session.explanation = explanation;
    session.voice_transcript = voiceTranscript;
    session.lastActivityAt = new Date();
    session.telemetry.solve_time = Math.floor((Date.now() - session.createdAt.getTime()) / 1000);

    // Import Judge0 service
    import('./judge0Service.js').then(async (module) => {
      const judge0Service = module.default;

      try {
        // Get test cases from session or use defaults
        const allTestCases = session.testCases || [
          { input: '[1,2,3]', output: '6' },
          { input: '[0,-1,5]', output: '4' },
        ];

        // Split into visible and hidden (for now, use all as visible since we don't have hidden stored)
        const visibleTestCases = allTestCases;

        // Submit code to Judge0
        logger.info(`📤 Submitting to Judge0: ${visibleTestCases.length} test cases`);
        const tokens = await judge0Service.submitCodeWithTestCases({
          code,
          language: session.codeLanguage || 'python',
          testCases: visibleTestCases,
        });

        // Poll for results
        const results = await judge0Service.getResults(tokens);

        // Format results
        const formattedResults = judge0Service.formatBatchResults(results);

        // Update session with results
        session.submissionResult = {
          verdict: formattedResults.verdict,
          passedTests: formattedResults.passedTests,
          totalTests: formattedResults.totalTests,
          executionTime: formattedResults.maxExecutionTime,
          memoryUsed: formattedResults.totalMemoryUsed,
          output: formattedResults.summaryStdout,
          testDetails: formattedResults.testResults,
        };
        session.status = formattedResults.verdict === 'accepted' ? 'completed' : 'submitted';

        // Track telemetry
        session.telemetry.retry_count = (session.telemetry.retry_count || 0) + 1;

        // Compute dependency score using centralized logic
        session.computeDependencyScore();

        // Log LLM usage (if any hints were given)
        if (session.hints && session.hints.length > 0) {
          AIObservabilityService.logLLMCall(
            'judge0',
            '/submit',
            0, // No tokens for judging
            0,
            session.telemetry.solve_time,
            true
          );
        }

        // Enqueue ML async jobs (non-blocking)
        try {
          const mlJobIds = {};

          // These jobs are enqueued to JobQueueService
          if (session.mlJobReferences) {
            const JobQueueService = (await import('./JobQueueService.js')).default;

            if (formattedResults.verdict === 'accepted') {
              // Only enqueue mastery/retention updates on successful submission
              const masteryJob = await JobQueueService.enqueueJob(
                'ml-mastery-update',
                {
                  userId: session.userId,
                  topicId: session.topicId,
                  problemId: session.problemId,
                  solveTime: session.telemetry.solve_time,
                  independenceScore: session.dependencyScore.independenceScore,
                }
              );
              mlJobIds.masteryUpdateJobId = masteryJob.id;

              const retentionJob = await JobQueueService.enqueueJob(
                'ml-retention-update',
                {
                  userId: session.userId,
                  topicId: session.topicId,
                  problemId: session.problemId,
                  attemptNumber: session.submissionAttempt,
                  solveTime: session.telemetry.solve_time,
                }
              );
              mlJobIds.retentionUpdateJobId = retentionJob.id;
            }

            // Always enqueue weakness analysis and readiness prediction
            const weaknessJob = await JobQueueService.enqueueJob(
              'ml-weakness-analysis',
              {
                userId: session.userId,
                topicId: session.topicId,
                verdict: formattedResults.verdict,
                errorOutput: formattedResults.testResults[0]?.stderr || '',
              }
            );
            mlJobIds.weaknessAnalysisJobId = weaknessJob.id;

            const readinessJob = await JobQueueService.enqueueJob(
              'ml-readiness-prediction',
              {
                userId: session.userId,
                topicId: session.topicId,
                problemId: session.problemId,
                solveTime: session.telemetry.solve_time,
                hintCount: session.hints.length,
              }
            );
            mlJobIds.readinessPredictionJobId = readinessJob.id;

            session.mlJobReferences = mlJobIds;
            logger.info(`✅ ML jobs enqueued: ${Object.values(mlJobIds).join(', ')}`);
          }
        } catch (error) {
          logger.warn(`⚠️ ML job enqueue failed (non-blocking): ${error.message}`);
        }

        // Save session
        session.lastActivityAt = new Date();
        await session.save();

        logger.info(`✅ Submission processed: ${formattedResults.verdict}`);

        return {
          verdict: formattedResults.verdict,
          passedTests: formattedResults.passedTests,
          totalTests: formattedResults.totalTests,
          executionTime: formattedResults.maxExecutionTime,
          memoryUsed: formattedResults.totalMemoryUsed,
          output: formattedResults.summaryStdout,
          mlJobIds: session.mlJobReferences || {},
        };
      } catch (error) {
        logger.error(`❌ Error during code submission: ${error.message}`);
        session.submissionResult = {
          verdict: 'runtime_error',
          output: error.message,
        };
        await session.save();
        throw error;
      }
    });
  } catch (error) {
    logger.error(`❌ Error submitting practice: ${error.message}`);
    throw error;
  }
}

/**
 * Get hint from FastAPI /ai/hint/generate
 */
export async function getHint(session, hintLevel) {
  try {
    logger.info(`💡 Requesting hint level ${hintLevel} for session ${session._id}`);

    // Check cost governance
    if (!session.canRequestHint()) {
      throw new Error('Hint limit exceeded');
    }

    // Prepare hint request
    const hintRequest = {
      sessionId: session._id.toString(),
      problemStatement: session.problemStatement || '',
      currentCode: session.code || '',
      hintLevel: Math.min(hintLevel, 4),
      language: session.codeLanguage,
      topicId: session.topicId,
    };

    // Call FastAPI hint endpoint
    const response = await callAIEndpoint('/ai/hint/generate', 'POST', hintRequest);

    if (!response.success || !response.data) {
      throw new Error('Failed to generate hint');
    }

    const hint = response.data;

    // Track hint cost (estimate: ~50 tokens per hint level)
    const tokensUsed = Math.ceil(50 * (hintLevel / 2));
    const cost = tokensUsed * 0.0001; // rough estimate

    // Update session
    session.addHint(hintLevel, hint.hintText, tokensUsed, cost);
    session.lastActivityAt = new Date();
    await session.save();

    // Log LLM call
    AIObservabilityService.logLLMCall('groq', '/hint/generate', tokensUsed, cost, 0, true);

    logger.info(`✅ Hint generated: ${hint.hintText?.substring(0, 50)}...`);

    return hint;
  } catch (error) {
    logger.error(`❌ Error getting hint: ${error.message}`);
    throw error;
  }
}

/**
 * Get inline assistance from FastAPI /ai/assist/inline
 */
export async function getInlineAssistance(session, codeChunk, context = '', cursorPosition = 0) {
  try {
    logger.info(`✨ Requesting inline assistance for session ${session._id}`);

    // Check cost governance
    if (!session.canMakeLLMCall()) {
      throw new Error('LLM call limit exceeded');
    }

    // Prepare inline assist request
    const assistRequest = {
      sessionId: session._id.toString(),
      userCode: codeChunk.substring(0, 1500), // Limit to 1500 chars
      cursorPosition: cursorPosition,  // ✅ ADD: Include cursor position for context-aware suggestions
      language: session.codeLanguage,
      context: context || session.problemStatement?.substring(0, 200),
      problemDescription: session.problemStatement || '',  // ✅ ADD: Include problem context
      userId: session.userId?.toString() || '',  // ✅ ADD: Include user ID
      difficulty: session.difficulty || 'Medium',  // ✅ ADD: Include difficulty  
      topic: session.topicId || '',  // ✅ ADD: Include topic
      problemId: session.problemId || '',  // ✅ ADD: Include problem ID
    };

    // Call FastAPI inline assist endpoint
    const response = await callAIEndpoint('/ai/assist/inline', 'POST', assistRequest);

    if (!response.success || !response.data) {
      throw new Error('Failed to generate suggestion');
    }

    const suggestion = response.data;

    // Track LLM cost (estimate: ~30 tokens for inline suggestion)
    const tokensUsed = 30;
    const cost = tokensUsed * 0.0001;

    // Update session cost governance
    session.costGovernance.llmCallCount += 1;
    session.llmUsageTokens.inlineAssistTokens += tokensUsed;
    session.llmUsageTokens.totalTokens += tokensUsed;
    session.llmCostEstimate.inlineAssistCost += cost;
    session.llmCostEstimate.totalEstimatedCost += cost;
    session.lastActivityAt = new Date();
    await session.save();

    // Log LLM call
    AIObservabilityService.logLLMCall('groq', '/assist/inline', tokensUsed, cost, 0, true);

    logger.info(`✅ Inline suggestion: ${suggestion.type}`);

    return suggestion;
  } catch (error) {
    logger.error(`❌ Error getting inline assistance: ${error.message}`);
    throw error;
  }
}

/**
 * Get code review from FastAPI /ai/practice/review
 */
export async function getCodeReview(session) {
  try {
    logger.info(`🔍 Requesting code review for session ${session._id}`);

    // Check cost governance
    if (!session.canMakeLLMCall()) {
      throw new Error('LLM call limit exceeded');
    }

    // ✅ IMPORTANT: Extract only raw userCode, NOT wrapped code
    // session.code contains the raw code submitted by user (frontend sends raw code only)
    // The wrapper template is applied internally by judge0Service and is never stored with user code
    const userCode = session.code || '';

    if (!userCode.trim()) {
      throw new Error('No code available for review');
    }

    // Prepare code review request with correct field names
    const reviewRequest = {
      sessionId: session._id.toString(),
      userId: session.userId?.toString() || '',
      userCode: userCode,  // ✅ FIXED: Use userCode instead of code
      language: session.codeLanguage,
      problemDescription: session.problemStatement || '',  // ✅ FIXED: Use problemDescription instead of problemStatement
      difficulty: session.difficulty || 'Medium',  // ✅ ADD: Difficulty level
      topic: session.topicId || '',  // ✅ ADD: Topic
      problemId: session.problemId || '',  // ✅ ADD: Problem ID
      testCasesPassed: session.submissionResult?.passedTests || 0,
      totalTestCases: session.submissionResult?.totalTests || 0,
    };

    // Call FastAPI review endpoint
    const response = await callAIEndpoint('/ai/practice/review', 'POST', reviewRequest);

    if (!response.success || !response.data) {
      throw new Error('Failed to generate review');
    }

    const review = response.data;

    // Track LLM cost (estimate: ~200 tokens for review)
    const tokensUsed = 200;
    const cost = tokensUsed * 0.0001;

    // Update session cost governance
    session.costGovernance.llmCallCount += 1;
    session.llmUsageTokens.reviewTokens += tokensUsed;
    session.llmUsageTokens.totalTokens += tokensUsed;
    session.llmCostEstimate.reviewCost += cost;
    session.llmCostEstimate.totalEstimatedCost += cost;
    
    // Store review
    session.codeReview = review;
    session.lastActivityAt = new Date();
    await session.save();

    // Log LLM call
    AIObservabilityService.logLLMCall('groq', '/practice/review', tokensUsed, cost, 0, true);

    logger.info(`✅ Code review completed`);

    return review;
  } catch (error) {
    logger.error(`❌ Error getting code review: ${error.message}`);
    throw error;
  }
}

/**
 * Score user's explanation from FastAPI /ai/explanation/score
 */
export async function scoreExplanation(session) {
  try {
    logger.info(`🎯 Scoring explanation for session ${session._id}`);

    // Check cost governance
    if (!session.canMakeLLMCall()) {
      throw new Error('LLM call limit exceeded');
    }

    if (!session.explanation) {
      throw new Error('No explanation provided');
    }

    // Prepare explanation scoring request
    const scoreRequest = {
      sessionId: session._id.toString(),
      explanation: session.explanation,
      code: session.code || '',
      correctSolution: session.submissionResult?.verdict === 'accepted',
      interviewContext: true,
    };

    // Call FastAPI explanation score endpoint
    const response = await callAIEndpoint('/ai/explanation/score', 'POST', scoreRequest);

    if (!response.success || !response.data) {
      throw new Error('Failed to score explanation');
    }

    const score = response.data;

    // Track LLM cost (estimate: ~100 tokens for scoring)
    const tokensUsed = 100;
    const cost = tokensUsed * 0.0001;

    // Update session cost governance
    session.costGovernance.llmCallCount += 1;
    session.llmUsageTokens.explanationTokens += tokensUsed;
    session.llmUsageTokens.totalTokens += tokensUsed;
    session.llmCostEstimate.explanationCost += cost;
    session.llmCostEstimate.totalEstimatedCost += cost;
    
    // Store explanation score
    session.explanationScore = score;
    session.telemetry.explanation_quality_score = score.explanation_quality_score || 0.5;
    session.lastActivityAt = new Date();
    await session.save();

    // Log LLM call
    AIObservabilityService.logLLMCall('groq', '/explanation/score', tokensUsed, cost, 0, true);

    logger.info(`✅ Explanation scored: ${score.explanation_quality_score?.toFixed(2)}`);

    return score;
  } catch (error) {
    logger.error(`❌ Error scoring explanation: ${error.message}`);
    throw error;
  }
}

/**
 * Get session cost summary
 */
export function getSessionCostSummary(session) {
  return {
    totalTokensUsed: session.llmUsageTokens.totalTokens,
    totalCostEstimate: session.llmCostEstimate.totalEstimatedCost,
    hintCalls: session.costGovernance.hintCallCount,
    llmCalls: session.costGovernance.llmCallCount,
    costRemaining: {
      hints: session.costGovernance.maxHintCalls - session.costGovernance.hintCallCount,
      llmCalls: session.costGovernance.maxLLMCalls - session.costGovernance.llmCallCount,
      tokens: session.costGovernance.maxTokensAllowed - session.llmUsageTokens.totalTokens,
    },
    atCapacity: {
      hints: session.costGovernance.hintCallCount >= session.costGovernance.maxHintCalls,
      llmCalls: session.costGovernance.llmCallCount >= session.costGovernance.maxLLMCalls,
      tokens: session.llmUsageTokens.totalTokens >= session.costGovernance.maxTokensAllowed,
      cost: session.llmCostEstimate.totalEstimatedCost >= session.costGovernance.costThreshold,
    },
  };
}

/**
 * Log a structured voice interaction and update telemetry
 */
export async function logVoiceInteraction(session, interactionData) {
  try {
    const { transcript, response, intent, dependencyWeight, tokenUsage } = interactionData;

    // 1. Add interaction to log
    session.voiceInteractions.push({
      transcript,
      response,
      intent: intent || 'general',
      dependencyWeight: dependencyWeight || 0,
      tokenUsage: tokenUsage || 0,
      createdAt: new Date()
    });

    // 2. Update telemetry counters
    session.telemetry.voice_interaction_count = (session.telemetry.voice_interaction_count || 0) + 1;
    
    // Update average dependency weight
    const totalWeight = session.voiceInteractions.reduce((sum, v) => sum + (v.dependencyWeight || 0), 0);
    session.telemetry.voice_dependency_weight_avg = totalWeight / session.voiceInteractions.length;

    // Track solution seeking specifically
    if (intent === 'solution-seeking') {
      const solutionSeekingCount = session.voiceInteractions.filter(v => v.intent === 'solution-seeking').length;
      session.telemetry.voice_solution_ratio = solutionSeekingCount / (session.telemetry.voice_interaction_count || 1);
    }

    // 3. Update cost governance
    const tokens = tokenUsage || 150;
    const cost = tokens * 0.0001;
    
    session.costGovernance.llmCallCount += 1;
    session.llmUsageTokens.totalTokens = (session.llmUsageTokens.totalTokens || 0) + tokens;
    session.llmCostEstimate.totalEstimatedCost = (session.llmCostEstimate.totalEstimatedCost || 0) + cost;

    // 4. Recalculate dependency score
    if (typeof session.computeDependencyScore === 'function') {
      session.computeDependencyScore();
    }

    // 5. Log telemetry to AIObservabilityService
    AIObservabilityService.logLLMCall('groq', '/voice-interact', tokens, cost, 0, true);
    AIObservabilityService.logSessionCost(
      session._id.toString(),
      session.userId?.toString(),
      'voice',
      tokens,
      cost
    );

    session.lastActivityAt = new Date();
    await session.save();

    logger.info(`✅ Voice interaction logged for session ${session._id} (Intent: ${intent})`);
    
    return session;
  } catch (error) {
    logger.error(`❌ Error logging voice interaction: ${error.message}`);
    throw error;
  }
}

/**
 * Handle voice input from user (Proxy to FastAPI /ai/lab/voice-interact)
 */
export async function handleVoiceInput(session, transcript, userCode = '', history = []) {
  try {
    logger.info(`🎤 Processing voice interact req: "${transcript.substring(0, 50)}..."`);

    const voiceRequest = {
      transcript,
      userCode,
      history,
      problemContext: {
        title: session.problemId || 'Unknown',
        difficulty: session.difficulty || 'Medium',
        description: session.problemStatement || '',
        constraints: session.testCases?.length > 0 ? 'Refer to test cases' : 'N/A',
        language: session.codeLanguage
      }
    };

    // Note: The controller handles the streaming part for real-time response
    // This service function can be used for non-streaming or internal calls
    const response = await callAIEndpoint('/ai/lab/voice-interact', 'POST', voiceRequest);
    return response;
  } catch (error) {
    logger.error(`❌ Error in voice input service: ${error.message}`);
    throw error;
  }
}

export default {
  submitPractice,
  getHint,
  getInlineAssistance,
  getCodeReview,
  scoreExplanation,
  getSessionCostSummary,
  handleVoiceInput,
  logVoiceInteraction,
};
