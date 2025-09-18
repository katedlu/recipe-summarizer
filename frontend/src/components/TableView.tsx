import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
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

  const saveAsImage = async () => {
    if (!tableRef.current || !tableData) return;
    
    setSavingImage(true);
    try {
      console.log('Starting improved image capture...');
      
      // Create a temporary container for clean capture
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.top = '-9999px';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = 'auto';
      tempContainer.style.height = 'auto';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.padding = '20px';
      tempContainer.style.fontFamily = "'DM Sans', 'Segoe UI', sans-serif";
      
      // Clone the table container content
      const originalContainer = tableRef.current;
      const clonedContainer = originalContainer.cloneNode(true) as HTMLElement;
      
      // Style the cloned container for optimal capture
      clonedContainer.style.width = 'auto';
      clonedContainer.style.height = 'auto';
      clonedContainer.style.maxHeight = 'none';
      clonedContainer.style.overflow = 'visible';
      clonedContainer.style.border = '1px solid #e0e0e0';
      clonedContainer.style.borderRadius = '12px';
      clonedContainer.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
      
      // Find and style the table content
      const clonedContent = clonedContainer.querySelector('.table-content') as HTMLElement;
      if (clonedContent) {
        clonedContent.style.maxHeight = 'none';
        clonedContent.style.overflow = 'visible';
        clonedContent.style.width = 'auto';
        clonedContent.style.height = 'auto';
      }
      
      // Find and style the workflow table
      const clonedTable = clonedContainer.querySelector('.workflow-table') as HTMLElement;
      if (clonedTable) {
        clonedTable.style.width = 'auto';
        clonedTable.style.maxWidth = '1200px'; // Prevent excessive stretching
        clonedTable.style.minWidth = '600px'; // Ensure minimum readability
        
        // Ensure the actual table element has proper styling
        const tableElement = clonedTable.querySelector('table') as HTMLElement;
        if (tableElement) {
          tableElement.style.width = '100%';
          tableElement.style.tableLayout = 'fixed'; // Use fixed layout for consistent column widths
          tableElement.style.borderCollapse = 'collapse';
          
          // Calculate and set column widths based on content
          const headers = tableElement.querySelectorAll('thead th');
          const totalColumns = headers.length;
          
          if (totalColumns > 0) {
            // Set intelligent column widths
            const ingredientColumnWidth = '200px'; // Fixed width for ingredient column
            const remainingWidth = `calc((100% - 200px) / ${totalColumns - 1})`;
            
            headers.forEach((header, index) => {
              const headerElement = header as HTMLElement;
              if (index === 0) {
                // Ingredient column - fixed width
                headerElement.style.width = ingredientColumnWidth;
                headerElement.style.minWidth = ingredientColumnWidth;
                headerElement.style.maxWidth = ingredientColumnWidth;
              } else {
                // Step columns - equal width distribution
                headerElement.style.width = remainingWidth;
                headerElement.style.minWidth = '120px';
                headerElement.style.maxWidth = '250px';
              }
            });
          }
          
          // Fix sticky header issue - remove sticky positioning for capture
          const headerCells = tableElement.querySelectorAll('thead th');
          headerCells.forEach(cell => {
            const cellElement = cell as HTMLElement;
            cellElement.style.position = 'static';
            cellElement.style.top = 'auto';
            cellElement.style.zIndex = 'auto';
            // Ensure header styling is preserved
            cellElement.style.backgroundColor = '#495057';
            cellElement.style.color = 'white';
            cellElement.style.fontWeight = '700';
            cellElement.style.fontSize = '14px';
            cellElement.style.textTransform = 'uppercase';
            cellElement.style.letterSpacing = '0.5px';
            cellElement.style.borderBottom = '3px solid #28a745';
          });
          
          // Ensure ingredient headers have the correct green background
          const ingredientHeaders = tableElement.querySelectorAll('thead th.ingredient-header');
          ingredientHeaders.forEach(cell => {
            const cellElement = cell as HTMLElement;
            cellElement.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
          });
          
          // Ensure all cells have proper padding and borders with controlled text wrapping
          const cells = tableElement.querySelectorAll('th, td');
          cells.forEach((cell, index) => {
            const cellElement = cell as HTMLElement;
            cellElement.style.padding = '12px 10px';
            cellElement.style.border = '1px solid #dee2e6';
            cellElement.style.verticalAlign = 'top';
            cellElement.style.lineHeight = '1.4';
            cellElement.style.fontSize = '13px';
            
            // Apply different text wrapping based on column type
            const isIngredientColumn = cell.closest('tr')?.cells[0] === cell || 
                                     cell.classList.contains('ingredient-cell') ||
                                     cell.classList.contains('ingredient-header');
            
            if (isIngredientColumn) {
              // Ingredient column - allow some wrapping but keep compact
              cellElement.style.whiteSpace = 'normal';
              cellElement.style.wordWrap = 'break-word';
              cellElement.style.maxWidth = '200px';
            } else {
              // Step columns - allow wrapping for better readability
              cellElement.style.whiteSpace = 'normal';
              cellElement.style.wordWrap = 'break-word';
              cellElement.style.maxWidth = '250px';
              cellElement.style.hyphens = 'auto';
            }
          });
        }
      }
      
      // Remove any problematic elements (like save buttons)
      const saveButtons = clonedContainer.querySelectorAll('button');
      saveButtons.forEach(button => {
        const buttonElement = button as HTMLElement;
        if (buttonElement.textContent?.includes('Save') || buttonElement.getAttribute('aria-label')?.includes('Save')) {
          buttonElement.remove();
        }
      });
      
      tempContainer.appendChild(clonedContainer);
      document.body.appendChild(tempContainer);
      
      // Wait for layout to stabilize
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Measure the actual content dimensions with improved calculation
      const containerRect = clonedContainer.getBoundingClientRect();
      const tableRect = clonedTable?.getBoundingClientRect();
      
      // Use controlled dimensions to prevent excessive stretching
      const actualWidth = Math.min(
        Math.max(
          clonedContainer.scrollWidth, 
          containerRect.width,
          tableRect?.width || 0,
          600 // minimum width
        ),
        1240 // maximum width (1200px table + 40px padding)
      );
      
      const actualHeight = Math.max(
        clonedContainer.scrollHeight, 
        containerRect.height,
        tableRect?.height || 0
      );
      
      console.log('Capture dimensions:', { 
        width: actualWidth, 
        height: actualHeight,
        containerScrollWidth: clonedContainer.scrollWidth,
        containerRect: containerRect
      });
      
      // Capture with clean settings
      const canvas = await html2canvas(clonedContainer, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution for better quality
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: actualWidth,
        height: actualHeight,
        scrollX: 0,
        scrollY: 0,
        // Ensure we capture from the very top
        y: 0,
        x: 0,
        onclone: (clonedDoc) => {
          // Ensure fonts are loaded in the cloned document
          const style = clonedDoc.createElement('style');
          style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
            * { font-family: 'DM Sans', 'Segoe UI', sans-serif !important; }
            
            /* Ensure header is visible and not sticky in the clone */
            .workflow-table thead th {
              position: static !important;
              top: auto !important;
              z-index: auto !important;
              background: linear-gradient(135deg, #495057 0%, #343a40 100%) !important;
              color: white !important;
              font-weight: 700 !important;
              font-size: 14px !important;
              text-transform: uppercase !important;
              letter-spacing: 0.5px !important;
              border-bottom: 3px solid #28a745 !important;
              padding: 12px 10px !important;
            }
            
            .workflow-table thead th.ingredient-header {
              background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important;
            }
            
            /* Controlled table layout and column widths */
            .workflow-table table {
              width: 100% !important;
              table-layout: fixed !important;
              border-collapse: collapse !important;
              max-width: 1200px !important;
            }
            
            .workflow-table {
              max-width: 1200px !important;
              min-width: 600px !important;
            }
            
            /* Prevent column stretching */
            .workflow-table th, .workflow-table td {
              padding: 12px 10px !important;
              border: 1px solid #dee2e6 !important;
              vertical-align: top !important;
              line-height: 1.4 !important;
              font-size: 13px !important;
              white-space: normal !important;
              word-wrap: break-word !important;
              hyphens: auto !important;
            }
            
            /* Specific column width controls */
            .workflow-table thead th:first-child,
            .workflow-table .ingredient-cell {
              width: 200px !important;
              max-width: 200px !important;
              min-width: 180px !important;
            }
            
            .workflow-table thead th:not(:first-child),
            .workflow-table .step-cell {
              max-width: 250px !important;
              min-width: 120px !important;
            }
            
            /* Ensure all regular cells get proper backgrounds - default white */
            .workflow-table td {
              background: white !important;
            }
            
            /* Empty cells should be neutral */
            .workflow-table td:empty,
            .workflow-table .step-cell:empty {
              background: #f8f9fa !important;
            }
            
            /* Specific styling for ingredient rows (override defaults) */
            .workflow-table .ingredient-row:nth-child(even) td {
              background: #f8f9fa !important;
            }
            
            .workflow-table .ingredient-row:nth-child(odd) td {
              background: white !important;
            }
            
            /* PREP TASKS row styling - clean appearance for exports */
            .workflow-table tr.prep-row td {
              background: white !important;
              font-weight: 600 !important;
            }
            
            .workflow-table tr.prep-row td.ingredient-cell {
              background: white !important;
              color: #333 !important;
              font-weight: 700 !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
      // Clean up
      document.body.removeChild(tempContainer);

      console.log('Canvas created:', {
        width: canvas.width,
        height: canvas.height
      });

      // Check if canvas has content
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas has no dimensions');
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
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
          </div>
        </div>
      )}
    </section>
  );
};

export default TableView;