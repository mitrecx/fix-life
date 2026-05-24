import { Spin } from "antd";
import type { SpinProps } from "antd";

export type LoadingSpinnerSize = NonNullable<SpinProps["size"]>;

export interface LoadingSpinnerProps {
  size?: LoadingSpinnerSize;
  label?: string;
  className?: string;
  /** Centered block with vertical padding */
  block?: boolean;
  /** Inline flex item for buttons and compact rows */
  inline?: boolean;
}

export function LoadingSpinner({
  size = "default",
  label,
  className = "",
  block = false,
  inline = false,
}: LoadingSpinnerProps) {
  if (inline) {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <Spin size={size} />
      </span>
    );
  }

  if (block || label) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 ${block ? "py-12" : ""} ${className}`}
        role="status"
        aria-live="polite"
        aria-label={label ?? "加载中"}
      >
        <Spin size={size} />
        {label ? <span className="text-sm text-gray-500">{label}</span> : null}
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-label="加载中"
    >
      <Spin size={size} />
    </span>
  );
}

export default LoadingSpinner;
