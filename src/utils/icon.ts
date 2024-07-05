import sharp from "sharp";
import type { IconInscription, ImageContentType } from "../types";

// export the errors for use in tests
export const ErrorOversizedIcon = new Error(
	"Image must be a square image with dimensions <= 400x400",
);
export const ErrorIconProportions = new Error("Image must be a square image");
export const ErrorInvalidIconData = new Error("Error processing image");
export const ErrorImageDimensionsUndefined = new Error(
	"Image dimensions are undefined",
);

export const validIconData = async (
	icon: IconInscription,
): Promise<Error | null> => {
	const { dataB64, contentType } = icon;
	try {
		const buffer = Buffer.from(dataB64, "base64");
		let image = sharp(buffer);

		// Special handling for SVG
		if (contentType === "image/svg+xml") {
			// Convert SVG to PNG for consistent dimension checking
			image = image.png();
		}

		const metadata = await image.metadata();

		if (metadata.width === undefined || metadata.height === undefined) {
			return ErrorImageDimensionsUndefined;
		}
		// Check if the image is a square
		if (metadata.width !== metadata.height) {
			return ErrorIconProportions;
		}
		// ensure the image is <= 400x400
		if (metadata.width > 400 || metadata.height > 400) {
			return ErrorOversizedIcon;
		}

		return null;
	} catch (error) {
		return ErrorInvalidIconData;
	}
};

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
};
