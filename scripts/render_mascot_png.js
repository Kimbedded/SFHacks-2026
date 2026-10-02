import fs from 'fs';
import sharp from 'sharp';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
  <defs>
    <!-- Clip to rounded badge so nothing bleeds past outer border -->
    <clipPath id="badge-clip">
      <rect x="0" y="0" width="1000" height="1000" rx="140" ry="140" />
    </clipPath>
  </defs>

  <g clip-path="url(#badge-clip)">
    <!-- 1. SOLID YELLOW BACKGROUND -->
    <rect x="0" y="0" width="1000" height="1000" fill="#FED000" />

    <!-- 2. GATOR MASCOT ARTWORK -->
    <g id="mascot" stroke-linejoin="round" stroke-linecap="round">

      <!-- CAP VISOR UNDERSIDE (Dark Purple Shadow) -->
      <path d="M 120 280 C 80 320 90 430 170 480 C 240 515 340 500 460 465 C 485 440 435 365 315 320 C 220 285 150 270 120 280 Z"
            fill="#3B114E" stroke="#1A1A1A" stroke-width="16" />

      <!-- CAP VISOR TOP SURFACE (Curved Royal Purple) -->
      <path d="M 110 270 C 80 315 110 395 210 430 C 340 470 480 425 515 375 C 470 320 370 275 270 265 C 180 252 130 256 110 270 Z"
            fill="#5D207B" stroke="#1A1A1A" stroke-width="16" />

      <!-- Visor Top Lip Highlight -->
      <path d="M 150 290 C 220 275 325 295 400 330"
            fill="none" stroke="#D38DF8" stroke-width="12" stroke-linecap="round" />

      <!-- CAP CROWN DOME -->
      <path d="M 390 275 C 420 185 530 130 690 142 C 840 152 895 245 880 415 C 868 500 818 545 778 560 C 762 490 730 425 690 385 C 610 365 520 365 450 378 C 408 342 392 302 390 275 Z"
            fill="#5D207B" stroke="#1A1A1A" stroke-width="16" />

      <!-- Cap Seam Line -->
      <path d="M 690 142 C 715 215 728 300 728 385"
            fill="none" stroke="#481861" stroke-width="8" />

      <!-- Cap Top Button -->
      <ellipse cx="765" cy="148" rx="20" ry="16"
               fill="#D2D2D2" stroke="#1A1A1A" stroke-width="10" />

      <!-- WHITE WHEELCHAIR SYMBOL ON PURPLE CAP -->
      <g transform="translate(540, 155) rotate(8) scale(1.35)">
        <!-- Head -->
        <circle cx="58" cy="32" r="13.5" fill="#FFFFFF" />
        <!-- Torso & Seat -->
        <path d="M 58 52 L 58 92 C 58 97 62 101 67 101 L 92 101 C 96 101 100 105 100 110 C 100 115 96 119 91 119 L 63 119 C 51 119 43 110 43 98 L 43 62 C 43 56 48 52 54 52 Z"
              fill="#FFFFFF" />
        <!-- Wheel Arc -->
        <path d="M 68 76 C 53 82 43 97 43 114 C 43 136 61 153 83 153 C 100 153 114 142 119 127"
              fill="none" stroke="#FFFFFF" stroke-width="15" stroke-linecap="round" />
        <!-- Leg & Footrest -->
        <path d="M 92 101 L 110 132 C 112 136 117 139 122 139 C 128 139 132 134 130 128 L 114 100"
              fill="#FFFFFF" />
      </g>

      <!-- GATOR LOWER JAW & SHADOW UNDERLAY -->
      <path d="M 190 745 C 170 815 228 878 350 894 C 525 914 700 885 818 760 C 835 710 825 645 795 580 C 768 592 725 612 688 620 C 592 636 468 632 336 648 C 248 658 204 700 190 745 Z"
            fill="#177B3F" stroke="#1A1A1A" stroke-width="16" />

      <!-- MAIN GREEN HEAD & CHEEKS -->
      <path d="M 260 470 C 208 482 156 522 132 574 C 108 622 120 682 160 738 C 200 790 272 786 352 774 C 476 758 640 742 732 682 C 820 618 836 546 808 466 C 780 386 728 378 664 386 C 592 398 512 418 432 430 C 352 442 300 458 260 470 Z"
            fill="#23A55A" stroke="#1A1A1A" stroke-width="16" />

      <!-- FRONT SNOUT BULGE & NOSTRILS -->
      <path d="M 132 574 C 108 610 120 662 148 702 C 180 742 240 762 328 754 C 372 750 392 730 384 690 C 372 650 344 630 300 622 C 260 610 208 602 172 570 C 152 554 140 562 132 574 Z"
            fill="#209A53" />

      <!-- Left Nostril -->
      <ellipse cx="184" cy="594" rx="26" ry="34" fill="#1A1A1A" />
      <path d="M 164 582 C 168 570 184 566 196 570"
            fill="none" stroke="#45E083" stroke-width="7" stroke-linecap="round" />

      <!-- Right Nostril -->
      <ellipse cx="292" cy="582" rx="24" ry="32" fill="#1A1A1A" />
      <path d="M 274 570 C 280 558 296 554 306 558"
            fill="none" stroke="#45E083" stroke-width="7" stroke-linecap="round" />

      <!-- Snout Bridge Creases -->
      <path d="M 352 550 C 408 530 480 510 532 486"
            fill="none" stroke="#1A1A1A" stroke-width="14" stroke-linecap="round" />
      <path d="M 416 578 C 464 558 508 538 544 526"
            fill="none" stroke="#1A1A1A" stroke-width="12" stroke-linecap="round" />

      <!-- EYES -->
      <!-- Left Eye Brow/Socket -->
      <path d="M 252 446 C 248 314 300 274 372 282 C 440 290 460 358 456 478 C 388 478 308 466 252 446 Z"
            fill="#23A55A" stroke="#1A1A1A" stroke-width="16" />
      <!-- Left Eye Sclera (White) -->
      <ellipse cx="360" cy="422" rx="76" ry="116"
               fill="#FFFFFF" stroke="#1A1A1A" stroke-width="16" />
      <!-- Left Eye Pupil -->
      <ellipse cx="364" cy="426" rx="40" ry="72" fill="#1A1A1A" />
      <!-- Left Eye Catchlights -->
      <circle cx="348" cy="390" r="14" fill="#FFFFFF" />
      <circle cx="380" cy="462" r="7" fill="#FFFFFF" />

      <!-- Right Eye Brow/Socket -->
      <path d="M 528 418 C 544 282 616 262 696 278 C 776 298 796 378 764 510 C 704 498 624 478 548 458 Z"
            fill="#23A55A" stroke="#1A1A1A" stroke-width="16" />
      <!-- Right Eye Sclera (White) -->
      <ellipse cx="660" cy="414" rx="72" ry="112"
               fill="#FFFFFF" stroke="#1A1A1A" stroke-width="16" />
      <!-- Right Eye Pupil -->
      <ellipse cx="660" cy="418" rx="38" ry="68" fill="#1A1A1A" />
      <!-- Right Eye Catchlights -->
      <circle cx="646" cy="386" r="13" fill="#FFFFFF" />
      <circle cx="676" cy="450" r="6" fill="#FFFFFF" />

      <!-- TOOTHY SMILE -->
      <!-- Dark Mouth Interior -->
      <path d="M 160 722 C 252 770 452 786 728 626 C 748 614 736 662 696 710 C 588 814 352 826 180 742 Z"
            fill="#1A1A1A" />

      <!-- Interlocking Sharp White Teeth Sawtooth Row -->
      <path d="M 184 726 
               L 220 750 L 240 726 
               L 272 754 L 296 726 
               L 336 758 L 364 726 
               L 408 762 L 440 726 
               L 486 758 L 516 722 
               L 560 750 L 588 710 
               L 632 734 L 656 690 
               L 688 710 L 712 658 
               Z" 
            fill="#FFFFFF" stroke="#1A1A1A" stroke-width="8" />

      <!-- Smile Dividing Curve -->
      <path d="M 152 722 C 260 770 460 786 736 622"
            fill="none" stroke="#1A1A1A" stroke-width="16" stroke-linecap="round" />

      <!-- Chin Highlight & Contours -->
      <path d="M 240 806 C 340 858 532 866 686 782"
            fill="none" stroke="#1A1A1A" stroke-width="14" stroke-linecap="round" />
      <path d="M 280 834 C 360 870 492 874 616 818"
            fill="none" stroke="#45E083" stroke-width="8" stroke-linecap="round" />
    </g>

    <!-- 3. DEEP PURPLE ROUNDED BORDER (OUTERMOST FRAME) -->
    <rect x="0" y="0" width="1000" height="1000" rx="140" ry="140"
          fill="none" stroke="#33113D" stroke-width="60" />
  </g>
</svg>`;

async function main() {
  fs.writeFileSync('public/gator-icon.svg', svgContent);
  console.log('Saved public/gator-icon.svg');

  const svgBuffer = Buffer.from(svgContent);

  // Generate 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/gator-icon.png');
  console.log('Generated public/gator-icon.png');

  // Copy to pwa and apple icons
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/pwa-512x512.png');
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/pwa-192x192.png');
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');

  fs.copyFileSync('public/gator-icon.svg', 'public/icon.svg');
  console.log('All icons successfully updated!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
