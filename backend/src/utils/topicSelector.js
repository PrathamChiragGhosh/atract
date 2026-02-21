const { getKeywordPool } = require('./keywordPool.js');

const MAX_RECENT = 50;

/**
 * Select topics for auto-generated blogs
 * Combines core keyword pool with employer-provided keywords.
 * Tries to avoid recently used topics.
 */
const selectTopics = (count = 10, extraKeywords = [], recentTopics = []) => {
  const corePool = getKeywordPool();
  const extras = Array.isArray(extraKeywords)
    ? extraKeywords
        .map((k) => k && k.toString().trim())
        .filter((k) => k && k.length > 0)
    : [];

  // Deduplicate while preserving order preference: extras first, then core
  const uniquePool = Array.from(new Set([...extras, ...corePool]));

  // Try to avoid recently used topics on the first pass
  const freshPool = uniquePool.filter((k) => !recentTopics.includes(k));
  const poolToUse = freshPool.length >= count ? freshPool : uniquePool;

  const shuffled = shuffle(poolToUse);
  const selected = shuffled.slice(0, count);

  // Update recents (caller maintains storage)
  const updatedRecent = [...recentTopics, ...selected].slice(-MAX_RECENT);

  return { selectedTopics: selected, updatedRecent };
};

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

module.exports = {
  selectTopics,
};
