import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import '../styles/TableView.css';
import config from '../config';
import type { TableData, TableCell } from '../types/recipe.types';
import LoadingMessage from './LoadingMessage';

// Component to render markdown table as HTML table
const MarkdownTableRenderer: React.FC<{ markdownTable: string }> = ({ markdownTable }) => {
  // Parse markdown table into rows
  const lines = markdownTable.split('\n').filter(line => line.trim());
  const parsedRows = lines.map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));

  // Calculate vertical merges for each column
  const calculateMerges = () => {
    const merges: { [key: string]: { rowSpan: number; isSpanned: boolean } } = {};

    // Skip prep rows (first 2), only process ingredient rows
    const ingredientRows = parsedRows.slice(2);

    // For each column (skip first column which is ingredients)
    for (let colIndex = 1; colIndex < parsedRows[0].length; colIndex++) {
      let currentGroup: number[] = [];
      let currentValue = '';

      for (let rowIndex = 0; rowIndex < ingredientRows.length; rowIndex++) {
        const actualRowIndex = rowIndex + 2; // Account for prep rows
        const cellValue = ingredientRows[rowIndex][colIndex];

        if (cellValue === currentValue && cellValue !== '') {
          // Continue the group
          currentGroup.push(actualRowIndex);
        } else {
          // Process the previous group if it has multiple rows
          if (currentGroup.length > 1) {
            // First row gets rowSpan
            merges[`${currentGroup[0]}-${colIndex}`] = { rowSpan: currentGroup.length, isSpanned: false };
            // Other rows are marked as spanned
            for (let i = 1; i < currentGroup.length; i++) {
              merges[`${currentGroup[i]}-${colIndex}`] = { rowSpan: 1, isSpanned: true };
            }
          }

          // Start new group
          currentGroup = cellValue !== '' ? [actualRowIndex] : [];
          currentValue = cellValue;
        }
      }

      // Process the final group
      if (currentGroup.length > 1) {
        merges[`${currentGroup[0]}-${colIndex}`] = { rowSpan: currentGroup.length, isSpanned: false };
        for (let i = 1; i < currentGroup.length; i++) {
          merges[`${currentGroup[i]}-${colIndex}`] = { rowSpan: 1, isSpanned: true };
        }
      }
    }

    return merges;
  };

  const merges = calculateMerges();

  return (
    <div className="workflow-table">
      <table aria-labelledby="table-title" aria-describedby="table-description">
        <caption id="table-description" className="sr-only">
          Begin by prepping the ingredients. Then, work chronologically by moving left to right through the ingredients table. 
        </caption>
        <tbody>
          {parsedRows.map((cells, rowIndex) => {
            const isPrep = rowIndex < 2; // First two rows are prep

            return (
              <tr key={rowIndex} className={isPrep ? "prep-row" : "ingredient-row"}>
                {cells.map((cell, cellIndex) => {
                  if (cellIndex === 0) {
                    // First column - ingredient or prep task
                    if (isPrep && cell) {
                      // For prep rows, span the text across all columns
                      return (
                        <th key={cellIndex} scope="row" className="ingredient-cell prep-cell" colSpan={cells.length}>
                          {cell}
                        </th>
                      );
                    } else {
                      // Regular ingredient row
                      return (
                        <th key={cellIndex} scope="row" className="ingredient-cell">
                          {cell}
                        </th>
                      );
                    }
                  } else if (isPrep) {
                    // For prep rows, we've already spanned the first cell, so skip the rest
                    return null;
                  } else {
                    // Other columns - steps (only for ingredient rows)
                    const mergeKey = `${rowIndex}-${cellIndex}`;
                    const mergeInfo = merges[mergeKey];

                    if (mergeInfo && mergeInfo.isSpanned) {
                      // This cell is part of a vertical merge and should not render
                      return null;
                    } else if (mergeInfo && mergeInfo.rowSpan > 1) {
                      // This is the first cell of a vertical merge
                      return (
                        <td key={cellIndex} className="step-cell" rowSpan={mergeInfo.rowSpan}>
                          {cell}
                        </td>
                      );
                    } else {
                      // Regular cell
                      return (
                        <td key={cellIndex} className="step-cell">
                          {cell}
                        </td>
                      );
                    }
                  }
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

interface TableViewProps {
  rawJson: any;
}

const TableView: React.FC<TableViewProps> = ({ rawJson }) => {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTable, setShowTable] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

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

      // Check if we got the new markdown format
      if (data.format === 'markdown' && data.markdown_table) {
        // Extract recipe name and source from rawJson
        const recipeName = rawJson?.name || rawJson?.title || "Recipe";
        
        // Try multiple possible source fields
        const recipeSource = rawJson?.source_url || 
                           rawJson?.url || 
                           rawJson?.source || 
                           rawJson?.website_url ||
                           rawJson?.site_url ||
                           rawJson?.host ||
                           rawJson?.domain ||
                           "";
        
        console.log('Recipe data:', { recipeName, recipeSource, rawJson }); // Debug info
        
        // Format the title as "Recipe Name, source"
        let title = recipeName;
        if (recipeSource) {
          // Extract domain from URL if it's a full URL
          let sourceDomain = recipeSource;
          try {
            if (recipeSource.startsWith('http')) {
              sourceDomain = new URL(recipeSource).hostname.replace('www.', '');
            }
          } catch (e) {
            // If URL parsing fails, use the original string
            sourceDomain = recipeSource;
          }
          title = `${recipeName}, ${sourceDomain}`;
        }
        
        console.log('Final title:', title); // Debug info
        
        // Convert markdown table to display format
        setTableData({
          title: title,
          format: "markdown",
          markdown_table: data.markdown_table
        });
      } else {
        // Handle old format if still present
        setTableData(data);
      }
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

  const printToPDF = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Unable to open print window. Please check your browser settings.');
      return;
    }

    // Get the table HTML
    const table = tableRef.current?.querySelector('table');
    if (!table) {
      setError('Table not found');
      printWindow.close();
      return;
    }

    // Create the print document
    const printDocument = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${tableData?.title || 'Recipe Workflow'}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 0.5in;
          }
          
          @media print {
            body {
              font-family: 'DM Sans', Arial, sans-serif;
              font-size: 10px;
              line-height: 1.2;
              margin: 0;
              padding: 0;
            }
            
            .recipe-title {
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #333;
              font-family: 'DM Sans', Arial, sans-serif;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              page-break-inside: avoid;
            }
            
            /* Add spacing after table caption/description */
            caption {
              margin-bottom: 20px;
              padding-bottom: 10px;
            }
            
            th, td {
              border: 1px solid #000;
              padding: 4px 6px;
              vertical-align: middle;
              word-wrap: break-word;
              overflow-wrap: break-word;
              font-size: 9px;
              line-height: 1.3;
              text-align: center; /* Center all text in cells */
              font-family: 'DM Sans', Arial, sans-serif;
            }
            
            th {
              background-color: #f0f0f0 !important;
              font-weight: bold;
              text-align: center;
              font-size: 10px;
              font-family: 'DM Sans', Arial, sans-serif;
            }
            
            .ingredient-cell {
              font-weight: 600;
              background-color: white !important;
              text-align: center; /* Center ingredient text */
            }
            
            .step-cell {
              background-color: white !important;
              text-align: center; /* Center step text */
            }
            
            .merged-cell {
              background-color: #f8f8f8 !important;
              font-weight: 600;
              text-align: center; /* Center merged cell text */
            }
            
            .prep-cell {
              background-color: #e3f2fd !important;
              font-weight: bold;
              text-align: center;
              color: #1565c0;
            }
            
            /* Ensure alternating rows are visible in print */
            tr:nth-child(even) .ingredient-cell,
            tr:nth-child(even) .step-cell {
              background-color: #f9f9f9 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="recipe-title">${tableData?.title || 'Recipe Cooking Workflow'}</div>
        ${table.outerHTML}
      </body>
      </html>
    `;

    // Write the document and print
    printWindow.document.write(printDocument);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  return (
    <section className="table-view" aria-label="Recipe Workflow Table">
      <div className="table-controls">
        <button
          className="button button--primary"
          onClick={toggleTable}
          disabled={loading}
          aria-describedby={loading ? "loading-status" : undefined}
          aria-expanded={showTable}
          aria-controls="workflow-table-container"
        >
          {loading ? (
            <>
              <span className="loading-spinner" aria-hidden="true"></span>
              Generating...
            </>
          ) : showTable ? (
            'Hide Table'
          ) : (
            'Generate Cooking Workflow'
          )}
        </button>
        <LoadingMessage isLoading={loading} />
      </div>

      {error && (
        <div className="table-error" role="alert" aria-live="polite">
          Error: {error}
        </div>
      )}

      {showTable && tableData && (
        <div id="workflow-table-container" className="table-container" ref={tableRef} role="region" aria-label="Generated cooking workflow">
          <div className="table-header">
            <h3 id="table-title">{tableData.title}</h3>
            <button
              className="button button--primary"
              onClick={printToPDF}
              aria-label="Print table as PDF"
              aria-describedby="print-help"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M6 9V2C6 1.44772 6.44772 1 7 1H17C17.5523 1 18 1.44772 18 2V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 18H4C3.44772 18 3 17.5523 3 17V11C3 10.4477 3.44772 10 4 10H20C20.5523 10 21 10.4477 21 11V17C21 17.5523 20.5523 18 20 18H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 14H18V23H6V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Print Recipe
            </button>
            <div id="print-help" className="sr-only">
              Opens print dialog to save the cooking workflow table as a PDF on one page
            </div>
          </div>
          <div className="table-content">
            {tableData.format === 'markdown' && tableData.markdown_table ? (
              <MarkdownTableRenderer markdownTable={tableData.markdown_table} />
            ) : tableData.table ? (
              <div className="workflow-table">
                <table aria-labelledby="table-title" aria-describedby="table-description">
                  <caption id="table-description" className="sr-only">
                    Begin by prepping the ingredients. Then, work chronologically by moving left to right through the ingredients table.
                  </caption>
                  <thead>
                    <tr>
                      {tableData.table.headers.map((header, index) => (
                        <th
                          key={index}
                          className={index === 0 ? "ingredient-header" : "step-header"}
                          scope="col"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className={row.ingredient === "PREP TASKS" ? "prep-row" : "ingredient-row"}>
                        <th scope="row" className="ingredient-cell">{row.ingredient}</th>
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
            ) : (
              <div className="error">No table data available</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default TableView;