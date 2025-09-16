import React from 'react';
import '../styles/Instructions.css';

type InstructionsProps = {
  instructions: string[];
};

const Instructions: React.FC<InstructionsProps> = (props) => (
  <div className="instructions-section">
    <h3 className="instructions__title">Instructions:</h3>
    <ol className="instructions__list">
      {props.instructions.map((instruction, index) => (
        <li key={index} className="instructions__item">{instruction}</li>
      ))}
    </ol>
  </div>
);

export default Instructions;
