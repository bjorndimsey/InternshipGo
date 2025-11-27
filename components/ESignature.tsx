import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { apiService } from '../lib/api';
import CloudinaryService from '../lib/cloudinaryService';

const { width } = Dimensions.get('window');

interface ESignatureProps {
  userId: string;
  currentSignature?: string | null;
  visible: boolean;
  onClose: () => void;
  onSaveSuccess?: (signatureUrl: string) => void;
}

export default function ESignature({
  userId,
  currentSignature,
  visible,
  onClose,
  onSaveSuccess,
}: ESignatureProps) {
  // Signature States
  const [signatureColor, setSignatureColor] = useState('#000000');
  const [signatureWidth, setSignatureWidth] = useState(3);
  const [signatureAngle, setSignatureAngle] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showViewSignature, setShowViewSignature] = useState(false);
  
  // Preserve signature URL locally even if prop becomes null
  const [preservedSignature, setPreservedSignature] = useState<string | null>(null);
  
  // Update preserved signature when currentSignature prop changes (but preserve it if prop becomes null)
  useEffect(() => {
    if (currentSignature && currentSignature.trim() !== '') {
      setPreservedSignature(currentSignature);
    }
  }, [currentSignature]);
  
  // Use preserved signature if currentSignature prop is null/empty
  const activeSignature = currentSignature && currentSignature.trim() !== '' 
    ? currentSignature 
    : preservedSignature;
  
  // HSL Color States for visual picker
  const [hue, setHue] = useState(0); // 0-360
  const [saturation, setSaturation] = useState(100); // 0-100
  const [lightness, setLightness] = useState(50); // 0-100
  
  // Color picker dimensions
  const colorPickerSize = width < 768 ? 200 : 280;
  const hueSliderHeight = colorPickerSize;
  
  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number) => {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    
    let r = 0, g = 0, b = 0;
    
    if (0 <= h && h < 1/6) {
      r = c; g = x; b = 0;
    } else if (1/6 <= h && h < 2/6) {
      r = x; g = c; b = 0;
    } else if (2/6 <= h && h < 3/6) {
      r = 0; g = c; b = x;
    } else if (3/6 <= h && h < 4/6) {
      r = 0; g = x; b = c;
    } else if (4/6 <= h && h < 5/6) {
      r = x; g = 0; b = c;
    } else if (5/6 <= h && h < 1) {
      r = c; g = 0; b = x;
    }
    
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);
    
    return "#" + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  };
  
  // Convert hex to HSL
  const hexToHsl = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 100, l: 50 };
    
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };
  
  // Initialize HSL from hex color (only when signatureColor changes externally)
  const isInternalUpdate = useRef(false);
  
  useEffect(() => {
    if (!isInternalUpdate.current) {
      const hsl = hexToHsl(signatureColor);
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
    }
    isInternalUpdate.current = false;
  }, [signatureColor]);
  
  // Update hex color when HSL changes
  useEffect(() => {
    const hex = hslToHex(hue, saturation, lightness);
    isInternalUpdate.current = true;
    setSignatureColor(hex);
  }, [hue, saturation, lightness]);
  
  // Handle color square touch
  const handleColorSquarePress = (e: any) => {
    const layout = (e.nativeEvent.target as any)?.layout || {};
    const x = e.nativeEvent.locationX !== undefined ? e.nativeEvent.locationX : 
              (Platform.OS === 'web' ? ((e.nativeEvent as any).pageX - (e.nativeEvent.target as any)?.offsetLeft) : 0);
    const y = e.nativeEvent.locationY !== undefined ? e.nativeEvent.locationY : 
              (Platform.OS === 'web' ? ((e.nativeEvent as any).pageY - (e.nativeEvent.target as any)?.offsetTop) : 0);
    const width = layout.width || colorPickerSize;
    const height = layout.height || colorPickerSize;
    
    const s = Math.max(0, Math.min(100, (x / width) * 100));
    const l = Math.max(0, Math.min(100, 100 - (y / height) * 100));
    
    setSaturation(s);
    setLightness(l);
  };
  
  // Handle hue slider touch
  const handleHueSliderPress = (e: any) => {
    const layout = (e.nativeEvent.target as any)?.layout || {};
    const y = e.nativeEvent.locationY !== undefined ? e.nativeEvent.locationY : 
              (Platform.OS === 'web' ? ((e.nativeEvent as any).pageY - (e.nativeEvent.target as any)?.offsetTop) : 0);
    const height = layout.height || hueSliderHeight;
    
    const h = Math.max(0, Math.min(360, (y / height) * 360));
    setHue(h);
  };
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const webViewRef = useRef<any>(null);
  const [signatureHtml, setSignatureHtml] = useState('');
  
  // Use refs to store latest style values for access in canvas drawing functions
  const currentColorRef = useRef(signatureColor);
  const currentWidthRef = useRef(signatureWidth);
  
  // Update refs when settings change
  useEffect(() => {
    currentColorRef.current = signatureColor;
    currentWidthRef.current = signatureWidth;
    
    // Also update the canvas element's refs if it exists
    if (Platform.OS === 'web' && canvasRef.current) {
      (canvasRef.current as any).__styleRefs = {
        color: currentColorRef,
        width: currentWidthRef
      };
    }
  }, [signatureColor, signatureWidth]);

  // E-Signature Functions
  const initializeSignatureCanvas = (canvas: HTMLCanvasElement) => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Failed to get canvas context');
      return;
    }

    // Set canvas background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set initial drawing style
    ctx.strokeStyle = signatureColor;
    ctx.lineWidth = signatureWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let lastX = 0;
    let lastY = 0;
    let isDrawing = false;

    const getCoordinates = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ('touches' in e && e.touches.length > 0) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      } else if ('clientX' in e) {
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        };
      }
      return { x: 0, y: 0 };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Always update drawing style before starting to draw (ensures latest color/width)
      // Get the latest values from React refs which are updated when settings change
      const styleRefs = (canvas as any).__styleRefs;
      
      if (styleRefs && styleRefs.color && styleRefs.width) {
        // Use the refs to get the latest values (refs are mutable and always current)
        const currentColor = styleRefs.color.current;
        const currentWidth = styleRefs.width.current;
        
        if (currentColor !== undefined && currentColor !== null) {
          ctx.strokeStyle = currentColor;
        }
        if (currentWidth !== undefined && currentWidth !== null) {
          ctx.lineWidth = currentWidth;
        }
      } else {
        // Fallback: try to get from stored reference
        const currentStyle = (canvas as any).__currentStyle;
        if (currentStyle) {
          ctx.strokeStyle = currentStyle.color || '#000000';
          ctx.lineWidth = currentStyle.width || 3;
        } else {
          // Last resort: use closure values
          ctx.strokeStyle = signatureColor;
          ctx.lineWidth = signatureWidth;
        }
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      isDrawing = true;
      isDrawingRef.current = true;
      const coords = getCoordinates(e);
      lastX = coords.x;
      lastY = coords.y;

      // Start a new path
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      e.stopPropagation();

      const coords = getCoordinates(e);
      const currentX = coords.x;
      const currentY = coords.y;

      ctx.lineTo(currentX, currentY);
      ctx.stroke();

      lastX = currentX;
      lastY = currentY;
    };

    const stopDrawing = () => {
      if (isDrawing) {
        isDrawing = false;
        isDrawingRef.current = false;
        ctx.closePath();
      }
    };

    // Remove all existing listeners first
    const oldListeners = (canvas as any).__signatureListeners;
    if (oldListeners) {
      oldListeners.forEach(({ event, handler, options }: any) => {
        canvas.removeEventListener(event, handler, options);
      });
    }

    // Create new handlers
    const handlers: Array<{ event: string; handler: any; options?: any }> = [];

    // Mouse events
    handlers.push({ event: 'mousedown', handler: startDrawing });
    handlers.push({ event: 'mousemove', handler: draw });
    handlers.push({ event: 'mouseup', handler: stopDrawing });
    handlers.push({ event: 'mouseleave', handler: stopDrawing });
    handlers.push({ event: 'mouseout', handler: stopDrawing });

    // Touch events
    handlers.push({ event: 'touchstart', handler: startDrawing, options: { passive: false } });
    handlers.push({ event: 'touchmove', handler: draw, options: { passive: false } });
    handlers.push({ event: 'touchend', handler: stopDrawing });
    handlers.push({ event: 'touchcancel', handler: stopDrawing });

    // Add all listeners
    handlers.forEach(({ event, handler, options }) => {
      canvas.addEventListener(event, handler, options);
    });

    // Store listeners for cleanup
    (canvas as any).__signatureListeners = handlers;

    // Update drawing style when color/width changes
    const updateDrawingStyle = () => {
      if (ctx) {
        ctx.strokeStyle = signatureColor;
        ctx.lineWidth = signatureWidth;
      }
    };

    // Store update function on canvas for later use
    (canvas as any).updateDrawingStyle = updateDrawingStyle;
    (canvas as any).ctx = ctx;
    
    // Store current style values on canvas for access during drawing
    (canvas as any).__currentStyle = {
      color: signatureColor,
      width: signatureWidth
    };
    
    // Store refs to style values so drawing functions can access latest values
    // Refs are mutable and always have the current values
    (canvas as any).__styleRefs = {
      color: currentColorRef,
      width: currentWidthRef
    };
  };

  // Update canvas drawing style when color/width changes (without reinitializing)
  useEffect(() => {
    if (Platform.OS === 'web' && canvasRef.current && visible) {
      const ctx = (canvasRef.current as any).ctx || canvasRef.current.getContext('2d');
      if (ctx) {
        // Update drawing style immediately with current values
        ctx.strokeStyle = signatureColor;
        ctx.lineWidth = signatureWidth;
        
        // Update stored style values on canvas for access during drawing
        (canvasRef.current as any).__currentStyle = {
          color: signatureColor,
          width: signatureWidth
        };
        
        // Always update the refs on canvas element so drawing functions can access latest values
        (canvasRef.current as any).__styleRefs = {
          color: currentColorRef,
          width: currentWidthRef
        };
        
        // Update the stored updateDrawingStyle function to use current values
        if ((canvasRef.current as any).updateDrawingStyle) {
          (canvasRef.current as any).updateDrawingStyle = () => {
            if (ctx) {
              ctx.strokeStyle = signatureColor;
              ctx.lineWidth = signatureWidth;
            }
          };
        }
      }
    }
    
    // Reinitialize canvas only when landscape mode changes (and modal is visible)
    if (Platform.OS === 'web' && canvasRef.current && visible && isLandscape !== undefined) {
      // Only reinitialize if landscape mode actually changed
      const prevLandscape = (canvasRef.current as any).__lastLandscape;
      if (prevLandscape !== isLandscape && prevLandscape !== undefined) {
        setTimeout(() => {
          if (canvasRef.current) {
            initializeSignatureCanvas(canvasRef.current);
            (canvasRef.current as any).__lastLandscape = isLandscape;
            canvasInitializedRef.current = true;
          }
        }, 100);
      }
    }
  }, [signatureColor, signatureWidth, isLandscape, visible]);

  // Generate HTML for mobile WebView signature canvas
  const generateSignatureHtml = () => {
    const canvasHeight = isLandscape ? 500 : (width < 768 ? 300 : 400);
    const canvasWidth = isLandscape ? 1300 : (width < 768 ? width - 80 : 1100);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #ffffff;
      touch-action: none;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    #canvas {
      display: block;
      width: 100%;
      height: 100%;
      touch-action: none;
      -ms-touch-action: none;
      cursor: crosshair;
      background: #ffffff;
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <script>
    (function() {
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size to match container
      function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        // Redraw background after resize
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      
      // Set initial drawing style
      ctx.strokeStyle = '${signatureColor}';
      ctx.lineWidth = ${signatureWidth};
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      let isDrawing = false;
      let lastX = 0;
      let lastY = 0;
      
      function getTouchCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : null);
        if (touch) {
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
          };
        }
        return null;
      }
      
      function getMouseCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY
        };
      }
      
      function startDrawing(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const coords = e.touches ? getTouchCoordinates(e) : getMouseCoordinates(e);
        if (!coords) return;
        
        isDrawing = true;
        lastX = coords.x;
        lastY = coords.y;
        
        // Start a new path
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
      }
      
      function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();
        e.stopPropagation();
        
        const coords = e.touches ? getTouchCoordinates(e) : getMouseCoordinates(e);
        if (!coords) return;
        
        const currentX = coords.x;
        const currentY = coords.y;
        
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        
        lastX = currentX;
        lastY = currentY;
      }
      
      function stopDrawing(e) {
        if (isDrawing) {
          e.preventDefault();
          e.stopPropagation();
          isDrawing = false;
          ctx.closePath();
        }
      }
      
      // Prevent default touch behaviors
      document.addEventListener('touchstart', function(e) {
        if (e.target === canvas) {
          e.preventDefault();
        }
      }, { passive: false });
      
      document.addEventListener('touchmove', function(e) {
        if (e.target === canvas) {
          e.preventDefault();
        }
      }, { passive: false });
      
      document.addEventListener('touchend', function(e) {
        if (e.target === canvas) {
          e.preventDefault();
        }
      }, { passive: false });
      
      // Mouse events (for testing)
      canvas.addEventListener('mousedown', startDrawing);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDrawing);
      canvas.addEventListener('mouseleave', stopDrawing);
      canvas.addEventListener('mouseout', stopDrawing);
      
      // Touch events - CRITICAL for mobile
      canvas.addEventListener('touchstart', startDrawing, { passive: false });
      canvas.addEventListener('touchmove', draw, { passive: false });
      canvas.addEventListener('touchend', stopDrawing, { passive: false });
      canvas.addEventListener('touchcancel', stopDrawing, { passive: false });
      
      // Listen for messages from React Native
      function handleMessage(event) {
        try {
          let data;
          if (typeof event.data === 'string') {
            data = JSON.parse(event.data);
          } else if (event.data) {
            data = event.data;
          } else {
            return;
          }
          
          if (data.type === 'updateStyle') {
            ctx.strokeStyle = data.color || ctx.strokeStyle;
            ctx.lineWidth = data.width || ctx.lineWidth;
          }
          if (data.type === 'clear') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          if (data.type === 'getImage') {
            const imageData = canvas.toDataURL('image/png');
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'signatureImage',
                data: imageData
              }));
            }
          }
        } catch (e) {
          console.error('Error handling message:', e);
        }
      }
      
      // Listen for messages from React Native WebView
      if (window.ReactNativeWebView) {
        document.addEventListener('message', handleMessage);
      }
      window.addEventListener('message', handleMessage);
      
      // Initial clear
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    })();
  </script>
