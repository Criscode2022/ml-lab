import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type {
  ChallengeGrade,
  ExperimentSnapshot,
  ExperienceLevel,
  LearningGoal,
  LearningMode,
  NotebookCell,
} from '@ml-lab/contracts';

export const API = '/api';

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  register(email: string, password: string, name: string) {
    return this.http.post<{ token: string; user: { id: string; email: string; name: string | null } }>(
      `${API}/auth/register`,
      { email, password, name },
    );
  }

  login(email: string, password: string) {
    return this.http.post<{ token: string; user: { id: string; email: string; name: string | null } }>(
      `${API}/auth/login`,
      { email, password },
    );
  }

  me() {
    return this.http.get<{ user: { id: string; email: string; name: string | null }; profile: unknown }>(
      `${API}/auth/me`,
    );
  }

  saveProfile(body: {
    goal: LearningGoal;
    experienceLevel: ExperienceLevel;
    dailyMinutes: number;
    learningMode?: LearningMode;
  }) {
    return this.http.post(`${API}/profile`, body);
  }

  start(experienceLevel: ExperienceLevel) {
    return this.http.post<{ conceptId: string; href: string; note: string }>(`${API}/onboarding/start`, {
      experienceLevel,
    });
  }

  saveExperiment(snap: ExperimentSnapshot) {
    return this.http.post<{ id: string }>(`${API}/experiments`, snap);
  }

  getExperiment(id: string) {
    return this.http.get<ExperimentSnapshot & { id: string }>(`${API}/experiments/${id}`);
  }

  listExperiments() {
    return this.http.get<Array<ExperimentSnapshot & { id: string }>>(`${API}/experiments`);
  }

  progress() {
    return this.http.get<{
      items: Array<{ conceptId: string; mastery: number; status: string }>;
      recommendation: { conceptId: string; title: string; reason: string; estimatedMinutes: number; href: string };
    }>(`${API}/progress/linear-regression`);
  }

  saveNotebook(cells: NotebookCell[], experimentId?: string) {
    return this.http.put(`${API}/notebooks/current`, { cells, experimentId });
  }

  runPython(code: string, dataset?: unknown, compareReference?: boolean) {
    return this.http.post<{
      runId: string;
      status: string;
      stdout: string;
      stderr: string;
      isolated: boolean;
      interpreterPid: number | null;
      hostPid: number;
      reference?: { stdout: string; status: string };
    }>(`${API}/sandbox/run`, { code, dataset, compareReference, timeoutMs: 8000 });
  }

  stopPython(id: string) {
    return this.http.post(`${API}/sandbox/${id}/stop`, {});
  }

  resetPython(id: string) {
    return this.http.post(`${API}/sandbox/${id}/reset`, {});
  }

  createChallenge(experiment: ExperimentSnapshot, kind: 'mse' | 'diverge' = 'mse') {
    return this.http.post<{ id: string; title: string; body: string; expected: { mse?: number } }>(
      `${API}/challenges`,
      { experiment, kind },
    );
  }

  submitChallenge(id: string, answer: unknown) {
    return this.http.post<ChallengeGrade>(`${API}/challenges/${id}/submit`, { answer });
  }

  tutor(body: { message: string; experiment?: ExperimentSnapshot; code?: string; why?: boolean; mode?: string }) {
    return this.http.post<{ text: string }>(`${API}/ai/tutor`, body);
  }

  why(experiment: ExperimentSnapshot, code?: string) {
    return this.http.post<{ text: string }>(`${API}/ai/why`, { experiment, code });
  }

  health() {
    return this.http.get<{ ok: boolean; concept: { id: string; title: string } }>(`${API}/health`);
  }
}
