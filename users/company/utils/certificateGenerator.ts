import { CertificateTemplate, SAMPLE_PREVIEW_DATA } from './certificateTemplates';
import CloudinaryService from '../../../lib/cloudinaryService';

export interface InternData {
  firstName: string;
  lastName: string;
  totalHours: number;
  startDate: string;
  endDate: string;
}

export interface CompanyData {
  companyName: string;
  address: string;
  signature?: string | null;
  contactPerson?: string | null;
  contactPersonTitle?: string;
}

export interface CertificateGenerationResult {
  success: boolean;
  certificateUrl?: string;
  certificatePublicId?: string;
  studentId: string;
  applicationId: string;
  error?: string;
}

// Helper function to format date
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    // Get ordinal suffix
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    
    return `${day}${suffix} day of ${month} ${year}`;
  } catch (error) {
    return dateString;
  }
}

// Helper function to draw text with letter spacing
function drawTextWithLetterSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number
) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  // Calculate total width with letter spacing
  let totalWidth = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const metrics = ctx.measureText(char);
    totalWidth += metrics.width;
    if (i < text.length - 1) {
      totalWidth += letterSpacing;
    }
  }
  
  // Draw each character with spacing
  let currentX = x - totalWidth / 2;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    ctx.fillText(char, currentX, y);
    const metrics = ctx.measureText(char);
    currentX += metrics.width + letterSpacing;
  }
}

// Helper function to draw multi-line text
function drawMultiLineText(
  ctx: CanvasRenderingContext2D,
  text: string,
  config: {
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    color: string;
    lineHeight: number;
  },
  x: number,
  y: number,
  maxWidth: number
) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  
  ctx.font = `${config.fontWeight} ${config.fontSize}px ${config.fontFamily}`;
  ctx.fillStyle = config.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  
  for (let word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, currentY);
      line = word + ' ';
      currentY += config.lineHeight;
    } else {
      line = testLine;
    }
  }
  
  if (line.trim()) {
    ctx.fillText(line.trim(), x, currentY);
  }
}

// Helper function to load image
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = (error) => {
      console.error('Error loading image:', error);
      reject(error);
    };
    
    img.src = url;
  });
}

// Helper function to embed signature image
function embedSignatureImage(
  ctx: CanvasRenderingContext2D,
  signatureUrl: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    loadImage(signatureUrl)
      .then((img) => {
        const aspectRatio = img.width / img.height;
        let width = maxWidth;
        let height = maxWidth / aspectRatio;
        
        if (height > maxHeight) {
          height = maxHeight;
          width = maxHeight * aspectRatio;
        }
        
        const drawX = x - width / 2;
        const drawY = y;
        
        ctx.drawImage(img, drawX, drawY, width, height);
        resolve();
      })
      .catch(reject);
  });
}

// Helper function to draw wavy line
function drawWavyLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  amplitude: number = 5,
  frequency: number = 0.05
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  
  const isHorizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);
  const length = isHorizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
  const steps = Math.floor(length * frequency);
  
  if (isHorizontal) {
    const startX = Math.min(x1, x2);
    const y = y1;
    ctx.moveTo(startX, y);
    for (let i = 0; i <= steps; i++) {
      const x = startX + (length / steps) * i;
      const waveY = y + Math.sin((i / steps) * Math.PI * 4) * amplitude;
      ctx.lineTo(x, waveY);
    }
  } else {
    const x = x1;
    const startY = Math.min(y1, y2);
    ctx.moveTo(x, startY);
    for (let i = 0; i <= steps; i++) {
      const y = startY + (length / steps) * i;
      const waveX = x + Math.sin((i / steps) * Math.PI * 4) * amplitude;
      ctx.lineTo(waveX, y);
    }
  }
  ctx.stroke();
}

// Helper function to draw scalloped line
function drawScallopedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
  radius: number = 8
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  
  const isHorizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);
  const length = isHorizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
  const segments = Math.floor(length / (radius * 2));
  
  if (isHorizontal) {
    const startX = Math.min(x1, x2);
    const y = y1;
    for (let i = 0; i < segments; i++) {
      const x = startX + (length / segments) * i;
      ctx.arc(x + radius, y, radius, Math.PI, 0, false);
    }
  } else {
    const x = x1;
    const startY = Math.min(y1, y2);
    for (let i = 0; i < segments; i++) {
      const y = startY + (length / segments) * i;
      ctx.arc(x, y + radius, radius, Math.PI / 2, -Math.PI / 2, false);
    }
  }
  ctx.stroke();
}

