import client from './client';
import { compressImage } from '../utils/image';

export const api = {
  login: (username: string, password: string) =>
    client.post('/auth/login', { username, password }).then((r) => r.data),
  me: () => client.get('/auth/me').then((r) => r.data),

  patients: () => client.get('/patients').then((r) => r.data),
  patient: (id: number) => client.get(`/patients/${id}`).then((r) => r.data),
  createPatient: (data: any) => client.post('/patients', data).then((r) => r.data),
  updatePatient: (id: number, data: any) => client.put(`/patients/${id}`, data).then((r) => r.data),
  deletePatient: (id: number) => client.delete(`/patients/${id}`).then((r) => r.data),
  updatePatientMedications: (id: number, dto: any) =>
    client.put(`/patients/${id}/medications`, dto).then((r) => r.data),

  conditions: (patientId: number) =>
    client.get(`/patients/${patientId}/conditions`).then((r) => r.data),
  createCondition: (patientId: number, data: any) =>
    client.post(`/patients/${patientId}/conditions`, data).then((r) => r.data),
  timeline: (conditionId: number) =>
    client.get(`/conditions/${conditionId}/timeline`).then((r) => r.data),
  updateCondition: (id: number, data: any) =>
    client.put(`/conditions/${id}`, data).then((r) => r.data),
  deleteCondition: (id: number) =>
    client.delete(`/conditions/${id}`).then((r) => r.data),

  createEncounter: (conditionId: number, data: any) =>
    client.post(`/conditions/${conditionId}/encounters`, data).then((r) => r.data),
  encounter: (id: number) =>
    client.get(`/encounters/${id}`).then((r) => r.data),
  updateEncounter: (id: number, data: any) =>
    client.put(`/encounters/${id}`, data).then((r) => r.data),
  deleteEncounter: (id: number) =>
    client.delete(`/encounters/${id}`).then((r) => r.data),
  createFollowUp: (conditionId: number, data: any) =>
    client.post(`/conditions/${conditionId}/followups`, data).then((r) => r.data),

  followups: (params: any = {}) =>
    client.get('/followups', { params }).then((r) => r.data),
  followupBadge: () => client.get('/followups/badge').then((r) => r.data),
  completeFollowup: (id: number, data: any = {}) =>
    client.post(`/followups/${id}/complete`, data).then((r) => r.data),
  updateFollowup: (id: number, data: any) =>
    client.put(`/followups/${id}`, data).then((r) => r.data),
  deleteFollowup: (id: number) =>
    client.delete(`/followups/${id}`).then((r) => r.data),

  insurances: (patientId: number) =>
    client.get(`/patients/${patientId}/insurances`).then((r) => r.data),
  createInsurance: (patientId: number, data: any) =>
    client.post(`/patients/${patientId}/insurances`, data).then((r) => r.data),

  vaccines: (patientId: number) =>
    client.get(`/patients/${patientId}/vaccines`).then((r) => r.data),
  createVaccine: (patientId: number, data: any) =>
    client.post(`/patients/${patientId}/vaccines`, data).then((r) => r.data),
  updateVaccine: (id: number, data: any) =>
    client.put(`/vaccines/${id}`, data).then((r) => r.data),
  deleteVaccine: (id: number) =>
    client.delete(`/vaccines/${id}`).then((r) => r.data),
  completeNextVaccine: (id: number) =>
    client.post(`/vaccines/${id}/complete-next`).then((r) => r.data),

  exportSummary: (conditionId: number, encounterIds: number[]) =>
    client.post(`/conditions/${conditionId}/export-summary`, { encounterIds }).then((r) => r.data),
  ocr: async (file: File) => {
    const fd = new FormData();
    fd.append('file', await compressImage(file));
    return client.post('/ocr', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    }).then((r) => r.data);
  },

  uploadConditionAttachment: async (conditionId: number, file: File, category: string) => {
    const fd = new FormData();
    fd.append('file', await compressImage(file));
    return client.post(`/conditions/${conditionId}/attachments`, fd, {
      params: { category },
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  uploadEncounterAttachment: async (encounterId: number, file: File, category: string) => {
    const fd = new FormData();
    fd.append('file', await compressImage(file));
    return client.post(`/encounters/${encounterId}/attachments`, fd, {
      params: { category },
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  deleteAttachment: (id: number) => client.delete(`/attachments/${id}`).then((r) => r.data),
  uploadAttachment: async (file: File) => {
    const fd = new FormData();
    fd.append('file', await compressImage(file));
    return client.post('/attachments', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  users: () => client.get('/users').then((r) => r.data),
  createUser: (data: any) => client.post('/users', data).then((r) => r.data),
  updateUser: (id: number, data: any) => client.put(`/users/${id}`, data).then((r) => r.data),
  changePassword: (data: any) => client.post('/auth/change-password', data).then((r) => r.data),
  setUserAccess: (userId: number, patientIds: number[]) =>
    client.post(`/users/${userId}/access`, { patientIds }).then((r) => r.data),
  deleteUser: (id: number) =>
    client.delete(`/users/${id}`).then((r) => r.data),
  myPatients: () => client.get('/users/me/patients').then((r) => r.data),
};
