export interface TextZone {
  x: number;
  y: number;
  width: number;
  align?: 'center' | 'left' | 'right';
  maxHeight?: number;
}

export interface TextZones {
  studentName?: TextZone;
  body?: TextZone;
  signature?: TextZone;
  signatureLabel?: TextZone;
  contactPerson?: TextZone;
  contactPersonTitle?: TextZone;
  companyName?: TextZone;
  subtitle?: TextZone;
  mainTitle?: TextZone;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  isCustom?: boolean; // Indicates if this is a custom uploaded template
  customImageUrl?: string; // URL of the custom background image
  textZones?: TextZones; // Text positioning for custom templates (optional, uses defaults if not provided)
  config: {
    border: {
      topColor: string;
      rightColor: string;
      bottomColor: string;
      leftColor: string;
      width: number;
      style: 'solid' | 'dashed' | 'double' | 'gradient' | 'wavy' | 'scalloped' | 'double-wavy' | 'dotted' | 'striped' | 'checkerboard' | 'curly';
    };
    decorativeBorders: {
      enabled: boolean;
      topWidth: number;
      rightWidth: number;
      bottomWidth: number;
      leftWidth: number;
      topColor: string;
      rightColor: string;
      bottomColor: string;
      leftColor: string;
    };
    logo: {
      enabled: boolean;
      text: string;
      fontSize: number;
      fontFamily: string;
      fontWeight: string;
      color: string;
      backgroundColor: string;
      shape: 'circle' | 'hexagon' | 'square' | 'none';
      yPosition: number;
      size: number;
    };
    banner: {
      enabled: boolean;
      text: string;
      fontSize: number;
      fontFamily: string;
      fontWeight: string;
      textColor: string;
      backgroundColor: string;
      yPosition: number;
      height: number;
      borderRadius: number;
    };
    seal: {
      enabled: boolean;
      position: 'bottom-center' | 'bottom-left' | 'bottom-right';
      size: number;
      color: string;
      text: string;
      textColor: string;
      yPosition: number;
    };
    text: {
      mainTitle: {
        fontSize: number;
        fontFamily: string;
        fontWeight: string;
        color: string;
        yPosition: number;
        letterSpacing: number;
      };
      subtitle: {
        fontSize: number;
        fontFamily: string;
        fontWeight: string;
        color: string;
        yPosition: number;
      };
      presentedTo: {
        fontSize: number;
        fontFamily: string;
        fontWeight: string;
        color: string;
        yPosition: number;
      };
      studentName: {
        fontSize: number;
        fontFamily: string;
        fontWeight: string;
        color: string;
        yPosition: number;
        fontStyle: 'normal' | 'italic';
      };
      body: {
        fontSize: number;
        fontFamily: string;
        fontWeight: string;
        color: string;
        lineHeight: number;
      };
      dateLabel: {
        fontSize: number;
        fontFamily: string;
        fontWeight: string;
        color: string;
      };
      signatureLabel: {
        fontSize: number;
        fontFamily: string;
        fontWeight: string;
        color: string;
      };
    };
    layout: {
      padding: number;
      contentWidth: number;
      centerX: number;
      topMargin: number;
      bottomMargin: number;
    };
  };
}

