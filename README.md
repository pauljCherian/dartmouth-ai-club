# Dartmouth AI Club (DAIC) Website

A modern, professional website for the Dartmouth AI Club.

## 🌲 About

The Dartmouth AI Club is an undergraduate-led community dedicated to exploring research and engineering developments in Artificial Intelligence. This website serves as the primary online presence for the organization.

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dartmouth-ai-club
   ```

2. **Install dependencies** (optional, for dev server)
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   
   Or simply open `index.html` in your browser.

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy with zero configuration

## 📁 Project Structure

```
dartmouth-ai-club/
├── index.html          # Main homepage
├── resources.html      # Resources page
├── team.html           # Team/leadership page
├── styles.css          # All styles
├── script.js           # JavaScript for interactivity
├── vercel.json         # Vercel deployment config
├── package.json        # Project metadata
└── README.md           # This file
```

## ✨ Features

- **Modern Design**: Clean, professional aesthetic with Dartmouth branding
- **Responsive**: Works beautifully on desktop, tablet, and mobile
- **Smooth Animations**: Scroll-triggered animations and hover effects
- **Fast Loading**: Pure HTML/CSS/JS with no heavy frameworks
- **Easy to Deploy**: Zero-config deployment to Vercel

## 🎨 Customization

### Colors
The color scheme is based on Dartmouth's brand colors. Edit the CSS custom properties in `styles.css`:

```css
:root {
    --dartmouth-green: #00693E;
    --dartmouth-green-dark: #004d2e;
    --dartmouth-green-light: #00894f;
    /* ... */
}
```

### Content
- Update team member information in `team.html`
- Add your actual meeting times and locations
- Update contact email addresses
- Add links to your actual resources and presentations

### Adding Team Members
Edit `team.html` and add new team cards following the existing pattern:

```html
<div class="team-card animate-on-scroll">
    <div class="team-avatar">👤</div>
    <h3>Member Name</h3>
    <span class="team-role">Role</span>
    <p>Bio or description...</p>
</div>
```

## 📧 Contact

For questions about the website, contact the DAIC team at Dartmouth.Undergraduate.AI.Club@dartmouth.edu

## 📄 License

MIT License - Feel free to use this template for your own student organizations!

