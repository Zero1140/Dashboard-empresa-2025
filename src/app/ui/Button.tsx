import React from "react";
import clsx from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "destructive";
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
  label?: string;
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  children,
  label,
  className,
  ...props
}) => {
  const base =
    "rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2";

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400",
    secondary:
      "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 focus:ring-gray-300",
    accent:
      "bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-300",
    destructive:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400",
  };

  const sizes = {
    sm: "text-sm px-3 py-1.5",
    md: "text-base px-4 py-2",
    lg: "text-lg px-5 py-3",
  };

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children ?? label}
    </button>
  );
};

export default Button;