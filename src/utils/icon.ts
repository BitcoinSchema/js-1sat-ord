import { imageMeta } from "image-meta";
import { Utils } from "@bsv/sdk";
import type { IconInscription, ImageContentType } from "../types";
const { toArray } = Utils;

export const ErrorOversizedIcon = new Error(
    "Image must be a square image with dimensions <= 400x400",
);
export const ErrorIconProportions = new Error("Image must be a square image");
export const ErrorInvalidIconData = new Error("Error processing image");
export const ErrorImageDimensionsUndefined = new Error(
    "Image dimensions are undefined",
);

const isImageContentType = (value: string): value is ImageContentType => {
    return (value as ImageContentType) === value;
};

export const validIconData = async (
    icon: IconInscription,
): Promise<Error | null> => {
    const { dataB64, contentType } = icon;

    if (contentType === "image/svg+xml") {
        return validateSvg(dataB64);
    }

    if (!isImageContentType(contentType)) {
        return ErrorInvalidIconData;
    }

    try {
        const buffer = Uint8Array.from(toArray(dataB64, "base64"));

        // Meta contains { type, width?, height?, orientation? }
        const dimensions = imageMeta(buffer);

        if (dimensions.width === undefined || dimensions.height === undefined) {
            return ErrorImageDimensionsUndefined;
        }
        if (dimensions.width !== dimensions.height) {
            return ErrorIconProportions;
        }
        if (dimensions.width > 400 || dimensions.height > 400) {
            return ErrorOversizedIcon;
        }

        return null;
    } catch (error) {
        return ErrorInvalidIconData;
    }
};

const validateSvg = (svgBase64: string): Error | null => {
    const svgString = Buffer.from(svgBase64, "base64").toString("utf-8");
    const widthMatch = svgString.match(/<svg[^>]*\s+width="([^"]+)"/);
    const heightMatch = svgString.match(/<svg[^>]*\s+height="([^"]+)"/);
    
    if (!widthMatch || !heightMatch) {
        return ErrorImageDimensionsUndefined;
    }

    const width = Number.parseInt(widthMatch[1], 10);
    const height = Number.parseInt(heightMatch[1], 10);

    if (Number.isNaN(width) || Number.isNaN(height)) {
        return ErrorImageDimensionsUndefined;
    }

    if (width !== height) {
        return ErrorIconProportions;
    }
    if (width > 400 || height > 400) {
        return ErrorOversizedIcon;
    }

    return null;
}

export const validIconFormat = (icon: string): boolean => {
    if (!icon.includes("_") || icon.endsWith("_")) {
        return false;
    }

    const iconVout = Number.parseInt(icon.split("_")[1]);
    if (Number.isNaN(iconVout)) {
        return false;
    }

    if (!icon.startsWith("_") && icon.split("_")[0].length !== 64) {
        return false;
    }

    return true;
};

