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

const WebGLVideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
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
      // Explicitly cast to WebGLRenderingContext to avoid TypeScript errors
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        console.warn('WebGL not supported, falling back to Canvas 2D');
        setUseWebGL(false);
        return;
      }
      
      // Store the WebGL context
      glRef.current = gl as WebGLRenderingContext;
      const gl2 = glRef.current;
      
      // Create shaders
      const vertexShader = gl2.createShader(gl2.VERTEX_SHADER);
      const fragmentShader = gl2.createShader(gl2.FRAGMENT_SHADER);
      
      if (!vertexShader || !fragmentShader) {
        throw new Error('Could not create shaders');
      }
      
      gl2.shaderSource(vertexShader, vertexShaderSource);
      gl2.shaderSource(fragmentShader, fragmentShaderSource);
      
      gl2.compileShader(vertexShader);
      if (!gl2.getShaderParameter(vertexShader, gl2.COMPILE_STATUS)) {
        throw new Error('Vertex shader compilation failed: ' + gl2.getShaderInfoLog(vertexShader));
      }
      
      gl2.compileShader(fragmentShader);
      if (!gl2.getShaderParameter(fragmentShader, gl2.COMPILE_STATUS)) {
        throw new Error('Fragment shader compilation failed: ' + gl2.getShaderInfoLog(fragmentShader));
      }
      
      // Create program
      const program = gl2.createProgram();
      if (!program) {
        throw new Error('Could not create program');
      }
      
      gl2.attachShader(program, vertexShader);
      gl2.attachShader(program, fragmentShader);
      gl2.linkProgram(program);
      
      if (!gl2.getProgramParameter(program, gl2.LINK_STATUS)) {
        throw new Error('Program linking failed: ' + gl2.getProgramInfoLog(program));
      }
      
      programRef.current = program;
      
      // Create texture
      const texture = gl2.createTexture();
      if (!texture) {
        throw new Error('Could not create texture');
      }
      
      gl2.bindTexture(gl2.TEXTURE_2D, texture);
      gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_S, gl2.CLAMP_TO_EDGE);
      gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_WRAP_T, gl2.CLAMP_TO_EDGE);
      gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_MIN_FILTER, gl2.LINEAR);
      gl2.texParameteri(gl2.TEXTURE_2D, gl2.TEXTURE_MAG_FILTER, gl2.LINEAR);
      
      textureRef.current = texture;
      
      // Set up position buffer
      const positionBuffer = gl2.createBuffer();
      gl2.bindBuffer(gl2.ARRAY_BUFFER, positionBuffer);
      gl2.bufferData(gl2.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0
      ]), gl2.STATIC_DRAW);
      
      // Set up texture coordinate buffer
      const texCoordBuffer = gl2.createBuffer();
      gl2.bindBuffer(gl2.ARRAY_BUFFER, texCoordBuffer);
      gl2.bufferData(gl2.ARRAY_BUFFER, new Float32Array([
        0.0, 1.0, // bottom-left corner
        1.0, 1.0, // bottom-right corner
        0.0, 0.0, // top-left corner
        1.0, 0.0  // top-right corner
      ]), gl2.STATIC_DRAW);
      
      // Store attribute locations
      const positionLocation = gl2.getAttribLocation(program, 'a_position');
      const texCoordLocation = gl2.getAttribLocation(program, 'a_texCoord');
      
      // Set up position attribute
      gl2.bindBuffer(gl2.ARRAY_BUFFER, positionBuffer);
      gl2.enableVertexAttribArray(positionLocation);
      gl2.vertexAttribPointer(positionLocation, 2, gl2.FLOAT, false, 0, 0);
      
      // Set up texture coordinate attribute
      gl2.bindBuffer(gl2.ARRAY_BUFFER, texCoordBuffer);
      gl2.enableVertexAttribArray(texCoordLocation);
      gl2.vertexAttribPointer(texCoordLocation, 2, gl2.FLOAT, false, 0, 0);
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
          const gl = glRef.current;
          
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          
          gl.useProgram(programRef.current);
          gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
          
          // Update texture with new video frame
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
          
          // Draw the rectangle (2 triangles)
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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

export default WebGLVideoPlayer;
