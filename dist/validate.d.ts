import type { CollectionItemSubTypeData, CollectionSubTypeData } from "./types";
/**
 * Validates sub type data
 * @param {string} subType - Sub type of the ordinals token
 * @param {string} subTypeData - Sub type data of the ordinals token
 * @returns {Error | undefined} Error if validation fails, undefined if validation passes
 */
export declare const validateSubTypeData: (subType: "collection" | "collectionItem", subTypeData: CollectionItemSubTypeData | CollectionSubTypeData) => Error | undefined;
