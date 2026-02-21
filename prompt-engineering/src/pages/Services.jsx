import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiCheck, HiArrowRight, HiCalendar } from 'react-icons/hi';
import { FaBrain, FaRocket, FaChartLine } from 'react-icons/fa';

const Services = () => {
  const packages = [
    {
      id: 'workflow-design',
      name: 'Package A',
      title: 'AI Workflow & Prompt Design',
      subtitle: 'Entry Level',
      icon: FaBrain,
      color: 'blue',
      bestFor: 'First-time AI adoption / clarity',
      outcome: 'A clear, usable AI workflow with prompt logic that can be executed by a dev team.',
      includes: [
        'Problem framing',
        'Prompt logic & decision flow',
        'Output standards & guardrails',
        'Handover documentation'
      ],
      timeline: '2–3 weeks',
      price: 'Custom Quote'
    },
    {
      id: 'project-ownership',
      name: 'Package B',
      title: 'AI Project Ownership',
      subtitle: 'Core Offer',
      icon: FaRocket,
      color: 'green',
      bestFor: 'Founders who want results, not management',
      outcome: 'A working AI use-case delivered end-to-end.',
      includes: [
        'Full ownership of the AI use-case',
        'Prompt + logic design',
        'Coordination of development',
        'Iteration based on results'
      ],
      timeline: '4–8 weeks',
      price: 'Custom Quote',
      featured: true
    },
    {
      id: 'advisory',
      name: 'Package C',
      title: 'AI Advisory Retainer',
      subtitle: 'Ongoing Support',
      icon: FaChartLine,
      color: 'yellow',
      bestFor: 'Ongoing guidance without hiring',
      outcome: 'Continuous improvement and decision support for AI usage.',
      includes: [
        'Monthly roadmap',
        'Prompt refinement',
        'Review of AI outputs',
        'Strategic guidance'
      ],
      timeline: '3-month minimum',
      price: 'Monthly Retainer'
    }
  ];

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'bg-blue-100 text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700',
      badge: 'bg-blue-600'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'bg-green-100 text-green-600',
      button: 'bg-green-600 hover:bg-green-700',
      badge: 'bg-green-600'
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'bg-yellow-100 text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700',
      badge: 'bg-yellow-600'
    }
  };

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
            Services & Packages
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Each package is designed to answer one business pain. Choose the level of engagement that fits your needs.
          </p>
        </motion.div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {packages.map((pkg, index) => {
            const Icon = pkg.icon;
            const colors = colorClasses[pkg.color];
            
            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`relative bg-white rounded-xl border-2 ${colors.border} p-8 ${
                  pkg.featured ? 'lg:scale-105 shadow-xl' : 'shadow-lg'
                }`}
              >
                {pkg.featured && (
                  <div className={`absolute -top-4 left-1/2 transform -translate-x-1/2 ${colors.badge} text-white px-4 py-1 rounded-full text-sm font-semibold`}>
                    Most Popular
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`w-16 h-16 ${colors.icon} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <Icon size={32} />
                  </div>
                  <div className="text-sm font-semibold text-gray-500 mb-1">{pkg.name}</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.title}</h3>
                  <div className="text-sm text-gray-500 mb-4">{pkg.subtitle}</div>
                </div>

                <div className="mb-6">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Best for:</div>
                  <p className="text-gray-600 text-sm mb-4">{pkg.bestFor}</p>
                  
                  <div className="text-sm font-semibold text-gray-700 mb-2">Outcome:</div>
                  <p className="text-gray-600 text-sm mb-4">{pkg.outcome}</p>
                </div>

                <div className="mb-6">
                  <div className="text-sm font-semibold text-gray-700 mb-3">Includes:</div>
                  <ul className="space-y-2">
                    {pkg.includes.map((item, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-600">
                        <HiCheck className={`${colors.icon.split(' ')[1]} mr-2 flex-shrink-0 mt-0.5`} size={18} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-gray-200 pt-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-600">Timeline:</span>
                    <span className="font-semibold text-gray-900">{pkg.timeline}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Investment:</span>
                    <span className="font-bold text-lg text-gray-900">{pkg.price}</span>
                  </div>
                </div>

                <Link
                  to="/book-consultation"
                  className={`block w-full ${colors.button} text-white text-center py-3 rounded-lg font-semibold transition-colors flex items-center justify-center`}
                >
                  Book Discovery Call
                  <HiCalendar className="ml-2" size={18} />
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* How Engagement Works */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl shadow-lg p-8 border border-gray-200"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            How Engagement Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Discovery Call', desc: '30-minute feasibility discussion' },
              { step: '2', title: 'Proposal', desc: 'Short PDF with problem summary & deliverables' },
              { step: '3', title: 'Payment', desc: 'Secure payment via Stripe, Razorpay, or Wise' },
              { step: '4', title: 'Start', desc: 'Project kickoff and delivery' }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Services;
