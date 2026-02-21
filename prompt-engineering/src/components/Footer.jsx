import { Link } from 'react-router-dom';
import { HiMail, HiPhone, HiLocationMarker } from 'react-icons/hi';
import { FaLinkedin, FaTwitter } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-white font-bold text-lg mb-4">AI Prompt Engineering</h3>
            <p className="text-sm text-gray-400">
              Independent AI Product & Automation Consultant. Designing and delivering AI-driven workflows for fast-moving teams.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/services" className="hover:text-white transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/case-studies" className="hover:text-white transition-colors">
                  Case Studies
                </Link>
              </li>
              <li>
                <Link to="/tools" className="hover:text-white transition-colors">
                  Atract Tools
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-sm">
              <li className="hover:text-white transition-colors cursor-pointer">
                AI Workflow Design
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                Project Ownership
              </li>
              <li className="hover:text-white transition-colors cursor-pointer">
                AI Advisory
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Connect</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center space-x-2">
                <HiMail className="text-blue-400" />
                <a href="mailto:rajiv.ghoshrajiv@atract.in" className="hover:text-white transition-colors">
                  rajiv.ghoshrajiv@atract.in
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <FaLinkedin className="text-blue-400" />
                <a
                  href="https://www.linkedin.com/in/rajiv-ghosh-841b538/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  LinkedIn Profile
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} AI Prompt Engineering. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
