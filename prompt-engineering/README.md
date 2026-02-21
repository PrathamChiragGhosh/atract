# AI Prompt Engineering Website

A premium React website showcasing AI Product & Automation Consulting services, featuring prompt engineering, workflow design, and case studies.

## Features

- 🎨 Premium, modern UI with Tailwind CSS
- ✨ Smooth animations with Framer Motion
- 📱 Fully responsive design
- 🚀 Fast performance with Vite
- 📄 Case studies and service packages
- 📧 Contact form integration
- 🔗 Atract tools integration

## Tech Stack

- **React 19** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **React Icons** - Icon library

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Navigate to the project directory:
```bash
cd prompt-engineering
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file (optional):
```bash
cp .env.example .env
```
Edit `.env` and set your backend API URL if different from `http://localhost:5001`

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and visit `http://localhost:5173`

## Project Structure

```
prompt-engineering/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx      # Navigation component
│   │   └── Footer.jsx      # Footer component
│   ├── pages/
│   │   ├── Home.jsx        # Landing page
│   │   ├── Services.jsx    # Services/Packages page
│   │   ├── CaseStudies.jsx # Case studies showcase
│   │   ├── Contact.jsx     # Contact form page
│   │   └── Tools.jsx       # Atract tools integration
│   ├── App.jsx             # Main app component with routing
│   ├── main.jsx            # Entry point
│   ├── index.css           # Global styles with Tailwind
│   └── App.css             # Additional styles
├── public/                 # Static assets
├── index.html              # HTML template
├── tailwind.config.js      # Tailwind configuration
├── postcss.config.js       # PostCSS configuration
└── vite.config.js          # Vite configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Configuration

### Update Links

Before deploying, update the following:

1. **Calendly Link**: Replace `https://calendly.com` in:
   - `src/components/Navbar.jsx`
   - `src/pages/Home.jsx`
   - `src/pages/Services.jsx`
   - `src/pages/CaseStudies.jsx`
   - `src/pages/Contact.jsx`

2. **Contact Information**: Update in `src/components/Footer.jsx` and `src/pages/Contact.jsx`:
   - Email address
   - WhatsApp number
   - LinkedIn profile URL

3. **Atract Tools URLs**: Update in `src/pages/Tools.jsx`:
   - Resume Parser URL
   - JD Structuring Tool URL
   - Resume Matching Tool URL

4. **Case Studies PDF**: Add PDF file to `public/` directory and update link in:
   - `src/pages/Home.jsx`
   - `src/pages/CaseStudies.jsx`

5. **Notion Link**: Update Notion case studies link in `src/pages/CaseStudies.jsx`

### Contact Form Integration

The contact form in `src/pages/Contact.jsx` currently logs to console. To integrate with a backend:

1. Set up an API endpoint
2. Update the `handleSubmit` function to send data to your API
3. Consider using services like:
   - EmailJS for direct email sending
   - Your backend API
   - Form submission services (Formspree, etc.)

## Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` directory.

### Deploy Options

- **Vercel**: Connect your GitHub repo and deploy automatically
- **Netlify**: Drag and drop the `dist` folder or connect via Git
- **GitHub Pages**: Use GitHub Actions or manual deployment
- **Custom Server**: Upload `dist` folder to your web server

### Subdomain Setup

To deploy at `atract.com/prompt` or `prompt.atract.com`:

1. Configure your hosting provider's routing
2. Update base path in `vite.config.js` if needed:
```js
export default {
  base: '/prompt/', // if deploying to subdirectory
  // ...
}
```

## Customization

### Colors

Edit `tailwind.config.js` to change the color scheme. The primary color is currently blue.

### Content

All content is in the page components:
- `src/pages/Home.jsx` - Hero and features
- `src/pages/Services.jsx` - Service packages
- `src/pages/CaseStudies.jsx` - Case studies
- `src/pages/Contact.jsx` - Contact information

### Fonts

Fonts are loaded from Google Fonts in `src/index.css`. Currently using:
- Inter (body text)
- Poppins (display text)

## License

Private project - All rights reserved.

## Support

For questions or issues, please contact the development team.
