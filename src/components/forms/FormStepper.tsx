"use client";

import React from "react";

export interface Step {
  label: string;
  description?: string;
  /* Contenu de l'étape. On lui passe goNext() pour permettre une navigation interne (ex : validation custom). */
  content: (goNext: () => void, goBack: () => void) => React.ReactNode;
  /* Fonction de validation. Retourne true si l'étape est valide. */
  isValid?: () => boolean;
}

interface FormStepperProps {
  steps: Step[];
  onSubmit: () => void;
  activeStep: number;
  onStepChange: (step: number) => void;
}

export function FormStepper({
  steps,
  onSubmit,
  activeStep,
  onStepChange,
}: FormStepperProps) {
  const goNext = () => {
    if (activeStep === steps.length - 1) {
      onSubmit();
    } else {
      onStepChange(Math.min(activeStep + 1, steps.length - 1));
    }
  };

  const goBack = () => onStepChange(Math.max(activeStep - 1, 0));

  const current = steps[activeStep];

  return <>{current.content(goNext, goBack)}</>;
}
