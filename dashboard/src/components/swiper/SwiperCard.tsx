'use client'

import React from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'

interface SwiperCardProps {
  children: React.ReactNode[]
  className?: string
  autoplay?: boolean
  pagination?: boolean
  slidesPerView?: number
  spaceBetween?: number
}

const SwiperCard: React.FC<SwiperCardProps> = ({
  children,
  className = '',
  autoplay = true,
  pagination = true,
  slidesPerView = 1,
  spaceBetween = 30
}) => {
  return (
    <div className={`swiper-container ${className}`}>
      <Swiper
        modules={[Pagination, Autoplay]}
        spaceBetween={spaceBetween}
        slidesPerView={slidesPerView}
        pagination={pagination ? { clickable: true } : false}
        autoplay={autoplay ? { delay: 3000 } : false}
        className="swiper-card-advance-bg"
      >
        {children.map((child, index) => (
          <SwiperSlide key={index}>
            {child}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}

export default SwiperCard
