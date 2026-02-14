/** Maximum prompts per 5-hour window (MiniMax Coding Plan Max limit) */
export const MAX_PROMPTS_PER_WINDOW = 1000;

/** Default Opus pricing — used when user hasn't configured custom pricing */
export const DEFAULT_OPUS_PRICING = {
  inputPerMillion: 15,
  outputPerMillion: 75,
} as const;

/** Maximum size (bytes) of usage JSON file we'll read. Prevents loading huge files. */
export const MAX_USAGE_FILE_SIZE = 1_048_576; // 1 MB
