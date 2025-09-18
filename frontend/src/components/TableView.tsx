import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import '../styles/TableView.css';
import config from '../config';
import type { TableData, TableCell } from '../types/recipe.types';

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
          A cooking workflow table showing ingredients and their corresponding preparation steps organized chronologically
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
                        <td key={cellIndex} className="step-cell merged-cell" rowSpan={mergeInfo.rowSpan}>
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
  const [savingImage, setSavingImage] = useState(false);
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
        // Convert markdown table to display format
        setTableData({
          title: "Recipe Cooking Workflow",
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

  const saveAsImage = async () => {
    if (!tableRef.current || !tableData) return;

    setSavingImage(true);
    try {
      const tableContainer = tableRef.current;

      console.log('Starting image capture...');

      // Add capture mode class
      tableContainer.classList.add('capture-mode');

      // Wait for layout to stabilize and allow table to expand to full width
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get the workflow table element which contains the actual table
      const workflowTable = tableContainer.querySelector('.workflow-table') as HTMLElement;
      if (!workflowTable) {
        throw new Error('Workflow table element not found');
      }

      console.log('Container dimensions:', {
        containerWidth: tableContainer.offsetWidth,
        containerHeight: tableContainer.offsetHeight,
        containerScrollWidth: tableContainer.scrollWidth,
        containerScrollHeight: tableContainer.scrollHeight,
        workflowTableWidth: workflowTable.offsetWidth,
        workflowTableHeight: workflowTable.offsetHeight,
        workflowTableScrollWidth: workflowTable.scrollWidth,
        workflowTableScrollHeight: workflowTable.scrollHeight
      });

      // Capture the entire container but with expanded dimensions
      const captureWidth = Math.max(
        tableContainer.scrollWidth,
        workflowTable.scrollWidth,
        tableContainer.offsetWidth
      );
      const captureHeight = Math.max(
        tableContainer.scrollHeight,
        workflowTable.scrollHeight,
        tableContainer.offsetHeight
      );

      console.log('Capture dimensions:', { captureWidth, captureHeight });

      // Configure html2canvas with explicit dimensions to capture full width
      const canvas = await html2canvas(tableContainer, {
        backgroundColor: '#ffffff',
        scale: 1,
        useCORS: true,
        allowTaint: true,
        logging: true,
        width: captureWidth,
        height: captureHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: captureWidth,
        windowHeight: captureHeight,
        onclone: (clonedDoc) => {
          console.log('Document cloned for capture');
          // Ensure cloned elements have capture mode styles and expanded width
          const clonedContainer = clonedDoc.querySelector('.table-container') as HTMLElement;
          if (clonedContainer) {
            clonedContainer.classList.add('capture-mode');
            clonedContainer.style.width = `${captureWidth}px`;
            clonedContainer.style.height = `${captureHeight}px`;

            const clonedContent = clonedContainer.querySelector('.table-content') as HTMLElement;
            if (clonedContent) {
              clonedContent.style.width = `${captureWidth}px`;
              clonedContent.style.height = `${captureHeight}px`;
            }

            const clonedWorkflowTable = clonedContainer.querySelector('.workflow-table') as HTMLElement;
            if (clonedWorkflowTable) {
              clonedWorkflowTable.style.width = `${captureWidth}px`;
            }
          }
        }
      });

      console.log('Canvas created:', {
        width: canvas.width,
        height: canvas.height
      });

      // Remove capture mode class
      tableContainer.classList.remove('capture-mode');

      // Check if canvas has content
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas has no dimensions');
      }

      // Check if canvas is actually empty (all white pixels)
      const ctx = canvas.getContext('2d');
      const imageData = ctx?.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100));
      const data = imageData?.data;
      let hasContent = false;

      if (data) {
        // Check if any pixel is not white (sample first 100x100 pixels for performance)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // If we find a non-white pixel (considering alpha), we have content
          if (a > 0 && (r < 255 || g < 255 || b < 255)) {
            hasContent = true;
            break;
          }
        }
      }

      if (!hasContent) {
        console.warn('Canvas appears to be mostly white, but proceeding with save');
      }

      // Convert canvas to blob and save
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          console.log('Blob created successfully, size:', blob.size);
          const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
          const filename = `${tableData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_cooking_workflow_${timestamp}.png`;

          saveAs(blob, filename);
        } else {
          throw new Error('Failed to create image blob');
        }
      }, 'image/png', 1.0);

    } catch (error) {
      console.error('Error saving image:', error);
      // Remove capture mode class in case of error
      if (tableRef.current) {
        tableRef.current.classList.remove('capture-mode');
      }
      setError(`Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <section className="table-view" aria-label="Recipe Workflow Table">
      <div className="table-controls">
        <button
          className="button button--primary"
          onClick={toggleTable}
          disabled={loading}
          aria-describedby={loading ? "table-loading-status" : undefined}
          aria-expanded={showTable}
          aria-controls="workflow-table-container"
        >
          {loading ? (
            <>
              <span className="loading-spinner" aria-hidden="true"></span>
              Generating Table...
            </>
          ) : showTable ? (
            'Hide Table'
          ) : (
            'Generate Cooking Workflow'
          )}
        </button>
        {loading && (
          <div id="table-loading-status" className="sr-only" aria-live="polite">
            Generating cooking workflow table, please wait...
          </div>
        )}
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
              className="button button--secondary button--small"
              onClick={saveAsImage}
              disabled={savingImage}
              aria-label="Save table as PNG image"
              aria-describedby={savingImage ? "save-loading-status" : "save-help"}
            >
              {savingImage ? (
                <>
                  <span className="loading-spinner" aria-hidden="true"></span>
                  Saving...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Save Image
                </>
              )}
            </button>
            {savingImage && (
              <div id="save-loading-status" className="sr-only" aria-live="polite">
                Saving table as image, please wait...
              </div>
            )}
            {!savingImage && (
              <div id="save-help" className="sr-only">
                Downloads the cooking workflow table as a PNG image file
              </div>
            )}
          </div>
          <div className="table-content">
            {tableData.format === 'markdown' && tableData.markdown_table ? (
              <MarkdownTableRenderer markdownTable={tableData.markdown_table} />
            ) : tableData.table ? (
              <div className="workflow-table">
                <table aria-labelledby="table-title" aria-describedby="table-description">
                  <caption id="table-description" className="sr-only">
                    A cooking workflow table showing ingredients and their corresponding preparation steps organized chronologically
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