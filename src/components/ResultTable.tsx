import type { TabularResult } from "../sql/result-policy";

export function ResultTable({ result }: { result: TabularResult }) {
  if (result.rows.length === 0) return <p className="empty-result">Query returned zero rows.</p>;

  return (
    <div className="result-scroll">
      <table className="result-table">
        <thead>
          <tr>
            {result.columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.slice(0, 50).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {result.columns.map((column) => (
                <td key={column}>{formatCell(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null) return "NULL";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
