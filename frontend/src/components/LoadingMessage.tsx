import React, { useState, useEffect } from 'react';
import '../styles/LoadingMessage.css';

interface LoadingMessageProps {
  isLoading: boolean;
}

const messages = [
  'Feel free to prep ingredients in the meantime',
  'Organizing your culinary adventure...',
  'Teaching your ingredients to line up properly...',
  'Calculating optimal stirring sequences...',
  'Consulting with the recipe wizards...',
  'Arranging ingredients by their cooking personalities...',
  'Making sure all spoons are accounted for...',
  'Convincing stubborn ingredients to cooperate...',
  'Building your kitchen game plan...'
];

const LoadingMessage: React.FC<LoadingMessageProps> = ({ isLoading }) => {
  const [messageIndex, setMessageIndex] = useState(0);

  // Rotate loading messages with random duration between 5-7 seconds
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const scheduleNextMessage = () => {
      if (isLoading) {
        const randomDuration = Math.floor(Math.random() * 1000) + 3000;
        timeout = setTimeout(() => {
          setMessageIndex(prev => (prev + 1) % messages.length);
          scheduleNextMessage(); // Schedule the next message
        }, randomDuration);
      }
    };

    if (isLoading) {
      scheduleNextMessage();
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoading]);

  if (!isLoading) {
    return null;
  }

  return (
    <>
      <div className="loading-message">{messages[messageIndex]}</div>
      <div id="loading-status" className="sr-only" aria-live="polite">
        {messages[messageIndex]}
      </div>
    </>
  );
};

export default LoadingMessage;
