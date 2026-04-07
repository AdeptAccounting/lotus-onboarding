'use client';

import { PIPELINE_STEPS, type ClientStatus } from '@/types';
import { Check } from 'lucide-react';

interface PipelineStepperProps {
  currentStatus: ClientStatus;
}

export function PipelineStepper({ currentStatus }: PipelineStepperProps) {
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2 px-1">
      {PIPELINE_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.status} className="flex items-center">
            <div className="flex flex-col items-center min-w-[80px]">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-gradient-to-br from-[#B5648A] to-[#9B4D73] text-white shadow-md shadow-[#B5648A]/20'
                    : isCurrent
                    ? 'bg-[#B5648A] text-white ring-4 ring-[#B5648A]/20 shadow-lg shadow-[#B5648A]/30'
                    : 'bg-[#F5EDF1] text-[#8B7080]'
                }`}
              >
                {isCompleted ? <Check size={14} /> : index + 1}
              </div>
              <span
                className={`text-[10px] mt-1.5 text-center leading-tight ${
                  isCurrent ? 'text-[#6B3A5E] font-semibold' : isCompleted ? 'text-[#B5648A]' : 'text-[#8B7080]'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < PIPELINE_STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 mt-[-12px] ${
                  isCompleted ? 'bg-[#B5648A]' : 'bg-[#E8D8E0]'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
