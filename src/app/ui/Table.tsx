// src/app/ui/Table.tsx

import React from "react";

interface TableProps {
  headers: string[];
  data: (string | number)[][];
}

const Table: React.FC<TableProps> = ({ headers, data }) => {
  return (
    <div className="overflow-x-auto rounded-lg shadow">
      <table className="min-w-full bg-white dark:bg-gray-800">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr
              key={ri}
              className={ri % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700"}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;