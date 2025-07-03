import { useCallback, useEffect, useState } from "react";
import { getAnomalyColor } from "../components/utils";

export const useAnnotationCanvas = (
  annotationData,
  originalImageWidth,
  originalImageHeight,
  canvasRef,
  imageRef,
  containerRef
) => {
  const [hoveredAnnotation, setHoveredAnnotation] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Helper functions
  const getAllAnomalies = useCallback((element) => {
    return [
      ...(element?.yolo_anomalies || []),
      ...(element?.mask_rcnn_anomalies || []),
      ...(element?.open_world_detections || []),
      ...(element?.unmatched_anomalies || []),
    ];
  }, []);

  const isPointInPolygon = useCallback((ctx, polygon, scaleX, scaleY, x, y) => {
    if (polygon?.length < 3) return false;

    ctx.beginPath();
    ctx.moveTo(polygon[0][0] * scaleX, polygon[0][1] * scaleY);

    for (let k = 1; k < polygon.length; k++) {
      ctx.lineTo(polygon[k][0] * scaleX, polygon[k][1] * scaleY);
    }

    ctx.closePath();
    return ctx.isPointInPath(x, y);
  }, []);

  const getStructuralClass = useCallback((anomaly, annotationData) => {
    let structuralClass = null;

    annotationData?.forEach((structElement) => {
      if (
        structElement?.structural_bbox_original_frame &&
        structElement?.structural_class
      ) {
        const [box_x1, box_y1, box_x2, box_y2] =
          structElement.structural_bbox_original_frame;

        // Check if at least one point of any polygon is inside this bounding box
        let isInsideStructure = false;

        // Check each polygon in the mask
        anomaly?.damage_masks_original_frame?.forEach((polygon) => {
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

    return structuralClass;
  }, []);

  // Drawing functions
  const drawOpenWorldDetections = useCallback(
    (ctx, element, scaleX, scaleY) => {
      if (!element?.open_world_detections) return;

      element.open_world_detections.forEach((detection) => {
        if (
          detection.boxes &&
          Array.isArray(detection.boxes) &&
          detection.boxes.length === 4
        ) {
          const [x1, y1, x2, y2] = detection.boxes;
          let label = detection.label || "unknown";

          // Scale coordinates
          const scaledX1 = x1 * scaleX;
          const scaledY1 = y1 * scaleY;
          const scaledX2 = x2 * scaleX;
          const scaledY2 = y2 * scaleY;

          // Check if this is the hovered detection to highlight it
          const isHovered =
            hoveredAnnotation?.isOpenWorldDetection &&
            hoveredAnnotation?.label === label;

          // Draw bounding box with light styling
          ctx.strokeStyle = isHovered
            ? "rgba(0, 255, 34, 0.8)"
            : "rgba(0, 255, 34, 0.2)"; // Brighter when hovered
          ctx.fillStyle = isHovered
            ? "rgba(0, 255, 34, 0.05)"
            : "rgba(0, 255, 34, 0.001)"; // Slightly more visible when hovered
          ctx.lineWidth = isHovered ? 2 : 1;

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
        }
      });
    },
    [hoveredAnnotation]
  );

  const drawStructuralBoundingBox = useCallback(
    (ctx, element, scaleX, scaleY) => {
      const boundingBox = element?.structural_bbox_original_frame;
      const structuralClass = element?.structural_class;

      if (
        boundingBox &&
        Array.isArray(boundingBox) &&
        boundingBox.length === 4 &&
        structuralClass
      ) {
        const [x1, y1, x2, y2] = boundingBox;

        // Scale coordinates
        const scaledX1 = x1 * scaleX;
        const scaledY1 = y1 * scaleY;
        const scaledX2 = x2 * scaleX;
        const scaledY2 = y2 * scaleY;

        // Draw bounding box with light styling
        ctx.strokeStyle = "rgba(238, 0, 255, 0)"; // Green-gray with low opacity
        ctx.fillStyle = "rgba(194, 32, 206, 0.001)"; // Very light green-gray fill
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
    },
    []
  );

  const drawAnomalyPolygons = useCallback(
    (ctx, anomalies, hoveredAnnotation, scaleX, scaleY) => {
      anomalies?.forEach?.((anomaly) => {
        const isHovered =
          hoveredAnnotation?.mask === anomaly?.damage_masks_original_frame;
        const color = getAnomalyColor(
          anomaly?.damage_class,
          isHovered ? 0.7 : 0.4
        ); // More opaque on hover
        const borderColor = getAnomalyColor(anomaly?.damage_class, 1);

        ctx.fillStyle = color;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = isHovered ? 2 : 1;

        anomaly?.damage_masks_original_frame?.forEach?.((polygon) => {
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
    },
    []
  );

  const drawAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext("2d");

    if (!image || !container || !ctx) return;

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

    // First, draw open world detection boxes (behind everything else)
    annotationData?.forEach?.((element) => {
      drawOpenWorldDetections(ctx, element, scaleX, scaleY);
    });

    // Next, draw structural bounding boxes (behind anomalies)
    annotationData?.forEach?.((element) => {
      drawStructuralBoundingBox(ctx, element, scaleX, scaleY);
    });

    // Then, draw anomalies on top
    annotationData?.forEach?.((element) => {
      const allAnomalies = getAllAnomalies(element);
      drawAnomalyPolygons(ctx, allAnomalies, hoveredAnnotation, scaleX, scaleY);
    });
  }, [
    annotationData,
    hoveredAnnotation,
    originalImageWidth,
    originalImageHeight,
    canvasRef,
    imageRef,
    containerRef,
    getAllAnomalies,
    drawOpenWorldDetections,
    drawStructuralBoundingBox,
    drawAnomalyPolygons,
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
    }

    // Cleanup
    return () => {
      image?.removeEventListener?.("load", handleLoad);
      window.removeEventListener("resize", handleResize);
    };
  }, [drawAnnotations, imageRef]);

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

      // Scaling factors
      const scaleX = canvas?.width / originalImageWidth;
      const scaleY = canvas?.height / originalImageHeight;

      // First check for open world detection boxes
      for (let i = (annotationData?.length || 0) - 1; i >= 0; i--) {
        const element = annotationData?.[i];
        if (element?.open_world_detections) {
          for (let j = 0; j < element.open_world_detections.length; j++) {
            const detection = element.open_world_detections[j];
            if (
              detection.boxes &&
              Array.isArray(detection.boxes) &&
              detection.boxes.length === 4
            ) {
              const [x1, y1, x2, y2] = detection.boxes;
              const scaledX1 = x1 * scaleX;
              const scaledY1 = y1 * scaleY;
              const scaledX2 = x2 * scaleX;
              const scaledY2 = y2 * scaleY;

              // Check if mouse is inside this box
              if (
                x >= scaledX1 &&
                x <= scaledX2 &&
                y >= scaledY1 &&
                y <= scaledY2
              ) {
                const label = detection.label || "Unknown";
                foundAnnotation = {
                  isOpenWorldDetection: true,
                  label: label,
                };
                break;
              }
            }
          }
        }
        if (foundAnnotation) break;
      }

      // If no open world detection was found, check for anomaly polygons
      if (!foundAnnotation) {
        // Reverse search to find the topmost annotation
        for (let i = (annotationData?.length || 0) - 1; i >= 0; i--) {
          const element = annotationData?.[i];
          const allAnomalies = getAllAnomalies(element);

          for (let j = allAnomalies?.length - 1; j >= 0; j--) {
            const anomaly = allAnomalies?.[j];

            let isInside = false;
            anomaly?.damage_masks_original_frame?.forEach?.((polygon) => {
              if (isPointInPolygon(ctx, polygon, scaleX, scaleY, x, y)) {
                isInside = true;
              }
            });

            if (isInside) {
              const structuralClass = getStructuralClass(
                anomaly,
                annotationData
              );

              foundAnnotation = {
                class_name: anomaly?.damage_class,
                severity: anomaly?.severity || 1, // Default severity to 1 if not provided
                confidence_score: anomaly?.confidence_score,
                mask: anomaly?.damage_masks_original_frame, // Use a unique reference
                structural_class: structuralClass, // Add structural class information
              };
              break;
            }
          }
          if (foundAnnotation) break;
        }
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
  }, [
    annotationData,
    originalImageWidth,
    originalImageHeight,
    canvasRef,
    getAllAnomalies,
    isPointInPolygon,
    getStructuralClass,
  ]);

  return { hoveredAnnotation, tooltipPosition };
};

// TOOLTIP IMPLEMENTATION GUIDE:
// In your tooltip component that uses hoveredAnnotation state:
//
// function AnnotationTooltip({ hoveredAnnotation }) {
//   // For open world detections, only show the label
//   if (hoveredAnnotation?.isOpenWorldDetection) {
//     return (
//       <div className="tooltip">
//         {hoveredAnnotation.label}
//       </div>
//     );
//   }
//
//   // For regular annotations, show the original information
//   if (hoveredAnnotation?.class_name) {
//     return (
//       <div className="tooltip">
//         <div>Class: {hoveredAnnotation.class_name}</div>
//         <div>Severity: {hoveredAnnotation.severity}</div>
//         {hoveredAnnotation.confidence_score && (
//           <div>Confidence: {hoveredAnnotation.confidence_score.toFixed(2)}</div>
//         )}
//         {hoveredAnnotation.structural_class && (
//           <div>Structure: {hoveredAnnotation.structural_class}</div>
//         )}
//       </div>
//     );
//   }
//
//   return null;
// }
