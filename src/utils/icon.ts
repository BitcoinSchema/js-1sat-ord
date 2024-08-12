// import sharp from "sharp";
// import type { IconInscription, ImageContentType } from "../types";

// // export the errors for use in tests
// export const ErrorOversizedIcon = new Error(
// 	"Image must be a square image with dimensions <= 400x400",
// );
// export const ErrorIconProportions = new Error("Image must be a square image");
// export const ErrorInvalidIconData = new Error("Error processing image");
// export const ErrorImageDimensionsUndefined = new Error(
// 	"Image dimensions are undefined",
// );

// export const validIconData = async (
// 	icon: IconInscription,
// ): Promise<Error | null> => {
// 	const { dataB64, contentType } = icon;
// 	try {
// 		const buffer = Buffer.from(dataB64, "base64");
// 		let image = sharp(buffer);

// 		// Special handling for SVG
// 		if (contentType === "image/svg+xml") {
// 			// Convert SVG to PNG for consistent dimension checking
// 			image = image.png();
// 		}

// 		const metadata = await image.metadata();

// 		if (metadata.width === undefined || metadata.height === undefined) {
// 			return ErrorImageDimensionsUndefined;
// 		}
// 		// Check if the image is a square
// 		if (metadata.width !== metadata.height) {
// 			return ErrorIconProportions;
// 		}
// 		// ensure the image is <= 400x400
// 		if (metadata.width > 400 || metadata.height > 400) {
// 			return ErrorOversizedIcon;
// 		}

// 		return null;
// 	} catch (error) {
// 		return ErrorInvalidIconData;
// 	}
// };

import type { Jimp as JimpType, JimpConstructors } from '@jimp/core';
import 'jimp';

declare const Jimp: JimpType & JimpConstructors;

import type { IconInscription, ImageContentType } from "../types";

export const ErrorOversizedIcon = new Error(
	"Image must be a square image with dimensions <= 400x400",
);
export const ErrorIconProportions = new Error("Image must be a square image");
export const ErrorInvalidIconData = new Error("Error processing image");
export const ErrorImageDimensionsUndefined = new Error(
	"Image dimensions are undefined",
);

const isImageContentType = (value: string): value is ImageContentType => {
  console.log({value})
	return (value as ImageContentType) === value;
};

export const validIconData = async (
	icon: IconInscription,
): Promise<Error | null> => {
	const { dataB64, contentType } = icon;

	if (contentType === "image/svg+xml") {
		return validateSvg(dataB64);
	}

	// make sure the contentType is one of ImageContentType
	if (!isImageContentType(contentType)) {
		return ErrorInvalidIconData;
	}

	try {
		const buffer = Buffer.from(dataB64, "base64");
		const image = await Jimp.read(buffer);

		const width = image.getWidth();
		const height = image.getHeight();

		if (width === undefined || height === undefined) {
			return ErrorImageDimensionsUndefined;
		}
		if (width !== height) {
			return ErrorIconProportions;
		}
		if (width > 400 || height > 400) {
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
  console.log({widthMatch, heightMatch})
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
