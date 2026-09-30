/**
 * Reddit's upvote arrow, drawn in currentColor so it takes the gold the star
 * ratings use beside it. Decorative: the text next to it carries the meaning.
 */
export default function UpvoteIcon({ size = '0.85em' }: { size?: string }) {
  return (
    <svg
      className="upvote-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3 3 13h5.5v8h7v-8H21L12 3Z" />
    </svg>
  );
}
