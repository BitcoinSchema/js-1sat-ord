export const validIconFormat = (icon: string): boolean => {
  if (!icon.includes("_") || icon.endsWith("_")) {
    return false;
  }

  // use parseint to validate the vout
  const iconVout = Number.parseInt(icon.split("_")[1]);
  if (Number.isNaN(iconVout)) {
    return false;
  }

  if (!icon.startsWith("_") && icon.split("_")[0].length !== 64) {
    return false;
  }

  return true;
}