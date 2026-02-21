import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiDownload, HiArrowRight } from 'react-icons/hi';
import { FaUsers, FaCog, FaStore, FaBrain } from 'react-icons/fa';
import { generateCaseStudiesPDF } from '../utils/generatePDF';

const CaseStudies = () => {
  const caseStudies = [
    {
      id: 1,
      title: 'AI-Assisted Hiring & Screening',
      icon: FaUsers,
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
      icon: FaCog,
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
      icon: FaStore,
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
      icon: FaBrain,
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

  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Case Studies
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Selected, anonymised examples of AI projects I've owned end-to-end, from problem definition to delivery.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => generateCaseStudiesPDF()}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
            >
              <HiDownload className="mr-2" size={20} />
              Download PDF Version
            </button>
            <a
              href="https://notion.so" // Replace with actual Notion link
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all"
            >
              View on Notion
              <HiArrowRight className="ml-2" size={20} />
            </a>
          </div>
        </motion.div>

        {/* Case Studies List */}
        <div className="space-y-12">
          {caseStudies.map((study, index) => {
            const Icon = study.icon;
            return (
              <motion.div
                key={study.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-8"
              >
                <div className="flex items-start space-x-4 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="text-blue-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{study.title}</h2>
                    <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                      {study.metrics}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Context</h3>
                    <p className="text-gray-600">{study.context}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Problem</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      {study.problem.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">My Role</h3>
                    <p className="text-gray-600">{study.role}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Approach</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      {study.approach.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Outcome</h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      {study.outcome.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-8 text-center text-white"
        >
          <h2 className="text-3xl font-bold mb-4">
            Ready to Discuss Your AI Use Case?
          </h2>
          <p className="text-xl text-blue-100 mb-6">
            If you're exploring AI for hiring, operations, or marketplaces and want ownership rather than experiments, let's start with a short feasibility discussion.
          </p>
          <Link
            to="/book-consultation"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all"
          >
            Book Discovery Call
            <HiArrowRight className="ml-2" size={20} />
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default CaseStudies;
