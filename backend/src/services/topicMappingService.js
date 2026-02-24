/**
 * Topic Mapping Service
 * 
 * Converts LeetCode tags to internal structured topic IDs
 * Ensures consistent topic classification across submissions
 * 
 * Example mappings:
 * "array" → "arrays"
 * "two-pointer" → "arrays"
 * "dp" → "dynamic_programming"
 */

// ============================================
// TAG TO TOPIC MAPPING TAXONOMY
// ============================================

const TAG_MAPPING = {
  // ARRAYS & SORTING
  'array': 'arrays',
  'arrays': 'arrays',
  'sorting': 'arrays',
  'two-pointer': 'arrays',
  '2-pointer': 'arrays',
  'sliding-window': 'arrays',
  'prefix-sum': 'arrays',
  'monotonic-stack': 'arrays',
  'randomized': 'arrays',

  // LINKED LISTS
  'linked-list': 'linked-lists',
  'linked list': 'linked-lists',
  'list': 'linked-lists',
  'recursion': 'linked-lists',

  // TREES
  'tree': 'trees',
  'binary-tree': 'trees',
  'binary-search-tree': 'binary-search-trees',
  'bst': 'binary-search-trees',
  'trie': 'trie',

  // GRAPHS
  'graph': 'graphs',
  'dfs': 'graphs',
  'bfs': 'graphs',
  'depth-first-search': 'graphs',
  'breadth-first-search': 'graphs',
  'topological-sort': 'graphs',
  'dijkstra': 'graphs',
  'union-find': 'graphs',

  // DYNAMIC PROGRAMMING
  'dynamic-programming': 'dynamic-programming',
  'dp': 'dynamic-programming',
  'memoization': 'dynamic-programming',
  'tabulation': 'dynamic-programming',

  // HASH TABLE
  'hash-table': 'hash-tables',
  'hash-map': 'hash-tables',
  'hash': 'hash-tables',
  'map': 'hash-tables',
  'set': 'hash-tables',

  // STRINGS
  'string': 'strings',
  'substring': 'strings',
  'pattern-matching': 'strings',
  'regex': 'strings',

  // MATH & NUMBERS
  'math': 'math',
  'number-theory': 'math',
  'bit-manipulation': 'bit-manipulation',
  'bitwise': 'bit-manipulation',

  // QUEUES & STACKS
  'queue': 'queues-stacks',
  'stack': 'queues-stacks',
  'priority-queue': 'queues-stacks',
  'heap': 'queues-stacks',

  // GREEDY
  'greedy': 'greedy',

  // BACKTRACKING
  'backtracking': 'backtracking',

  // DESIGN
  'design': 'system-design',
  'oop': 'system-design',
  'object-oriented': 'system-design',
};

// ============================================
// DIFFICULTY TO NUMERIC MAPPING
// ============================================

const DIFFICULTY_MAPPING = {
  'easy': 1,
  'Easy': 1,
  'EASY': 1,
  'medium': 2,
  'Medium': 2,
  'MEDIUM': 2,
  'hard': 3,
  'Hard': 3,
  'HARD': 3,
  'unknown': 0,
  'Unknown': 0,
  'UNKNOWN': 0,
};

// ============================================
// TOPIC MAPPING SERVICE
// ============================================

class TopicMappingService {
  /**
   * Map a tag to an internal topicId
   * @param {string} tag - LeetCode tag
   * @returns {string} Internal topicId
   */
  static mapTag(tag) {
    const normalized = tag.toLowerCase().trim();
    return TAG_MAPPING[normalized] || 'misc';
  }

  /**
   * Determine primary topic from submission tags
   * Uses first valid tag as primary, others as secondary
   * 
   * @param {string[]} tags - Array of LeetCode tags
   * @returns {object} { primaryTopicId, secondaryTopics }
   */
  static determinePrimaryTopic(tags) {
    if (!tags || tags.length === 0) {
      return {
        primaryTopicId: 'misc',
        secondaryTopics: [],
      };
    }

    const mappedTopics = tags
      .map(tag => this.mapTag(tag))
      .filter(Boolean);

    if (mappedTopics.length === 0) {
      return {
        primaryTopicId: 'misc',
        secondaryTopics: [],
      };
    }

    // Deduplicate: use first occurrence as primary, rest as secondary
    const deduped = [...new Set(mappedTopics)];
    return {
      primaryTopicId: deduped[0],
      secondaryTopics: deduped.slice(1),
    };
  }

  /**
   * Convert difficulty string to numeric level
   * Easy=1, Medium=2, Hard=3, Unknown=0
   * 
   * @param {string} difficulty - Difficulty string
   * @returns {number} Numeric level 0-3
   */
  static difficultyToLevel(difficulty) {
    if (difficulty === null || difficulty === undefined) {
      return 0;
    }
    return DIFFICULTY_MAPPING[difficulty] ?? 0;
  }

  /**
   * Enrich submission with topic & difficulty mappings
   * Called after LeetCode submission fetch
   * 
   * @param {object} submission - Raw submission document
   * @returns {object} Submission with new fields populated
   */
  static enrichSubmission(submission) {
    const { primaryTopicId, secondaryTopics } = this.determinePrimaryTopic(submission.tags);
    const difficultyLevel = this.difficultyToLevel(submission.difficulty);

    return {
      ...submission,
      primaryTopicId,
      secondaryTopics,
      difficultyLevel,
    };
  }

  /**
   * Parse runtime string to milliseconds
   * Handles formats: "1000 ms", "1000ms", "1s", etc.
   * 
   * @param {string} runtimeStr - Runtime string from LeetCode
   * @returns {number} Runtime in milliseconds
   */
  static parseRuntime(runtimeStr) {
    if (!runtimeStr) return 0;

    const str = runtimeStr.toLowerCase().trim();
    
    // Extract number and unit
    const regex = /(\d+)\s*(ms|s|μs)?/;
    const match = str.match(regex);
    
    if (!match) return 0;

    const value = parseInt(match[1], 10);
    const unit = match[2] || 'ms';

    switch (unit) {
      case 'ms':
        return value;
      case 's':
        return value * 1000;
      case 'μs':
        return value / 1000;
      default:
        return value;
    }
  }

  /**
   * Parse memory string to kilobytes
   * Handles formats: "50 MB", "50MB", "50 GB", etc.
   * 
   * @param {string} memoryStr - Memory string from LeetCode
   * @returns {number} Memory in kilobytes
   */
  static parseMemory(memoryStr) {
    if (!memoryStr) return 0;

    const str = memoryStr.toLowerCase().trim();
    
    // Extract number and unit
    const regex = /(\d+(?:\.\d+)?)\s*(kb|mb|gb)?/;
    const match = str.match(regex);
    
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2] || 'mb';

    switch (unit) {
      case 'kb':
        return value;
      case 'mb':
        return value * 1024;
      case 'gb':
        return value * 1024 * 1024;
      default:
        return value;
    }
  }

  /**
   * Build initial attempts array from submission (first successful attempt)
   * Used when submission is first created
   * 
   * @param {object} submission - Submission with difficulty, runtime, memory
   * @returns {array} Attempts array for mastery tracking
   */
  static buildInitialAttempts(submission) {
    const attempt = {
      correct: true, // Assuming this is an accepted submission
      difficulty: submission.difficultyLevel || 1,
      time_ms: this.parseRuntime(submission.runtime) || 0,
      hints_used: 0, // LeetCode doesn't track hints, default to 0
      timestamp: submission.submissionTime || new Date(),
    };

    return [attempt];
  }
}

export default TopicMappingService;
