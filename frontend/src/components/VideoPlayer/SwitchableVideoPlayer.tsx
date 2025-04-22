import CanvasVideoPlayer from "./CanvasVideoPlayer";
import "./VideoPlayer.css";

interface VideoPlayerProps {
  videoUrl: string;
}

const SwitchableVideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl }) => {
  return (
    <div className="video-player-wrapper">
      <CanvasVideoPlayer videoUrl={videoUrl} />
    </div>
  );
};

export default SwitchableVideoPlayer;
