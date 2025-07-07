// Comprehensive Design Token System
// Cultural and accessibility-focused tokens for Bangladesh educational system

export const designTokens = {
  // Color System - Culturally Appropriate
  colors: {
    primary: {
      50: '#f0f9ff',   // Light sky - trust and openness
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',  // Professional blue - main brand
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e'   // Deep trust - authority
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#16a34a',  // Islamic green - success and growth
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#14532d'
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',  // Saffron accent - attention
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f'
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',  // Clear error indication
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d'
    },
    cultural: {
      bangladesh: {
        red: '#006a4e',     // Bangladesh flag deep green
        green: '#dc143c',   // Bangladesh flag red
        gold: '#ca8a04',    // Traditional gold accent
        saffron: '#ff9933'  // Cultural saffron
      },
      education: {
        wisdom: '#4f46e5',    // Deep purple for knowledge
        growth: '#059669',    // Green for development
        achievement: '#dc2626', // Red for accomplishment
        community: '#7c3aed'  // Purple for unity
      }
    },
    neutral: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a'
    }
  },

  // Typography System - Bilingual Support
  typography: {
    bengali: {
      fontFamily: '"SutonnyMJ", "Kalpurush", "Nikosh", sans-serif',
      weights: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      },
      sizes: {
        xs: '0.75rem',    // 12px
        sm: '0.875rem',   // 14px
        base: '1rem',     // 16px
        lg: '1.125rem',   // 18px
        xl: '1.25rem',    // 20px
        '2xl': '1.5rem',  // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem', // 36px
        '5xl': '3rem'     // 48px
      },
      lineHeights: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75
      }
    },
    english: {
      fontFamily: '"Inter", "system-ui", "-apple-system", sans-serif',
      weights: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700
      },
      sizes: {
        xs: '0.75rem',    // 12px
        sm: '0.875rem',   // 14px
        base: '1rem',     // 16px
        lg: '1.125rem',   // 18px
        xl: '1.25rem',    // 20px
        '2xl': '1.5rem',  // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem', // 36px
        '5xl': '3rem'     // 48px
      },
      lineHeights: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75
      }
    }
  },

  // Spacing System - Consistent and Accessible
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',  // 2px
    1: '0.25rem',     // 4px
    1.5: '0.375rem',  // 6px
    2: '0.5rem',      // 8px
    2.5: '0.625rem',  // 10px
    3: '0.75rem',     // 12px
    3.5: '0.875rem',  // 14px
    4: '1rem',        // 16px
    5: '1.25rem',     // 20px
    6: '1.5rem',      // 24px
    7: '1.75rem',     // 28px
    8: '2rem',        // 32px
    9: '2.25rem',     // 36px
    10: '2.5rem',     // 40px
    11: '2.75rem',    // 44px
    12: '3rem',       // 48px
    14: '3.5rem',     // 56px
    16: '4rem',       // 64px
    20: '5rem',       // 80px
    24: '6rem',       // 96px
    28: '7rem',       // 112px
    32: '8rem',       // 128px
    36: '9rem',       // 144px
    40: '10rem',      // 160px
    44: '11rem',      // 176px
    48: '12rem',      // 192px
    52: '13rem',      // 208px
    56: '14rem',      // 224px
    60: '15rem',      // 240px
    64: '16rem',      // 256px
    72: '18rem',      // 288px
    80: '20rem',      // 320px
    96: '24rem'       // 384px
  },

  // Breakpoints - Mobile-First Responsive Design
  breakpoints: {
    xs: '320px',   // Small phones
    sm: '640px',   // Large phones
    md: '768px',   // Tablets
    lg: '1024px',  // Laptops
    xl: '1280px',  // Desktops
    '2xl': '1536px' // Large screens
  },

  // Border Radius - Friendly and Professional
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    default: '0.25rem', // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px'
  },

  // Shadows - Depth and Hierarchy
  shadows: {
    xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    default: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    cultural: '0 4px 12px 0 rgb(6 106 78 / 0.1)' // Bangladesh green shadow
  },

  // Z-Index - Layering System
  zIndex: {
    hide: -1,
    auto: 'auto',
    base: 0,
    docked: 10,
    dropdown: 1000,
    sticky: 1020,
    banner: 1030,
    overlay: 1040,
    modal: 1050,
    popover: 1060,
    skipLink: 1070,
    toast: 1080,
    tooltip: 1090
  },

  // Transitions - Smooth and Natural
  transitions: {
    none: 'none',
    all: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    default: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    colors: 'color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), border-color 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    shadow: 'box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'all 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    cultural: 'all 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)' // Gentle, respectful timing
  },

  // Cultural Patterns
  cultural: {
    patterns: {
      bengali: {
        script: 'Bengali',
        readingDirection: 'ltr',
        numberSystem: 'Bengali',
        calendar: 'Bengali'
      },
      educational: {
        academicYear: 'January-December',
        termSystem: 'Three-term',
        gradingSystem: 'Percentage',
        timeFormat: '12-hour'
      }
    },
    accessibility: {
      minimumTouchTarget: '44px',
      minimumContrast: '4.5:1',
      focusIndicator: '2px solid #0ea5e9',
      skipLinkColor: '#0ea5e9'
    }
  }
};

// Utility functions for design tokens
export const getColor = (path: string) => {
  const keys = path.split('.');
  let value: any = designTokens.colors;
  
  for (const key of keys) {
    value = value[key];
    if (!value) return null;
  }
  
  return value;
};

export const getSpacing = (size: keyof typeof designTokens.spacing) => {
  return designTokens.spacing[size];
};

export const getTypography = (language: 'bengali' | 'english', property: string) => {
  const lang = designTokens.typography[language];
  return lang[property as keyof typeof lang];
};

export default designTokens;