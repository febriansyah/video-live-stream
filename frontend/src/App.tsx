import { useState, useEffect } from "react";
import "./App.css";
import SwitchableVideoPlayer from "./components/VideoPlayer/SwitchableVideoPlayer";
import MultiCamView from "./components/MultiCamView/MultiCamView";
import WebRTCPlayer from "./components/WebRTC/WebRTCPlayer";

function App() {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"single" | "multi" | "webrtc">(
    "single"
  );

  useEffect(() => {
    // Set the backend URL with the new port
    const backendUrl = "http://localhost:5001";

    // Check if the backend is available
    fetch(`${backendUrl}/health`, {
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Backend server is not available");
        }
        return response.json();
      })
      .then(() => {
        // Set the single video URL
        setVideoUrl(`${backendUrl}/video`);

        // Fetch available streams for multi-cam view
        return fetch(`${backendUrl}/streams`, {
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
          },
        });
      })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not fetch available streams");
        }
        return response.json();
      })
      .then((streams) => {
        // Set the video URLs for multi-cam view
        const urls = streams.map(
          (stream: { url: string }) => `${backendUrl}${stream.url}`
        );
        setVideoUrls(urls);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error connecting to backend:", err);
        setError(
          "Could not connect to the video server. Please make sure the server is running."
        );
        setIsLoading(false);
      });
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return <div className="loading">Loading video stream...</div>;
    }

    if (error) {
      return (
        <div className="error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      );
    }

    switch (activeTab) {
      case "single":
        return <SwitchableVideoPlayer videoUrl={videoUrl} />;
      case "multi":
        return <MultiCamView videoUrls={videoUrls} />;
      case "webrtc":
        return <WebRTCPlayer serverUrl="http://localhost:5001" />;
      default:
        return <SwitchableVideoPlayer videoUrl={videoUrl} />;
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Video Streaming App</h1>
        <div className="tab-navigation">
          <button
            className={activeTab === "single" ? "active" : ""}
            onClick={() => setActiveTab("single")}
          >
            Single Video
          </button>
          <button
            className={activeTab === "multi" ? "active" : ""}
            onClick={() => setActiveTab("multi")}
          >
            Multi Cam
          </button>
        </div>
      </header>

      <main>{renderContent()}</main>

      <footer>
        <p>Video Streaming Application - {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;
