import { useEffect, useRef, useState } from 'react';
import './VideoPlayer.css';
import VideoControls from './VideoControls.tsx';
import VideoOverlay from './VideoOverlay.tsx';

interface VideoPlayerProps {
  videoUrl: string;
}

// WebGL shader code
const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0, 1);
    v_texCoord = a_texCoord;
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  uniform sampler2D u_image;
  varying vec2 v_texCoord;

  void main() {
    gl_FragColor = texture2D(u_image, v_texCoord);
  }
`;

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useWebGL, setUseWebGL] = useState(true);
  
  // Initialize WebGL
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;
    
    // Try to initialize WebGL
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.warn('WebGL not supported, falling back to Canvas 2D');
        setUseWebGL(false);
        return;
      }
      // Explicitly cast to WebGLRenderingContext for TypeScript
      const webgl = gl as WebGLRenderingContext;
      glRef.current = webgl;
      
      // Create shaders
      const vertexShader = webgl.createShader(webgl.VERTEX_SHADER);
      const fragmentShader = webgl.createShader(webgl.FRAGMENT_SHADER);
      
      if (!vertexShader || !fragmentShader) {
        throw new Error('Could not create shaders');
      }
      
      webgl.shaderSource(vertexShader, vertexShaderSource);
      webgl.shaderSource(fragmentShader, fragmentShaderSource);
      
      webgl.compileShader(vertexShader);
      if (!webgl.getShaderParameter(vertexShader, webgl.COMPILE_STATUS)) {
        throw new Error('Vertex shader compilation failed: ' + webgl.getShaderInfoLog(vertexShader));
      }
      
      webgl.compileShader(fragmentShader);
      if (!webgl.getShaderParameter(fragmentShader, webgl.COMPILE_STATUS)) {
        throw new Error('Fragment shader compilation failed: ' + webgl.getShaderInfoLog(fragmentShader));
      }
      
      // Create program
      const program = webgl.createProgram();
      if (!program) {
        throw new Error('Could not create program');
      }
      
      webgl.attachShader(program, vertexShader);
      webgl.attachShader(program, fragmentShader);
      webgl.linkProgram(program);
      
      if (!webgl.getProgramParameter(program, webgl.LINK_STATUS)) {
        throw new Error('Program linking failed: ' + webgl.getProgramInfoLog(program));
      }
      
      programRef.current = program;
      
      // Create texture
      const texture = webgl.createTexture();
      if (!texture) {
        throw new Error('Could not create texture');
      }
      
      webgl.bindTexture(webgl.TEXTURE_2D, texture);
      webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_S, webgl.CLAMP_TO_EDGE);
      webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_WRAP_T, webgl.CLAMP_TO_EDGE);
      webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MIN_FILTER, webgl.LINEAR);
      webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MAG_FILTER, webgl.LINEAR);
      
      textureRef.current = texture;
      
      // Set up position buffer
      const positionBuffer = webgl.createBuffer();
      webgl.bindBuffer(webgl.ARRAY_BUFFER, positionBuffer);
      webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0
      ]), webgl.STATIC_DRAW);
      
      // Set up texture coordinate buffer
      const texCoordBuffer = webgl.createBuffer();
      webgl.bindBuffer(webgl.ARRAY_BUFFER, texCoordBuffer);
      webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array([
        0.0, 1.0,
        1.0, 1.0,
        0.0, 0.0,
        1.0, 0.0
      ]), webgl.STATIC_DRAW);
      
      // Store attribute locations
      const positionLocation = webgl.getAttribLocation(program, 'a_position');
      const texCoordLocation = webgl.getAttribLocation(program, 'a_texCoord');
      
      // Set up position attribute
      webgl.bindBuffer(webgl.ARRAY_BUFFER, positionBuffer);
      webgl.enableVertexAttribArray(positionLocation);
      webgl.vertexAttribPointer(positionLocation, 2, webgl.FLOAT, false, 0, 0);
      
      // Set up texture coordinate attribute
      webgl.bindBuffer(webgl.ARRAY_BUFFER, texCoordBuffer);
      webgl.enableVertexAttribArray(texCoordLocation);
      webgl.vertexAttribPointer(texCoordLocation, 2, webgl.FLOAT, false, 0, 0);
    } catch (err) {
      console.error('WebGL initialization failed:', err);
      setUseWebGL(false);
    }
    
    return () => {
      // Clean up WebGL resources
      const gl = glRef.current;
      if (gl && programRef.current) {
        gl.deleteProgram(programRef.current);
      }
      if (gl && textureRef.current) {
        gl.deleteTexture(textureRef.current);
      }
    };
  }, []);
  
  // Initialize video and canvas
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;
    
    // Set up event listeners
    video.addEventListener('loadedmetadata', () => {
      setDuration(video.duration);
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      setIsLoading(false);
    });
    
    video.addEventListener('timeupdate', () => {
      setCurrentTime(video.currentTime);
    });
    
    video.addEventListener('ended', () => {
      setIsPlaying(false);
    });
    
    video.addEventListener('error', () => {
      setError('Error loading video. Please try again.');
      setIsLoading(false);
    });
    
    video.addEventListener('waiting', () => {
      setIsLoading(true);
    });
    
    video.addEventListener('canplay', () => {
      setIsLoading(false);
    });
    
    // Clean up event listeners
    return () => {
      cancelAnimationFrame(animationRef.current);
      
      video.removeEventListener('loadedmetadata', () => {});
      video.removeEventListener('timeupdate', () => {});
      video.removeEventListener('ended', () => {});
      video.removeEventListener('error', () => {});
      video.removeEventListener('waiting', () => {});
      video.removeEventListener('canplay', () => {});
    };
  }, []);
  
  // Render video to canvas (WebGL or 2D context)
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;
    
    const renderFrame = () => {
      if (video.paused || video.ended) return;
      
      if (useWebGL && glRef.current && programRef.current && textureRef.current) {
        // WebGL rendering
        try {
          const webgl = glRef.current as WebGLRenderingContext;
          
          webgl.viewport(0, 0, canvas.width, canvas.height);
          webgl.clearColor(0, 0, 0, 0);
          webgl.clear(webgl.COLOR_BUFFER_BIT);
          
          webgl.useProgram(programRef.current);
          webgl.bindTexture(webgl.TEXTURE_2D, textureRef.current);
          
          // Update texture with new video frame
          webgl.texImage2D(webgl.TEXTURE_2D, 0, webgl.RGBA, webgl.RGBA, webgl.UNSIGNED_BYTE, video);
          
          // Draw the rectangle (2 triangles)
          webgl.drawArrays(webgl.TRIANGLE_STRIP, 0, 4);
        } catch (err) {
          console.error('WebGL rendering error:', err);
          // Fall back to Canvas 2D on error
          setUseWebGL(false);
          
          // Render this frame with Canvas 2D
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
        }
      } else {
        // Fallback to Canvas 2D rendering
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
      }
      
      animationRef.current = requestAnimationFrame(renderFrame);
    };
    
    if (isPlaying) {
      renderFrame();
    }
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, useWebGL]);
  
  // Play/Pause toggle
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(err => {
        setError(`Error playing video: ${err.message}`);
      });
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // Mute toggle
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };
  
  // Seek functionality
  const handleSeek = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = value;
    setCurrentTime(value);
  };
  
  // Fullscreen toggle
  const toggleFullscreen = () => {
    const container = document.querySelector('.video-player-container');
    if (!container) return;
    
    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    
    setIsFullscreen(!isFullscreen);
  };
  
  // Retry on error
  const handleRetry = () => {
    const video = videoRef.current;
    if (!video) return;
    
    setError(null);
    setIsLoading(true);
    video.load();
    video.play().catch(err => {
      setError(`Error playing video: ${err.message}`);
    });
    setIsPlaying(true);
  };
  
  return (
    <div className="video-player-container">
      {/* Hidden video element for loading the video */}
      <video 
        ref={videoRef} 
        src={videoUrl} 
        style={{ display: 'none' }} 
        preload="auto"
        crossOrigin="anonymous"
      />
      
      {/* Canvas element for rendering the video */}
      <canvas 
        ref={canvasRef} 
        className="video-canvas"
        onClick={togglePlay}
      />
      
      {/* Overlay UI */}
      <VideoOverlay 
        isPlaying={isPlaying}
        isLoading={isLoading}
        error={error}
        onRetry={handleRetry}
        onPlayClick={togglePlay}
      />
      
      {/* Video controls */}
      <VideoControls 
        isPlaying={isPlaying}
        isMuted={isMuted}
        duration={duration}
        currentTime={currentTime}
        isFullscreen={isFullscreen}
        onPlayPause={togglePlay}
        onMute={toggleMute}
        onSeek={handleSeek}
        onFullscreen={toggleFullscreen}
      />
    </div>
  );
};

export default VideoPlayer;
