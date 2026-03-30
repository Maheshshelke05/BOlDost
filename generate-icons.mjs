import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svgBuffer = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#6C63FF"/>
  <rect x="156" y="140" width="200" height="240" rx="30" fill="white" opacity="0.15"/>
  <circle cx="256" cy="210" r="70" fill="white"/>
  <circle cx="256" cy="210" r="35" fill="#6C63FF"/>
  <rect x="226" y="300" width="60" height="10" rx="5" fill="white" opacity="0.9"/>
  <rect x="206" y="320" width="100" height="10" rx="5" fill="white" opacity="0.6"/>
  <rect x="246" y="350" width="20" height="40" rx="10" fill="white"/>
  <rect x="216" y="382" width="80" height="10" rx="5" fill="white"/>
</svg>
`);

await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(__dirname, 'public/icons/icon-192.png'));
await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(__dirname, 'public/icons/icon-512.png'));

console.log('Icons generated!');
