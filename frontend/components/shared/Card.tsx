import { ReactNode } from 'react';
import styles from './Card.module.scss';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({ 
  children, 
  className = '',
  padding = 'md'
}: CardProps) {
  return (
    <div className={`${styles.card} ${styles[padding]} ${className}`}>
      {children}
    </div>
  );
}

