import { DahandinResponse, DahandinStudent, DahandinClass } from '@/types';

const BASE_URL = '/api/proxy';

export const dahandinClient = {
  async getStudentTotal(code: string, apiKey: string): Promise<DahandinResponse<DahandinStudent>> {
    const response = await fetch(`${BASE_URL}/get/student/total?code=${code}`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
      },
    });
    return response.json();
  },

  async getClassList(apiKey: string): Promise<DahandinResponse<DahandinClass[]>> {
    const response = await fetch(`${BASE_URL}/get/class/list`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
      },
    });
    return response.json();
  },

  async getStudentList(apiKey: string): Promise<DahandinResponse<DahandinStudent[]>> {
    const response = await fetch(`${BASE_URL}/get/student/list`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
      },
    });
    return response.json();
  }
};