</body>
</html>
    `;
  };

  // Track if canvas has been initialized to prevent reinitialization when settings modal closes
  const canvasInitializedRef = useRef(false);
  
  // Reinitialize canvas when modal opens (only once, not when view modal toggles)
  useEffect(() => {
    if (visible && !showViewSignature) {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        // Only initialize if not already initialized or if landscape mode changed
        const shouldInitialize = !canvasInitializedRef.current || 
                                (canvasRef.current && (canvasRef.current as any).__lastLandscape !== isLandscape);
        
        if (shouldInitialize) {
          // Small delay to ensure DOM is ready
          const timer = setTimeout(() => {
            if (canvasRef.current) {
              initializeSignatureCanvas(canvasRef.current);
              canvasInitializedRef.current = true;
              (canvasRef.current as any).__lastLandscape = isLandscape;
            }
          }, 200);

          return () => clearTimeout(timer);
        }
      } else if (Platform.OS !== 'web') {
        // Generate HTML for mobile (only if not already generated or landscape changed)
        if (!canvasInitializedRef.current || (canvasRef.current && (canvasRef.current as any).__lastLandscape !== isLandscape)) {
          setSignatureHtml(generateSignatureHtml());
          canvasInitializedRef.current = true;
          if (canvasRef.current) {
            (canvasRef.current as any).__lastLandscape = isLandscape;
          }
        }
      }
    }
  }, [visible, showViewSignature, isLandscape]);
  
  // Reset initialization flag when modal closes completely
  useEffect(() => {
    if (!visible) {
      canvasInitializedRef.current = false;
    }
  }, [visible]);

  // Update WebView style when color/width changes
  useEffect(() => {
    if (Platform.OS !== 'web' && webViewRef.current && signatureHtml) {
      const message = JSON.stringify({
        type: 'updateStyle',
        color: signatureColor,
        width: signatureWidth,
      });
      webViewRef.current.postMessage(message);
    }
  }, [signatureColor, signatureWidth, signatureHtml]);

  const clearSignature = () => {
    if (Platform.OS === 'web' && canvasRef.current) {
      const ctx = (canvasRef.current as any).ctx || canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    } else if (Platform.OS !== 'web' && webViewRef.current) {
      const message = JSON.stringify({ type: 'clear' });
      webViewRef.current.postMessage(message);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'signatureImage') {
        await saveSignatureFromBase64(data.data);
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  const saveSignatureFromBase64 = async (base64Data: string) => {
    try {
      if (Platform.OS === 'web') {
        // Web: Convert base64 to blob then to file
        const response = await fetch(base64Data);
        const blob = await response.blob();

        // Convert blob to file for upload
        const file = new File([blob], `signature-${userId}.png`, { type: 'image/png' });

        // Upload to Cloudinary
        const uploadResult = await CloudinaryService.uploadImage(
          file,
          'internship-avatars/signatures',
          {
            transformation: isLandscape ? 'w_1300,h_500,c_pad,q_auto,f_auto' : 'w_1100,h_400,c_pad,q_auto,f_auto'
          }
        );

        await handleSignatureUploadResult(uploadResult);
      } else {
        // Mobile: Upload base64 directly to Cloudinary
        await uploadSignatureFromBase64Mobile(base64Data);
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      Alert.alert('Error', 'Failed to save signature. Please try again.');
    }
  };

  const uploadSignatureFromBase64Mobile = async (base64Data: string) => {
    try {
      // Extract base64 string from data URI (remove data:image/png;base64, prefix)
      const base64String = base64Data.includes(',')
        ? base64Data.split(',')[1]
        : base64Data;

      // Create form data for Cloudinary upload
      const formData = new FormData();
      formData.append('file', `data:image/png;base64,${base64String}`);
      formData.append('cloud_name', 'dxrj2nmvv');
      formData.append('api_key', '521782871565753');
      formData.append('upload_preset', 'ml_default');
      formData.append('folder', 'internship-avatars/signatures');

      // Upload to Cloudinary
      const response = await fetch('https://api.cloudinary.com/v1_1/dxrj2nmvv/image/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Upload failed');
      }

      const uploadResult = {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      };

      await handleSignatureUploadResult(uploadResult);
    } catch (error) {
      console.error('❌ Failed to upload signature to Cloudinary:', error);
      Alert.alert('Upload Failed', error instanceof Error ? error.message : 'Failed to upload signature to Cloudinary.');
    }
  };

  const handleSignatureUploadResult = async (uploadResult: { success: boolean; url?: string; error?: string }) => {
    if (uploadResult.success && uploadResult.url) {
      // Preserve signature URL locally immediately
      setPreservedSignature(uploadResult.url);

      // Save signature URL to user profile in database
      // Try both 'signature' and 'esignature' field names to ensure compatibility
      const updateData: any = {
        signature: uploadResult.url,
        esignature: uploadResult.url, // Try alternative field name
      };
      
      const response = await apiService.updateProfile(userId, updateData);

      if (response.success) {
        // Call onSaveSuccess which will handle closing the modal and showing success modal in ProfilePage
        if (onSaveSuccess) {
          onSaveSuccess(uploadResult.url);
        } else {
          // If no callback, just close the modal
          onClose();
        }
      } else {
        console.error('❌ Failed to save signature to database:', response.message);
        console.error('❌ Full response:', response);
        Alert.alert('Error', response.message || 'Failed to save signature to database.');
      }
    } else {
      console.error('❌ Failed to upload signature to Cloudinary:', uploadResult.error);
      Alert.alert('Upload Failed', uploadResult.error || 'Failed to upload signature to Cloudinary.');
    }
  };

  const saveSignature = async () => {
    if (Platform.OS === 'web' && canvasRef.current) {
      try {
        // Convert canvas to blob
        canvasRef.current.toBlob(async (blob) => {
          if (!blob) {
            Alert.alert('Error', 'Failed to generate signature image.');
            return;
          }

          // Convert blob to file for upload
          const file = new File([blob], `signature-${userId}.png`, { type: 'image/png' });

          // Upload to Cloudinary
          const uploadResult = await CloudinaryService.uploadImage(
            file,
            'internship-avatars/signatures',
            {
              transformation: isLandscape ? 'w_1300,h_500,c_pad,q_auto,f_auto' : 'w_1100,h_400,c_pad,q_auto,f_auto'
            }
          );

          await handleSignatureUploadResult(uploadResult);
        }, 'image/png');
      } catch (error) {
        console.error('Error saving signature:', error);
        Alert.alert('Error', 'Failed to save signature. Please try again.');
      }
    } else if (Platform.OS !== 'web' && webViewRef.current) {
      // Request image from WebView
      const message = JSON.stringify({ type: 'getImage' });
      webViewRef.current.postMessage(message);
    }
  };

  return (
    <>
      <Modal
        visible={visible && !showViewSignature}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.signatureModalOverlay}>
          <ScrollView
            style={styles.signatureModalScrollView}
            contentContainerStyle={styles.signatureModalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.signatureModalContent}>
              <View style={styles.signatureModalHeader}>
                <View style={styles.headerLeftSection}>
                  <MaterialIcons name="gesture" size={24} color="#F56E0F" />
                  <Text style={styles.signatureModalTitle} numberOfLines={1}>
                    E-Signature
                  </Text>
                </View>
                <View style={styles.signatureHeaderButtons}>
                  <TouchableOpacity
                    style={styles.landscapeButton}
                    onPress={() => setIsLandscape(!isLandscape)}
                  >
                    <MaterialIcons
                      name={isLandscape ? "portrait" : "screen-rotation"}
                      size={18}
                      color="#FBFBFB"
                    />
                    <Text style={styles.landscapeButtonText} numberOfLines={1}>
                      {isLandscape ? 'Portrait' : 'Landscape'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeSignatureModalButton}
                    onPress={onClose}
                  >
                    <MaterialIcons name="close" size={24} color="#FBFBFB" />
                  </TouchableOpacity>
                </View>
              </View>


              {/* Canvas Section */}
              <View style={styles.canvasSection}>
                <Text style={styles.canvasSectionLabel}>Draw your signature</Text>
                <View style={[styles.signatureContainer, isLandscape && styles.signatureContainerLandscape]}>
                {Platform.OS === 'web' && typeof document !== 'undefined' ? (
                  React.createElement('canvas', {
                    ref: (node: HTMLCanvasElement | null) => {
                      if (node && node !== canvasRef.current) {
                        const wasInitialized = canvasInitializedRef.current;
                        canvasRef.current = node;
                        // Only initialize if not already initialized (prevents reinitialization when modal toggles)
                        if (!wasInitialized) {
                          setTimeout(() => {
                            if (canvasRef.current === node && !canvasInitializedRef.current) {
                              initializeSignatureCanvas(node);
                              canvasInitializedRef.current = true;
                            }
                          }, 50);
                        } else {
                          // If already initialized, just update the refs and context
                          const ctx = node.getContext('2d');
                          if (ctx) {
                            ctx.strokeStyle = signatureColor;
                            ctx.lineWidth = signatureWidth;
                            (node as any).ctx = ctx;
                            (node as any).__currentStyle = {
                              color: signatureColor,
                              width: signatureWidth
                            };
                            (node as any).__styleRefs = {
                              color: currentColorRef,
                              width: currentWidthRef
                            };
                          }
                        }
                      }
                    },
                    style: {
                      width: '100%',
                      maxWidth: isLandscape ? 1300 : width < 768 ? width - 80 : 1100,
                      height: isLandscape ? 500 : width < 768 ? 300 : 400,
                      backgroundColor: '#ffffff',
                      borderRadius: 12,
                      border: '2px solid #F56E0F',
                      cursor: 'crosshair',
                      touchAction: 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      display: 'block',
                      boxShadow: '0 2px 8px rgba(245, 110, 15, 0.1)',
                    },
                    width: isLandscape ? 1300 : width < 768 ? width - 80 : 1100,
                    height: isLandscape ? 500 : width < 768 ? 300 : 400,
                  } as any)
                ) : (
                  <View style={[styles.signatureWebViewContainer, isLandscape && styles.signatureWebViewContainerLandscape]}>
                    <WebView
                      ref={webViewRef}
                      source={{ html: signatureHtml }}
                      style={[styles.signatureWebView, isLandscape && styles.signatureWebViewLandscape]}
                      javaScriptEnabled={true}
                      domStorageEnabled={true}
                      startInLoadingState={true}
                      allowsInlineMediaPlayback={true}
                      mediaPlaybackRequiresUserAction={false}
                      originWhitelist={['*']}
                      mixedContentMode="always"
                      allowFileAccess={true}
                      allowFileAccessFromFileURLs={true}
                      allowUniversalAccessFromFileURLs={true}
                      onMessage={handleWebViewMessage}
                      scrollEnabled={false}
                      bounces={false}
                      showsHorizontalScrollIndicator={false}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={false}
                      overScrollMode="never"
                      androidHardwareAccelerationDisabled={false}
                      androidLayerType="hardware"
                      renderLoading={() => (
                        <View style={styles.webViewLoadingContainer}>
                          <ActivityIndicator size="large" color="#F56E0F" />
                          <Text style={styles.webViewLoadingText}>Loading canvas...</Text>
                        </View>
                      )}
                    />
                  </View>
                )}
                </View>
              </View>

              <View style={styles.signatureModalFooter}>
                {activeSignature && activeSignature.trim() !== '' && (
                  <TouchableOpacity
                    style={styles.viewCurrentSignatureButton}
                    onPress={() => {
                      setShowViewSignature(true);
                    }}
                  >
                    <MaterialIcons name="visibility" size={20} color="#FBFBFB" />
                    <Text style={styles.viewCurrentSignatureButtonText}>View Current</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.clearSignatureButton}
                  onPress={clearSignature}
                >
                  <MaterialIcons name="clear" size={20} color="#FBFBFB" />
                  <Text style={styles.clearSignatureButtonText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveSignatureButton}
                  onPress={saveSignature}
                >
                  <MaterialIcons name="check" size={20} color="#fff" />
                  <Text style={styles.saveSignatureButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* View Signature Modal */}
      <Modal
        visible={showViewSignature}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowViewSignature(false)}
      >
        <View style={styles.viewSignatureOverlay}>
          <View style={styles.viewSignatureContent}>
            <View style={styles.viewSignatureHeader}>
              <Text style={styles.viewSignatureTitle}>Current Signature</Text>
              <TouchableOpacity
                style={styles.closeViewSignatureButton}
                onPress={() => setShowViewSignature(false)}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {activeSignature && activeSignature.trim() !== '' ? (
              <ScrollView
                contentContainerStyle={styles.viewSignatureImageContainer}
                showsVerticalScrollIndicator={true}
              >
                <Image
                  source={{ uri: activeSignature }}
                  style={styles.viewSignatureImage}
                  resizeMode="contain"
                  onError={(error) => {
                    Alert.alert('Error', 'Failed to load signature image. Please try again.');
                  }}
                />
              </ScrollView>
            ) : (
              <View style={styles.noSignatureContainer}>
                <MaterialIcons name="gesture" size={64} color="#F56E0F" />
                <Text style={styles.noSignatureText}>No signature found</Text>
                <Text style={styles.noSignatureSubtext}>Draw a new signature to get started</Text>
              </View>
            )}
            <View style={styles.viewSignatureFooter}>
              <TouchableOpacity
                style={styles.closeViewSignatureFooterButton}
                onPress={() => {
                  setShowViewSignature(false);
                }}
              >
                <MaterialIcons name="close" size={20} color="#fff" />
                <Text style={styles.closeViewSignatureFooterButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </>
  );
}

const styles = StyleSheet.create({
  signatureModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: width < 768 ? 16 : 20,
    width: '100%',
  },
  signatureModalScrollView: {
    width: '100%',
    maxWidth: width < 768 ? width - 32 : 2000,
    alignSelf: 'center',
  },
  signatureModalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: width < 768 ? width - 32 : 2000,
    alignSelf: 'center',
  },
  signatureModalContent: {
    backgroundColor: '#1B1B1E',
    borderRadius: width < 768 ? 16 : 20,
    width: width < 768 ? width - 32 : Math.min(2000, width),
    maxWidth: width < 768 ? width - 32 : 2000,
    maxHeight: '95%',
    alignSelf: 'center',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  signatureModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: width < 768 ? 20 : 28,
    paddingVertical: width < 768 ? 18 : 22,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.3)',
    backgroundColor: '#2A2A2E',
    borderTopLeftRadius: width < 768 ? 16 : 20,
    borderTopRightRadius: width < 768 ? 16 : 20,
    minHeight: width < 768 ? 56 : 64,
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    flexShrink: 1,
  },
  signatureModalTitle: {
    fontSize: width < 768 ? 20 : 22,
    fontWeight: '700',
    color: '#FBFBFB',
    letterSpacing: 0.5,
  },
  signatureHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  landscapeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F56E0F',
    gap: 6,
    minWidth: 100,
  },
  landscapeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FBFBFB',
  },
  closeSignatureModalButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    marginLeft: 4,
  },
  settingsMenuContainer: {
    backgroundColor: '#2A2A2E',
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 110, 15, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.3)',
  },
  settingsMenuContent: {
    paddingHorizontal: width < 768 ? 20 : 28,
    paddingTop: width < 768 ? 20 : 24,
    paddingBottom: width < 768 ? 16 : 20,
  },
  settingsMenuTitle: {
    fontSize: width < 768 ? 13 : 14,
    fontWeight: '700',
    color: '#F56E0F',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  canvasSection: {
    paddingHorizontal: width < 768 ? 20 : 28,
    paddingTop: width < 768 ? 20 : 24,
    paddingBottom: width < 768 ? 16 : 20,
    backgroundColor: '#1B1B1E',
  },
  canvasSectionLabel: {
    fontSize: width < 768 ? 13 : 14,
    fontWeight: '700',
    color: '#F56E0F',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  signatureContainer: {
    width: '100%',
    padding: width < 768 ? 12 : 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    minHeight: width < 768 ? 320 : 420,
  },
  signatureContainerLandscape: {
    width: '100%',
    padding: width < 768 ? 10 : 14,
    minHeight: width < 768 ? 400 : 520,
  },
  signatureWebViewContainer: {
    width: '100%',
    maxWidth: width < 768 ? width - 80 : 1100,
    height: width < 768 ? 300 : 400,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F56E0F',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  signatureWebViewContainerLandscape: {
    maxWidth: width < 768 ? width - 80 : 1300,
    height: width < 768 ? 380 : 500,
  },
  signatureWebView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
  },
  signatureWebViewLandscape: {
    width: '100%',
    height: '100%',
  },
  webViewLoadingContainer: {
    width: '100%',
    height: width < 768 ? 300 : 400,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  webViewLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#F56E0F',
    fontWeight: '500',
  },
  signatureControls: {
    paddingHorizontal: width < 768 ? 20 : 28,
    paddingTop: width < 768 ? 20 : 24,
    paddingBottom: width < 768 ? 16 : 20,
    backgroundColor: '#2A2A2E',
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 110, 15, 0.3)',
  },
  controlsSectionLabel: {
    fontSize: width < 768 ? 13 : 14,
    fontWeight: '700',
    color: '#F56E0F',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  signatureControlGroup: {
    marginBottom: width < 768 ? 16 : 18,
  },
  controlLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  signatureControlLabel: {
    fontSize: width < 768 ? 14 : 13,
    fontWeight: '600',
    color: '#FBFBFB',
    marginBottom: 10,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#F56E0F',
  },
  hexColorText: {
    fontSize: width < 768 ? 12 : 11,
    fontWeight: '600',
    color: '#F56E0F',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'monospace',
  },
  visualColorPickerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 12,
  },
  colorSquareContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  colorSquare: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  colorSelector: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FBFBFB',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  hueSliderContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  hueSlider: {
    width: 24,
    position: 'relative',
    borderRadius: 10,
  },
  hueSelector: {
    position: 'absolute',
    left: -4,
    right: -4,
    height: 4,
    backgroundColor: '#FBFBFB',
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#F56E0F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  colorPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: width < 768 ? 14 : 13,
    color: '#FBFBFB',
    backgroundColor: '#1B1B1E',
    minHeight: 36,
  },
  sliderContainer: {
    flex: 1,
    minHeight: 8,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#1B1B1E',
    borderRadius: 4,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#F56E0F',
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderHandle: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FBFBFB',
    borderWidth: 2,
    borderColor: '#F56E0F',
    transform: [{ translateX: -10 }],
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderInput: {
    width: 70,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: width < 768 ? 14 : 13,
    color: '#FBFBFB',
    backgroundColor: '#1B1B1E',
    textAlign: 'center',
    fontWeight: '600',
    minHeight: 40,
  },
  signatureModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: width < 768 ? 20 : 28,
    paddingVertical: width < 768 ? 20 : 24,
    gap: width < 768 ? 12 : 16,
    backgroundColor: '#2A2A2E',
    borderBottomLeftRadius: width < 768 ? 16 : 20,
    borderBottomRightRadius: width < 768 ? 16 : 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 110, 15, 0.3)',
  },
  clearSignatureButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: width < 768 ? 12 : 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 110, 15, 0.3)',
    backgroundColor: '#1B1B1E',
    gap: 6,
    minHeight: width < 768 ? 44 : 42,
  },
  clearSignatureButtonText: {
    fontSize: width < 768 ? 14 : 13,
    color: '#FBFBFB',
    fontWeight: '600',
  },
  viewCurrentSignatureButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: width < 768 ? 12 : 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(66, 133, 244, 0.5)',
    backgroundColor: '#4285f4',
    gap: 6,
    minHeight: width < 768 ? 44 : 42,
  },
  viewCurrentSignatureButtonText: {
    fontSize: width < 768 ? 14 : 13,
    color: '#FBFBFB',
    fontWeight: '600',
  },
  saveSignatureButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: width < 768 ? 12 : 12,
    borderRadius: 10,
    backgroundColor: '#F56E0F',
    gap: 6,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minHeight: width < 768 ? 44 : 42,
  },
  saveSignatureButtonText: {
    fontSize: width < 768 ? 14 : 13,
    color: '#fff',
    fontWeight: '600',
  },
  // View Signature Modal Styles
  viewSignatureOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: width < 768 ? 16 : 20,
  },
  viewSignatureContent: {
    backgroundColor: '#1B1B1E',
    borderRadius: width < 768 ? 16 : 20,
    width: '100%',
    maxWidth: width < 768 ? width - 32 : 800,
    maxHeight: '90%',
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  viewSignatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: width < 768 ? 20 : 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 110, 15, 0.3)',
    backgroundColor: '#2A2A2E',
    borderTopLeftRadius: width < 768 ? 16 : 20,
    borderTopRightRadius: width < 768 ? 16 : 20,
  },
  viewSignatureTitle: {
    fontSize: width < 768 ? 18 : 22,
    fontWeight: 'bold',
    color: '#FBFBFB',
  },
  closeViewSignatureButton: {
    padding: 4,
  },
  viewSignatureImageContainer: {
    padding: width < 768 ? 16 : 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  viewSignatureImage: {
    width: '100%',
    minHeight: 300,
    maxHeight: 600,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    aspectRatio: 2,
  },
  noSignatureContainer: {
    padding: width < 768 ? 40 : 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noSignatureText: {
    fontSize: width < 768 ? 18 : 20,
    color: '#FBFBFB',
    marginTop: 16,
    fontWeight: '600',
  },
  noSignatureSubtext: {
    fontSize: width < 768 ? 14 : 16,
    color: '#F56E0F',
    marginTop: 8,
    textAlign: 'center',
  },
  viewSignatureFooter: {
    padding: width < 768 ? 20 : 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(245, 110, 15, 0.3)',
    backgroundColor: '#2A2A2E',
    borderBottomLeftRadius: width < 768 ? 16 : 20,
    borderBottomRightRadius: width < 768 ? 16 : 20,
  },
  closeViewSignatureFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: width < 768 ? 16 : 14,
    borderRadius: 12,
    backgroundColor: '#F56E0F',
    gap: 8,
    shadowColor: '#F56E0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minHeight: width < 768 ? 52 : 48,
  },
  closeViewSignatureFooterButtonText: {
    fontSize: width < 768 ? 16 : 14,
    color: '#fff',
    fontWeight: '600',
  },
});

