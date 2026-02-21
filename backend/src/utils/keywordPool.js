// Hardcoded SEO keyword pool grouped by category
const employerKeywords = [
  'hiring trends 2025',
  'recruitment strategies',
  'how to hire faster',
  'best hiring practices',
  'employee retention strategies',
  'employer branding ideas',
  'how to reduce hiring cost',
  'recruitment automation',
  'ai in recruitment',
  'interview process best practices',
  'how to evaluate candidates',
  'how to hire remote employees',
  'talent acquisition strategies',
  'recruitment analytics',
  'diversity hiring strategies',
  'startup hiring challenges',
  'enterprise hiring process',
];

const jobSeekerKeywords = [
  'how to get a job',
  'resume writing tips',
  'how to crack interviews',
  'interview questions and answers',
  'job search strategies',
  'career growth tips',
  'how to negotiate salary',
  'how to switch jobs',
  'linkedin profile optimization',
  'best skills to learn in 2025',
  'how to get remote jobs',
  'freshers job guide',
  'career planning tips',
  'job market trends',
];

const marketKeywords = [
  'salary trends in india',
  'it salary trends 2025',
  'job market analysis',
  'future jobs in india',
  'high paying jobs',
  'tech job demand',
  'layoffs impact job market',
  'recession hiring trends',
  'industry wise salary growth',
];

const techKeywords = [
  'ai jobs demand',
  'data science careers',
  'full stack developer roadmap',
  'cloud computing jobs',
  'cyber security careers',
  'product management careers',
  'ui ux design jobs',
  'digital marketing careers',
];

const getKeywordPool = () => [
  ...employerKeywords,
  ...jobSeekerKeywords,
  ...marketKeywords,
  ...techKeywords,
];

module.exports = {
  employerKeywords,
  jobSeekerKeywords,
  marketKeywords,
  techKeywords,
  getKeywordPool,
};
