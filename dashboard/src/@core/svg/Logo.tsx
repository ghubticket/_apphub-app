// React Imports
import type { SVGAttributes } from 'react'

const Logo = (props: SVGAttributes<SVGElement>) => {
  return (
    <svg width='2em' height='1.2em' viewBox='0 0 100 60' fill='none' xmlns='http://www.w3.org/2000/svg' {...props}>
      {/* 5521 Logo Design */}
      <defs>
        <linearGradient id="5521Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E91E63" />
          <stop offset="100%" stopColor="#2196F3" />
        </linearGradient>
      </defs>
      
      {/* Number 5 */}
      <path
        d="M5 10 L5 15 L15 15 L15 25 L5 25 L5 30 L20 30 L20 10 L5 10 Z"
        fill="url(#5521Gradient)"
        stroke="currentColor"
        strokeWidth="1"
      />
      
      {/* Number 5 (second part) */}
      <path
        d="M25 10 L25 15 L35 15 L35 25 L25 25 L25 30 L40 30 L40 10 L25 10 Z"
        fill="url(#5521Gradient)"
        stroke="currentColor"
        strokeWidth="1"
      />
      
      {/* Number 2 */}
      <path
        d="M45 10 L45 15 L60 15 L60 20 L45 20 L45 25 L60 25 L60 30 L45 30 L45 35 L65 35 L65 10 L45 10 Z"
        fill="url(#5521Gradient)"
        stroke="currentColor"
        strokeWidth="1"
      />
      
      {/* Number 1 */}
      <path
        d="M70 10 L70 35 L75 35 L75 10 L70 10 Z"
        fill="url(#5521Gradient)"
        stroke="currentColor"
        strokeWidth="1"
      />
      
      {/* Decorative elements */}
      <circle cx="85" cy="20" r="3" fill="#E91E63" opacity="0.8" />
      <circle cx="90" cy="25" r="2" fill="#2196F3" opacity="0.8" />
      <circle cx="85" cy="30" r="2" fill="#E91E63" opacity="0.6" />
    </svg>
  )
}

export default Logo
