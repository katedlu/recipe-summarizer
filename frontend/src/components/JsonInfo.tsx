import React, { useState } from 'react';
import '../styles/JsonInfo.css';

interface JsonInfoProps {
  jsonData: any;
}

const JsonInfo: React.FC<JsonInfoProps> = ({ jsonData }) => {
  const [showJson, setShowJson] = useState(false);

  if (!jsonData) {
    return null;
  }

  const toggleJson = () => {
    setShowJson(!showJson);
  };

  return (
    <section className="json-info" aria-label="Raw Recipe Data">
      <button 
        className="button button--primary" 
        onClick={toggleJson}
        aria-expanded={showJson}
        aria-controls="json-container"
        aria-describedby="json-help"
      >
        {showJson ? 'Hide JSON' : 'Show JSON'}
      </button>
      <div id="json-help" className="sr-only">
        Toggle display of raw JSON data extracted from the recipe website
      </div>
      
      {showJson && (
        <div id="json-container" className="json-container" role="region" aria-label="Raw JSON Data Display">
          <h3>Raw JSON Data</h3>
          <pre className="json-display" aria-label="Recipe data in JSON format" tabIndex={0}>
            {JSON.stringify(jsonData, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
};

export default JsonInfo;