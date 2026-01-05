/**
 * Icon Generator Script
 * Generates PNG icons for the Chrome extension
 * 
 * Run: node scripts/generate-icons.js
 * 
 * If you don't have canvas installed, run:
 * npm install canvas
 */

const fs = require('fs');
const path = require('path');

// Try to use canvas if available, otherwise create placeholder icons
async function generateIcons() {
  const sizes = [16, 32, 48, 128];
  const iconsDir = path.join(__dirname, '..', 'icons');

  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  try {
    // Try to use node-canvas
    const { createCanvas } = require('canvas');

    for (const size of sizes) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      const scale = size / 128;

      // Background - rounded square
      const radius = 24 * scale;
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(size - radius, 0);
      ctx.quadraticCurveTo(size, 0, size, radius);
      ctx.lineTo(size, size - radius);
      ctx.quadraticCurveTo(size, size, size - radius, size);
      ctx.lineTo(radius, size);
      ctx.quadraticCurveTo(0, size, 0, size - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();

      // Gradient background
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#58a6ff');
      gradient.addColorStop(1, '#388bfd');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Sort lines icon
      ctx.strokeStyle = 'white';
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, 6 * scale);

      const padding = 28 * scale;
      const lineSpacing = 24 * scale;
      const baseY = 32 * scale;

      // Line 1 (longest)
      ctx.beginPath();
      ctx.moveTo(padding, baseY);
      ctx.lineTo(size - padding, baseY);
      ctx.stroke();

      // Line 2 (medium)
      ctx.beginPath();
      ctx.moveTo(padding, baseY + lineSpacing);
      ctx.lineTo(size - padding - 20 * scale, baseY + lineSpacing);
      ctx.stroke();

      // Line 3 (shortest)
      ctx.beginPath();
      ctx.moveTo(padding, baseY + lineSpacing * 2);
      ctx.lineTo(size - padding - 45 * scale, baseY + lineSpacing * 2);
      ctx.stroke();

      // Save PNG
      const buffer = canvas.toBuffer('image/png');
      const filePath = path.join(iconsDir, `icon${size}.png`);
      fs.writeFileSync(filePath, buffer);
      console.log(`✓ Generated: icon${size}.png`);
    }

    console.log('\n✅ All icons generated successfully!');

  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('Canvas module not found. Creating simple placeholder icons...');
      console.log('For better icons, install canvas: npm install canvas\n');
      
      // Create simple 1-pixel placeholder PNGs
      // These are minimal valid PNG files
      for (const size of sizes) {
        const filePath = path.join(iconsDir, `icon${size}.png`);
        
        // Check if file already exists
        if (fs.existsSync(filePath)) {
          console.log(`⏭ Skipping: icon${size}.png (already exists)`);
          continue;
        }
        
        console.log(`⚠ icon${size}.png needs to be created manually`);
      }
      
      console.log('\n📋 To generate proper icons:');
      console.log('1. Open icons/generate-icons.html in Chrome');
      console.log('2. Click "Download All Icons"');
      console.log('3. Move the downloaded files to the icons folder');
      
    } else {
      throw error;
    }
  }
}

generateIcons().catch(console.error);

