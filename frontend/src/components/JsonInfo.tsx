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
    <div className="json-info">
      <button 
        className="json-toggle-button" 
        onClick={toggleJson}
      >
        {showJson ? 'Hide JSON' : 'Show JSON'}
      </button>
      
      {showJson && (
        <div className="json-container">
          <h3>Raw JSON Data</h3>
          <pre className="json-display">
            {JSON.stringify(jsonData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default JsonInfo;