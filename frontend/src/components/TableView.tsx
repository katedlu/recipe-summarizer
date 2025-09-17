import React, { useState } from 'react';
import '../styles/TableView.css';
import config from '../config';
import type { TableData, TableCell } from '../types/recipe.types';

interface TableViewProps {
  rawJson: any;
}

const TableView: React.FC<TableViewProps> = ({ rawJson }) => {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTable, setShowTable] = useState(false);

  const generateTable = async () => {
    if (tableData) {
      // If we already have table data, just toggle visibility
      setShowTable(!showTable);
      return;
    }

    // Generate new table data
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${config.apiUrl}/api/parse-to-table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw_json: rawJson }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate table');
      }

      const data = await response.json();
      setTableData(data);
      setShowTable(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate table');
    } finally {
      setLoading(false);
    }
  };

  const toggleTable = () => {
    if (tableData) {
      setShowTable(!showTable);
    } else {
      generateTable();
    }
  };

  return (
    <div className="table-view">
      <button 
        className="table-toggle-btn" 
        onClick={toggleTable}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="loading-spinner"></span>
            Generating Table...
          </>
        ) : showTable ? (
          'Hide Table'
        ) : (
          'Generate Cooking Workflow'
        )}
      </button>

      {error && (
        <div className="table-error">
          Error: {error}
        </div>
      )}

      {showTable && tableData && (
        <div className="table-container">
          <div className="table-header">
            <h3>{tableData.title}</h3>
          </div>
          <div className="table-content">
            <div className="workflow-table">
              <table>
                <thead>
                  <tr>
                    {tableData.table.headers.map((header, index) => (
                      <th key={index} className={index === 0 ? "ingredient-header" : "step-header"}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.table.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className={row.ingredient === "PREP TASKS" ? "prep-row" : "ingredient-row"}>
                      <td className="ingredient-cell">{row.ingredient}</td>
                      {row.cells.map((cell: TableCell, cellIndex) => {
                        // Handle different cell formats
                        if (typeof cell === 'object' && cell !== null) {
                          // Skip spanned cells - they don't render
                          if (cell.spanned) {
                            return null;
                          }
                          // Render cells with rowspan
                          if (cell.rowspan) {
                            return (
                              <td 
                                key={cellIndex} 
                                className="step-cell"
                                rowSpan={cell.rowspan}
                              >
                                {cell.text}
                              </td>
                            );
                          }
                          // Regular object format
                          return (
                            <td key={cellIndex} className="step-cell">
                              {cell.text}
                            </td>
                          );
                        }
                        // Handle string format (backwards compatibility)
                        return (
                          <td key={cellIndex} className="step-cell">
                            {cell as string}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableView;