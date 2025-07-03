import { cleanClassName, sanitize } from "./utils";

const Tooltip = ({ hoveredAnnotation, tooltipPosition }) => {
  if (!hoveredAnnotation) return null;

  // For open world detections, only show the label
  if (hoveredAnnotation?.isOpenWorldDetection) {
    if (hoveredAnnotation.label === "unknown") return null;

    return (
      <div
        className="tooltip"
        style={{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`,
          alignContent: "left",
          textAlign: "left",
        }}
      >
        <p style={{ textTransform: "capitalize" }}>{hoveredAnnotation.label}</p>
      </div>
    );
  }

  // For regular annotations, show the original information
  return (
    <div
      className="tooltip"
      style={{
        left: `${tooltipPosition.x}px`,
        top: `${tooltipPosition.y}px`,
        alignContent: "left",
        textAlign: "left",
      }}
    >
      <p style={{ textTransform: "capitalize" }}>
        <span>Anomaly:</span>{" "}
        {sanitize(cleanClassName(hoveredAnnotation.class_name))}
      </p>
      {hoveredAnnotation?.severity && (
        <p>
          <span>Severity: {hoveredAnnotation?.severity}</span>
        </p>
      )}
      {hoveredAnnotation.structural_class && (
        <p>
          <span>Structure: </span>
          {sanitize(hoveredAnnotation.structural_class)}
        </p>
      )}
    </div>
  );
};

export default Tooltip;
