import { useState } from 'react';
import CanvasVideoPlayer from './CanvasVideoPlayer';
import WebGLVideoPlayer from './WebGLVideoPlayer';
import './VideoPlayer.css';

interface VideoPlayerProps {
  videoUrl: string;
}

const SwitchableVideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
  const [renderingMode, setRenderingMode] = useState<'canvas' | 'webgl'>('webgl');

  const toggleRenderingMode = () => {
    setRenderingMode(prev => prev === 'canvas' ? 'webgl' : 'canvas');
  };

  return (
    <div className="video-player-wrapper">
      <div className="rendering-mode-toggle">
        <button 
          onClick={toggleRenderingMode}
          className="mode-button"
        >
          {renderingMode === 'canvas' ? 'Using Canvas 2D' : 'Using WebGL'} (Click to toggle)
        </button>
      </div>

      {renderingMode === 'canvas' ? (
        <CanvasVideoPlayer videoUrl={videoUrl} />
      ) : (
        <WebGLVideoPlayer videoUrl={videoUrl} />
      )}
    </div>
  );
};

export default SwitchableVideoPlayer;