// Helper function to draw dotted line
function drawDottedLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  dotSize: number = 4,
  spacing: number = 8
) {
  ctx.fillStyle = color;
  const isHorizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1);
  const length = isHorizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1);
  const dots = Math.floor(length / (dotSize + spacing));
  
  if (isHorizontal) {
    const startX = Math.min(x1, x2);
    const y = y1;
    for (let i = 0; i < dots; i++) {
      const x = startX + (length / dots) * i;
      ctx.beginPath();
      ctx.arc(x, y, dotSize / 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  } else {
    const x = x1;
    const startY = Math.min(y1, y2);
    for (let i = 0; i < dots; i++) {
      const y = startY + (length / dots) * i;
      ctx.beginPath();
      ctx.arc(x, y, dotSize / 2, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

// Helper function to draw striped border
function drawStripedBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  stripeWidth: number = 4,
  isVertical: boolean = true
) {
  ctx.fillStyle = color;
  if (isVertical) {
    for (let i = 0; i < width; i += stripeWidth * 2) {
      ctx.fillRect(x + i, y, stripeWidth, height);
    }
  } else {
    for (let i = 0; i < height; i += stripeWidth * 2) {
      ctx.fillRect(x, y + i, width, stripeWidth);
    }
  }
}

// Helper function to draw checkerboard border
function drawCheckerboardBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  squareSize: number = 8
) {
  ctx.fillStyle = color;
  const cols = Math.floor(width / squareSize);
  const rows = Math.floor(height / squareSize);
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if ((row + col) % 2 === 0) {
        ctx.fillRect(x + col * squareSize, y + row * squareSize, squareSize, squareSize);
      }
    }
  }
}

// Draw multi-color borders with decorative patterns
function drawBorders(ctx: CanvasRenderingContext2D, template: CertificateTemplate) {
  const { border, decorativeBorders } = template.config;
  const canvas = ctx.canvas;
  
  // Draw decorative borders first (as background) if enabled
  if (decorativeBorders.enabled) {
    // Top decorative border
    ctx.fillStyle = decorativeBorders.topColor;
    ctx.fillRect(0, 0, canvas.width, decorativeBorders.topWidth);
    
    // Right decorative border
    ctx.fillStyle = decorativeBorders.rightColor;
    ctx.fillRect(canvas.width - decorativeBorders.rightWidth, 0, decorativeBorders.rightWidth, canvas.height);
    
    // Bottom decorative border (with curved center)
    ctx.fillStyle = decorativeBorders.bottomColor;
    ctx.fillRect(0, canvas.height - decorativeBorders.bottomWidth, canvas.width, decorativeBorders.bottomWidth);
    
    // Create curved effect on bottom border
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 100, canvas.height - decorativeBorders.bottomWidth);
    ctx.quadraticCurveTo(
      canvas.width / 2,
      canvas.height - decorativeBorders.bottomWidth - 20,
      canvas.width / 2 + 100,
      canvas.height - decorativeBorders.bottomWidth
    );
    ctx.fill();
    
    // Left decorative border (tapered)
    ctx.fillStyle = decorativeBorders.leftColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(decorativeBorders.leftWidth, 0);
    ctx.lineTo(decorativeBorders.leftWidth * 0.7, canvas.height / 2);
    ctx.lineTo(decorativeBorders.leftWidth, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.lineWidth = border.width;
  ctx.setLineDash([]);
  
  // Draw border patterns on top (more visible, positioned on the decorative border)
  const borderY = decorativeBorders.enabled ? decorativeBorders.topWidth / 2 : border.width / 2;
  const borderX = decorativeBorders.enabled ? decorativeBorders.leftWidth / 2 : border.width / 2;
  const borderRightX = decorativeBorders.enabled ? canvas.width - decorativeBorders.rightWidth / 2 : canvas.width - border.width / 2;
  const borderBottomY = decorativeBorders.enabled ? canvas.height - decorativeBorders.bottomWidth / 2 : canvas.height - border.width / 2;
  
  // Draw borders based on style - positioned on decorative borders if enabled
  if (border.style === 'wavy') {
    // Top border - make it more visible with thicker line and larger amplitude
    drawWavyLine(ctx, 0, borderY, canvas.width, borderY, border.topColor, Math.max(border.width, 4), 12);
    // Right border
    drawWavyLine(ctx, borderRightX, 0, borderRightX, canvas.height, border.rightColor, Math.max(border.width, 4), 12);
    // Bottom border
    drawWavyLine(ctx, 0, borderBottomY, canvas.width, borderBottomY, border.bottomColor, Math.max(border.width, 4), 12);
    // Left border
    drawWavyLine(ctx, borderX, 0, borderX, canvas.height, border.leftColor, Math.max(border.width, 4), 12);
  } else if (border.style === 'scalloped') {
    // Top border - larger radius for clearer scallops
    drawScallopedLine(ctx, 0, borderY, canvas.width, borderY, border.topColor, Math.max(border.width, 4), 16);
    // Right border
    drawScallopedLine(ctx, borderRightX, 0, borderRightX, canvas.height, border.rightColor, Math.max(border.width, 4), 16);
    // Bottom border
    drawScallopedLine(ctx, 0, borderBottomY, canvas.width, borderBottomY, border.bottomColor, Math.max(border.width, 4), 16);
    // Left border
    drawScallopedLine(ctx, borderX, 0, borderX, canvas.height, border.leftColor, Math.max(border.width, 4), 16);
  } else if (border.style === 'double-wavy') {
    // Draw double wavy lines - clearer with larger amplitude
    const offset = Math.max(border.width, 6);
    // Top border
    drawWavyLine(ctx, 0, borderY, canvas.width, borderY, border.topColor, Math.max(border.width / 2, 3), 10);
    drawWavyLine(ctx, 0, borderY + offset, canvas.width, borderY + offset, border.topColor, Math.max(border.width / 2, 3), 10);
    // Right border
    drawWavyLine(ctx, borderRightX, 0, borderRightX, canvas.height, border.rightColor, Math.max(border.width / 2, 3), 10);
    drawWavyLine(ctx, borderRightX - offset, 0, borderRightX - offset, canvas.height, border.rightColor, Math.max(border.width / 2, 3), 10);
    // Bottom border
    drawWavyLine(ctx, 0, borderBottomY, canvas.width, borderBottomY, border.bottomColor, Math.max(border.width / 2, 3), 10);
    drawWavyLine(ctx, 0, borderBottomY - offset, canvas.width, borderBottomY - offset, border.bottomColor, Math.max(border.width / 2, 3), 10);
    // Left border
    drawWavyLine(ctx, borderX, 0, borderX, canvas.height, border.leftColor, Math.max(border.width / 2, 3), 10);
    drawWavyLine(ctx, borderX + offset, 0, borderX + offset, canvas.height, border.leftColor, Math.max(border.width / 2, 3), 10);
  } else if (border.style === 'dotted') {
    // Top border - make dots bigger and more visible
    drawDottedLine(ctx, 0, borderY, canvas.width, borderY, border.topColor, Math.max(border.width, 7), Math.max(border.width * 1.2, 8));
    // Right border
    drawDottedLine(ctx, borderRightX, 0, borderRightX, canvas.height, border.rightColor, Math.max(border.width, 7), Math.max(border.width * 1.2, 8));
    // Bottom border
    drawDottedLine(ctx, 0, borderBottomY, canvas.width, borderBottomY, border.bottomColor, Math.max(border.width, 7), Math.max(border.width * 1.2, 8));
    // Left border
    drawDottedLine(ctx, borderX, 0, borderX, canvas.height, border.leftColor, Math.max(border.width, 7), Math.max(border.width * 1.2, 8));
  } else if (border.style === 'striped') {
    // Top border
    drawStripedBorder(ctx, 0, 0, canvas.width, decorativeBorders.enabled ? decorativeBorders.topWidth : border.width, border.topColor, 5, false);
    // Right border
    drawStripedBorder(ctx, canvas.width - (decorativeBorders.enabled ? decorativeBorders.rightWidth : border.width), 0, decorativeBorders.enabled ? decorativeBorders.rightWidth : border.width, canvas.height, border.rightColor, 5, true);
    // Bottom border
    drawStripedBorder(ctx, 0, canvas.height - (decorativeBorders.enabled ? decorativeBorders.bottomWidth : border.width), canvas.width, decorativeBorders.enabled ? decorativeBorders.bottomWidth : border.width, border.bottomColor, 5, false);
    // Left border
    drawStripedBorder(ctx, 0, 0, decorativeBorders.enabled ? decorativeBorders.leftWidth : border.width, canvas.height, border.leftColor, 5, true);
  } else if (border.style === 'checkerboard') {
    // Top border
    drawCheckerboardBorder(ctx, 0, 0, canvas.width, decorativeBorders.enabled ? decorativeBorders.topWidth : border.width, border.topColor, 10);
    // Right border
    drawCheckerboardBorder(ctx, canvas.width - (decorativeBorders.enabled ? decorativeBorders.rightWidth : border.width), 0, decorativeBorders.enabled ? decorativeBorders.rightWidth : border.width, canvas.height, border.rightColor, 10);
    // Bottom border
    drawCheckerboardBorder(ctx, 0, canvas.height - (decorativeBorders.enabled ? decorativeBorders.bottomWidth : border.width), canvas.width, decorativeBorders.enabled ? decorativeBorders.bottomWidth : border.width, border.bottomColor, 10);
    // Left border
    drawCheckerboardBorder(ctx, 0, 0, decorativeBorders.enabled ? decorativeBorders.leftWidth : border.width, canvas.height, border.leftColor, 10);
  } else if (border.style === 'curly') {
    // Curly/spiral border - using more complex wavy pattern with larger amplitude
    // Top border
    drawWavyLine(ctx, 0, borderY, canvas.width, borderY, border.topColor, Math.max(border.width, 4), 14, 0.025);
    // Right border
    drawWavyLine(ctx, borderRightX, 0, borderRightX, canvas.height, border.rightColor, Math.max(border.width, 4), 14, 0.025);
    // Bottom border
    drawWavyLine(ctx, 0, borderBottomY, canvas.width, borderBottomY, border.bottomColor, Math.max(border.width, 4), 14, 0.025);
    // Left border
    drawWavyLine(ctx, borderX, 0, borderX, canvas.height, border.leftColor, Math.max(border.width, 4), 14, 0.025);
  } else if (border.style === 'double') {
    // Double border - draw two parallel lines
    const offset = Math.max(border.width, 4);
    // Top border
    ctx.strokeStyle = border.topColor;
    ctx.lineWidth = Math.max(border.width, 2);
    ctx.beginPath();
    ctx.moveTo(0, borderY);
    ctx.lineTo(canvas.width, borderY);
    ctx.moveTo(0, borderY + offset);
    ctx.lineTo(canvas.width, borderY + offset);
    ctx.stroke();
    // Right border
    ctx.strokeStyle = border.rightColor;
    ctx.beginPath();
    ctx.moveTo(borderRightX, 0);
    ctx.lineTo(borderRightX, canvas.height);
    ctx.moveTo(borderRightX - offset, 0);
    ctx.lineTo(borderRightX - offset, canvas.height);
    ctx.stroke();
    // Bottom border
    ctx.strokeStyle = border.bottomColor;
    ctx.beginPath();
    ctx.moveTo(0, borderBottomY);
    ctx.lineTo(canvas.width, borderBottomY);
    ctx.moveTo(0, borderBottomY - offset);
    ctx.lineTo(canvas.width, borderBottomY - offset);
    ctx.stroke();
    // Left border
    ctx.strokeStyle = border.leftColor;
    ctx.beginPath();
    ctx.moveTo(borderX, 0);
    ctx.lineTo(borderX, canvas.height);
    ctx.moveTo(borderX + offset, 0);
    ctx.lineTo(borderX + offset, canvas.height);
    ctx.stroke();
  } else {
    // Default solid borders - make them thicker and clearer
    ctx.lineWidth = Math.max(border.width, 4);
    // Top border
    ctx.strokeStyle = border.topColor;
    ctx.beginPath();
    ctx.moveTo(0, borderY);
    ctx.lineTo(canvas.width, borderY);
    ctx.stroke();
    
    // Right border
    ctx.strokeStyle = border.rightColor;
    ctx.beginPath();
    ctx.moveTo(borderRightX, 0);
    ctx.lineTo(borderRightX, canvas.height);
    ctx.stroke();
    
    // Bottom border
    ctx.strokeStyle = border.bottomColor;
    ctx.beginPath();
    ctx.moveTo(0, borderBottomY);
    ctx.lineTo(canvas.width, borderBottomY);
    ctx.stroke();
    
    // Left border
    ctx.strokeStyle = border.leftColor;
    ctx.beginPath();
    ctx.moveTo(borderX, 0);
    ctx.lineTo(borderX, canvas.height);
    ctx.stroke();
  }
}

// Draw logo
function drawLogo(ctx: CanvasRenderingContext2D, template: CertificateTemplate, companyName: string) {
  const { logo } = template.config;
  if (!logo.enabled) return;
  
  const centerX = template.config.layout.centerX;
  const y = logo.yPosition;
  const size = logo.size || 80;
  
  ctx.save();
  
  // Draw shape background
  if (logo.backgroundColor && logo.backgroundColor !== 'transparent') {
    ctx.fillStyle = logo.backgroundColor;
    
    if (logo.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(centerX, y, size / 2, 0, 2 * Math.PI);
      ctx.fill();
    } else if (logo.shape === 'hexagon') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = centerX + (size / 2) * Math.cos(angle);
        const yPos = y + (size / 2) * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, yPos);
        else ctx.lineTo(x, yPos);
      }
      ctx.closePath();
      ctx.fill();
    } else if (logo.shape === 'square') {
      ctx.fillRect(centerX - size / 2, y - size / 2, size, size);
    }
  }
  
  // Draw logo text
  const logoText = logo.text || companyName.charAt(0).toUpperCase();
  ctx.font = `${logo.fontWeight} ${logo.fontSize}px ${logo.fontFamily}`;
  ctx.fillStyle = logo.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(logoText, centerX, y);
  
  ctx.restore();
}

