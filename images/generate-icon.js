const { createCanvas } = require('canvas');
const fs = require('fs');

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.arcTo(x+w, y, x+w, y+r, r);
  ctx.lineTo(x+w, y+h-r);
  ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h);
  ctx.arcTo(x, y+h, x, y+h-r, r);
  ctx.lineTo(x, y+r);
  ctx.arcTo(x, y, x+r, y, r);
  ctx.closePath();
}

function arrow(ctx, ex, ey, dx, dy, as) {
  const px = -dy, py = dx;
  ctx.beginPath();
  ctx.moveTo(ex + dx*as, ey + dy*as);
  ctx.lineTo(ex - dx*as*0.6 + px*as*0.7, ey - dy*as*0.6 + py*as*0.7);
  ctx.lineTo(ex - dx*as*0.6 - px*as*0.7, ey - dy*as*0.6 - py*as*0.7);
  ctx.closePath();
  ctx.fill();
}

function draw(size) {
  const cv = createCanvas(size, size);
  const ctx = cv.getContext('2d');
  const sc = size / 128;
  const cx = size / 2, cy = size / 2;

  ctx.fillStyle = '#3C3489';
  rrect(ctx, 0, 0, size, size, 24*sc);
  ctx.fill();

  const R = 46*sc, sw = 7*sc, as = 6*sc;

  ctx.strokeStyle = '#1D9E75';
  ctx.fillStyle = '#1D9E75';
  ctx.lineWidth = sw;
  ctx.lineCap = 'butt';

  const a1s = 215 * Math.PI/180;
  const a1e = 340 * Math.PI/180;
  ctx.beginPath();
  ctx.arc(cx, cy, R, a1s, a1e, false);
  ctx.stroke();

  const a2s = 35 * Math.PI/180;
  const a2e = 160 * Math.PI/180;
  ctx.beginPath();
  ctx.arc(cx, cy, R, a2s, a2e, false);
  ctx.stroke();

  const e1x = cx + R*Math.cos(a1e);
  const e1y = cy + R*Math.sin(a1e);
  arrow(ctx, e1x, e1y, -Math.sin(a1e), Math.cos(a1e), as);

  const e2x = cx + R*Math.cos(a2e);
  const e2y = cy + R*Math.sin(a2e);
  arrow(ctx, e2x, e2y, -Math.sin(a2e), Math.cos(a2e), as);

  if (size >= 24) {
    const fs = Math.round(17*sc);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${fs}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SKILL', cx, cy);
  }

  return cv;
}

const sizes = [128, 64, 48, 32, 16];
sizes.forEach(size => {
  const cv = draw(size);
  const buf = cv.toBuffer('image/png');
  fs.writeFileSync(`icon-${size}.png`, buf);
  console.log(`✓ icon-${size}.png`);
});