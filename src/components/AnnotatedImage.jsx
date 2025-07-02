import { useCallback, useEffect, useRef, useState } from "react";
import "./AnnotatedImage.css";

// Helper function to get a consistent color for each anomaly type
const getAnomalyColor = (className, opacity = 0.4) => {
  const name = className?.toLowerCase();
  let color = "132, 94, 247"; // Default violet

  if (name?.includes("crack")) {
    color = "0, 255, 0"; // Pink
  } else if (name?.includes("spalling")) {
    color = "255, 165, 0"; // Orange
  } else if (name?.includes("corrosion")) {
    color = "255, 69, 19"; // Brown
  } else if (name?.includes("stain")) {
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
  const drawAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext("2d");

    if (!image || !container || !ctx) return; // Use the image dimensions we've already extracted from annotationData

    // Set canvas size to match the displayed image size
    const { width: displayWidth, height: displayHeight } =
      container?.getBoundingClientRect?.() || { width: 0, height: 0 };
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    // Calculate scaling factors
    const scaleX = displayWidth / originalImageWidth;
    const scaleY = displayHeight / originalImageHeight;

    // Clear canvas before drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // First, draw structural bounding boxes (behind anomalies)
    annotationData?.forEach?.((element) => {
      if (
        element?.structural_bbox_original_frame &&
        element?.structural_class
      ) {
        const [x1, y1, x2, y2] = element.structural_bbox_original_frame;

        // Scale coordinates
        const scaledX1 = x1 * scaleX;
        const scaledY1 = y1 * scaleY;
        const scaledX2 = x2 * scaleX;
        const scaledY2 = y2 * scaleY;

        // Draw bounding box with light styling
        ctx.strokeStyle = "rgba(154, 154, 154, 0.5)"; // Gray with low opacity
        ctx.fillStyle = "rgba(47, 47, 47, 0.1)"; // Very light gray fill
        ctx.lineWidth = 1;

        ctx.fillRect(
          scaledX1,
          scaledY1,
          scaledX2 - scaledX1,
          scaledY2 - scaledY1
        );
        ctx.strokeRect(
          scaledX1,
          scaledY1,
          scaledX2 - scaledX1,
          scaledY2 - scaledY1
        );

        // Reset line dash for anomalies
        ctx.setLineDash?.([]);
      }
    });

    // Then, draw anomalies on top
    annotationData?.forEach?.((element) => {
      // We only care about drawing the anomalies here
      const allAnomalies = [
        ...(element?.yolo_anomalies || []),
        ...(element?.mask_rcnn_anomalies || []),
      ];

      allAnomalies?.forEach?.((anomaly) => {
        const isHovered =
          hoveredAnnotation?.mask === anomaly?.mask_original_frame;
        const color = getAnomalyColor(
          anomaly?.class_name,
          isHovered ? 0.7 : 0.4
        ); // More opaque on hover
        const borderColor = getAnomalyColor(anomaly?.class_name, 1);

        ctx.fillStyle = color;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = isHovered ? 2 : 1;

        anomaly?.mask_original_frame?.forEach?.((polygon) => {
          if (polygon?.length < 3) return; // Not a valid polygon

          ctx.beginPath?.();
          // Move to the first point
          const firstPoint = polygon[0];
          ctx.moveTo?.(firstPoint?.[0] * scaleX, firstPoint?.[1] * scaleY);

          // Draw lines to the subsequent points
          for (let i = 1; i < polygon?.length; i++) {
            const point = polygon[i];
            ctx.lineTo?.(point?.[0] * scaleX, point?.[1] * scaleY);
          }

          ctx.closePath?.();
          ctx.fill?.();
          ctx.stroke?.();
        });
      });
    });
  }, [
    annotationData,
    hoveredAnnotation,
    originalImageWidth,
    originalImageHeight,
  ]);

  // Effect for initial drawing and redrawing on window resize
  useEffect(() => {
    const image = imageRef.current;

    const handleResize = () => {
      drawAnnotations?.();
    };

    const handleLoad = () => {
      drawAnnotations?.();
      window.addEventListener("resize", handleResize);
    };

    if (image?.complete) {
      handleLoad?.();
    } else {
      image?.addEventListener?.("load", handleLoad);
    } // Cleanup
    return () => {
      image?.removeEventListener?.("load", handleLoad);
      window.removeEventListener("resize", handleResize);
    };
  }, [annotationData, hoveredAnnotation, drawAnnotations]); // Redraw when data or hovered annotation changes

  // Effect for handling mouse interactions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (event) => {
      const ctx = canvas?.getContext?.("2d");
      const rect = canvas?.getBoundingClientRect?.();
      const x = event.clientX - (rect?.left || 0);
      const y = event.clientY - (rect?.top || 0);
      let foundAnnotation = null;

      // Reverse search to find the topmost annotation
      for (let i = (annotationData?.length || 0) - 1; i >= 0; i--) {
        const element = annotationData?.[i];
        const allAnomalies = [
          ...(element?.yolo_anomalies || []),
          ...(element?.mask_rcnn_anomalies || []),
        ];

        for (let j = allAnomalies?.length - 1; j >= 0; j--) {
          const anomaly = allAnomalies?.[j]; // Recreate path to use isPointInPath
          const scaleX = canvas?.width / originalImageWidth;
          const scaleY = canvas?.height / originalImageHeight;

          let isInside = false;
          anomaly?.mask_original_frame?.forEach?.((polygon) => {
            if (polygon?.length < 3) return;
            ctx?.beginPath?.();
            ctx?.moveTo?.(
              polygon?.[0]?.[0] * scaleX,
              polygon?.[0]?.[1] * scaleY
            );
            for (let k = 1; k < polygon?.length; k++) {
              ctx?.lineTo?.(
                polygon?.[k]?.[0] * scaleX,
                polygon?.[k]?.[1] * scaleY
              );
            }
            ctx?.closePath?.();
            if (ctx?.isPointInPath?.(x, y)) {
              isInside = true;
            }
          });

          if (isInside) {
            // Find if this anomaly is inside any structural bounding box
            let structuralClass = null;

            // Check against all structural bounding boxes
            annotationData?.forEach?.((structElement) => {
              if (
                structElement?.structural_bbox_original_frame &&
                structElement?.structural_class
              ) {
                // console.log(structElement.structural_class);
                const [box_x1, box_y1, box_x2, box_y2] =
                  structElement.structural_bbox_original_frame;

                // Check if at least one point of any polygon is inside this bounding box
                let isInsideStructure = false;

                // Check each polygon in the mask
                anomaly?.mask_original_frame?.forEach?.((polygon) => {
                  // Check each point in the polygon
                  for (let k = 0; k < (polygon?.length || 0); k++) {
                    const [point_x, point_y] = polygon?.[k] || [];
                    if (
                      point_x >= box_x1 &&
                      point_x <= box_x2 &&
                      point_y >= box_y1 &&
                      point_y <= box_y2
                    ) {
                      isInsideStructure = true;
                      break;
                    }
                  }
                });

                if (isInsideStructure) {
                  structuralClass = structElement.structural_class;
                }
              }
            });

            foundAnnotation = {
              class_name: anomaly?.damage_class,
              severity: anomaly?.severity,
              confidence_score: anomaly?.confidence_score,
              mask: anomaly?.mask_original_frame, // Use a unique reference
              structural_class: structuralClass, // Add structural class information
            };
            break;
          }
        }
        if (foundAnnotation) break;
      }

      setHoveredAnnotation(foundAnnotation);
      setTooltipPosition({ x: event?.clientX, y: event?.clientY });
    };

    const handleMouseLeave = () => {
      setHoveredAnnotation(null);
    };

    canvas?.addEventListener?.("mousemove", handleMouseMove);
    canvas?.addEventListener?.("mouseleave", handleMouseLeave);

    return () => {
      canvas?.removeEventListener?.("mousemove", handleMouseMove);
      canvas?.removeEventListener?.("mouseleave", handleMouseLeave);
    };
  }, [annotationData, originalImageWidth, originalImageHeight]); // Rerun if data changes

  const sanitize = (str) => {
    if (!str) return "";
    //remove underscore and capitalize each word
    return str
      ?.replace?.(/_/g, " ")
      ?.split?.(" ")
      ?.map?.((word) => word?.charAt?.(0)?.toUpperCase?.() + word?.slice?.(1))
      ?.join?.(" ");
  };

  // const severityMatch = hoveredAnnotation?.class_name?.match(/_(\d+)$/);
  // const severity =
  //   hoveredAnnotation?.severity || (severityMatch ? severityMatch[1] : 1);
  const severity = hoveredAnnotation?.severity;

  // Clean class_name: remove everything after the first underscore
  const cleanClassName = (name) => {
    if (!name) return "";
    return name.split("_")[0];
  };

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
      {hoveredAnnotation && (
        <div
          className="tooltip"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
          }}
        >
          <p style={{ textTransform: "capitalize" }}>
            <span>Anomaly:</span>{" "}
            {sanitize(cleanClassName(hoveredAnnotation.class_name))}
          </p>
          {severity && (
            <p>
              <span>Severity: {severity}</span>
            </p>
          )}
          {hoveredAnnotation.structural_class && (
            <p>
              <span>Structure: </span>
              {sanitize(hoveredAnnotation.structural_class)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AnnotatedImage;
