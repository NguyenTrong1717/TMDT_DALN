export const DEFAULT_IMAGE = "/images/default_01.png";

export function getImageUrl(imagePath) {
  if (!imagePath || typeof imagePath !== "string") return DEFAULT_IMAGE;

  const trimmed = imagePath.trim();
  if (!trimmed) return DEFAULT_IMAGE;

  // Already an absolute URL
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Common format in db.json: "/images/<file>"
  if (trimmed.startsWith("/images/")) return trimmed;

  // If someone stored only "images/<file>", normalize to "/images/"
  if (trimmed.startsWith("images/")) return `/${trimmed}`;

  // If stored as just "<file>", try to resolve under public/images
  if (!trimmed.includes("/") && trimmed.includes("."))
    return `/images/${trimmed}`;

  return DEFAULT_IMAGE;
}
