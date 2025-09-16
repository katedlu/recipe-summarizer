import React from 'react';
import '../styles/Equipment.css';

type EquipmentProps = {
  equipment: string[];
};

const Equipment: React.FC<EquipmentProps> = (props) => {
  if (props.equipment.length === 0) {
    return null;
  }

  return (
    <div className="equipment">
      <h3 className="equipment__title">Equipment Needed:</h3>
      <div className="equipment__list">
        {props.equipment.map((item, index) => (
          <span key={index} className="equipment__item">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Equipment;
