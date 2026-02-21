import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiArrowRight, HiDownload, HiEye, HiCalendar } from 'react-icons/hi';
import { FaBrain, FaRocket, FaUsers, FaChartLine } from 'react-icons/fa';
import { generateCaseStudiesPDF } from '../utils/generatePDF';

const Home = () => {
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const features = [
    {
      icon: FaBrain,
      title: 'AI Workflow Design',
      description: 'Translate business problems into clear, executable AI workflows with structured prompt logic.'
    },
    {
      icon: FaRocket,
      title: 'End-to-End Ownership',
      description: 'Full project ownership from problem definition to delivery, using in-house tech resources.'
    },
    {
      icon: FaUsers,
      title: 'Hiring & Recruitment',
      description: 'Specialized in AI-assisted hiring workflows, screening automation, and candidate evaluation systems.'
    },
    {
      icon: FaChartLine,
      title: 'Operations Automation',
      description: 'Design AI-driven decision flows for marketplace operations and business process automation.'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-gray-50 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                AI-Driven Workflows, Automations &{' '}
                <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Hiring Systems
                </span>
                <br />
                for Fast-Moving Teams
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto"
            >
              Independent AI Product & Automation Consultant. I help businesses design, execute, and refine AI-driven workflows — with full ownership from problem definition to delivery.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <button
                onClick={() => generateCaseStudiesPDF()}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                <HiDownload className="mr-2" size={20} />
                Download Case Studies PDF
              </button>
              <Link
                to="/case-studies"
                className="inline-flex items-center px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all"
              >
                <HiEye className="mr-2" size={20} />
                View Full Case Studies
              </Link>
              <Link
                to="/book-consultation"
                className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition-all"
              >
                <HiCalendar className="mr-2" size={20} />
                Book a Consultation
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* What I Do Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What I Do
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              I work at the intersection of business logic, AI prompting, and execution. I translate vague ideas into clear AI workflows, define what should be automated, and ensure outputs are usable in real operations.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="text-blue-600" size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Who It's For
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <HiArrowRight className="text-white" size={14} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Founders & Business Owners</h3>
                    <p className="text-gray-600">Who want AI to solve real problems — not experiments</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <HiArrowRight className="text-white" size={14} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Recruitment Teams</h3>
                    <p className="text-gray-600">Looking to automate screening and improve hiring workflows</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <HiArrowRight className="text-white" size={14} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Operations Teams</h3>
                    <p className="text-gray-600">Needing scalable automation for marketplace and business processes</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white p-8 rounded-xl shadow-lg border border-gray-200"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Who It's NOT For</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span>Teams looking for quick AI experiments without clear business outcomes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span>Organizations that want to hire internally for AI roles</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span>Projects without clear problem definition or success metrics</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Business with AI?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Let's start with a 30-minute feasibility call to discuss your AI use case.
            </p>
            <Link
              to="/book-consultation"
              className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all shadow-xl"
            >
              Book Your Discovery Call
              <HiArrowRight className="ml-2" size={20} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
