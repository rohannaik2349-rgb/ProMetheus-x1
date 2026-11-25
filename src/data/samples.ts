import { InspectionResult } from '../types';

// Procedurally generate authentic RGB steel images using data URIs
function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

function createSteelTextureSVG(type: 'normal' | 'corrosion' | 'weld' | 'dimmed' | 'shadow'): string {
  const size = 512;
  
  if (type === 'normal') {
    // Normal shot-blasted RGB steel: uniform fine micro-grain, slate gray with subtle blue/warm highlights
    return svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <radialGradient id="gradNormal" cx="45%" cy="40%" r="65%">
          <stop offset="0%" stop-color="#a8b2bc" />
          <stop offset="60%" stop-color="#8d99a5" />
          <stop offset="100%" stop-color="#717d89" />
        </radialGradient>
        <filter id="shotNoise" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" result="noise" />
          <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0.28 0" result="coloredNoise"/>
          <feComposite in="SourceGraphic" in2="coloredNoise" operator="arithmetic" k1="0" k2="1" k3="0.4" k4="0" />
        </filter>
        <pattern id="grainPattern" width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="#ffffff" opacity="0.08"/>
          <circle cx="1" cy="3" r="0.8" fill="#000000" opacity="0.12"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#gradNormal)" filter="url(#shotNoise)" />
      <rect width="100%" height="100%" fill="url(#grainPattern)" />
      <!-- Subtle isotropic surface blast texture -->
      <path d="M0,120 Q200,140 512,110 M0,340 Q280,320 512,360" stroke="#ffffff" stroke-width="1" opacity="0.1" fill="none" />
    </svg>`);
  }

  if (type === 'corrosion') {
    // Needs shot-blasting: severe oxidation, reddish rust pitting and scale patch
    return svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <radialGradient id="gradCorrosion" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="#8c96a0" />
          <stop offset="100%" stop-color="#68727c" />
        </radialGradient>
        <filter id="corrosionFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="3" result="rough" />
          <feDisplacementMap in="SourceGraphic" in2="rough" scale="12" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <radialGradient id="rustSpot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#8a3b14" stop-opacity="0.95" />
          <stop offset="45%" stop-color="#b85d1e" stop-opacity="0.85" />
          <stop offset="80%" stop-color="#5c2409" stop-opacity="0.65" />
          <stop offset="100%" stop-color="#8c96a0" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#gradCorrosion)" />
      <!-- Major corrosion & abrasion patch -->
      <ellipse cx="230" cy="210" rx="95" ry="65" fill="url(#rustSpot)" filter="url(#corrosionFilter)" />
      <ellipse cx="280" cy="260" rx="70" ry="45" fill="url(#rustSpot)" opacity="0.9" />
      <circle cx="210" cy="180" r="18" fill="#421703" opacity="0.85" />
      <circle cx="250" cy="235" r="14" fill="#381403" opacity="0.9" />
      <!-- Scratch line abrasion -->
      <path d="M140,290 C180,270 230,310 340,275" stroke="#3a1804" stroke-width="4.5" fill="none" opacity="0.75" />
      <path d="M160,150 C210,130 290,165 370,140" stroke="#c46727" stroke-width="2.5" fill="none" opacity="0.65" />
    </svg>`);
  }

  if (type === 'weld') {
    // Longitudinal irregular weld seam & heat affected zone
    return svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <linearGradient id="gradSteel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#94a0ab" />
          <stop offset="100%" stop-color="#6e7a85" />
        </linearGradient>
        <filter id="weldRough">
          <feTurbulence type="turbulence" baseFrequency="0.25" numOctaves="2" result="turb" />
          <feDisplacementMap in="SourceGraphic" in2="turb" scale="8" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="url(#gradSteel)" />
      <!-- Heat affected discoloration band -->
      <path d="M310,0 L350,512" stroke="#4b5563" stroke-width="48" opacity="0.35" />
      <path d="M315,0 L355,512" stroke="#854d0e" stroke-width="32" opacity="0.3" />
      <!-- Irregular weld bead defect -->
      <path d="M312,20 Q325,80 318,140 T328,240 T315,340 T326,440 T320,500" 
            stroke="#1e293b" stroke-width="12" fill="none" filter="url(#weldRough)" />
      <!-- Weld spatters -->
      <circle cx="280" cy="160" r="5" fill="#0f172a" />
      <circle cx="265" cy="280" r="4" fill="#0f172a" />
      <circle cx="360" cy="380" r="6" fill="#0f172a" />
      <circle cx="375" cy="210" r="4" fill="#0f172a" />
    </svg>`);
  }

  if (type === 'dimmed') {
    // Simulated shift: identical normal steel under 40% ambient dimming & optical shift
    return svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <radialGradient id="gradDimmed" cx="45%" cy="40%" r="65%">
          <stop offset="0%" stop-color="#565e66" />
          <stop offset="60%" stop-color="#485057" />
          <stop offset="100%" stop-color="#3a4147" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#gradDimmed)" />
      <rect width="100%" height="100%" fill="#1e293b" opacity="0.25" />
      <path d="M0,120 Q200,140 512,110 M0,340 Q280,320 512,360" stroke="#ffffff" stroke-width="1" opacity="0.04" fill="none" />
    </svg>`);
  }

  // Harmless surface shadow / oil sheen
  return svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <radialGradient id="gradBase" cx="45%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#a8b2bc" />
        <stop offset="100%" stop-color="#717d89" />
      </radialGradient>
      <radialGradient id="oilSheen" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#475569" stop-opacity="0.35" />
        <stop offset="70%" stop-color="#334155" stop-opacity="0.15" />
        <stop offset="100%" stop-color="#334155" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#gradBase)" />
    <!-- Harmless diagonal optical shadow from conveyor crane -->
    <polygon points="120,0 260,0 440,512 300,512" fill="#1e293b" opacity="0.14" />
    <!-- Harmless faint oil smudge -->
    <ellipse cx="280" cy="270" rx="60" ry="35" fill="url(#oilSheen)" />
  </svg>`);
}

// Procedurally generate authentic PatchCore anomaly heatmaps (JET colormap)
function createHeatmapSVG(type: 'normal' | 'corrosion' | 'weld' | 'dimmed' | 'shadow', suppressed = false): string {
  const size = 512;
  
  if (type === 'normal') {
    // Very low anomaly distances across entire surface (< 1.2, blue/cyan cool tones)
    return svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <radialGradient id="hmCool" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#00008f" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#000070" stop-opacity="0.08" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#hmCool)" />
    </svg>`);
  }

  if (type === 'corrosion') {
    // High anomaly score (JET red/yellow core surrounded by green/cyan)
    return svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <radialGradient id="jetHot" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ff0000" stop-opacity="0.95" />
          <stop offset="35%" stop-color="#ffff00" stop-opacity="0.9" />
          <stop offset="65%" stop-color="#00ff80" stop-opacity="0.7" />
          <stop offset="85%" stop-color="#0080ff" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#0000ff" stop-opacity="0" />
        </radialGradient>
        <filter id="blurHM">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="#00008f" fill-opacity="0.1" />
      <g filter="url(#blurHM)">
        <ellipse cx="230" cy="210" rx="90" ry="60" fill="url(#jetHot)" />
        <ellipse cx="280" cy="260" rx="65" ry="40" fill="url(#jetHot)" opacity="0.9" />
        <circle cx="210" cy="180" r="30" fill="#ff0000" />
      </g>
    </svg>`);
  }

  if (type === 'weld') {
    // Longitudinal hot line along weld seam
    return svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <filter id="blurWeld">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="#00008f" fill-opacity="0.1" />
      <g filter="url(#blurWeld)">
        <path d="M312,20 Q325,80 318,140 T328,240 T315,340 T326,440 T320,500" 
              stroke="#ff0000" stroke-width="26" fill="none" opacity="0.95" />
        <path d="M312,20 Q325,80 318,140 T328,240 T315,340 T326,440 T320,500" 
              stroke="#ffff00" stroke-width="44" fill="none" opacity="0.75" />
        <path d="M312,20 Q325,80 318,140 T328,240 T315,340 T326,440 T320,500" 
              stroke="#00e5ff" stroke-width="70" fill="none" opacity="0.45" />
      </g>
    </svg>`);
  }

  if (type === 'dimmed') {
    // Diffuse medium shift: elevated scores everywhere (cyan/green wash), but NO hot concentrated core
    return svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <radialGradient id="diffuseShift" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stop-color="#00d084" stop-opacity="0.45" />
          <stop offset="60%" stop-color="#0099ff" stop-opacity="0.38" />
          <stop offset="100%" stop-color="#0000c0" stop-opacity="0.3" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#diffuseShift)" />
    </svg>`);
  }

  // Shadow / Harmless oil smudge:
  if (suppressed) {
    // When suppressed: down-weighted by 0.5x, drops below threshold to safe blue/cool levels!
    return svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <filter id="blurShadowSuppressed">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>
      <rect width="100%" height="100%" fill="#00008f" fill-opacity="0.08" />
      <g filter="url(#blurShadowSuppressed)">
        <!-- Suppressed faint footprint: 50% suppressed down to safe dark blue -->
        <ellipse cx="280" cy="270" rx="55" ry="30" fill="#0055ff" opacity="0.22" />
      </g>
    </svg>`);
  }

  // Unsuppressed harmless shadow: triggers borderline false alert before suppression
  return svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <filter id="blurShadow">
        <feGaussianBlur stdDeviation="14" />
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="#00008f" fill-opacity="0.1" />
    <g filter="url(#blurShadow)">
      <polygon points="120,0 260,0 440,512 300,512" fill="#00ffc4" opacity="0.35" />
      <ellipse cx="280" cy="270" rx="60" ry="35" fill="#ff9900" opacity="0.8" />
      <circle cx="280" cy="270" r="18" fill="#ff3300" opacity="0.75" />
    </g>
  </svg>`);
}

export interface CuratedSample {
  id: string;
  name: string;
  dataset: string;
  category: 'Normal' | 'Defect' | 'Shift' | 'Harmless';
  tag: string;
  tagColor: 'green' | 'red' | 'amber' | 'purple' | 'blue';
  description: string;
  image_src: string;
  heatmap_src: string;
  suppressed_heatmap_src?: string;
  result: InspectionResult;
}

export const CURATED_SAMPLES: CuratedSample[] = [
  {
    id: 'sample-normal',
    name: 'Sample #01: Ready for Paint (Clean)',
    dataset: 'SteelBlastQC (Original 3-Channel RGB)',
    category: 'Normal',
    tag: 'Ready for paint · Auto-PASS',
    tagColor: 'green',
    description: 'Clean shot-blasted hot-rolled steel surface. Memory bank nearest-neighbor distances are minimal across all 1,024 patches.',
    image_src: createSteelTextureSVG('normal'),
    heatmap_src: createHeatmapSVG('normal'),
    result: {
      inspection_id: 1042,
      image_name: 'SteelBlastQC_RGB_0882_paint_ready.png',
      image_src: createSteelTextureSVG('normal'),
      heatmap_src: createHeatmapSVG('normal'),
      image_score: 1.18,
      threshold: 2.10,
      p_value: 0.684,
      alpha: 0.05,
      finest_alpha: 0.024,
      decision: 'NORMAL',
      triage: 'PASS',
      severity: {
        score: 0.0,
        level: 'None',
        breakdown: { A_term: 0, I_term: 0, C_term: 0 }
      },
      shift: {
        score: 0.62,
        threshold: 2.45,
        flag: false,
        concentration: 0.12,
        concentration_threshold: 0.42,
        condition_id: 1,
        condition_name: 'Standard Blast QC Line A',
        is_unknown: false
      },
      regions: [],
      latency_ms: 18.4,
      timestamp: '2026-11-25 18:42:10 UTC',
      model_version: 'pc-wrn50-v1',
      is_colour_rgb: true,
      dataset_source: 'SteelBlastQC (Maastricht Univ)'
    }
  },
  {
    id: 'sample-corrosion',
    name: 'Sample #02: Heavy Corrosion & Abrasion',
    dataset: 'SteelBlastQC (Original 3-Channel RGB)',
    category: 'Defect',
    tag: 'Needs shot-blasting · REJECT',
    tagColor: 'red',
    description: 'Significant iron-oxide scale crust, severe pitting and surface abrasion. Score exceeds threshold with rigorous conformal rejection.',
    image_src: createSteelTextureSVG('corrosion'),
    heatmap_src: createHeatmapSVG('corrosion'),
    result: {
      inspection_id: 1043,
      image_name: 'SteelBlastQC_RGB_0411_abrasion_corrosion.png',
      image_src: createSteelTextureSVG('corrosion'),
      heatmap_src: createHeatmapSVG('corrosion'),
      image_score: 3.84,
      threshold: 2.10,
      p_value: 0.002,
      alpha: 0.05,
      finest_alpha: 0.024,
      decision: 'DEFECT',
      triage: 'REJECT',
      severity: {
        score: 0.78,
        level: 'High',
        breakdown: { A_term: 0.38, I_term: 0.32, C_term: 0.08 }
      },
      shift: {
        score: 1.48,
        threshold: 2.45,
        flag: false,
        concentration: 0.68,
        concentration_threshold: 0.42,
        condition_id: 1,
        condition_name: 'Standard Blast QC Line A',
        is_unknown: false
      },
      regions: [
        {
          id: 1,
          bbox: [140, 150, 180, 140],
          area_px: 25200,
          area_frac: 0.096,
          peak_score: 3.84,
          family_id: 1,
          family_name: 'Corrosion Crust / Scale'
        },
        {
          id: 2,
          bbox: [220, 240, 110, 80],
          area_px: 8800,
          area_frac: 0.033,
          peak_score: 2.95,
          family_id: 2,
          family_name: 'Mechanical Abrasion'
        }
      ],
      latency_ms: 22.1,
      timestamp: '2026-11-25 18:43:05 UTC',
      model_version: 'pc-wrn50-v1',
      is_colour_rgb: true,
      dataset_source: 'SteelBlastQC (Maastricht Univ)'
    }
  },
  {
    id: 'sample-weld',
    name: 'Sample #03: Welding Seam Irregularity',
    dataset: 'SteelBlastQC (Original 3-Channel RGB)',
    category: 'Defect',
    tag: 'Seam Cut / Splatter · REVIEW',
    tagColor: 'amber',
    description: 'Longitudinal welding seam cut anomaly with localized spatter. Medium severity requires supervisor triage review.',
    image_src: createSteelTextureSVG('weld'),
    heatmap_src: createHeatmapSVG('weld'),
    result: {
      inspection_id: 1044,
      image_name: 'SteelBlastQC_RGB_0729_welding_cut.png',
      image_src: createSteelTextureSVG('weld'),
      heatmap_src: createHeatmapSVG('weld'),
      image_score: 2.92,
      threshold: 2.10,
      p_value: 0.014,
      alpha: 0.05,
      finest_alpha: 0.024,
      decision: 'DEFECT',
      triage: 'REVIEW',
      severity: {
        score: 0.54,
        level: 'Medium',
        breakdown: { A_term: 0.24, I_term: 0.22, C_term: 0.08 }
      },
      shift: {
        score: 1.15,
        threshold: 2.45,
        flag: false,
        concentration: 0.52,
        concentration_threshold: 0.42,
        condition_id: 1,
        condition_name: 'Standard Blast QC Line A',
        is_unknown: false
      },
      regions: [
        {
          id: 3,
          bbox: [290, 10, 60, 490],
          area_px: 29400,
          area_frac: 0.112,
          peak_score: 2.92,
          family_id: 3,
          family_name: 'Welding Line & Spatter'
        }
      ],
      latency_ms: 19.8,
      timestamp: '2026-11-25 18:44:12 UTC',
      model_version: 'pc-wrn50-v1',
      is_colour_rgb: true,
      dataset_source: 'SteelBlastQC (Maastricht Univ)'
    }
  },
  {
    id: 'sample-dimmed',
    name: 'Sample #04: Dimmed Illumination (Optical Shift)',
    dataset: 'Simulated Shift Test (Section 6)',
    category: 'Shift',
    tag: 'Optical Shift · SHIFT_HOLD',
    tagColor: 'purple',
    description: 'Clean steel under 40% ambient dimming. Trust layer flags a global Mahalanobis shift without defect concentration, preventing false reject!',
    image_src: createSteelTextureSVG('dimmed'),
    heatmap_src: createHeatmapSVG('dimmed'),
    result: {
      inspection_id: 1045,
      image_name: 'Shift_Sim_RGB_brightness_0.60.png',
      image_src: createSteelTextureSVG('dimmed'),
      heatmap_src: createHeatmapSVG('dimmed'),
      image_score: 2.28, // slightly above normal threshold
      threshold: 2.10,
      p_value: 0.038,
      alpha: 0.05,
      finest_alpha: 0.024,
      decision: 'SHIFT_HOLD',
      triage: 'REVIEW',
      severity: {
        score: 0.28,
        level: 'Low',
        breakdown: { A_term: 0.10, I_term: 0.12, C_term: 0.06 }
      },
      shift: {
        score: 4.86, // above shift_threshold 2.45
        threshold: 2.45,
        flag: true,
        concentration: 0.18, // diffuse, below concentration_thr 0.42!
        concentration_threshold: 0.42,
        condition_id: 1,
        condition_name: 'Standard Blast QC Line A',
        is_unknown: false
      },
      regions: [],
      latency_ms: 21.0,
      timestamp: '2026-11-25 18:45:00 UTC',
      model_version: 'pc-wrn50-v1',
      is_colour_rgb: true,
      dataset_source: 'Simulated Brightness (RGB factor 0.60)'
    }
  },
  {
    id: 'sample-shadow',
    name: 'Sample #05: Conveyor Shadow / Harmless Oil Sheen',
    dataset: 'SteelBlastQC (Suppression Bank Demo)',
    category: 'Harmless',
    tag: 'Suppression Ready · Test Feedback',
    tagColor: 'blue',
    description: 'Innocuous conveyor shadow initially flags a borderline anomaly. Click "Mark Harmless" to activate patch suppression and down-weight false alarms.',
    image_src: createSteelTextureSVG('shadow'),
    heatmap_src: createHeatmapSVG('shadow'),
    suppressed_heatmap_src: createHeatmapSVG('shadow', true),
    result: {
      inspection_id: 1046,
      image_name: 'SteelBlastQC_RGB_0912_shadow_smear.png',
      image_src: createSteelTextureSVG('shadow'),
      heatmap_src: createHeatmapSVG('shadow'),
      image_score: 2.34,
      threshold: 2.10,
      p_value: 0.032,
      alpha: 0.05,
      finest_alpha: 0.024,
      decision: 'DEFECT',
      triage: 'REVIEW',
      severity: {
        score: 0.36,
        level: 'Medium',
        breakdown: { A_term: 0.18, I_term: 0.12, C_term: 0.06 }
      },
      shift: {
        score: 1.28,
        threshold: 2.45,
        flag: false,
        concentration: 0.48,
        concentration_threshold: 0.42,
        condition_id: 1,
        condition_name: 'Standard Blast QC Line A',
        is_unknown: false
      },
      regions: [
        {
          id: 4,
          bbox: [220, 230, 120, 80],
          area_px: 9600,
          area_frac: 0.036,
          peak_score: 2.34,
          family_id: 4,
          family_name: 'Harmless Oil Smear'
        }
      ],
      latency_ms: 19.2,
      timestamp: '2026-11-25 18:46:22 UTC',
      model_version: 'pc-wrn50-v1',
      is_colour_rgb: true,
      dataset_source: 'SteelBlastQC (Maastricht Univ)'
    }
  }
];

export const INITIAL_CONDITIONS = [
  {
    id: 1,
    name: 'Standard Blast QC Line A (Active)',
    description: 'Calibrated on 150 clean "Ready for Paint" RGB SteelBlastQC samples.',
    threshold: 2.10,
    shift_threshold: 2.45,
    sample_count: 150,
    active: true,
    calibrated_at: '2026-11-20',
    emb_mean_norm: 14.82
  },
  {
    id: 2,
    name: 'Night Shift Cold-Rolling Batch (Renormalized)',
    description: 'Method A renormalization on 15 samples under high-pressure sodium lighting.',
    threshold: 2.35,
    shift_threshold: 2.90,
    sample_count: 15,
    active: false,
    calibrated_at: '2026-11-23',
    emb_mean_norm: 16.40
  }
];

export const INITIAL_AUDIT_LOG = [
  {
    id: 101,
    ts: '2026-11-25 18:30:12 UTC',
    actor: 'System Initialization',
    action: 'BUNDLE_LOADED',
    entity: 'models/pc-wrn50-v1',
    entity_id: 1,
    payload: '{"dataset": "SteelBlastQC", "seed": 42, "frozen_backbone": "WideResNet50_2"}',
    prev_hash: '0000000000000000000000000000000000000000000000000000000000000000',
    hash: 'a98f7e21b8c049d5e3170e1bfb11849a623910c2847a982136e053a921d4512e',
    verified: true
  },
  {
    id: 102,
    ts: '2026-11-25 18:34:40 UTC',
    actor: 'Dr. Praveen',
    action: 'CALIBRATION_LOCK',
    entity: 'conditions',
    entity_id: 1,
    payload: '{"threshold": 2.10, "alpha": 0.05, "n_calib": 40, "finest_alpha": 0.024}',
    prev_hash: 'a98f7e21b8c049d5e3170e1bfb11849a623910c2847a982136e053a921d4512e',
    hash: '57b29e01f467a80b1e42c266f827d91e5c249a319bb786014e7a83d09a25b29f',
    verified: true
  },
  {
    id: 103,
    ts: '2026-11-25 18:42:10 UTC',
    actor: 'Dr. Praveen',
    action: 'INSPECT_LOGGED',
    entity: 'inspections',
    entity_id: 1042,
    payload: '{"score": 1.18, "decision": "NORMAL", "triage": "PASS", "p_val": 0.684}',
    prev_hash: '57b29e01f467a80b1e42c266f827d91e5c249a319bb786014e7a83d09a25b29f',
    hash: 'b17849e79f041d8e64c2079147d3e098a54162e035170d7681c9a008c2a4f61e',
    verified: true
  }
];

export const DEFECT_FAMILIES = [
  {
    id: 1,
    name: 'Corrosion Crust / Scale',
    color: '#ef4444',
    description: 'Thick reddish iron oxide scaling with high depth irregularity and high anomaly intensity.',
    count: 38,
    avg_severity: 0.74,
    sample_pattern: 'Diffuse circular / irregular patches'
  },
  {
    id: 2,
    name: 'Mechanical Abrasion / Scratches',
    color: '#f97316',
    description: 'Longitudinal gouges and surface scuff marks from handling guides or rough rollers.',
    count: 24,
    avg_severity: 0.58,
    sample_pattern: 'Linear tracks with high pixel gradients'
  },
  {
    id: 3,
    name: 'Welding Line & Spatter',
    color: '#eab308',
    description: 'Bead discontinuity, weld undercuts, and scattered metallic splatter globules.',
    count: 19,
    avg_severity: 0.62,
    sample_pattern: 'Longitudinal seam band with punctate satellites'
  },
  {
    id: 4,
    name: 'Harmless Oil Smears & Shadows',
    color: '#3b82f6',
    description: 'Superficial oil residue and optical shadows with low localized severity.',
    count: 14,
    avg_severity: 0.28,
    sample_pattern: 'Faint gradient boundaries, low edge sharpness'
  }
];
