// Case Studies Configuration
// Easily add or modify case studies without editing the component

export const caseStudies = [
  {
    id: 1,
    title: 'AI-Assisted Hiring & Screening',
    icon: 'FaUsers',
    context: 'A mid-sized recruitment operation handling multiple roles simultaneously with limited screening bandwidth.',
    problem: [
      'Recruiters were manually screening large volumes of irrelevant applications',
      'Job descriptions were inconsistent',
      'Screening quality varied recruiter-to-recruiter',
      'Time-to-shortlist was too high'
    ],
    role: 'I took ownership of designing the AI-driven hiring workflow — from role understanding to candidate shortlisting logic — and coordinated implementation with a tech team.',
    approach: [
      'Broke each role into evaluation dimensions (skills, experience, intent, communication)',
      'Designed role-specific screening prompts instead of generic questions',
      'Created AI-based answer evaluation logic with clear pass/fail thresholds',
      'Defined guardrails to avoid over-filtering good candidates',
      'Built an iteration loop based on recruiter feedback'
    ],
    outcome: [
      'Reduced manual screening effort by ~50–60%',
      'Improved shortlist relevance and consistency',
      'Recruiters spent more time interviewing, less time filtering',
      'Hiring workflow became repeatable across roles'
    ],
    metrics: '50-60% reduction in manual screening'
  },
  {
    id: 2,
    title: 'AI Workflow for Operations Automation',
    icon: 'FaCog',
    context: 'A service-based business handling repetitive operational tasks manually across teams.',
    problem: [
      'High dependence on human follow-ups',
      'Inconsistent task execution',
      'No standard decision logic',
      'Errors due to misinterpretation of instructions'
    ],
    role: 'I defined the automation scope, designed the AI decision logic, and oversaw execution using my internal tech resources.',
    approach: [
      'Identified tasks suitable for AI vs those requiring human judgment',
      'Designed prompt-driven workflows with clear input/output definitions',
      'Created fallback rules when AI confidence was low',
      'Standardised response formats to plug into existing systems',
      'Ensured AI outputs were operationally usable, not just "correct"'
    ],
    outcome: [
      'Significant reduction in repetitive manual work',
      'More predictable task execution',
      'Lower error rates',
      'Team bandwidth freed for higher-value work'
    ],
    metrics: 'Significant reduction in manual effort'
  },
  {
    id: 3,
    title: 'Marketplace Content & Decision Flow',
    icon: 'FaStore',
    context: 'A niche e-commerce / marketplace operation requiring high-quality product presentation at scale.',
    problem: [
      'Vendor-provided content was inconsistent',
      'Manual curation did not scale',
      'Product presentation quality affected conversion'
    ],
    role: 'I owned the AI content workflow design and coordinated execution across internal resources.',
    approach: [
      'Designed prompt systems to standardise product descriptions',
      'Defined visual/content consistency rules',
      'Created AI workflows to transform raw vendor inputs into usable assets',
      'Built human-in-the-loop checks only where needed',
      'Optimised prompts based on engagement feedback'
    ],
    outcome: [
      'Improved consistency of product listings',
      'Faster onboarding of vendor inventory',
      'Better customer engagement with lower manual effort',
      'Scalable content creation without proportional team growth'
    ],
    metrics: 'Faster onboarding, improved consistency'
  },
  {
    id: 4,
    title: 'AI Prompt & Decision Logic Refinement',
    icon: 'FaBrain',
    context: 'A founder-led team experimenting with AI but struggling to get reliable outputs.',
    problem: [
      'AI responses were inconsistent',
      'Prompts worked sometimes, failed often',
      'No clarity on why outputs changed'
    ],
    role: 'I acted as an AI workflow advisor, refining prompt logic and defining usage boundaries.',
    approach: [
      'Audited existing prompts and workflows',
      'Identified ambiguity and hidden assumptions',
      'Redesigned prompts with structured reasoning paths',
      'Added explicit constraints and expected output formats',
      'Trained the team on when not to use AI'
    ],
    outcome: [
      'Much more predictable AI outputs',
      'Reduced trial-and-error cycles',
      'Team gained confidence using AI operationally',
      'AI became a tool, not a distraction'
    ],
    metrics: 'Predictable outputs, reduced cycles'
  }
];