// Helper function to draw rounded rectangle
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Draw banner
function drawBanner(ctx: CanvasRenderingContext2D, template: CertificateTemplate) {
  const { banner } = template.config;
  if (!banner.enabled) return;
  
  const centerX = template.config.layout.centerX;
  const y = banner.yPosition + 40; // Lower the banner by 40px
  const width = template.config.layout.contentWidth * 0.6;
  const height = banner.height;
  
  // Ensure full opacity for banner background
  ctx.save();
  ctx.globalAlpha = 1.0;
  
  // Draw banner background - fully opaque to cover anything behind
  ctx.fillStyle = banner.backgroundColor;
  drawRoundedRect(ctx, centerX - width / 2, y - height / 2, width, height, banner.borderRadius);
  ctx.fill();
  
  // Draw banner text
  ctx.font = `${banner.fontWeight} ${banner.fontSize}px ${banner.fontFamily}`;
  ctx.fillStyle = banner.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(banner.text, centerX, y);
  
  ctx.restore();
}

// Draw gold seal - realistic embossed design matching photo
function drawSeal(ctx: CanvasRenderingContext2D, template: CertificateTemplate) {
  const { seal } = template.config;
  if (!seal.enabled) return;
  
  const centerX = template.config.layout.centerX;
  const y = seal.yPosition;
  const radius = seal.size / 2;
  
  ctx.save();
  
  // Create shadow for embossed effect
  const shadowGradient = ctx.createRadialGradient(centerX + 4, y + 4, 0, centerX + 4, y + 4, radius + 6);
  shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
  shadowGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.1)');
  shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGradient;
  ctx.beginPath();
  ctx.arc(centerX + 4, y + 4, radius + 6, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw serrated outer edge (star/gear-like points)
  const numPoints = 24; // Number of serrated points
  const pointDepth = 8; // Depth of each point
  const outerRadius = radius;
  const innerRadius = radius - pointDepth;
  
  ctx.beginPath();
  for (let i = 0; i < numPoints * 2; i++) {
    const angle = (Math.PI / numPoints) * i;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const x = centerX + Math.cos(angle) * r;
    const yPos = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, yPos);
    else ctx.lineTo(x, yPos);
  }
  ctx.closePath();
  
  // Fill serrated edge with gold gradient
  const outerGradient = ctx.createRadialGradient(centerX - radius * 0.2, y - radius * 0.2, 0, centerX, y, radius);
  outerGradient.addColorStop(0, '#FFD700');
  outerGradient.addColorStop(0.3, '#F4D03F');
  outerGradient.addColorStop(0.6, seal.color);
  outerGradient.addColorStop(0.9, '#D4AF37');
  outerGradient.addColorStop(1, '#B8860B');
  ctx.fillStyle = outerGradient;
  ctx.fill();
  
  // Smooth inner ring (raised band)
  const smoothRingRadius = radius - pointDepth - 4;
  const smoothRingWidth = 6;
  const smoothRingGradient = ctx.createRadialGradient(centerX - smoothRingRadius * 0.2, y - smoothRingRadius * 0.2, 0, centerX, y, smoothRingRadius);
  smoothRingGradient.addColorStop(0, '#FFD700');
  smoothRingGradient.addColorStop(0.5, '#F4D03F');
  smoothRingGradient.addColorStop(1, '#D4AF37');
  ctx.fillStyle = smoothRingGradient;
  ctx.beginPath();
  ctx.arc(centerX, y, smoothRingRadius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Decorative wreath pattern ring (leaf/chevron shapes pointing inward)
  const wreathOuterRadius = smoothRingRadius - smoothRingWidth;
  const wreathInnerRadius = wreathOuterRadius - 8;
  const numLeaves = 16;
  
  ctx.fillStyle = '#D4AF37';
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 1;
  
  for (let i = 0; i < numLeaves; i++) {
    const angle = (2 * Math.PI / numLeaves) * i;
    const leafCenterX = centerX + Math.cos(angle) * ((wreathOuterRadius + wreathInnerRadius) / 2);
    const leafCenterY = y + Math.sin(angle) * ((wreathOuterRadius + wreathInnerRadius) / 2);
    
    // Draw chevron/leaf shape pointing inward
    ctx.save();
    ctx.translate(leafCenterX, leafCenterY);
    ctx.rotate(angle + Math.PI / 2);
    
    ctx.beginPath();
    ctx.moveTo(0, -(wreathOuterRadius - wreathInnerRadius) / 2);
    ctx.lineTo(-3, (wreathOuterRadius - wreathInnerRadius) / 2);
    ctx.lineTo(0, (wreathOuterRadius - wreathInnerRadius) / 2 + 2);
    ctx.lineTo(3, (wreathOuterRadius - wreathInnerRadius) / 2);
    ctx.closePath();
    
    // Gradient for each leaf
    const leafGradient = ctx.createLinearGradient(0, -(wreathOuterRadius - wreathInnerRadius) / 2, 0, (wreathOuterRadius - wreathInnerRadius) / 2 + 2);
    leafGradient.addColorStop(0, '#FFD700');
    leafGradient.addColorStop(0.5, '#D4AF37');
    leafGradient.addColorStop(1, '#B8860B');
    ctx.fillStyle = leafGradient;
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }
  
  // Central smooth area with radial texture
  const centerRadius = wreathInnerRadius - 4;
  const centerGradient = ctx.createRadialGradient(centerX - centerRadius * 0.3, y - centerRadius * 0.3, 0, centerX, y, centerRadius);
  centerGradient.addColorStop(0, '#FFF8DC');
  centerGradient.addColorStop(0.2, '#FFD700');
  centerGradient.addColorStop(0.5, '#F4D03F');
  centerGradient.addColorStop(0.8, seal.color);
  centerGradient.addColorStop(1, '#D4AF37');
  ctx.fillStyle = centerGradient;
  ctx.beginPath();
  ctx.arc(centerX, y, centerRadius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Add radial texture to center (concentric circles)
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i <= 5; i++) {
    const textureRadius = centerRadius * (i / 6);
    ctx.beginPath();
    ctx.arc(centerX, y, textureRadius, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  // Highlight for embossed effect (top-left)
  const highlightGradient = ctx.createRadialGradient(centerX - centerRadius * 0.4, y - centerRadius * 0.4, 0, centerX, y, centerRadius * 0.7);
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
  highlightGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.arc(centerX, y, centerRadius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Shadow for embossed effect (bottom-right)
  const shadowInnerGradient = ctx.createRadialGradient(centerX + centerRadius * 0.3, y + centerRadius * 0.3, 0, centerX, y, centerRadius * 0.7);
  shadowInnerGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
  shadowInnerGradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.15)');
  shadowInnerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowInnerGradient;
  ctx.beginPath();
  ctx.arc(centerX, y, centerRadius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Inner border of center area
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(centerX, y, centerRadius - 1, 0, 2 * Math.PI);
  ctx.stroke();
  
  // Draw seal text in center if provided
  if (seal.text) {
    ctx.font = `bold ${Math.min(centerRadius / 4, 16)}px Arial, sans-serif`;
    ctx.fillStyle = seal.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(seal.text, centerX, y);
  }
  
  ctx.restore();
}

/**
 * Generate certificate preview (smaller, faster version)
 */
export async function generateCertificatePreview(
  template: CertificateTemplate,
  internData: InternData | typeof SAMPLE_PREVIEW_DATA,
  companyData: CompanyData
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d')!;
  const scale = 0.5;
  
  const { config } = template;
  const centerX = canvas.width / 2;
  
  // Handle custom template with background image
  if (template.isCustom && template.customImageUrl) {
    try {
      // Load and draw custom background image (scaled)
      const bgImage = await loadImage(template.customImageUrl);
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
      
      // Use custom text zones if provided (scaled)
      const textZones = template.textZones || {};
      
      // Draw student name
      const firstName = internData.firstName || '';
      const lastName = internData.lastName || '';
      const studentName = `${firstName} ${lastName}`.trim() || 'Student Name';
      
      if (textZones.studentName) {
        const zone = textZones.studentName;
        ctx.font = `${config.text.studentName.fontStyle || 'normal'} ${config.text.studentName.fontWeight} ${config.text.studentName.fontSize * scale}px ${config.text.studentName.fontFamily}`;
        ctx.fillStyle = config.text.studentName.color;
        ctx.textAlign = zone.align || 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(studentName, zone.x * scale, zone.y * scale);
      } else {
        ctx.font = `${config.text.studentName.fontStyle || 'normal'} ${config.text.studentName.fontWeight} ${config.text.studentName.fontSize * scale}px ${config.text.studentName.fontFamily}`;
        ctx.fillStyle = config.text.studentName.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(studentName, centerX, (config.text.studentName.yPosition + 50) * scale);
      }
      
      // Draw body text
      const bodyText = `This is to certify that ${studentName} has successfully completed the On-the-Job Training (OJT) program, demonstrating exceptional dedication, professionalism, and commitment throughout ${internData.totalHours} hours of intensive training from ${formatDate(internData.startDate)} to ${formatDate(internData.endDate)} at ${companyData.companyName}, ${companyData.address}. During this period, ${studentName} has shown outstanding performance, acquired valuable practical skills, and contributed meaningfully to the organization. This certificate recognizes their hard work, perseverance, and the significant knowledge and experience gained during their internship journey.`;
      
      if (textZones.body) {
        const zone = textZones.body;
        drawMultiLineText(
          ctx,
          bodyText,
          {
            ...config.text.body,
            fontSize: config.text.body.fontSize * scale
          },
          zone.x * scale,
          zone.y * scale,
          zone.width * scale
        );
      } else {
        // Default position - lowered by 50px (scaled) for better spacing
        drawMultiLineText(
          ctx,
          bodyText,
          {
            ...config.text.body,
            fontSize: config.text.body.fontSize * scale
          },
          centerX,
          (config.text.studentName.yPosition + 200) * scale,
          config.layout.contentWidth * scale
        );
      }
      
      // Draw signature section
      const sigY = (textZones.signature?.y || canvas.height * 2 - 280) * scale;
      const sigX = (textZones.signature?.x || centerX * 2) * scale;
      const sigWidth = (textZones.signature?.width || 350) * scale;
      
      // Draw signature image
      if (companyData.signature) {
        try {
          await embedSignatureImage(
            ctx,
            companyData.signature,
            sigX,
            sigY - 150 * scale,
            325 * scale,
            130 * scale
          );
        } catch (error) {
          console.error('Error embedding signature in preview:', error);
        }
      }
      
      // Draw signature label
      if (textZones.signatureLabel) {
        const zone = textZones.signatureLabel;
        ctx.font = `bold ${(config.text.signatureLabel.fontSize + 8) * scale}px ${config.text.signatureLabel.fontFamily}`;
        ctx.fillStyle = config.text.signatureLabel.color;
        ctx.textAlign = zone.align || 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SIGNATURE', zone.x * scale, zone.y * scale);
      } else {
        ctx.font = `bold ${(config.text.signatureLabel.fontSize + 8) * scale}px ${config.text.signatureLabel.fontFamily}`;
        ctx.fillStyle = config.text.signatureLabel.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SIGNATURE', centerX, sigY);
      }
      
      // Draw contact person
      if (companyData.contactPerson) {
        const contactY = (textZones.contactPerson?.y || sigY / scale + 130) * scale;
        const contactX = (textZones.contactPerson?.x || centerX * 2) * scale;
        ctx.font = `bold ${(config.text.body.fontSize + 8) * scale}px ${config.text.body.fontFamily}`;
        ctx.fillStyle = config.text.body.color;
        ctx.textAlign = textZones.contactPerson?.align || 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(companyData.contactPerson, contactX, contactY);
      }
      
      // Draw contact person title
      if (companyData.contactPersonTitle) {
        const titleY = (textZones.contactPersonTitle?.y || sigY / scale + 165) * scale;
        const titleX = (textZones.contactPersonTitle?.x || centerX * 2) * scale;
        ctx.font = `${(config.text.body.fontSize + 6) * scale}px ${config.text.body.fontFamily}`;
        ctx.fillStyle = config.text.body.color;
        ctx.textAlign = textZones.contactPersonTitle?.align || 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(companyData.contactPersonTitle || '', titleX, titleY);
      }
      
      return canvas.toDataURL('image/png', 0.9);
    } catch (error) {
      console.error('Error loading custom template image for preview:', error);
      // Fall back to white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
  
  // Standard template preview (existing code)
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw borders (scaled)
  drawBordersScaled(ctx, template, scale);
  
  // Draw logo (scaled)
  if (config.logo.enabled) {
    drawLogoScaled(ctx, template, companyData.companyName, scale);
  }
  
  // Draw "CERTIFICATE" text (scaled) - always visible
  // Match the full-size positioning exactly
  if (config.banner.enabled) {
    // If banner exists, draw CERTIFICATE above the banner (banner is lowered by 40px, so adjust)
    // Position with more space from top to ensure visibility
    const certY = ((config.banner.yPosition + 40) - config.banner.height / 2 - 60) * scale;
    ctx.font = `${config.text.mainTitle.fontWeight} ${config.text.mainTitle.fontSize * scale}px ${config.text.mainTitle.fontFamily}`;
    ctx.fillStyle = config.text.mainTitle.color;
    drawTextWithLetterSpacing(
      ctx,
      'CERTIFICATE',
      centerX,
      certY,
      config.text.mainTitle.letterSpacing * scale
    );
  } else {
    // If no banner, draw CERTIFICATE at mainTitle position
    ctx.font = `${config.text.mainTitle.fontWeight} ${config.text.mainTitle.fontSize * scale}px ${config.text.mainTitle.fontFamily}`;
    ctx.fillStyle = config.text.mainTitle.color;
    drawTextWithLetterSpacing(
      ctx,
      'CERTIFICATE',
      centerX,
      config.text.mainTitle.yPosition * scale,
      config.text.mainTitle.letterSpacing * scale
    );
  }
  
  // Draw banner (scaled) - this is the main title like "OF COMPLETION", "OF ACHIEVEMENT"
  if (config.banner.enabled) {
    drawBannerScaled(ctx, template, scale);
  }
  
  // Draw company name prominently - positioned to overlap bottom of banner for visibility (scaled), moved lower
  let companyNameY: number;
  if (config.banner.enabled) {
    // Position to overlap with bottom edge of banner (more visible), moved lower more
    companyNameY = (config.banner.yPosition + config.banner.height / 2 + 90) * scale; // Lowered by additional 40px (scaled)
  } else if (config.logo.enabled) {
    // Position below logo, moved lower
    companyNameY = (config.logo.yPosition + 150) * scale; // Lowered by additional 40px (scaled)
  } else {
    // Position after where banner would be, moved lower
    // For classic_elegant template, position it a little higher
    if (template.id === 'classic_elegant') {
      companyNameY = 280 * scale; // Moved higher for classic_elegant (scaled)
    } else {
      companyNameY = 340 * scale; // Lowered by additional 40px (scaled)
    }
  }
  
  // Make company name much larger and more visible
  ctx.font = `bold ${(config.text.body.fontSize + 20) * scale}px ${config.text.body.fontFamily}`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(companyData.companyName.toUpperCase(), centerX, companyNameY);
  
  // Draw decorative line above "PROUDLY PRESENTED TO" - moved lower
  if (config.text.subtitle) {
    const lineY = (config.text.subtitle.yPosition + 40) * scale; // Moved down by 70px (scaled)
    ctx.strokeStyle = config.text.subtitle.color;
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(centerX - 75 * scale, lineY);
    ctx.lineTo(centerX - 10 * scale, lineY);
    ctx.moveTo(centerX + 10 * scale, lineY);
    ctx.lineTo(centerX + 75 * scale, lineY);
    ctx.stroke();
  }
  
  // Draw "PROUDLY PRESENTED TO" or subtitle - moved lower a little bit more
  if (config.text.subtitle) {
    ctx.font = `${config.text.subtitle.fontWeight} ${config.text.subtitle.fontSize * scale}px ${config.text.subtitle.fontFamily}`;
    ctx.fillStyle = config.text.subtitle.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PROUDLY PRESENTED TO', centerX, (config.text.subtitle.yPosition + 70) * scale); // Moved down by additional 20px (total 70px, scaled)
  }
  
  // Draw student name with decorative underline - moved lower
  // Ensure we have valid name data - use fallback if empty
  const firstName = internData.firstName || '';
  const lastName = internData.lastName || '';
      
  // Debug logging for preview
  console.log('🎨 Certificate Preview Generator - Name data:', {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim()
  });
  
  const studentName = `${firstName} ${lastName}`.trim() || 'Student Name';
  
  // Always draw the name (with fallback if needed)
  ctx.font = `${config.text.studentName.fontStyle || 'normal'} ${config.text.studentName.fontWeight} ${config.text.studentName.fontSize * scale}px ${config.text.studentName.fontFamily}`;
  ctx.fillStyle = config.text.studentName.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(studentName, centerX, (config.text.studentName.yPosition + 50) * scale); // Moved down by 50px (scaled)
  
  // Draw decorative underline under student name - moved lower
  const nameMetrics = ctx.measureText(studentName);
  const underlineWidth = nameMetrics.width + 20 * scale;
  ctx.strokeStyle = config.text.studentName.color;
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(centerX - underlineWidth / 2, (config.text.studentName.yPosition + 100) * scale); // Moved down by 50px (scaled)
  ctx.lineTo(centerX + underlineWidth / 2, (config.text.studentName.yPosition + 100) * scale);
  ctx.stroke();
  
  // Draw body text with better spacing - moved lower
  // Use the studentName variable we created above (with fallback)
  const bodyText = `This is to certify that ${studentName} has successfully completed the On-the-Job Training (OJT) program, demonstrating exceptional dedication, professionalism, and commitment throughout ${internData.totalHours} hours of intensive training from ${formatDate(internData.startDate)} to ${formatDate(internData.endDate)} at ${companyData.companyName}, ${companyData.address}. During this period, ${studentName} has shown outstanding performance, acquired valuable practical skills, and contributed meaningfully to the organization. This certificate recognizes their hard work, perseverance, and the significant knowledge and experience gained during their internship journey.`;
  
  drawMultiLineText(
    ctx,
    bodyText,
    {
      ...config.text.body,
      fontSize: config.text.body.fontSize * scale
    },
    centerX,
    (config.text.studentName.yPosition + 150) * scale, // Moved down by 50px (scaled)
    config.layout.contentWidth * scale
  );
  
  // Draw signature section (centered, moved higher)
  const sigY = canvas.height - 180 * scale; // Moved up by 50 pixels (scaled)
  const signatureLineWidth = 350 * scale; // Wider signature line
  
  // Draw decorative separator line above signature section
  ctx.strokeStyle = '#CCCCCC';
  ctx.lineWidth = 1 * scale;
  ctx.setLineDash([5 * scale, 5 * scale]);
  ctx.beginPath();
  ctx.moveTo(centerX - 100 * scale, sigY - 160 * scale);
  ctx.lineTo(centerX + 100 * scale, sigY - 160 * scale);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Draw seal above signature section (scaled)
  if (config.seal.enabled) {
    // Temporarily adjust seal position to be above signature
    const originalSealY = config.seal.yPosition;
    config.seal.yPosition = (sigY - 140) / scale; // Position seal higher above signature section
    drawSealScaled(ctx, template, scale);
    config.seal.yPosition = originalSealY; // Restore original position
  }
  
  // Draw signature image first (above the SIGNATURE label)
  if (companyData.signature) {
    try {
      await embedSignatureImage(
        ctx,
        companyData.signature,
        centerX,
        sigY - 150 * scale,
        325 * scale,
        130 * scale
      );
    } catch (error) {
      console.error('Error embedding signature in preview:', error);
    }
  }
  
  // Signature label (centered, bigger) - below the signature image with decorative lines
  const sigLabelY = sigY;
  ctx.font = `bold ${(config.text.signatureLabel.fontSize + 8) * scale}px ${config.text.signatureLabel.fontFamily}`;
  ctx.fillStyle = config.text.signatureLabel.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Decorative lines on sides of SIGNATURE label
  ctx.strokeStyle = config.text.signatureLabel.color;
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.moveTo(centerX - 60 * scale, sigLabelY);
  ctx.lineTo(centerX - 10 * scale, sigLabelY);
  ctx.moveTo(centerX + 10 * scale, sigLabelY);
  ctx.lineTo(centerX + 60 * scale, sigLabelY);
  ctx.stroke();
  
  ctx.fillText('SIGNATURE', centerX, sigLabelY);
  
  // Signature line (centered, thicker)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5 * scale;
  ctx.beginPath();
  ctx.moveTo(centerX - signatureLineWidth / 2, sigY + 25 * scale);
  ctx.lineTo(centerX + signatureLineWidth / 2, sigY + 25 * scale);
  ctx.stroke();
  
  // Draw contact person (centered, bigger) with better spacing
  if (companyData.contactPerson) {
    ctx.font = `bold ${(config.text.body.fontSize + 8) * scale}px ${config.text.body.fontFamily}`;
    ctx.fillStyle = config.text.body.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(companyData.contactPerson, centerX, sigY + 65 * scale);
  }
  
  // Draw contact person title (centered, bigger) with better spacing
  if (companyData.contactPersonTitle) {
    ctx.font = `${(config.text.body.fontSize + 6) * scale}px ${config.text.body.fontFamily}`;
    ctx.fillText(companyData.contactPersonTitle, centerX, sigY + 82 * scale);
  }
  
  return canvas.toDataURL('image/png', 0.9);
}

// Scaled versions of drawing functions for preview
function drawBordersScaled(ctx: CanvasRenderingContext2D, template: CertificateTemplate, scale: number) {
  const { border, decorativeBorders } = template.config;
  const canvas = ctx.canvas;
  
  // Draw decorative borders first (as background) if enabled
  if (decorativeBorders.enabled) {
    ctx.fillStyle = decorativeBorders.topColor;
    ctx.fillRect(0, 0, canvas.width, decorativeBorders.topWidth * scale);
    
    ctx.fillStyle = decorativeBorders.rightColor;
    ctx.fillRect(canvas.width - decorativeBorders.rightWidth * scale, 0, decorativeBorders.rightWidth * scale, canvas.height);
    
    ctx.fillStyle = decorativeBorders.bottomColor;
    ctx.fillRect(0, canvas.height - decorativeBorders.bottomWidth * scale, canvas.width, decorativeBorders.bottomWidth * scale);
    
    ctx.fillStyle = decorativeBorders.leftColor;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(decorativeBorders.leftWidth * scale, 0);
    ctx.lineTo(decorativeBorders.leftWidth * scale * 0.7, canvas.height / 2);
    ctx.lineTo(decorativeBorders.leftWidth * scale, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fill();
  }
  
  ctx.lineWidth = border.width * scale;
  ctx.setLineDash([]);
  
  // Calculate border positions (on decorative borders if enabled)
  const borderY = decorativeBorders.enabled ? decorativeBorders.topWidth * scale / 2 : border.width * scale / 2;
  const borderX = decorativeBorders.enabled ? decorativeBorders.leftWidth * scale / 2 : border.width * scale / 2;
  const borderRightX = decorativeBorders.enabled ? canvas.width - decorativeBorders.rightWidth * scale / 2 : canvas.width - border.width * scale / 2;
  const borderBottomY = decorativeBorders.enabled ? canvas.height - decorativeBorders.bottomWidth * scale / 2 : canvas.height - border.width * scale / 2;
  
  // Draw borders based on style (scaled) - clearer with larger patterns
  if (border.style === 'wavy') {
    drawWavyLine(ctx, 0, borderY, canvas.width, borderY, border.topColor, Math.max(border.width * scale, 2), 6 * scale);
    drawWavyLine(ctx, borderRightX, 0, borderRightX, canvas.height, border.rightColor, Math.max(border.width * scale, 2), 6 * scale);
    drawWavyLine(ctx, 0, borderBottomY, canvas.width, borderBottomY, border.bottomColor, Math.max(border.width * scale, 2), 6 * scale);
    drawWavyLine(ctx, borderX, 0, borderX, canvas.height, border.leftColor, Math.max(border.width * scale, 2), 6 * scale);
  } else if (border.style === 'scalloped') {
    drawScallopedLine(ctx, 0, borderY, canvas.width, borderY, border.topColor, Math.max(border.width * scale, 2), 8 * scale);
    drawScallopedLine(ctx, borderRightX, 0, borderRightX, canvas.height, border.rightColor, Math.max(border.width * scale, 2), 8 * scale);
    drawScallopedLine(ctx, 0, borderBottomY, canvas.width, borderBottomY, border.bottomColor, Math.max(border.width * scale, 2), 8 * scale);
    drawScallopedLine(ctx, borderX, 0, borderX, canvas.height, border.leftColor, Math.max(border.width * scale, 2), 8 * scale);
  } else if (border.style === 'double-wavy') {
    const offset = Math.max(border.width * scale, 3);
    drawWavyLine(ctx, 0, borderY, canvas.width, borderY, border.topColor, Math.max(border.width * scale / 2, 1.5), 5 * scale);
    drawWavyLine(ctx, 0, borderY + offset, canvas.width, borderY + offset, border.topColor, Math.max(border.width * scale / 2, 1.5), 5 * scale);
    drawWavyLine(ctx, borderRightX, 0, borderRightX, canvas.height, border.rightColor, Math.max(border.width * scale / 2, 1.5), 5 * scale);
    drawWavyLine(ctx, borderRightX - offset, 0, borderRightX - offset, canvas.height, border.rightColor, Math.max(border.width * scale / 2, 1.5), 5 * scale);
    drawWavyLine(ctx, 0, borderBottomY, canvas.width, borderBottomY, border.bottomColor, Math.max(border.width * scale / 2, 1.5), 5 * scale);
    drawWavyLine(ctx, 0, borderBottomY - offset, canvas.width, borderBottomY - offset, border.bottomColor, Math.max(border.width * scale / 2, 1.5), 5 * scale);
    drawWavyLine(ctx, borderX, 0, borderX, canvas.height, border.leftColor, Math.max(border.width * scale / 2, 1.5), 5 * scale);
    drawWavyLine(ctx, borderX + offset, 0, borderX + offset, canvas.height, border.leftColor, Math.max(border.width * scale / 2, 1.5), 5 * scale);
  } else if (border.style === 'dotted') {
    drawDottedLine(ctx, 0, borderY, canvas.width, borderY, border.topColor, Math.max(border.width * scale, 3.5), Math.max(border.width * scale * 1.2, 4));
    drawDottedLine(ctx, borderRightX, 0, borderRightX, canvas.height, border.rightColor, Math.max(border.width * scale, 3.5), Math.max(border.width * scale * 1.2, 4));
    drawDottedLine(ctx, 0, borderBottomY, canvas.width, borderBottomY, border.bottomColor, Math.max(border.width * scale, 3.5), Math.max(border.width * scale * 1.2, 4));
    drawDottedLine(ctx, borderX, 0, borderX, canvas.height, border.leftColor, Math.max(border.width * scale, 3.5), Math.max(border.width * scale * 1.2, 4));
  } else if (border.style === 'striped') {
    drawStripedBorder(ctx, 0, 0, canvas.width, decorativeBorders.enabled ? decorativeBorders.topWidth * scale : border.width * scale, border.topColor, 2.5 * scale, false);
    drawStripedBorder(ctx, canvas.width - (decorativeBorders.enabled ? decorativeBorders.rightWidth * scale : border.width * scale), 0, decorativeBorders.enabled ? decorativeBorders.rightWidth * scale : border.width * scale, canvas.height, border.rightColor, 2.5 * scale, true);
    drawStripedBorder(ctx, 0, canvas.height - (decorativeBorders.enabled ? decorativeBorders.bottomWidth * scale : border.width * scale), canvas.width, decorativeBorders.enabled ? decorativeBorders.bottomWidth * scale : border.width * scale, border.bottomColor, 2.5 * scale, false);
    drawStripedBorder(ctx, 0, 0, decorativeBorders.enabled ? decorativeBorders.leftWidth * scale : border.width * scale, canvas.height, border.leftColor, 2.5 * scale, true);
  } else if (border.style === 'checkerboard') {
    drawCheckerboardBorder(ctx, 0, 0, canvas.width, decorativeBorders.enabled ? decorativeBorders.topWidth * scale : border.width * scale, border.topColor, 5 * scale);
    drawCheckerboardBorder(ctx, canvas.width - (decorativeBorders.enabled ? decorativeBorders.rightWidth * scale : border.width * scale), 0, decorativeBorders.enabled ? decorativeBorders.rightWidth * scale : border.width * scale, canvas.height, border.rightColor, 5 * scale);
    drawCheckerboardBorder(ctx, 0, canvas.height - (decorativeBorders.enabled ? decorativeBorders.bottomWidth * scale : border.width * scale), canvas.width, decorativeBorders.enabled ? decorativeBorders.bottomWidth * scale : border.width * scale, border.bottomColor, 5 * scale);
    drawCheckerboardBorder(ctx, 0, 0, decorativeBorders.enabled ? decorativeBorders.leftWidth * scale : border.width * scale, canvas.height, border.leftColor, 5 * scale);
  } else if (border.style === 'curly') {
    drawWavyLine(ctx, 0, borderY, canvas.width, borderY, border.topColor, Math.max(border.width * scale, 2), 7 * scale, 0.025);
    drawWavyLine(ctx, borderRightX, 0, borderRightX, canvas.height, border.rightColor, Math.max(border.width * scale, 2), 7 * scale, 0.025);
    drawWavyLine(ctx, 0, borderBottomY, canvas.width, borderBottomY, border.bottomColor, Math.max(border.width * scale, 2), 7 * scale, 0.025);
    drawWavyLine(ctx, borderX, 0, borderX, canvas.height, border.leftColor, Math.max(border.width * scale, 2), 7 * scale, 0.025);
  } else if (border.style === 'double') {
    // Double border - draw two parallel lines (scaled)
    const offset = Math.max(border.width * scale, 2);
    ctx.strokeStyle = border.topColor;
    ctx.lineWidth = Math.max(border.width * scale, 1);
    ctx.beginPath();
    ctx.moveTo(0, borderY);
    ctx.lineTo(canvas.width, borderY);
    ctx.moveTo(0, borderY + offset);
    ctx.lineTo(canvas.width, borderY + offset);
    ctx.stroke();
    ctx.strokeStyle = border.rightColor;
    ctx.beginPath();
    ctx.moveTo(borderRightX, 0);
    ctx.lineTo(borderRightX, canvas.height);
    ctx.moveTo(borderRightX - offset, 0);
    ctx.lineTo(borderRightX - offset, canvas.height);
    ctx.stroke();
    ctx.strokeStyle = border.bottomColor;
    ctx.beginPath();
    ctx.moveTo(0, borderBottomY);
    ctx.lineTo(canvas.width, borderBottomY);
    ctx.moveTo(0, borderBottomY - offset);
    ctx.lineTo(canvas.width, borderBottomY - offset);
    ctx.stroke();
    ctx.strokeStyle = border.leftColor;
    ctx.beginPath();
    ctx.moveTo(borderX, 0);
    ctx.lineTo(borderX, canvas.height);
    ctx.moveTo(borderX + offset, 0);
    ctx.lineTo(borderX + offset, canvas.height);
    ctx.stroke();
  } else {
    // Default solid borders - make them thicker and clearer
    ctx.lineWidth = Math.max(border.width * scale, 2);
    ctx.strokeStyle = border.topColor;
    ctx.beginPath();
    ctx.moveTo(0, borderY);
    ctx.lineTo(canvas.width, borderY);
    ctx.stroke();
    
    ctx.strokeStyle = border.rightColor;
    ctx.beginPath();
    ctx.moveTo(borderRightX, 0);
    ctx.lineTo(borderRightX, canvas.height);
    ctx.stroke();
    
    ctx.strokeStyle = border.bottomColor;
    ctx.beginPath();
    ctx.moveTo(0, borderBottomY);
    ctx.lineTo(canvas.width, borderBottomY);
    ctx.stroke();
    
    ctx.strokeStyle = border.leftColor;
    ctx.beginPath();
    ctx.moveTo(borderX, 0);
    ctx.lineTo(borderX, canvas.height);
    ctx.stroke();
  }
}

function drawLogoScaled(ctx: CanvasRenderingContext2D, template: CertificateTemplate, companyName: string, scale: number) {
  const { logo } = template.config;
  if (!logo.enabled) return;
  
  const centerX = template.config.layout.centerX * scale;
  const y = logo.yPosition * scale;
  const size = (logo.size || 80) * scale;
  
  ctx.save();
  
  if (logo.backgroundColor && logo.backgroundColor !== 'transparent') {
    ctx.fillStyle = logo.backgroundColor;
    
    if (logo.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(centerX, y, size / 2, 0, 2 * Math.PI);
      ctx.fill();
    } else if (logo.shape === 'hexagon') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = centerX + (size / 2) * Math.cos(angle);
        const yPos = y + (size / 2) * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, yPos);
        else ctx.lineTo(x, yPos);
      }
      ctx.closePath();
      ctx.fill();
    } else if (logo.shape === 'square') {
      ctx.fillRect(centerX - size / 2, y - size / 2, size, size);
    }
  }
  
  const logoText = logo.text || companyName.charAt(0).toUpperCase();
  ctx.font = `${logo.fontWeight} ${logo.fontSize * scale}px ${logo.fontFamily}`;
  ctx.fillStyle = logo.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(logoText, centerX, y);
  
  ctx.restore();
}

function drawBannerScaled(ctx: CanvasRenderingContext2D, template: CertificateTemplate, scale: number) {
  const { banner } = template.config;
  if (!banner.enabled) return;
  
  const centerX = template.config.layout.centerX * scale;
  const y = (banner.yPosition + 40) * scale; // Lower the banner by 40px (scaled)
  const width = template.config.layout.contentWidth * 0.6 * scale;
  const height = banner.height * scale;
  
  // Ensure full opacity for banner background
  ctx.save();
  ctx.globalAlpha = 1.0;
  
  ctx.fillStyle = banner.backgroundColor;
  drawRoundedRect(ctx, centerX - width / 2, y - height / 2, width, height, banner.borderRadius * scale);
  ctx.fill();
  
  ctx.font = `${banner.fontWeight} ${banner.fontSize * scale}px ${banner.fontFamily}`;
  ctx.fillStyle = banner.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(banner.text, centerX, y);
  
  ctx.restore();
}

function drawSealScaled(ctx: CanvasRenderingContext2D, template: CertificateTemplate, scale: number) {
  const { seal } = template.config;
  if (!seal.enabled) return;
  
  const centerX = template.config.layout.centerX * scale;
  const y = seal.yPosition * scale;
  const radius = (seal.size / 2) * scale;
  
  ctx.save();
  
  // Create shadow for embossed effect (scaled)
  const shadowGradient = ctx.createRadialGradient(centerX + 4 * scale, y + 4 * scale, 0, centerX + 4 * scale, y + 4 * scale, radius + 6 * scale);
  shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
  shadowGradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.1)');
  shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGradient;
  ctx.beginPath();
  ctx.arc(centerX + 4 * scale, y + 4 * scale, radius + 6 * scale, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw serrated outer edge (star/gear-like points, scaled)
  const numPoints = 24;
  const pointDepth = 8 * scale;
  const outerRadius = radius;
  const innerRadius = radius - pointDepth;
  
  ctx.beginPath();
  for (let i = 0; i < numPoints * 2; i++) {
    const angle = (Math.PI / numPoints) * i;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const x = centerX + Math.cos(angle) * r;
    const yPos = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, yPos);
    else ctx.lineTo(x, yPos);
  }
  ctx.closePath();
  
  // Fill serrated edge with gold gradient (scaled)
  const outerGradient = ctx.createRadialGradient(centerX - radius * 0.2, y - radius * 0.2, 0, centerX, y, radius);
  outerGradient.addColorStop(0, '#FFD700');
  outerGradient.addColorStop(0.3, '#F4D03F');
  outerGradient.addColorStop(0.6, seal.color);
  outerGradient.addColorStop(0.9, '#D4AF37');
  outerGradient.addColorStop(1, '#B8860B');
  ctx.fillStyle = outerGradient;
  ctx.fill();
  
  // Smooth inner ring (raised band, scaled)
  const smoothRingRadius = radius - pointDepth - 4 * scale;
  const smoothRingWidth = 6 * scale;
  const smoothRingGradient = ctx.createRadialGradient(centerX - smoothRingRadius * 0.2, y - smoothRingRadius * 0.2, 0, centerX, y, smoothRingRadius);
  smoothRingGradient.addColorStop(0, '#FFD700');
  smoothRingGradient.addColorStop(0.5, '#F4D03F');
  smoothRingGradient.addColorStop(1, '#D4AF37');
  ctx.fillStyle = smoothRingGradient;
  ctx.beginPath();
  ctx.arc(centerX, y, smoothRingRadius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Decorative wreath pattern ring (leaf/chevron shapes pointing inward, scaled)
  const wreathOuterRadius = smoothRingRadius - smoothRingWidth;
  const wreathInnerRadius = wreathOuterRadius - 8 * scale;
  const numLeaves = 16;
  
  ctx.fillStyle = '#D4AF37';
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 1 * scale;
  
  for (let i = 0; i < numLeaves; i++) {
    const angle = (2 * Math.PI / numLeaves) * i;
    const leafCenterX = centerX + Math.cos(angle) * ((wreathOuterRadius + wreathInnerRadius) / 2);
    const leafCenterY = y + Math.sin(angle) * ((wreathOuterRadius + wreathInnerRadius) / 2);
    
    // Draw chevron/leaf shape pointing inward
    ctx.save();
    ctx.translate(leafCenterX, leafCenterY);
    ctx.rotate(angle + Math.PI / 2);
    
    ctx.beginPath();
    ctx.moveTo(0, -(wreathOuterRadius - wreathInnerRadius) / 2);
    ctx.lineTo(-3 * scale, (wreathOuterRadius - wreathInnerRadius) / 2);
    ctx.lineTo(0, (wreathOuterRadius - wreathInnerRadius) / 2 + 2 * scale);
    ctx.lineTo(3 * scale, (wreathOuterRadius - wreathInnerRadius) / 2);
    ctx.closePath();
    
    // Gradient for each leaf (scaled)
    const leafGradient = ctx.createLinearGradient(0, -(wreathOuterRadius - wreathInnerRadius) / 2, 0, (wreathOuterRadius - wreathInnerRadius) / 2 + 2 * scale);
    leafGradient.addColorStop(0, '#FFD700');
    leafGradient.addColorStop(0.5, '#D4AF37');
    leafGradient.addColorStop(1, '#B8860B');
    ctx.fillStyle = leafGradient;
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }
  
  // Central smooth area with radial texture (scaled)
  const centerRadius = wreathInnerRadius - 4 * scale;
  const centerGradient = ctx.createRadialGradient(centerX - centerRadius * 0.3, y - centerRadius * 0.3, 0, centerX, y, centerRadius);
  centerGradient.addColorStop(0, '#FFF8DC');
  centerGradient.addColorStop(0.2, '#FFD700');
  centerGradient.addColorStop(0.5, '#F4D03F');
  centerGradient.addColorStop(0.8, seal.color);
  centerGradient.addColorStop(1, '#D4AF37');
  ctx.fillStyle = centerGradient;
  ctx.beginPath();
  ctx.arc(centerX, y, centerRadius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Add radial texture to center (concentric circles, scaled)
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
  ctx.lineWidth = 0.5 * scale;
  for (let i = 1; i <= 5; i++) {
    const textureRadius = centerRadius * (i / 6);
    ctx.beginPath();
    ctx.arc(centerX, y, textureRadius, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  // Highlight for embossed effect (top-left, scaled)
  const highlightGradient = ctx.createRadialGradient(centerX - centerRadius * 0.4, y - centerRadius * 0.4, 0, centerX, y, centerRadius * 0.7);
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
  highlightGradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.3)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = highlightGradient;
  ctx.beginPath();
  ctx.arc(centerX, y, centerRadius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Shadow for embossed effect (bottom-right, scaled)
  const shadowInnerGradient = ctx.createRadialGradient(centerX + centerRadius * 0.3, y + centerRadius * 0.3, 0, centerX, y, centerRadius * 0.7);
  shadowInnerGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
  shadowInnerGradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.15)');
  shadowInnerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowInnerGradient;
  ctx.beginPath();
  ctx.arc(centerX, y, centerRadius, 0, 2 * Math.PI);
  ctx.fill();
  
  // Inner border of center area (scaled)
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.arc(centerX, y, centerRadius - 1 * scale, 0, 2 * Math.PI);
  ctx.stroke();
  
  // Draw seal text in center if provided (scaled)
  if (seal.text) {
    ctx.font = `bold ${Math.min(centerRadius / 4, 16 * scale)}px Arial, sans-serif`;
    ctx.fillStyle = seal.textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(seal.text, centerX, y);
  }
  
  ctx.restore();
}

/**
 * Generate full-size certificate
 */
export async function generateCertificate(
  template: CertificateTemplate,
  internData: InternData,
  companyData: CompanyData
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d')!;
  
  const { config } = template;
  const centerX = config.layout.centerX;
  
  // Handle custom template with background image
  if (template.isCustom && template.customImageUrl) {
    try {
      // Load and draw custom background image
      const bgImage = await loadImage(template.customImageUrl);
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
      
      // Use custom text zones if provided, otherwise use default positions
      const textZones = template.textZones || {};
      
      // Draw student name
      const firstName = internData.firstName || '';
      const lastName = internData.lastName || '';
      const studentName = `${firstName} ${lastName}`.trim() || 'Student Name';
      
      if (textZones.studentName) {
        const zone = textZones.studentName;
        ctx.font = `${config.text.studentName.fontStyle || 'normal'} ${config.text.studentName.fontWeight} ${config.text.studentName.fontSize}px ${config.text.studentName.fontFamily}`;
        ctx.fillStyle = config.text.studentName.color;
        ctx.textAlign = zone.align || 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(studentName, zone.x, zone.y);
      } else {
        // Default position if no zone specified
        ctx.font = `${config.text.studentName.fontStyle || 'normal'} ${config.text.studentName.fontWeight} ${config.text.studentName.fontSize}px ${config.text.studentName.fontFamily}`;
        ctx.fillStyle = config.text.studentName.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(studentName, centerX, config.text.studentName.yPosition + 50);
      }
      
      // Draw body text
      const bodyText = `This is to certify that ${studentName} has successfully completed the On-the-Job Training (OJT) program, demonstrating exceptional dedication, professionalism, and commitment throughout ${internData.totalHours} hours of intensive training from ${formatDate(internData.startDate)} to ${formatDate(internData.endDate)} at ${companyData.companyName}, ${companyData.address}. During this period, ${studentName} has shown outstanding performance, acquired valuable practical skills, and contributed meaningfully to the organization. This certificate recognizes their hard work, perseverance, and the significant knowledge and experience gained during their internship journey.`;
      
      if (textZones.body) {
        const zone = textZones.body;
        drawMultiLineText(
          ctx,
          bodyText,
          {
            ...config.text.body,
            lineHeight: config.text.body.lineHeight + 4
          },
          zone.x,
          zone.y,
          zone.width
        );
      } else {
        // Default position - lowered by 50px for better spacing
        drawMultiLineText(
          ctx,
          bodyText,
          {
            ...config.text.body,
            lineHeight: config.text.body.lineHeight + 4
          },
          centerX,
          config.text.studentName.yPosition + 200,
          config.layout.contentWidth
        );
      }
      
      // Draw signature section
      const sigY = textZones.signature?.y || canvas.height - 280;
      const sigX = textZones.signature?.x || centerX;
      const sigWidth = textZones.signature?.width || 350;
      
      // Draw signature image
      if (companyData.signature) {
        try {
          await embedSignatureImage(
            ctx,
            companyData.signature,
            sigX,
            sigY - 250,
            sigWidth * 1.85,
            sigWidth * 0.75
          );
        } catch (error) {
          console.error('Error embedding signature:', error);
        }
      }
      
      // Draw signature label
      if (textZones.signatureLabel) {
        const zone = textZones.signatureLabel;
        ctx.font = `bold ${config.text.signatureLabel.fontSize + 8}px ${config.text.signatureLabel.fontFamily}`;
        ctx.fillStyle = config.text.signatureLabel.color;
        ctx.textAlign = zone.align || 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SIGNATURE', zone.x, zone.y);
      } else {
        ctx.font = `bold ${config.text.signatureLabel.fontSize + 8}px ${config.text.signatureLabel.fontFamily}`;
        ctx.fillStyle = config.text.signatureLabel.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SIGNATURE', centerX, sigY);
      }
      
      // Draw contact person
      if (companyData.contactPerson) {
        const contactY = textZones.contactPerson?.y || sigY + 130;
        const contactX = textZones.contactPerson?.x || centerX;
        ctx.font = `bold ${config.text.body.fontSize + 8}px ${config.text.body.fontFamily}`;
        ctx.fillStyle = config.text.body.color;
        ctx.textAlign = textZones.contactPerson?.align || 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(companyData.contactPerson, contactX, contactY);
      }
      
      // Draw contact person title
      if (companyData.contactPersonTitle) {
        const titleY = textZones.contactPersonTitle?.y || sigY + 165;
        const titleX = textZones.contactPersonTitle?.x || centerX;
        ctx.font = `${config.text.body.fontSize + 6}px ${config.text.body.fontFamily}`;
        ctx.fillStyle = config.text.body.color;
        ctx.textAlign = textZones.contactPersonTitle?.align || 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(companyData.contactPersonTitle, titleX, titleY);
      }
      
      // Convert to blob
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate certificate blob'));
          }
        }, 'image/png', 1.0);
      });
    } catch (error) {
      console.error('Error loading custom template image:', error);
      // Fall back to white background if image fails to load
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
  
  // Standard template generation (existing code)
  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw borders
  drawBorders(ctx, template);
  
  // Draw logo
  if (config.logo.enabled) {
    drawLogo(ctx, template, companyData.companyName);
  }
  
  // Draw "CERTIFICATE" text - always visible
  // Match the preview positioning exactly
  if (config.banner.enabled) {
    // If banner exists, draw CERTIFICATE above the banner (banner is lowered by 40px, so adjust)
    // Position with more space from top to ensure visibility
    const certY = (config.banner.yPosition + 40) - config.banner.height / 2 - 60;
    ctx.font = `${config.text.mainTitle.fontWeight} ${config.text.mainTitle.fontSize}px ${config.text.mainTitle.fontFamily}`;
    ctx.fillStyle = config.text.mainTitle.color;
    drawTextWithLetterSpacing(
      ctx,
      'CERTIFICATE',
      centerX,
      certY,
      config.text.mainTitle.letterSpacing
    );
  } else {
    // If no banner, draw CERTIFICATE at mainTitle position
    ctx.font = `${config.text.mainTitle.fontWeight} ${config.text.mainTitle.fontSize}px ${config.text.mainTitle.fontFamily}`;
    ctx.fillStyle = config.text.mainTitle.color;
    drawTextWithLetterSpacing(
      ctx,
      'CERTIFICATE',
      centerX,
      config.text.mainTitle.yPosition,
      config.text.mainTitle.letterSpacing
    );
  }
  
  // Draw banner (this is the main title like "OF COMPLETION", "OF ACHIEVEMENT")
  if (config.banner.enabled) {
    drawBanner(ctx, template);
  }
  
  // Draw company name prominently - positioned to overlap bottom of banner for visibility, moved lower
  let companyNameY: number;
  if (config.banner.enabled) {
    // Position to overlap with bottom edge of banner (more visible), moved lower more
    companyNameY = config.banner.yPosition + config.banner.height / 2 + 90; // Lowered by additional 40px
  } else if (config.logo.enabled) {
    // Position below logo, moved lower
    companyNameY = config.logo.yPosition + 150; // Lowered by additional 40px
  } else {
    // Position after where banner would be, moved lower
    // For classic_elegant template, position it a little higher
    if (template.id === 'classic_elegant') {
      companyNameY = 280; // Moved higher for classic_elegant
    } else {
      companyNameY = 340; // Lowered by additional 40px
    }
  }
  
  // Make company name much larger and more visible
  ctx.font = `bold ${config.text.body.fontSize + 20}px ${config.text.body.fontFamily}`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(companyData.companyName.toUpperCase(), centerX, companyNameY);
  
  // Draw decorative line above "PROUDLY PRESENTED TO" - moved lower
  if (config.text.subtitle) {
    const lineY = config.text.subtitle.yPosition + 40; // Moved down by 70px
    ctx.strokeStyle = config.text.subtitle.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 150, lineY);
    ctx.lineTo(centerX - 20, lineY);
    ctx.moveTo(centerX + 20, lineY);
    ctx.lineTo(centerX + 150, lineY);
    ctx.stroke();
  }
  
  // Draw subtitle "PROUDLY PRESENTED TO" - moved lower a little bit more
  if (config.text.subtitle) {
    ctx.font = `${config.text.subtitle.fontWeight} ${config.text.subtitle.fontSize}px ${config.text.subtitle.fontFamily}`;
    ctx.fillStyle = config.text.subtitle.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PROUDLY PRESENTED TO', centerX, config.text.subtitle.yPosition + 70); // Moved down by additional 20px (total 70px)
  }
  
  // Draw student name (elegant script style) with decorative underline - moved lower
  // Ensure we have valid name data - use fallback if empty
  const firstName = internData.firstName || '';
  const lastName = internData.lastName || '';
  
  // Debug logging
  console.log('🎨 Certificate Generator - Name data:', {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim()
  });
  
  const studentName = `${firstName} ${lastName}`.trim() || 'Student Name';
  
  // Always draw the name (with fallback if needed)
  ctx.font = `${config.text.studentName.fontStyle || 'normal'} ${config.text.studentName.fontWeight} ${config.text.studentName.fontSize}px ${config.text.studentName.fontFamily}`;
  ctx.fillStyle = config.text.studentName.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(studentName, centerX, config.text.studentName.yPosition + 50); // Moved down by 50px
  
  // Draw decorative underline under student name - moved lower
  const nameMetrics = ctx.measureText(studentName);
  const underlineWidth = nameMetrics.width + 40;
  ctx.strokeStyle = config.text.studentName.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - underlineWidth / 2, config.text.studentName.yPosition + 100); // Moved down by 50px
  ctx.lineTo(centerX + underlineWidth / 2, config.text.studentName.yPosition + 100);
  ctx.stroke();
  
  // Draw body text (professional description) with better spacing and formatting - moved lower
  // Use the studentName variable we created above (with fallback)
  const bodyText = `This is to certify that ${studentName} has successfully completed the On-the-Job Training (OJT) program, demonstrating exceptional dedication, professionalism, and commitment throughout ${internData.totalHours} hours of intensive training from ${formatDate(internData.startDate)} to ${formatDate(internData.endDate)} at ${companyData.companyName}, ${companyData.address}. During this period, ${studentName} has shown outstanding performance, acquired valuable practical skills, and contributed meaningfully to the organization. This certificate recognizes their hard work, perseverance, and the significant knowledge and experience gained during their internship journey.`;
  
  // Add extra spacing before body text
  drawMultiLineText(
    ctx,
    bodyText,
    {
      ...config.text.body,
      lineHeight: config.text.body.lineHeight + 4 // Increased line height for better readability
    },
    centerX,
    config.text.studentName.yPosition + 150, // Moved down by 50px
    config.layout.contentWidth
  );
  
  // Draw date and signature section (centered, moved higher)
  const sigY = canvas.height - 280; // Moved up by 80 pixels
  const signatureLineWidth = 350; // Wider signature line
  
  // Draw decorative separator line above signature section
  ctx.strokeStyle = '#CCCCCC';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(centerX - 200, sigY - 320);
  ctx.lineTo(centerX + 200, sigY - 320);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Draw seal above signature section
  if (config.seal.enabled) {
    // Temporarily adjust seal position to be above signature
    const originalSealY = config.seal.yPosition;
    config.seal.yPosition = sigY - 140; // Position seal higher above signature section
    drawSeal(ctx, template);
    config.seal.yPosition = originalSealY; // Restore original position
  }
  
  // Draw signature image first (above the SIGNATURE label)
  if (companyData.signature) {
    try {
      await embedSignatureImage(
        ctx,
        companyData.signature,
        centerX,
        sigY - 250,
        650,
        260
      );
    } catch (error) {
      console.error('Error embedding signature:', error);
    }
  }
  
  // Signature label (centered, bigger) - below the signature image with decorative lines
  const sigLabelY = sigY;
  ctx.font = `bold ${config.text.signatureLabel.fontSize + 8}px ${config.text.signatureLabel.fontFamily}`;
  ctx.fillStyle = config.text.signatureLabel.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Decorative lines on sides of SIGNATURE label
  ctx.strokeStyle = config.text.signatureLabel.color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX - 120, sigLabelY);
  ctx.lineTo(centerX - 20, sigLabelY);
  ctx.moveTo(centerX + 20, sigLabelY);
  ctx.lineTo(centerX + 120, sigLabelY);
  ctx.stroke();
  
  ctx.fillText('SIGNATURE', centerX, sigLabelY);
  
  // Signature line (centered, thicker)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(centerX - signatureLineWidth / 2, sigY + 50);
  ctx.lineTo(centerX + signatureLineWidth / 2, sigY + 50);
  ctx.stroke();
  
  // Draw contact person name (centered, bigger) with better spacing
  if (companyData.contactPerson) {
    ctx.font = `bold ${config.text.body.fontSize + 8}px ${config.text.body.fontFamily}`;
    ctx.fillStyle = config.text.body.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(companyData.contactPerson, centerX, sigY + 130);
  }
  
  // Draw contact person title (centered, bigger) with better spacing
  if (companyData.contactPersonTitle) {
    ctx.font = `${config.text.body.fontSize + 6}px ${config.text.body.fontFamily}`;
    ctx.fillText(companyData.contactPersonTitle, centerX, sigY + 165);
  }
  
  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to generate certificate blob'));
      }
    }, 'image/png', 1.0);
  });
}

