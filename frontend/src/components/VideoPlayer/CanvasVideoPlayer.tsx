import { useEffect, useRef, useState } from 'react';
import './VideoPlayer.css';
import VideoControls from './VideoControls.tsx';
import VideoOverlay from './VideoOverlay.tsx';

interface VideoPlayerProps {
  videoUrl: string;
}

const CanvasVideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
  
  // Render video to canvas using Canvas 2D API
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const renderFrame = () => {
      if (video.paused || video.ended) return;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      animationRef.current = requestAnimationFrame(renderFrame);
    };
    
    if (isPlaying) {
      renderFrame();
    }
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);
  
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

export default CanvasVideoPlayer;
