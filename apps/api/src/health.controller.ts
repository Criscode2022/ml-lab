import { Controller, Get } from '@nestjs/common';
import { CONCEPT_CATALOG } from '@ml-lab/contracts';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      ok: true,
      service: 'ml-lab-api',
      concept: CONCEPT_CATALOG.find((c) => c.id === 'linear-regression'),
    };
  }

  @Get('concepts')
  concepts() {
    return { items: CONCEPT_CATALOG };
  }

  @Get('concepts/linear-regression')
  linearRegression() {
    const concept = CONCEPT_CATALOG.find((c) => c.id === 'linear-regression');
    return {
      id: 'linear-regression',
      name: concept?.title ?? 'Linear Regression',
      labReady: true,
      cluster: concept?.cluster,
      formulation: 'ŷ = s x + b ; MSE = (1/n) Σ (y − ŷ)²',
    };
  }
}
