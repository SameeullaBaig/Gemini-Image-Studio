/**
 * Aspect ratios supported by the Imagen 4 model for generation.
 */
export const generatorAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"] as const;
export type GeneratorAspectRatio = (typeof generatorAspectRatios)[number];

/**
 * Aspect ratios for cropping/analyzing an uploaded image.
 * Includes standard photo sizes, ordered from wide landscape to tall portrait.
 */
export const analyzerAspectRatios = ["16:9", "3:2", "4:3", "1:1", "3:4", "2:3", "9:16"] as const;
export type AnalyzerAspectRatio = string;
