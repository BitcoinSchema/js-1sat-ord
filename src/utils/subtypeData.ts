import type { MAP, PreMAP } from "../types";

const stringifyMetaData = (metaData?: PreMAP): MAP | undefined => {
  if (!metaData) return undefined;
	const result: MAP = {
		app: metaData.app,
		type: metaData.type,
	};

	for (const [key, value] of Object.entries(metaData)) {
		if (value !== undefined) {
			if (typeof value === "string") {
				result[key] = value;
			} else if (Array.isArray(value) || typeof value === "object") {
				result[key] = JSON.stringify(value);
			} else {
				result[key] = String(value);
			}
		}
	}

	return result;
};

export default stringifyMetaData;
