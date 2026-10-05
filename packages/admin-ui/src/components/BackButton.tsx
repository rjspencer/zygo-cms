import React from 'react';
import { Button } from '@radix-ui/themes';
import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { useNavigate } from 'react-router-dom';

export interface BackButtonProps {
  to?: string;
  onClick?: () => void;
  label?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
  to,
  onClick,
  label = 'Back',
  className,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button
      variant="ghost"
      color="gray"
      onClick={handleClick}
      className={className}
    >
      <ArrowLeftIcon width="16" height="16" />
      {label}
    </Button>
  );
};

export default BackButton;
