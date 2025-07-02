import { useRef } from "react";
import { useAnnotationCanvas } from "../hooks/useAnnotationCanvas";
import "./AnnotatedImage.css";
import Tooltip from "./Tooltip";

const AnnotatedImage = ({ imageUrl, annotationData }) => {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Extract image size from annotationData or use default values
  const imageSize = annotationData?.image_size || [5184, 3888];
  const [originalImageWidth, originalImageHeight] = imageSize;

  const { hoveredAnnotation, tooltipPosition } = useAnnotationCanvas(
    annotationData,
    originalImageWidth,
    originalImageHeight,
    canvasRef,
    imageRef,
    containerRef
  );

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
      <canvas ref={canvasRef} className="annotation-canvas" />
      <Tooltip
        hoveredAnnotation={hoveredAnnotation}
        tooltipPosition={tooltipPosition}
      />
    </div>
  );
};

export default AnnotatedImage;
