import { useEffect, useState } from "react";
import "./App.css";
import AnnotatedImage from "./components/AnnotatedImage";

function App() {
  const [imageUrl, setImageUrl] = useState(null);
  const [annotationData, setAnnotationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const apiKey = "http://localhost:5000";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch annotation data
        const annotationResponse = await fetch(`${apiKey}/api/annotations`);
        if (!annotationResponse.ok) {
          throw new Error("Failed to fetch annotation data");
        }
        const annotations = await annotationResponse.json();

        // Fetch image
        const imageResponse = await fetch(`${apiKey}/api/image`);
        if (!imageResponse.ok) {
          throw new Error("Failed to fetch image");
        }
        const imageBlob = await imageResponse.blob();
        const imageObjectUrl = URL.createObjectURL(imageBlob);

        setAnnotationData(annotations);
        setImageUrl(imageObjectUrl);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // Cleanup function to revoke object URL
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <>
      <h3 style={{ paddingBottom: 10 }}>Annotated Image</h3>
      {imageUrl && annotationData && (
        <>
          <AnnotatedImage imageUrl={imageUrl} annotationData={annotationData} />
          {/* <div style={{ marginTop: 20 }}>
            <h4>Legend</h4>
            <ul style={{ listStyle: "none", padding: 0 }}>
              <li>
                <span
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: 16,
                    background: "rgb(0,255,0)",
                    marginRight: 8,
                    border: "1px solid #ccc",
                  }}
                ></span>
                Crack
              </li>
              <li>
                <span
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: 16,
                    background: "rgb(255,165,0)",
                    marginRight: 8,
                    border: "1px solid #ccc",
                  }}
                ></span>
                Spalling
              </li>
              <li>
                <span
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: 16,
                    background: "rgb(255,69,19)",
                    marginRight: 8,
                    border: "1px solid #ccc",
                  }}
                ></span>
                Corrosion
              </li>
              <li>
                <span
                  style={{
                    display: "inline-block",
                    width: 16,
                    height: 16,
                    background: "rgb(128,128,128)",
                    marginRight: 8,
                    border: "1px solid #ccc",
                  }}
                ></span>
                Stain
              </li>
            </ul>
          </div> */}
        </>
      )}
    </>
  );
}

export default App;
