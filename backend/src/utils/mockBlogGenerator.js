// Mock blog generator - generates realistic blog content without AI

const fallbackTopics = [
  'Technology Trends',
  'Web Development',
  'Artificial Intelligence',
  'Cloud Computing',
  'Cybersecurity',
  'Data Science',
  'Mobile Development',
  'DevOps',
  'Software Engineering',
  'Digital Marketing',
];

const getRandomTopic = (topics) => {
  const availableTopics = topics && topics.length > 0 ? topics : fallbackTopics;
  return availableTopics[Math.floor(Math.random() * availableTopics.length)];
};

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const generateMockContent = (topic) => {
  const paragraphs = [
    `<h2>Introduction to ${topic}</h2>`,
    `<p>In today's rapidly evolving digital landscape, ${topic} has become one of the most critical areas of focus for businesses and individuals alike. Understanding the fundamentals and staying updated with the latest trends is essential for success in this field.</p>`,
    `<h3>Key Concepts and Principles</h3>`,
    `<p>The foundation of ${topic} rests on several core principles that have been developed and refined over years of research and practical application. These principles guide professionals in making informed decisions and implementing effective strategies.</p>`,
    `<p>One of the most important aspects to consider is how ${topic} integrates with existing systems and workflows. This integration often requires careful planning and a deep understanding of both technical and business requirements.</p>`,
    `<h3>Best Practices and Implementation</h3>`,
    `<p>When implementing solutions related to ${topic}, it's crucial to follow industry best practices. These practices have been proven to deliver consistent results and minimize potential risks. Many organizations have successfully adopted these approaches, leading to significant improvements in their operations.</p>`,
    `<p>Another critical factor is the importance of continuous learning and adaptation. The field of ${topic} is constantly evolving, with new technologies, methodologies, and insights emerging regularly. Professionals must stay committed to ongoing education and skill development.</p>`,
    `<h3>Real-World Applications</h3>`,
    `<p>${topic} has found applications across numerous industries and sectors. From startups to large enterprises, organizations are leveraging these concepts to drive innovation and achieve their strategic objectives.</p>`,
    `<p>Case studies from various companies demonstrate the tangible benefits of effectively implementing ${topic} strategies. These success stories provide valuable insights and serve as inspiration for others looking to embark on similar journeys.</p>`,
    `<h3>Future Outlook</h3>`,
    `<p>Looking ahead, ${topic} is expected to continue its trajectory of growth and innovation. Emerging technologies and changing market dynamics will likely shape the future direction of this field, presenting both opportunities and challenges.</p>`,
    `<p>As we move forward, it's important for professionals and organizations to remain agile and adaptable. The ability to quickly respond to changes and embrace new approaches will be key to success in the evolving landscape of ${topic}.</p>`,
    `<h3>Conclusion</h3>`,
    `<p>In conclusion, ${topic} represents a dynamic and exciting field with tremendous potential. By understanding its core principles, following best practices, and staying committed to continuous improvement, individuals and organizations can achieve remarkable results.</p>`,
  ];

  return paragraphs.join('\n');
};

const generateMockBlog = (topic) => {
  // If topic is provided and valid, use it; otherwise use random fallback
  const selectedTopic = topic && topic.trim().length > 0 
    ? topic.trim() 
    : getRandomTopic([]);
  const title = `Understanding ${selectedTopic}: A Comprehensive Guide`;
  const slug = generateSlug(title);
  const content = generateMockContent(selectedTopic);

  return {
    title,
    slug,
    topic: selectedTopic,
    content,
    status: 'published',
  };
};

module.exports = {
  generateMockBlog,
};
