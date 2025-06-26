import { useEffect, useRef, useState } from "react";
import "./AnnotatedImage.css";

// Helper function to get a consistent color for each anomaly type
const getAnomalyColor = (className, opacity = 0.4) => {
  const name = className.toLowerCase();
  let color = "132, 94, 247"; // Default violet

  if (name.includes("crack")) {
    color = "0, 255, 0"; // Pink
  } else if (name.includes("spalling")) {
    color = "255, 165, 0"; // Orange
  } else if (name.includes("corrosion")) {
    color = "255, 69, 19"; // Brown
  } else if (name.includes("stain")) {
    color = "128, 128, 128"; // Gray
  }

  return `rgba(${color}, ${opacity})`;
};

const AnnotatedImage = ({ imageUrl, annotationData }) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Extract image size from annotationData or use default values
  const imageSize = annotationData?.image_size || [5184, 3888];
  const [originalImageWidth, originalImageHeight] = imageSize;

  // State to hold information for the tooltip
  const [hoveredAnnotation, setHoveredAnnotation] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // This function does the actual drawing on the canvas
  const drawAnnotations = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext("2d");

    if (!image || !container) return; // Use the image dimensions we've already extracted from annotationData

    // Set canvas size to match the displayed image size
    const { width: displayWidth, height: displayHeight } =
      container.getBoundingClientRect();
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Calculate scaling factors
    const scaleX = displayWidth / originalImageWidth;
    const scaleY = displayHeight / originalImageHeight;

    // Clear canvas before drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Iterate through all structural elements and their anomalies
    annotationData.forEach((element) => {
      // We only care about drawing the anomalies here
      const allAnomalies = [
        ...(element.yolo_anomalies || []),
        ...(element.mask_rcnn_anomalies || []),
      ];

      allAnomalies.forEach((anomaly) => {
        const isHovered =
          hoveredAnnotation &&
          hoveredAnnotation.mask === anomaly.mask_original_frame;
        const color = getAnomalyColor(
          anomaly.class_name,
          isHovered ? 0.7 : 0.4
        ); // More opaque on hover
        const borderColor = getAnomalyColor(anomaly.class_name, 1);

        ctx.fillStyle = color;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = isHovered ? 2 : 1;

        anomaly.mask_original_frame.forEach((polygon) => {
          if (polygon.length < 3) return; // Not a valid polygon

          ctx.beginPath();
          // Move to the first point
          const firstPoint = polygon[0];
          ctx.moveTo(firstPoint[0] * scaleX, firstPoint[1] * scaleY);

          // Draw lines to the subsequent points
          for (let i = 1; i < polygon.length; i++) {
            const point = polygon[i];
            ctx.lineTo(point[0] * scaleX, point[1] * scaleY);
          }

          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      });
    });
  };

  // Effect for initial drawing and redrawing on window resize
  useEffect(() => {
    const image = imageRef.current;

    const handleResize = () => {
      drawAnnotations();
    };

    const handleLoad = () => {
      drawAnnotations();
      window.addEventListener("resize", handleResize);
    };

    if (image.complete) {
      handleLoad();
    } else {
      image.addEventListener("load", handleLoad);
    }

    // Cleanup
    return () => {
      image.removeEventListener("load", handleLoad);
      window.removeEventListener("resize", handleResize);
    };
  }, [annotationData, hoveredAnnotation]); // Redraw when data or hovered annotation changes

  // Effect for handling mouse interactions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (event) => {
      const ctx = canvas.getContext("2d");
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      let foundAnnotation = null;

      // Reverse search to find the topmost annotation
      for (let i = annotationData.length - 1; i >= 0; i--) {
        const element = annotationData[i];
        const allAnomalies = [
          ...(element.yolo_anomalies || []),
          ...(element.mask_rcnn_anomalies || []),
        ];

        for (let j = allAnomalies.length - 1; j >= 0; j--) {
          const anomaly = allAnomalies[j]; // Recreate path to use isPointInPath
          const scaleX = canvas.width / originalImageWidth;
          const scaleY = canvas.height / originalImageHeight;

          let isInside = false;
          anomaly.mask_original_frame.forEach((polygon) => {
            if (polygon.length < 3) return;
            ctx.beginPath();
            ctx.moveTo(polygon[0][0] * scaleX, polygon[0][1] * scaleY);
            for (let k = 1; k < polygon.length; k++) {
              ctx.lineTo(polygon[k][0] * scaleX, polygon[k][1] * scaleY);
            }
            ctx.closePath();
            if (ctx.isPointInPath(x, y)) {
              isInside = true;
            }
          });

          if (isInside) {
            foundAnnotation = {
              class_name: anomaly.class_name,
              severity: anomaly.severity,
              confidence_score: anomaly.confidence_score,
              mask: anomaly.mask_original_frame, // Use a unique reference
            };
            break;
          }
        }
        if (foundAnnotation) break;
      }

      setHoveredAnnotation(foundAnnotation);
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    };

    const handleMouseLeave = () => {
      setHoveredAnnotation(null);
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [annotationData]); // Rerun if data changes

  return (
    <div className="annotated-image-container" ref={containerRef}>
      <img
        ref={imageRef}
        src={imageUrl}
        width={5184}
        height={3888}
        alt="Bridge for annotation"
        className="annotation-image"
        onError={(e) => console.error("Image failed to load:", e)}
      />
      <canvas ref={canvasRef} className="annotation-canvas" />{" "}
      {hoveredAnnotation && (
        <div
          className="tooltip"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
          }}
        >
          <p style={{ textTransform: "capitalize" }}>
            <strong>Anomaly:</strong> {hoveredAnnotation.class_name}
          </p>
          {hoveredAnnotation.severity && (
            <p>
              <strong>Severity: </strong>
              {hoveredAnnotation.severity}
            </p>
          )}
          <strong></strong>
        </div>
      )}
    </div>
  );
};

export default AnnotatedImage;
