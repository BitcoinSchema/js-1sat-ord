import type { IconInscription } from "../types";
export declare const ErrorOversizedIcon: Error;
export declare const ErrorIconProportions: Error;
export declare const ErrorInvalidIconData: Error;
export declare const ErrorImageDimensionsUndefined: Error;
export declare const validIconData: (icon: IconInscription) => Promise<Error | null>;
export declare const validIconFormat: (icon: string) => boolean;
