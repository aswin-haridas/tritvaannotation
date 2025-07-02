// Helper function to get a consistent color for each anomaly type
export const getAnomalyColor = (className, opacity = 0.4) => {
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

export const sanitize = (str) => {
  if (!str) return "";
  //remove underscore and capitalize each word
  return str
    ?.replace?.(/_/g, " ")
    ?.split?.(" ")
    ?.map?.((word) => word?.charAt?.(0)?.toUpperCase?.() + word?.slice?.(1))
    ?.join?.(" ");
};

// Clean class_name: remove everything after the first underscore
export const cleanClassName = (name) => {
  if (!name) return "";
  return name.split("_")[0];
};