/**
 * Generate and upload certificates for multiple interns
 */
export async function generateAndUploadCertificates(
  template: CertificateTemplate,
  interns: Array<InternData & { studentId: string; applicationId: string }>,
  companyData: CompanyData,
  companyId: string,
  onProgress?: (current: number, total: number) => void
): Promise<CertificateGenerationResult[]> {
  const results: CertificateGenerationResult[] = [];
  const errors: Array<{ studentId: string; error: string }> = [];
  
  console.log(`🎨 Starting certificate generation for ${interns.length} intern(s)`);
  
  for (let i = 0; i < interns.length; i++) {
    const intern = interns[i];
    
    if (onProgress) {
      onProgress(i + 1, interns.length);
    }
    
    try {
      console.log(`📝 Generating certificate ${i + 1}/${interns.length} for student ${intern.studentId}...`);
      
      const certificateBlob = await generateCertificate(template, intern, companyData);
      
      const file = new File([certificateBlob], `certificate-${intern.studentId}-${Date.now()}.png`, {
        type: 'image/png'
      });
      
      const uploadResult = await CloudinaryService.uploadImage(
        file,
        `internship-avatars/certificates/company-${companyId}`,
        {
          transformation: 'w_1200,h_1600,c_pad,q_auto:best,f_png',
          public_id: `cert-${intern.studentId}-${Date.now()}`
        }
      );
      
      if (uploadResult.success && uploadResult.url && uploadResult.public_id) {
        results.push({
          success: true,
          certificateUrl: uploadResult.url,
          certificatePublicId: uploadResult.public_id,
          studentId: intern.studentId,
          applicationId: intern.applicationId
        });
        console.log(`✅ Successfully generated and uploaded certificate for student ${intern.studentId}`);
      } else {
        const errorMsg = uploadResult.error || 'Upload failed';
        console.error(`❌ Upload failed for student ${intern.studentId}:`, errorMsg);
        results.push({
          success: false,
          studentId: intern.studentId,
          applicationId: intern.applicationId,
          error: errorMsg
        });
        errors.push({
          studentId: intern.studentId,
          error: errorMsg
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error generating certificate for student ${intern.studentId}:`, error);
      results.push({
        success: false,
        studentId: intern.studentId,
        applicationId: intern.applicationId,
        error: errorMsg
      });
      errors.push({
        studentId: intern.studentId,
        error: errorMsg
      });
      // Continue processing other certificates instead of throwing
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`✅ Certificate generation complete: ${successCount} succeeded, ${failCount} failed`);
  
  if (successCount === 0) {
    // If all failed, throw an error with details
    const errorDetails = errors.map(e => `${e.studentId}: ${e.error}`).join('; ');
    throw new Error(`Failed to generate any certificates. Errors: ${errorDetails}`);
  }
  
  if (failCount > 0) {
    console.warn(`⚠️ Some certificates failed to generate:`, errors);
  }
  
  return results;
}
