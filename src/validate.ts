import type { CollectionItemSubTypeData, CollectionSubTypeData } from "./types";

/**
 * Validates sub type data
 * @param {string} subType - Sub type of the ordinals token
 * @param {string} subTypeData - Sub type data of the ordinals token
 * @returns {Error | undefined} Error if validation fails, undefined if validation passes
 */
export const validateSubTypeData = (
  subType: "collection" | "collectionItem",
  subTypeData: CollectionItemSubTypeData | CollectionSubTypeData,
): Error | undefined => {
  try {
    if (subType === "collection") {
      const collectionData = subTypeData as CollectionSubTypeData;
      if (!collectionData.description) {
        return new Error("Collection description is required");
      }
      if (!collectionData.quantity) {
        return new Error("Collection quantity is required");
      }
      if (collectionData.rarityLabels) {
        if (!Array.isArray(collectionData.rarityLabels)) {
          return new Error("Rarity labels must be an array");
        }
        // make sure keys and values are strings
        if (!collectionData.rarityLabels.every(({ key, value }) => typeof key === "string" && typeof value === "string")) {
          return new Error("Invalid rarity labels");
        }
      }
      if (!collectionData.traits) {
        return new Error("Collection traits are required");
      }
    }
    if (subType === "collectionItem") {
      const itemData = subTypeData as CollectionItemSubTypeData;
      if (!itemData.collectionId) {
        return new Error("Collection id is required");
      }
      if (!itemData.collectionId.includes("_")) {
        return new Error("Collection id must be a valid outpoint");
      }
      if (itemData.collectionId.split("_")[0].length !== 64) {
        return new Error("Collection id must contain a valid txid");
      }
      if (Number.isNaN(Number.parseInt(itemData.collectionId.split("_")[1]))) {
        return new Error("Collection id must contain a valid vout");
      }

      if (itemData.mintNumber && typeof itemData.mintNumber !== "number") {
        return new Error("Mint number must be a number");
      }
      if (itemData.rank && typeof itemData.rank !== "number") {
        return new Error("Rank must be a number");
      }
      if (itemData.rarityLabel && typeof itemData.rarityLabel !== "string") {
        return new Error("Rarity label must be a string");
      }
      if (itemData.traits && typeof itemData.traits !== "object") {
        return new Error("Traits must be an object");
      }
      if (itemData.attachments && !Array.isArray(itemData.attachments)) {
        return new Error("Attachments must be an array");
      }
    }
    return undefined;
  } catch (error) {
    return new Error("Invalid JSON data");
  }
};