import React, { useMemo } from 'react';
import Badge, { type BadgeProps } from './Badge';
import '../styles/RecipeInfo.css';

type RecipeInfoProps = {
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  yields?: string;
};

type BadgeConfig = BadgeProps & {
  renderCondition: boolean;
};

const RecipeInfo: React.FC<RecipeInfoProps> = (props) => {
  const visibleBadges = useMemo(() => {
    const badgeConfigs: BadgeConfig[] = [
      {
        renderCondition: props.prepTime !== undefined && props.prepTime !== null,
        label: 'Prep Time',
        value: `${props.prepTime} minutes`,
        variant: 'prep-time',
      },
      {
        renderCondition: props.cookTime !== undefined && props.cookTime !== null,
        label: 'Cook Time',
        value: `${props.cookTime} minutes`,
        variant: 'cook-time',
      },
      {
        renderCondition: props.totalTime !== undefined && props.totalTime !== null,
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
        <Badge key={badge.variant} {...badge} />
      ))}
    </div>
  );
};

export default RecipeInfo;
