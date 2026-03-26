const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Colors from the Hidden Depths brand
const COLORS = {
  background: '#000000',
  teal: '#14B8A6',
  tealDark: '#0D9488',
  white: '#FFFFFF',
  gray: '#9CA3AF',
};

function createOGImage(width, height, filename, isTwitter = false) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background - solid black
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  // Add subtle gradient overlay from top-left
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, width * 0.8);
  gradient.addColorStop(0, 'rgba(20, 184, 166, 0.15)');
  gradient.addColorStop(0.5, 'rgba(20, 184, 166, 0.05)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add decorative circles (representing depth/layers)
  ctx.strokeStyle = 'rgba(20, 184, 166, 0.2)';
  ctx.lineWidth = 2;
  
  // Large circle on the right side
  ctx.beginPath();
  ctx.arc(width - 150, height / 2, 200, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(width - 150, height / 2, 280, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(width - 150, height / 2, 360, 0, Math.PI * 2);
  ctx.stroke();

  // Small decorative dots
  ctx.fillStyle = COLORS.teal;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(80 + i * 15, 80, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Main title: "Hidden Depths"
  ctx.fillStyle = COLORS.white;
  ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textBaseline = 'middle';
  
  const title = 'Hidden Depths';
  const titleY = height / 2 - 60;
  ctx.fillText(title, 80, titleY);

  // Teal underline accent
  const titleMetrics = ctx.measureText(title);
  ctx.fillStyle = COLORS.teal;
  ctx.fillRect(80, titleY + 45, titleMetrics.width * 0.4, 4);

  // Tagline
  ctx.fillStyle = COLORS.gray;
  ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Anonymous Mental Health Support', 80, titleY + 90);

  // Secondary tagline
  ctx.fillStyle = 'rgba(156, 163, 175, 0.7)';
  ctx.font = 'italic 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('"When your head is full and you need a space to think"', 80, titleY + 135);

  // Price badge
  const badgeX = 80;
  const badgeY = titleY + 175;
  const badgeWidth = 200;
  const badgeHeight = 45;
  const badgeRadius = 22;

  // Badge background
  ctx.fillStyle = COLORS.teal;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeRadius);
  ctx.fill();

  // Badge text
  ctx.fillStyle = COLORS.background;
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('Sessions from ₹99', badgeX + 20, badgeY + badgeHeight / 2);

  // Bottom border accent
  ctx.fillStyle = COLORS.teal;
  ctx.fillRect(0, height - 6, width, 6);

  // Save the image
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(__dirname, '..', 'public', filename);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Created: ${outputPath}`);
  
  return outputPath;
}

// Create both images
console.log('Generating Open Graph images for Hidden Depths...\n');

createOGImage(1200, 630, 'og-image.png', false);
createOGImage(1200, 630, 'twitter-image.png', true);

console.log('\n✅ All images generated successfully!');
