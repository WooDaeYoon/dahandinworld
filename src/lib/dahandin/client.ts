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
    if (!response.ok) throw new Error('서버 접속량이 많아 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
    try {
      return await response.json();
    } catch {
      throw new Error('서버 혼잡으로 인해 정보를 파싱할 수 없습니다. (트래픽 초과)');
    }
  },

  async getClassList(apiKey: string): Promise<DahandinResponse<DahandinClass[]>> {
    const response = await fetch(`${BASE_URL}/get/class/list`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
      },
    });
    if (!response.ok) throw new Error('서버 접속량이 많아 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
    try {
      return await response.json();
    } catch {
      throw new Error('서버 혼잡으로 인해 정보를 파싱할 수 없습니다. (트래픽 초과)');
    }
  },

  async getStudentList(apiKey: string): Promise<DahandinResponse<DahandinStudent[]>> {
    const response = await fetch(`${BASE_URL}/get/student/list`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
      },
    });
    if (!response.ok) throw new Error('서버 접속량이 많아 지연되고 있습니다. 잠시 후 다시 시도해주세요.');
    try {
      return await response.json();
    } catch {
      throw new Error('서버 혼잡으로 인해 정보를 파싱할 수 없습니다. (트래픽 초과)');
    }
  }
};
