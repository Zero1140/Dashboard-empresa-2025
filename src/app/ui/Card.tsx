import { ReactNode } from "react";

export default function Card({
  title,
  value,
  children,
}: {
  title: string;
  value: string | number;
  children?: ReactNode;
}) {
  return (
    <div className="bg-white shadow rounded p-4 flex flex-col justify-between">
      <h3 className="text-sm text-gray-500">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
      <div className="mt-4 text-sm text-gray-700">{children}</div>
    </div>
  );
}