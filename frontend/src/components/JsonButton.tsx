import React, { useState } from 'react';
import Modal from './Modal';
import '../styles/JsonInfo.css';

type JsonButtonProps = {
  jsonData: any;
};

const JsonButton: React.FC<JsonButtonProps> = (props) => {
  const [showModal, setShowModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCopySuccess(false); // Reset copy status when modal closes
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(props.jsonData, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <>
      <button 
        className="button button--discrete" 
        onClick={openModal}
        aria-describedby="json-help"
      >
        Raw Data
      </button>
      <div id="json-help" className="sr-only">
        View raw JSON data extracted from the recipe website
      </div>
      
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title="Raw Recipe Data"
      >
        <div className="modal-json-container">
          <div className="modal-json-wrapper">
            <button 
              className="button button--discrete modal-copy-button"
              onClick={copyToClipboard}
              aria-label="Copy JSON data to clipboard"
            >
              {copySuccess ? '✓ Copied!' : 'Copy'}
            </button>
            <pre className="modal-json-display" aria-label="Recipe data in JSON format" tabIndex={0}>
              {JSON.stringify(props.jsonData, null, 2)}
            </pre>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default JsonButton;