export const CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
  {
    id: 'gold_blue_premium',
    name: 'Gold & Blue Premium',
    config: {
      border: {
        topColor: '#B8860B',
        rightColor: '#B8860B',
        bottomColor: '#000080',
        leftColor: '#000080',
        width: 12,
        style: 'wavy'
      },
      decorativeBorders: {
        enabled: false,
        topWidth: 0,
        rightWidth: 0,
        bottomWidth: 0,
        leftWidth: 0,
        topColor: '#FFFFFF',
        rightColor: '#FFFFFF',
        bottomColor: '#FFFFFF',
        leftColor: '#FFFFFF'
      },
      logo: {
        enabled: true,
        text: 'C',
        fontSize: 48,
        fontFamily: 'Georgia, serif',
        fontWeight: 'bold',
        color: '#FFFFFF',
        backgroundColor: '#1E3A8A',
        shape: 'hexagon',
        yPosition: 80,
        size: 80
      },
      banner: {
        enabled: true,
        text: 'OF ACHIEVEMENT',
        fontSize: 22,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        textColor: '#FFFFFF',
        backgroundColor: '#D4AF37',
        yPosition: 250,
        height: 55,
        borderRadius: 25
      },
      seal: {
        enabled: true,
        position: 'bottom-center',
        size: 120,
        color: '#D4AF37',
        text: 'SEAL',
        textColor: '#FFFFFF',
        yPosition: 1450
      },
      text: {
        mainTitle: {
          fontSize: 72,
          fontFamily: 'Georgia, serif',
          fontWeight: 'bold',
          color: '#1E3A8A',
          yPosition: 170,
          letterSpacing: 10
        },
        subtitle: {
          fontSize: 18,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          color: '#666666',
          yPosition: 280
        },
        presentedTo: {
          fontSize: 16,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          color: '#666666',
          yPosition: 380
        },
        studentName: {
          fontSize: 52,
          fontFamily: 'Brush Script MT, cursive',
          fontWeight: 'normal',
          color: '#D4AF37',
          yPosition: 420,
          fontStyle: 'italic'
        },
        body: {
          fontSize: 18,
          fontFamily: 'Georgia, serif',
          fontWeight: 'normal',
          color: '#333333',
          lineHeight: 28
        },
        dateLabel: {
          fontSize: 16,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          color: '#666666'
        },
        signatureLabel: {
          fontSize: 16,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          color: '#666666'
        }
      },
      layout: {
        padding: 60,
        contentWidth: 1080,
        centerX: 600,
        topMargin: 40,
        bottomMargin: 100
      }
    }
  },
  {
    id: 'classic_elegant',
    name: 'Classic Elegant',
    config: {
      border: {
        topColor: '#654321',
        rightColor: '#654321',
        bottomColor: '#654321',
        leftColor: '#654321',
        width: 8,
        style: 'double-wavy'
      },
      decorativeBorders: {
        enabled: false,
        topWidth: 0,
        rightWidth: 0,
        bottomWidth: 0,
        leftWidth: 0,
        topColor: '',
        rightColor: '',
        bottomColor: '',
        leftColor: ''
      },
      logo: {
        enabled: false,
        text: '',
        fontSize: 0,
        fontFamily: '',
        fontWeight: '',
        color: '',
        backgroundColor: '',
        shape: 'none',
        yPosition: 0,
        size: 0
      },
      banner: {
        enabled: false,
        text: '',
        fontSize: 0,
        fontFamily: '',
        fontWeight: '',
        textColor: '',
        backgroundColor: '',
        yPosition: 0,
        height: 0,
        borderRadius: 0
      },
      seal: {
        enabled: true,
        position: 'bottom-center',
        size: 100,
        color: '#8B4513',
        text: '',
        textColor: '#FFFFFF',
        yPosition: 1470
      },
      text: {
        mainTitle: {
          fontSize: 64,
          fontFamily: 'Times New Roman, serif',
          fontWeight: 'bold',
          color: '#000000',
          yPosition: 180,
          letterSpacing: 6
        },
        subtitle: {
          fontSize: 24,
          fontFamily: 'Times New Roman, serif',
          fontWeight: 'normal',
          color: '#000000',
          yPosition: 250
        },
        presentedTo: {
          fontSize: 18,
          fontFamily: 'Times New Roman, serif',
          fontWeight: 'normal',
          color: '#333333',
          yPosition: 360
        },
        studentName: {
          fontSize: 48,
          fontFamily: 'Times New Roman, serif',
          fontWeight: 'bold',
          color: '#000000',
          yPosition: 400,
          fontStyle: 'normal'
        },
        body: {
          fontSize: 18,
          fontFamily: 'Times New Roman, serif',
          fontWeight: 'normal',
          color: '#333333',
          lineHeight: 26
        },
        dateLabel: {
          fontSize: 16,
          fontFamily: 'Times New Roman, serif',
          fontWeight: 'normal',
          color: '#666666'
        },
        signatureLabel: {
          fontSize: 16,
          fontFamily: 'Times New Roman, serif',
          fontWeight: 'normal',
          color: '#666666'
        }
      },
      layout: {
        padding: 50,
        contentWidth: 1100,
        centerX: 600,
        topMargin: 50,
        bottomMargin: 80
      }
    }
  },
  {
    id: 'modern_professional',
    name: 'Modern Professional',
    config: {
      border: {
        topColor: '#1A252F',
        rightColor: '#1A252F',
        bottomColor: '#1A252F',
        leftColor: '#1A252F',
        width: 10,
        style: 'scalloped'
      },
      decorativeBorders: {
        enabled: false,
        topWidth: 0,
        rightWidth: 0,
        bottomWidth: 0,
        leftWidth: 0,
        topColor: '#FFFFFF',
        rightColor: '#FFFFFF',
        bottomColor: '#FFFFFF',
        leftColor: '#FFFFFF'
      },
      logo: {
        enabled: true,
        text: '✓',
        fontSize: 56,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        color: '#FFFFFF',
        backgroundColor: '#2C3E50',
        shape: 'circle',
        yPosition: 70,
        size: 100
      },
      banner: {
        enabled: true,
        text: 'CERTIFICATE OF COMPLETION',
        fontSize: 22,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        textColor: '#FFFFFF',
        backgroundColor: '#2C3E50',
        yPosition: 270,
        height: 60,
        borderRadius: 0
      },
      seal: {
        enabled: false,
        position: 'bottom-center',
        size: 0,
        color: '',
        text: '',
        textColor: '',
        yPosition: 0
      },
      text: {
        mainTitle: {
          fontSize: 68,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          color: '#2C3E50',
          yPosition: 300,
          letterSpacing: 8
        },
        subtitle: {
          fontSize: 20,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          color: '#7F8C8D',
          yPosition: 380
        },
        presentedTo: {
          fontSize: 18,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          color: '#7F8C8D',
          yPosition: 450
        },
        studentName: {
          fontSize: 50,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          color: '#2C3E50',
          yPosition: 490,
          fontStyle: 'normal'
        },
        body: {
          fontSize: 18,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          color: '#34495E',
          lineHeight: 28
        },
        dateLabel: {
          fontSize: 16,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          color: '#7F8C8D'
        },
        signatureLabel: {
          fontSize: 16,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          color: '#7F8C8D'
        }
      },
      layout: {
        padding: 50,
        contentWidth: 1100,
        centerX: 600,
        topMargin: 40,
        bottomMargin: 90
      }
    }
  },
  {
    id: 'gold_luxury',
    name: 'Gold Luxury',
    config: {
      border: {
        topColor: '#DAA520',
        rightColor: '#DAA520',
        bottomColor: '#654321',
        leftColor: '#654321',
        width: 14,
        style: 'dotted'
      },
      decorativeBorders: {
        enabled: false,
        topWidth: 0,
        rightWidth: 0,
        bottomWidth: 0,
        leftWidth: 0,
        topColor: '#FFFFFF',
        rightColor: '#FFFFFF',
        bottomColor: '#FFFFFF',
        leftColor: '#FFFFFF'
      },
      logo: {
        enabled: true,
        text: '★',
        fontSize: 64,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        color: '#FFD700',
        backgroundColor: 'transparent',
        shape: 'none',
        yPosition: 60,
        size: 0
      },
      banner: {
        enabled: true,
        text: 'OF EXCELLENCE',
        fontSize: 24,
        fontFamily: 'Georgia, serif',
        fontWeight: 'bold',
        textColor: '#FFFFFF',
        backgroundColor: '#8B4513',
        yPosition: 250,
        height: 65,
        borderRadius: 30
      },
      seal: {
        enabled: true,
        position: 'bottom-center',
        size: 130,
        color: '#FFD700',
        text: 'EXCELLENCE',
        textColor: '#8B4513',
        yPosition: 1440
      },
      text: {
        mainTitle: {
          fontSize: 76,
          fontFamily: 'Georgia, serif',
          fontWeight: 'bold',
          color: '#8B4513',
          yPosition: 160,
          letterSpacing: 12
        },
        subtitle: {
          fontSize: 20,
          fontFamily: 'Georgia, serif',
          fontWeight: 'normal',
          color: '#666666',
          yPosition: 290
        },
        presentedTo: {
          fontSize: 18,
          fontFamily: 'Georgia, serif',
          fontWeight: 'normal',
          color: '#666666',
          yPosition: 400
        },
        studentName: {
          fontSize: 56,
          fontFamily: 'Brush Script MT, cursive',
          fontWeight: 'normal',
          color: '#8B4513',
          yPosition: 440,
          fontStyle: 'italic'
        },
        body: {
          fontSize: 18,
          fontFamily: 'Georgia, serif',
          fontWeight: 'normal',
          color: '#333333',
          lineHeight: 30
        },
        dateLabel: {
          fontSize: 16,
          fontFamily: 'Georgia, serif',
          fontWeight: 'normal',
          color: '#666666'
        },
        signatureLabel: {
          fontSize: 16,
          fontFamily: 'Georgia, serif',
          fontWeight: 'normal',
          color: '#666666'
        }
      },
      layout: {
        padding: 60,
        contentWidth: 1080,
        centerX: 600,
        topMargin: 30,
        bottomMargin: 110
      }
    }
  },
  {
    id: 'blue_serenity',
    name: 'Blue Serenity',
    config: {
      border: {
        topColor: '#0000CD',
        rightColor: '#0000CD',
        bottomColor: '#0066CC',
        leftColor: '#0066CC',
        width: 12,
        style: 'curly'
      },
      decorativeBorders: {
        enabled: false,
        topWidth: 0,
        rightWidth: 0,
        bottomWidth: 0,
        leftWidth: 0,
        topColor: '#FFFFFF',
        rightColor: '#FFFFFF',
        bottomColor: '#FFFFFF',
        leftColor: '#FFFFFF'
      },
      logo: {
        enabled: true,
        text: 'C',
        fontSize: 52,
        fontFamily: 'Georgia, serif',
        fontWeight: 'bold',
        color: '#FFFFFF',
        backgroundColor: '#4169E1',
        shape: 'circle',
        yPosition: 75,
        size: 90
      },
      banner: {
        enabled: true,
        text: 'OF COMPLETION',
        fontSize: 21,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        textColor: '#FFFFFF',
        backgroundColor: '#1E90FF',
        yPosition: 260,
        height: 58,
        borderRadius: 26
      },
      seal: {
        enabled: true,
        position: 'bottom-center',
        size: 115,
        color: '#4169E1',
        text: 'VERIFIED',
        textColor: '#FFFFFF',
        yPosition: 1460
      },
      text: {
        mainTitle: {
          fontSize: 70,
          fontFamily: 'Georgia, serif',
          fontWeight: 'bold',
          color: '#4169E1',
          yPosition: 175,
          letterSpacing: 9
        },
        subtitle: {
          fontSize: 18,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          color: '#666666',
          yPosition: 285
        },
        presentedTo: {
          fontSize: 16,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          color: '#666666',
          yPosition: 390
        },
        studentName: {
          fontSize: 50,
          fontFamily: 'Georgia, serif',
          fontWeight: 'bold',
          color: '#4169E1',
          yPosition: 430,
          fontStyle: 'normal'
        },
        body: {
          fontSize: 18,
          fontFamily: 'Georgia, serif',
          fontWeight: 'normal',
          color: '#333333',
          lineHeight: 28
        },
        dateLabel: {
          fontSize: 16,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          color: '#666666'
        },
        signatureLabel: {
          fontSize: 16,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal',
          color: '#666666'
        }
      },
      layout: {
        padding: 55,
        contentWidth: 1090,
        centerX: 600,
        topMargin: 35,
        bottomMargin: 95
      }
    }
  }
];

// Sample data for preview when no intern is selected
export const SAMPLE_PREVIEW_DATA = {
  firstName: 'John',
  lastName: 'Doe',
  totalHours: 540,
  startDate: '2023-02-06',
  endDate: '2023-04-22'
};
