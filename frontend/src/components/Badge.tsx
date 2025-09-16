import React from 'react';
import '../styles/Badge.css';

type BadgeVariant = 'prep-time' | 'cook-time' | 'total-time' | 'serves';

export type BadgeProps = {
  label: string;
  value: string | number;
  variant: BadgeVariant;
};

const Badge: React.FC<BadgeProps> = (props) => (
  <div className={`badge badge--${props.variant}`}>
    <strong>{props.label}:</strong> {props.value}
  </div>
);

export default Badge;
