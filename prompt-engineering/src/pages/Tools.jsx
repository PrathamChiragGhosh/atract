import { motion } from 'framer-motion';
import { HiExternalLink, HiArrowRight } from 'react-icons/hi';
import { FaFileAlt, FaBriefcase, FaSearch } from 'react-icons/fa';

const Tools = () => {
  const tools = [
    {
      id: 'resume-parser',
      name: 'Resume Parser',
      description: 'Extract structured data from resumes using AI-powered parsing technology.',
      icon: FaFileAlt,
      url: 'https://atract.com/resume-parser', // Replace with actual Atract URL
      color: 'blue'
    },
    {
      id: 'jd-structuring',
      name: 'JD Structuring Tool',
      description: 'Transform unstructured job descriptions into standardized, structured formats.',
      icon: FaBriefcase,
      url: 'https://atract.com/jd-structuring', // Replace with actual Atract URL
      color: 'green'
    },
    {
      id: 'resume-matching',
      name: 'Resume Search / Matching Tool',
      description: 'AI-powered resume matching and search functionality for recruitment teams.',
      icon: FaSearch,
      url: 'https://atract.com/resume-matching', // Replace with actual Atract URL
      color: 'purple'
    }
  ];

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'bg-blue-100 text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'bg-green-100 text-green-600',
      button: 'bg-green-600 hover:bg-green-700'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'bg-purple-100 text-purple-600',
      button: 'bg-purple-600 hover:bg-purple-700'
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
            Atract Tools
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore our AI-powered tools that showcase real-world applications of prompt engineering and workflow automation.
          </p>
        </motion.div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {tools.map((tool, index) => {
            const Icon = tool.icon;
            const colors = colorClasses[tool.color];
            
            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-shadow"
              >
                <div className={`w-16 h-16 ${colors.icon} rounded-lg flex items-center justify-center mb-6`}>
                  <Icon size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{tool.name}</h3>
                <p className="text-gray-600 mb-6">{tool.description}</p>
                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center ${colors.button} text-white px-6 py-3 rounded-lg font-semibold transition-colors`}
                >
                  Try Tool
                  <HiExternalLink className="ml-2" size={18} />
                </a>
              </motion.div>
            );
          })}
        </div>

        {/* Integration Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-8"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Built with AI Prompt Engineering
          </h2>
          <p className="text-gray-600 mb-6 text-lg">
            These tools demonstrate the practical application of AI workflow design and prompt engineering. Each tool represents a real-world use case where AI automation solves business problems.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Resume Parser</h3>
              <p className="text-sm text-gray-600">
                Uses structured prompt logic to extract key information from resumes in various formats, handling inconsistencies and edge cases.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">JD Structuring</h3>
              <p className="text-sm text-gray-600">
                Transforms unstructured job descriptions into standardized formats using AI-driven content processing workflows.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Resume Matching</h3>
              <p className="text-sm text-gray-600">
                Implements AI-powered matching algorithms with evaluation logic to connect candidates with relevant opportunities.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Custom Solutions</h3>
              <p className="text-sm text-gray-600">
                Need a custom AI tool for your business? Let's discuss how we can build a solution tailored to your needs.
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-8 text-center text-white"
        >
          <h2 className="text-3xl font-bold mb-4">
            Want to Build Your Own AI Tools?
          </h2>
          <p className="text-xl text-blue-100 mb-6">
            These tools showcase what's possible with proper AI workflow design. Let's discuss how we can create similar solutions for your business.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all"
          >
            Get Started
            <HiArrowRight className="ml-2" size={20} />
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default Tools;
