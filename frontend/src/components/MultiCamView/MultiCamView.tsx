import React, { useState } from 'react';
import SwitchableVideoPlayer from '../VideoPlayer/SwitchableVideoPlayer';
import './MultiCamView.css';

interface MultiCamViewProps {
  videoUrls: string[];
}

const MultiCamView: React.FC<MultiCamViewProps> = ({ videoUrls }) => {
  const [activeCamera, setActiveCamera] = useState<number | null>(null);

  // Toggle fullscreen for a specific camera
  const toggleFullscreen = (index: number) => {
    if (activeCamera === index) {
      setActiveCamera(null);
    } else {
      setActiveCamera(index);
    }
  };

  return (
    <div className="multi-cam-container">
      {activeCamera !== null ? (
        // Single active camera view
        <div className="active-camera">
          <div className="camera-header">
            <h3>Camera {activeCamera + 1}</h3>
            <button onClick={() => toggleFullscreen(activeCamera)} className="back-button">
              Back to Grid
            </button>
          </div>
          <SwitchableVideoPlayer videoUrl={videoUrls[activeCamera]} />
        </div>
      ) : (
        // Grid view of all cameras
        <div className="camera-grid">
          {videoUrls.map((url, index) => (
            <div key={index} className="camera-cell">
              <div className="camera-header">
                <h3>Camera {index + 1}</h3>
                <button onClick={() => toggleFullscreen(index)} className="fullscreen-button">
                  Fullscreen
                </button>
              </div>
              <SwitchableVideoPlayer videoUrl={url} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiCamView;
