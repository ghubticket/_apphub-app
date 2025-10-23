'use client'

import React, { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

// Import ApexCharts dynamically to avoid SSR issues
const ApexCharts = dynamic(() => import('react-apexcharts'), { ssr: false })

interface ApexChartProps {
  options: any
  series: any[]
  type: 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radialBar' | 'radar' | 'heatmap' | 'treemap'
  height?: number | string
  width?: number | string
}

const ApexChartComponent: React.FC<ApexChartProps> = ({
  options,
  series,
  type,
  height = 350,
  width = '100%'
}) => {
  return (
    <div style={{ width, height }}>
      <ApexCharts
        options={options}
        series={series}
        type={type}
        height={height}
        width={width}
      />
    </div>
  )
}

export default ApexChartComponent
