import React, { useMemo } from 'react';
import Badge, { type BadgeVariant } from './Badge';
import '../styles/RecipeInfo.css';

type RecipeInfoProps = {
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  yields?: string;
};

type BadgeConfig = {
  renderCondition: boolean;
  label: string;
  value: string;
  variant: BadgeVariant;
};

const RecipeInfo: React.FC<RecipeInfoProps> = (props) => {
  const visibleBadges = useMemo(() => {
    const badgeConfigs: BadgeConfig[] = [
      {
        renderCondition: props.prepTime !== undefined,
        label: 'Prep Time',
        value: `${props.prepTime} minutes`,
        variant: 'prep-time',
      },
      {
        renderCondition: props.cookTime !== undefined,
        label: 'Cook Time',
        value: `${props.cookTime} minutes`,
        variant: 'cook-time',
      },
      {
        renderCondition: props.totalTime !== undefined,
        label: 'Total Time',
        value: `${props.totalTime} minutes`,
        variant: 'total-time',
      },
      {
        renderCondition: !!props.yields?.trim(),
        label: 'Serves',
        value: props.yields || '',
        variant: 'serves',
      },
    ];

    return badgeConfigs.filter(badge => !!badge.renderCondition);
  }, [props.prepTime, props.cookTime, props.totalTime, props.yields]);

  if (visibleBadges.length === 0) {
    return null;
  }

  return (
    <div className="recipe-info">
      {visibleBadges.map((badge) => (
        <Badge 
          key={badge.variant}
          label={badge.label}
          value={badge.value}
          variant={badge.variant}
        />
      ))}
    </div>
  );
};

export default RecipeInfo;
