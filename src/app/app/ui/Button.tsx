// src/app/ui/Button.tsx

import React from "react";
import clsx from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent";
  children?: React.ReactNode;
  label?: string;
}

const Button: React.FC<ButtonProps> = ({ variant = "primary", children, label, ...props }) => {
  const base = "px-4 py-2 rounded-md font-medium transition-colors duration-200 focus:outline-none focus:ring-2";

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 focus:ring-gray-300",
    accent: "bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-300",
  };

  return (
    <button className={clsx(base, variants[variant])} {...props}>
      {children ?? label}
    </button>
  );
};

export default Button;