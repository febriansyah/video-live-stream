import React from "react";
import "./VideoPlayer.css";

interface VideoOverlayProps {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onPlayClick: () => void;
}

const VideoOverlay: React.FC<VideoOverlayProps> = ({
  isPlaying,
  isLoading,
  error,
  onRetry,
  onPlayClick,
}) => {
  // Get current timestamp
  const timestamp = new Date().toLocaleTimeString();

  return (
    <div
      className={`video-overlay ${
        !isPlaying && !isLoading && !error ? "show" : ""
      }`}
    >
      {/* Watermark */}
      <div className="watermark">MyStream Watermark</div>

      {/* Timestamp */}
      <div className="timestamp">{timestamp}</div>

      {/* Loading spinner */}
      {isLoading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading video...</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={onRetry}>Retry</button>
        </div>
      )}

      {/* Play button overlay */}
      {!isPlaying && !isLoading && !error && (
        <div className="play-button-overlay" onClick={onPlayClick}>
          <svg viewBox="0 0 24 24" width="64" height="64">
            <circle cx="12" cy="12" r="12" fill="rgba(0,0,0,0.5)" />
            <path d="M8 5v14l11-7z" fill="white" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default VideoOverlay;
