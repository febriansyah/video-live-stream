import { useState, useEffect } from "react";
import "./index.css";
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
    // Use VITE_BACKEND_URL from environment variables
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

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
          "Could not connect to backend server. Please check your connection or try again later."
        );
        setIsLoading(false);
      });
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-96 text-xl">Loading video stream...</div>;
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-red-500">
          <p className="mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition">Retry</button>
        </div>
      );
    }

    switch (activeTab) {
      case "single":
        return <div className="flex justify-center"><SwitchableVideoPlayer videoUrl={videoUrl} /></div>;
      case "multi":
        return <MultiCamView videoUrls={videoUrls} />;
      case "webrtc":
        return <WebRTCPlayer serverUrl={import.meta.env.VITE_BACKEND_URL} />;
      default:
        return <SwitchableVideoPlayer videoUrl={videoUrl} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-900 text-white font-sans">
      <header className="bg-black bg-opacity-80 shadow-lg px-6 py-4 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-wider text-red-600">MyStream</h1>
        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded ${activeTab === "single" ? "bg-red-600 text-white" : "bg-neutral-800 text-gray-200 hover:bg-red-600 hover:text-white transition"}`}
            onClick={() => setActiveTab("single")}
          >
            Single Video
          </button>
          <button
            className={`px-4 py-2 rounded ${activeTab === "multi" ? "bg-red-600 text-white" : "bg-neutral-800 text-gray-200 hover:bg-red-600 hover:text-white transition"}`}
            onClick={() => setActiveTab("multi")}
          >
            Multi Cam
          </button>
          <button
            className={`px-4 py-2 rounded ${activeTab === "webrtc" ? "bg-red-600 text-white" : "bg-neutral-800 text-gray-200 hover:bg-red-600 hover:text-white transition"}`}
            onClick={() => setActiveTab("webrtc")}
          >
            WebRTC
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        {renderContent()}
      </main>

      <footer className="bg-black bg-opacity-80 text-center py-4 text-gray-400">
        <p>Video Streaming Application - {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;
